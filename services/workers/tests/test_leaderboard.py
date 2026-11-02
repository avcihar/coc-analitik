"""
Tests for Leaderboard Bulk Ingestion & Real Battlelog Meta Army Engine
======================================================================
"""

import pytest
from unittest.mock import AsyncMock, patch

from services.meta_engine.equipment_meta import cluster_and_recommend_meta_armies
from services.workers.leaderboard import (
    _ingest_leaderboard,
    analyze_meta_statistics,
    fetch_profiles_for_rankings,
    fetch_top_leaderboard_players,
    generate_meta_dashboard,
    recommend_meta_armies,
)

SAMPLE_SHARE_CODE_A = (
    "h0p4e10_51-1p9e39_48-2p7e19_4-7p10e52_59"
    "i1x64-1x147d2x120-1x2"
    "u2x58-6x80-5x7-1x97-1x23-1x132-3x10-2x1-1x28-1x188-2x5"
    "s5x35-1x2-2x98"
)

SAMPLE_SHARE_CODE_B = (
    "h0p10e14_32-1p9e39_48-2p16e5_24-7p4e52_60"
    "i1x135-3x57-1x58-1x132d2x98"
    "u3x1-8x132-2x5-5x7-1x150-2x58-2x109-2x28-2x4-1x6-3x55-2x0-1x82"
    "s2x120-2x5-1x35-1x17-1x9-2x109-1x70"
)


def _make_real_test_profiles():
    return [
        {
            "tag": "#P1",
            "name": "PlayerOne",
            "townHallLevel": 18,
            "heroes": [
                {
                    "name": "Barbarian King",
                    "level": 105,
                    "maxLevel": 105,
                    "village": "home",
                    "equipment": [
                        {"name": "Spiky Ball", "level": 27, "maxLevel": 27},
                        {"name": "Snake Bracelet", "level": 27, "maxLevel": 27},
                    ],
                },
                {
                    "name": "Dragon Duke",
                    "level": 50,
                    "maxLevel": 50,
                    "village": "home",
                    "equipment": [
                        {"name": "Fire Heart", "level": 18, "maxLevel": 18},
                        {"name": "Electro Fangs", "level": 27, "maxLevel": 27},
                    ],
                },
            ],
            "pets": [{"name": "Phoenix", "level": 20, "maxLevel": 20}],
            "troops": [
                {"name": "Super Wall Breaker", "level": 12, "maxLevel": 12, "village": "home", "superTroopIsActive": True},
            ],
            "spells": [],
            "battlelog": [
                {
                    "battleType": "ranked",
                    "attack": True,
                    "armyShareCode": SAMPLE_SHARE_CODE_A,
                    "stars": 3,
                    "destructionPercentage": 100.0,
                },
                {
                    "battleType": "ranked",
                    "attack": True,
                    "armyShareCode": SAMPLE_SHARE_CODE_A,
                    "stars": 3,
                    "destructionPercentage": 100.0,
                },
                {
                    "battleType": "ranked",
                    "attack": True,
                    "armyShareCode": SAMPLE_SHARE_CODE_A,
                    "stars": 2,
                    "destructionPercentage": 84.0,
                },
            ],
        },
        {
            "tag": "#P2",
            "name": "PlayerTwo",
            "townHallLevel": 18,
            "heroes": [
                {
                    "name": "Barbarian King",
                    "level": 105,
                    "maxLevel": 105,
                    "village": "home",
                    "equipment": [
                        {"name": "Giant Gauntlet", "level": 27, "maxLevel": 27},
                        {"name": "Stick Horse", "level": 27, "maxLevel": 27},
                    ],
                }
            ],
            "pets": [{"name": "Spirit Fox", "level": 20, "maxLevel": 20}],
            "troops": [],
            "spells": [],
            "battlelog": [
                {
                    "battleType": "ranked",
                    "attack": True,
                    "armyShareCode": SAMPLE_SHARE_CODE_B,
                    "stars": 3,
                    "destructionPercentage": 100.0,
                }
            ],
        },
    ]


@pytest.fixture
def mock_redis():
    redis = AsyncMock()
    redis.get.return_value = None
    return redis


@pytest.fixture
def mock_api_client():
    client = AsyncMock()
    return client


