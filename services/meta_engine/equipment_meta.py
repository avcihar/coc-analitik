"""
Weighted Hero Equipment Meta Engine
=====================================
Function: calculate_equipment_synergies(players_dataset, weight_strategy, scope_limit)

Algorithm Complexity: O(N)
  - Single pass over N players
  - Per-player work is O(H × E) where H = heroes per player (~5 max),
    E = equipment slots per hero (2 max) → constant factor, not a function of N

Weighting Strategies
--------------------
RANK_DECAY_TIERED
    Rank bands with fixed multipliers:
        1–10    → 0.50
        11–100  → 0.40
        101–1000→ 0.30
        1001+   → base_weight (default 0.20)

RANK_DECAY_EXPONENTIAL
    weight = initial_weight × (decay_rate ^ (rank - 1))
    Defaults: initial_weight=1.0, decay_rate=0.9995

UNIFORM
    All players weighted equally (weight=1.0). Useful for unranked datasets.

Output
------
dict[HeroName, HeroMetaResult]
    For each hero:
      - top_synergies: top 2-piece equipment combos ranked by weighted pick rate
      - equipment_stats: per-equipment usage percentage and average level
"""

from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from schemas.pydantic.coc_models import HeroEquipment, HeroName, PlayerProfile


# Canonical Hero Equipment Registry across all 6 Heroes (TH18 Meta, incl. Minion Prince & Dragon Duke)
HERO_EQUIPMENT_REGISTRY: dict[HeroName, tuple[str, ...]] = {
    HeroName.BARBARIAN_KING: (
        "Barbarian Puppet",
        "Rage Vial",
        "Earthquake Boots",
        "Vampstache",
        "Giant Gauntlet",
        "Spiky Ball",
        "Snake Bracelet",
    ),
    HeroName.ARCHER_QUEEN: (
        "Archer Puppet",
        "Invisibility Vial",
        "Giant Arrow",
        "Healer Puppet",
        "Frozen Arrow",
        "Magic Mirror",
        "Action Figure",
    ),
    HeroName.MINION_PRINCE: (
        "Henchman Puppet",
        "Dark Orb",
        "Metal Pants",
        "Noble Iron",
        "Dark Crown",
    ),
    HeroName.GRAND_WARDEN: (
        "Eternal Tome",
        "Life Gem",
        "Rage Gem",
        "Healing Tome",
        "Fireball",
        "Lavaloon Puppet",
    ),
    HeroName.ROYAL_CHAMPION: (
        "Royal Gem",
        "Seeking Shield",
        "Hog Rider Puppet",
        "Haste Vial",
        "Rocket Spear",
        "Electro Boots",
    ),
    HeroName.DRAGON_DUKE: (
        "Flame Breath",
        "Dragon Scale Shield",
        "Winged Gem",
        "Drake Talon",
        "Dragonfire Crown",
        "Inferno Core",
    ),
}


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

class WeightStrategy(str, Enum):
    RANK_DECAY_TIERED       = "rank_decay_tiered"
    RANK_DECAY_EXPONENTIAL  = "rank_decay_exponential"
    UNIFORM                 = "uniform"


@dataclass(frozen=True)
class TieredDecayConfig:
    """
    Configuration for RANK_DECAY_TIERED strategy.
    Each tuple is (exclusive_upper_bound, multiplier).
    The final entry acts as the catch-all "base" tier.
    """
    tiers: tuple[tuple[int, float], ...] = (
        (11,   0.50),   # ranks 1–10
        (101,  0.40),   # ranks 11–100
        (1001, 0.30),   # ranks 101–1000
        (math.inf, 0.20), # ranks 1001+  (base weight)
    )


@dataclass(frozen=True)
class ExponentialDecayConfig:
    """
    Configuration for RANK_DECAY_EXPONENTIAL strategy.
    weight = initial_weight × (decay_rate ^ (rank - 1))
    """
    initial_weight: float = 1.0
    decay_rate: float = 0.9995   # ~60% weight at rank 1000


# ---------------------------------------------------------------------------
# Output types
# ---------------------------------------------------------------------------

@dataclass
class EquipmentUsageStat:
    """Usage statistics for a single equipment item on a given hero."""
    equipment_name: str
    weighted_pick_count: float
    pick_rate_pct: float          # 0.0 – 100.0
    avg_level: float
    total_observations: int       # raw count (unweighted)


@dataclass
class SynergyResult:
    """A 2-piece equipment combo and its weighted pick rate."""
    equipment_pair: tuple[str, str]   # alphabetically sorted for dedup
    weighted_pick_count: float
    pick_rate_pct: float              # 0.0 – 100.0
    avg_combined_level: float
    total_observations: int           # raw count (unweighted)


@dataclass
class HeroMetaResult:
    """Aggregated meta statistics for a single hero."""
    hero_name: HeroName
    total_weighted_players: float     # sum of weights for players who have this hero
    top_synergies: list[SynergyResult]
    equipment_stats: list[EquipmentUsageStat]


