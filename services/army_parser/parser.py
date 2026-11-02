"""
Army Share Link Parser
======================
Parses the Clash of Clans army share URL format into a fully structured
ParsedArmy object, then optionally enriches it with hero equipment and
pet assignments sourced from a live PlayerProfile.

CoC Army Link Format
--------------------
    https://link.clashofclans.com/en?action=CopyArmy&army=u{units}s{spells}

Where:
    units  = {count}x{id}  entries separated by  -
    spells = {count}x{id}  entries separated by  -

Siege machines use an optional "e" prefix (observed in newer game builds).
If a siege appears in the "u" block with an ID >= 1000, it is remapped to
the siege registry.

Example:
    army=u10x0-5x3-2x4s3x0-2x1-1x2
    → 10 Barbarians, 5 Giants, 2 Wall Breakers
    → 3 Lightning Spells, 2 Healing Spells, 1 Rage Spell
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import parse_qs, urlparse

from services.army_parser.unit_registry import (
    ARMY_CAPACITY_BY_TH,
    MAX_SIEGE_MACHINES,
    MAX_SPELL_HOUSING_SPACE,
    MAX_TOWN_HALL,
    MAX_TROOP_HOUSING_SPACE,
    MIN_TOWN_HALL,
    SIEGE_REGISTRY,
    SPELL_REGISTRY,
    TROOP_REGISTRY,
    ArmyCapacity,
    SiegeMeta,
    SpellMeta,
    UnitMeta,
    lookup_army_capacity,
    lookup_siege,
    lookup_spell,
    lookup_troop,
)

# Import domain schemas from the shared pydantic layer
from schemas.pydantic.coc_models import (
    HeroEquipmentSlot,
    HeroName,
    ParsedArmy,
    PlayerProfile,
    SiegeMachine,
    SpellSlot,
    TroopSlot,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_ARMY_PARAM_RE = re.compile(
    r"^"
    r"(?:u(?P<units>[0-9x\-]+))?"   # optional units block
    r"(?:s(?P<spells>[0-9x\-]+))?"  # optional spells block
    r"(?:e(?P<sieges>[0-9x\-]+))?"  # optional siege block (newer link format)
    r"$",
    re.IGNORECASE,
)

_ENTRY_RE = re.compile(r"^(?P<count>\d+)x(?P<id>\d+)$")

# Siege machine IDs that Supercell encodes inside the "u" block in older formats
# (IDs 1000–1099 are reserved for siege machines in the u-block fallback)
_SIEGE_U_BLOCK_OFFSET = 1000


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class ArmyLinkParseError(ValueError):
    """Raised when the army share link or army string cannot be parsed."""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_army_string(raw: str) -> str:
    """
    Accept either:
      - A full URL: https://link.clashofclans.com/en?action=CopyArmy&army=u10x0s1x2
      - A bare army string: u10x0s1x2

    Returns the army string portion only.
    """
    raw = raw.strip()
    if raw.startswith("http"):
        parsed = urlparse(raw)
        qs = parse_qs(parsed.query)
        army_values = qs.get("army", [])
        if not army_values:
            raise ArmyLinkParseError(
                f"No 'army' query parameter found in URL: {raw!r}"
            )
        return army_values[0]
    return raw


def _parse_entries(block: str, label: str) -> list[tuple[int, int]]:
    """
    Parse a dash-separated block of "{count}x{id}" entries.

    Returns a list of (count, id) tuples.
    Raises ArmyLinkParseError on malformed entries.
    """
    results: list[tuple[int, int]] = []
    for raw_entry in block.split("-"):
        raw_entry = raw_entry.strip()
        if not raw_entry:
            continue
        m = _ENTRY_RE.match(raw_entry)
        if not m:
            raise ArmyLinkParseError(
                f"Malformed {label} entry {raw_entry!r}. "
                f"Expected format: {{count}}x{{id}}, e.g. 10x0"
            )
        results.append((int(m.group("count")), int(m.group("id"))))
    return results


def _resolve_troops(
    entries: list[tuple[int, int]],
    unknown_ids: list[int],
) -> tuple[list[TroopSlot], list[SiegeMachine]]:
    """
    Map (count, id) tuples into TroopSlots and SiegeMachines.
    IDs >= _SIEGE_U_BLOCK_OFFSET are remapped to the siege registry.
    Unknown IDs are collected into unknown_ids for caller diagnostics.
    """
    troops: list[TroopSlot] = []
    sieges: list[SiegeMachine] = []

    for count, unit_id in entries:
        # Siege encoded inside u-block (old format: id = 1000 + siege_id)
        if unit_id >= _SIEGE_U_BLOCK_OFFSET:
            siege_id = unit_id - _SIEGE_U_BLOCK_OFFSET
            meta = lookup_siege(siege_id)
            if meta:
                sieges.append(SiegeMachine(id=siege_id, name=meta.name, level=1))
            else:
                unknown_ids.append(unit_id)
            continue

        meta = lookup_troop(unit_id)
        if meta is None:
            unknown_ids.append(unit_id)
            continue

        troops.append(
            TroopSlot(
                id=unit_id,
                name=meta.name,
                count=count,
                level=1,                          # level not encoded in share links
                super_troop_is_active=(
                    meta.super_of is not None
                ),
            )
        )

    return troops, sieges


def _resolve_spells(
    entries: list[tuple[int, int]],
    unknown_ids: list[int],
) -> list[SpellSlot]:
    spells: list[SpellSlot] = []
    for count, spell_id in entries:
        meta = lookup_spell(spell_id)
        if meta is None:
            unknown_ids.append(spell_id)
            continue
        spells.append(SpellSlot(id=spell_id, name=meta.name, count=count, level=1))
    return spells


def _resolve_sieges(
    entries: list[tuple[int, int]],
    unknown_ids: list[int],
) -> list[SiegeMachine]:
    sieges: list[SiegeMachine] = []
    for count, siege_id in entries:
        meta = lookup_siege(siege_id)
        if meta is None:
            unknown_ids.append(siege_id)
            continue
        sieges.append(SiegeMachine(id=siege_id, name=meta.name, level=1))
    return sieges[:1]  # Only the first siege machine is valid per attack


def _compute_housing_space(troops: list[TroopSlot]) -> int:
    """Sum housing space for all troop slots."""
    total = 0
    for slot in troops:
        meta = lookup_troop(slot.id)
        if meta:
            total += meta.housing_space * slot.count
    return total


def _compute_spell_space(spells: list[SpellSlot]) -> int:
    """Sum spell housing space for all spell slots."""
    total = 0
    for slot in spells:
        meta = lookup_spell(slot.id)
        if meta:
            total += meta.housing_space * slot.count
    return total


def validate_army_capacity(army: ParsedArmy, town_hall: int = MAX_TOWN_HALL) -> bool:
    """
    Check whether a ParsedArmy's troop housing, spell space, and siege machine
    count fit within the capacity limits of the specified Town Hall (1–18).
    """
    cap = lookup_army_capacity(town_hall)
    troop_space = (
        army.total_housing_space
        if army.total_housing_space is not None
        else _compute_housing_space(army.troops)
    )
    spell_space = (
        army.total_spell_space
        if army.total_spell_space is not None
        else _compute_spell_space(army.spells)
    )
    siege_count = len(army.sieges)

    return (
        troop_space <= cap.max_troop_housing
        and spell_space <= cap.max_spell_capacity
        and siege_count <= cap.max_siege_machines
    )


def _attach_hero_context(
    hero_equipment: list[HeroEquipmentSlot],
    player: PlayerProfile,
) -> list[HeroEquipmentSlot]:
    """
    Enrich the parsed army's hero equipment slots with the player's currently
    equipped items from their live profile, preserving exact equipment levels.

    Strategy:
      - Deduplicate player.heroes by hero name first (defensive guard against
        malformed profiles that repeat the same hero — each name is canonical).
      - For each unique hero, emit one HeroEquipmentSlot per equipped item.
      - This REPLACES any hero_equipment derived from the raw army string
        (the army link does not encode hero equipment).
    """
    slots: list[HeroEquipmentSlot] = []

    # Deduplicate heroes by name; last occurrence wins (matches CoC API behaviour
    # where the most-recently patched entry is authoritative).
    unique_heroes: dict = {}
    for hero in player.heroes:
        if hero.name not in unique_heroes:
            unique_heroes[hero.name] = hero

    for hero in unique_heroes.values():
        for equip in hero.equipment:
            slots.append(
                HeroEquipmentSlot(
                    hero=hero.name,
                    equipment_name=equip.name,
                    equipment_level=equip.level,
                )
            )
    return slots


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

@dataclass
class ParseResult:
    """Return value of parse_army_link()."""
    army: ParsedArmy
    unknown_unit_ids: list[int] = field(default_factory=list)
    unknown_spell_ids: list[int] = field(default_factory=list)
    unknown_siege_ids: list[int] = field(default_factory=list)
    town_hall_level: int = MAX_TOWN_HALL

    @property
    def has_unknowns(self) -> bool:
        return bool(
            self.unknown_unit_ids
            or self.unknown_spell_ids
            or self.unknown_siege_ids
        )

    @property
    def exceeds_capacity(self) -> bool:
        """True if troop, spell, or siege count exceeds the Town Hall capacity."""
        return not validate_army_capacity(self.army, self.town_hall_level)


def parse_army_link(
    raw: str,
    player: Optional[PlayerProfile] = None,
    *,
    town_hall: Optional[int] = None,
) -> ParseResult:
    """
    Parse a CoC army share URL or bare army string into a structured ParsedArmy.

    Parameters
    ----------
    raw:
        A full army share URL or bare army string (e.g. "u10x0-5x3s3x0").
    player:
        Optional enriched player profile. When provided, hero equipment slots
        are populated from the player's currently equipped items (the army
        share link itself does not carry hero equipment).
    town_hall:
        Optional Town Hall level (1–18). Defaults to `player.town_hall_level`
        if `player` is provided, otherwise `MAX_TOWN_HALL` (18).

    Returns
    -------
    ParseResult
        Contains the parsed ParsedArmy and any unknown IDs that could not be
        resolved against the registry (useful for detecting new game units).

    Raises
    ------
    ArmyLinkParseError
        On malformed input that cannot be parsed at all.
    """
    effective_th = (
        town_hall
        if town_hall is not None
        else (player.town_hall_level if player is not None else MAX_TOWN_HALL)
    )
    if effective_th < MIN_TOWN_HALL or effective_th > MAX_TOWN_HALL:
        raise ValueError(
            f"Invalid Town Hall level {effective_th}. Valid range: {MIN_TOWN_HALL}–{MAX_TOWN_HALL}."
        )

    # ── Guard: reject empty or whitespace-only input before any URL parsing
    if not raw or not raw.strip():
        raise ArmyLinkParseError(
            "Army link or share code cannot be empty or whitespace."
        )

    army_str = _extract_army_string(raw)

    if not army_str:
        raise ArmyLinkParseError(
            "Army string is empty after extracting URL query parameter. "
            "Expected format: 'u{units}s{spells}'"
        )

    # Full BattleLog `armyShareCode` format (starts with h, i, or d)
    if army_str[0].lower() in ("h", "i", "d") and any(
        ch in army_str.lower() for ch in ("h", "i", "d", "u", "s")
    ):
        decoded = parse_army_share_code(army_str)
        troops = [
            TroopSlot(
                id=int(t["id"]),
                name=str(t["name"]),
                count=int(t["count"]),
                level=1,
                super_troop_is_active=bool(t.get("superTroopIsActive", False)),
            )
            for t in decoded["troops"]
            if not t.get("unknown")
        ]
        spells = [
            SpellSlot(
                id=int(s["id"]),
                name=str(s["name"]),
                count=int(s["count"]),
                level=1,
            )
            for s in decoded["spells"]
            if not s.get("unknown")
        ]
        final_sieges = [
            SiegeMachine(
                id=int(sg["id"]),
                name=str(sg["name"]),
                level=1,
            )
            for sg in decoded["siegeMachines"][:1]
            if not sg.get("unknown")
        ]
        hero_equipment: list[HeroEquipmentSlot] = []
        if player is not None:
            hero_equipment = _attach_hero_context(hero_equipment, player)
        else:
            valid_hero_names = {hn.value: hn for hn in HeroName}
            for h_obj in decoded["heroes"]:
                h_enum = valid_hero_names.get(str(h_obj.get("name", "")))
                if h_enum:
                    for eq_obj in h_obj.get("equipment", []):
                        if not eq_obj.get("unknown"):
                            hero_equipment.append(
                                HeroEquipmentSlot(
                                    hero=h_enum,
                                    equipment_name=str(eq_obj["name"]),
                                    equipment_level=1,
                                )
                            )

        unknown_unit_ids = [
            int(u["id"]) for u in decoded["unknownIds"] if u["section"] in ("u", "i")
        ]
        unknown_spell_ids = [
            int(u["id"]) for u in decoded["unknownIds"] if u["section"] in ("s", "d")
        ]
        army = ParsedArmy(
            troops=troops,
            spells=spells,
            sieges=final_sieges,
            hero_equipment=hero_equipment,
            army_share_code=army_str,
            total_housing_space=int(decoded["totalTroopHousing"]),
            total_spell_space=int(decoded["totalSpellSpace"]),
        )
        return ParseResult(
            army=army,
            unknown_unit_ids=unknown_unit_ids,
            unknown_spell_ids=unknown_spell_ids,
            unknown_siege_ids=[],
            town_hall_level=effective_th,
        )

    m = _ARMY_PARAM_RE.match(army_str.lower())
    if m is None:
        raise ArmyLinkParseError(
            f"Army string {army_str!r} does not match expected format "
            f"'u{{units}}s{{spells}}' or 'u{{units}}s{{spells}}e{{sieges}}'."
        )

    units_block  = m.group("units")  or ""
    spells_block = m.group("spells") or ""
    sieges_block = m.group("sieges") or ""

    unknown_unit_ids: list[int] = []
    unknown_spell_ids: list[int] = []
    unknown_siege_ids: list[int] = []

    # Parse units block (troops + possible siege fallback encoding)
    troop_entries = _parse_entries(units_block, "unit") if units_block else []
    troops, sieges_from_u = _resolve_troops(troop_entries, unknown_unit_ids)

    # Parse spells block
    spell_entries = _parse_entries(spells_block, "spell") if spells_block else []
    spells = _resolve_spells(spell_entries, unknown_spell_ids)

    # Parse explicit siege block (e-prefix in newer link format)
    siege_entries = _parse_entries(sieges_block, "siege") if sieges_block else []
    sieges_from_e = _resolve_sieges(siege_entries, unknown_siege_ids)

    # Merge sieges; e-block takes priority, then u-block fallback
    final_sieges = (sieges_from_e or sieges_from_u)[:1]

    # Hero equipment: populated from player profile (not encoded in share link)
    hero_equipment: list[HeroEquipmentSlot] = []
    if player is not None:
        hero_equipment = _attach_hero_context(hero_equipment, player)

    # Compute total housing space & spell space
    housing_space = _compute_housing_space(troops)
    spell_space = _compute_spell_space(spells)

    army = ParsedArmy(
        troops=troops,
        spells=spells,
        sieges=final_sieges,
        hero_equipment=hero_equipment,
        army_share_code=army_str,
        total_housing_space=housing_space,
        total_spell_space=spell_space,
    )

    return ParseResult(
        army=army,
        unknown_unit_ids=unknown_unit_ids,
        unknown_spell_ids=unknown_spell_ids,
        unknown_siege_ids=unknown_siege_ids,
        town_hall_level=effective_th,
    )


COC_ARMY_LINK_BASE = "https://link.clashofclans.com/en/?action=CopyArmy&army="


def build_copy_army_link(code: str) -> str:
    """
    Build the official Clash of Clans CopyArmy link from a raw `armyShareCode`.
    Does NOT URL-encode `code`; appends `code` verbatim as required by the game client.
    """
    if not code or not str(code).strip():
        return ""
    clean = str(code).strip()
    if clean.startswith("http"):
        clean = _extract_army_string(clean)
    return f"https://link.clashofclans.com/en/?action=CopyArmy&army={clean}"


# Alias matching the frontend helper name
buildCopyArmyLink = build_copy_army_link


def build_army_link(
    troops: list[tuple[int, int]] | list[TroopSlot],
    spells: list[tuple[int, int]] | list[SpellSlot] | None = None,
    sieges: list[tuple[int, int]] | list[SiegeMachine] | None = None,
) -> str:
    """
    Build a canonical in-game Clash of Clans CopyArmy share URL from troop,
    spell, and siege machine entries.

    Each entry in `troops`, `spells`, or `sieges` can be either a
    `(count, unit_id)` tuple or a `TroopSlot` / `SpellSlot` / `SiegeMachine`.
    """
    u_parts: list[str] = []
    for entry in troops:
        if isinstance(entry, TroopSlot):
            if entry.count > 0:
                u_parts.append(f"{entry.count}x{entry.id}")
        else:
            count, unit_id = entry
            if count > 0:
                u_parts.append(f"{count}x{unit_id}")

    s_parts: list[str] = []
    for entry in (spells or []):
        if isinstance(entry, SpellSlot):
            if entry.count > 0:
                s_parts.append(f"{entry.count}x{entry.id}")
        else:
            count, spell_id = entry
            if count > 0:
                s_parts.append(f"{count}x{spell_id}")

    e_parts: list[str] = []
    for entry in (sieges or [])[:1]:
        if isinstance(entry, SiegeMachine):
            if entry.count > 0:
                e_parts.append(f"{entry.count}x{entry.id}")
        else:
            count, siege_id = entry
            if count > 0:
                e_parts.append(f"{count}x{siege_id}")

    army_code = ""
    if u_parts:
        army_code += "u" + "-".join(u_parts)
    if s_parts:
        army_code += "s" + "-".join(s_parts)
    if e_parts:
        army_code += "e" + "-".join(e_parts)

    if not army_code:
        raise ArmyLinkParseError("Cannot build an army link with zero units, spells, and sieges.")

    return build_copy_army_link(army_code)


# ---------------------------------------------------------------------------
# ClashKing Static Data Registry & Full `armyShareCode` Decoder
# ---------------------------------------------------------------------------

import json
import logging
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

_STATIC_DATA_PATH = Path(__file__).resolve().parent / "clashking_static_data.json"


def _load_clashking_registries() -> dict[str, dict[int, dict[str, Any]]]:
    raw_data = json.loads(_STATIC_DATA_PATH.read_text(encoding="utf-8"))
    troops_by_id: dict[int, dict[str, Any]] = {}
    for t in raw_data.get("troops", []):
        # Prefer home village entry if duplicate IDs exist
        tid = int(t["id"])
        if tid not in troops_by_id or t.get("village") == "home":
            troops_by_id[tid] = t

    spells_by_id: dict[int, dict[str, Any]] = {
        int(s["id"]): s for s in raw_data.get("spells", [])
    }
    heroes_by_id: dict[int, dict[str, Any]] = {
        int(h["id"]): h for h in raw_data.get("heroes", [])
    }
    pets_by_id: dict[int, dict[str, Any]] = {
        int(p["id"]): p for p in raw_data.get("pets", [])
    }
    equipment_by_id: dict[int, dict[str, Any]] = {
        int(e["id"]): e for e in raw_data.get("equipment", [])
    }
    return {
        "troops": troops_by_id,
        "spells": spells_by_id,
        "heroes": heroes_by_id,
        "pets": pets_by_id,
        "equipment": equipment_by_id,
    }


CLASHKING_REGISTRIES = _load_clashking_registries()


def get_valid_super_troops() -> dict[int, str]:
    """
    Returns valid Super Troops strictly from ClashKing static game data,
    excluding Rocket Balloon (and ID 57) per specification.
    """
    troops = CLASHKING_REGISTRIES["troops"]
    res: dict[int, str] = {}
    for tid, meta in troops.items():
        name = str(meta.get("name", "")).strip()
        if (
            (meta.get("super_troop") is not None or name.startswith("Super "))
            and name != "Rocket Balloon"
            and tid != 57
        ):
            res[tid] = name
    return res


_ARMY_SHARE_SECTION_RE = re.compile(
    r"h(?P<heroes>[^idus]+)"
    r"|i(?P<castle_troops>[\dx\-]+)"
    r"|d(?P<castle_spells>[\dx\-]+)"
    r"|u(?P<units>[\dx\-]+)"
    r"|s(?P<spells>[\dx\-]+)",
    re.IGNORECASE,
)

_HERO_SHARE_ENTRY_RE = re.compile(
    r"^(?P<hero_id>\d+)"
    r"(?:m(?P<mode>\d+))?"
    r"(?:p(?P<pet_id>\d+))?"
    r"(?:e(?P<eq1>\d+)(?:_(?P<eq2>\d+))?)?$",
    re.IGNORECASE,
)


def derive_army_name(troops: List[Dict[str, Any]], max_units: int = 3) -> str:
    """
    Generate a rule-based, explainable army name from the decoded troops:
    picks the top 2–3 troops that occupy the most total housing space
    (`count * housingSpace`).
    Returns 'Ordu tespit edilemedi' if `troops` is empty.
    """
    valid_troops = [
        t for t in troops
        if not t.get("unknown") and int(t.get("count", 0)) > 0
    ]
    if not valid_troops:
        return "Ordu tespit edilemedi"

    sorted_troops = sorted(
        valid_troops,
        key=lambda x: (int(x.get("totalHousingSpace", 0)), int(x.get("count", 0))),
        reverse=True,
    )
    # Pick top 2-3 units that contribute substantial housing space (>= 14 housing space)
    major = [t for t in sorted_troops if int(t.get("totalHousingSpace", 0)) >= 14]
    chosen = (major[:max_units] if len(major) >= 2 else sorted_troops[: min(2, len(sorted_troops))])
    return " + ".join(str(t["name"]) for t in chosen)


def parse_army_share_code(raw_code: str) -> Dict[str, Any]:
    """
    Decode an official Clash of Clans battlelog `armyShareCode` into its
    constituent sections using ClashKing static game data (`clashking_static_data.json`):
      - `h`: Heroes (`hero_id`, optional `pet_id`, optional `eq1_eq2`)
      - `i`: Clan Castle troops & Siege Machines
      - `d`: Clan Castle spells (or troops)
      - `u`: Main army troops (and Workshop Siege Machine if encoded in `u`)
      - `s`: Main army spells

    Never guesses or fabricates any unknown ID. Any unrecognised ID is formatted
    as `"Bilinmeyen (ID: {id})"`, logged via `logger.warning`, and recorded in
    `unknownIds`.
    """
    if not raw_code or not str(raw_code).strip():
        return {
            "armyShareCode": "",
            "armyLink": "",
            "armyName": "Ordu tespit edilemedi",
            "heroes": [],
            "siegeMachines": [],
            "clanCastle": [],
            "clanCastleTroops": [],
            "clanCastleSpells": [],
            "troops": [],
            "spells": [],
            "totalTroopHousing": 0,
            "totalSpellSpace": 0,
            "unknownIds": [],
        }

    code = str(raw_code).strip()
    if code.startswith("http"):
        code = _extract_army_string(code)

    troops_reg = CLASHKING_REGISTRIES["troops"]
    spells_reg = CLASHKING_REGISTRIES["spells"]
    heroes_reg = CLASHKING_REGISTRIES["heroes"]
    pets_reg = CLASHKING_REGISTRIES["pets"]
    eq_reg = CLASHKING_REGISTRIES["equipment"]

    heroes: List[Dict[str, Any]] = []
    siege_machines: List[Dict[str, Any]] = []
    cc_troops: List[Dict[str, Any]] = []
    cc_spells: List[Dict[str, Any]] = []
    troops: List[Dict[str, Any]] = []
    spells: List[Dict[str, Any]] = []
    unknown_ids: List[Dict[str, Any]] = []

    for match in _ARMY_SHARE_SECTION_RE.finditer(code):
        if match.group("heroes"):
            for hero_token in match.group("heroes").split("-"):
                hero_token = hero_token.strip()
                if not hero_token:
                    continue
                hm = _HERO_SHARE_ENTRY_RE.match(hero_token)
                if not hm:
                    logger.warning("Malformed hero token in armyShareCode: %s", hero_token)
                    continue

                hid = int(hm.group("hero_id"))
                h_meta = heroes_reg.get(hid)
                if h_meta is None:
                    h_name = f"Bilinmeyen (ID: {hid})"
                    logger.warning("Unknown hero ID in armyShareCode: %d", hid)
                    unknown_ids.append({"section": "h", "type": "hero", "id": hid})
                else:
                    h_name = h_meta["name"]

                pet_obj: Optional[Dict[str, Any]] = None
                if hm.group("pet_id") is not None:
                    pid = int(hm.group("pet_id"))
                    p_meta = pets_reg.get(pid)
                    if p_meta is None:
                        p_name = f"Bilinmeyen (ID: {pid})"
                        logger.warning("Unknown pet ID in armyShareCode: %d", pid)
                        unknown_ids.append({"section": "p", "type": "pet", "id": pid})
                        pet_obj = {"id": pid, "name": p_name, "unknown": True}
                    else:
                        pet_obj = {"id": pid, "name": p_meta["name"], "unknown": False}

                eq_list: List[Dict[str, Any]] = []
                for eq_group in ("eq1", "eq2"):
                    if hm.group(eq_group) is not None:
                        eid = int(hm.group(eq_group))
                        e_meta = eq_reg.get(eid)
                        if e_meta is None:
                            e_name = f"Bilinmeyen (ID: {eid})"
                            logger.warning("Unknown equipment ID in armyShareCode: %d", eid)
                            unknown_ids.append({"section": "e", "type": "equipment", "id": eid})
                            eq_list.append({
                                "id": eid,
                                "name": e_name,
                                "rarity": "Unknown",
                                "unknown": True,
                            })
                        else:
                            eq_list.append({
                                "id": eid,
                                "name": e_meta["name"],
                                "rarity": e_meta.get("rarity", "Common"),
                                "unknown": False,
                            })

                heroes.append({
                    "id": hid,
                    "name": h_name,
                    "pet": pet_obj,
                    "equipment": eq_list,
                    "unknown": h_meta is None,
                })

        elif match.group("castle_troops"):
            for count, uid in _parse_entries(match.group("castle_troops"), "castle_troop"):
                t_meta = troops_reg.get(uid)
                if t_meta is None:
                    u_name = f"Bilinmeyen (ID: {uid})"
                    logger.warning("Unknown unit ID in armyShareCode section 'i': %d", uid)
                    unknown_ids.append({"section": "i", "type": "unit", "id": uid})
                    cc_troops.append({
                        "id": uid,
                        "name": u_name,
                        "count": count,
                        "housingSpace": 0,
                        "totalHousingSpace": 0,
                        "category": "troop",
                        "unknown": True,
                    })
                elif t_meta.get("production_building") == "Workshop":
                    siege_machines.append({
                        "id": uid,
                        "name": t_meta["name"],
                        "count": count,
                        "unknown": False,
                    })
                else:
                    hs = int(t_meta.get("housing_space") or 1)
                    cc_troops.append({
                        "id": uid,
                        "name": t_meta["name"],
                        "count": count,
                        "housingSpace": hs,
                        "totalHousingSpace": hs * count,
                        "category": "troop",
                        "unknown": False,
                    })

        elif match.group("castle_spells"):
            for count, did in _parse_entries(match.group("castle_spells"), "castle_spell"):
                s_meta = spells_reg.get(did)
                if s_meta is not None:
                    hs = int(s_meta.get("housing_space") or 1)
                    cc_spells.append({
                        "id": did,
                        "name": s_meta["name"],
                        "count": count,
                        "housingSpace": hs,
                        "totalSpellSpace": hs * count,
                        "category": "spell",
                        "unknown": False,
                    })
                else:
                    t_meta = troops_reg.get(did)
                    if t_meta is not None:
                        hs = int(t_meta.get("housing_space") or 1)
                        cc_troops.append({
                            "id": did,
                            "name": t_meta["name"],
                            "count": count,
                            "housingSpace": hs,
                            "totalHousingSpace": hs * count,
                            "category": "troop",
                            "unknown": False,
                        })
                    else:
                        u_name = f"Bilinmeyen (ID: {did})"
                        logger.warning("Unknown ID in armyShareCode section 'd': %d", did)
                        unknown_ids.append({"section": "d", "type": "castle", "id": did})
                        cc_spells.append({
                            "id": did,
                            "name": u_name,
                            "count": count,
                            "housingSpace": 0,
                            "totalSpellSpace": 0,
                            "category": "unknown",
                            "unknown": True,
                        })

        elif match.group("units"):
            for count, uid in _parse_entries(match.group("units"), "unit"):
                t_meta = troops_reg.get(uid)
                if t_meta is None:
                    u_name = f"Bilinmeyen (ID: {uid})"
                    logger.warning("Unknown troop ID in armyShareCode section 'u': %d", uid)
                    unknown_ids.append({"section": "u", "type": "troop", "id": uid})
                    troops.append({
                        "id": uid,
                        "name": u_name,
                        "count": count,
                        "housingSpace": 0,
                        "totalHousingSpace": 0,
                        "superTroopIsActive": False,
                        "unknown": True,
                    })
                elif t_meta.get("production_building") == "Workshop":
                    siege_machines.append({
                        "id": uid,
                        "name": t_meta["name"],
                        "count": count,
                        "unknown": False,
                    })
                else:
                    hs = int(t_meta.get("housing_space") or 1)
                    is_super = bool(
                        (t_meta.get("super_troop") is not None or t_meta["name"].startswith("Super "))
                        and t_meta["name"] != "Rocket Balloon"
                        and uid != 57
                    )
                    troops.append({
                        "id": uid,
                        "name": t_meta["name"],
                        "count": count,
                        "housingSpace": hs,
                        "totalHousingSpace": hs * count,
                        "superTroopIsActive": is_super,
                        "unknown": False,
                    })

        elif match.group("spells"):
            for count, sid in _parse_entries(match.group("spells"), "spell"):
                s_meta = spells_reg.get(sid)
                if s_meta is None:
                    s_name = f"Bilinmeyen (ID: {sid})"
                    logger.warning("Unknown spell ID in armyShareCode section 's': %d", sid)
                    unknown_ids.append({"section": "s", "type": "spell", "id": sid})
                    spells.append({
                        "id": sid,
                        "name": s_name,
                        "count": count,
                        "housingSpace": 0,
                        "totalSpellSpace": 0,
                        "unknown": True,
                    })
                else:
                    hs = int(s_meta.get("housing_space") or 1)
                    spells.append({
                        "id": sid,
                        "name": s_meta["name"],
                        "count": count,
                        "housingSpace": hs,
                        "totalSpellSpace": hs * count,
                        "unknown": False,
                    })

    total_troop_housing = sum(int(t.get("totalHousingSpace", 0)) for t in troops)
    total_spell_space = sum(int(s.get("totalSpellSpace", 0)) for s in spells)
    clan_castle_combined = cc_troops + cc_spells
    army_name = derive_army_name(troops)

    # Signature of main troops (sorted by id) for grouping identical army compositions in Meta analysis
    troop_signature = "-".join(
        f"{t['count']}x{t['id']}"
        for t in sorted(troops, key=lambda x: int(x["id"]))
        if not t.get("unknown")
    )

    return {
        "armyShareCode": code,
        "armyLink": build_copy_army_link(code),
        "armyName": army_name,
        "troopSignature": troop_signature,
        "heroes": heroes,
        "siegeMachines": siege_machines,
        "clanCastle": clan_castle_combined,
        "clanCastleTroops": cc_troops,
        "clanCastleSpells": cc_spells,
        "troops": troops,
        "spells": spells,
        "totalTroopHousing": total_troop_housing,
        "totalSpellSpace": total_spell_space,
        "unknownIds": unknown_ids,
    }


