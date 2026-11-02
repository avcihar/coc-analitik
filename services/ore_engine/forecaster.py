"""
Ore Progression Engine — Forecasting Engine (Time-to-Max)
==========================================================
Deterministic simulation of all Clash of Clans ore income streams:
  1. Multiplayer League Star Bonus (Daily, 37 Tiers: 105000000 - 105000036)
  2. Regular Clan War (CW) Rewards & Losses
  3. Clan War League (CWL) Rewards & Losses
  4. Weekly Raid Medals Ore (0, 100, 10)
  5. Bi-Monthly New Epic Equipment Injection & Event Packages

Computes three distinct scenarios:
  - Minimum (Optimistic): All CW & CWL won, maximum rewards, raid active.
  - Estimated (User Settings): Exact player configuration.
  - Maximum (Pessimistic): All wars lost (half reward floor), raid inactive, free event plan only.

Output:
  - Completion dates & days count for Shiny, Glowy, Starry
  - Primary bottleneck ore identification
  - Progress percentages and net remaining ore requirements after inventory subtraction.
"""

from __future__ import annotations

import datetime
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from services.ore_engine.cost_tables import (
    EPIC_MAX_LEVEL,
    MAX_TOWN_HALL,
    MIN_TOWN_HALL,
    OreCost,
    Rarity,
    total_cost_to_max,
)
from services.ore_engine.gem_income_config import (
    CWL_DURATION_DAYS,
    CWL_WAR_COUNT,
    DEFAULT_CW_LOSS_ORE,
    DEFAULT_CW_WARS_MONTHLY,
    DEFAULT_CW_WIN_ORE,
    DEFAULT_CWL_LOSS_ORE,
    DEFAULT_CWL_WIN_ORE,
    DEFAULT_LEAGUE_TIER_ID,
    EPIC_CYCLE_MONTHS,
    EPIC_FULL_MAX_COST,
    EVENT_FREE_PLAN_ORE,
    EVENT_MEDAL_EXTRA_ORE,
    EVENT_PASS_EXTRA_ORE,
    LEAGUE_TIERS,
    LEAGUE_TIERS_BY_ID,
    LEAGUE_TIERS_BY_NAME,
    MAX_CW_WARS_MONTHLY,
    WEEKLY_RAID_MEDALS_ORE,
    LeagueTierInfo,
    compute_cw_loss_ore,
    compute_cwl_loss_ore,
    compute_single_event_ore,
    get_league_tier_by_id,
    get_league_tier_by_name,
)


# ---------------------------------------------------------------------------
# Tunable User Settings Dataclass
# ---------------------------------------------------------------------------

@dataclass
class SimulationOreSettings:
    """Configurable parameters for ore progression simulation."""
    league_tier_id: int = DEFAULT_LEAGUE_TIER_ID

    # Regular Clan War
    monthly_cw_count: int = DEFAULT_CW_WARS_MONTHLY     # 0..14
    cw_win_count: int = DEFAULT_CW_WARS_MONTHLY         # 0..monthly_cw_count
    cw_win_reward: OreCost = DEFAULT_CW_WIN_ORE

    # CWL
    participates_cwl: bool = True
    cwl_win_count: int = CWL_WAR_COUNT                  # 0..7
    cwl_win_reward: OreCost = DEFAULT_CWL_WIN_ORE

    # Raid Medals
    include_raid_medals: bool = True

    # Inventory
    inventory: OreCost = field(default_factory=lambda: OreCost(0, 0, 0))

    # Future Epic Equipment & Events
    include_future_epics: bool = True
    has_event_pass: bool = False
    has_event_medals: bool = False


# ---------------------------------------------------------------------------
# Output Scenario Result Dataclass
# ---------------------------------------------------------------------------

@dataclass
class ScenarioResult:
    scenario_name: str          # "min", "estimated", "max"
    days_to_complete: int       # Total days to finish bottleneck ore
    target_date: datetime.date  # start_date + days_to_complete
    bottleneck_ore: str         # "shiny", "glowy", or "starry"
    days_shiny: int
    days_glowy: int
    days_starry: int
    initial_deficit: OreCost    # Base deficit before inventory
    inventory: OreCost          # User inventory
    net_needed: OreCost         # After inventory subtraction
    total_needed: OreCost       # Net needed + future epic additions
    total_accumulated: OreCost
    daily_rates: OreCost        # Average daily income for reference
    is_completed_today: bool = False


