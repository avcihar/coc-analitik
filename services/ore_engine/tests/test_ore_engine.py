"""
Ore Progression Engine — Unit Tests
=====================================
Covers:
  1. Cost Tables:
     - Per-level cost lookups (Common & Epic, boundary levels)
     - Cumulative cost monotonicity
     - range_cost and total_cost_to_max correctness
     - Out-of-range level validation
     - OreCost arithmetic operators

  2. Calculator:
     - Mode B: all equipment deficit, maxed items detection
     - Mode A: meta overrides, fallback heuristic
     - Already-maxed equipment returns zero deficit

  3. Forecaster:
     - Daily income computation (star bonus + CW + CWL + event, all averaged)
     - forecast_time_to_max with zero deficit → 0 days
     - Realistic deficit with Legend League → completes in bounded time
     - Dynamic Epic injection increases estimated days
     - Bottleneck ore detection
     - Timeline snapshot generation

Run with:
    python -m pytest services/ore_engine/tests/test_ore_engine.py -v
"""

from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

import pytest

from schemas.pydantic.coc_models import HeroName

from services.ore_engine.cost_tables import (
    COMMON_MAX_LEVEL,
    CUMULATIVE_COMMON,
    CUMULATIVE_EPIC,
    EPIC_MAX_LEVEL,
    TOTAL_COMMON_FULL,
    TOTAL_EPIC_FULL,
    OreCost,
    Rarity,
    cost_to_upgrade,
    cumulative_cost,
    range_cost,
    total_cost_to_max,
)
from services.ore_engine.equipment_costs import (
    detect_equipment_rarity,
    compute_equipment_upgrade_cost,
    calculate_player_ore_deficit,
)
from services.ore_engine.calculator import (
    CalculationResult,
    EquipmentInventoryItem,
    MetaOverride,
    compute_deficit_mode_a,
    compute_deficit_mode_b,
)
from services.ore_engine.forecaster import (
    BiMonthlyEventConfig,
    CWLTier,
    ClanWarOreConfig,
    ForecastConfig,
    ForecastResult,
    League,
    STAR_BONUS_BY_LEAGUE,
    CWL_MONTHLY_REWARD,
    forecast_time_to_max,
    _compute_daily_income,
)


# ═══════════════════════════════════════════════════════════════════════════
# 1. COST TABLES
# ═══════════════════════════════════════════════════════════════════════════


class TestOreCostArithmetic:
    def test_add(self):
        a = OreCost(100, 50, 10)
        b = OreCost(200, 30, 5)
        assert a + b == OreCost(300, 80, 15)

    def test_sub_floors_at_zero(self):
        a = OreCost(10, 5, 1)
        b = OreCost(20, 3, 0)
        result = a - b
        assert result.shiny == 0   # floored
        assert result.glowy == 2
        assert result.starry == 1

    def test_mul_int(self):
        a = OreCost(100, 50, 10)
        assert a * 3 == OreCost(300, 150, 30)

    def test_mul_float(self):
        a = OreCost(100, 50, 10)
        result = a * 0.5
        assert result == OreCost(50, 25, 5)

    def test_is_zero(self):
        assert OreCost(0, 0, 0).is_zero()
        assert not OreCost(1, 0, 0).is_zero()

    def test_total(self):
        assert OreCost(100, 50, 10).total == 160

    def test_bottleneck_starry(self):
        deficit = OreCost(100, 50, 30)
        daily = OreCost(10, 10, 1)  # starry takes 30 days, others less
        assert deficit.bottleneck(daily) == "starry"

    def test_bottleneck_when_zero_income(self):
        deficit = OreCost(0, 0, 10)
        daily = OreCost(100, 100, 0)  # zero starry income
        assert deficit.bottleneck(daily) == "starry"  # infinite days


