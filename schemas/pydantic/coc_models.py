"""
Clash of Clans Analytics Platform — Pydantic Data Schemas
==========================================================
Strict, production-ready Pydantic v2 models for:
  - Player profile (heroes, pets, equipment)
  - Supercell BattleLogEntry
  - Parsed army structure (troops, spells, sieges, hero equipment)

All models use:
  - model_config = ConfigDict(str_strip_whitespace=True, frozen=True)
  - Annotated validators where CoC business rules apply
  - Optional[X] = None only where the CoC API genuinely omits the field
"""

from __future__ import annotations

import re
from datetime import datetime
from enum import Enum
from typing import Annotated, Optional
from uuid import UUID

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

# ---------------------------------------------------------------------------
# Regex / Constants
# ---------------------------------------------------------------------------

_TAG_RE = re.compile(r"^[0-9A-Z]{3,12}$")  # CoC tag without #

# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class BattleType(str, Enum):
    MULTIPLAYER = "multiplayer"
    CLAN_WAR = "clan_war"
    CWL = "cwl"
    RAID_WEEKEND = "raid_weekend"
    FRIENDLY = "friendly"
    BUILDER_BASE = "builder_base"


class HeroName(str, Enum):
    BARBARIAN_KING = "Barbarian King"
    ARCHER_QUEEN = "Archer Queen"
    GRAND_WARDEN = "Grand Warden"
    ROYAL_CHAMPION = "Royal Champion"
    MINION_PRINCE = "Minion Prince"
    DRAGON_DUKE = "Dragon Duke"


class PetName(str, Enum):
    LASSI = "L.A.S.S.I"
    ELECTRO_OWL = "Electro Owl"
    MIGHTY_YAK = "Mighty Yak"
    UNICORN = "Unicorn"
    FROSTY = "Frosty"
    DIGGY = "Diggy"
    POISON_LIZARD = "Poison Lizard"
    PHOENIX = "Phoenix"
    SPIRIT_FOX = "Spirit Fox"
    ANGRY_JELLY = "Angry Jelly"
    SNEEZY = "Sneezy"
    FROST_HOUND = "Frost Hound"
    GREEDY_RAVEN = "Greedy Raven"


class EquipmentRarity(str, Enum):
    COMMON = "Common"
    EPIC = "Epic"


class WarPreference(str, Enum):
    IN = "in"
    OUT = "out"


class ClanRole(str, Enum):
    MEMBER = "member"
    ELDER = "elder"
    CO_LEADER = "coLeader"
    LEADER = "leader"


# ---------------------------------------------------------------------------
# Shared Annotated Types & TH18 Meta Constants
# ---------------------------------------------------------------------------

MAX_TOWN_HALL_LEVEL = 18

PlayerTag = Annotated[
    str,
    Field(
        min_length=3,
        max_length=12,
        description="CoC player/clan tag without leading #, uppercase.",
    ),
]

TownHallLevel = Annotated[int, Field(ge=1, le=MAX_TOWN_HALL_LEVEL)]
BuilderHallLevel = Annotated[int, Field(ge=1, le=10)]
TrophyCount = Annotated[int, Field(ge=0)]
StarCount = Annotated[int, Field(ge=0, le=3)]
DestructionPct = Annotated[float, Field(ge=0.0, le=100.0)]

