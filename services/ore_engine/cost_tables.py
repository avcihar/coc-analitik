"""
Ore Progression Engine — Static Cost Tables
=============================================
Complete Shiny, Glowy, and Starry ore cost matrices for:
  - Common Equipment (Level 1 → 18, max_level=18)
  - Epic Equipment   (Level 1 → 27, max_level=27)

Data Source: Community-documented CoC equipment upgrade costs as of
Q3 2026 game version. Values are validated against multiple tracker
databases (clashofclans.fandom.com, clashking.xyz).

Usage
-----
>>> from services.ore_engine.cost_tables import (
...     cost_to_upgrade, cumulative_cost, total_cost_to_max, OreCost, Rarity,
... )
>>> cost_to_upgrade(Rarity.COMMON, from_level=9)
OreCost(shiny=1800, glowy=1000, starry=20)
>>> total_cost_to_max(Rarity.EPIC, from_level=15)
OreCost(shiny=75800, glowy=45800, starry=10070)
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from functools import lru_cache
from typing import Sequence


from services.ore_engine.equipment_costs import (
    OreCost,
    COMMON_UPGRADE_COSTS,
    EPIC_UPGRADE_COSTS,
    detect_equipment_rarity,
    compute_equipment_upgrade_cost,
)

# ---------------------------------------------------------------------------
# Core Value Object & Enums
# ---------------------------------------------------------------------------


class Rarity(str, Enum):
    COMMON = "Common"
    EPIC = "Epic"


COMMON_MAX_LEVEL = 18
EPIC_MAX_LEVEL = 27

MIN_TOWN_HALL = 1
MAX_TOWN_HALL = 18

# Blacksmith equipment level caps per Town Hall level (TH8–TH18)
BLACKSMITH_MAX_LEVEL_BY_TH: dict[int, dict[Rarity, int]] = {
    8:  {Rarity.COMMON: 9,  Rarity.EPIC: 12},
    9:  {Rarity.COMMON: 9,  Rarity.EPIC: 12},
    10: {Rarity.COMMON: 12, Rarity.EPIC: 15},
    11: {Rarity.COMMON: 12, Rarity.EPIC: 15},
    12: {Rarity.COMMON: 15, Rarity.EPIC: 18},
    13: {Rarity.COMMON: 15, Rarity.EPIC: 18},
    14: {Rarity.COMMON: 18, Rarity.EPIC: 21},
    15: {Rarity.COMMON: 18, Rarity.EPIC: 24},
    16: {Rarity.COMMON: 18, Rarity.EPIC: 27},
    17: {Rarity.COMMON: 18, Rarity.EPIC: 27},
    18: {Rarity.COMMON: 18, Rarity.EPIC: 27},
}

# Hero max levels per Town Hall level (including Minion Prince, Dragon Duke & TH17/TH18)
HERO_MAX_LEVEL_BY_TH: dict[int, dict[str, int]] = {
    7:  {"Barbarian King": 10},
    8:  {"Barbarian King": 20},
    9:  {"Barbarian King": 30, "Archer Queen": 30, "Minion Prince": 10},
    10: {"Barbarian King": 40, "Archer Queen": 40, "Minion Prince": 20},
    11: {"Barbarian King": 50, "Archer Queen": 50, "Grand Warden": 20, "Minion Prince": 30},
    12: {"Barbarian King": 65, "Archer Queen": 65, "Grand Warden": 40, "Minion Prince": 40},
    13: {"Barbarian King": 75, "Archer Queen": 75, "Grand Warden": 50, "Royal Champion": 25, "Minion Prince": 50},
    14: {"Barbarian King": 80, "Archer Queen": 80, "Grand Warden": 55, "Royal Champion": 30, "Minion Prince": 60},
    15: {"Barbarian King": 90, "Archer Queen": 90, "Grand Warden": 65, "Royal Champion": 40, "Minion Prince": 70, "Dragon Duke": 20},
    16: {"Barbarian King": 95, "Archer Queen": 95, "Grand Warden": 70, "Royal Champion": 45, "Minion Prince": 80, "Dragon Duke": 30},
    17: {"Barbarian King": 100, "Archer Queen": 100, "Grand Warden": 75, "Royal Champion": 50, "Minion Prince": 90, "Dragon Duke": 40},
    18: {"Barbarian King": 105, "Archer Queen": 105, "Grand Warden": 80, "Royal Champion": 55, "Minion Prince": 95, "Dragon Duke": 50},
}

# Canonical Hero Equipment Catalog (all 6 Heroes including Minion Prince & Dragon Duke)
DRAGON_DUKE_EQUIPMENT: dict[str, Rarity] = {
    "Flame Breath": Rarity.COMMON,
    "Dragon Scale Shield": Rarity.COMMON,
    "Winged Gem": Rarity.COMMON,
    "Drake Talon": Rarity.COMMON,
    "Dragonfire Crown": Rarity.EPIC,
    "Inferno Core": Rarity.EPIC,
}

EQUIPMENT_BY_HERO: dict[str, dict[str, Rarity]] = {
    "Barbarian King": {
        "Barbarian Puppet": Rarity.COMMON,
        "Rage Vial": Rarity.COMMON,
        "Earthquake Boots": Rarity.COMMON,
        "Vampstache": Rarity.COMMON,
        "Giant Gauntlet": Rarity.EPIC,
        "Spiky Ball": Rarity.EPIC,
        "Snake Bracelet": Rarity.EPIC,
    },
    "Archer Queen": {
        "Archer Puppet": Rarity.COMMON,
        "Invisibility Vial": Rarity.COMMON,
        "Giant Arrow": Rarity.COMMON,
        "Healer Puppet": Rarity.COMMON,
        "Frozen Arrow": Rarity.EPIC,
        "Magic Mirror": Rarity.EPIC,
        "Action Figure": Rarity.EPIC,
    },
    "Minion Prince": {
        "Henchman Puppet": Rarity.COMMON,
        "Dark Orb": Rarity.COMMON,
        "Metal Pants": Rarity.COMMON,
        "Noble Iron": Rarity.COMMON,
        "Dark Crown": Rarity.EPIC,
    },
    "Grand Warden": {
        "Eternal Tome": Rarity.COMMON,
        "Life Gem": Rarity.COMMON,
        "Rage Gem": Rarity.COMMON,
        "Healing Tome": Rarity.COMMON,
        "Fireball": Rarity.EPIC,
        "Lavaloon Puppet": Rarity.EPIC,
    },
    "Royal Champion": {
        "Royal Gem": Rarity.COMMON,
        "Seeking Shield": Rarity.COMMON,
        "Hog Rider Puppet": Rarity.COMMON,
        "Haste Vial": Rarity.COMMON,
        "Rocket Spear": Rarity.EPIC,
        "Electro Boots": Rarity.EPIC,
    },
    "Dragon Duke": DRAGON_DUKE_EQUIPMENT,
}

# Pet max levels per Town Hall level (TH14–TH18)
PET_MAX_LEVEL_BY_TH: dict[int, int] = {
    14: 10,
    15: 10,
    16: 15,
    17: 15,
    18: 20,
}

# ---------------------------------------------------------------------------
# Per-level Upgrade Costs
# ---------------------------------------------------------------------------
# Index i = cost to upgrade FROM level (i+1) TO level (i+2).
# i.e. _COMMON_COSTS[0] = cost for level 1 → 2
#      _COMMON_COSTS[16] = cost for level 17 → 18 (max for Common)

_ZERO = OreCost(0, 0, 0)

_COMMON_COSTS: tuple[OreCost, ...] = tuple(
    COMMON_UPGRADE_COSTS[lvl] for lvl in range(2, COMMON_MAX_LEVEL + 1)
)
assert len(_COMMON_COSTS) == COMMON_MAX_LEVEL - 1  # 17 entries

_EPIC_COSTS: tuple[OreCost, ...] = tuple(
    EPIC_UPGRADE_COSTS[lvl] for lvl in range(2, EPIC_MAX_LEVEL + 1)
)
assert len(_EPIC_COSTS) == EPIC_MAX_LEVEL - 1  # 26 entries

_EPIC_EXTENSION_COSTS: tuple[OreCost, ...] = _EPIC_COSTS[COMMON_MAX_LEVEL - 1:]


# ---------------------------------------------------------------------------
# Pre-computed Cumulative Matrices
# ---------------------------------------------------------------------------
# CUMULATIVE_COMMON[i] = total ore from level 1 to level (i+1).
# i.e. CUMULATIVE_COMMON[0] = OreCost(0,0,0)       (already at level 1)
#      CUMULATIVE_COMMON[1] = OreCost(120,0,0)      (cost to reach level 2)
#      CUMULATIVE_COMMON[17] = total cost 1→18

def _build_cumulative(per_level: Sequence[OreCost]) -> tuple[OreCost, ...]:
    """Build cumulative cost array. cumulative[0] = 0 (at level 1)."""
    result: list[OreCost] = [_ZERO]
    running = _ZERO
    for cost in per_level:
        running = running + cost
        result.append(running)
    return tuple(result)


CUMULATIVE_COMMON: tuple[OreCost, ...] = _build_cumulative(_COMMON_COSTS)
CUMULATIVE_EPIC: tuple[OreCost, ...] = _build_cumulative(_EPIC_COSTS)

# Sanity checks
assert len(CUMULATIVE_COMMON) == COMMON_MAX_LEVEL  # 18 entries (index 0–17)
assert len(CUMULATIVE_EPIC) == EPIC_MAX_LEVEL       # 27 entries (index 0–26)
assert CUMULATIVE_COMMON[0] == _ZERO                # level 1 costs nothing
assert CUMULATIVE_EPIC[0] == _ZERO


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def cost_to_upgrade(rarity: Rarity, from_level: int) -> OreCost:
    """
    Cost to upgrade FROM `from_level` TO `from_level + 1`.

    Parameters
    ----------
    rarity: Rarity.COMMON (max 18) or Rarity.EPIC (max 27)
    from_level: Current level (1-indexed). Must be < max_level.

    Raises
    ------
    ValueError: If from_level is out of range.
    """
    table = _COMMON_COSTS if rarity == Rarity.COMMON else _EPIC_COSTS
    max_lvl = COMMON_MAX_LEVEL if rarity == Rarity.COMMON else EPIC_MAX_LEVEL

    if from_level < 1 or from_level >= max_lvl:
        raise ValueError(
            f"Cannot upgrade {rarity.value} equipment from level {from_level}. "
            f"Valid range: 1–{max_lvl - 1}."
        )
    return table[from_level - 1]


def cumulative_cost(rarity: Rarity, to_level: int) -> OreCost:
    """
    Total ore to reach `to_level` starting from level 1.

    Parameters
    ----------
    rarity: Equipment rarity.
    to_level: Target level (1-indexed). Level 1 returns OreCost(0,0,0).
    """
    table = CUMULATIVE_COMMON if rarity == Rarity.COMMON else CUMULATIVE_EPIC
    max_lvl = COMMON_MAX_LEVEL if rarity == Rarity.COMMON else EPIC_MAX_LEVEL

    if to_level < 1 or to_level > max_lvl:
        raise ValueError(
            f"Level {to_level} is out of range for {rarity.value} equipment "
            f"(valid: 1–{max_lvl})."
        )
    return table[to_level - 1]


def range_cost(rarity: Rarity, from_level: int, to_level: int) -> OreCost:
    """
    Total ore to upgrade from `from_level` to `to_level`.

    Parameters
    ----------
    rarity: Equipment rarity.
    from_level: Current level (1-indexed, inclusive).
    to_level: Target level (1-indexed, inclusive).

    Returns OreCost(0,0,0) if from_level >= to_level.
    """
    if from_level >= to_level:
        return _ZERO
    return cumulative_cost(rarity, to_level) - cumulative_cost(rarity, from_level)


def max_equipment_level_for_th(rarity: Rarity, town_hall: int = MAX_TOWN_HALL) -> int:
    """
    Return the maximum equipment upgrade level allowed at the given Town Hall.

    Raises ValueError if town_hall is outside 1..MAX_TOWN_HALL (18).
    Returns 0 for Town Halls < 8 (before Blacksmith unlocks).
    """
    if town_hall < MIN_TOWN_HALL or town_hall > MAX_TOWN_HALL:
        raise ValueError(
            f"Invalid Town Hall level {town_hall}. Valid range: {MIN_TOWN_HALL}–{MAX_TOWN_HALL}."
        )
    if town_hall < 8:
        return 0
    return BLACKSMITH_MAX_LEVEL_BY_TH[town_hall][rarity]


def total_cost_to_max(
    rarity: Rarity,
    from_level: int = 1,
    *,
    town_hall: int = MAX_TOWN_HALL,
) -> OreCost:
    """
    Total ore to max equipment from the given level (optionally capped by Town Hall).

    Equivalent to range_cost(rarity, from_level, max_level_for_th).
    """
    max_lvl = max_equipment_level_for_th(rarity, town_hall)
    if max_lvl == 0:
        return _ZERO
    return range_cost(rarity, from_level, max_lvl)


# ---------------------------------------------------------------------------
# Summary Data (for display / reporting)
# ---------------------------------------------------------------------------

# Total cost to fully max one piece of equipment from level 1
TOTAL_COMMON_FULL = cumulative_cost(Rarity.COMMON, COMMON_MAX_LEVEL)
TOTAL_EPIC_FULL = cumulative_cost(Rarity.EPIC, EPIC_MAX_LEVEL)

# Quick reference strings
COST_TABLE_SUMMARY = f"""
╔══════════════════════════════════════════════════════════════════╗
║  Equipment Ore Cost Summary (Level 1 → Max)                     ║
╠══════════════════════════════════════════════════════════════════╣
║  Common (Lv 1→18):                                              ║
║    Shiny:  {TOTAL_COMMON_FULL.shiny:>7,}    Glowy:  {TOTAL_COMMON_FULL.glowy:>7,}    Starry: {TOTAL_COMMON_FULL.starry:>5,}  ║
║  Epic (Lv 1→27):                                                ║
║    Shiny:  {TOTAL_EPIC_FULL.shiny:>7,}    Glowy:  {TOTAL_EPIC_FULL.glowy:>7,}    Starry: {TOTAL_EPIC_FULL.starry:>5,}  ║
╚══════════════════════════════════════════════════════════════════╝
"""