# ---------------------------------------------------------------------------
# Internal accumulators (not exposed to callers)
# ---------------------------------------------------------------------------

@dataclass
class _EquipAccum:
    weighted_count: float = 0.0
    raw_count: int = 0
    weighted_level_sum: float = 0.0


@dataclass
class _SynergyAccum:
    weighted_count: float = 0.0
    raw_count: int = 0
    weighted_level_sum: float = 0.0   # sum of (level1 + level2) × weight


# ---------------------------------------------------------------------------
# Weight calculators
# ---------------------------------------------------------------------------

def _tiered_weight(rank: int, config: TieredDecayConfig) -> float:
    """O(T) where T = number of tiers (constant ~4)."""
    for upper_bound, multiplier in config.tiers:
        if rank < upper_bound:
            return multiplier
    # Unreachable given math.inf final tier, but satisfies type checker
    return config.tiers[-1][1]


def _exponential_weight(rank: int, config: ExponentialDecayConfig) -> float:
    """Exponential decay: w = w0 × r^(rank-1). O(1)."""
    return config.initial_weight * (config.decay_rate ** (rank - 1))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def calculate_equipment_synergies(
    players_dataset: list[PlayerProfile],
    *,
    weight_strategy: WeightStrategy = WeightStrategy.RANK_DECAY_TIERED,
    scope_limit: Optional[int] = None,
    tiered_config: TieredDecayConfig = TieredDecayConfig(),
    exponential_config: ExponentialDecayConfig = ExponentialDecayConfig(),
    top_n_synergies: int = 10,
    top_n_equipment: int = 20,
) -> dict[HeroName, HeroMetaResult]:
    """
    Compute weighted hero equipment synergy statistics over a player dataset.

    Parameters
    ----------
    players_dataset:
        Ordered list of PlayerProfile objects. If rank-decay is used, the list
        ORDER is treated as rank (index 0 → rank 1, index 1 → rank 2, …).
        Pass the list pre-sorted by trophies/ranking before calling.

    weight_strategy:
        How to weight each player's contribution. See WeightStrategy enum.

    scope_limit:
        If provided, only the first `scope_limit` players are processed.
        Useful for "top-200 Legend League" slices without slicing the list externally.

    tiered_config:
        Band/multiplier configuration for RANK_DECAY_TIERED strategy.

    exponential_config:
        Decay parameters for RANK_DECAY_EXPONENTIAL strategy.

    top_n_synergies:
        How many 2-piece synergies to return per hero, sorted by pick rate desc.

    top_n_equipment:
        How many individual equipment stats to return per hero, sorted by pick rate desc.

    Returns
    -------
    dict[HeroName, HeroMetaResult]
        Keyed by HeroName enum. Heroes with zero observations are omitted.

    Complexity
    ----------
    O(N) over the dataset where N = len(players_dataset).
    The per-player inner loop is O(H × E) ≤ O(5 × 2) = O(10) → constant.
    Final sorting is O(K log K) per hero where K = unique equipment count
    (K ≤ ~50 globally) — dominated by the O(N) sweep.
    """
    # ── 1. Determine effective dataset slice (O(1)) ────────────────────────
    effective = players_dataset[:scope_limit] if scope_limit is not None else players_dataset

    # ── 2. Accumulators (hash maps → O(1) insertions) ─────────────────────
    # hero → equipment_name → _EquipAccum
    equip_accum: dict[HeroName, dict[str, _EquipAccum]] = defaultdict(
        lambda: defaultdict(_EquipAccum)
    )
    # hero → frozenset{eq1, eq2} → _SynergyAccum
    synergy_accum: dict[HeroName, dict[frozenset, _SynergyAccum]] = defaultdict(
        lambda: defaultdict(_SynergyAccum)
    )
    # hero → total weight of players who OWN this hero
    hero_total_weight: dict[HeroName, float] = defaultdict(float)

    # ── 3. Single-pass sweep O(N) ──────────────────────────────────────────
    for rank_zero, player in enumerate(effective):
        rank = rank_zero + 1  # 1-indexed rank

        # Compute player weight — O(1) for all strategies
        if weight_strategy == WeightStrategy.RANK_DECAY_TIERED:
            weight = _tiered_weight(rank, tiered_config)
        elif weight_strategy == WeightStrategy.RANK_DECAY_EXPONENTIAL:
            weight = _exponential_weight(rank, exponential_config)
        else:  # UNIFORM
            weight = 1.0

        # Inner loop: O(H × E) = O(constant)
        for hero in player.heroes:
            hero_name = hero.name
            hero_total_weight[hero_name] += weight

            equipped_items: list[HeroEquipment] = list(hero.equipment)

            # Individual equipment stats
            for eq in equipped_items:
                acc = equip_accum[hero_name][eq.name]
                acc.weighted_count += weight
                acc.raw_count += 1
                acc.weighted_level_sum += eq.level * weight

            # 2-piece synergy (only when exactly 2 equipment are equipped)
            if len(equipped_items) == 2:
                pair_key = frozenset({equipped_items[0].name, equipped_items[1].name})
                s_acc = synergy_accum[hero_name][pair_key]
                s_acc.weighted_count += weight
                s_acc.raw_count += 1
                s_acc.weighted_level_sum += (
                    equipped_items[0].level + equipped_items[1].level
                ) * weight

    # ── 4. Build output (O(K log K) per hero, K << N) ─────────────────────
    result: dict[HeroName, HeroMetaResult] = {}

    for hero_name in hero_total_weight:
        total_w = hero_total_weight[hero_name]
        if total_w == 0:
            continue

        # --- Equipment stats
        eq_stats: list[EquipmentUsageStat] = []
        for eq_name, acc in equip_accum[hero_name].items():
            eq_stats.append(
                EquipmentUsageStat(
                    equipment_name=eq_name,
                    weighted_pick_count=acc.weighted_count,
                    pick_rate_pct=round((acc.weighted_count / total_w) * 100, 2),
                    avg_level=round(
                        acc.weighted_level_sum / acc.weighted_count
                        if acc.weighted_count > 0 else 0.0,
                        2,
                    ),
                    total_observations=acc.raw_count,
                )
            )
        eq_stats.sort(key=lambda s: s.weighted_pick_count, reverse=True)

        # --- Synergy stats
        synergy_results: list[SynergyResult] = []
        for pair_key, s_acc in synergy_accum[hero_name].items():
            sorted_pair = tuple(sorted(pair_key))
            synergy_results.append(
                SynergyResult(
                    equipment_pair=sorted_pair,
                    weighted_pick_count=s_acc.weighted_count,
                    pick_rate_pct=round(
                        (s_acc.weighted_count / total_w) * 100, 2
                    ),
                    avg_combined_level=round(
                        s_acc.weighted_level_sum / s_acc.weighted_count
                        if s_acc.weighted_count > 0 else 0.0,
                        2,
                    ),
                    total_observations=s_acc.raw_count,
                )
            )
        synergy_results.sort(key=lambda s: s.weighted_pick_count, reverse=True)

        result[hero_name] = HeroMetaResult(
            hero_name=hero_name,
            total_weighted_players=round(total_w, 4),
            top_synergies=synergy_results[:top_n_synergies],
            equipment_stats=eq_stats[:top_n_equipment],
        )

    return result


