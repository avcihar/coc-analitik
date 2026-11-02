"""
Automated Verification Tests: Battlelog Service & CWL Scout Pipeline Consistency
================================================================================
Verifies that:
  1. Pipeline Consistency (Mock & Live for #P89PCUPUQ and #2LYV0VYQ9):
       - (1) Bireysel sorgudaki `attack: true` kayıtların `armyShareCode` listesi ile
         (2) CWL'in seçtiği ordular aynı kodları içerir.
       - Savunma kodları (`attack: false`) CWL çıktısında ASLA bulunmaz.
  2. Player Army Statistics:
       - (a) Aynı ordudan 3 saldırı (2'si 3 yıldız) + farklı ordudan 2 saldırı (0 yıldız):
             Doğru "en çok kullandığı" ve "en çok 3 yıldız aldığı" ordu belirlenir.
       - (b) Kalesi farklı (i ve d) ama u ve s aynı iki kayıt aynı grupta toplanır.
       - (c) `attack: false` ve ranked olmayan kayıtlar oyuncu istatistiğine girmez.
       - (d) Sadece savunma kaydı olan oyuncuda "Saldırı kaydı yok" döner, ordu gösterilmez.
  3. Failure Modes:
       - "API hatası (403/429/5xx)", "Battle log boş", "Saldırı kaydı yok", "Ranked kayıt yok",
         "armyShareCode yok" ayrı ayrı raporlanır, asla tek mesaja düşürülmez.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch
import pytest

from services.api.battlelog_service import (
    clear_battlelog_cache,
    compute_army_signature,
    compute_clan_army_meta,
    compute_player_army_stats,
    extract_defenses_against,
    extract_scout_armies,
    fetch_and_enrich_player_battlelog,
)
from services.api.client import (
    AuthenticationError,
    CoCAPIClient,
    MaintenanceBreakError,
    RateLimitError,
)
from services.workers.cwl_scout import (
    AsyncRateLimiter,
    _build_opponent_scout_entry,
    _fetch_player_and_battlelog,
)

SAMPLE_CODE_A1 = (
    "h1p17e17_48-2m1p16e4_34-6p4e49_43-7p11e52_60"
    "i1x188-1x63-1x76d1x2-1x98"
    "u7x57-7x8-6x65-2x10-2x1"
    "s2x35-6x109-1x120-1x70"
)

# Same u and s as A1, but different Clan Castle (i, d) and different heroes
SAMPLE_CODE_A2_DIFF_CC = (
    "h0p9e14_32-1p3e48_39-2p16e5_24"
    "i2x50d2x60"
    "u2x1-2x10-7x8-7x57-6x65"
    "s1x70-2x35-6x109-1x120"
)

SAMPLE_CODE_B = (
    "h0p10e14_32-1p9e39_48-2p16e5_24-7p4e52_60"
    "i1x135-3x57-1x58-1x132d2x98"
    "u3x1-8x132-2x5-5x7-1x150-2x58-2x109-2x28-2x4-1x6-3x55-2x0-1x82"
    "s2x120-2x5-1x35-1x17-1x9-2x109-1x70"
)

SAMPLE_DEFENSE_CODE = (
    "h0p9e14_32-1p3e48_39-2p16e5_24"
    "i1x100d1x200"
    "u12x57-4x7"
    "s4x35-2x120"
)


def _mock_battlelog_for_tag(tag: str):
    clean = tag.lstrip("#").upper()
    if clean == "P89PCUPUQ":
        return {
            "items": [
                {
                    "battleType": "ranked",
                    "attack": False,
                    "armyShareCode": SAMPLE_DEFENSE_CODE,
                    "opponentName": "AttackingOpponent1",
                    "opponentTownHallLevel": 18,
                    "stars": 2,
                    "destructionPercentage": 75,
                },
                {
                    "battleType": "ranked",
                    "attack": True,
                    "armyShareCode": SAMPLE_CODE_A1,
                    "opponentName": "DefendingBaseA",
                    "opponentTownHallLevel": 18,
                    "stars": 3,
                    "destructionPercentage": 100,
                },
                {
                    "battleType": "homeVillage",
                    "attack": True,
                    "armyShareCode": SAMPLE_CODE_B,
                    "opponentName": "HomeBaseB",
                    "opponentTownHallLevel": 18,
                    "stars": 2,
                    "destructionPercentage": 85,
                },
            ]
        }
    if clean == "2LYV0VYQ9":
        return {
            "items": [
                {
                    "battleType": "ranked",
                    "attack": False,
                    "armyShareCode": SAMPLE_DEFENSE_CODE,
                    "opponentName": "AttackingOpponent2",
                    "opponentTownHallLevel": 18,
                    "stars": 1,
                    "destructionPercentage": 52,
                },
                {
                    "battleType": "ranked",
                    "attack": True,
                    "armyShareCode": SAMPLE_CODE_B,
                    "opponentName": "RankedDefenderB",
                    "opponentTownHallLevel": 18,
                    "stars": 3,
                    "destructionPercentage": 100,
                },
            ]
        }
    return {"items": []}


@pytest.mark.asyncio
async def test_pipeline_consistency_mock():
    """
    Verify:
      (1) The list of armyShareCodes from attack:true records in individual query and
          the armies selected by CWL (recentArmies) contain the same codes.
      (2) Defense codes (attack:false) MUST NEVER appear in CWL scout output!
    """
    clear_battlelog_cache()
    mock_api = AsyncMock(spec=CoCAPIClient)
    mock_api.get_player_battlelog.side_effect = lambda t: _mock_battlelog_for_tag(t)
    mock_api.get_player.side_effect = lambda t: {
        "tag": f"#{t.lstrip('#')}",
        "name": f"Player_{t.lstrip('#')}",
        "townHallLevel": 18,
        "heroes": [],
    }

    rate_limiter = AsyncRateLimiter(max_calls=10, period=1.0)
    for tag in ["#P89PCUPUQ", "#2LYV0VYQ9"]:
        # 1. Individual query
        indiv_res = await fetch_and_enrich_player_battlelog(mock_api, tag)
        assert indiv_res["status"] == "ok"
        indiv_attacks = [
            it["armyShareCode"]
            for it in indiv_res["items"]
            if it.get("attack") is True and it.get("armyShareCode")
        ]
        indiv_defenses = {
            it["armyShareCode"]
            for it in indiv_res["items"]
            if it.get("attack") is False and it.get("armyShareCode")
        }

        # 2. CWL scout pipeline
        raw_prof, raw_bl = await _fetch_player_and_battlelog(
            api_client=mock_api,
            p_tag=tag,
            fallback_name=tag,
            fallback_th=18,
            rate_limiter=rate_limiter,
        )
        member_stub = {"tag": tag, "name": raw_prof.get("name"), "townHallLevel": 18, "mapPosition": 1, "attacks": []}
        cwl_entry = _build_opponent_scout_entry(member_stub, raw_prof, {}, battlelog=raw_bl)

        assert cwl_entry["armyDetected"] is True
        cwl_recent_codes = [a["armyShareCode"] for a in cwl_entry.get("recentArmies", [])]

        # Verification: CWL recent codes must be in individual attack codes
        for code in cwl_recent_codes:
            assert code in indiv_attacks, f"CWL code {code} not in individual attack codes!"

        # Verification: Defense codes MUST NEVER be in CWL output!
        for def_code in indiv_defenses:
            if def_code not in indiv_attacks:  # strictly defense-only code
                assert def_code not in cwl_recent_codes, f"Defense code {def_code} leaked into CWL recent armies!"
                assert cwl_entry["armyShareCode"] != def_code, f"CWL primary army is a defense code!"


@pytest.mark.asyncio
async def test_pipeline_consistency_live_p89_and_2ly():
    """
    Live Supercell API test for #P89PCUPUQ and #2LYV0VYQ9:
    Verifies that CWL scout selected armies ONLY contain attack:true codes
    and NEVER contain attack:false defense codes.
    Reports the real-data player summary for #P89PCUPUQ.
    """
    clear_battlelog_cache()
    api_client = CoCAPIClient()
    rate_limiter = AsyncRateLimiter(max_calls=10, period=1.0)

    try:
        for tag in ["#P89PCUPUQ", "#2LYV0VYQ9"]:
            indiv_res = await fetch_and_enrich_player_battlelog(api_client, tag)
            if indiv_res.get("status") == "error":
                pytest.skip(f"Live API unavailable or rate limited: {indiv_res.get('reason')}")

            attack_codes = [
                it["armyShareCode"]
                for it in indiv_res.get("items", [])
                if it.get("attack") is True and it.get("armyShareCode")
            ]
            defense_only_codes = {
                it["armyShareCode"]
                for it in indiv_res.get("items", [])
                if it.get("attack") is False and it.get("armyShareCode")
            } - set(attack_codes)

            raw_prof, raw_bl = await _fetch_player_and_battlelog(
                api_client=api_client,
                p_tag=tag,
                fallback_name=tag,
                fallback_th=18,
                rate_limiter=rate_limiter,
            )
            member_stub = {"tag": tag, "name": raw_prof.get("name"), "townHallLevel": 18, "mapPosition": 1, "attacks": []}
            cwl_entry = _build_opponent_scout_entry(member_stub, raw_prof, {}, battlelog=raw_bl)

            cwl_codes = [a["armyShareCode"] for a in cwl_entry.get("recentArmies", [])]

            # 1. If attacks exist, CWL army must be detected and from attack_codes
            if attack_codes:
                assert cwl_entry["armyDetected"] is True
                assert cwl_entry["armyShareCode"] in attack_codes
                for code in cwl_codes:
                    assert code in attack_codes

            # 2. Defense-only codes must NEVER appear in CWL output
            for def_code in defense_only_codes:
                assert def_code not in cwl_codes
                assert cwl_entry["armyShareCode"] != def_code

            # Print player summary for #P89PCUPUQ
            if tag == "#P89PCUPUQ":
                stats = cwl_entry.get("playerArmyStats") or {}
                print("\n================ REAL DATA REPORT: #P89PCUPUQ ================")
                print(f"Oyuncu: {raw_prof.get('name')}")
                print(f"Dayanak Sayisi: {stats.get('sampleSizeLabel')}")
                most_used = stats.get("mostUsedArmy") or {}
                print(f"En Cok Kullandigi Ordu: {most_used.get('armyName')} (Kullanim: {most_used.get('usageCount')}, 3-Yildiz Orani: %{most_used.get('threeStarRate')})")
                best_3star = stats.get("bestThreeStarArmy") or {}
                print(f"En Cok 3 Yildiz Aldigi Ordu: {best_3star.get('armyName')} (3-Yildiz Sayisi: {best_3star.get('threeStarCount')}, 3-Yildiz Orani: %{best_3star.get('threeStarRate')})")
                print(f"Birlestirildi mi: {stats.get('isCombined')} -> {stats.get('summaryLabel')}")
                print(f"Ordu Kopyala Linki: {most_used.get('armyLink')}")
                print("================================================================")
    finally:
        await api_client.close()


def test_player_army_stats_three_star_and_usage_clustering():
    """
    Test (a): 3 attacks with Army A (2 of which are 3 stars) + 2 attacks with Army B (0 stars)
    -> Correct most-used and best 3-star army.
    """
    items = [
        # Army A: 3 attacks (2 with 3 stars, 1 with 2 stars)
        {"battleType": "ranked", "attack": True, "stars": 3, "destructionPercentage": 100, "armyShareCode": SAMPLE_CODE_A1},
        {"battleType": "ranked", "attack": True, "stars": 3, "destructionPercentage": 100, "armyShareCode": SAMPLE_CODE_A1},
        {"battleType": "ranked", "attack": True, "stars": 2, "destructionPercentage": 85, "armyShareCode": SAMPLE_CODE_A1},
        # Army B: 2 attacks (0 with 3 stars)
        {"battleType": "ranked", "attack": True, "stars": 2, "destructionPercentage": 90, "armyShareCode": SAMPLE_CODE_B},
        {"battleType": "ranked", "attack": True, "stars": 1, "destructionPercentage": 60, "armyShareCode": SAMPLE_CODE_B},
    ]

    stats = compute_player_army_stats(items)
    assert stats["totalRankedAttacks"] == 5
    assert stats["sampleSize"] == 5
    assert stats["sampleSizeLabel"] == "Son 5 ranked saldırı üzerinden"
    assert stats["isLowData"] is False
    assert stats["lowDataBadge"] is None

    # Army A should be most used
    most_used = stats["mostUsedArmy"]
    assert most_used is not None
    assert most_used["usageCount"] == 3
    assert most_used["threeStarCount"] == 2
    assert most_used["threeStarRate"] == 66.7
    assert most_used["representativeArmyShareCode"] == SAMPLE_CODE_A1

    # Army A should also be best 3-star
    best_3star = stats["bestThreeStarArmy"]
    assert best_3star is not None
    assert best_3star["usageCount"] == 3
    assert best_3star["threeStarCount"] == 2

    # Should be combined into single row
    assert stats["isCombined"] is True
    assert stats["summaryLabel"] == "En çok kullandığı ve en çok 3 yıldız aldığı ordu"


def test_clan_castle_different_same_signature():
    """
    Test (b): Different Clan Castle (i and d sections), but identical u and s
    -> Must be clustered into the EXACT same army group.
    """
    sig1 = compute_army_signature(SAMPLE_CODE_A1)
    sig2 = compute_army_signature(SAMPLE_CODE_A2_DIFF_CC)
    assert sig1 == sig2, f"Signatures should be identical! {sig1} vs {sig2}"

    items = [
        {"battleType": "ranked", "attack": True, "stars": 3, "destructionPercentage": 100, "armyShareCode": SAMPLE_CODE_A1},
        {"battleType": "ranked", "attack": True, "stars": 3, "destructionPercentage": 100, "armyShareCode": SAMPLE_CODE_A2_DIFF_CC},
    ]

    stats = compute_player_army_stats(items)
    assert stats["totalRankedAttacks"] == 2
    assert len(stats["armyGroups"]) == 1
    assert stats["armyGroups"][0]["usageCount"] == 2
    assert stats["armyGroups"][0]["threeStarCount"] == 2


def test_player_army_stats_ignores_defense_and_non_ranked():
    """
    Test (c): attack:false and non-ranked (homeVillage) records must NOT enter player army stats.
    """
    items = [
        # Ranked attack (MUST BE INCLUDED)
        {"battleType": "ranked", "attack": True, "stars": 3, "destructionPercentage": 100, "armyShareCode": SAMPLE_CODE_A1},
        # Ranked defense (MUST BE EXCLUDED)
        {"battleType": "ranked", "attack": False, "stars": 2, "destructionPercentage": 70, "armyShareCode": SAMPLE_DEFENSE_CODE, "opponentName": "Enemy1"},
        # HomeVillage attack (MUST BE EXCLUDED from stats)
        {"battleType": "homeVillage", "attack": True, "stars": 3, "destructionPercentage": 100, "armyShareCode": SAMPLE_CODE_B},
        # HomeVillage defense (MUST BE EXCLUDED from stats)
        {"battleType": "homeVillage", "attack": False, "stars": 1, "destructionPercentage": 40, "armyShareCode": SAMPLE_DEFENSE_CODE, "opponentName": "Enemy2"},
    ]

    stats = compute_player_army_stats(items)
    # Only 1 ranked attack was present
    assert stats["totalRankedAttacks"] == 1
    assert stats["sampleSize"] == 1
    assert stats["sampleSizeLabel"] == "Son 1 ranked saldırı üzerinden"
    assert stats["isLowData"] is True
    assert stats["lowDataBadge"] == "Düşük veri"

    # Defenses list should contain both defense records
    defenses = extract_defenses_against(items)
    assert len(defenses) == 2
    assert defenses[0]["opponentName"] == "Enemy1"
    assert defenses[1]["opponentName"] == "Enemy2"


def test_only_defenses_returns_no_attack_record():
    """
    Test (d): Player with ONLY defense records (attack: false)
    -> Must return 'Saldırı kaydı yok', armyDetected: False, no army shown.
    """
    items = [
        {"battleType": "ranked", "attack": False, "stars": 3, "destructionPercentage": 100, "armyShareCode": SAMPLE_DEFENSE_CODE, "opponentName": "AttackerA"},
        {"battleType": "homeVillage", "attack": False, "stars": 2, "destructionPercentage": 75, "armyShareCode": SAMPLE_DEFENSE_CODE, "opponentName": "AttackerB"},
    ]

    armies, reason = extract_scout_armies({"items": items, "status": "ok", "reason": "Saldırı kaydı yok"})
    assert armies == []
    assert reason == "Saldırı kaydı yok"

    dummy_member = {"tag": "#DEF_ONLY", "name": "DefPlayer", "townHallLevel": 18, "mapPosition": 1, "attacks": []}
    dummy_prof = {"tag": "#DEF_ONLY", "name": "DefPlayer", "townHallLevel": 18, "heroes": []}
    scout_entry = _build_opponent_scout_entry(
        dummy_member,
        dummy_prof,
        {},
        battlelog={"items": items, "status": "ok", "reason": "Saldırı kaydı yok"},
    )

    assert scout_entry["armyDetected"] is False
    assert scout_entry["armySourceLabel"] == "Saldırı kaydı yok"
    assert scout_entry["failureReason"] == "Saldırı kaydı yok"
    assert scout_entry["armyLink"] == ""
    assert scout_entry["troops"] == []
    assert len(scout_entry["defensesAgainst"]) == 2


@pytest.mark.asyncio
async def test_failure_modes_are_distinguished_and_never_collapsed():
    """
    Verify that the failure categories:
      - "API hatası (403/429/5xx)"
      - "Battle log boş"
      - "Saldırı kaydı yok"
      - "Ranked kayıt yok"
      - "armyShareCode yok"
    are explicitly reported without falling back to a single generic message.
    """
    clear_battlelog_cache()
    mock_api = AsyncMock(spec=CoCAPIClient)
    dummy_member = {"tag": "#TEST", "name": "FailTest", "townHallLevel": 18, "mapPosition": 1, "attacks": []}
    dummy_profile = {"tag": "#TEST", "name": "FailTest", "townHallLevel": 18, "heroes": []}

    # Case 1: API Hatası (429)
    mock_api.get_player_battlelog.side_effect = RateLimitError("Rate limited")
    bl_429 = await fetch_and_enrich_player_battlelog(mock_api, "#RATE_FAIL", retry_delay=0.01)
    assert bl_429["status"] == "error"
    assert bl_429["reason"] == "API hatası (429)"
    scout_429 = _build_opponent_scout_entry(dummy_member, dummy_profile, {}, battlelog=bl_429)
    assert scout_429["armyDetected"] is False
    assert scout_429["armySourceLabel"] == "API hatası (429)"

    # Case 2: Battle log boş
    mock_api.get_player_battlelog.side_effect = None
    mock_api.get_player_battlelog.return_value = {"items": []}
    bl_empty = await fetch_and_enrich_player_battlelog(mock_api, "#EMPTY_TAG")
    assert bl_empty["status"] == "empty"
    assert bl_empty["reason"] == "Battle log boş"
    scout_empty = _build_opponent_scout_entry(dummy_member, dummy_profile, {}, battlelog=bl_empty)
    assert scout_empty["armyDetected"] is False
    assert scout_empty["armySourceLabel"] == "Battle log boş"

    # Case 3: Saldırı kaydı yok (only defenses in log)
    mock_api.get_player_battlelog.return_value = {
        "items": [
            {"battleType": "ranked", "attack": False, "stars": 3, "armyShareCode": SAMPLE_DEFENSE_CODE}
        ]
    }
    bl_nodef = await fetch_and_enrich_player_battlelog(mock_api, "#NO_ATTACK")
    assert bl_nodef["reason"] == "Saldırı kaydı yok"
    scout_nodef = _build_opponent_scout_entry(dummy_member, dummy_profile, {}, battlelog=bl_nodef)
    assert scout_nodef["armyDetected"] is False
    assert scout_nodef["armySourceLabel"] == "Saldırı kaydı yok"
