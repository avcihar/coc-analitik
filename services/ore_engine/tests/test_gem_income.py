"""
Unit Tests for Gem & Ore Income Config and Simulation Engine
===========================================================
Validates Section 8 requirements:
  1. Legend Star Bonus 10-day income: (12500, 720, 20)
  2. Clan War 14 wars win: (31080, 1092, 168), all loss: (15540, 546, 84)
  3. CWL 7 wars win: (7770, 273, 42), all loss: (3885, 133, 21)
  4. Raid Medals 4 weeks: (0, 400, 40)
  5. Empty inventory defaults to 0
  6. Epic equipment 1->27 total cost equals (56060, 3720, 480)
  7. Event ore: Pass + Medals = (5000, 1600, 160), Free = (5000, 400, 0)
  8. Three scenarios (min, estimated, max) simulation for player equipment deficit
"""

from __future__ import annotations

import datetime
import pytest

from services.ore_engine.equipment_costs import OreCost
from services.ore_engine.gem_income_config import (
    CWL_WAR_COUNT,
    DEFAULT_CW_LOSS_ORE,
    DEFAULT_CW_WARS_MONTHLY,
    DEFAULT_CW_WIN_ORE,
    DEFAULT_CWL_LOSS_ORE,
    DEFAULT_CWL_WIN_ORE,
    DEFAULT_LEAGUE_TIER_ID,
    EPIC_FULL_MAX_COST,
    EVENT_FREE_PLAN_ORE,
    LEAGUE_TIERS,
    LEAGUE_TIERS_BY_ID,
    WEEKLY_RAID_MEDALS_ORE,
    compute_cw_loss_ore,
    compute_cwl_loss_ore,
    compute_epic_full_max_cost,
    compute_single_event_ore,
    get_league_tier_by_id,
    match_league_to_37_tiers,
)
from services.ore_engine.forecaster import (
    ScenarioResult,
    SimulationOreSettings,
    simulate_all_scenarios,
    simulate_scenario,
)


def test_37_leagues_count_and_unranked_zero():
    """Verify that there are 37 league tiers and Unranked defaults to 0,0,0."""
    assert len(LEAGUE_TIERS) == 37
    unranked = LEAGUE_TIERS[0]
    assert unranked.id == 105000000
    assert unranked.is_unknown is True
    assert unranked.daily_reward == OreCost(0, 0, 0)


def test_legend_league_daily_bonus_10_days():
    """Requirement: Efsane Ligi günlük bonus: 10 günde (12.500, 720, 20)."""
    legend_i = LEAGUE_TIERS_BY_ID[105000036]  # Legend I
    daily = legend_i.daily_reward
    assert daily == OreCost(1250, 72, 2)

    ten_days = daily * 10
    assert ten_days == OreCost(12500, 720, 20)
    assert ten_days.shiny == 12500
    assert ten_days.glowy == 720
    assert ten_days.starry == 20


def test_clan_war_14_wars_win_and_loss():
    """
    Requirement:
      Klan savaşı kazanç: 14 savaş × (2220,78,12) = (31.080, 1.092, 168).
      Hepsi kayıp: (15.540, 546, 84).
    """
    win_reward = DEFAULT_CW_WIN_ORE
    assert win_reward == OreCost(2220, 78, 12)

    loss_reward = compute_cw_loss_ore(win_reward)
    assert loss_reward == OreCost(1110, 39, 6)

    total_win = win_reward * 14
    assert total_win == OreCost(31080, 1092, 168)
    assert total_win.shiny == 31080
    assert total_win.glowy == 1092
    assert total_win.starry == 168

    total_loss = loss_reward * 14
    assert total_loss == OreCost(15540, 546, 84)
    assert total_loss.shiny == 15540
    assert total_loss.glowy == 546
    assert total_loss.starry == 84


def test_cwl_7_wars_win_and_loss():
    """
    Requirement:
      CWL tam kazanç: 7 × (1110,39,6) = (7.770, 273, 42).
      Tam kayıp: 7 × (555,19,3) = (3.885, 133, 21).
    """
    win_reward = DEFAULT_CWL_WIN_ORE
    assert win_reward == OreCost(1110, 39, 6)

    loss_reward = compute_cwl_loss_ore(win_reward)
    # 1110//2=555, 39//2=19, 6//2=3
    assert loss_reward == OreCost(555, 19, 3)

    total_win = win_reward * 7
    assert total_win == OreCost(7770, 273, 42)
    assert total_win.shiny == 7770
    assert total_win.glowy == 273
    assert total_win.starry == 42

    total_loss = loss_reward * 7
    assert total_loss == OreCost(3885, 133, 21)
    assert total_loss.shiny == 3885
    assert total_loss.glowy == 133
    assert total_loss.starry == 21


