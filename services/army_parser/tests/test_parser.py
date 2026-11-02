"""
Army Parser — Unit Tests
========================
Strict test suite covering:
  - Happy path: full URL with troops + spells + siege (e-prefix)
  - Happy path: bare army string
  - Super troop detection
  - Empty spells block
  - Max troop capacity (320 housing = 10× 32-space Electro Titans)
  - Siege machine variations (u-block fallback vs e-prefix, max 1)
  - Hero equipment attachment from player profile
  - Unknown / future unit IDs (should not raise, just report)
  - Malformed input (should raise ArmyLinkParseError)
  - Duplicate hero equipment guard from Pydantic model

Run with:
    python -m pytest services/army_parser/tests/test_parser.py -v
"""

from __future__ import annotations

import sys
import os

# Allow running from repo root without package install
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

import pytest
from datetime import datetime, timezone

from services.army_parser.parser import ArmyLinkParseError, parse_army_link
from schemas.pydantic.coc_models import (
    Hero,
    HeroEquipment,
    HeroName,
    EquipmentRarity,
    PlayerProfile,
    Pet,
    PetName,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

NOW = datetime(2026, 9, 8, 16, 0, 0, tzinfo=timezone.utc)

def _make_minimal_player(
    tag: str = "AAABBB",
    heroes: list[Hero] | None = None,
) -> PlayerProfile:
    """Build the smallest valid PlayerProfile for parser enrichment tests."""
    return PlayerProfile(
        tag=tag,
        name="TestPlayer",
        exp_level=250,
        town_hall_level=16,
        trophies=6000,
        best_trophies=6500,
        war_stars=2000,
        heroes=heroes or [],
        heroEquipmentPets=[],
        last_scouted_at=NOW,
    )


def _make_hero(name: HeroName, equipment: list[HeroEquipment]) -> Hero:
    return Hero(name=name, level=90, max_level=90, equipment=equipment)


def _make_equip(name: str, level: int = 18, rarity: EquipmentRarity = EquipmentRarity.EPIC) -> HeroEquipment:
    return HeroEquipment(name=name, level=level, max_level=27, rarity=rarity)


# ---------------------------------------------------------------------------
# 1 · Happy Path: Full URL with troops + spells
# ---------------------------------------------------------------------------

class TestFullUrl:
    URL = (
        "https://link.clashofclans.com/en"
        "?action=CopyArmy"
        "&army=u10x0-5x3-2x4s3x0-2x1-1x2"
    )

    def test_troops_resolved(self):
        result = parse_army_link(self.URL)
        troop_names = {t.name for t in result.army.troops}
        assert "Barbarian" in troop_names
        assert "Giant" in troop_names
        assert "Wall Breaker" in troop_names

    def test_troops_counts(self):
        result = parse_army_link(self.URL)
        troops_by_name = {t.name: t for t in result.army.troops}
        assert troops_by_name["Barbarian"].count == 10
        assert troops_by_name["Giant"].count == 5
        assert troops_by_name["Wall Breaker"].count == 2

    def test_spells_resolved(self):
        result = parse_army_link(self.URL)
        spell_names = {s.name for s in result.army.spells}
        assert "Lightning Spell" in spell_names
        assert "Healing Spell" in spell_names
        assert "Rage Spell" in spell_names

    def test_spells_counts(self):
        result = parse_army_link(self.URL)
        spells_by_name = {s.name: s for s in result.army.spells}
        assert spells_by_name["Lightning Spell"].count == 3
        assert spells_by_name["Healing Spell"].count == 2
        assert spells_by_name["Rage Spell"].count == 1

    def test_no_unknowns(self):
        result = parse_army_link(self.URL)
        assert not result.has_unknowns

    def test_army_share_code_stored(self):
        result = parse_army_link(self.URL)
        # share code should be the bare army string, not the full URL
        assert result.army.army_share_code == "u10x0-5x3-2x4s3x0-2x1-1x2"


# ---------------------------------------------------------------------------
# 2 · Happy Path: Bare Army String
# ---------------------------------------------------------------------------

class TestBareArmyString:
    def test_bare_string_parses(self):
        result = parse_army_link("u1x8s1x2")  # 1 Dragon, 1 Rage Spell
        assert result.army.troops[0].name == "Dragon"
        assert result.army.spells[0].name == "Rage Spell"

    def test_case_insensitive_prefix(self):
        # Supercell generates uppercase; guard against mixed-case inputs
        result = parse_army_link("U1x0S1x0")
        assert result.army.troops[0].name == "Barbarian"
        assert result.army.spells[0].name == "Lightning Spell"


# ---------------------------------------------------------------------------
# 3 · Super Troop Detection
# ---------------------------------------------------------------------------

class TestSuperTroops:
    def test_super_barbarian_flagged(self):
        result = parse_army_link("u10x50")  # Super Barbarian ID = 50
        assert result.army.troops[0].name == "Super Barbarian"
        assert result.army.troops[0].super_troop_is_active is True

    def test_normal_troop_not_flagged(self):
        result = parse_army_link("u10x0")
        assert result.army.troops[0].super_troop_is_active is False

    def test_sneaky_goblin(self):
        result = parse_army_link("u20x53")  # Sneaky Goblin
        assert result.army.troops[0].name == "Sneaky Goblin"
        assert result.army.troops[0].super_troop_is_active is True


# ---------------------------------------------------------------------------
# 4 · Empty Spells Block
# ---------------------------------------------------------------------------

class TestEmptySpells:
    def test_no_spells_key(self):
        result = parse_army_link("u5x3")  # no s-block at all
        assert result.army.spells == []

    def test_only_spells_no_troops(self):
        result = parse_army_link("s3x0")  # no u-block
        assert result.army.troops == []
        assert result.army.spells[0].name == "Lightning Spell"

    def test_empty_string_body_is_error(self):
        with pytest.raises(ArmyLinkParseError):
            parse_army_link("")


# ---------------------------------------------------------------------------
# 5 · Max Troop Capacity
# ---------------------------------------------------------------------------

class TestMaxTroopCapacity:
    # 10× Electro Titan (32 housing each) = 320 housing — max possible for TH16
    MAX_TITAN_ARMY = "u10x18"

    def test_max_army_resolves(self):
        result = parse_army_link(self.MAX_TITAN_ARMY)
        assert result.army.troops[0].name == "Electro Titan"
        assert result.army.troops[0].count == 10

    def test_housing_space_computed(self):
        result = parse_army_link(self.MAX_TITAN_ARMY)
        # 10 × 32 = 320
        assert result.army.total_housing_space == 320

    def test_mixed_max_army(self):
        # 1 Lava Hound (30) + 1 Electro Dragon (30) + ...
        result = parse_army_link("u1x23-1x15")  # Lava Hound + Electro Dragon
        names = {t.name for t in result.army.troops}
        assert "Lava Hound" in names
        assert "Electro Dragon" in names


# ---------------------------------------------------------------------------
# 6 · Siege Machine Variations
# ---------------------------------------------------------------------------

class TestSiegeMachines:
    def test_siege_e_prefix(self):
        result = parse_army_link("u5x3e1x0")  # 5 Giants + Wall Wrecker via e-prefix
        assert result.army.sieges[0].name == "Wall Wrecker"

    def test_siege_u_block_fallback(self):
        # ID 1000 = u-block siege index 0 = Wall Wrecker
        result = parse_army_link("u5x3-1x1000")
        assert result.army.sieges[0].name == "Wall Wrecker"

    def test_only_one_siege_kept(self):
        # Even if two sieges appear in the e-block, only the first is valid
        result = parse_army_link("u5x3e1x0-1x1")
        assert len(result.army.sieges) == 1
        assert result.army.sieges[0].name == "Wall Wrecker"

    def test_battle_blimp(self):
        result = parse_army_link("u5x3e1x1")
        assert result.army.sieges[0].name == "Battle Blimp"

    def test_log_launcher(self):
        result = parse_army_link("u5x3e1x4")
        assert result.army.sieges[0].name == "Log Launcher"

    def test_no_siege(self):
        result = parse_army_link("u5x3s2x0")
        assert result.army.sieges == []


# ---------------------------------------------------------------------------
# 7 · Hero Equipment Attachment from PlayerProfile
# ---------------------------------------------------------------------------

class TestHeroEquipmentAttachment:
    def _make_bk_equipped_player(self) -> PlayerProfile:
        bk = _make_hero(
            HeroName.BARBARIAN_KING,
            equipment=[
                _make_equip("Giant Gauntlet", level=18),
                _make_equip("Barbarian Puppet", level=25, rarity=EquipmentRarity.COMMON),
            ],
        )
        aq = _make_hero(
            HeroName.ARCHER_QUEEN,
            equipment=[
                _make_equip("Archer Puppet", level=22, rarity=EquipmentRarity.COMMON),
            ],
        )
        return _make_minimal_player(heroes=[bk, aq])

    def test_hero_equipment_populated_from_profile(self):
        player = self._make_bk_equipped_player()
        result = parse_army_link("u10x0s1x0", player=player)
        assert len(result.army.hero_equipment) == 3  # BK×2 + AQ×1

    def test_equipment_levels_carried_over(self):
        player = self._make_bk_equipped_player()
        result = parse_army_link("u10x0s1x0", player=player)
        gg = next(
            s for s in result.army.hero_equipment
            if s.equipment_name == "Giant Gauntlet"
        )
        assert gg.equipment_level == 18

    def test_no_player_no_hero_equipment(self):
        result = parse_army_link("u10x0s1x0")
        assert result.army.hero_equipment == []

    def test_hero_without_equipment(self):
        bk = _make_hero(HeroName.BARBARIAN_KING, equipment=[])
        player = _make_minimal_player("AAABBB", heroes=[bk])
        result = parse_army_link("u10x0", player=player)
        assert result.army.hero_equipment == []


# ---------------------------------------------------------------------------
# 8 · Unknown / Future Unit IDs
# ---------------------------------------------------------------------------

class TestUnknownIds:
    def test_unknown_troop_id_not_raised(self):
        # Should succeed and report the unknown ID
        result = parse_army_link("u5x999")
        assert 999 in result.unknown_unit_ids
        assert result.army.troops == []

    def test_unknown_spell_id_not_raised(self):
        result = parse_army_link("s5x99")
        assert 99 in result.unknown_spell_ids
        assert result.army.spells == []

    def test_mixed_known_unknown(self):
        # Known Barbarian + unknown ID 999
        result = parse_army_link("u10x0-5x999s1x0")
        known = [t for t in result.army.troops if t.name == "Barbarian"]
        assert len(known) == 1
        assert 999 in result.unknown_unit_ids

    def test_has_unknowns_flag(self):
        result = parse_army_link("u5x999")
        assert result.has_unknowns is True

    def test_no_unknowns_flag_on_clean_parse(self):
        result = parse_army_link("u10x0s1x0")
        assert result.has_unknowns is False


# ---------------------------------------------------------------------------
# 9 · Malformed Input
# ---------------------------------------------------------------------------

class TestMalformedInput:
    def test_invalid_entry_format(self):
        with pytest.raises(ArmyLinkParseError, match="Malformed"):
            parse_army_link("u10-5")  # missing 'x' separator

    def test_url_without_army_param(self):
        with pytest.raises(ArmyLinkParseError, match="No 'army'"):
            parse_army_link("https://link.clashofclans.com/en?action=CopyArmy")

    def test_completely_invalid_string(self):
        with pytest.raises(ArmyLinkParseError):
            parse_army_link("not_an_army_string_at_all!!")

    def test_whitespace_only(self):
        with pytest.raises(ArmyLinkParseError):
            parse_army_link("   ")


# ---------------------------------------------------------------------------
# 10 · Pydantic-Level Integrity Guards
# ---------------------------------------------------------------------------

class TestPydanticGuards:
    def test_siege_count_exceeds_one_raises(self):
        """ParsedArmy itself enforces max 1 siege via Pydantic validator."""
        from schemas.pydantic.coc_models import ParsedArmy, SiegeMachine
        with pytest.raises(Exception):
            ParsedArmy(
                troops=[], spells=[],
                sieges=[
                    SiegeMachine(id=0, name="Wall Wrecker", level=1),
                    SiegeMachine(id=1, name="Battle Blimp", level=1),
                ],
                hero_equipment=[],
            )

    def test_th17_and_th18_player_profiles_valid(self):
        """PlayerProfile supports TH17 and TH18 and rejects TH19."""
        from schemas.pydantic.coc_models import (
            HERO_MAX_LEVEL_TH18,
            PET_MAX_LEVELS_BY_TH,
        )
        mp = Hero(
            name=HeroName.MINION_PRINCE,
            level=95,
            max_level=HERO_MAX_LEVEL_TH18[HeroName.MINION_PRINCE],
            equipment=[
                _make_equip("Dark Orb", level=18, rarity=EquipmentRarity.COMMON),
                _make_equip("Dark Crown", level=27, rarity=EquipmentRarity.EPIC),
            ],
        )
        p17 = PlayerProfile(
            tag="AAABBB",
            name="TH17Player",
            exp_level=260,
            town_hall_level=17,
            trophies=6000,
            best_trophies=6500,
            heroes=[mp],
            last_scouted_at=NOW,
        )
        p18 = PlayerProfile(
            tag="AAACCC",
            name="TH18Player",
            exp_level=280,
            town_hall_level=18,
            trophies=6400,
            best_trophies=6800,
            heroes=[mp],
            troops_pets=[Pet(name=PetName.SNEEZY, level=20, max_level=PET_MAX_LEVELS_BY_TH[18])],
            last_scouted_at=NOW,
        )
        assert p17.town_hall_level == 17
        assert p18.town_hall_level == 18
        assert p18.hero(HeroName.MINION_PRINCE) is not None
        assert p18.hero(HeroName.MINION_PRINCE).level == 95

        with pytest.raises(Exception):
            PlayerProfile(
                tag="AAADDD",
                name="InvalidTH19",
                exp_level=300,
                town_hall_level=19,
                trophies=6000,
                best_trophies=6500,
                last_scouted_at=NOW,
            )


class TestTH17AndTH18ArmyCapacities:
    def test_th17_and_th18_capacity_limits(self):
        from services.army_parser.unit_registry import lookup_army_capacity
        from services.army_parser.parser import validate_army_capacity

        cap17 = lookup_army_capacity(17)
        cap18 = lookup_army_capacity(18)

        assert cap17.max_troop_housing == 320
        assert cap17.max_spell_capacity == 11
        assert cap17.max_siege_machines == 1

        assert cap18.max_troop_housing == 340
        assert cap18.max_spell_capacity == 12
        assert cap18.max_siege_machines == 1

        # 340 troop space + 12 spell space + Troop Launcher (siege 7)
        # 17 Dragons (17 * 20 = 340) + 12 Freeze Spells (12 * 1 = 12) + 1 Troop Launcher
        res18 = parse_army_link("u17x8s12x3e1x7", town_hall=18)
        assert res18.army.total_housing_space == 340
        assert res18.army.total_spell_space == 12
        assert res18.army.sieges[0].name == "Troop Launcher"
        assert not res18.exceeds_capacity
        assert validate_army_capacity(res18.army, 18) is True
        # Exceeds TH17 (320 / 11)
        assert validate_army_capacity(res18.army, 17) is False

    def test_minion_prince_equipment_attached_in_parser(self):
        mp = Hero(
            name=HeroName.MINION_PRINCE,
            level=95,
            max_level=95,
            equipment=[
                _make_equip("Dark Orb", level=18, rarity=EquipmentRarity.COMMON),
                _make_equip("Henchman Puppet", level=18, rarity=EquipmentRarity.COMMON),
            ],
        )
        player = PlayerProfile(
            tag="AAABBB",
            name="TH18Prince",
            exp_level=280,
            town_hall_level=18,
            trophies=6200,
            best_trophies=6500,
            heroes=[mp],
            last_scouted_at=NOW,
        )
        res = parse_army_link("u10x19s1x15e1x7", player=player)
        assert res.town_hall_level == 18
        mp_equips = [
            s.equipment_name
            for s in res.army.hero_equipment
            if s.hero == HeroName.MINION_PRINCE
        ]
        assert mp_equips == ["Dark Orb", "Henchman Puppet"]


class TestOfficialArmyShareCodeParser:
    SAMPLE_CODE = (
        "h0p4e10_51-1p9e39_48-2p7e19_4-7p10e52_59"
        "i1x64-1x147"
        "d2x120-1x2"
        "u2x58-6x80-5x7-1x97-1x23-1x132-3x10-2x1-1x28-1x188-2x5"
        "s5x35-1x2-2x98"
    )

    def test_build_copy_army_link_no_encoding(self):
        from services.army_parser.parser import build_copy_army_link, buildCopyArmyLink

        link = build_copy_army_link(self.SAMPLE_CODE)
        assert link == f"https://link.clashofclans.com/en/?action=CopyArmy&army={self.SAMPLE_CODE}"
        assert buildCopyArmyLink(self.SAMPLE_CODE) == link
        assert "%5F" not in link

    def test_sample_army_share_code_decodes_all_sections_cleanly(self):
        from services.army_parser.parser import parse_army_share_code

        decoded = parse_army_share_code(self.SAMPLE_CODE)
        assert decoded["unknownIds"] == []
        assert decoded["armyLink"] == (
            f"https://link.clashofclans.com/en/?action=CopyArmy&army={self.SAMPLE_CODE}"
        )

        # Heroes: Barbarian King, Archer Queen, Grand Warden, Dragon Duke
        hero_names = [h["name"] for h in decoded["heroes"]]
        assert hero_names == [
            "Barbarian King",
            "Archer Queen",
            "Grand Warden",
            "Dragon Duke",
        ]
        assert decoded["heroes"][0]["pet"]["name"] == "Phoenix"
        assert [e["name"] for e in decoded["heroes"][0]["equipment"]] == [
            "Giant Gauntlet",
            "Stick Horse",
        ]
        assert decoded["heroes"][3]["pet"]["name"] == "Spirit Fox"
        assert [e["name"] for e in decoded["heroes"][3]["equipment"]] == [
            "Fire Heart",
            "Electro Fangs",
        ]

        # Siege machine: 1x Sky Wagon (ID 188)
        assert len(decoded["siegeMachines"]) == 1
        assert decoded["siegeMachines"][0]["name"] == "Sky Wagon"
        assert decoded["siegeMachines"][0]["count"] == 1

        # Clan Castle troops & spells
        cc_names = {c["name"]: c["count"] for c in decoded["clanCastle"]}
        assert cc_names == {
            "Super Valkyrie": 1,
            "Super Yeti": 1,
            "Totem Spell": 2,
            "Rage Spell": 1,
        }

        # Main troops & spells
        troop_counts = {t["name"]: t["count"] for t in decoded["troops"]}
        assert troop_counts == {
            "Ice Golem": 2,
            "Super Bowler": 6,
            "Healer": 5,
            "Apprentice Warden": 1,
            "Baby Dragon": 1,
            "Thrower": 1,
            "Minion": 3,
            "Archer": 2,
            "Super Wall Breaker": 1,
            "Balloon": 2,
        }
        spell_counts = {s["name"]: s["count"] for s in decoded["spells"]}
        assert spell_counts == {
            "Invisibility Spell": 5,
            "Rage Spell": 1,
            "Revive Spell": 2,
        }

        # Rule-based army name from top 3 housing-space troops:
        # Super Bowler (6*30=180), Healer (5*14=70), Ice Golem (2*15=30)
        assert decoded["armyName"] == "Super Bowler + Healer + Ice Golem"

    def test_unknown_id_never_guesses_and_formats_bilinmeyen(self):
        from services.army_parser.parser import parse_army_share_code

        decoded = parse_army_share_code("u2x999s1x888")
        assert decoded["troops"][0]["name"] == "Bilinmeyen (ID: 999)"
        assert decoded["troops"][0]["unknown"] is True
        assert decoded["spells"][0]["name"] == "Bilinmeyen (ID: 888)"
        assert decoded["spells"][0]["unknown"] is True
        assert {"section": "u", "type": "troop", "id": 999} in decoded["unknownIds"]
        assert {"section": "s", "type": "spell", "id": 888} in decoded["unknownIds"]