# ---------------------------------------------------------------------------
# Core Pure Simulation Function
# ---------------------------------------------------------------------------

def simulate_scenario(
    base_deficit: OreCost,
    settings: SimulationOreSettings,
    scenario_type: str = "estimated",
    start_date: Optional[datetime.date] = None,
    max_simulation_days: int = 5000,
) -> ScenarioResult:
    """
    Pure simulation function projecting ore progression day-by-day.
    Respects calendar months for bi-monthly new epic releases and events.
    """
    if start_date is None:
        start_date = datetime.date.today()

    inventory = settings.inventory or OreCost(0, 0, 0)
    net_shiny = max(0, base_deficit.shiny - inventory.shiny)
    net_glowy = max(0, base_deficit.glowy - inventory.glowy)
    net_starry = max(0, base_deficit.starry - inventory.starry)
    net_needed = OreCost(net_shiny, net_glowy, net_starry)

    # If already fulfilled and future epics disabled -> completed today!
    if net_needed.is_zero() and not settings.include_future_epics:
        return ScenarioResult(
            scenario_name=scenario_type,
            days_to_complete=0,
            target_date=start_date,
            bottleneck_ore="shiny",
            days_shiny=0,
            days_glowy=0,
            days_starry=0,
            initial_deficit=base_deficit,
            inventory=inventory,
            net_needed=net_needed,
            total_needed=net_needed,
            total_accumulated=OreCost(0, 0, 0),
            daily_rates=OreCost(0, 0, 0),
            is_completed_today=True,
        )

    # 1. League Star Bonus daily rate
    league_tier = get_league_tier_by_id(settings.league_tier_id)
    daily_star_bonus = league_tier.daily_reward

    # 2. Regular Clan War monthly calculation
    cw_count = max(0, min(MAX_CW_WARS_MONTHLY, settings.monthly_cw_count))
    cw_win_reward = settings.cw_win_reward
    cw_loss_reward = compute_cw_loss_ore(cw_win_reward)

    if scenario_type == "min":
        cw_wins = cw_count
        cw_losses = 0
    elif scenario_type == "max":
        cw_wins = 0
        cw_losses = cw_count
    else:
        cw_wins = max(0, min(cw_count, settings.cw_win_count))
        cw_losses = cw_count - cw_wins

    monthly_cw_ore = (cw_win_reward * cw_wins) + (cw_loss_reward * cw_losses)
    daily_cw_ore = monthly_cw_ore * (1.0 / 30.0)

    # 3. CWL monthly calculation
    participates_cwl = settings.participates_cwl
    cwl_win_reward = settings.cwl_win_reward
    cwl_loss_reward = compute_cwl_loss_ore(cwl_win_reward)

    if not participates_cwl:
        monthly_cwl_ore = OreCost(0, 0, 0)
    else:
        if scenario_type == "min":
            cwl_wins = CWL_WAR_COUNT
            cwl_losses = 0
        elif scenario_type == "max":
            cwl_wins = 0
            cwl_losses = CWL_WAR_COUNT
        else:
            cwl_wins = max(0, min(CWL_WAR_COUNT, settings.cwl_win_count))
            cwl_losses = CWL_WAR_COUNT - cwl_wins
        monthly_cwl_ore = (cwl_win_reward * cwl_wins) + (cwl_loss_reward * cwl_losses)

    daily_cwl_ore = monthly_cwl_ore * (1.0 / 30.0)

    # 4. Raid Medals daily rate
    if settings.include_raid_medals and scenario_type != "max":
        daily_raid_ore = OreCost(
            shiny=0,
            glowy=int(round(WEEKLY_RAID_MEDALS_ORE.glowy / 7.0)),
            starry=int(round(WEEKLY_RAID_MEDALS_ORE.starry / 7.0)),
        )
        raid_daily_float_glowy = WEEKLY_RAID_MEDALS_ORE.glowy / 7.0
        raid_daily_float_starry = WEEKLY_RAID_MEDALS_ORE.starry / 7.0
    else:
        daily_raid_ore = OreCost(0, 0, 0)
        raid_daily_float_glowy = 0.0
        raid_daily_float_starry = 0.0

    # Event rewards accompanying bi-monthly epic releases
    if scenario_type == "max":
        event_ore_per_release = EVENT_FREE_PLAN_ORE
    elif scenario_type == "min":
        # Optimistic includes pass and medals if selected or available
        event_ore_per_release = compute_single_event_ore(
            has_event_pass=True if settings.has_event_pass else False,
            has_event_medals=True if settings.has_event_medals else False,
        )
    else:
        event_ore_per_release = compute_single_event_ore(
            has_event_pass=settings.has_event_pass,
            has_event_medals=settings.has_event_medals,
        )

    # Nominal daily rate (for summary display)
    daily_rates = OreCost(
        shiny=daily_star_bonus.shiny + int(daily_cw_ore.shiny) + int(daily_cwl_ore.shiny),
        glowy=daily_star_bonus.glowy + int(daily_cw_ore.glowy) + int(daily_cwl_ore.glowy) + daily_raid_ore.glowy,
        starry=daily_star_bonus.starry + int(daily_cw_ore.starry) + int(daily_cwl_ore.starry) + daily_raid_ore.starry,
    )

    # 5. Day-by-day simulation loop
    acc_shiny = 0.0
    acc_glowy = 0.0
    acc_starry = 0.0

    curr_target_shiny = float(net_needed.shiny)
    curr_target_glowy = float(net_needed.glowy)
    curr_target_starry = float(net_needed.starry)

    last_unmet_day_shiny = 0 if net_needed.shiny == 0 else 1
    last_unmet_day_glowy = 0 if net_needed.glowy == 0 else 1
    last_unmet_day_starry = 0 if net_needed.starry == 0 else 1

    injected_month_keys = set()
    total_epic_cost_added = OreCost(0, 0, 0)

    for day in range(1, max_simulation_days + 1):
        curr_date = start_date + datetime.timedelta(days=day)
        month_key = (curr_date.year, curr_date.month)

        # Bi-monthly epic injection & event check on the 1st of cycle months
        if (
            curr_date.day == 1
            and curr_date.month in EPIC_CYCLE_MONTHS
            and month_key not in injected_month_keys
        ):
            injected_month_keys.add(month_key)
            if settings.include_future_epics:
                curr_target_shiny += EPIC_FULL_MAX_COST.shiny
                curr_target_glowy += EPIC_FULL_MAX_COST.glowy
                curr_target_starry += EPIC_FULL_MAX_COST.starry
                total_epic_cost_added = total_epic_cost_added + EPIC_FULL_MAX_COST

                acc_shiny += event_ore_per_release.shiny
                acc_glowy += event_ore_per_release.glowy
                acc_starry += event_ore_per_release.starry

        # Daily accumulation
        acc_shiny += daily_star_bonus.shiny + (monthly_cw_ore.shiny / 30.0) + (monthly_cwl_ore.shiny / 30.0)
        acc_glowy += daily_star_bonus.glowy + (monthly_cw_ore.glowy / 30.0) + (monthly_cwl_ore.glowy / 30.0) + raid_daily_float_glowy
        acc_starry += daily_star_bonus.starry + (monthly_cw_ore.starry / 30.0) + (monthly_cwl_ore.starry / 30.0) + raid_daily_float_starry

        # Record unmet threshold
        if acc_shiny < curr_target_shiny:
            last_unmet_day_shiny = day
        if acc_glowy < curr_target_glowy:
            last_unmet_day_glowy = day
        if acc_starry < curr_target_starry:
            last_unmet_day_starry = day

        # Stop simulation when all 3 targets are met and no future epic is about to be injected within the current loop
        if (
            acc_shiny >= curr_target_shiny
            and acc_glowy >= curr_target_glowy
            and acc_starry >= curr_target_starry
        ):
            # Check if this completion point is stable
            break

    # Determine completion days per ore
    days_shiny = 0 if net_needed.shiny == 0 and total_epic_cost_added.shiny == 0 else last_unmet_day_shiny
    days_glowy = 0 if net_needed.glowy == 0 and total_epic_cost_added.glowy == 0 else last_unmet_day_glowy
    days_starry = 0 if net_needed.starry == 0 and total_epic_cost_added.starry == 0 else last_unmet_day_starry

    total_days = max(days_shiny, days_glowy, days_starry)
    target_date = start_date + datetime.timedelta(days=total_days)

    # Identify bottleneck ore
    days_dict = {"starry": days_starry, "glowy": days_glowy, "shiny": days_shiny}
    bottleneck_ore = max(days_dict, key=days_dict.get)

    is_completed_today = total_days == 0

    return ScenarioResult(
        scenario_name=scenario_type,
        days_to_complete=total_days,
        target_date=target_date,
        bottleneck_ore=bottleneck_ore,
        days_shiny=days_shiny,
        days_glowy=days_glowy,
        days_starry=days_starry,
        initial_deficit=base_deficit,
        inventory=inventory,
        net_needed=net_needed,
        total_needed=net_needed + total_epic_cost_added,
        total_accumulated=OreCost(int(acc_shiny), int(acc_glowy), int(acc_starry)),
        daily_rates=daily_rates,
        is_completed_today=is_completed_today,
    )


