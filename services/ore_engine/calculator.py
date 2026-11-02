"""
Ore Progression Engine — Calculation Service
==============================================
Input:  Player's current equipment inventory (equipment name, rarity, level).
Output: Total remaining ore deficit to reach a target state.

Target Modes
------------
Mode A: Max out only the current top Meta equipment pairs per hero.
        Integrates with the meta engine to determine which 2-piece combo
        per hero is dominant, then computes remaining ore for just those items.

Mode B: Max out ALL unlocked equipment across all heroes.

Usage
-----
>>> from services.ore_engine.calculator import (
...     compute_deficit_mode_a, compute_deficit_mode_b,
...     EquipmentInventoryItem, CalculationResult,
... )
>>> inventory = [
...     EquipmentInventoryItem("Giant Gauntlet", Rarity.EPIC, HeroName.BARBARIAN_KING, 15),
...     EquipmentInventoryItem("Barbarian Puppet", Rarity.COMMON, HeroName.BARBARIAN_KING, 10),
... ]
>>> result = compute_deficit_mode_b(inventory)
>>> print(result.total_deficit)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from schemas.pydantic.coc_models import HeroName

from services.ore_engine.cost_tables import (
    COMMON_MAX_LEVEL,
    EPIC_MAX_LEVEL,
    MAX_TOWN_HALL,
    MIN_TOWN_HALL,
    OreCost,
    Rarity,
    max_equipment_level_for_th,
    total_cost_to_max,
    range_cost,
)

# If the meta engine is available, we can use it for Mode A.
# Import is deferred to avoid circular dependency when meta engine is not needed.


# ---------------------------------------------------------------------------
# Input Model
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class EquipmentInventoryItem:
    """
    A single equipment item in the player's current inventory.

    Parameters
    ----------
    name:       Display name (e.g. 'Giant Gauntlet').
    rarity:     Rarity.COMMON (max 18) or Rarity.EPIC (max 27).
    hero:       The hero this equipment belongs to.
    level:      Current upgrade level (1-indexed).
    is_equipped: Whether the equipment is currently equipped on the hero.
    """
    name: str
    rarity: Rarity
    hero: HeroName
    level: int
    is_equipped: bool = False

    @property
    def max_level(self) -> int:
        return COMMON_MAX_LEVEL if self.rarity == Rarity.COMMON else EPIC_MAX_LEVEL

    @property
    def is_maxed(self) -> bool:
        return self.level >= self.max_level

    @property
    def remaining_ore(self) -> OreCost:
        """Ore still needed to max this single equipment item."""
        return total_cost_to_max(self.rarity, self.level)


# ---------------------------------------------------------------------------
# Output Model
# ---------------------------------------------------------------------------

@dataclass
class EquipmentDeficitDetail:
    """Per-equipment breakdown of remaining ore."""
    name: str
    hero: HeroName
    rarity: Rarity
    current_level: int
    target_level: int
    deficit: OreCost

    @property
    def is_complete(self) -> bool:
        return self.deficit.is_zero()


@dataclass
class CalculationResult:
    """
    Aggregated result of a deficit calculation.

    total_deficit:     Sum of ore needed across all targeted equipment.
    per_equipment:     Individual breakdown per item.
    equipment_count:   How many equipment items are included.
    already_maxed:     How many of those are already at max level.
    """
    mode: str                                      # "A" or "B"
    total_deficit: OreCost
    per_equipment: list[EquipmentDeficitDetail]
    equipment_count: int
    already_maxed: int

    @property
    def remaining_count(self) -> int:
        return self.equipment_count - self.already_maxed

    @property
    def avg_deficit_per_item(self) -> OreCost:
        if self.remaining_count == 0:
            return OreCost(0, 0, 0)
        return OreCost(
            shiny=self.total_deficit.shiny // self.remaining_count,
            glowy=self.total_deficit.glowy // self.remaining_count,
            starry=self.total_deficit.starry // self.remaining_count,
        )


# ---------------------------------------------------------------------------
# Mode B: Max ALL Unlocked Equipment
# ---------------------------------------------------------------------------

def compute_deficit_mode_b(
    inventory: list[EquipmentInventoryItem],
    *,
    town_hall: int = MAX_TOWN_HALL,
) -> CalculationResult:
    """
    Compute the total ore deficit to max ALL equipment in the inventory
    up to the Town Hall's Blacksmith cap (default: TH18 max).

    Parameters
    ----------
    inventory:
        List of all equipment the player currently owns (with current levels).
    town_hall:
        Target Town Hall level (1–18, default 18).

    Returns
    -------
    CalculationResult with mode="B".
    """
    if town_hall < MIN_TOWN_HALL or town_hall > MAX_TOWN_HALL:
        raise ValueError(f"Invalid Town Hall level {town_hall}. Valid range: {MIN_TOWN_HALL}–{MAX_TOWN_HALL}.")

    total = OreCost(0, 0, 0)
    details: list[EquipmentDeficitDetail] = []
    already_maxed = 0

    for item in inventory:
        target = min(item.max_level, max_equipment_level_for_th(item.rarity, town_hall))
        deficit = range_cost(item.rarity, item.level, target)

        if deficit.is_zero():
            already_maxed += 1

        details.append(EquipmentDeficitDetail(
            name=item.name,
            hero=item.hero,
            rarity=item.rarity,
            current_level=item.level,
            target_level=target,
            deficit=deficit,
        ))
        total = total + deficit

    # Sort by deficit descending (highest-cost items first)
    details.sort(key=lambda d: d.deficit.total, reverse=True)

    return CalculationResult(
        mode="B",
        total_deficit=total,
        per_equipment=details,
        equipment_count=len(inventory),
        already_maxed=already_maxed,
    )


# ---------------------------------------------------------------------------
# Mode A: Max Only Top Meta Equipment Pairs Per Hero
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class MetaOverride:
    """
    Manual override for a hero's meta pair when the meta engine dataset
    is not available.

    Usage: provide a list of MetaOverride to skip the engine entirely.
    """
    hero: HeroName
    equipment_1: str
    equipment_2: str


# Canonical TH18 Meta Equipment Pairs (including Minion Prince & Dragon Duke)
DEFAULT_TH18_META_OVERRIDES: tuple[MetaOverride, ...] = (
    MetaOverride(HeroName.BARBARIAN_KING, "Giant Gauntlet", "Spiky Ball"),
    MetaOverride(HeroName.ARCHER_QUEEN, "Magic Mirror", "Frozen Arrow"),
    MetaOverride(HeroName.GRAND_WARDEN, "Eternal Tome", "Fireball"),
    MetaOverride(HeroName.ROYAL_CHAMPION, "Electro Boots", "Rocket Spear"),
    MetaOverride(HeroName.MINION_PRINCE, "Dark Orb", "Dark Crown"),
    MetaOverride(HeroName.DRAGON_DUKE, "Dragonfire Crown", "Flame Breath"),
)


def compute_deficit_mode_a(
    inventory: list[EquipmentInventoryItem],
    *,
    meta_overrides: Optional[list[MetaOverride]] = None,
    meta_synergies: Optional[dict] = None,
    town_hall: int = MAX_TOWN_HALL,
) -> CalculationResult:
    """
    Compute ore deficit to max only the top meta equipment pair for each hero.

    Parameters
    ----------
    inventory:
        Full equipment inventory.
    meta_overrides:
        Manual hero → (eq1, eq2) overrides. Takes priority over meta_synergies.
    meta_synergies:
        Output of calculate_equipment_synergies(). If provided, the top
        synergy pair per hero is used as the target.
    town_hall:
        Target Town Hall level (1–18, default 18).

    Falls back to the top 2 highest-level equipment per hero when neither
    overrides nor synergies are provided.

    Returns
    -------
    CalculationResult with mode="A".
    """
    if town_hall < MIN_TOWN_HALL or town_hall > MAX_TOWN_HALL:
        raise ValueError(f"Invalid Town Hall level {town_hall}. Valid range: {MIN_TOWN_HALL}–{MAX_TOWN_HALL}.")

    # ── 1. Build hero→meta pair mapping ────────────────────────────────────
    meta_pairs: dict[HeroName, set[str]] = {}

    if meta_overrides:
        for override in meta_overrides:
            meta_pairs[override.hero] = {override.equipment_1, override.equipment_2}

    elif meta_synergies:
        # meta_synergies is dict[HeroName, HeroMetaResult]
        for hero_name, result in meta_synergies.items():
            if result.top_synergies:
                pair = result.top_synergies[0].equipment_pair
                meta_pairs[hero_name] = set(pair)

    else:
        # Fallback: pick the 2 highest-level equipment per hero
        hero_items: dict[HeroName, list[EquipmentInventoryItem]] = {}
        for item in inventory:
            hero_items.setdefault(item.hero, []).append(item)
        for hero, items in hero_items.items():
            sorted_items = sorted(items, key=lambda i: i.level, reverse=True)
            meta_pairs[hero] = {i.name for i in sorted_items[:2]}

    # ── 2. Filter inventory to meta items only ─────────────────────────────
    meta_items = [
        item for item in inventory
        if item.hero in meta_pairs and item.name in meta_pairs[item.hero]
    ]

    # ── 3. Compute deficit ─────────────────────────────────────────────────
    total = OreCost(0, 0, 0)
    details: list[EquipmentDeficitDetail] = []
    already_maxed = 0

    for item in meta_items:
        target = min(item.max_level, max_equipment_level_for_th(item.rarity, town_hall))
        deficit = range_cost(item.rarity, item.level, target)

        if deficit.is_zero():
            already_maxed += 1

        details.append(EquipmentDeficitDetail(
            name=item.name,
            hero=item.hero,
            rarity=item.rarity,
            current_level=item.level,
            target_level=target,
            deficit=deficit,
        ))
        total = total + deficit

    details.sort(key=lambda d: d.deficit.total, reverse=True)

    return CalculationResult(
        mode="A",
        total_deficit=total,
        per_equipment=details,
        equipment_count=len(meta_items),
        already_maxed=already_maxed,
    )


# ---------------------------------------------------------------------------
# Convenience: format a CalculationResult for display
# ---------------------------------------------------------------------------

def format_deficit_report(result: CalculationResult) -> str:
    """Render a human-readable deficit report."""
    lines: list[str] = [
        f"\n{'═' * 65}",
        f"  Ore Deficit Report — Mode {result.mode}",
        f"{'═' * 65}",
        f"  Equipment: {result.equipment_count} total, "
        f"{result.already_maxed} already maxed, "
        f"{result.remaining_count} remaining",
        "",
        f"  Total Deficit:",
        f"    Shiny:  {result.total_deficit.shiny:>8,}",
        f"    Glowy:  {result.total_deficit.glowy:>8,}",
        f"    Starry: {result.total_deficit.starry:>8,}",
        "",
    ]

    if result.per_equipment:
        lines.append("  Per-Equipment Breakdown:")
        for detail in result.per_equipment:
            if detail.is_complete:
                status = "✅ MAXED"
            else:
                status = f"Lv {detail.current_level}→{detail.target_level}"
            lines.append(
                f"    {detail.name:<35} ({detail.hero.value})"
            )
            lines.append(
                f"      {status:15}  "
                f"S:{detail.deficit.shiny:>6,}  "
                f"G:{detail.deficit.glowy:>6,}  "
                f"★:{detail.deficit.starry:>5,}"
            )

    lines.append(f"{'═' * 65}")
    return "\n".join(lines)