class TestPerLevelCosts:
    def test_common_level_1_to_2(self):
        cost = cost_to_upgrade(Rarity.COMMON, 1)
        assert cost == OreCost(120, 0, 0)

    def test_common_level_17_to_18(self):
        cost = cost_to_upgrade(Rarity.COMMON, 17)
        assert cost == OreCost(2700, 600, 0)

    def test_epic_level_26_to_27(self):
        cost = cost_to_upgrade(Rarity.EPIC, 26)
        assert cost == OreCost(3600, 600, 150)

    def test_epic_level_1_to_2_same_as_common(self):
        assert cost_to_upgrade(Rarity.EPIC, 1) == cost_to_upgrade(Rarity.COMMON, 1)

    def test_common_out_of_range_raises(self):
        with pytest.raises(ValueError, match="Cannot upgrade"):
            cost_to_upgrade(Rarity.COMMON, 18)  # already at max

    def test_common_level_zero_raises(self):
        with pytest.raises(ValueError):
            cost_to_upgrade(Rarity.COMMON, 0)

    def test_epic_out_of_range_raises(self):
        with pytest.raises(ValueError, match="Cannot upgrade"):
            cost_to_upgrade(Rarity.EPIC, 27)  # already at max


class TestCumulativeCosts:
    def test_cumulative_common_level_1_is_zero(self):
        assert cumulative_cost(Rarity.COMMON, 1) == OreCost(0, 0, 0)

    def test_cumulative_common_level_2_equals_first_upgrade(self):
        assert cumulative_cost(Rarity.COMMON, 2) == OreCost(120, 0, 0)

    def test_cumulative_epic_level_1_is_zero(self):
        assert cumulative_cost(Rarity.EPIC, 1) == OreCost(0, 0, 0)

    def test_cumulative_common_monotonically_increasing(self):
        for i in range(1, COMMON_MAX_LEVEL):
            prev = cumulative_cost(Rarity.COMMON, i)
            curr = cumulative_cost(Rarity.COMMON, i + 1)
            assert curr.shiny >= prev.shiny, f"Shiny dropped at level {i+1}"
            assert curr.glowy >= prev.glowy, f"Glowy dropped at level {i+1}"
            assert curr.starry >= prev.starry, f"Starry dropped at level {i+1}"

    def test_cumulative_epic_monotonically_increasing(self):
        for i in range(1, EPIC_MAX_LEVEL):
            prev = cumulative_cost(Rarity.EPIC, i)
            curr = cumulative_cost(Rarity.EPIC, i + 1)
            assert curr.shiny >= prev.shiny
            assert curr.glowy >= prev.glowy
            assert curr.starry >= prev.starry

    def test_cumulative_common_max_equals_total_full(self):
        assert cumulative_cost(Rarity.COMMON, COMMON_MAX_LEVEL) == TOTAL_COMMON_FULL

    def test_cumulative_epic_max_equals_total_full(self):
        assert cumulative_cost(Rarity.EPIC, EPIC_MAX_LEVEL) == TOTAL_EPIC_FULL

    def test_out_of_range_level_raises(self):
        with pytest.raises(ValueError):
            cumulative_cost(Rarity.COMMON, 19)
        with pytest.raises(ValueError):
            cumulative_cost(Rarity.EPIC, 28)


class TestRangeCost:
    def test_same_level_returns_zero(self):
        assert range_cost(Rarity.COMMON, 5, 5) == OreCost(0, 0, 0)

    def test_from_greater_than_to_returns_zero(self):
        assert range_cost(Rarity.EPIC, 10, 5) == OreCost(0, 0, 0)

    def test_range_equals_cumulative_difference(self):
        cost = range_cost(Rarity.EPIC, 5, 15)
        expected = cumulative_cost(Rarity.EPIC, 15) - cumulative_cost(Rarity.EPIC, 5)
        assert cost == expected

    def test_total_cost_to_max_common(self):
        cost = total_cost_to_max(Rarity.COMMON, from_level=1)
        assert cost == TOTAL_COMMON_FULL

    def test_total_cost_to_max_epic_from_midpoint(self):
        cost = total_cost_to_max(Rarity.EPIC, from_level=15)
        # Must be less than full cost
        assert cost.shiny < TOTAL_EPIC_FULL.shiny
        assert cost.shiny > 0

    def test_total_cost_to_max_already_maxed(self):
        assert total_cost_to_max(Rarity.COMMON, COMMON_MAX_LEVEL) == OreCost(0, 0, 0)