def simulate_all_scenarios(
    base_deficit: OreCost,
    settings: SimulationOreSettings,
    start_date: Optional[datetime.date] = None,
) -> Dict[str, ScenarioResult]:
    """
    Computes all three scenarios (min, estimated, max) for given base deficit and settings.
    """
    if start_date is None:
        start_date = datetime.date.today()

    min_res = simulate_scenario(base_deficit, settings, scenario_type="min", start_date=start_date)
    est_res = simulate_scenario(base_deficit, settings, scenario_type="estimated", start_date=start_date)
    max_res = simulate_scenario(base_deficit, settings, scenario_type="max", start_date=start_date)

    return {
        "min": min_res,
        "estimated": est_res,
        "max": max_res,
    }


# ---------------------------------------------------------------------------
# Backward Compatibility Adapters (For Existing Tests / Callers)
# ---------------------------------------------------------------------------

class League(str, Enum):
    BRONZE_III    = "Bronze III"
    BRONZE_II     = "Bronze II"
    BRONZE_I      = "Bronze I"
    SILVER_III    = "Silver III"
    SILVER_II     = "Silver II"
    SILVER_I      = "Silver I"
    GOLD_III      = "Gold III"
    GOLD_II       = "Gold II"
    GOLD_I        = "Gold I"
    CRYSTAL_III   = "Crystal III"
    CRYSTAL_II    = "Crystal II"
    CRYSTAL_I     = "Crystal I"
    MASTER_III    = "Master III"
    MASTER_II     = "Master II"
    MASTER_I      = "Master I"
    CHAMPION_III  = "Champion III"
    CHAMPION_II   = "Champion II"
    CHAMPION_I    = "Champion I"
    TITAN_III     = "Titan III"
    TITAN_II      = "Titan II"
    TITAN_I       = "Titan I"
    LEGEND        = "Legend League"


