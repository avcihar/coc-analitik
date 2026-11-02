"""
Tests for CWL Scouting Pipeline & Real Battlelog Army Discovery
===============================================================
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, patch

from services.workers.cwl_scout import (
    AsyncRateLimiter,
    _run_cwl_scout,
    scout_cwl_clan,
)

SAMPLE_SHARE_CODE_1 = (
    "h0p4e10_51-1p9e39_48-2p7e19_4-7p10e52_59"
    "i1x64-1x147d2x120-1x2"
    "u2x58-6x80-5x7-1x97-1x23-1x132-3x10-2x1-1x28-1x188-2x5"
    "s5x35-1x2-2x98"
)

SAMPLE_SHARE_CODE_2 = (
    "h0p10e14_32-1p9e39_48-2p16e5_24-7p4e52_60"
    "i1x135-3x57-1x58-1x132d2x98"
    "u3x1-8x132-2x5-5x7-1x150-2x58-2x109-2x28-2x4-1x6-3x55-2x0-1x82"
    "s2x120-2x5-1x35-1x17-1x9-2x109-1x70"
)


@pytest.fixture
def mock_redis():
    redis_mock = AsyncMock()
    redis_mock.get.return_value = None
    return redis_mock


@pytest.fixture
def mock_api_client():
    client = AsyncMock()
    return client


def _sample_th18_player_payload(tag: str, name: str = "OppPlayer"):
    return {
        "tag": tag,
        "name": name,
        "townHallLevel": 18,
        "trophies": 5950,
        "warStars": 2400,
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
                "name": "Archer Queen",
                "level": 105,
                "maxLevel": 105,
                "village": "home",
                "equipment": [
                    {"name": "Magic Mirror", "level": 27, "maxLevel": 27, "village": "home"},
                    {"name": "Frozen Arrow", "level": 27, "maxLevel": 27, "village": "home"},
                ],
            },
            {
                "name": "Dragon Duke",
                "level": 50,
                "maxLevel": 50,
                "village": "home",
                "equipment": [
                    {"name": "Fire Heart", "level": 18, "maxLevel": 18, "village": "home"},
                    {"name": "Electro Fangs", "level": 27, "maxLevel": 27, "village": "home"},
                ],
            },
        ],
        "troops": [
            {"name": "Thrower", "level": 3, "maxLevel": 3, "village": "home", "superTroopIsActive": False},
            {"name": "Super Wall Breaker", "level": 12, "maxLevel": 12, "village": "home", "superTroopIsActive": True},
            {"name": "Phoenix", "level": 20, "maxLevel": 20, "village": "home"},
        ],
        "spells": [
            {"name": "Rage Spell", "level": 6, "maxLevel": 6, "village": "home"},
        ],
    }


@pytest.mark.asyncio
async def test_cwl_scout_no_war(mock_redis, mock_api_client):
    mock_api_client.get_clan_league_group.return_value = {"state": "notInWar"}

    with patch("services.workers.cwl_scout.CoCAPIClient", return_value=mock_api_client), \
         patch("services.workers.cwl_scout.aioredis.from_url", return_value=mock_redis):

        result = await _run_cwl_scout("#CLAN123")

        assert result["status"] == "notInWar"
        mock_api_client.get_clan_league_group.assert_called_once_with("#CLAN123")
        mock_redis.set.assert_not_called()


@pytest.mark.asyncio
async def test_cwl_scout_decodes_real_battlelog_and_never_fabricates_when_empty(
    mock_redis, mock_api_client
):
    """
    Verify:
      1. Player #1 has a `ranked` attack with `armyShareCode` -> decoded army, rule-based name,
         CopyArmy link, and source badge `"Son ranked saldırısı"`.
      2. Player #2 has only a `homeVillage` attack with `armyShareCode` -> fallback to
         `"Son köy saldırısı"`.
      3. Player #3 has an empty battlelog -> `"Ordu tespit edilemedi"`, `armyDetected: False`,
         `armyLink: ""`, and only profile heroes/equipment shown (never fabricates
         "Root Rider + Valkyrie + Thrower Smash").
    """
    mock_api_client.get_clan_league_group.return_value = {
        "state": "inWar",
        "season": "2026-10",
        "rounds": [{"warTags": ["#WAR_ROUND1"]}],
    }

    opponent_members = [
        {"tag": "#OPP1", "name": "RankedAttacker", "townhallLevel": 18, "mapPosition": 1},
        {"tag": "#OPP2", "name": "HomeVillageAttacker", "townhallLevel": 18, "mapPosition": 2},
        {"tag": "#OPP3", "name": "NoBattlelogPlayer", "townhallLevel": 18, "mapPosition": 3},
    ]

    mock_api_client.get_cwl_war.return_value = {
        "state": "inWar",
        "teamSize": 15,
        "clan": {"tag": "#CLAN123", "name": "OurClan", "members": []},
        "opponent": {
            "tag": "#OPPCLAN",
            "name": "EnemyTitans",
            "clanLevel": 25,
            "members": opponent_members,
        },
    }

    mock_api_client.get_player.side_effect = lambda p_tag: _sample_th18_player_payload(
        p_tag, name=f"Player_{p_tag}"
    )

    async def _fake_battlelog(p_tag: str):
        clean = p_tag.lstrip("#")
        if clean == "OPP1":
            return {
                "items": [
                    {
                        "battleType": "ranked",
                        "attack": True,
                        "armyShareCode": SAMPLE_SHARE_CODE_1,
                        "opponentName": "TargetA",
                        "opponentTownHallLevel": 17,
                        "stars": 3,
                        "destructionPercentage": 100,
                    },
                    {
                        "battleType": "ranked",
                        "attack": True,
                        "armyShareCode": SAMPLE_SHARE_CODE_2,
                        "opponentName": "TargetB",
                        "opponentTownHallLevel": 18,
                        "stars": 2,
                        "destructionPercentage": 88,
                    },
                ]
            }
        if clean == "OPP2":
            return {
                "items": [
                    {
                        "battleType": "homeVillage",
                        "attack": True,
                        "armyShareCode": SAMPLE_SHARE_CODE_2,
                        "opponentName": "HomeTarget",
                        "opponentTownHallLevel": 18,
                        "stars": 3,
                        "destructionPercentage": 100,
                    }
                ]
            }
        return {"items": []}

    mock_api_client.get_player_battlelog.side_effect = _fake_battlelog

    report = await scout_cwl_clan(
        clan_tag="#CLAN123",
        api_client=mock_api_client,
        redis_client=mock_redis,
        force_refresh=True,
    )

    assert report["status"] == "ok"
    assert len(report["opponents"]) == 3

    # Player 1: ranked attack decoded, 2 distinct recent armies
    opp1 = report["opponentsByTag"]["#OPP1"]
    assert opp1["armyDetected"] is True
    assert opp1["armySource"] == "ranked"
    assert opp1["sourceBadge"] == "Ranked"
    assert "En iyi ordu" in opp1["armySourceLabel"]
    assert opp1["armyName"] == "Super Bowler + Healer + Ice Golem"
    assert opp1["armyLink"] == f"https://link.clashofclans.com/en/?action=CopyArmy&army={SAMPLE_SHARE_CODE_1}"
    assert len(opp1["recentArmies"]) == 2
    assert opp1["siege"]["name"] == "Sky Wagon"

    # Player 2: homeVillage attack fallback (labeled "Ganimet (ranked yok)" badge & "Ranked tespit edilemedi")
    opp2 = report["opponentsByTag"]["#OPP2"]
    assert opp2["armyDetected"] is True
    assert opp2["armySource"] == "fallback"
    assert opp2["sourceBadge"] == "Ganimet (ranked yok)"
    assert opp2["warning"] == "Ranked tespit edilemedi"
    assert "En iyi ordu" in opp2["armySourceLabel"]
    assert opp2["armyName"] == "Thrower + Healer + Ruin Witch"
    assert opp2["armyLink"] == f"https://link.clashofclans.com/en/?action=CopyArmy&army={SAMPLE_SHARE_CODE_2}"

    # Player 3: empty battlelog -> specific reason "Battle log boş", no fake army!
    opp3 = report["opponentsByTag"]["#OPP3"]
    assert opp3["armyDetected"] is False
    assert opp3["inferredArchetype"] == "Battle log boş"
    assert opp3["armyName"] == "Battle log boş"
    assert opp3["armySourceLabel"] == "Battle log boş"
    assert opp3["failureReason"] == "Battle log boş"
    assert opp3["armyLink"] == ""
    assert opp3["troops"] == []
    assert opp3["spells"] == []
    assert len(opp3["heroes"]) == 3  # Only the 3 real heroes from profile


@pytest.mark.asyncio
async def test_async_rate_limiter_enforces_window():
    """Verify AsyncRateLimiter allows burst up to max_calls and throttles beyond."""
    limiter = AsyncRateLimiter(max_calls=5, period=0.15)
    loop = asyncio.get_running_loop()
    start = loop.time()

    async def _worker(idx: int) -> int:
        async with limiter:
            return idx

    results = await asyncio.gather(*(_worker(i) for i in range(7)))
    elapsed = loop.time() - start
    assert len(results) == 7
    assert elapsed >= 0.12