# Maximum hero levels per Town Hall level (up to TH18)
HERO_MAX_LEVELS_BY_TH: dict[int, dict[HeroName, int]] = {
    7:  {HeroName.BARBARIAN_KING: 10},
    8:  {HeroName.BARBARIAN_KING: 20},
    9:  {
        HeroName.BARBARIAN_KING: 30,
        HeroName.ARCHER_QUEEN: 30,
        HeroName.MINION_PRINCE: 10,
    },
    10: {
        HeroName.BARBARIAN_KING: 40,
        HeroName.ARCHER_QUEEN: 40,
        HeroName.MINION_PRINCE: 20,
    },
    11: {
        HeroName.BARBARIAN_KING: 50,
        HeroName.ARCHER_QUEEN: 50,
        HeroName.GRAND_WARDEN: 20,
        HeroName.MINION_PRINCE: 30,
    },
    12: {
        HeroName.BARBARIAN_KING: 65,
        HeroName.ARCHER_QUEEN: 65,
        HeroName.GRAND_WARDEN: 40,
        HeroName.MINION_PRINCE: 40,
    },
    13: {
        HeroName.BARBARIAN_KING: 75,
        HeroName.ARCHER_QUEEN: 75,
        HeroName.GRAND_WARDEN: 50,
        HeroName.ROYAL_CHAMPION: 25,
        HeroName.MINION_PRINCE: 50,
    },
    14: {
        HeroName.BARBARIAN_KING: 80,
        HeroName.ARCHER_QUEEN: 80,
        HeroName.GRAND_WARDEN: 55,
        HeroName.ROYAL_CHAMPION: 30,
        HeroName.MINION_PRINCE: 60,
    },
    15: {
        HeroName.BARBARIAN_KING: 90,
        HeroName.ARCHER_QUEEN: 90,
        HeroName.GRAND_WARDEN: 65,
        HeroName.ROYAL_CHAMPION: 40,
        HeroName.MINION_PRINCE: 70,
        HeroName.DRAGON_DUKE: 20,
    },
    16: {
        HeroName.BARBARIAN_KING: 95,
        HeroName.ARCHER_QUEEN: 95,
        HeroName.GRAND_WARDEN: 70,
        HeroName.ROYAL_CHAMPION: 45,
        HeroName.MINION_PRINCE: 80,
        HeroName.DRAGON_DUKE: 30,
    },
    17: {
        HeroName.BARBARIAN_KING: 100,
        HeroName.ARCHER_QUEEN: 100,
        HeroName.GRAND_WARDEN: 75,
        HeroName.ROYAL_CHAMPION: 50,
        HeroName.MINION_PRINCE: 90,
        HeroName.DRAGON_DUKE: 40,
    },
    18: {
        HeroName.BARBARIAN_KING: 105,
        HeroName.ARCHER_QUEEN: 105,
        HeroName.GRAND_WARDEN: 80,
        HeroName.ROYAL_CHAMPION: 55,
        HeroName.MINION_PRINCE: 95,
        HeroName.DRAGON_DUKE: 50,
    },
}

HERO_MAX_LEVEL_TH18: dict[HeroName, int] = HERO_MAX_LEVELS_BY_TH[18]

EQUIPMENT_MAX_LEVELS_BY_TH: dict[int, dict[EquipmentRarity, int]] = {
    8:  {EquipmentRarity.COMMON: 9,  EquipmentRarity.EPIC: 12},
    9:  {EquipmentRarity.COMMON: 9,  EquipmentRarity.EPIC: 12},
    10: {EquipmentRarity.COMMON: 12, EquipmentRarity.EPIC: 15},
    11: {EquipmentRarity.COMMON: 12, EquipmentRarity.EPIC: 15},
    12: {EquipmentRarity.COMMON: 15, EquipmentRarity.EPIC: 18},
    13: {EquipmentRarity.COMMON: 15, EquipmentRarity.EPIC: 18},
    14: {EquipmentRarity.COMMON: 18, EquipmentRarity.EPIC: 21},
    15: {EquipmentRarity.COMMON: 18, EquipmentRarity.EPIC: 24},
    16: {EquipmentRarity.COMMON: 18, EquipmentRarity.EPIC: 27},
    17: {EquipmentRarity.COMMON: 18, EquipmentRarity.EPIC: 27},
    18: {EquipmentRarity.COMMON: 18, EquipmentRarity.EPIC: 27},
}

PET_MAX_LEVELS_BY_TH: dict[int, int] = {
    14: 10,
    15: 10,
    16: 15,
    17: 15,
    18: 20,
}


# ---------------------------------------------------------------------------
# ── Equipment ────────────────────────────────────────────────────────────────
# ---------------------------------------------------------------------------