STAR_BONUS_BY_LEAGUE: Dict[League, OreCost] = {
    League.BRONZE_III:   OreCost(2, 0, 0),
    League.BRONZE_II:    OreCost(3, 0, 0),
    League.BRONZE_I:     OreCost(4, 0, 0),
    League.SILVER_III:   OreCost(5, 0, 0),
    League.SILVER_II:    OreCost(6, 0, 0),
    League.SILVER_I:     OreCost(8, 0, 0),
    League.GOLD_III:     OreCost(10, 2, 0),
    League.GOLD_II:      OreCost(14, 4, 0),
    League.GOLD_I:       OreCost(18, 6, 0),
    League.CRYSTAL_III:  OreCost(24, 8, 1),
    League.CRYSTAL_II:   OreCost(30, 10, 2),
    League.CRYSTAL_I:    OreCost(36, 14, 3),
    League.MASTER_III:   OreCost(44, 18, 4),
    League.MASTER_II:    OreCost(52, 22, 6),
    League.MASTER_I:     OreCost(60, 28, 8),
    League.CHAMPION_III: OreCost(70, 34, 10),
    League.CHAMPION_II:  OreCost(80, 40, 13),
    League.CHAMPION_I:   OreCost(90, 48, 16),
    League.TITAN_III:    OreCost(100, 56, 20),
    League.TITAN_II:     OreCost(110, 64, 24),
    League.TITAN_I:      OreCost(120, 72, 28),
    League.LEGEND:       OreCost(140, 84, 34),
}


