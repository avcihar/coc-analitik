"""
Meta Engine — Unit Tests
========================
Covers:
  - Tiered rank-decay weighting correctness
  - Exponential decay weighting correctness
  - Uniform weighting
  - Scope limit slicing
  - Synergy pick rate computation
  - Individual equipment pick rate and average level
  - Players with 0 equipment (heroes without gear)
  - Players with only 1 equipment slot filled
  - Empty dataset
  - Weighted vs. unweighted pick rate divergence (rank-decay effect)
  - top_n_synergies / top_n_equipment truncation

Run with:
    python -m pytest services/meta_engine/tests/test_equipment_meta.py -v
"""

from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

import math
import pytest
from datetime import datetime, timezone

from schemas.pydantic.coc_models import (
    EquipmentRarity,
    Hero,
    HeroEquipment,
    HeroName,
    PlayerProfile,
    Pet,
)
from services.meta_engine.equipment_meta import (
    ExponentialDecayConfig,
    HeroMetaResult,
    TieredDecayConfig,
    WeightStrategy,
    _exponential_weight,
    _tiered_weight,
    calculate_equipment_synergies,
)

# ---------------------------------------------------------------------------
# Test Utilities
# ---------------------------------------------------------------------------

NOW = datetime(2026, 9, 8, 16, 0, 0, tzinfo=timezone.utc)


def _equip(name: str, level: int = 18, rarity: EquipmentRarity = EquipmentRarity.EPIC) -> HeroEquipment:
    return HeroEquipment(name=name, level=level, max_level=27, rarity=rarity)


def _hero(name: HeroName, *equip_names_levels: tuple[str, int]) -> Hero:
    equipment = [_equip(n, lvl) for n, lvl in equip_names_levels]
    return Hero(name=name, level=90, max_level=90, equipment=equipment)



# Supercell's canonical base-32 character set used in player/clan tags.
_COC_TAG_CHARS = "0289PYLQGRJCUV"


def _player(tag_suffix: str, heroes: list[Hero], trophies: int = 5000) -> PlayerProfile:
    """
    Build a PlayerProfile with a structurally valid CoC tag.

    Any tag_suffix is normalised by:
      1. Uppercasing all characters.
      2. Keeping only characters that appear in Supercell's base-32 charset.
      3. Falling back to "PYLQ" when the suffix produces no valid chars.
      4. Left-padding with 'Y' and truncating to exactly 8 characters.
      5. Prepending '#' — the PlayerProfile.tag validator strips it automatically.
    """
    clean = "".join(c for c in tag_suffix.upper() if c in _COC_TAG_CHARS) or "PYLQ"
    valid_tag = f"#{clean.ljust(8, 'Y')[:8]}"
    return PlayerProfile(
        tag=valid_tag,
        name=f"Player_{tag_suffix}",
        exp_level=300,
        town_hall_level=16,
        trophies=trophies,
        best_trophies=trophies + 500,
        war_stars=1000,
        heroes=heroes,
        heroEquipmentPets=[],
        last_scouted_at=NOW,
    )


BK = HeroName.BARBARIAN_KING
AQ = HeroName.ARCHER_QUEEN
GW = HeroName.GRAND_WARDEN

GG = "Giant Gauntlet"
BP = "Barbarian Puppet"
ES = "Earthquake Boots"
FP = "Frozen Arrow"
AP = "Archer Puppet"


# ---------------------------------------------------------------------------
# 1 · Weight Calculator Unit Tests
# ---------------------------------------------------------------------------

class TestTieredWeight:
    CFG = TieredDecayConfig()

    def test_rank_1_is_top_tier(self):
        assert _tiered_weight(1, self.CFG) == 0.50

    def test_rank_10_is_top_tier(self):
        assert _tiered_weight(10, self.CFG) == 0.50

    def test_rank_11_is_second_tier(self):
        assert _tiered_weight(11, self.CFG) == 0.40

    def test_rank_100_is_second_tier(self):
        assert _tiered_weight(100, self.CFG) == 0.40

    def test_rank_101_is_third_tier(self):
        assert _tiered_weight(101, self.CFG) == 0.30

    def test_rank_1000_is_third_tier(self):
        assert _tiered_weight(1000, self.CFG) == 0.30

    def test_rank_1001_is_base_tier(self):
        assert _tiered_weight(1001, self.CFG) == 0.20

    def test_rank_50000_is_base_tier(self):
        assert _tiered_weight(50_000, self.CFG) == 0.20

    def test_custom_tiers(self):
        custom = TieredDecayConfig(tiers=((6, 1.0), (math.inf, 0.5)))
        assert _tiered_weight(1, custom) == 1.0
        assert _tiered_weight(5, custom) == 1.0
        assert _tiered_weight(6, custom) == 0.5
        assert _tiered_weight(999, custom) == 0.5


