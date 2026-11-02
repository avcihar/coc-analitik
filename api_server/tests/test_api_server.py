"""
Unit & Integration Tests for the FastAPI Server (`api_server`)
==============================================================
Tests:
  - .env configuration loading (`COC_API_TOKEN`, `REDIS_URL`)
  - GET /api/v1/players/{player_tag} (TH18 profile, heroes, Minion Prince, active equipment, pets, troops, Redis TTL caching)
  - GET /api/v1/clans/{clan_tag} (Clan details + memberList + Redis TTL caching)
  - GET /api/v1/clans/search?name={query} (Clan search + Redis TTL caching)
  - CORS headers for Next.js (`http://localhost:3000`)
  - Error status mappings (404 NotFound, 429 RateLimit, 503 Maintenance/CircuitBreaker)
"""

from __future__ import annotations

import json
from typing import Any, Dict, Optional
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from api_server.config import Settings, get_settings
from api_server.main import create_app, get_api_client, get_redis_cache
from cache.redis_strategy import CoCRedisCache, TTL
from services.api.client import (
    CircuitBreakerOpenError,
    CoCAPIClient,
    MaintenanceBreakError,
    NotFoundError,
    RateLimitError,
)


class FakeRedis:
    """In-memory async Redis stub tracking keys and TTLs."""

    def __init__(self) -> None:
        self.store: Dict[str, str] = {}
        self.ttls: Dict[str, int] = {}

    async def get(self, key: str) -> Optional[str]:
        return self.store.get(key)

    async def set(self, key: str, value: str, ex: int = 0) -> None:
        self.store[key] = value
        self.ttls[key] = ex

    async def delete(self, *keys: str) -> int:
        deleted = 0
        for k in keys:
            if k in self.store:
                del self.store[k]
                deleted += 1
        return deleted

    async def exists(self, key: str) -> int:
        return 1 if key in self.store else 0

    async def ttl(self, key: str) -> int:
        return self.ttls.get(key, -2)


@pytest.fixture
def fake_redis() -> FakeRedis:
    return FakeRedis()


@pytest.fixture
def fake_cache(fake_redis: FakeRedis) -> CoCRedisCache:
    return CoCRedisCache(fake_redis)  # type: ignore[arg-type]


@pytest.fixture
def mock_coc_client() -> AsyncMock:
    client = AsyncMock(spec=CoCAPIClient)
    client.get_player.return_value = {
        "tag": "#2PP",
        "name": "TH18Legend",
        "townHallLevel": 18,
        "townHallWeaponLevel": 5,
        "expLevel": 290,
        "trophies": 6250,
        "bestTrophies": 6600,
        "warStars": 3100,
        "heroes": [
            {
                "name": "Barbarian King",
                "level": 105,
                "maxLevel": 105,
                "village": "home",
                "equipment": [
                    {"name": "Giant Gauntlet", "level": 27, "maxLevel": 27, "village": "home"},
                    {"name": "Spiky Ball", "level": 27, "maxLevel": 27, "village": "home"},
                ],
            },
            {
                "name": "Minion Prince",
                "level": 95,
                "maxLevel": 95,
                "village": "home",
                "equipment": [
                    {"name": "Dark Orb", "level": 18, "maxLevel": 18, "village": "home"},
                    {"name": "Dark Crown", "level": 27, "maxLevel": 27, "village": "home"},
                ],
            },
        ],
        "heroEquipment": [
            {"name": "Giant Gauntlet", "level": 27, "maxLevel": 27, "village": "home"},
            {"name": "Spiky Ball", "level": 27, "maxLevel": 27, "village": "home"},
            {"name": "Dark Orb", "level": 18, "maxLevel": 18, "village": "home"},
            {"name": "Dark Crown", "level": 27, "maxLevel": 27, "village": "home"},
        ],
        "troops": [
            {"name": "Root Rider", "level": 4, "maxLevel": 4, "village": "home"},
            {"name": "Thrower", "level": 3, "maxLevel": 3, "village": "home"},
            {"name": "Phoenix", "level": 20, "maxLevel": 20, "village": "home"},
            {"name": "Sneezy", "level": 20, "maxLevel": 20, "village": "home"},
        ],
        "spells": [
            {"name": "Revive Spell", "level": 4, "maxLevel": 4, "village": "home"},
            {"name": "Overgrowth Spell", "level": 4, "maxLevel": 4, "village": "home"},
        ],
    }

    client.get_clan.return_value = {
        "tag": "#CLAN123",
        "name": "Elite TH18",
        "clanLevel": 25,
        "members": 2,
        "memberList": [
            {"tag": "#2PP", "name": "TH18Legend", "role": "leader", "townHallLevel": 18, "trophies": 6250},
            {"tag": "#999", "name": "CoLeaderX", "role": "coLeader", "townHallLevel": 17, "trophies": 5900},
        ],
    }

    client.search_clans.return_value = {
        "items": [
            {"tag": "#CLAN123", "name": "Elite TH18", "clanLevel": 25, "members": 48},
            {"tag": "#CLAN456", "name": "Elite Academy", "clanLevel": 18, "members": 42},
        ],
        "paging": {"cursors": {}},
    }
    return client