class HeroEquipment(BaseModel):
    """
    A single piece of hero equipment as returned by the CoC API.
    """

    model_config = ConfigDict(str_strip_whitespace=True, frozen=True)

    name: str = Field(..., description="Equipment display name, e.g. 'Giant Gauntlet'")
    level: int = Field(..., ge=1, description="Current upgrade level")
    max_level: int = Field(..., ge=1, description="Max possible level for this rarity")
    rarity: EquipmentRarity
    village: str = Field(default="home", pattern=r"^(home|builderBase)$")

    @model_validator(mode="after")
    def level_cannot_exceed_max(self) -> "HeroEquipment":
        if self.level > self.max_level:
            raise ValueError(
                f"Equipment level {self.level} exceeds max_level {self.max_level} "
                f"for '{self.name}'"
            )
        return self


# ---------------------------------------------------------------------------
# ── Hero ─────────────────────────────────────────────────────────────────────
# ---------------------------------------------------------------------------


class Hero(BaseModel):
    """
    A single hero with current level, max level, and equipped items.
    """

    model_config = ConfigDict(str_strip_whitespace=True, frozen=True)

    name: HeroName
    level: int = Field(..., ge=1)
    max_level: int = Field(..., ge=1)
    village: str = Field(default="home", pattern=r"^(home|builderBase)$")
    equipment: list[HeroEquipment] = Field(
        default_factory=list,
        description="Currently equipped items (max 2 in home village as of 2025).",
    )

    @field_validator("equipment")
    @classmethod
    def max_two_equipped(cls, v: list[HeroEquipment]) -> list[HeroEquipment]:
        if len(v) > 2:
            raise ValueError("A hero may have at most 2 equipment items equipped simultaneously.")
        return v

    @model_validator(mode="after")
    def level_cannot_exceed_max(self) -> "Hero":
        if self.level > self.max_level:
            raise ValueError(
                f"Hero level {self.level} exceeds max_level {self.max_level} for {self.name}"
            )
        return self


# ---------------------------------------------------------------------------
# ── Pet ──────────────────────────────────────────────────────────────────────
# ---------------------------------------------------------------------------


class Pet(BaseModel):
    """
    A single Pet (Home Village).
    """

    model_config = ConfigDict(str_strip_whitespace=True, frozen=True)

    name: PetName
    level: int = Field(..., ge=1)
    max_level: int = Field(..., ge=1)
    village: str = Field(default="home")

    @model_validator(mode="after")
    def level_cannot_exceed_max(self) -> "Pet":
        if self.level > self.max_level:
            raise ValueError(
                f"Pet level {self.level} exceeds max_level {self.max_level} for {self.name}"
            )
        return self


# ---------------------------------------------------------------------------
# ── Clan Reference (lightweight, inside player profile) ──────────────────────
# ---------------------------------------------------------------------------


class ClanReference(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, frozen=True)

    tag: PlayerTag
    name: str
    clan_level: Optional[int] = Field(None, ge=1)
    badge_url_small: Optional[str] = None

    @field_validator("tag", mode="before")
    @classmethod
    def normalise_tag(cls, v: str) -> str:
        return v.lstrip("#").upper()


# ---------------------------------------------------------------------------
# ── Player Profile ────────────────────────────────────────────────────────────
# ---------------------------------------------------------------------------


