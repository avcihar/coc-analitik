"""
Unit & Spell Registry — CoC Internal ID → Metadata Lookup Tables
=================================================================
These tables are sourced from community-documented CoC army share link
format. IDs correspond to the game's internal ordering as observed from
live army share URLs.

IMPORTANT: Supercell may add new units between game updates. When a new
unit is released, append to the appropriate registry with its confirmed
internal ID. Do not renumber existing entries.

Housing space values are for home-village normal housing.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


# ---------------------------------------------------------------------------
# Data Classes
# ---------------------------------------------------------------------------

class UnitCategory(str, Enum):
    ELIXIR_TROOP  = "elixir_troop"
    DARK_TROOP    = "dark_troop"
    SUPER_TROOP   = "super_troop"
    ELIXIR_SPELL  = "elixir_spell"
    DARK_SPELL    = "dark_spell"
    SIEGE_MACHINE = "siege_machine"
    BUILDER_TROOP = "builder_troop"


@dataclass(frozen=True)
class UnitMeta:
    id: int
    name: str
    housing_space: int
    category: UnitCategory
    # For super troops: which normal troop ID they upgrade from
    super_of: int | None = None


@dataclass(frozen=True)
class SpellMeta:
    id: int
    name: str
    housing_space: int       # Spell housing (1 for most, 2 for some dark spells)
    category: UnitCategory


@dataclass(frozen=True)
class SiegeMeta:
    id: int
    name: str
    # Siege machines do not count against housing space in the link format
    housing_space: int = 0
    category: UnitCategory = field(default=UnitCategory.SIEGE_MACHINE)


@dataclass(frozen=True)
class ArmyCapacity:
    """Maximum army camp, spell factory, siege machine, and CC capacities for a Town Hall."""
    town_hall: int
    max_troop_housing: int
    max_spell_capacity: int
    max_siege_machines: int
    max_cc_troop_housing: int = 0
    max_cc_spell_capacity: int = 0
    max_active_heroes: int = 4


MIN_TOWN_HALL = 1
MAX_TOWN_HALL = 18

MAX_TROOP_HOUSING_SPACE = 340   # TH18 (4 × 85 camps)
MAX_SPELL_HOUSING_SPACE = 12    # TH18 spell factory + dark spell factory
MAX_SIEGE_MACHINES = 1


# ---------------------------------------------------------------------------
# Troop Registry  (u-prefix entries in army share links)
# ---------------------------------------------------------------------------
# IDs observed from live army share URLs (community-validated):
# https://link.clashofclans.com/en?action=CopyArmy&army=u{entries}s{entries}

TROOP_REGISTRY: dict[int, UnitMeta] = {
    # ── Elixir Troops ──────────────────────────────────────────────────────
    0:  UnitMeta(0,  "Barbarian",        1,  UnitCategory.ELIXIR_TROOP),
    1:  UnitMeta(1,  "Archer",           1,  UnitCategory.ELIXIR_TROOP),
    2:  UnitMeta(2,  "Goblin",           1,  UnitCategory.ELIXIR_TROOP),
    3:  UnitMeta(3,  "Giant",            5,  UnitCategory.ELIXIR_TROOP),
    4:  UnitMeta(4,  "Wall Breaker",     2,  UnitCategory.ELIXIR_TROOP),
    5:  UnitMeta(5,  "Balloon",          5,  UnitCategory.ELIXIR_TROOP),
    6:  UnitMeta(6,  "Wizard",           4,  UnitCategory.ELIXIR_TROOP),
    7:  UnitMeta(7,  "Healer",           14, UnitCategory.ELIXIR_TROOP),
    8:  UnitMeta(8,  "Dragon",           20, UnitCategory.ELIXIR_TROOP),
    9:  UnitMeta(9,  "P.E.K.K.A",        25, UnitCategory.ELIXIR_TROOP),
    13: UnitMeta(13, "Baby Dragon",      10, UnitCategory.ELIXIR_TROOP),
    14: UnitMeta(14, "Miner",            6,  UnitCategory.ELIXIR_TROOP),
    15: UnitMeta(15, "Electro Dragon",   30, UnitCategory.ELIXIR_TROOP),
    16: UnitMeta(16, "Yeti",             18, UnitCategory.ELIXIR_TROOP),
    17: UnitMeta(17, "Dragon Rider",     25, UnitCategory.ELIXIR_TROOP),
    18: UnitMeta(18, "Electro Titan",    32, UnitCategory.ELIXIR_TROOP),
    19: UnitMeta(19, "Root Rider",       15, UnitCategory.ELIXIR_TROOP),
    20: UnitMeta(20, "Thrower",          16, UnitCategory.ELIXIR_TROOP),

    # ── Dark Elixir Troops ─────────────────────────────────────────────────
    10: UnitMeta(10, "Minion",           2,  UnitCategory.DARK_TROOP),
    11: UnitMeta(11, "Hog Rider",        5,  UnitCategory.DARK_TROOP),
    12: UnitMeta(12, "Valkyrie",         8,  UnitCategory.DARK_TROOP),
    21: UnitMeta(21, "Golem",            30, UnitCategory.DARK_TROOP),
    22: UnitMeta(22, "Witch",            12, UnitCategory.DARK_TROOP),
    23: UnitMeta(23, "Lava Hound",       30, UnitCategory.DARK_TROOP),
    24: UnitMeta(24, "Bowler",           6,  UnitCategory.DARK_TROOP),
    25: UnitMeta(25, "Ice Golem",        15, UnitCategory.DARK_TROOP),
    26: UnitMeta(26, "Head Hunter",      6,  UnitCategory.DARK_TROOP),
    27: UnitMeta(27, "Apprentice Warden",8,  UnitCategory.DARK_TROOP),
    28: UnitMeta(28, "Druid",            16, UnitCategory.DARK_TROOP),
    29: UnitMeta(29, "Furnace",          20, UnitCategory.DARK_TROOP),

    # ── Super Troops (activated from normal troop) ─────────────────────────
    50: UnitMeta(50, "Super Barbarian",   5,  UnitCategory.SUPER_TROOP, super_of=0),
    51: UnitMeta(51, "Super Archer",      12, UnitCategory.SUPER_TROOP, super_of=1),
    52: UnitMeta(52, "Super Giant",       10, UnitCategory.SUPER_TROOP, super_of=3),
    53: UnitMeta(53, "Sneaky Goblin",     2,  UnitCategory.SUPER_TROOP, super_of=2),
    54: UnitMeta(54, "Super Wall Breaker",8,  UnitCategory.SUPER_TROOP, super_of=4),
    55: UnitMeta(55, "Rocket Balloon",    5,  UnitCategory.ELIXIR_TROOP),
    56: UnitMeta(56, "Inferno Dragon",    10, UnitCategory.SUPER_TROOP, super_of=13),
    57: UnitMeta(57, "Super Witch",       28, UnitCategory.SUPER_TROOP, super_of=22),
    58: UnitMeta(58, "Ice Hound",         30, UnitCategory.SUPER_TROOP, super_of=23),
    59: UnitMeta(59, "Super Bowler",      10, UnitCategory.SUPER_TROOP, super_of=24),
    60: UnitMeta(60, "Super Dragon",      20, UnitCategory.SUPER_TROOP, super_of=8),
    61: UnitMeta(61, "Electro Owl",       30, UnitCategory.SUPER_TROOP, super_of=15),
    62: UnitMeta(62, "Super Minion",      2,  UnitCategory.SUPER_TROOP, super_of=10),
    63: UnitMeta(63, "Super Hog Rider",   11, UnitCategory.SUPER_TROOP, super_of=11),
    64: UnitMeta(64, "Super Miner",       6,  UnitCategory.SUPER_TROOP, super_of=14),
    65: UnitMeta(65, "Super P.E.K.K.A",   25, UnitCategory.SUPER_TROOP, super_of=9),
    66: UnitMeta(66, "Super Yeti",        35, UnitCategory.SUPER_TROOP, super_of=16),
}

# ---------------------------------------------------------------------------
# Spell Registry  (s-prefix entries in army share links)
# ---------------------------------------------------------------------------

SPELL_REGISTRY: dict[int, SpellMeta] = {
    # ── Elixir Spells ──────────────────────────────────────────────────────
    0:  SpellMeta(0,  "Lightning Spell",    1, UnitCategory.ELIXIR_SPELL),
    1:  SpellMeta(1,  "Healing Spell",      1, UnitCategory.ELIXIR_SPELL),
    2:  SpellMeta(2,  "Rage Spell",         1, UnitCategory.ELIXIR_SPELL),
    3:  SpellMeta(3,  "Freeze Spell",       1, UnitCategory.ELIXIR_SPELL),
    8:  SpellMeta(8,  "Earthquake Spell",   1, UnitCategory.ELIXIR_SPELL),
    9:  SpellMeta(9,  "Haste Spell",        1, UnitCategory.ELIXIR_SPELL),
    10: SpellMeta(10, "Clone Spell",        3, UnitCategory.ELIXIR_SPELL),
    11: SpellMeta(11, "Invisibility Spell", 1, UnitCategory.ELIXIR_SPELL),
    12: SpellMeta(12, "Recall Spell",       2, UnitCategory.ELIXIR_SPELL),
    13: SpellMeta(13, "Overgrowth Spell",   2, UnitCategory.ELIXIR_SPELL),
    15: SpellMeta(15, "Revive Spell",       2, UnitCategory.ELIXIR_SPELL),

    # ── Dark Elixir Spells ─────────────────────────────────────────────────
    4:  SpellMeta(4,  "Poison Spell",       1, UnitCategory.DARK_SPELL),
    5:  SpellMeta(5,  "Earthquake Spell",   1, UnitCategory.DARK_SPELL),  # dark variant
    6:  SpellMeta(6,  "Haste Spell",        1, UnitCategory.DARK_SPELL),  # dark variant
    7:  SpellMeta(7,  "Bat Spell",          1, UnitCategory.DARK_SPELL),
    14: SpellMeta(14, "Skeleton Spell",     1, UnitCategory.DARK_SPELL),
    16: SpellMeta(16, "Frostbite Spell",    1, UnitCategory.DARK_SPELL),
}

# ---------------------------------------------------------------------------
# Siege Machine Registry  (e-prefix in newer link versions; or appended to u)
# ---------------------------------------------------------------------------

SIEGE_REGISTRY: dict[int, SiegeMeta] = {
    0: SiegeMeta(0, "Wall Wrecker"),
    1: SiegeMeta(1, "Battle Blimp"),
    2: SiegeMeta(2, "Stone Slammer"),
    3: SiegeMeta(3, "Siege Barracks"),
    4: SiegeMeta(4, "Log Launcher"),
    5: SiegeMeta(5, "Flame Flinger"),
    6: SiegeMeta(6, "Battle Drill"),
    7: SiegeMeta(7, "Troop Launcher"),
    8: SiegeMeta(8, "Shield Ram"),
}

# ---------------------------------------------------------------------------
# Town Hall Army Capacity Registry (TH1–TH18)
# ---------------------------------------------------------------------------

ARMY_CAPACITY_BY_TH: dict[int, ArmyCapacity] = {
    1:  ArmyCapacity(1,  20,  0,  0,  0,  0, 0),
    2:  ArmyCapacity(2,  30,  0,  0, 10,  0, 0),
    3:  ArmyCapacity(3,  70,  0,  0, 10,  0, 0),
    4:  ArmyCapacity(4,  80,  0,  0, 15,  0, 0),
    5:  ArmyCapacity(5,  135, 2,  0, 15,  0, 0),
    6:  ArmyCapacity(6,  150, 4,  0, 20,  0, 0),
    7:  ArmyCapacity(7,  200, 6,  0, 20,  0, 1),
    8:  ArmyCapacity(8,  200, 7,  0, 25,  1, 2),
    9:  ArmyCapacity(9,  220, 9,  0, 30,  1, 2),
    10: ArmyCapacity(10, 240, 11, 1, 35,  1, 2),
    11: ArmyCapacity(11, 260, 11, 1, 35,  2, 3),
    12: ArmyCapacity(12, 280, 11, 1, 40,  2, 3),
    13: ArmyCapacity(13, 300, 11, 1, 45,  2, 4),
    14: ArmyCapacity(14, 300, 11, 1, 45,  2, 4),
    15: ArmyCapacity(15, 320, 11, 1, 50,  3, 4),
    16: ArmyCapacity(16, 320, 11, 1, 50,  3, 4),
    17: ArmyCapacity(17, 320, 11, 1, 55,  3, 4),
    18: ArmyCapacity(18, 340, 12, 1, 55,  3, 4),
}

# ---------------------------------------------------------------------------
# Convenience look-up helpers
# ---------------------------------------------------------------------------

def lookup_troop(unit_id: int) -> UnitMeta | None:
    return TROOP_REGISTRY.get(unit_id)


def lookup_spell(spell_id: int) -> SpellMeta | None:
    return SPELL_REGISTRY.get(spell_id)


def lookup_siege(siege_id: int) -> SiegeMeta | None:
    return SIEGE_REGISTRY.get(siege_id)


def lookup_army_capacity(town_hall: int = MAX_TOWN_HALL) -> ArmyCapacity:
    """Return the ArmyCapacity for a given Town Hall (1–18)."""
    if town_hall < MIN_TOWN_HALL or town_hall > MAX_TOWN_HALL:
        raise ValueError(
            f"Invalid Town Hall level {town_hall}. Valid range: {MIN_TOWN_HALL}–{MAX_TOWN_HALL}."
        )
    return ARMY_CAPACITY_BY_TH[town_hall]