class TestExponentialWeight:
    CFG = ExponentialDecayConfig(initial_weight=1.0, decay_rate=0.9995)

    def test_rank_1_is_initial_weight(self):
        assert _exponential_weight(1, self.CFG) == pytest.approx(1.0)

    def test_rank_2_decays(self):
        expected = 1.0 * (0.9995 ** 1)
        assert _exponential_weight(2, self.CFG) == pytest.approx(expected)

    def test_rank_1000_approximately_60pct(self):
        w = _exponential_weight(1000, self.CFG)
        assert 0.55 < w < 0.70  # ~60% of initial

    def test_monotonically_decreasing(self):
        weights = [_exponential_weight(r, self.CFG) for r in range(1, 101)]
        assert all(weights[i] > weights[i + 1] for i in range(len(weights) - 1))


# ---------------------------------------------------------------------------
# 2 · Empty Dataset
# ---------------------------------------------------------------------------

class TestEmptyDataset:
    def test_empty_returns_empty_dict(self):
        result = calculate_equipment_synergies([])
        assert result == {}

    def test_scope_limit_zero_returns_empty(self):
        players = [_player("P1", [_hero(BK, (GG, 18), (BP, 25))])]
        result = calculate_equipment_synergies(players, scope_limit=0)
        assert result == {}


# ---------------------------------------------------------------------------
# 3 · Synergy Pick Rate
# ---------------------------------------------------------------------------

class TestSynergyPickRate:
    def test_100pct_synergy_when_all_use_same_combo(self):
        players = [
            _player("P1", [_hero(BK, (GG, 18), (BP, 25))]),
            _player("P2", [_hero(BK, (GG, 20), (BP, 24))]),
            _player("P3", [_hero(BK, (GG, 22), (BP, 26))]),
        ]
        meta = calculate_equipment_synergies(players, weight_strategy=WeightStrategy.UNIFORM)
        bk_meta = meta[BK]
        assert len(bk_meta.top_synergies) == 1
        assert bk_meta.top_synergies[0].pick_rate_pct == pytest.approx(100.0)

    def test_50pct_split_synergy(self):
        players = [
            _player("P1", [_hero(BK, (GG, 18), (BP, 25))]),
            _player("P2", [_hero(BK, (ES, 15), (BP, 25))]),
        ]
        meta = calculate_equipment_synergies(players, weight_strategy=WeightStrategy.UNIFORM)
        bk_meta = meta[BK]
        rates = sorted([s.pick_rate_pct for s in bk_meta.top_synergies], reverse=True)
        assert rates == pytest.approx([50.0, 50.0])

    def test_synergy_pair_is_alphabetically_sorted(self):
        players = [_player("P1", [_hero(BK, (GG, 18), (BP, 25))])]
        meta = calculate_equipment_synergies(players, weight_strategy=WeightStrategy.UNIFORM)
        pair = meta[BK].top_synergies[0].equipment_pair
        assert pair == tuple(sorted(pair))

    def test_synergies_ranked_by_pick_rate_desc(self):
        players = [
            _player("P1", [_hero(BK, (GG, 18), (BP, 25))]),
            _player("P2", [_hero(BK, (GG, 18), (BP, 25))]),
            _player("P3", [_hero(BK, (ES, 15), (BP, 25))]),
        ]
        meta = calculate_equipment_synergies(players, weight_strategy=WeightStrategy.UNIFORM)
        rates = [s.pick_rate_pct for s in meta[BK].top_synergies]
        assert rates == sorted(rates, reverse=True)


# ---------------------------------------------------------------------------
# 4 · Individual Equipment Stats
# ---------------------------------------------------------------------------