def test_raid_medals_4_weeks():
    """Requirement: Baskın: 4 hafta = (0, 400, 40)."""
    weekly = WEEKLY_RAID_MEDALS_ORE
    assert weekly == OreCost(0, 100, 10)

    four_weeks = weekly * 4
    assert four_weeks == OreCost(0, 400, 40)
    assert four_weeks.shiny == 0
    assert four_weeks.glowy == 400
    assert four_weeks.starry == 40


def test_empty_inventory_defaults_to_zero():
    """Requirement: Envanter boş girilirse 0 kabul edildiğini doğrula."""
    settings = SimulationOreSettings()
    assert settings.inventory == OreCost(0, 0, 0)

    # When deficit is 100, 50, 10 and inventory is default 0
    deficit = OreCost(100, 50, 10)
    res = simulate_scenario(deficit, settings)
    assert res.net_needed == deficit


def test_epic_max_cost_strictly_equals_table_sum():
    """Requirement: Yeni epik ekipman ihtiyacı tablodan hesaplanınca (56.060, 3.720, 480) çıkmalı."""
    epic_cost = compute_epic_full_max_cost()
    assert epic_cost == OreCost(56060, 3720, 480)
    assert EPIC_FULL_MAX_COST == OreCost(56060, 3720, 480)


def test_event_ore_pass_and_medals():
    """
    Requirement:
      Bilet + madalya açıkken tek etkinlik geliri: (5.000, 1.600, 160).
      Ücretsiz: (5.000, 400, 0).
    """
    free_only = compute_single_event_ore(has_event_pass=False, has_event_medals=False)
    assert free_only == OreCost(5000, 400, 0)

    pass_and_medals = compute_single_event_ore(has_event_pass=True, has_event_medals=True)
    assert pass_and_medals == OreCost(5000, 1600, 160)


def test_inventory_fulfillment_returns_completed_today():
    """If inventory >= base deficit and future epics disabled, returns completed today."""
    deficit = OreCost(1000, 100, 20)
    settings = SimulationOreSettings(
        inventory=OreCost(1000, 100, 20),
        include_future_epics=False,
    )
    res = simulate_scenario(deficit, settings)
    assert res.is_completed_today is True
    assert res.days_to_complete == 0


def test_three_scenarios_order():
    """
    Verify that for a realistic deficit:
      Minimum days <= Estimated days <= Maximum days.
    """
    deficit = OreCost(80000, 5000, 600)
    settings = SimulationOreSettings(
        league_tier_id=105000036,  # Legend I
        monthly_cw_count=14,
        cw_win_count=10,
        participates_cwl=True,
        cwl_win_count=5,
        include_raid_medals=True,
        include_future_epics=False,
    )
    scenarios = simulate_all_scenarios(deficit, settings)

    min_res = scenarios["min"]
    est_res = scenarios["estimated"]
    max_res = scenarios["max"]

    assert min_res.days_to_complete <= est_res.days_to_complete
    assert est_res.days_to_complete <= max_res.days_to_complete
    assert est_res.bottleneck_ore in ("shiny", "glowy", "starry")