class PlayerProfile(BaseModel):
    """
    Full enriched player profile combining CoC API data with analytics metadata.

    Represents the canonical in-platform representation of a player —
    NOT the raw API response.
    """

    model_config = ConfigDict(str_strip_whitespace=True, frozen=True)

    # ── Identity
    tag: PlayerTag = Field(..., description="Player tag without #, uppercase.")
    name: str = Field(..., min_length=1, max_length=64)
    exp_level: int = Field(..., ge=1)

    # ── Village levels
    town_hall_level: TownHallLevel
    town_hall_weapon_level: Optional[int] = Field(None, ge=1, le=5)
    builder_hall_level: Optional[BuilderHallLevel] = None

    # ── Trophies
    trophies: TrophyCount
    best_trophies: TrophyCount
    builder_base_trophies: Optional[TrophyCount] = None
    best_builder_base_trophies: Optional[TrophyCount] = None

    # ── War stats
    war_stars: int = Field(default=0, ge=0)
    war_preference: Optional[WarPreference] = None
    attack_wins: int = Field(default=0, ge=0)
    defense_wins: int = Field(default=0, ge=0)

    # ── Heroes (may be empty for low TH players)
    heroes: list[Hero] = Field(default_factory=list)

    # ── Pets
    hero_pets: list[Pet] = Field(default_factory=list, alias="troops_pets")

    # ── Clan membership
    clan: Optional[ClanReference] = None
    role: Optional[ClanRole] = None
    donations: int = Field(default=0, ge=0)
    donations_received: int = Field(default=0, ge=0)

    # ── Analytics metadata
    last_scouted_at: AwareDatetime
    scouted_by: Optional[str] = Field(
        None,
        description="API token label or bot instance that last scouted this player.",
    )

    @field_validator("tag", mode="before")
    @classmethod
    def normalise_tag(cls, v: str) -> str:
        normalised = v.lstrip("#").upper()
        if not _TAG_RE.match(normalised):
            raise ValueError(f"Invalid CoC player tag: '{v}'")
        return normalised

    @model_validator(mode="after")
    def th_weapon_requires_th13(self) -> "PlayerProfile":
        if self.town_hall_weapon_level is not None and self.town_hall_level < 13:
        # Giga Tesla / Giga Inferno is only present from TH13+
            raise ValueError(
                "town_hall_weapon_level is only applicable for Town Hall 13+."
            )
        return self

    def hero(self, name: HeroName) -> Optional[Hero]:
        """Convenience accessor for a specific hero."""
        return next((h for h in self.heroes if h.name == name), None)


# ---------------------------------------------------------------------------
# ── Parsed Army Structure ────────────────────────────────────────────────────
# ---------------------------------------------------------------------------


class TroopSlot(BaseModel):
    """A single troop type and count in the army composition."""

    model_config = ConfigDict(str_strip_whitespace=True, frozen=True)

    id: int = Field(..., ge=0, description="CoC internal troop ID. 0-indexed (Barbarian=0).")
    name: str
    count: int = Field(..., ge=1)
    level: int = Field(..., ge=1)
    super_troop_is_active: bool = Field(
        default=False,
        description="True if this is a Super Troop variant.",
    )


class SpellSlot(BaseModel):
    """A single spell type and count in the army composition."""

    model_config = ConfigDict(str_strip_whitespace=True, frozen=True)

    id: int = Field(..., ge=0, description="CoC internal spell ID. 0-indexed (Lightning=0).")
    name: str
    count: int = Field(..., ge=1)
    level: int = Field(..., ge=1)


class SiegeMachine(BaseModel):
    """Siege machine included in the army."""

    model_config = ConfigDict(str_strip_whitespace=True, frozen=True)

    id: int = Field(..., ge=0, description="CoC internal siege ID. 0-indexed (Wall Wrecker=0).")
    name: str
    level: int = Field(..., ge=1)
    # Only 1 siege machine per attack
    count: int = Field(default=1, ge=1, le=1)


class HeroEquipmentSlot(BaseModel):
    """Hero equipment used during a specific battle (may differ from profile snapshot)."""

    model_config = ConfigDict(str_strip_whitespace=True, frozen=True)

    hero: HeroName
    equipment_name: str
    equipment_level: int = Field(..., ge=1)


class ParsedArmy(BaseModel):
    """
    Fully structured army composition parsed from an army share link
    or from the CoC API battle log payload.

    This model is stored in battle_logs.parsed_army_json.
    """

    model_config = ConfigDict(str_strip_whitespace=True, frozen=True)

    troops: list[TroopSlot] = Field(default_factory=list)
    spells: list[SpellSlot] = Field(default_factory=list)
    sieges: list[SiegeMachine] = Field(default_factory=list)
    hero_equipment: list[HeroEquipmentSlot] = Field(
        default_factory=list,
        description="Equipment active on each hero during this attack.",
    )

    # Derived/annotated fields
    army_share_code: Optional[str] = Field(
        None,
        description="Raw share code extracted from the copy-link payload.",
    )
    total_housing_space: Optional[int] = Field(
        None,
        ge=0,
        description="Sum of troop housing space. Computed at parse time.",
    )
    total_spell_space: Optional[int] = Field(
        None,
        ge=0,
        description="Sum of spell housing space. Computed at parse time.",
    )

    @model_validator(mode="after")
    def validate_single_siege(self) -> "ParsedArmy":
        if len(self.sieges) > 1:
            raise ValueError("An attack can include at most one Siege Machine.")
        return self

    @model_validator(mode="after")
    def validate_unique_hero_slots(self) -> "ParsedArmy":
        """
        Each (hero, equipment_name) pair must be unique.
        A hero CAN appear twice (once per equipment slot) but cannot have the
        same equipment item listed more than once.
        """
        seen: set[tuple] = set()
        for slot in self.hero_equipment:
            key = (slot.hero, slot.equipment_name)
            if key in seen:
                raise ValueError(
                    f"Duplicate (hero, equipment) entry: {slot.hero} / {slot.equipment_name}"
                )
            seen.add(key)
        return self


