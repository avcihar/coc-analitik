"""
Army Inference & Prediction Engine (Ordu Çıkarım ve Tahmin Motoru)
==================================================================
Since the official Clash of Clans API does not expose army share links or
exact troop compositions inside battle logs, this engine infers a player's
most probable primary war army composition from their live `/players/{tag}`
profile signals:

  1. Town Hall Level (TH1–TH18) and corresponding camp/spell/siege capacities.
  2. Active Equipped Hero Equipment combinations (Common & Epic synergies,
     e.g., Warden Fireball, Giant Gauntlet + Spiky Ball, Electro Boots +
     Rocket Spear, Magic Mirror + Frozen Arrow, Giant Arrow + Healer Puppet,
     Minion Prince Dark Orb + Dark Crown, Hog Rider Puppet + Haste Vial,
     Lavaloon Puppet).
  3. Currently boosted Active Super Troops (`superTroopIsActive: true`),
     which require 25,000 Dark Elixir / Super Potion and strongly reveal the
     player's active war strategy.
  4. Unlocked & max-level / high-level Troops, Spells, and Siege Machines in
     the player's laboratory.

Generates a validated in-game CopyArmy URL (`https://link.clashofclans.com/...`)
and a fully structured `ParsedArmy` via `services.army_parser.parser`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from schemas.pydantic.coc_models import (
    HeroEquipmentSlot,
    HeroName,
    MAX_TOWN_HALL_LEVEL,
    ParsedArmy,
    PetName,
    SiegeMachine,
    SpellSlot,
    TroopSlot,
)
from services.army_parser.parser import (
    ParseResult,
    build_army_link,
    parse_army_link,
)
from services.army_parser.unit_registry import (
    SIEGE_REGISTRY,
    SPELL_REGISTRY,
    TROOP_REGISTRY,
    lookup_army_capacity,
    lookup_siege,
    lookup_spell,
    lookup_troop,
)
from services.ore_engine.cost_tables import (
    HERO_MAX_LEVEL_BY_TH,
    PET_MAX_LEVEL_BY_TH,
    Rarity,
)

# Canonical Hero -> Equipment -> Rarity map (TH18 Meta)
EQUIPMENT_BY_HERO: Dict[str, Dict[str, Rarity]] = {
    "Barbarian King": {
        "Barbarian Puppet": Rarity.COMMON,
        "Rage Vial": Rarity.COMMON,
        "Earthquake Boots": Rarity.COMMON,
        "Vampstache": Rarity.COMMON,
        "Giant Gauntlet": Rarity.EPIC,
        "Spiky Ball": Rarity.EPIC,
        "Snake Bracelet": Rarity.EPIC,
        "Stick Horse": Rarity.EPIC,
    },
    "Archer Queen": {
        "Archer Puppet": Rarity.COMMON,
        "Invisibility Vial": Rarity.COMMON,
        "Giant Arrow": Rarity.COMMON,
        "Healer Puppet": Rarity.COMMON,
        "Frozen Arrow": Rarity.EPIC,
        "Magic Mirror": Rarity.EPIC,
        "Action Figure": Rarity.EPIC,
        "Monolith Arrow": Rarity.COMMON,
    },
    "Minion Prince": {
        "Henchmen Puppet": Rarity.COMMON,
        "Dark Orb": Rarity.COMMON,
        "Metal Pants": Rarity.COMMON,
        "Noble Iron": Rarity.COMMON,
        "Dark Crown": Rarity.EPIC,
        "Meteor Staff": Rarity.EPIC,
        "Portal Pendant": Rarity.EPIC,
    },
    "Grand Warden": {
        "Eternal Tome": Rarity.COMMON,
        "Life Gem": Rarity.COMMON,
        "Rage Gem": Rarity.COMMON,
        "Healing Tome": Rarity.COMMON,
        "Fireball": Rarity.EPIC,
        "Heroic Torch": Rarity.EPIC,
        "Lavaloon Puppet": Rarity.EPIC,
    },
    "Royal Champion": {
        "Royal Gem": Rarity.COMMON,
        "Seeking Shield": Rarity.COMMON,
        "Hog Rider Puppet": Rarity.COMMON,
        "Haste Vial": Rarity.COMMON,
        "Rocket Spear": Rarity.EPIC,
        "Electro Boots": Rarity.EPIC,
        "Frost Flake": Rarity.EPIC,
    },
    "Dragon Duke": {
        "Fire Heart": Rarity.COMMON,
        "Flame Blower": Rarity.COMMON,
        "Stun Blaster": Rarity.COMMON,
        "Electro Fangs": Rarity.EPIC,
        "Revenge Deck": Rarity.EPIC,
        "Rocket Backpack": Rarity.EPIC,
    },
}

# ---------------------------------------------------------------------------
# Lookup Tables by Name
# ---------------------------------------------------------------------------

TROOP_NAME_TO_ID: Dict[str, int] = {
    meta.name.lower(): unit_id for unit_id, meta in TROOP_REGISTRY.items()
}
# Handle common naming aliases in CoC API ("Headhunter" vs "Head Hunter")
TROOP_NAME_TO_ID["headhunter"] = 26
TROOP_NAME_TO_ID["pekka"] = 9

SPELL_NAME_TO_ID: Dict[str, int] = {
    meta.name.lower(): spell_id for spell_id, meta in SPELL_REGISTRY.items()
}
for _sid, _smeta in list(SPELL_REGISTRY.items()):
    if _smeta.name.lower().endswith(" spell"):
        _short = _smeta.name.lower()[: -len(" spell")].strip()
        SPELL_NAME_TO_ID.setdefault(_short, _sid)

SIEGE_NAME_TO_ID: Dict[str, int] = {
    meta.name.lower(): siege_id for siege_id, meta in SIEGE_REGISTRY.items()
}

KNOWN_PET_NAMES: set[str] = {
    "L.A.S.S.I",
    "Mighty Yak",
    "Electro Owl",
    "Unicorn",
    "Frosty",
    "Diggy",
    "Poison Lizard",
    "Phoenix",
    "Spirit Fox",
    "Angry Jelly",
    "Sneezy",
    "Greedy Raven",
}
KNOWN_HERO_NAMES: set[str] = {h.value for h in HeroName}

# Map each equipment item name -> (HeroName, Rarity)
EQUIPMENT_TO_HERO_AND_RARITY: Dict[str, Tuple[str, str]] = {}
for _hero_name, _eq_dict in EQUIPMENT_BY_HERO.items():
    for _eq_name, _rarity in _eq_dict.items():
        EQUIPMENT_TO_HERO_AND_RARITY[_eq_name.lower()] = (_hero_name, _rarity.value)


# ---------------------------------------------------------------------------
# Meta Army Archetype Definitions (TH1–TH18)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ArchetypeTemplate:
    key: str
    name: str
    min_th: int
    max_th: int
    # Ordered list of (count, troop_id) for TH18 (340 space); auto-scaled to target TH
    base_troops: Tuple[Tuple[int, int], ...]
    # Ordered list of (count, spell_id) for TH18 (12 space); auto-scaled to target TH
    base_spells: Tuple[Tuple[int, int], ...]
    preferred_siege_id: int
    fallback_siege_id: int
    cc_recommendations: Tuple[Tuple[str, int], ...]
    # Scoring triggers
    trigger_super_troop_ids: Tuple[int, ...] = ()
    trigger_equipment_names: Tuple[str, ...] = ()
    core_troop_ids: Tuple[int, ...] = ()
    core_spell_ids: Tuple[int, ...] = ()
    base_priority: float = 10.0


META_ARCHETYPES: Tuple[ArchetypeTemplate, ...] = (
    # 1. TH16–TH18 Root Rider + Valkyrie + Thrower Smash (Dominant Ground Meta)
    ArchetypeTemplate(
        key="root_rider_valk_smash",
        name="Root Rider + Valkyrie + Thrower Smash",
        min_th=15,
        max_th=18,
        # 10x19 (Root Rider=150) + 12x12 (Valkyrie=96) + 2x20 (Thrower=32) +
        # 2x28 (Druid=32) + 2x26 (Head Hunter=12) + 1x27 (Apprentice Warden=8) + 2x6 (Wizard=8) + 2x1 (Archer=2) = 340
        base_troops=((10, 19), (12, 12), (2, 20), (2, 28), (2, 26), (1, 27), (2, 6), (2, 1)),
        # 1x15 (Revive=2) + 1x13 (Overgrowth=2) + 2x2 (Rage=2) + 4x3 (Freeze=4) + 2x4 (Poison=2) = 12
        base_spells=((1, 15), (1, 13), (2, 2), (4, 3), (2, 4)),
        preferred_siege_id=7,   # Troop Launcher
        fallback_siege_id=3,    # Siege Barracks
        cc_recommendations=(("Ice Golem", 3), ("Rage Spell", 1), ("Poison Spell", 1)),
        trigger_super_troop_ids=(50, 54),  # Super Barbarian / Super Wall Breaker
        trigger_equipment_names=(
            "Giant Gauntlet",
            "Spiky Ball",
            "Earthquake Boots",
            "Electro Boots",
            "Healing Tome",
            "Eternal Tome",
            "Magic Mirror",
        ),
        core_troop_ids=(19, 12, 20, 28, 26),
        core_spell_ids=(13, 15, 2, 3),
        base_priority=28.0,
    ),
    # 2. TH13–TH18 Hydra + Super Archer Blimp (Dragon + Dragon Rider + SArch Blimp)
    ArchetypeTemplate(
        key="hydra_sarch_blimp",
        name="Hydra (Dragon + Dragon Rider) + Super Archer Blimp",
        min_th=13,
        max_th=18,
        # 9x8 (Dragon=180) + 4x17 (Dragon Rider=100) + 10x5 (Balloon=50) + 1x13 (Baby Dragon=10) = 340
        base_troops=((9, 8), (4, 17), (10, 5), (1, 13)),
        # 2x10 (Clone=6) + 4x11 (Invisibility=4) + 1x2 (Rage=1) + 1x3 (Freeze=1) = 12
        base_spells=((2, 10), (4, 11), (1, 2), (1, 3)),
        preferred_siege_id=1,   # Battle Blimp
        fallback_siege_id=2,    # Stone Slammer
        cc_recommendations=(("Super Archer", 3), ("Super Wall Breaker", 1), ("Invisibility Spell", 2)),
        trigger_super_troop_ids=(51,),  # Super Archer
        trigger_equipment_names=(
            "Giant Arrow",
            "Healer Puppet",
            "Dark Orb",
            "Dark Crown",
            "Eternal Tome",
            "Rocket Spear",
        ),
        core_troop_ids=(8, 17, 5, 51),
        core_spell_ids=(10, 11, 2, 3),
        base_priority=24.0,
    ),
    # 3. TH12–TH18 Warden Fireball + Super Witch / Druid Smash
    ArchetypeTemplate(
        key="warden_fireball_super_witch",
        name="Warden Fireball + Super Witch Smash",
        min_th=12,
        max_th=18,
        # 4x57 (Super Witch=112) + 5x7 (Healer=70) + 3x28 (Druid=48) + 2x20 (Thrower=32) +
        # 2x25 (Ice Golem=30) + 2x54 (Super Wall Breaker=16) + 2x26 (Head Hunter=12) +
        # 1x27 (Apprentice Warden=8) + 2x6 (Wizard=8) + 4x1 (Archer=4) = 340
        base_troops=((4, 57), (5, 7), (3, 28), (2, 20), (2, 25), (2, 54), (2, 26), (1, 27), (2, 6), (4, 1)),
        # 2x8 (Earthquake=2) + 1x13 (Overgrowth=2) + 2x2 (Rage=2) + 3x11 (Invisibility=3) + 3x3 (Freeze=3) = 12
        base_spells=((2, 8), (1, 13), (2, 2), (3, 11), (3, 3)),
        preferred_siege_id=5,   # Flame Flinger
        fallback_siege_id=3,    # Siege Barracks
        cc_recommendations=(("Yeti", 2), ("Ice Golem", 1), ("Rage Spell", 1)),
        trigger_super_troop_ids=(57,),  # Super Witch
        trigger_equipment_names=(
            "Fireball",
            "Rage Gem",
            "Magic Mirror",
            "Spiky Ball",
            "Electro Boots",
        ),
        core_troop_ids=(57, 7, 28, 22),
        core_spell_ids=(8, 11, 2, 13),
        base_priority=23.0,
    ),
    # 4. TH12–TH18 Warden Fireball + Rocket Balloon Surgical
    ArchetypeTemplate(
        key="warden_fireball_rocket_loon",
        name="Warden Fireball + Rocket Balloon Surgical",
        min_th=12,
        max_th=18,
        # 28x55 (Rocket Balloon=140) + 5x7 (Healer=70) + 2x25 (Ice Golem=30) +
        # 2x13 (Baby Dragon=20) + 3x54 (Super Wall Breaker=24) + 3x26 (Head Hunter=18) +
        # 1x27 (Apprentice Warden=8) + 10x10 (Minion=20) + 10x1 (Archer=10) = 340
        base_troops=((28, 55), (5, 7), (2, 25), (2, 13), (3, 54), (3, 26), (1, 27), (10, 10), (10, 1)),
        # 2x8 (Earthquake=2) + 1x13 (Overgrowth=2) + 3x11 (Invisibility=3) + 2x2 (Rage=2) + 3x3 (Freeze=3) = 12
        base_spells=((2, 8), (1, 13), (3, 11), (2, 2), (3, 3)),
        preferred_siege_id=5,   # Flame Flinger
        fallback_siege_id=1,    # Battle Blimp
        cc_recommendations=(("Rocket Balloon", 9), ("Dragon Rider", 1), ("Freeze Spell", 3)),
        trigger_super_troop_ids=(55,),  # Rocket Balloon
        trigger_equipment_names=("Fireball", "Giant Arrow", "Rocket Spear", "Eternal Tome"),
        core_troop_ids=(55, 7, 25, 26),
        core_spell_ids=(8, 11, 2, 3),
        base_priority=22.0,
    ),
    # 5. TH16–TH18 Super Yeti + Thrower + Furnace Smash
    ArchetypeTemplate(
        key="super_yeti_thrower_smash",
        name="Super Yeti + Thrower + Furnace Smash",
        min_th=16,
        max_th=18,
        # 4x66 (Super Yeti=140) + 4x20 (Thrower=64) + 2x29 (Furnace=40) +
        # 4x7 (Healer=56) + 2x28 (Druid=32) + 1x27 (Apprentice Warden=8) = 340
        base_troops=((4, 66), (4, 20), (2, 29), (4, 7), (2, 28), (1, 27)),
        # 1x15 (Revive=2) + 1x13 (Overgrowth=2) + 3x2 (Rage=3) + 4x3 (Freeze=4) + 1x4 (Poison=1) = 12
        base_spells=((1, 15), (1, 13), (3, 2), (4, 3), (1, 4)),
        preferred_siege_id=7,   # Troop Launcher
        fallback_siege_id=4,    # Log Launcher
        cc_recommendations=(("Yeti", 3), ("Rage Spell", 1), ("Freeze Spell", 1)),
        trigger_super_troop_ids=(66,),  # Super Yeti
        trigger_equipment_names=("Spiky Ball", "Magic Mirror", "Electro Boots", "Healing Tome"),
        core_troop_ids=(66, 20, 29, 16, 7),
        core_spell_ids=(15, 13, 2, 3),
        base_priority=21.0,
    ),
    # 6. TH12–TH18 Super Bowler Smash
    ArchetypeTemplate(
        key="super_bowler_smash",
        name="Super Bowler + Healer Smash",
        min_th=12,
        max_th=18,
        # 12x59 (Super Bowler=120) + 5x7 (Healer=70) + 2x18 (Electro Titan=64) +
        # 2x25 (Ice Golem=30) + 3x54 (Super Wall Breaker=24) + 2x26 (Head Hunter=12) +
        # 3x6 (Wizard=12) + 1x27 (Apprentice Warden=8) = 340
        base_troops=((12, 59), (5, 7), (2, 18), (2, 25), (3, 54), (2, 26), (3, 6), (1, 27)),
        # 1x13 (Overgrowth=2) + 3x2 (Rage=3) + 4x3 (Freeze=4) + 2x8 (Earthquake=2) + 1x4 (Poison=1) = 12
        base_spells=((1, 13), (3, 2), (4, 3), (2, 8), (1, 4)),
        preferred_siege_id=5,   # Flame Flinger
        fallback_siege_id=4,    # Log Launcher
        cc_recommendations=(("Yeti", 2), ("Ice Golem", 1), ("Rage Spell", 1)),
        trigger_super_troop_ids=(59,),  # Super Bowler
        trigger_equipment_names=("Giant Gauntlet", "Rage Gem", "Eternal Tome", "Frozen Arrow"),
        core_troop_ids=(59, 24, 7, 18),
        core_spell_ids=(2, 3, 13),
        base_priority=20.0,
    ),
    # 7. TH12–TH18 Queen Charge Super Hog Rider / Hybrid
    ArchetypeTemplate(
        key="qc_hybrid_super_hog",
        name="Queen Charge Super Hog Rider / Hybrid",
        min_th=11,
        max_th=18,
        # 14x63 (Super Hog=154) + 5x7 (Healer=70) + 6x14 (Miner=36) + 2x54 (Super Wall Breaker=16) +
        # 2x13 (Baby Dragon=20) + 2x26 (Head Hunter=12) + 1x27 (Apprentice Warden=8) +
        # 3x5 (Balloon=15) + 9x1 (Archer=9) = 340
        base_troops=((14, 63), (5, 7), (6, 14), (2, 54), (2, 13), (2, 26), (1, 27), (3, 5), (9, 1)),
        # 2x1 (Heal=2) + 3x2 (Rage=3) + 1x12 (Recall=2) + 4x3 (Freeze=4) + 1x4 (Poison=1) = 12
        base_spells=((2, 1), (3, 2), (1, 12), (4, 3), (1, 4)),
        preferred_siege_id=3,   # Siege Barracks
        fallback_siege_id=6,    # Battle Drill
        cc_recommendations=(("Hog Rider", 10), ("Rage Spell", 1), ("Freeze Spell", 1)),
        trigger_super_troop_ids=(63, 64),  # Super Hog Rider / Super Miner
        trigger_equipment_names=(
            "Hog Rider Puppet",
            "Haste Vial",
            "Frozen Arrow",
            "Healer Puppet",
            "Life Gem",
        ),
        core_troop_ids=(63, 11, 14, 7),
        core_spell_ids=(1, 2, 3, 12),
        base_priority=21.0,
    ),
    # 8. TH12–TH18 Super Dragon + Balloon Spam
    ArchetypeTemplate(
        key="super_dragon_spam",
        name="Super Dragon + Balloon Air Assault",
        min_th=12,
        max_th=18,
        # 12x60 (Super Dragon=240) + 18x5 (Balloon=90) + 1x13 (Baby Dragon=10) = 340
        base_troops=((12, 60), (18, 5), (1, 13)),
        # 1x13 (Overgrowth=2) + 3x2 (Rage=3) + 6x3 (Freeze=6) + 1x4 (Poison=1) = 12
        base_spells=((1, 13), (3, 2), (6, 3), (1, 4)),
        preferred_siege_id=2,   # Stone Slammer
        fallback_siege_id=1,    # Battle Blimp
        cc_recommendations=(("Balloon", 11), ("Rage Spell", 1), ("Freeze Spell", 1)),
        trigger_super_troop_ids=(60,),  # Super Dragon
        trigger_equipment_names=("Dark Orb", "Dark Crown", "Giant Arrow", "Eternal Tome"),
        core_troop_ids=(60, 8, 5),
        core_spell_ids=(2, 3),
        base_priority=20.0,
    ),
    # 9. TH9–TH18 Queen Charge LavaLoon (LaLo)
    ArchetypeTemplate(
        key="qc_lalo",
        name="Queen Charge LavaLoon (LaLo)",
        min_th=9,
        max_th=18,
        # 2x23 (Lava Hound=60) + 1x58 (Ice Hound=30) + 26x5 (Balloon=130) + 5x7 (Healer=70) +
        # 2x54 (Super Wall Breaker=16) + 2x26 (Head Hunter=12) + 11x10 (Minion=22) = 340
        base_troops=((2, 23), (1, 58), (26, 5), (5, 7), (2, 54), (2, 26), (11, 10)),
        # 3x2 (Rage=3) + 3x9 (Haste=3) + 5x3 (Freeze=5) + 1x4 (Poison=1) = 12
        base_spells=((3, 2), (3, 9), (5, 3), (1, 4)),
        preferred_siege_id=2,   # Stone Slammer
        fallback_siege_id=1,    # Battle Blimp
        cc_recommendations=(("Lava Hound", 1), ("Balloon", 5), ("Freeze Spell", 2)),
        trigger_super_troop_ids=(58,),  # Ice Hound
        trigger_equipment_names=("Lavaloon Puppet", "Frozen Arrow", "Dark Orb", "Haste Vial"),
        core_troop_ids=(23, 5, 7, 10),
        core_spell_ids=(2, 9, 3),
        base_priority=20.0,
    ),
    # 10. TH11–TH18 Electro Dragon + Balloon Surge
    ArchetypeTemplate(
        key="edrag_balloon_surge",
        name="Electro Dragon + Balloon Surge",
        min_th=11,
        max_th=18,
        # 9x15 (Electro Dragon=270) + 12x5 (Balloon=60) + 1x13 (Baby Dragon=10) = 340
        base_troops=((9, 15), (12, 5), (1, 13)),
        # 4x2 (Rage=4) + 7x3 (Freeze=7) + 1x4 (Poison=1) = 12
        base_spells=((4, 2), (7, 3), (1, 4)),
        preferred_siege_id=1,   # Battle Blimp
        fallback_siege_id=2,    # Stone Slammer
        cc_recommendations=(("Balloon", 11), ("Rage Spell", 1), ("Freeze Spell", 1)),
        trigger_super_troop_ids=(56,),  # Inferno Dragon
        trigger_equipment_names=("Eternal Tome", "Rage Gem", "Giant Arrow", "Dark Orb"),
        core_troop_ids=(15, 5),
        core_spell_ids=(2, 3),
        base_priority=19.0,
    ),
    # 11. TH7–TH18 Mass Dragon + Minion Prince Air
    ArchetypeTemplate(
        key="mass_dragon_air",
        name="Mass Dragon + Balloon Air Raid",
        min_th=7,
        max_th=18,
        # 13x8 (Dragon=260) + 14x5 (Balloon=70) + 5x10 (Minion=10) = 340
        base_troops=((13, 8), (14, 5), (5, 10)),
        # 6x0 (Lightning=6) + 3x2 (Rage=3) + 3x3 (Freeze=3) = 12
        base_spells=((6, 0), (3, 2), (3, 3)),
        preferred_siege_id=2,   # Stone Slammer
        fallback_siege_id=1,    # Battle Blimp
        cc_recommendations=(("Dragon", 2), ("Balloon", 3), ("Rage Spell", 1)),
        trigger_super_troop_ids=(),
        trigger_equipment_names=("Giant Arrow", "Dark Orb", "Dark Crown", "Henchman Puppet"),
        core_troop_ids=(8, 5),
        core_spell_ids=(0, 2, 3),
        base_priority=18.0,
    ),
    # 12. TH1–TH8 Giant + Wizard + Balloon Classic Ground
    ArchetypeTemplate(
        key="classic_giant_wizard",
        name="Giant + Wizard + Breaker Strike",
        min_th=1,
        max_th=10,
        base_troops=((20, 3), (30, 6), (10, 4), (50, 1), (50, 0)),
        base_spells=((4, 1), (4, 2), (4, 0)),
        preferred_siege_id=0,
        fallback_siege_id=0,
        cc_recommendations=(("Hog Rider", 4), ("Healing Spell", 1)),
        trigger_super_troop_ids=(),
        trigger_equipment_names=("Barbarian Puppet", "Archer Puppet"),
        core_troop_ids=(3, 6, 4, 1, 0),
        core_spell_ids=(1, 2),
        base_priority=12.0,
    ),
)

# Best-fit pet assignments per Hero for TH14–TH18 scouting display
PREFERRED_PETS_BY_HERO: Dict[str, Tuple[str, ...]] = {
    "Barbarian King": ("Phoenix", "Frosty", "Mighty Yak", "Angry Jelly", "L.A.S.S.I"),
    "Archer Queen": ("Unicorn", "Frosty", "Frost Hound", "Poison Lizard", "Electro Owl"),
    "Minion Prince": ("Angry Jelly", "Electro Owl", "Phoenix", "Poison Lizard", "Sneezy"),
    "Grand Warden": ("Sneezy", "Electro Owl", "Diggy", "Frosty", "Unicorn"),
    "Royal Champion": ("Spirit Fox", "Diggy", "Phoenix", "Frost Hound", "L.A.S.S.I"),
    "Dragon Duke": ("Phoenix", "Electro Owl", "Angry Jelly", "Spirit Fox", "Sneezy"),
}


@dataclass
class InferredArmyResult:
    """Output of the Army Inference Engine for a single scouted player."""
    archetype_key: str
    archetype_name: str
    confidence_score: float
    inference_reasons: List[str]
    army_link: str
    parsed_army: ParsedArmy
    town_hall_level: int
    active_super_troops: List[str] = field(default_factory=list)
    active_equipment: List[Dict[str, Any]] = field(default_factory=list)
    heroes_detailed: List[Dict[str, Any]] = field(default_factory=list)
    clan_castle: List[Dict[str, Any]] = field(default_factory=list)
    army_source: str = "profile_inference"
    battlelog_attacks: List[Dict[str, Any]] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Signal Extraction Helpers
# ---------------------------------------------------------------------------

def _extract_active_super_troops(raw_player: Dict[str, Any]) -> Tuple[List[str], set[int]]:
    """
    Extract currently active Super Troops from `/players/{tag}`.
    Checks both `troops` items with `superTroopIsActive=True` and optional
    `superTroops` list.
    """
    active_names: List[str] = []
    active_ids: set[int] = set()

    for t in raw_player.get("troops", []) or []:
        if t.get("superTroopIsActive"):
            name = str(t.get("name", "")).strip()
            if name and name not in active_names:
                active_names.append(name)
            tid = TROOP_NAME_TO_ID.get(name.lower())
            if tid is not None:
                active_ids.add(tid)

    for st in raw_player.get("superTroops", []) or []:
        if isinstance(st, str):
            name = st.strip()
            is_active = True
        else:
            name = str(st.get("name", "")).strip()
            is_active = bool(st.get("isActive", st.get("superTroopIsActive", True)))
        if is_active and name:
            if name not in active_names:
                active_names.append(name)
            tid = TROOP_NAME_TO_ID.get(name.lower())
            if tid is not None:
                active_ids.add(tid)

    return active_names, active_ids


def _extract_heroes_and_equipment(
    raw_player: Dict[str, Any],
    th_level: int,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], set[str]]:
    """
    Extract home-village heroes, their actively equipped equipment (or top-2
    unlocked fallback per hero), and matched pets.
    """
    th_hero_caps = HERO_MAX_LEVEL_BY_TH.get(th_level, {})
    th_pet_cap = PET_MAX_LEVEL_BY_TH.get(th_level, 0)

    # Collect unlocked equipment from top-level `heroEquipment`
    unlocked_by_hero: Dict[str, List[Dict[str, Any]]] = {}
    for eq in raw_player.get("heroEquipment", []) or []:
        if eq.get("village", "home") != "home":
            continue
        eq_name = str(eq.get("name", "")).strip()
        if not eq_name:
            continue
        hero_owner, known_rarity = EQUIPMENT_TO_HERO_AND_RARITY.get(
            eq_name.lower(), ("", "")
        )
        max_lvl = int(eq.get("maxLevel", 27 if known_rarity == "Epic" else 18))
        rarity = known_rarity or ("Epic" if max_lvl > 18 else "Common")
        entry = {
            "name": eq_name,
            "level": int(eq.get("level", 1)),
            "maxLevel": max_lvl,
            "rarity": rarity,
            "isEpic": rarity == "Epic",
        }
        if hero_owner:
            unlocked_by_hero.setdefault(hero_owner, []).append(entry)

    # Sort unlocked equipment per hero by (isEpic, level) descending for fallback
    for h_name in unlocked_by_hero:
        unlocked_by_hero[h_name].sort(
            key=lambda x: (x["level"], 1 if x["isEpic"] else 0),
            reverse=True,
        )

    # Collect available pets from `pets` and `troops`
    available_pets: Dict[str, Dict[str, Any]] = {}
    for p in (raw_player.get("pets", []) or []) + (raw_player.get("troops", []) or []):
        p_name = str(p.get("name", "")).strip()
        if p_name in KNOWN_PET_NAMES:
            available_pets[p_name] = {
                "name": p_name,
                "level": int(p.get("level", 1)),
                "maxLevel": int(p.get("maxLevel", th_pet_cap or 20)),
            }

    assigned_pets: set[str] = set()
    heroes_detailed: List[Dict[str, Any]] = []
    active_equipment_flat: List[Dict[str, Any]] = []
    equipped_names_lower: set[str] = set()

    for h in raw_player.get("heroes", []) or []:
        h_name = str(h.get("name", "")).strip()
        if h.get("village", "home") != "home" and h_name not in KNOWN_HERO_NAMES:
            continue
        if h_name not in KNOWN_HERO_NAMES:
            continue

        raw_eq_list = h.get("equipment") or []
        hero_eqs: List[Dict[str, Any]] = []
        if raw_eq_list:
            for eq in raw_eq_list[:2]:
                eq_name = str(eq.get("name", "")).strip()
                _, known_rarity = EQUIPMENT_TO_HERO_AND_RARITY.get(
                    eq_name.lower(), (h_name, "")
                )
                max_lvl = int(eq.get("maxLevel", 27 if known_rarity == "Epic" else 18))
                rarity = str(eq.get("rarity") or known_rarity or ("Epic" if max_lvl > 18 else "Common")).capitalize()
                eq_item = {
                    "name": eq_name,
                    "level": int(eq.get("level", 1)),
                    "maxLevel": max_lvl,
                    "rarity": rarity,
                    "isEpic": rarity == "Epic",
                }
                hero_eqs.append(eq_item)
        else:
            # Fallback to top-2 highest-level unlocked equipment for this hero
            hero_eqs = unlocked_by_hero.get(h_name, [])[:2]

        for eq_item in hero_eqs:
            equipped_names_lower.add(eq_item["name"].lower())
            active_equipment_flat.append({"hero": h_name, **eq_item})

        # Assign best unlocked pet for this hero
        matched_pet: Optional[Dict[str, Any]] = None
        for pref_pet in PREFERRED_PETS_BY_HERO.get(h_name, ()):
            if pref_pet in available_pets and pref_pet not in assigned_pets:
                matched_pet = available_pets[pref_pet]
                assigned_pets.add(pref_pet)
                break
        if matched_pet is None:
            for p_name, p_obj in available_pets.items():
                if p_name not in assigned_pets:
                    matched_pet = p_obj
                    assigned_pets.add(p_name)
                    break

        heroes_detailed.append({
            "id": "".join(w[0].lower() for w in h_name.split()),
            "name": h_name,
            "level": int(h.get("level", 1)),
            "maxLevel": int(h.get("maxLevel", th_hero_caps.get(h_name, h.get("level", 1)))),
            "equipments": hero_eqs,
            "pet": matched_pet,
        })

    # Ensure all 6 Home Village heroes (including Dragon Duke & Minion Prince) are represented
    canonical_6_heroes: Tuple[Tuple[str, int, List[Dict[str, Any]]], ...] = (
        ("Barbarian King", 7, [
            {"name": "Spiky Ball", "level": 27, "maxLevel": 27, "rarity": "Epic", "isEpic": True},
            {"name": "Snake Bracelet", "level": 27, "maxLevel": 27, "rarity": "Epic", "isEpic": True},
        ]),
        ("Archer Queen", 9, [
            {"name": "Magic Mirror", "level": 27, "maxLevel": 27, "rarity": "Epic", "isEpic": True},
            {"name": "Frozen Arrow", "level": 27, "maxLevel": 27, "rarity": "Epic", "isEpic": True},
        ]),
        ("Minion Prince", 9, [
            {"name": "Dark Orb", "level": 18, "maxLevel": 18, "rarity": "Common", "isEpic": False},
            {"name": "Dark Crown", "level": 27, "maxLevel": 27, "rarity": "Epic", "isEpic": True},
        ]),
        ("Grand Warden", 11, [
            {"name": "Eternal Tome", "level": 18, "maxLevel": 18, "rarity": "Common", "isEpic": False},
            {"name": "Healing Tome", "level": 18, "maxLevel": 18, "rarity": "Common", "isEpic": False},
        ]),
        ("Royal Champion", 13, [
            {"name": "Electro Boots", "level": 27, "maxLevel": 27, "rarity": "Epic", "isEpic": True},
            {"name": "Rocket Spear", "level": 27, "maxLevel": 27, "rarity": "Epic", "isEpic": True},
        ]),
        ("Dragon Duke", 15, [
            {"name": "Electro Fangs", "level": 27, "maxLevel": 27, "rarity": "Epic", "isEpic": True},
            {"name": "Fire Heart", "level": 18, "maxLevel": 18, "rarity": "Common", "isEpic": False},
        ]),
    )
    existing_hero_names = {h["name"] for h in heroes_detailed}
    if heroes_detailed:
        for h_name, unlock_th, default_eqs in canonical_6_heroes:
            if h_name not in existing_hero_names and th_level >= unlock_th:
                max_cap = int(th_hero_caps.get(h_name, 50))
                fallback_eqs = unlocked_by_hero.get(h_name, [])[:2] or default_eqs
                heroes_detailed.append({
                    "id": "".join(w[0].lower() for w in h_name.split()),
                    "name": h_name,
                    "level": max_cap,
                    "maxLevel": max_cap,
                    "equipments": fallback_eqs,
                    "pet": None,
                })

    return heroes_detailed, active_equipment_flat, equipped_names_lower


def _extract_unit_levels(
    raw_player: Dict[str, Any],
) -> Tuple[Dict[int, Tuple[int, int]], Dict[int, Tuple[int, int]], Dict[int, Tuple[int, int]]]:
    """
    Map player's unlocked troops, spells, and siege machines to
    `{id: (level, maxLevel)}`.
    """
    troop_levels: Dict[int, Tuple[int, int]] = {}
    siege_levels: Dict[int, Tuple[int, int]] = {}
    spell_levels: Dict[int, Tuple[int, int]] = {}

    for t in raw_player.get("troops", []) or []:
        if t.get("village", "home") != "home":
            continue
        name_lower = str(t.get("name", "")).strip().lower()
        lvl = max(1, int(t.get("level", 1)))
        max_lvl = max(lvl, int(t.get("maxLevel", lvl)))

        if name_lower in SIEGE_NAME_TO_ID:
            sid = SIEGE_NAME_TO_ID[name_lower]
            siege_levels[sid] = (lvl, max_lvl)
        elif name_lower in TROOP_NAME_TO_ID:
            tid = TROOP_NAME_TO_ID[name_lower]
            troop_levels[tid] = (lvl, max_lvl)

    for s in raw_player.get("spells", []) or []:
        if s.get("village", "home") != "home":
            continue
        name_lower = str(s.get("name", "")).strip().lower()
        lvl = max(1, int(s.get("level", 1)))
        max_lvl = max(lvl, int(s.get("maxLevel", lvl)))
        if name_lower in SPELL_NAME_TO_ID:
            sp_id = SPELL_NAME_TO_ID[name_lower]
            spell_levels[sp_id] = (lvl, max_lvl)

    return troop_levels, spell_levels, siege_levels


# ---------------------------------------------------------------------------
# Capacity Fitting & Super Troop Substitution
# ---------------------------------------------------------------------------

def _fit_troops_to_capacity(
    base_troops: Tuple[Tuple[int, int], ...],
    max_housing: int,
    active_super_ids: set[int],
    troop_levels: Dict[int, Tuple[int, int]],
) -> List[Tuple[int, int]]:
    """
    Scale and fit an archetype's base troop composition so its total housing
    space equals `max_housing` (e.g., 340 at TH18, 320 at TH15–17, etc.),
    incorporating active utility Super Troops when boosted.
    """
    if max_housing <= 0:
        return []

    # 1. Substitute normal troops with active Super Troop equivalents if boosted
    # e.g., Wall Breaker (4) <-> Super Wall Breaker (54), Barbarian (0) <-> Super Barbarian (50)
    adjusted_base: List[Tuple[int, int]] = []
    for count, unit_id in base_troops:
        meta = lookup_troop(unit_id)
        if meta is None:
            continue
        # If template uses Super Wall Breaker (54) but player hasn't boosted it and has normal Wall Breaker
        if unit_id == 54 and 54 not in active_super_ids and 54 not in troop_levels and 4 in troop_levels:
            # Replace 1 Super WB (8 space) with 4 normal WBs (8 space)
            adjusted_base.append((count * 4, 4))
            continue
        # If template uses normal Wall Breaker (4) and player has active Super Wall Breaker (54)
        if unit_id == 4 and 54 in active_super_ids:
            swb_count = max(1, (count * 2) // 8)
            adjusted_base.append((swb_count, 54))
            continue
        adjusted_base.append((count, unit_id))

    # If player has Sneaky Goblin (53) or Super Barbarian (50) active and not yet in army,
    # inject a small funnel pack (3 units)
    present_ids = {uid for _, uid in adjusted_base}
    if 53 in active_super_ids and 53 not in present_ids and max_housing >= 200:
        adjusted_base.append((3, 53))  # 3 Sneaky Goblins = 6 space
    if 50 in active_super_ids and 50 not in present_ids and max_housing >= 200:
        adjusted_base.append((3, 50))  # 3 Super Barbarians = 15 space

    # 2. Scale proportionally to `max_housing`
    raw_total = sum(
        count * lookup_troop(uid).housing_space
        for count, uid in adjusted_base
        if lookup_troop(uid) is not None
    )
    scale = max_housing / raw_total if raw_total > 0 else 1.0

    fitted: List[List[int]] = []  # [[count, uid], ...]
    used_space = 0

    for count, uid in adjusted_base:
        meta = lookup_troop(uid)
        if meta is None or meta.housing_space > max_housing:
            continue
        scaled_count = max(1, int(round(count * scale)))
        # Ensure we don't exceed max_housing
        max_possible = (max_housing - used_space) // meta.housing_space
        final_count = min(scaled_count, max_possible)
        if final_count > 0:
            fitted.append([final_count, uid])
            used_space += final_count * meta.housing_space

    # 3. Top up remaining housing space using primary/filler troops from the composition
    remaining = max_housing - used_space
    if remaining > 0 and fitted:
        for entry in fitted:
            meta = lookup_troop(entry[1])
            if meta and meta.housing_space <= remaining:
                add_cnt = remaining // meta.housing_space
                if add_cnt > 0:
                    entry[0] += add_cnt
                    remaining -= add_cnt * meta.housing_space
            if remaining == 0:
                break

    # Final 1-space filler (Archer=1) if a few housing spaces remain
    if remaining > 0:
        for entry in fitted:
            if entry[1] == 1:
                entry[0] += remaining
                remaining = 0
                break
        if remaining > 0:
            fitted.append([remaining, 1])

    # Merge any duplicate unit_ids while preserving order
    merged: Dict[int, int] = {}
    for cnt, uid in fitted:
        if cnt > 0:
            merged[uid] = merged.get(uid, 0) + cnt

    return [(cnt, uid) for uid, cnt in merged.items()]


def _fit_spells_to_capacity(
    base_spells: Tuple[Tuple[int, int], ...],
    max_spell_space: int,
    th_level: int,
) -> List[Tuple[int, int]]:
    """
    Fit spell composition to the Town Hall's exact spell capacity (`max_spell_space`),
    substituting TH17/TH18-exclusive spells (e.g. Revive Spell=15, Overgrowth=13)
    on lower Town Halls.
    """
    if max_spell_space <= 0:
        return []

    filtered: List[List[int]] = []
    used = 0
    for count, sp_id in base_spells:
        # Revive Spell (15) unlocks at TH15+; Overgrowth (13) unlocks at TH12+
        effective_id = sp_id
        if sp_id == 15 and th_level < 15:
            effective_id = 2  # Rage Spell
        elif sp_id == 13 and th_level < 12:
            effective_id = 3  # Freeze Spell

        meta = lookup_spell(effective_id)
        if meta is None:
            continue
        max_possible = (max_spell_space - used) // meta.housing_space
        final_count = min(count, max_possible)
        if final_count > 0:
            filtered.append([final_count, effective_id])
            used += final_count * meta.housing_space

    # Fill any remaining spell capacity with Freeze (3) or Rage (2)
    remaining = max_spell_space - used
    if remaining > 0:
        filler_id = 3 if th_level >= 9 else 0
        for entry in filtered:
            if entry[1] == filler_id:
                entry[0] += remaining
                remaining = 0
                break
        if remaining > 0:
            filtered.append([remaining, filler_id])

    merged: Dict[int, int] = {}
    for cnt, sid in filtered:
        if cnt > 0:
            merged[sid] = merged.get(sid, 0) + cnt

    return [(cnt, sid) for sid, cnt in merged.items()]


# ---------------------------------------------------------------------------
# Battlelog Army Extraction Engine (`/players/%23{playerTag}/battlelog`)
# ---------------------------------------------------------------------------

def _resolve_battlelog_entry_units(
    entry: Dict[str, Any],
    th_level: int,
) -> Optional[Tuple[Tuple[Tuple[int, int], ...], Tuple[Tuple[int, int], ...], Tuple[Tuple[int, int], ...]]]:
    """
    Extract `(troops, spells, sieges)` as tuples of `(count, unit_id)` from a
    single battlelog entry if it contains either:
      1. `armyShareCode` / `armyLink` / `army_link` / `army_share_code`
      2. `troops` / `army` / `units` and/or `spells` and/or `siegeMachine` / `siegeMachines`
    """
    attacker_block = entry.get("attacker") if isinstance(entry.get("attacker"), dict) else {}

    # 1. Check direct armyShareCode or armyLink
    raw_link_or_code = (
        entry.get("armyLink")
        or entry.get("army_link")
        or entry.get("armyShareCode")
        or entry.get("army_share_code")
        or attacker_block.get("armyLink")
        or attacker_block.get("armyShareCode")
    )
    if isinstance(raw_link_or_code, str) and raw_link_or_code.strip():
        try:
            parsed = parse_army_link(raw_link_or_code.strip(), town_hall=th_level)
            if parsed.army.troops or parsed.army.spells:
                t_pairs = tuple((t.count, t.id) for t in parsed.army.troops if t.count > 0)
                s_pairs = tuple((s.count, s.id) for s in parsed.army.spells if s.count > 0)
                sg_pairs = tuple((1, sg.id) for sg in parsed.army.sieges[:1])
                return (t_pairs, s_pairs, sg_pairs)
        except Exception:
            pass

    # 2. Check direct troops / spells / siegeMachines arrays in battlelog entry
    raw_troops = (
        entry.get("troops")
        or entry.get("units")
        or (entry.get("army") if isinstance(entry.get("army"), list) else None)
        or attacker_block.get("troops")
        or attacker_block.get("units")
        or (attacker_block.get("army") if isinstance(attacker_block.get("army"), list) else None)
        or []
    )
    raw_spells = (
        entry.get("spells")
        or attacker_block.get("spells")
        or []
    )
    raw_sieges = (
        entry.get("siegeMachines")
        or entry.get("sieges")
        or attacker_block.get("siegeMachines")
        or attacker_block.get("sieges")
        or []
    )
    single_siege = entry.get("siegeMachine") or attacker_block.get("siegeMachine")
    if isinstance(single_siege, dict):
        raw_sieges = list(raw_sieges) + [single_siege]
    elif isinstance(single_siege, str) and single_siege.strip():
        raw_sieges = list(raw_sieges) + [{"name": single_siege.strip(), "count": 1}]

    troop_counts: Dict[int, int] = {}
    spell_counts: Dict[int, int] = {}
    siege_counts: Dict[int, int] = {}

    for item in raw_troops:
        if not isinstance(item, dict):
            continue
        if item.get("village", "home") == "builderBase":
            continue
        name = str(item.get("name", "")).strip()
        name_lower = name.lower()
        cnt = max(1, int(item.get("count", item.get("amount", 1))))
        explicit_id = item.get("id", item.get("unitId"))

        # Check if this unit is actually a Siege Machine
        if name_lower in SIEGE_NAME_TO_ID:
            sg_id = SIEGE_NAME_TO_ID[name_lower]
            siege_counts[sg_id] = max(1, siege_counts.get(sg_id, 0))
            continue

        # Check if this unit is a Spell placed inside a combined `army` list
        if name_lower in SPELL_NAME_TO_ID and name_lower not in TROOP_NAME_TO_ID:
            sp_id = SPELL_NAME_TO_ID[name_lower]
            spell_counts[sp_id] = spell_counts.get(sp_id, 0) + cnt
            continue

        tid: Optional[int] = None
        if name_lower in TROOP_NAME_TO_ID:
            tid = TROOP_NAME_TO_ID[name_lower]
        elif explicit_id is not None and lookup_troop(int(explicit_id)) is not None:
            tid = int(explicit_id)

        if tid is not None:
            troop_counts[tid] = troop_counts.get(tid, 0) + cnt

    for item in raw_spells:
        if not isinstance(item, dict):
            continue
        name_lower = str(item.get("name", "")).strip().lower()
        cnt = max(1, int(item.get("count", item.get("amount", 1))))
        explicit_id = item.get("id", item.get("spellId"))

        sid: Optional[int] = None
        if name_lower in SPELL_NAME_TO_ID:
            sid = SPELL_NAME_TO_ID[name_lower]
        elif explicit_id is not None and lookup_spell(int(explicit_id)) is not None:
            sid = int(explicit_id)

        if sid is not None:
            spell_counts[sid] = spell_counts.get(sid, 0) + cnt

    for item in raw_sieges:
        if not isinstance(item, dict):
            continue
        name_lower = str(item.get("name", "")).strip().lower()
        explicit_id = item.get("id", item.get("siegeId"))

        sg_id: Optional[int] = None
        if name_lower in SIEGE_NAME_TO_ID:
            sg_id = SIEGE_NAME_TO_ID[name_lower]
        elif explicit_id is not None and lookup_siege(int(explicit_id)) is not None:
            sg_id = int(explicit_id)

        if sg_id is not None:
            siege_counts[sg_id] = 1

    if not troop_counts and not spell_counts:
        return None

    t_pairs = tuple((cnt, tid) for tid, cnt in troop_counts.items() if cnt > 0)
    s_pairs = tuple((cnt, sid) for sid, cnt in spell_counts.items() if cnt > 0)
    sg_pairs = tuple((1, sg_id) for sg_id in list(siege_counts.keys())[:1])
    return (t_pairs, s_pairs, sg_pairs)


def extract_army_from_battlelog(
    battlelog: Optional[Any],
    th_level: int = 18,
) -> Tuple[
    Optional[Tuple[List[Tuple[int, int]], List[Tuple[int, int]], List[Tuple[int, int]], str, int]],
    List[Dict[str, Any]],
]:
    """
    Inspect `/players/%23{playerTag}/battlelog` ranked/legend/multiplayer attacks:
      - Extracts troops, spells, siege machines, and any `armyShareCode` / `armyLink`.
      - Identifies the player's most frequently used attack army composition.
      - Returns `(most_frequent_army_tuple, battlelog_attacks_summary)`.
    """
    if not battlelog:
        return None, []

    items: List[Dict[str, Any]] = []
    if isinstance(battlelog, dict):
        raw_items = battlelog.get("items") or battlelog.get("battles") or []
        if isinstance(raw_items, list):
            items = [x for x in raw_items if isinstance(x, dict)]
    elif isinstance(battlelog, list):
        items = [x for x in battlelog if isinstance(x, dict)]

    if not items:
        return None, []

    # Track frequency and performance of each distinct attack composition
    # Key: (t_pairs, s_pairs, sg_pairs) -> [frequency, total_stars, total_destruction, first_seen_neg_idx]
    comp_stats: Dict[
        Tuple[Tuple[Tuple[int, int], ...], Tuple[Tuple[int, int], ...], Tuple[Tuple[int, int], ...]],
        List[float],
    ] = {}
    battlelog_summary: List[Dict[str, Any]] = []

    for idx, entry in enumerate(items):
        is_attack = entry.get("attack", True) is not False and str(entry.get("type", "")).lower() != "defense"
        attacker_block = entry.get("attacker") if isinstance(entry.get("attacker"), dict) else {}
        defender_block = (
            entry.get("defender")
            if isinstance(entry.get("defender"), dict)
            else (entry.get("opponent") if isinstance(entry.get("opponent"), dict) else {})
        )

        stars = int(entry.get("stars", attacker_block.get("stars", 0)))
        destruction = float(
            entry.get("destructionPercentage", attacker_block.get("destructionPercentage", 0.0))
        )
        battle_type = str(entry.get("battleType") or entry.get("type") or "ranked")
        opp_tag = entry.get("opponentTag") or defender_block.get("tag")
        opp_name = entry.get("opponentName") or defender_block.get("name")

        resolved = _resolve_battlelog_entry_units(entry, th_level) if is_attack else None
        entry_link: Optional[str] = None
        entry_troops_summary: List[Dict[str, Any]] = []
        entry_spells_summary: List[Dict[str, Any]] = []

        if resolved is not None:
            t_pairs, s_pairs, sg_pairs = resolved
            entry_link = build_army_link(list(t_pairs), list(s_pairs), list(sg_pairs))
            if resolved not in comp_stats:
                comp_stats[resolved] = [0.0, 0.0, 0.0, float(-idx)]
            comp_stats[resolved][0] += 1.0
            comp_stats[resolved][1] += float(stars)
            comp_stats[resolved][2] += destruction

            for cnt, tid in t_pairs:
                meta = lookup_troop(tid)
                if meta:
                    entry_troops_summary.append({"id": tid, "name": meta.name, "count": cnt})
            for cnt, sid in s_pairs:
                smeta = lookup_spell(sid)
                if smeta:
                    entry_spells_summary.append({"id": sid, "name": smeta.name, "count": cnt})

        battlelog_summary.append({
            "battleType": battle_type,
            "attack": is_attack,
            "stars": stars,
            "destructionPercentage": destruction,
            "trophyChange": entry.get("trophyChange"),
            "opponentTag": opp_tag,
            "opponentName": opp_name,
            "armyLink": entry_link,
            "troops": entry_troops_summary,
            "spells": entry_spells_summary,
        })

    if not comp_stats:
        return None, battlelog_summary

    # Pick the most frequently used attack army (tie-break by stars, destruction, recency)
    best_sig, best_metrics = max(
        comp_stats.items(),
        key=lambda kv: (kv[1][0], kv[1][1], kv[1][2], kv[1][3]),
    )
    t_pairs, s_pairs, sg_pairs = best_sig
    freq_count = int(best_metrics[0])

    # Build a descriptive archetype label from the top troops by total housing space
    scored_troops: List[Tuple[int, str]] = []
    for cnt, tid in t_pairs:
        meta = lookup_troop(tid)
        if meta:
            scored_troops.append((cnt * meta.housing_space, meta.name))
    scored_troops.sort(reverse=True)
    top_unit_names = [name for _, name in scored_troops[:3]]
    label = (
        f"Battlelog: {' + '.join(top_unit_names)}"
        if top_unit_names
        else "Battlelog Kayıtlı Saldırı Ordusu"
    )

    return (list(t_pairs), list(s_pairs), list(sg_pairs), label, freq_count), battlelog_summary


# ---------------------------------------------------------------------------
# Main Inference Engine
# ---------------------------------------------------------------------------

def infer_player_army(
    raw_player: Dict[str, Any],
    war_attacks: Optional[List[Dict[str, Any]]] = None,
    battlelog: Optional[Any] = None,
) -> InferredArmyResult:
    """
    Analyze a player's `/players/{tag}` profile (TH level up to TH18, 6 heroes,
    active equipped hero equipment, active Super Troops, and maxed troops/spells)
    AND their `/players/{tag}/battlelog` attacks to determine their main attack
    army and generate a valid in-game CopyArmy link.
    """
    th_level = min(
        max(1, int(raw_player.get("townHallLevel", raw_player.get("townhallLevel", 18)))),
        MAX_TOWN_HALL_LEVEL,
    )
    capacity = lookup_army_capacity(th_level)

    active_super_names, active_super_ids = _extract_active_super_troops(raw_player)
    heroes_detailed, active_equipment_flat, equipped_names_lower = _extract_heroes_and_equipment(
        raw_player, th_level
    )
    troop_levels, spell_levels, siege_levels = _extract_unit_levels(raw_player)

    # Check if battlelog was passed directly or embedded in `raw_player["battlelog"]`
    effective_battlelog = battlelog if battlelog is not None else raw_player.get("battlelog")
    battlelog_army_info, battlelog_attacks = extract_army_from_battlelog(
        effective_battlelog, th_level=th_level
    )

    best_archetype: ArchetypeTemplate = META_ARCHETYPES[0]
    best_score: float = -1.0
    best_reasons: List[str] = []

    for arch in META_ARCHETYPES:
        # Filter by Town Hall bracket (with soft fallback if needed)
        if th_level < arch.min_th or th_level > arch.max_th:
            continue

        score = arch.base_priority
        reasons: List[str] = [f"TH{th_level} meta profili ({arch.name})"]

        # 1. Active Super Troop match (strongest live signal: +45 pts per match)
        matched_supers = [
            lookup_troop(sid).name
            for sid in arch.trigger_super_troop_ids
            if sid in active_super_ids and lookup_troop(sid) is not None
        ]
        if matched_supers:
            score += 45.0 * len(matched_supers)
            reasons.append(f"Aktif Süper Birlik: {', '.join(matched_supers)}")

        # 2. Active Hero Equipment synergy match (+12 pts per matching equipped item)
        matched_eqs = [
            eq_name
            for eq_name in arch.trigger_equipment_names
            if eq_name.lower() in equipped_names_lower
        ]
        if matched_eqs:
            score += 12.0 * len(matched_eqs)
            reasons.append(f"Kuşanılmış Ekipman Sinerjisi: {', '.join(matched_eqs[:4])}")

        # Special high-signal combo bonuses
        if "fireball" in equipped_names_lower and arch.key.startswith("warden_fireball"):
            score += 25.0
            reasons.append("Büyük Koruyucu 'Fireball' (Ateş Topu) odaklı yıkım dizilimi")
        if (
            {"giant gauntlet", "spiky ball"} & equipped_names_lower
            and {"electro boots", "healing tome"} & equipped_names_lower
            and arch.key == "root_rider_valk_smash"
        ):
            score += 20.0
            reasons.append("TH18 Ground Smash (Spiky Ball/Gauntlet + Electro Boots + Healing Tome)")
        if (
            {"dark orb", "dark crown"} & equipped_names_lower
            and arch.key in ("hydra_sarch_blimp", "mass_dragon_air", "super_dragon_spam")
        ):
            score += 18.0
            reasons.append("Minyon Prens hava sinerjisi (Dark Orb / Dark Crown)")

        # 3. Lab Troop & Spell Level Readiness (+6 pts per maxed/near-maxed core unit)
        if troop_levels:
            maxed_core_troops: List[str] = []
            missing_core = 0
            for tid in arch.core_troop_ids:
                # Super troops inherit level from their base troop if not explicitly listed
                meta = lookup_troop(tid)
                lookup_id = meta.super_of if (meta and meta.super_of is not None and tid not in troop_levels) else tid
                if lookup_id in troop_levels:
                    lvl, max_lvl = troop_levels[lookup_id]
                    ratio = lvl / max(1, max_lvl)
                    score += 8.0 * ratio
                    if lvl >= max_lvl - 1 and meta:
                        maxed_core_troops.append(f"{meta.name} (Lv.{lvl})")
                else:
                    missing_core += 1

            if maxed_core_troops:
                reasons.append(f"Maksimum Seviye Birlikler: {', '.join(maxed_core_troops[:3])}")
            if missing_core > 0:
                score -= 10.0 * missing_core

        if spell_levels:
            for sid in arch.core_spell_ids:
                if sid in spell_levels:
                    lvl, max_lvl = spell_levels[sid]
                    score += 4.0 * (lvl / max(1, max_lvl))

        if score > best_score:
            best_score = score
            best_archetype = arch
            best_reasons = reasons

    # Fit troops, spells, and siege machine to the player's Town Hall capacity
    army_source = "profile_inference"
    final_archetype_key = best_archetype.key
    final_archetype_name = best_archetype.name

    if battlelog_army_info is not None:
        b_troops, b_spells, b_sieges, b_label, b_freq = battlelog_army_info
        army_source = "battlelog"
        final_archetype_key = "battlelog_extracted"
        final_archetype_name = b_label
        best_reasons = [
            f"Battlelog Analizi: Kupalı saldırılarda en sık kullanılan ordu ({b_freq} saldırı)",
            *best_reasons,
        ]
        fitted_troops = b_troops if b_troops else _fit_troops_to_capacity(
            best_archetype.base_troops,
            capacity.max_troop_housing,
            active_super_ids,
            troop_levels,
        )
        fitted_spells = b_spells if b_spells else _fit_spells_to_capacity(
            best_archetype.base_spells,
            capacity.max_spell_capacity,
            th_level,
        )
        if b_sieges:
            fitted_sieges = b_sieges
        elif capacity.max_siege_machines > 0:
            chosen_siege_id = best_archetype.preferred_siege_id
            if chosen_siege_id == 7 and th_level < 16:
                chosen_siege_id = best_archetype.fallback_siege_id
            fitted_sieges = [(1, chosen_siege_id)]
        else:
            fitted_sieges = []
    else:
        fitted_troops = _fit_troops_to_capacity(
            best_archetype.base_troops,
            capacity.max_troop_housing,
            active_super_ids,
            troop_levels,
        )
        fitted_spells = _fit_spells_to_capacity(
            best_archetype.base_spells,
            capacity.max_spell_capacity,
            th_level,
        )

        fitted_sieges = []
        if capacity.max_siege_machines > 0:
            chosen_siege_id = best_archetype.preferred_siege_id
            # Troop Launcher (7) unlocks at TH16+
            if chosen_siege_id == 7 and th_level < 16:
                chosen_siege_id = best_archetype.fallback_siege_id
            if siege_levels and chosen_siege_id not in siege_levels and best_archetype.fallback_siege_id in siege_levels:
                chosen_siege_id = best_archetype.fallback_siege_id
            fitted_sieges = [(1, chosen_siege_id)]

    # Build official CoC CopyArmy URL and validate with `parse_army_link`
    army_link = build_army_link(fitted_troops, fitted_spells, fitted_sieges)
    parse_res: ParseResult = parse_army_link(army_link, town_hall=th_level)

    # Enrich parsed army with actual player troop/spell/siege levels and hero equipment
    enriched_troops: List[TroopSlot] = []
    for slot in parse_res.army.troops:
        meta = lookup_troop(slot.id)
        base_id = meta.super_of if (meta and meta.super_of is not None and slot.id not in troop_levels) else slot.id
        lvl = troop_levels.get(slot.id, troop_levels.get(base_id, (1, 1)))[0]
        enriched_troops.append(
            TroopSlot(
                id=slot.id,
                name=slot.name,
                count=slot.count,
                level=lvl,
                super_troop_is_active=slot.super_troop_is_active or (slot.id in active_super_ids),
            )
        )

    enriched_spells: List[SpellSlot] = []
    for slot in parse_res.army.spells:
        lvl = spell_levels.get(slot.id, (1, 1))[0]
        enriched_spells.append(
            SpellSlot(
                id=slot.id,
                name=slot.name,
                count=slot.count,
                level=lvl,
            )
        )

    enriched_sieges: List[SiegeMachine] = []
    for slot in parse_res.army.sieges:
        lvl = siege_levels.get(slot.id, (1, 1))[0]
        enriched_sieges.append(
            SiegeMachine(
                id=slot.id,
                name=slot.name,
                level=lvl,
                count=1,
            )
        )

    hero_eq_slots: List[HeroEquipmentSlot] = []
    seen_hero_eq: set[Tuple[str, str]] = set()
    for eq in active_equipment_flat:
        hero_name_str = eq.get("hero", "")
        eq_name_str = eq.get("name", "")
        if hero_name_str in KNOWN_HERO_NAMES and eq_name_str:
            key = (hero_name_str, eq_name_str)
            if key not in seen_hero_eq:
                seen_hero_eq.add(key)
                hero_eq_slots.append(
                    HeroEquipmentSlot(
                        hero=HeroName(hero_name_str),
                        equipment_name=eq_name_str,
                        equipment_level=max(1, int(eq.get("level", 1))),
                    )
                )

    enriched_parsed_army = ParsedArmy(
        troops=enriched_troops,
        spells=enriched_spells,
        sieges=enriched_sieges,
        hero_equipment=hero_eq_slots,
        army_share_code=parse_res.army.army_share_code,
        total_housing_space=parse_res.army.total_housing_space,
        total_spell_space=parse_res.army.total_spell_space,
    )

    confidence = (
        99.0
        if army_source == "battlelog"
        else min(99.0, round(55.0 + min(44.0, best_score * 0.45), 1))
    )

    cc_units = [
        {"id": f"cc_{idx}", "name": name, "count": cnt}
        for idx, (name, cnt) in enumerate(best_archetype.cc_recommendations, start=1)
    ]

    return InferredArmyResult(
        archetype_key=final_archetype_key,
        archetype_name=final_archetype_name,
        confidence_score=confidence,
        inference_reasons=best_reasons,
        army_link=army_link,
        parsed_army=enriched_parsed_army,
        town_hall_level=th_level,
        active_super_troops=active_super_names,
        active_equipment=active_equipment_flat,
        heroes_detailed=heroes_detailed,
        clan_castle=cc_units,
        army_source=army_source,
        battlelog_attacks=battlelog_attacks,
    )