@pytest.mark.asyncio
async def test_ingest_leaderboard(mock_redis, mock_api_client):
    mock_api_client.get_global_player_rankings.side_effect = [
        {
            "items": [{"tag": "#PLAYER1"}],
            "paging": {"cursors": {"after": "cursor1"}},
        },
        {
            "items": [{"tag": "#PLAYER2"}],
            "paging": {},
        },
    ]

    with patch("services.workers.leaderboard.CoCAPIClient", return_value=mock_api_client), \
         patch("services.workers.leaderboard.aioredis.from_url", return_value=mock_redis), \
         patch("asyncio.sleep", new_callable=AsyncMock):

        await _ingest_leaderboard()

        assert mock_api_client.get_global_player_rankings.call_count == 2
        mock_api_client.get_global_player_rankings.assert_any_call(limit=200, after=None)
        mock_api_client.get_global_player_rankings.assert_any_call(limit=200, after="cursor1")
        mock_redis.set.assert_called_once()


@pytest.mark.asyncio
async def test_fetch_top_leaderboard_configurable_top_n(mock_api_client):
    page_items = [{"tag": f"#P{i}"} for i in range(200)]
    mock_api_client.get_global_player_rankings.return_value = {
        "items": page_items,
        "paging": {"cursors": {"after": "next_cursor"}},
    }

    top_200 = await fetch_top_leaderboard_players(mock_api_client, top_n=200)
    assert len(top_200) == 200
    assert mock_api_client.get_global_player_rankings.call_count == 1


def test_real_battlelog_meta_clustering_and_rates():
    """
    Verify `analyze_meta_statistics` and `recommend_meta_armies` calculate
    usage rate (`usagePct`) and 3-star rate (`threeStarRatePct`) strictly
    from real battlelog `armyShareCode` records and generate valid CopyArmy links.
    """
    profiles = _make_real_test_profiles()
    stats = analyze_meta_statistics(profiles)

    assert stats["hasSufficientData"] is True
    assert stats["totalPlayersAnalyzed"] == 2
    assert stats["totalBattlesAnalyzed"] == 4

    result = recommend_meta_armies(stats, profiles=profiles, town_hall=18)
    assert result["hasSufficientData"] is True
    assert result["totalBattlesAnalyzed"] == 4

    top_recs = result["topRecommendations"]
    assert len(top_recs) == 2

    # Group 1 (SAMPLE_SHARE_CODE_A): 3 of 4 battles = 75.0% usage, 2 of 3 = 66.7% 3-star
    army_1 = top_recs[0]
    assert army_1["name"] == "Super Bowler + Healer + Ice Golem"
    assert army_1["usagePct"] == 75.0
    assert army_1["threeStarRatePct"] == 66.7
    assert army_1["armyShareCode"] == SAMPLE_SHARE_CODE_A
    assert army_1["armyLink"] == (
        f"https://link.clashofclans.com/en/?action=CopyArmy&army={SAMPLE_SHARE_CODE_A}"
    )

    # Group 2 (SAMPLE_SHARE_CODE_B): 1 of 4 battles = 25.0% usage, 1 of 1 = 100.0% 3-star
    army_2 = top_recs[1]
    assert army_2["name"] == "Thrower + Healer + Ruin Witch"
    assert army_2["usagePct"] == 25.0
    assert army_2["threeStarRatePct"] == 100.0
    assert army_2["armyLink"] == (
        f"https://link.clashofclans.com/en/?action=CopyArmy&army={SAMPLE_SHARE_CODE_B}"
    )

    clustered = cluster_and_recommend_meta_armies(profiles=profiles, meta_stats=stats, town_hall=18)
    assert len(clustered["topRecommendations"]) == 2


def test_insufficient_data_returns_yeterli_veri_yok_without_fake_stats():
    """
    When there are no battlelog records with `armyShareCode`, never return fake
    percentages — return `hasSufficientData: False` and `"message": "Yeterli veri yok"`.
    """
    res = recommend_meta_armies(profiles=[])
    assert res["hasSufficientData"] is False
    assert res["message"] == "Yeterli veri yok"
    assert res["topRecommendations"] == []


@pytest.mark.asyncio
async def test_generate_meta_dashboard_end_to_end(mock_redis, mock_api_client):
    profiles = _make_real_test_profiles()
    mock_api_client.get_global_player_rankings.return_value = {
        "items": [{"tag": p["tag"], "name": p["name"]} for p in profiles],
        "paging": {},
    }
    profile_map = {p["tag"]: p for p in profiles}
    mock_api_client.get_player.side_effect = lambda tag: profile_map[tag]

    dashboard = await generate_meta_dashboard(
        api_client=mock_api_client,
        redis_client=mock_redis,
        top_n=2,
        town_hall=18,
    )

    assert dashboard["status"] == "ok"
    assert dashboard["hasSufficientData"] is True
    assert dashboard["totalPlayersAnalyzed"] == 2
    assert len(dashboard["metaArmies"]["topRecommendations"]) == 2
    assert mock_redis.set.called