def test_titan_league_mapping_and_aliases():
    """
    Requirement:
      Titan 25/26/27 : (1190,69,1) (1195,69,1) (1200,69,1)
      Titan League I / Titan 1 maps to Titan 27 (105000027, 1200, 69, 1).
      Titan League II / Titan 2 maps to Titan 26 (105000026, 1195, 69, 1).
      Titan League III / Titan 3 maps to Titan 25 (105000025, 1190, 69, 1).
    """
    # Titan 1 / Titan League I
    t27_by_name = match_league_to_37_tiers("Titan League I")
    assert t27_by_name.id == 105000027
    assert t27_by_name.name_tr == "Titan 27"
    assert t27_by_name.daily_reward == OreCost(1200, 69, 1)

    t27_by_alias = match_league_to_37_tiers("titan 1")
    assert t27_by_alias.id == 105000027

    t27_by_legacy_id = match_league_to_37_tiers(raw_id=29000021)
    assert t27_by_legacy_id.id == 105000027

    # Titan 2 / Titan League II
    t26_by_name = match_league_to_37_tiers("Titan League II")
    assert t26_by_name.id == 105000026
    assert t26_by_name.name_tr == "Titan 26"
    assert t26_by_name.daily_reward == OreCost(1195, 69, 1)

    t26_by_alias = match_league_to_37_tiers("titan 2")
    assert t26_by_alias.id == 105000026

    t26_by_legacy_id = match_league_to_37_tiers(raw_id=29000020)
    assert t26_by_legacy_id.id == 105000026

    # Titan 3 / Titan League III
    t25_by_name = match_league_to_37_tiers("Titan League III")
    assert t25_by_name.id == 105000025
    assert t25_by_name.name_tr == "Titan 25"
    assert t25_by_name.daily_reward == OreCost(1190, 69, 1)

    t25_by_alias = match_league_to_37_tiers("titan 3")
    assert t25_by_alias.id == 105000025

    t25_by_legacy_id = match_league_to_37_tiers(raw_id=29000019)
    assert t25_by_legacy_id.id == 105000025


def test_all_12_troop_tiers_match_daily_bonus():
    """Verify all 37 tiers match the exact daily ore tuples requested."""
    expected = {
        105000000: (0, 0, 0),        # Sıralanmamış
        105000001: (790, 39, 1),     # İskelet 1
        105000002: (795, 39, 1),     # İskelet 2
        105000003: (800, 39, 1),     # İskelet 3
        105000004: (850, 44, 1),     # Barbar 4
        105000005: (855, 44, 1),     # Barbar 5
        105000006: (860, 44, 1),     # Barbar 6
        105000007: (910, 49, 1),     # Okçu 7
        105000008: (915, 49, 1),     # Okçu 8
        105000009: (920, 49, 1),     # Okçu 9
        105000010: (970, 52, 1),     # Büyücü 10
        105000011: (975, 52, 1),     # Büyücü 11
        105000012: (980, 52, 1),     # Büyücü 12
        105000013: (1030, 57, 1),    # Valkyrie 13
        105000014: (1035, 57, 1),    # Valkyrie 14
        105000015: (1040, 57, 1),    # Valkyrie 15
        105000016: (1090, 60, 1),    # Cadı 16
        105000017: (1095, 60, 1),    # Cadı 17
        105000018: (1100, 60, 1),    # Cadı 18
        105000019: (1150, 63, 1),    # Golem 19
        105000020: (1155, 63, 1),    # Golem 20
        105000021: (1160, 63, 1),    # Golem 21
        105000022: (1170, 66, 1),    # P.E.K.K.A 22
        105000023: (1175, 66, 1),    # P.E.K.K.A 23
        105000024: (1180, 66, 1),    # P.E.K.K.A 24
        105000025: (1190, 69, 1),    # Titan 25
        105000026: (1195, 69, 1),    # Titan 26
        105000027: (1200, 69, 1),    # Titan 27
        105000028: (1210, 70, 1),    # Ejderha 28
        105000029: (1215, 70, 1),    # Ejderha 29
        105000030: (1220, 70, 1),    # Ejderha 30
        105000031: (1230, 71, 2),    # Elektro 31
        105000032: (1235, 71, 2),    # Elektro 32
        105000033: (1240, 71, 2),    # Elektro 33
        105000034: (1250, 72, 2),    # Efsane III
        105000035: (1250, 72, 2),    # Efsane II
        105000036: (1250, 72, 2),    # Efsane I
    }
    for tid, (shiny, glowy, starry) in expected.items():
        tier = get_league_tier_by_id(tid)
        assert tier.id == tid
        assert (tier.daily_shiny, tier.daily_glowy, tier.daily_starry) == (shiny, glowy, starry)


def test_league_tiers_match_response_json():
    """Verify that all 37 tiers match response_1793638564709.json IDs, names, and icon URLs."""
    import json
    import os

    json_path = "C:/Users/avcih/Desktop/response_1793638564709.json"
    if not os.path.exists(json_path):
        pytest.skip(f"{json_path} not found")

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    assert len(data["items"]) == 37
    assert len(LEAGUE_TIERS) == 37

    for item, tier in zip(data["items"], LEAGUE_TIERS):
        assert tier.id == item["id"]
        assert tier.name == item["name"]
        assert tier.icon_small == item["iconUrls"]["small"]
        assert tier.icon_large == item["iconUrls"]["large"]