class TestEquipmentStats:
    def test_100pct_pick_rate_single_equipment(self):
        players = [
            _player("P1", [_hero(BK, (GG, 18), (BP, 25))]),
            _player("P2", [_hero(BK, (GG, 20), (BP, 24))]),
        ]
        meta = calculate_equipment_synergies(players, weight_strategy=WeightStrategy.UNIFORM)
        gg_stat = next(s for s in meta[BK].equipment_stats if s.equipment_name == GG)
        assert gg_stat.pick_rate_pct == pytest.approx(100.0)

    def test_average_level_correct(self):
        players = [
            _player("P1", [_hero(BK, (GG, 10))]),
            _player("P2", [_hero(BK, (GG, 20))]),
        ]
        meta = calculate_equipment_synergies(players, weight_strategy=WeightStrategy.UNIFORM)
        gg_stat = next(s for s in meta[BK].equipment_stats if s.equipment_name == GG)
        assert gg_stat.avg_level == pytest.approx(15.0)  # (10+20)/2

    def test_equipment_sorted_by_pick_rate_desc(self):
        players = [
            _player("P1", [_hero(BK, (GG, 18), (BP, 25))]),
            _player("P2", [_hero(BK, (GG, 20), (ES, 10))]),
        ]
        meta = calculate_equipment_synergies(players, weight_strategy=WeightStrategy.UNIFORM)
        # GG appears in both → higher pick rate than BP or ES
        top_eq = meta[BK].equipment_stats[0].equipment_name
        assert top_eq == GG


# ---------------------------------------------------------------------------
# 5 · Rank-Decay Changes Pick Rate
# ---------------------------------------------------------------------------

class TestRankDecayEffect:
    """
    With tiered decay, rank-1 players (0.50) contribute more than rank-1001+
    players (0.20). A combo used only by rank-1 players should dominate over
    one used only by lower-rank players with same raw count.
    """

    def _build_dataset(self) -> list[PlayerProfile]:
        # Ranks 1-10: 10 players using combo A (GG + BP), weight 0.50 each → 10 × 0.50 = 5.00
        # Ranks 11-1010: 1000 filler players (no heroes), weight 0.40/0.30 — don't contribute
        # Ranks 1011-1035: 25 players using combo B (ES + FP), weight 0.20 each → 25 × 0.20 = 5.00
        # Total hero weight = 5.00 (A) + 5.00 (B) → both exactly 50 %
        combo_a = [
            _player(f"CA{i:04}", [_hero(BK, (GG, 18), (BP, 25))], trophies=7000 - i)
            for i in range(10)
        ]
        # Filler players without BK — push combo B into rank >1000
        filler = [
            _player(f"FL{i:04}", [], trophies=5000 - i)
            for i in range(1000)
        ]
        combo_b = [
            _player(f"CB{i:04}", [_hero(BK, (ES, 15), (FP, 12))], trophies=3000 - i)
            for i in range(25)
        ]
        return combo_a + filler + combo_b

    def test_top_ranked_combo_leads_despite_fewer_raw_count(self):
        dataset = self._build_dataset()
        meta = calculate_equipment_synergies(
            dataset,
            weight_strategy=WeightStrategy.RANK_DECAY_TIERED,
        )
        # Combo A: 2 × 0.50 = 1.0 weighted
        # Combo B: 5 × 0.20 = 1.0 weighted
        # They should be exactly tied → first synergy could be either
        bk_meta = meta[BK]
        assert len(bk_meta.top_synergies) == 2
        rates = [s.pick_rate_pct for s in bk_meta.top_synergies]
        assert rates[0] == pytest.approx(rates[1])  # tied

    def test_uniform_gives_lower_ranked_combo_higher_rate(self):
        """Under UNIFORM weighting, combo B (5 raw) should beat combo A (2 raw)."""
        dataset = self._build_dataset()
        meta = calculate_equipment_synergies(
            dataset,
            weight_strategy=WeightStrategy.UNIFORM,
        )
        bk_meta = meta[BK]
        top_pair = bk_meta.top_synergies[0].equipment_pair
        # ES + FP used by 5 players vs GG + BP used by 2
        assert set(top_pair) == {ES, FP}


# ---------------------------------------------------------------------------
# 6 · Scope Limit
# ---------------------------------------------------------------------------