class TestCostTableConsistency:
    """Cross-checks between per-level and cumulative tables."""

    def test_common_sum_of_per_level_equals_cumulative_max(self):
        total = OreCost(0, 0, 0)
        for lvl in range(1, COMMON_MAX_LEVEL):
            total = total + cost_to_upgrade(Rarity.COMMON, lvl)
        assert total == TOTAL_COMMON_FULL

    def test_epic_sum_of_per_level_equals_cumulative_max(self):
        total = OreCost(0, 0, 0)
        for lvl in range(1, EPIC_MAX_LEVEL):
            total = total + cost_to_upgrade(Rarity.EPIC, lvl)
        assert total == TOTAL_EPIC_FULL

    def test_starry_never_appears_in_common(self):
        for lvl in range(1, COMMON_MAX_LEVEL):
            cost = cost_to_upgrade(Rarity.COMMON, lvl)
            assert cost.starry == 0, f"Common equipment must never require Starry ore at level {lvl}→{lvl+1}"

    def test_epic_starry_only_appears_at_level_9_plus(self):
        for lvl in range(1, 8):
            cost = cost_to_upgrade(Rarity.EPIC, lvl)
            assert cost.starry == 0, f"Epic Starry should be 0 before level 9 (at level {lvl}→{lvl+1})"
        assert cost_to_upgrade(Rarity.EPIC, 8).starry == 10  # level 8->9 (reaching lv 9)

    def test_glowy_appears_at_level_3_and_6_plus(self):
        # Level 2 -> 3 has 20 Glowy
        assert cost_to_upgrade(Rarity.COMMON, 2).glowy == 20
        # Level 1 -> 2 has 0 Glowy
        assert cost_to_upgrade(Rarity.COMMON, 1).glowy == 0
        # Level 5 -> 6 has 100 Glowy
        assert cost_to_upgrade(Rarity.COMMON, 5).glowy == 100


class TestSingleSourceOfTruthCosts:
    """Verifications explicitly requested by user prompt."""

    def test_common_1_to_18_total(self):
        cost = compute_equipment_upgrade_cost("Common", current_level=1, target_level=18)
        assert cost.shiny == 27260
        assert cost.glowy == 1920
        assert cost.starry == 0

    def test_epic_1_to_27_total(self):
        cost = compute_equipment_upgrade_cost("Epic", current_level=1, target_level=27)
        assert cost.shiny == 56060
        assert cost.glowy == 3720
        assert cost.starry == 480

    def test_epic_18_to_27(self):
        cost = compute_equipment_upgrade_cost("Epic", current_level=18, target_level=27)
        assert cost.shiny == 28800
        assert cost.glowy == 1800
        assert cost.starry == 370

    def test_common_17_to_18(self):
        cost = compute_equipment_upgrade_cost("Common", current_level=17, target_level=18)
        assert cost.shiny == 2700
        assert cost.glowy == 600
        assert cost.starry == 0

    def test_max_level_returns_zero(self):
        common_max = compute_equipment_upgrade_cost("Common", current_level=18, target_level=18)
        assert common_max == OreCost(0, 0, 0)
        assert common_max.is_zero()

        epic_max = compute_equipment_upgrade_cost("Epic", current_level=27, target_level=27)
        assert epic_max == OreCost(0, 0, 0)
        assert epic_max.is_zero()

    def test_rarity_detection(self):
        assert detect_equipment_rarity(18) == "Common"
        assert detect_equipment_rarity(27) == "Epic"
        assert detect_equipment_rarity(10) is None
        assert detect_equipment_rarity(30) is None
        assert detect_equipment_rarity(None) is None


# ═══════════════════════════════════════════════════════════════════════════
# 2. CALCULATOR
# ═══════════════════════════════════════════════════════════════════════════