class CWLTier(str, Enum):
    CHAMPION_I   = "Champion I"
    CHAMPION_II  = "Champion II"
    CHAMPION_III = "Champion III"
    MASTER_I     = "Master I"
    MASTER_II    = "Master II"
    MASTER_III   = "Master III"
    CRYSTAL_I    = "Crystal I"
    CRYSTAL_II   = "Crystal II"
    CRYSTAL_III  = "Crystal III"
    GOLD_I       = "Gold I"
    GOLD_II      = "Gold II"
    GOLD_III     = "Gold III"
    SILVER_I     = "Silver I"
    SILVER_II    = "Silver II"
    SILVER_III   = "Silver III"
    BRONZE_I     = "Bronze I"
    BRONZE_II    = "Bronze II"
    BRONZE_III   = "Bronze III"
    NONE         = "None"


CWL_MONTHLY_REWARD: Dict[CWLTier, OreCost] = {
    CWLTier.CHAMPION_I:   OreCost(1200, 600, 200),
    CWLTier.CHAMPION_II:  OreCost(1000, 500, 160),
    CWLTier.CHAMPION_III: OreCost( 850, 420, 130),
    CWLTier.MASTER_I:     OreCost( 700, 350, 100),
    CWLTier.MASTER_II:    OreCost( 600, 280,  80),
    CWLTier.MASTER_III:   OreCost( 500, 220,  60),
    CWLTier.CRYSTAL_I:    OreCost( 400, 170,  45),
    CWLTier.CRYSTAL_II:   OreCost( 320, 130,  32),
    CWLTier.CRYSTAL_III:  OreCost( 250, 100,  22),
    CWLTier.GOLD_I:       OreCost( 200,  70,  14),
    CWLTier.GOLD_II:      OreCost( 160,  50,   8),
    CWLTier.GOLD_III:     OreCost( 120,  35,   4),
    CWLTier.SILVER_I:     OreCost(  80,  20,   0),
    CWLTier.SILVER_II:    OreCost(  50,  10,   0),
    CWLTier.SILVER_III:   OreCost(  30,   5,   0),
    CWLTier.BRONZE_I:     OreCost(  15,   0,   0),
    CWLTier.BRONZE_II:    OreCost(  10,   0,   0),
    CWLTier.BRONZE_III:   OreCost(   5,   0,   0),
    CWLTier.NONE:         OreCost(   0,   0,   0),
}


CLAN_WAR_WIN_ORE_BY_TH: Dict[int, OreCost] = {
    8:  OreCost( 380, 15, 0),
    9:  OreCost( 410, 18, 0),
    10: OreCost( 460, 21, 3),
    11: OreCost( 560, 24, 3),
    12: OreCost( 610, 27, 4),
    13: OreCost( 710, 30, 4),
    14: OreCost( 810, 33, 5),
    15: OreCost( 960, 36, 5),
    16: OreCost(1110, 39, 6),
    17: OreCost(1185, 42, 6),
    18: OreCost(1260, 45, 7),
}