@pytest.fixture
def test_app(mock_coc_client: AsyncMock, fake_cache: CoCRedisCache):
    app = create_app(
        Settings(
            coc_api_token="test_env_token",
            redis_url="redis://localhost:6379/0",
            cors_origins=["http://localhost:3000"],
        )
    )
    app.dependency_overrides[get_api_client] = lambda: mock_coc_client
    app.dependency_overrides[get_redis_cache] = lambda: fake_cache
    return app


@pytest.mark.asyncio
async def test_player_endpoint_enriches_th18_and_caches(
    test_app, mock_coc_client: AsyncMock, fake_redis: FakeRedis
):
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1st call — hits CoCAPIClient and caches in Redis
        resp = await ac.get("/api/v1/players/%232PP")
        assert resp.status_code == 200
        data = resp.json()

        assert data["tag"] == "#2PP"
        assert data["townHallLevel"] == 18
        assert data["town_hall_level"] == 18
        assert len(data["heroes"]) == 2
        hero_names = {h["name"] for h in data["heroes"]}
        assert "Minion Prince" in hero_names
        assert "Barbarian King" in hero_names

        # Active equipped items flattened
        assert len(data["activeEquipment"]) == 4
        active_names = {eq["name"] for eq in data["activeEquipment"]}
        assert "Dark Crown" in active_names
        assert "Giant Gauntlet" in active_names

        # Pets separated from troops
        pet_names = {p["name"] for p in data["pets"]}
        troop_names = {t["name"] for t in data["troops"]}
        assert pet_names == {"Phoenix", "Sneezy"}
        assert troop_names == {"Root Rider", "Thrower"}

        # Check Redis TTL
        cache_key = "coc:player:v1:profile:2PP"
        assert cache_key in fake_redis.store
        assert fake_redis.ttls[cache_key] == int(TTL.PLAYER_PROFILE)

        # 2nd call — served from Redis cache without calling CoCAPIClient again
        resp2 = await ac.get("/api/v1/players/2PP")
        assert resp2.status_code == 200
        assert mock_coc_client.get_player.call_count == 1


@pytest.mark.asyncio
async def test_clan_endpoint_returns_members_and_caches(
    test_app, mock_coc_client: AsyncMock, fake_redis: FakeRedis
):
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/v1/clans/%23CLAN123")
        assert resp.status_code == 200
        data = resp.json()

        assert data["name"] == "Elite TH18"
        assert len(data["memberList"]) == 2
        assert data["memberList"][0]["townHallLevel"] == 18

        cache_key = "coc:api:v1:clan:CLAN123"
        assert cache_key in fake_redis.store
        assert fake_redis.ttls[cache_key] == int(TTL.COC_API_CLAN)

        # 2nd request hits cache
        await ac.get("/api/v1/clans/CLAN123")
        assert mock_coc_client.get_clan.call_count == 1


@pytest.mark.asyncio
async def test_clan_search_endpoint_and_caching(
    test_app, mock_coc_client: AsyncMock, fake_redis: FakeRedis
):
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/v1/clans/search", params={"name": "Elite"})
        assert resp.status_code == 200
        data = resp.json()

        assert len(data["items"]) == 2
        assert data["items"][0]["name"] == "Elite TH18"

        # 2nd identical search hits Redis cache
        await ac.get("/api/v1/clans/search", params={"name": "Elite"})
        assert mock_coc_client.search_clans.call_count == 1