BK = HeroName.BARBARIAN_KING
AQ = HeroName.ARCHER_QUEEN
GW = HeroName.GRAND_WARDEN
RC = HeroName.ROYAL_CHAMPION


def _inv(name: str, rarity: Rarity, hero: HeroName, level: int) -> EquipmentInventoryItem:
    return EquipmentInventoryItem(name=name, rarity=rarity, hero=hero, level=level)


class TestModeBAllEquipment:
    def test_single_item_deficit(self):
        inventory = [_inv("Giant Gauntlet", Rarity.EPIC, BK, 1)]
        result = compute_deficit_mode_b(inventory)
        assert result.mode == "B"
        assert result.total_deficit == total_cost_to_max(Rarity.EPIC, 1)
        assert result.equipment_count == 1
        assert result.already_maxed == 0

    def test_maxed_item_zero_deficit(self):
        inventory = [_inv("Giant Gauntlet", Rarity.EPIC, BK, EPIC_MAX_LEVEL)]
        result = compute_deficit_mode_b(inventory)
        assert result.total_deficit.is_zero()
        assert result.already_maxed == 1

    def test_multiple_items_sum(self):
        inventory = [
            _inv("Giant Gauntlet", Rarity.EPIC, BK, 15),
            _inv("Barbarian Puppet", Rarity.COMMON, BK, 10),
            _inv("Archer Puppet", Rarity.COMMON, AQ, 18),  # maxed
        ]
        result = compute_deficit_mode_b(inventory)
        expected = (
            total_cost_to_max(Rarity.EPIC, 15) +
            total_cost_to_max(Rarity.COMMON, 10)
        )
        assert result.total_deficit == expected
        assert result.equipment_count == 3
        assert result.already_maxed == 1

    def test_empty_inventory(self):
        result = compute_deficit_mode_b([])
        assert result.total_deficit.is_zero()
        assert result.equipment_count == 0

    def test_details_sorted_by_deficit_desc(self):
        inventory = [
            _inv("A", Rarity.COMMON, BK, 15),  # small deficit
            _inv("B", Rarity.EPIC, BK, 1),       # huge deficit
            _inv("C", Rarity.COMMON, AQ, 10),   # medium deficit
        ]
        result = compute_deficit_mode_b(inventory)
        deficits = [d.deficit.total for d in result.per_equipment]
        assert deficits == sorted(deficits, reverse=True)


class TestModeAMetaPairs:
    def test_meta_override_filters_inventory(self):
        inventory = [
            _inv("Giant Gauntlet", Rarity.EPIC, BK, 15),
            _inv("Barbarian Puppet", Rarity.COMMON, BK, 10),
            _inv("Earthquake Boots", Rarity.EPIC, BK, 5),   # not in meta
        ]
        overrides = [
            MetaOverride(BK, "Giant Gauntlet", "Barbarian Puppet"),
        ]
        result = compute_deficit_mode_a(inventory, meta_overrides=overrides)
        assert result.mode == "A"
        assert result.equipment_count == 2  # only GG + BP
        names = {d.name for d in result.per_equipment}
        assert names == {"Giant Gauntlet", "Barbarian Puppet"}

    def test_meta_override_excludes_other_heroes(self):
        inventory = [
            _inv("Giant Gauntlet", Rarity.EPIC, BK, 15),
            _inv("Archer Puppet", Rarity.COMMON, AQ, 10),
        ]
        overrides = [MetaOverride(BK, "Giant Gauntlet", "Barbarian Puppet")]
        result = compute_deficit_mode_a(inventory, meta_overrides=overrides)
        # AQ equipment is not in BK's meta pair
        assert result.equipment_count == 1
        assert result.per_equipment[0].name == "Giant Gauntlet"

    def test_fallback_picks_top_2_by_level(self):
        inventory = [
            _inv("A", Rarity.EPIC, BK, 20),    # highest level → picked
            _inv("B", Rarity.COMMON, BK, 15),   # second highest → picked
            _inv("C", Rarity.EPIC, BK, 5),      # lowest → excluded
        ]
        result = compute_deficit_mode_a(inventory)
        assert result.equipment_count == 2
        names = {d.name for d in result.per_equipment}
        assert names == {"A", "B"}

    def test_mode_a_deficit_is_subset_of_mode_b(self):
        inventory = [
            _inv("Giant Gauntlet", Rarity.EPIC, BK, 15),
            _inv("Barbarian Puppet", Rarity.COMMON, BK, 10),
            _inv("Earthquake Boots", Rarity.EPIC, BK, 5),
        ]
        overrides = [MetaOverride(BK, "Giant Gauntlet", "Barbarian Puppet")]
        result_a = compute_deficit_mode_a(inventory, meta_overrides=overrides)
        result_b = compute_deficit_mode_b(inventory)
        assert result_a.total_deficit.total <= result_b.total_deficit.total