@dataclass(frozen=True)
class ClanWarOreConfig:
    win_reward: OreCost = DEFAULT_CW_WIN_ORE
    loss_reward: OreCost = DEFAULT_CW_LOSS_ORE
    wars_per_week: float = 3.26  # ~14 wars / month
    win_rate: float = 1.0

    @classmethod
    def for_town_hall(
        cls,
        town_hall: int = MAX_TOWN_HALL,
        wars_per_week: float = 2.0,
        win_rate: float = 0.55,
    ) -> "ClanWarOreConfig":
        if town_hall < MIN_TOWN_HALL or town_hall > MAX_TOWN_HALL:
            raise ValueError(
                f"Invalid Town Hall level {town_hall}. Valid range: {MIN_TOWN_HALL}–{MAX_TOWN_HALL}."
            )
        win = CLAN_WAR_WIN_ORE_BY_TH.get(town_hall, OreCost(0, 0, 0))
        loss = OreCost(win.shiny // 2, win.glowy // 2, win.starry // 2)
        return cls(
            win_reward=win,
            loss_reward=loss,
            wars_per_week=wars_per_week,
            win_rate=win_rate,
        )

    @property
    def expected_ore_per_war(self) -> OreCost:
        w = self.win_reward * self.win_rate
        l = self.loss_reward * (1.0 - self.win_rate)
        return w + l

    @property
    def daily_ore(self) -> OreCost:
        return self.expected_ore_per_war * (self.wars_per_week / 7.0)


@dataclass(frozen=True)
class BiMonthlyEventConfig:
    ore_package: OreCost = EVENT_FREE_PLAN_ORE
    interval_days: int = 60


@dataclass
class ForecastConfig:
    town_hall: int = MAX_TOWN_HALL
    league: League = League.LEGEND
    clan_war: ClanWarOreConfig = ClanWarOreConfig()
    cwl_tier: CWLTier = CWLTier.CHAMPION_I
    bi_monthly_event: BiMonthlyEventConfig = BiMonthlyEventConfig()
    account_for_upcoming_epics: bool = False
    epic_injection_interval_days: int = 60


@dataclass
class TimelineSnapshot:
    day: int
    remaining_shiny: int
    remaining_glowy: int
    remaining_starry: int
    event_description: str = ""


@dataclass
class ForecastResult:
    total_remaining: OreCost
    daily_net: OreCost
    bottleneck: str
    estimated_days: int
    estimated_months: float
    target_date_str: str = ""
    injected_epics: int = 0
    timeline: List[TimelineSnapshot] = field(default_factory=list)


def _compute_daily_income(config: ForecastConfig) -> OreCost:
    sb = STAR_BONUS_BY_LEAGUE.get(config.league, OreCost(0, 0, 0))
    cw = config.clan_war.daily_ore
    cwl_daily = CWL_MONTHLY_REWARD.get(config.cwl_tier, OreCost(0, 0, 0)) * (1.0 / 30.0)
    ev_daily = config.bi_monthly_event.ore_package * (1.0 / float(config.bi_monthly_event.interval_days))
    return sb + cw + cwl_daily + ev_daily


def forecast_time_to_max(
    deficit: OreCost,
    config: Optional[ForecastConfig] = None,
    snapshot_interval_days: int = 30,
) -> ForecastResult:
    if config is None:
        config = ForecastConfig()

    daily = _compute_daily_income(config)
    if deficit.is_zero() and not config.account_for_upcoming_epics:
        return ForecastResult(
            total_remaining=deficit,
            daily_net=daily,
            bottleneck="shiny",
            estimated_days=0,
            estimated_months=0.0,
            target_date_str="Bugün",
            injected_epics=0,
            timeline=[TimelineSnapshot(0, 0, 0, 0, "Already maxed")],
        )

    # Check for zero income on any required ore type -> hits 3650 days (10-year cap)
    if (deficit.shiny > 0 and daily.shiny == 0) or \
       (deficit.glowy > 0 and daily.glowy == 0) or \
       (deficit.starry > 0 and daily.starry == 0):
        return ForecastResult(
            total_remaining=deficit,
            daily_net=daily,
            bottleneck=deficit.bottleneck(daily),
            estimated_days=3650,
            estimated_months=3650.0 / 30.0,
            target_date_str="10+ Yıl",
            injected_epics=0,
            timeline=[
                TimelineSnapshot(0, deficit.shiny, deficit.glowy, deficit.starry, "Forecast start"),
                TimelineSnapshot(3650, deficit.shiny, deficit.glowy, deficit.starry, "Cap reached"),
            ],
        )

    # Convert to pure simulation
    settings = SimulationOreSettings(
        league_tier_id=105000036 if config.league == League.LEGEND else 105000008,
        monthly_cw_count=14,
        cw_win_count=14 if config.clan_war.win_rate >= 0.5 else 7,
        participates_cwl=config.cwl_tier != CWLTier.NONE,
        include_future_epics=config.account_for_upcoming_epics,
    )
    res = simulate_scenario(deficit, settings, scenario_type="estimated")

    timeline = [
        TimelineSnapshot(0, deficit.shiny, deficit.glowy, deficit.starry, "Forecast start"),
        TimelineSnapshot(res.days_to_complete, 0, 0, 0, "Target complete"),
    ]

    return ForecastResult(
        total_remaining=deficit,
        daily_net=daily,
        bottleneck=res.bottleneck_ore,
        estimated_days=res.days_to_complete,
        estimated_months=round(res.days_to_complete / 30.0, 1),
        target_date_str=res.target_date.strftime("%d.%m.%Y"),
        injected_epics=1 if config.account_for_upcoming_epics else 0,
        timeline=timeline,
    )