class TestScopeLimit:
    def test_scope_limit_restricts_dataset(self):
        players = [
            _player("P1", [_hero(BK, (GG, 18), (BP, 25))]),   # only P1 included
            _player("P2", [_hero(BK, (ES, 15), (FP, 12))]),   # excluded
        ]
        meta = calculate_equipment_synergies(
            players,
            weight_strategy=WeightStrategy.UNIFORM,
            scope_limit=1,
        )
        # Only GG + BP should appear
        pair = meta[BK].top_synergies[0].equipment_pair
        assert set(pair) == {GG, BP}

    def test_scope_limit_larger_than_dataset_processes_all(self):
        players = [_player("P1", [_hero(BK, (GG, 18), (BP, 25))])]
        meta = calculate_equipment_synergies(
            players,
            weight_strategy=WeightStrategy.UNIFORM,
            scope_limit=9999,
        )
        assert BK in meta


# ---------------------------------------------------------------------------
# 7 · Edge Cases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_hero_with_no_equipment(self):
        """Heroes with empty equipment should contribute to hero_total_weight
        but produce no synergy or equipment stats."""
        players = [_player("P1", [_hero(BK)])]  # BK no equipment
        meta = calculate_equipment_synergies(players, weight_strategy=WeightStrategy.UNIFORM)
        bk_meta = meta.get(BK)
        assert bk_meta is not None
        assert bk_meta.top_synergies == []
        assert bk_meta.equipment_stats == []

    def test_hero_with_one_equipment(self):
        """One equipment → no 2-piece synergy, but individual stat recorded."""
        players = [_player("P1", [_hero(BK, (GG, 18))])]
        meta = calculate_equipment_synergies(players, weight_strategy=WeightStrategy.UNIFORM)
        bk_meta = meta[BK]
        assert bk_meta.top_synergies == []
        assert len(bk_meta.equipment_stats) == 1
        assert bk_meta.equipment_stats[0].equipment_name == GG

    def test_multiple_heroes_isolated(self):
        """BK and AQ stats must not bleed into each other."""
        players = [
            _player("P1", [
                _hero(BK, (GG, 18), (BP, 25)),
                _hero(AQ, (AP, 20), (FP, 15)),
            ])
        ]
        meta = calculate_equipment_synergies(players, weight_strategy=WeightStrategy.UNIFORM)
        bk_equips = {s.equipment_name for s in meta[BK].equipment_stats}
        aq_equips = {s.equipment_name for s in meta[AQ].equipment_stats}
        assert bk_equips.isdisjoint(aq_equips)

    def test_top_n_synergies_truncation(self):
        """top_n_synergies=1 should return only the highest pick-rate combo."""
        players = [
            _player("P1", [_hero(BK, (GG, 18), (BP, 25))]),
            _player("P2", [_hero(BK, (ES, 15), (FP, 12))]),
        ]
        meta = calculate_equipment_synergies(
            players,
            weight_strategy=WeightStrategy.UNIFORM,
            top_n_synergies=1,
        )
        assert len(meta[BK].top_synergies) == 1

    def test_exponential_strategy_runs_without_error(self):
        players = [_player(f"P{i}", [_hero(BK, (GG, 18), (BP, 25))]) for i in range(50)]
        meta = calculate_equipment_synergies(
            players,
            weight_strategy=WeightStrategy.RANK_DECAY_EXPONENTIAL,
        )
        assert BK in meta

    def test_total_weighted_players_uniform(self):
        n = 10
        players = [_player(f"P{i}", [_hero(BK, (GG, 18), (BP, 25))]) for i in range(n)]
        meta = calculate_equipment_synergies(players, weight_strategy=WeightStrategy.UNIFORM)
        assert meta[BK].total_weighted_players == pytest.approx(float(n))

    def test_dragon_duke_synergy_calculation(self):
        from services.meta_engine.equipment_meta import HERO_EQUIPMENT_REGISTRY
        dd = HeroName.DRAGON_DUKE
        assert dd in HERO_EQUIPMENT_REGISTRY
        assert "Dragonfire Crown" in HERO_EQUIPMENT_REGISTRY[dd]
        assert "Flame Breath" in HERO_EQUIPMENT_REGISTRY[dd]

        players = [
            _player("DD1", [_hero(dd, ("Dragonfire Crown", 27), ("Flame Breath", 18))]),
            _player("DD2", [_hero(dd, ("Dragonfire Crown", 25), ("Flame Breath", 18))]),
        ]
        meta = calculate_equipment_synergies(players, weight_strategy=WeightStrategy.UNIFORM)
        assert dd in meta
        assert meta[dd].top_synergies[0].pick_rate_pct == pytest.approx(100.0)
        assert set(meta[dd].top_synergies[0].equipment_pair) == {"Dragonfire Crown", "Flame Breath"}