# ═══════════════════════════════════════════════════════════════════════════
# 3. FORECASTER
# ═══════════════════════════════════════════════════════════════════════════


class TestDailyIncome:
    def test_legend_league_star_bonus_is_highest(self):
        legend = STAR_BONUS_BY_LEAGUE[League.LEGEND]
        for league, bonus in STAR_BONUS_BY_LEAGUE.items():
            if league != League.LEGEND:
                assert legend.total >= bonus.total, (
                    f"Legend ({legend.total}) should be >= {league.value} ({bonus.total})"
                )

    def test_cwl_champion_i_is_highest(self):
        top = CWL_MONTHLY_REWARD[CWLTier.CHAMPION_I]
        for tier, reward in CWL_MONTHLY_REWARD.items():
            if tier != CWLTier.CHAMPION_I:
                assert top.total >= reward.total

    def test_compute_daily_income_positive(self):
        config = ForecastConfig(league=League.LEGEND, cwl_tier=CWLTier.CHAMPION_I)
        daily = _compute_daily_income(config)
        assert daily.shiny > 0
        assert daily.glowy > 0
        assert daily.starry > 0

    def test_daily_income_scales_with_league(self):
        low = _compute_daily_income(ForecastConfig(league=League.SILVER_I))
        high = _compute_daily_income(ForecastConfig(league=League.LEGEND))
        assert high.total > low.total

    def test_clan_war_daily_ore(self):
        cw = ClanWarOreConfig(
            win_reward=OreCost(100, 50, 10),
            loss_reward=OreCost(50, 25, 5),
            wars_per_week=7.0,   # one war per day
            win_rate=1.0,        # always win
        )
        daily = cw.daily_ore
        assert daily == OreCost(100, 50, 10)

    def test_clan_war_expected_ore_per_war(self):
        cw = ClanWarOreConfig(
            win_reward=OreCost(100, 0, 0),
            loss_reward=OreCost(0, 0, 0),
            wars_per_week=7.0,
            win_rate=0.5,
        )
        expected = cw.expected_ore_per_war
        assert expected.shiny == 50  # 0.5 * 100