def test_pet_pick_rate_strictly_from_ranked_attacks():
    """
    Unit test required by specification:
    4 ranked attacks mock log (3 with pet 4, 1 with pet 9) ->
    pet 4 (Phoenix): 75.0%, pet 9 (Frosty): 25.0%.
    Defense records (attack: False) and non-ranked battles (e.g. friendly)
    MUST NOT enter calculation.
    """
    # pet 4 = Phoenix, pet 9 = Frosty
    # King (h0) with Phoenix (p4), King (h0) with Frosty (p9)
    code_pet4 = "h0p4e10_51u10x0s1x0"
    code_pet9 = "h0p9e10_51u10x0s1x0"

    mock_profile = {
        "tag": "#TESTPLAYER",
        "name": "TestScout",
        "townHallLevel": 18,
        "heroes": [
            {
                "name": "Barbarian King",
                "level": 100,
                "maxLevel": 100,
                "village": "home",
                "equipment": [{"name": "Giant Gauntlet", "level": 27}],
            }
        ],
        "pets": [
            {"name": "Phoenix", "level": 10, "maxLevel": 10},
            {"name": "Frosty", "level": 8, "maxLevel": 10},
        ],
        "battlelog": [
            # 1. Ranked Attack 1 -> pet 4
            {"battleType": "ranked", "attack": True, "armyShareCode": code_pet4, "stars": 3},
            # 2. Ranked Attack 2 -> pet 4
            {"battleType": "ranked", "attack": True, "armyShareCode": code_pet4, "stars": 2},
            # 3. Ranked Attack 3 -> pet 4
            {"battleType": "ranked", "attack": True, "armyShareCode": code_pet4, "stars": 3},
            # 4. Ranked Attack 4 -> pet 9
            {"battleType": "ranked", "attack": True, "armyShareCode": code_pet9, "stars": 1},
            # 5. DEFENSE record with pet 4 -> MUST BE EXCLUDED! (attack: False)
            {"battleType": "ranked", "attack": False, "armyShareCode": code_pet4, "stars": 0},
            # 6. NON-RANKED record with pet 9 -> MUST BE EXCLUDED! (battleType: "friendly")
            {"battleType": "friendly", "attack": True, "armyShareCode": code_pet9, "stars": 3},
        ],
    }

    stats = analyze_meta_statistics([mock_profile])

    assert stats["hasSufficientData"] is True
    pet_usage = {p["name"]: p for p in stats["petUsage"]}

    # Only Phoenix and Frosty should be present
    assert "Phoenix" in pet_usage
    assert "Frosty" in pet_usage

    # Phoenix: 3 of 4 ranked attacks = 75.0%
    assert pet_usage["Phoenix"]["count"] == 3
    assert pet_usage["Phoenix"]["pickRatePct"] == 75.0
    assert pet_usage["Phoenix"]["avgLevel"] == 10.0
    assert pet_usage["Phoenix"]["levelSource"] == "profil seviyesi"

    # Frosty: 1 of 4 ranked attacks = 25.0%
    assert pet_usage["Frosty"]["count"] == 1
    assert pet_usage["Frosty"]["pickRatePct"] == 25.0
    assert pet_usage["Frosty"]["avgLevel"] == 8.0
    assert pet_usage["Frosty"]["levelSource"] == "profil seviyesi"

    # Hero filter breakdown for Barbarian King
    king_pets = {p["name"]: p for p in stats["petUsageByHero"]["Barbarian King"]}
    assert king_pets["Phoenix"]["pickRatePct"] == 75.0
    assert king_pets["Frosty"]["pickRatePct"] == 25.0


@pytest.mark.asyncio
async def test_leaderboard_pagination_multiple_pages(mock_api_client):
    """
    Verify `fetch_top_leaderboard_players` correctly pages through
    `/locations/global/rankings/players` using limit=200 and paging.cursors.after
    to fetch up to 1,000 players.
    """
    pages = []
    for page_idx in range(5):
        items = [{"tag": f"#P_{page_idx}_{i}", "trophies": 6000 - (page_idx * 200 + i)} for i in range(200)]
        after_cursor = f"cursor_{page_idx + 1}" if page_idx < 4 else None
        paging = {"cursors": {"after": after_cursor}} if after_cursor else {}
        pages.append({"items": items, "paging": paging})

    mock_api_client.get_global_player_rankings.side_effect = pages

    players = await fetch_top_leaderboard_players(mock_api_client, top_n=1000)

    assert len(players) == 1000
    assert mock_api_client.get_global_player_rankings.call_count == 5
    # Verify descending sort by trophies
    assert players[0]["trophies"] > players[-1]["trophies"]