# ---------------------------------------------------------------------------
# Formatting helper (for REPL / CLI reporting)
# ---------------------------------------------------------------------------

def format_meta_report(meta: dict[HeroName, HeroMetaResult]) -> str:
    """Render a human-readable meta report to a string."""
    lines: list[str] = []
    for hero_name, result in sorted(meta.items(), key=lambda kv: kv[0].value):
        lines.append(f"\n{'━' * 60}")
        lines.append(f"  {hero_name.value}  (weighted sample: {result.total_weighted_players:.1f})")
        lines.append(f"{'━' * 60}")

        lines.append("  Top Synergies:")
        for i, syn in enumerate(result.top_synergies[:5], 1):
            lines.append(
                f"    #{i:>2}  {' + '.join(syn.equipment_pair):<50}"
                f"  {syn.pick_rate_pct:>6.2f}%  "
                f"avg combined lvl: {syn.avg_combined_level:.1f}  "
                f"(n={syn.total_observations})"
            )

        lines.append("\n  Individual Equipment:")
        for stat in result.equipment_stats[:8]:
            bar = "█" * int(stat.pick_rate_pct / 5)
            lines.append(
                f"    {stat.equipment_name:<40}"
                f"  {stat.pick_rate_pct:>6.2f}%  "
                f"avg lvl: {stat.avg_level:.1f}  "
                f"{bar}"
            )

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Data-Driven Army Clustering & Recommendation Engine (TH16 – TH18)
# ---------------------------------------------------------------------------

def cluster_and_recommend_meta_armies(
    profiles: Optional[Sequence[dict]] = None,
    meta_stats: Optional[dict] = None,
    town_hall: Optional[int] = None,
) -> dict:
    """
    Cluster real player army compositions and battlelog attacks by archetype,
    equipment synergy, and 3-star success rate (`threeStarRatePct`), and return
    the top 5 Meta Army recommendations for TH16, TH17, and TH18.

    Each recommended composition includes:
      - Exact troop counts (`troops`), spell counts (`spells`), and `siegeMachine`
      - 6-Hero recommended 2-piece equipment loadouts (`heroEquipment` for
        Barbarian King, Archer Queen, Minion Prince, Grand Warden,
        Royal Champion, and Dragon Duke)
      - Recommended `pets`
      - Empirical `usagePct` / `pickRatePct` (`pick_rate %`) and `threeStarRatePct`
      - One-click in-game CopyArmy link (`https://link.clashofclans.com/...`)
    """
    from services.workers.leaderboard import recommend_meta_armies

    return recommend_meta_armies(
        meta_stats=meta_stats,
        town_hall=town_hall,
        profiles=list(profiles) if profiles is not None else None,
    )