class TestForecastTimeToMax:
    def test_zero_deficit_zero_days(self):
        result = forecast_time_to_max(
            OreCost(0, 0, 0),
            ForecastConfig(league=League.LEGEND),
        )
        assert result.estimated_days == 0

    def test_small_deficit_completes(self):
        # 1 day of Legend income should be enough for a tiny deficit
        result = forecast_time_to_max(
            OreCost(10, 5, 1),
            ForecastConfig(league=League.LEGEND),
        )
        assert result.estimated_days <= 1

    def test_realistic_deficit_bounded_time(self):
        # A single Epic equipment from level 1 → 27
        deficit = total_cost_to_max(Rarity.EPIC, 1)
        config = ForecastConfig(
            league=League.LEGEND,
            cwl_tier=CWLTier.CHAMPION_I,
        )
        result = forecast_time_to_max(deficit, config)
        # Should complete within ~1-2 years, definitely not 10 years
        assert result.estimated_days < 730, (
            f"Single Epic maxing took {result.estimated_days} days, expected < 730"
        )
        assert result.estimated_days > 0

    def test_dynamic_epic_injection_increases_time(self):
        deficit = total_cost_to_max(Rarity.EPIC, 1)
        config_no_inject = ForecastConfig(
            league=League.LEGEND,
            cwl_tier=CWLTier.CHAMPION_I,
            account_for_upcoming_epics=False,
        )
        config_inject = ForecastConfig(
            league=League.LEGEND,
            cwl_tier=CWLTier.CHAMPION_I,
            account_for_upcoming_epics=True,
            epic_injection_interval_days=60,
        )
        result_no = forecast_time_to_max(deficit, config_no_inject)
        result_yes = forecast_time_to_max(deficit, config_inject)
        # Injection adds more deficit → takes longer
        assert result_yes.estimated_days > result_no.estimated_days
        assert result_yes.injected_epics > 0

    def test_bottleneck_is_string(self):
        deficit = OreCost(100, 50, 500)
        daily = OreCost(10, 10, 1)
        assert deficit.bottleneck(daily) == "starry"

    def test_timeline_has_snapshots(self):
        deficit = total_cost_to_max(Rarity.COMMON, 1)
        result = forecast_time_to_max(
            deficit,
            ForecastConfig(league=League.LEGEND),
            snapshot_interval_days=30,
        )
        assert len(result.timeline) >= 2  # at least start and end

    def test_timeline_first_snapshot_is_day_zero(self):
        deficit = total_cost_to_max(Rarity.COMMON, 1)
        result = forecast_time_to_max(
            deficit,
            ForecastConfig(league=League.LEGEND),
        )
        assert result.timeline[0].day == 0
        assert result.timeline[0].remaining_shiny == deficit.shiny

    def test_timeline_last_snapshot_zero_remaining(self):
        deficit = total_cost_to_max(Rarity.COMMON, 1)
        result = forecast_time_to_max(
            deficit,
            ForecastConfig(league=League.LEGEND),
        )
        last = result.timeline[-1]
        assert last.remaining_shiny <= 0 or last.remaining_glowy <= 0 or last.remaining_starry <= 0

    def test_lower_league_takes_longer(self):
        deficit = total_cost_to_max(Rarity.COMMON, 1)
        fast = forecast_time_to_max(
            deficit, ForecastConfig(league=League.LEGEND)
        )
        slow = forecast_time_to_max(
            deficit, ForecastConfig(league=League.GOLD_I)
        )
        assert slow.estimated_days > fast.estimated_days

    def test_no_cwl_takes_longer(self):
        deficit = total_cost_to_max(Rarity.EPIC, 1)
        with_cwl = forecast_time_to_max(
            deficit,
            ForecastConfig(league=League.LEGEND, cwl_tier=CWLTier.CHAMPION_I),
        )
        without_cwl = forecast_time_to_max(
            deficit,
            ForecastConfig(league=League.LEGEND, cwl_tier=CWLTier.NONE),
        )
        assert without_cwl.estimated_days >= with_cwl.estimated_days


class TestForecastEdgeCases:
    def test_zero_income_caps_at_max_days(self):
        """With no income at all, should hit the 10-year cap."""
        config = ForecastConfig(
            league=League.BRONZE_III,
            clan_war=ClanWarOreConfig(
                win_reward=OreCost(0, 0, 0),
                loss_reward=OreCost(0, 0, 0),
                wars_per_week=0,
                win_rate=0,
            ),
            cwl_tier=CWLTier.NONE,
            bi_monthly_event=BiMonthlyEventConfig(ore_package=OreCost(0, 0, 0)),
        )
        # Very large deficit — only Bronze III star bonus (2 shiny/day, 0 glowy, 0 starry)
        deficit = OreCost(0, 0, 10000)  # starry can never be cleared
        result = forecast_time_to_max(deficit, config)
        assert result.estimated_days == 3650  # 10-year cap

    def test_estimated_months_correct(self):
        result = forecast_time_to_max(
            OreCost(3000, 1000, 100),
            ForecastConfig(league=League.LEGEND),
        )
        assert result.estimated_months == pytest.approx(
            result.estimated_days / 30.0, abs=0.1
        )