def test_battlelog_deduplication_by_player_time_and_opponent():
    """
    Verify duplicate attacks with identical (player_tag, battle_time, opponent_tag)
    are strictly deduplicated.
    """
    profile = {
        "tag": "#DEDUP_PLAYER",
        "name": "DedupPlayer",
        "townHallLevel": 18,
        "battlelog": [
            {
                "battleType": "ranked",
                "attack": True,
                "battleTime": "20261029T120000.000Z",
                "opponent": {"tag": "#OPP1"},
                "armyShareCode": SAMPLE_SHARE_CODE_A,
                "stars": 3,
                "destructionPercentage": 100.0,
            },
            # Exact duplicate of battle 1
            {
                "battleType": "ranked",
                "attack": True,
                "battleTime": "20261029T120000.000Z",
                "opponent": {"tag": "#OPP1"},
                "armyShareCode": SAMPLE_SHARE_CODE_A,
                "stars": 3,
                "destructionPercentage": 100.0,
            },
            # Different battle time -> valid distinct battle
            {
                "battleType": "ranked",
                "attack": True,
                "battleTime": "20261029T130000.000Z",
                "opponent": {"tag": "#OPP2"},
                "armyShareCode": SAMPLE_SHARE_CODE_B,
                "stars": 2,
                "destructionPercentage": 85.0,
            },
        ],
    }

    stats = analyze_meta_statistics([profile])
    assert stats["totalRankedAttacksAnalyzed"] == 2


def test_defense_records_completely_discarded():
    """
    Verify attack: False (defense records) are 100% dropped from pick rates
    and recommended armies.
    """
    profile = {
        "tag": "#DEF_PLAYER",
        "name": "DefenseOnly",
        "townHallLevel": 18,
        "battlelog": [
            {
                "battleType": "ranked",
                "attack": False,  # Defense record
                "armyShareCode": SAMPLE_SHARE_CODE_A,
                "stars": 0,
            },
            {
                "battleType": "ranked",
                "attack": False,  # Defense record
                "armyShareCode": SAMPLE_SHARE_CODE_B,
                "stars": 1,
            },
        ],
    }

    stats = analyze_meta_statistics([profile])
    assert stats["hasSufficientData"] is False
    assert stats["totalRankedAttacksAnalyzed"] == 0

    recs = recommend_meta_armies(profiles=[profile])
    assert recs["hasSufficientData"] is False
    assert recs["topRecommendations"] == []


@pytest.mark.asyncio
async def test_large_sample_size_progressive_dashboard_and_metadata(mock_redis, mock_api_client):
    """
    Verify requesting sample_size=1000 processes first 100 players immediately,
    returns isProcessing=True, progress information, filteredPlayersCount,
    failedPlayersCount, and totalRankedAttacksAnalyzed.
    """
    all_mock_players = [
        {"tag": f"#P{i}", "name": f"Player{i}", "trophies": 6000 - i}
        for i in range(1000)
    ]
    mock_api_client.get_global_player_rankings.return_value = {
        "items": all_mock_players,
        "paging": {},
    }
    # Mock player profile return
    mock_api_client.get_player.side_effect = lambda tag: {
        "tag": tag,
        "name": f"Name_{tag}",
        "townHallLevel": 18,
        "battlelog": [
            {
                "battleType": "ranked",
                "attack": True,
                "battleTime": f"20261029T100000_{tag}",
                "armyShareCode": SAMPLE_SHARE_CODE_A,
                "stars": 3,
                "destructionPercentage": 100.0,
            }
        ],
    }

    dashboard = await generate_meta_dashboard(
        api_client=mock_api_client,
        redis_client=mock_redis,
        sample_size=1000,
        town_hall=18,
    )

    assert dashboard["sampleSize"] == 1000
    assert dashboard["isProcessing"] is True
    assert dashboard["totalPlayersAnalyzed"] == 100
    assert dashboard["filteredPlayersCount"] == 100
    assert "progress" in dashboard
    assert dashboard["progress"]["processed"] == 100
    assert dashboard["progress"]["target"] == 1000
    assert dashboard["progress"]["percentage"] == 10.0
    assert "dataFetchedAt" in dashboard


