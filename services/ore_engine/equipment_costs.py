"""
Equipment Ore Upgrade Costs — Single Source of Truth
===================================================
Exact official upgrade costs for Clash of Clans Hero Equipment.
Covers:
  - Common Equipment (maxLevel 18, Shiny & Glowy only)
  - Epic Equipment   (maxLevel 27, Shiny, Glowy & Starry)

Level in table represents the cost to REACH that level (e.g., Level 2 = cost for 1 -> 2).
Level 1 is the starting level with zero cost.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Mapping, Sequence

logger = logging.getLogger(__name__)

COMMON_MAX_LEVEL: int = 18
EPIC_MAX_LEVEL: int = 27


@dataclass(frozen=True, slots=True)
class OreCost:
    """Immutable triplet of ore costs: Shiny, Glowy, Starry."""
    shiny: int = 0
    glowy: int = 0
    starry: int = 0

    def __add__(self, other: "OreCost") -> "OreCost":
        return OreCost(
            shiny=self.shiny + other.shiny,
            glowy=self.glowy + other.glowy,
            starry=self.starry + other.starry,
        )

    def __sub__(self, other: "OreCost") -> "OreCost":
        return OreCost(
            shiny=max(0, self.shiny - other.shiny),
            glowy=max(0, self.glowy - other.glowy),
            starry=max(0, self.starry - other.starry),
        )

    def __mul__(self, scalar: int | float) -> "OreCost":
        return OreCost(
            shiny=int(self.shiny * scalar),
            glowy=int(self.glowy * scalar),
            starry=int(self.starry * scalar),
        )

    def is_zero(self) -> bool:
        return self.shiny == 0 and self.glowy == 0 and self.starry == 0

    @property
    def total(self) -> int:
        return self.shiny + self.glowy + self.starry

    def bottleneck(self, daily_income: "OreCost") -> str:
        """
        Determine which ore type takes the longest to accumulate,
        given a daily income rate. Returns 'shiny', 'glowy', or 'starry'.
        """
        days = {}
        if daily_income.shiny > 0:
            days["shiny"] = self.shiny / daily_income.shiny
        elif self.shiny > 0:
            days["shiny"] = float("inf")
        else:
            days["shiny"] = 0.0

        if daily_income.glowy > 0:
            days["glowy"] = self.glowy / daily_income.glowy
        elif self.glowy > 0:
            days["glowy"] = float("inf")
        else:
            days["glowy"] = 0.0

        if daily_income.starry > 0:
            days["starry"] = self.starry / daily_income.starry
        elif self.starry > 0:
            days["starry"] = float("inf")
        else:
            days["starry"] = 0.0

        return max(days, key=days.get)


# ---------------------------------------------------------------------------
# Official Cost Tables (Single Source of Truth)
# ---------------------------------------------------------------------------

COMMON_UPGRADE_COSTS: dict[int, OreCost] = {
    2:  OreCost(120, 0, 0),
    3:  OreCost(240, 20, 0),
    4:  OreCost(400, 0, 0),
    5:  OreCost(600, 0, 0),
    6:  OreCost(840, 100, 0),
    7:  OreCost(1120, 0, 0),
    8:  OreCost(1440, 0, 0),
    9:  OreCost(1800, 200, 0),
    10: OreCost(1900, 0, 0),
    11: OreCost(2000, 0, 0),
    12: OreCost(2100, 400, 0),
    13: OreCost(2200, 0, 0),
    14: OreCost(2300, 0, 0),
    15: OreCost(2400, 600, 0),
    16: OreCost(2500, 0, 0),
    17: OreCost(2600, 0, 0),
    18: OreCost(2700, 600, 0),
}

EPIC_UPGRADE_COSTS: dict[int, OreCost] = {
    2:  OreCost(120, 0, 0),
    3:  OreCost(240, 20, 0),
    4:  OreCost(400, 0, 0),
    5:  OreCost(600, 0, 0),
    6:  OreCost(840, 100, 0),
    7:  OreCost(1120, 0, 0),
    8:  OreCost(1440, 0, 0),
    9:  OreCost(1800, 200, 10),
    10: OreCost(1900, 0, 0),
    11: OreCost(2000, 0, 0),
    12: OreCost(2100, 400, 20),
    13: OreCost(2200, 0, 0),
    14: OreCost(2300, 0, 0),
    15: OreCost(2400, 600, 30),
    16: OreCost(2500, 0, 0),
    17: OreCost(2600, 0, 0),
    18: OreCost(2700, 600, 50),
    19: OreCost(2800, 0, 0),
    20: OreCost(2900, 0, 0),
    21: OreCost(3000, 600, 100),
    22: OreCost(3100, 0, 0),
    23: OreCost(3200, 0, 0),
    24: OreCost(3300, 600, 120),
    25: OreCost(3400, 0, 0),
    26: OreCost(3500, 0, 0),
    27: OreCost(3600, 600, 150),
}


def detect_equipment_rarity(max_level: int | None) -> str | None:
    """
    Determine equipment rarity strictly by maxLevel:
      - maxLevel == 18 -> "Common"
      - maxLevel == 27 -> "Epic"
      - Any other value -> None (logs warning, does not raise error).
    """
    if max_level == COMMON_MAX_LEVEL:
        return "Common"
    elif max_level == EPIC_MAX_LEVEL:
        return "Epic"
    else:
        logger.warning(
            f"[equipment_costs] Unknown equipment maxLevel: {max_level}. "
            f"Excluding equipment from calculation."
        )
        return None


def compute_equipment_upgrade_cost(
    rarity: str,
    current_level: int,
    target_level: int | None = None,
) -> OreCost:
    """
    Pure function to compute the remaining ore upgrade cost for an equipment item.

    Parameters
    ----------
    rarity: "Common" or "Epic"
    current_level: Current equipment level (1-indexed).
    target_level: Target upgrade level. Defaults to max possible level (18 or 27).

    Returns
    -------
    OreCost(shiny, glowy, starry). Returns OreCost(0, 0, 0) if current_level >= target_level
    or current_level >= max_level.
    """
    max_level = COMMON_MAX_LEVEL if rarity == "Common" else EPIC_MAX_LEVEL
    effective_target = max_level if target_level is None else min(target_level, max_level)

    if current_level >= effective_target or current_level >= max_level:
        return OreCost(0, 0, 0)

    table = COMMON_UPGRADE_COSTS if rarity == "Common" else EPIC_UPGRADE_COSTS

    shiny = 0
    glowy = 0
    starry = 0

    # Sum costs from current_level + 1 up to effective_target (both inclusive)
    start_lvl = max(1, current_level) + 1
    for lvl in range(start_lvl, effective_target + 1):
        step_cost = table.get(lvl)
        if step_cost:
            shiny += step_cost.shiny
            glowy += step_cost.glowy
            starry += step_cost.starry

    return OreCost(shiny=shiny, glowy=glowy, starry=starry)


def calculate_player_ore_deficit(
    hero_equipment: Sequence[Mapping[str, Any]],
    target_level_override: int | None = None,
) -> dict[str, Any]:
    """
    Compute total and per-item ore deficit across a list of hero equipment items.
    Items with unrecognized maxLevel are excluded with a warning.
    """
    total = OreCost(0, 0, 0)
    items: list[dict[str, Any]] = []

    for eq in hero_equipment:
        name = str(eq.get("name", "Unknown"))
        level = int(eq.get("level", 1))
        max_level = eq.get("maxLevel")

        rarity = detect_equipment_rarity(max_level)
        if rarity is None:
            continue

        item_max = COMMON_MAX_LEVEL if rarity == "Common" else EPIC_MAX_LEVEL
        target = min(target_level_override, item_max) if target_level_override is not None else item_max

        cost = compute_equipment_upgrade_cost(rarity, level, target)
        total = total + cost

        items.append({
            "name": name,
            "rarity": rarity,
            "level": level,
            "maxLevel": max_level,
            "targetLevel": target,
            "cost": cost,
        })

    return {
        "total": total,
        "items": items,
    }