# ---------------------------------------------------------------------------
# ── BattleLogEntry ───────────────────────────────────────────────────────────
# ---------------------------------------------------------------------------


class AttackDetail(BaseModel):
    """
    A single attack within a battle (some battle types allow multiple attacks).
    """

    model_config = ConfigDict(str_strip_whitespace=True, frozen=True)

    attacker_tag: PlayerTag
    defender_tag: PlayerTag
    stars: StarCount
    destruction_percentage: DestructionPct
    order: int = Field(..., ge=1, description="Attack order within the war/raid.")
    duration: Optional[int] = Field(
        None, ge=0, description="Attack duration in seconds, if reported by the API."
    )

    @field_validator("attacker_tag", "defender_tag", mode="before")
    @classmethod
    def normalise_tags(cls, v: str) -> str:
        return v.lstrip("#").upper()


class BattleLogEntry(BaseModel):
    """
    Supercell BattleLogEntry — the canonical representation of a single
    battle event as ingested from the CoC API or derived from a webhook.

    Stored in PostgreSQL battle_logs, with parsed_army populated separately.
    """

    model_config = ConfigDict(str_strip_whitespace=True, frozen=True)

    # ── Identifiers
    battle_id: UUID = Field(..., description="Platform-generated UUID for this battle.")
    player_tag: PlayerTag

    # ── Classification
    battle_type: BattleType

    # ── Top-level outcome (for quick aggregation)
    stars: StarCount
    destruction_percentage: DestructionPct

    # ── Attacks (a CWL attack has 1; a regular war may report 1 or 2)
    attacks: list[AttackDetail] = Field(
        ...,
        min_length=1,
        description="Ordered list of attacks. At least one is required.",
    )

    # ── Opposing base
    defender_tag: Optional[PlayerTag] = None
    defender_town_hall: Optional[TownHallLevel] = None

    # ── Clan war context
    clan_war_id: Optional[UUID] = None
    war_map_position: Optional[int] = Field(None, ge=1)
    attack_order: Optional[int] = Field(None, ge=1, le=2)

    # ── Army
    army_share_code: Optional[str] = Field(None, max_length=64)
    parsed_army: Optional[ParsedArmy] = Field(
        None,
        description="Populated after army share parsing pipeline completes.",
    )

    # ── Timestamps
    battle_timestamp: AwareDatetime
    ingested_at: AwareDatetime

    @field_validator("player_tag", "defender_tag", mode="before")
    @classmethod
    def normalise_tags(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return v.lstrip("#").upper()

    @model_validator(mode="after")
    def cwl_requires_context(self) -> "BattleLogEntry":
        if self.battle_type == BattleType.CWL and self.clan_war_id is None:
            raise ValueError("CWL battles must include a clan_war_id.")
        return self

    @model_validator(mode="after")
    def outcome_consistent_with_attacks(self) -> "BattleLogEntry":
        """
        The top-level stars must match the primary attack stars
        for single-attack battles.
        """
        if len(self.attacks) == 1 and self.attacks[0].stars != self.stars:
            raise ValueError(
                "stars field must match the stars of the single attack for consistency. "
                f"Got entry.stars={self.stars}, attacks[0].stars={self.attacks[0].stars}"
            )
        return self