class TestTH17AndTH18MetaSupport:
    def test_max_town_hall_is_18(self):
        from services.ore_engine.cost_tables import (
            BLACKSMITH_MAX_LEVEL_BY_TH,
            HERO_MAX_LEVEL_BY_TH,
            MAX_TOWN_HALL,
            PET_MAX_LEVEL_BY_TH,
            max_equipment_level_for_th,
        )
        assert MAX_TOWN_HALL == 18
        assert 17 in BLACKSMITH_MAX_LEVEL_BY_TH
        assert 18 in BLACKSMITH_MAX_LEVEL_BY_TH
        assert max_equipment_level_for_th(Rarity.COMMON, 18) == 18
        assert max_equipment_level_for_th(Rarity.EPIC, 18) == 27
        assert HERO_MAX_LEVEL_BY_TH[18]["Minion Prince"] == 95
        assert HERO_MAX_LEVEL_BY_TH[18]["Dragon Duke"] == 50
        assert HERO_MAX_LEVEL_BY_TH[17]["Dragon Duke"] == 40
        assert HERO_MAX_LEVEL_BY_TH[16]["Dragon Duke"] == 30
        assert HERO_MAX_LEVEL_BY_TH[15]["Dragon Duke"] == 20
        assert HERO_MAX_LEVEL_BY_TH[18]["Barbarian King"] == 105
        assert HERO_MAX_LEVEL_BY_TH[18]["Archer Queen"] == 105
        assert HERO_MAX_LEVEL_BY_TH[18]["Grand Warden"] == 80
        assert HERO_MAX_LEVEL_BY_TH[18]["Royal Champion"] == 55
        assert PET_MAX_LEVEL_BY_TH[18] == 20

        with pytest.raises(ValueError):
            max_equipment_level_for_th(Rarity.EPIC, 19)

    def test_dragon_duke_equipment_and_deficit(self):
        from services.ore_engine.cost_tables import DRAGON_DUKE_EQUIPMENT, EQUIPMENT_BY_HERO
        dd = HeroName.DRAGON_DUKE
        assert dd.value == "Dragon Duke"
        assert "Dragon Duke" in EQUIPMENT_BY_HERO
        assert DRAGON_DUKE_EQUIPMENT["Dragonfire Crown"] == Rarity.EPIC
        assert DRAGON_DUKE_EQUIPMENT["Flame Breath"] == Rarity.COMMON

        inventory = [
            _inv("Dragonfire Crown", Rarity.EPIC, dd, 15),
            _inv("Flame Breath", Rarity.COMMON, dd, 10),
        ]
        res18 = compute_deficit_mode_b(inventory, town_hall=18)
        assert res18.equipment_count == 2
        assert res18.total_deficit.total > 0

    def test_minion_prince_deficit_and_th_cap(self):
        mp = HeroName.MINION_PRINCE
        inventory = [
            _inv("Dark Orb", Rarity.COMMON, mp, 10),
            _inv("Dark Crown", Rarity.EPIC, mp, 15),
        ]
        res18 = compute_deficit_mode_b(inventory, town_hall=18)
        res14 = compute_deficit_mode_b(inventory, town_hall=14)
        # At TH14 Epic cap is 21 vs 27 at TH18
        assert res18.total_deficit.total > res14.total_deficit.total

    def test_clan_war_ore_by_th17_and_th18(self):
        cw16 = ClanWarOreConfig.for_town_hall(16)
        cw17 = ClanWarOreConfig.for_town_hall(17)
        cw18 = ClanWarOreConfig.for_town_hall(18)
        assert cw18.win_reward.total > cw17.win_reward.total > cw16.win_reward.total
        with pytest.raises(ValueError):
            ClanWarOreConfig.for_town_hall(19)