def test_hero_pick_rate_strictly_from_ranked_attacks():
    """
    Verify `heroUsage` correctly calculates pick rates for all 6 heroes
    (including Minion Prince & Dragon Duke) strictly from ranked attack records.
    Defense records (attack: False) must be completely excluded.
    """
    # SAMPLE_SHARE_CODE_A has: h0 (King), h1 (Queen), h2 (Warden), h7 (Dragon Duke)
    # SAMPLE_SHARE_CODE_B has: h0 (King), h1 (Queen), h2 (Warden), h7 (Dragon Duke)
    # Code with h0 (King) only
    code_king_only = "h0p4e10_51u10x0s1x0"
    # Code with h0 (King) and h6 (Minion Prince)
    code_king_minion = "h0p4e10_51-6p0e52_53u10x0s1x0"

    mock_profile = {
        "tag": "#HERO_PLAYER",
        "name": "HeroTester",
        "townHallLevel": 18,
        "heroes": [
            {"name": "Barbarian King", "level": 105, "maxLevel": 105, "village": "home"},
            {"name": "Archer Queen", "level": 105, "maxLevel": 105, "village": "home"},
            {"name": "Grand Warden", "level": 75, "maxLevel": 80, "village": "home"},
            {"name": "Royal Champion", "level": 45, "maxLevel": 50, "village": "home"},
            {"name": "Minion Prince", "level": 80, "maxLevel": 80, "village": "home"},
            {"name": "Dragon Duke", "level": 50, "maxLevel": 50, "village": "home"},
        ],
        "battlelog": [
            # 1. Attack 1: King, Queen, Warden, Dragon Duke (SAMPLE_SHARE_CODE_A)
            {"battleType": "ranked", "attack": True, "battleTime": "20261029T010000Z", "armyShareCode": SAMPLE_SHARE_CODE_A, "stars": 3},
            # 2. Attack 2: King, Queen, Warden, Dragon Duke (SAMPLE_SHARE_CODE_B)
            {"battleType": "ranked", "attack": True, "battleTime": "20261029T020000Z", "armyShareCode": SAMPLE_SHARE_CODE_B, "stars": 3},
            # 3. Attack 3: King only
            {"battleType": "ranked", "attack": True, "battleTime": "20261029T030000Z", "armyShareCode": code_king_only, "stars": 2},
            # 4. Attack 4: King and Minion Prince
            {"battleType": "ranked", "attack": True, "battleTime": "20261029T040000Z", "armyShareCode": code_king_minion, "stars": 3},
            # 5. DEFENSE: Should be ignored completely
            {"battleType": "ranked", "attack": False, "battleTime": "20261029T050000Z", "armyShareCode": code_king_minion, "stars": 0},
        ],
    }

    stats = analyze_meta_statistics([mock_profile])
    assert stats["hasSufficientData"] is True
    assert stats["totalRankedAttacksAnalyzed"] == 4

    hero_map = {h["name"]: h for h in stats["heroUsage"]}
    assert len(hero_map) == 6

    # Barbarian King used in all 4 attacks -> 100.0%
    assert hero_map["Barbarian King"]["count"] == 4
    assert hero_map["Barbarian King"]["pickRatePct"] == 100.0
    assert hero_map["Barbarian King"]["avgLevel"] == 105.0
    assert hero_map["Barbarian King"]["maxedPct"] == 100.0

    # Archer Queen used in attacks 1 & 2 -> 50.0%
    assert hero_map["Archer Queen"]["count"] == 2
    assert hero_map["Archer Queen"]["pickRatePct"] == 50.0

    # Grand Warden used in attacks 1 & 2 -> 50.0%
    assert hero_map["Grand Warden"]["count"] == 2
    assert hero_map["Grand Warden"]["pickRatePct"] == 50.0

    # Dragon Duke used in attacks 1 & 2 -> 50.0%
    assert hero_map["Dragon Duke"]["count"] == 2
    assert hero_map["Dragon Duke"]["pickRatePct"] == 50.0

    # Minion Prince used in attack 4 -> 25.0%
    assert hero_map["Minion Prince"]["count"] == 1
    assert hero_map["Minion Prince"]["pickRatePct"] == 25.0

    # Royal Champion used in 0 attacks -> 0.0%
    assert hero_map["Royal Champion"]["count"] == 0
    assert hero_map["Royal Champion"]["pickRatePct"] == 0.0