@pytest.mark.asyncio
async def test_cors_for_nextjs_localhost_3000(test_app):
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.options(
            "/api/v1/players/2PP",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert resp.status_code == 200
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"


@pytest.mark.asyncio
async def test_error_mapping_404_429_503(test_app, mock_coc_client: AsyncMock):
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        mock_coc_client.get_player.side_effect = NotFoundError("Player not found")
        r404 = await ac.get("/api/v1/players/UNKNOWN1")
        assert r404.status_code == 404

        mock_coc_client.get_player.side_effect = RateLimitError("Too many requests")
        r429 = await ac.get("/api/v1/players/UNKNOWN2")
        assert r429.status_code == 429

        mock_coc_client.get_player.side_effect = MaintenanceBreakError("Maintenance")
        r503 = await ac.get("/api/v1/players/UNKNOWN3")
        assert r503.status_code == 503


def test_dotenv_settings_loaded(monkeypatch):
    monkeypatch.setenv("COC_API_TOKEN", "custom_token_xyz")
    monkeypatch.setenv("REDIS_URL", "redis://127.0.0.1:6380/1")
    settings = get_settings()
    assert settings.coc_api_token == "custom_token_xyz"
    assert settings.redis_url == "redis://127.0.0.1:6380/1"
    assert "http://localhost:3000" in settings.cors_origins


@pytest.mark.asyncio
async def test_cwl_scout_endpoint_and_redis_cache(
    test_app, mock_coc_client: AsyncMock, fake_redis: FakeRedis
):
    sample_code = (
        "h0p4e10_51-1p9e39_48-2p7e19_4-7p10e52_59"
        "i1x64-1x147d2x120-1x2"
        "u2x58-6x80-5x7-1x97-1x23-1x132-3x10-2x1-1x28-1x188-2x5"
        "s5x35-1x2-2x98"
    )
    mock_coc_client.get_clan_league_group.return_value = {
        "state": "preparation",
        "season": "2026-10",
        "rounds": [{"warTags": ["#WAR_PREP1"]}],
    }
    mock_coc_client.get_cwl_war.return_value = {
        "state": "preparation",
        "teamSize": 15,
        "clan": {"tag": "#CLAN123", "name": "Elite TH18", "members": []},
        "opponent": {
            "tag": "#ENEMY99",
            "name": "Enemy99",
            "clanLevel": 22,
            "members": [{"tag": "#2PP", "name": "TH18Legend", "townhallLevel": 18, "mapPosition": 1}],
        },
    }
    mock_coc_client.get_player_battlelog.return_value = {
        "items": [
            {
                "battleType": "ranked",
                "attack": True,
                "armyShareCode": sample_code,
                "stars": 3,
                "destructionPercentage": 100.0,
            }
        ]
    }

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/v1/cwl/scout/%23CLAN123")
        assert resp.status_code == 200
        body = resp.json()

        assert body["status"] == "ok"
        assert body["warState"] == "preparation"
        assert body["opponentClan"]["tag"] == "#ENEMY99"
        assert len(body["opponents"]) == 1
        opp = body["opponents"][0]
        assert opp["playerTag"] == "#2PP"
        assert opp["townHallLevel"] == 18
        assert opp["armyDetected"] is True
        assert opp["armyLink"] == f"https://link.clashofclans.com/en/?action=CopyArmy&army={sample_code}"

        # Check Redis cache hit on second call
        resp2 = await ac.get("/api/v1/cwl/scout/CLAN123")
        assert resp2.status_code == 200
        assert mock_coc_client.get_clan_league_group.call_count == 1


@pytest.mark.asyncio
async def test_meta_dashboard_endpoint_and_caching(
    test_app, mock_coc_client: AsyncMock, fake_redis: FakeRedis
):
    sample_code = (
        "h0p4e10_51-1p9e39_48-2p7e19_4-7p10e52_59"
        "i1x64-1x147d2x120-1x2"
        "u2x58-6x80-5x7-1x97-1x23-1x132-3x10-2x1-1x28-1x188-2x5"
        "s5x35-1x2-2x98"
    )
    mock_coc_client.get_global_player_rankings.return_value = {
        "items": [{"tag": "#2PP", "name": "TH18Legend"}],
        "paging": {},
    }
    mock_coc_client.get_player_battlelog.return_value = {
        "items": [
            {
                "battleType": "ranked",
                "attack": True,
                "armyShareCode": sample_code,
                "stars": 3,
                "destructionPercentage": 100.0,
            }
        ]
    }

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/v1/meta/dashboard", params={"top_n": 200})
        assert resp.status_code == 200
        body = resp.json()

        assert body["status"] == "ok"
        assert body["targetTopPlayers"] == 200
        assert "statistics" in body
        assert "heroEquipmentPairs" in body["statistics"]
        assert "petUsage" in body["statistics"]
        assert "metaArmies" in body
        recs_by_th = body["metaArmies"]["recommendationsByTownHall"]
        assert set(recs_by_th.keys()) == {"TH18"}
        assert len(recs_by_th["TH18"]) == 1
        assert recs_by_th["TH18"][0]["armyLink"] == (
            f"https://link.clashofclans.com/en/?action=CopyArmy&army={sample_code}"
        )

        # Second call served from Redis cache
        resp2 = await ac.get("/api/v1/meta/dashboard", params={"top_n": 200})
        assert resp2.status_code == 200
        assert mock_coc_client.get_global_player_rankings.call_count == 1


def test_tag_sanitization_and_encoding_standardization():
    """Verify P89PCUPUQ, #P89PCUPUQ, and %23P89PCUPUQ all become %23P89PCUPUQ."""
    from services.api.client import _encode_tag, sanitize_tag

    for raw in ("P89PCUPUQ", "#P89PCUPUQ", "%23P89PCUPUQ", "%23#p89pcupuq", "  #p89pcupuq "):
        assert sanitize_tag(raw) == "P89PCUPUQ"
        assert _encode_tag(raw) == "%23P89PCUPUQ"


@pytest.mark.asyncio
async def test_client_sends_encoded_tag_across_all_endpoints(fake_redis: FakeRedis):
    """Ensure CoCAPIClient always calls Supercell API with %23P89PCUPUQ regardless of input format."""
    client = CoCAPIClient(api_token="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.test", redis_client=fake_redis)  # type: ignore[arg-type]
    called_endpoints: list[str] = []

    async def _fake_request(method: str, endpoint: str, **kwargs):
        called_endpoints.append(endpoint)
        return {"tag": "#P89PCUPUQ"}

    client.request = _fake_request  # type: ignore[assignment]

    await client.get_player("P89PCUPUQ")
    await client.get_player("#P89PCUPUQ")
    await client.get_player("%23P89PCUPUQ")
    await client.get_clan("P89PCUPUQ")
    await client.get_clan("#P89PCUPUQ")
    await client.get_clan_league_group("#P89PCUPUQ")
    await client.get_cwl_war("WAR999")
    await client.get_cwl_war("#WAR999")

    assert called_endpoints == [
        "/players/%23P89PCUPUQ",
        "/players/%23P89PCUPUQ",
        "/players/%23P89PCUPUQ",
        "/clans/%23P89PCUPUQ",
        "/clans/%23P89PCUPUQ",
        "/clans/%23P89PCUPUQ/currentwar/leaguegroup",
        "/clanwarleagues/wars/%23WAR999",
        "/clanwarleagues/wars/%23WAR999",
    ]
    await client.close()


def test_token_startup_logging_first_10_chars(capsys):
    from api_server.config import log_startup_token

    preview = log_startup_token("eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9")
    captured = capsys.readouterr()
    assert preview == "eyJ0eXAiOi..."
    assert "eyJ0eXAiOi..." in captured.out


@pytest.mark.asyncio
async def test_official_v1_battlelog_leaguehistory_and_rankings_routes(
    test_app, mock_coc_client: AsyncMock
):
    sample_code = (
        "h0p4e10_51-1p9e39_48-2p7e19_4-7p10e52_59"
        "i1x64-1x147d2x120-1x2"
        "u2x58-6x80-5x7-1x97-1x23-1x132-3x10-2x1-1x28-1x188-2x5"
        "s5x35-1x2-2x98"
    )
    mock_coc_client.get_player_battlelog.return_value = {
        "items": [
            {
                "battleType": "ranked",
                "attack": False,
                "armyShareCode": sample_code,
                "stars": 2,
                "destructionPercentage": 69,
            }
        ]
    }
    mock_coc_client.get_player_leaguehistory.return_value = {
        "items": [{"id": "2026-09", "trophies": 6350, "rank": 42}]
    }
    mock_coc_client.get_clan_league_group.return_value = {
        "state": "inWar",
        "season": "2026-10",
        "rounds": [{"warTags": ["#W1"]}],
    }
    mock_coc_client.get_cwl_war.return_value = {
        "state": "inWar",
        "teamSize": 15,
    }
    mock_coc_client.get_global_player_rankings.return_value = {
        "items": [{"tag": "#2PP", "name": "TH18Legend", "rank": 1, "trophies": 6400}]
    }

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r_battle = await ac.get("/api/v1/players/%23P89PCUPUQ/battlelog")
        assert r_battle.status_code == 200
        item0 = r_battle.json()["items"][0]
        assert item0["stars"] == 2
        assert item0["armyLink"] == f"https://link.clashofclans.com/en/?action=CopyArmy&army={sample_code}"
        assert item0["decodedArmy"]["armyName"] == "Super Bowler + Healer + Ice Golem"
        mock_coc_client.get_player_battlelog.assert_called_with("P89PCUPUQ")

        r_parse = await ac.get("/api/v1/army/parse", params={"code": sample_code})
        assert r_parse.status_code == 200
        assert r_parse.json()["siegeMachines"][0]["name"] == "Sky Wagon"

        r_hist = await ac.get("/api/v1/players/P89PCUPUQ/leaguehistory")
        assert r_hist.status_code == 200
        assert r_hist.json()["items"][0]["rank"] == 42
        mock_coc_client.get_player_leaguehistory.assert_called_with("P89PCUPUQ")

        r_lg = await ac.get("/api/v1/clans/%23CLAN123/leaguegroup")
        assert r_lg.status_code == 200
        assert r_lg.json()["season"] == "2026-10"

        r_war = await ac.get("/api/v1/cwl/wars/%23WAR999")
        assert r_war.status_code == 200
        assert r_war.json()["teamSize"] == 15

        r_rank = await ac.get("/api/v1/rankings/players?location_id=global&limit=200")
        assert r_rank.status_code == 200
        assert r_rank.json()["items"][0]["tag"] == "#2PP"


@pytest.mark.asyncio
async def test_meta_top_analysis_endpoint(
    test_app, mock_coc_client: AsyncMock, fake_redis: FakeRedis
):
    """Verify GET /api/v1/meta/top-analysis returns pick_rate %, 6-hero equipment pairs, siegeUsage, and clustered Meta Armies."""
    sample_code = (
        "h0p4e10_51-1p9e39_48-2p7e19_4-7p10e52_59"
        "i1x64-1x147d2x120-1x2"
        "u2x58-6x80-5x7-1x97-1x23-1x132-3x10-2x1-1x28-1x188-2x5"
        "s5x35-1x2-2x98"
    )
    mock_coc_client.get_global_player_rankings.return_value = {
        "items": [{"tag": "#2PP", "name": "TH18Legend"}],
        "paging": {},
    }
    mock_coc_client.get_player_battlelog.return_value = {
        "items": [
            {
                "battleType": "ranked",
                "attack": True,
                "armyShareCode": sample_code,
                "stars": 3,
                "destructionPercentage": 100.0,
            }
        ]
    }

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/v1/meta/top-analysis", params={"sample_size": 100, "town_hall": 18})
        assert resp.status_code == 200
        body = resp.json()

        assert body["status"] == "ok"
        assert body["sampleSize"] == 100
        assert "statistics" in body
        stats = body["statistics"]
        assert "heroEquipmentPairs" in stats
        assert "equipmentByHero" in stats
        assert "Dragon Duke" in stats["equipmentByHero"]
        assert "Minion Prince" in stats["equipmentByHero"]
        assert "siegeUsage" in stats
        assert "troopUsage" in stats
        assert "spellUsage" in stats
        assert "petUsage" in stats
        assert "metaArmies" in body
        top_recs = body["metaArmies"]["topRecommendations"]
        assert len(top_recs) == 1
        assert top_recs[0]["armyLink"] == (
            f"https://link.clashofclans.com/en/?action=CopyArmy&army={sample_code}"
        )







