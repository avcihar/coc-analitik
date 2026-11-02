"""
Clash of Clans Army Parser & Army Inference Engine Package
==========================================================
"""

from services.army_parser.inference import (
    InferredArmyResult,
    META_ARCHETYPES,
    infer_player_army,
)
from services.army_parser.parser import (
    ArmyLinkParseError,
    COC_ARMY_LINK_BASE,
    ParseResult,
    build_army_link,
    parse_army_link,
    validate_army_capacity,
)

__all__ = [
    "ArmyLinkParseError",
    "COC_ARMY_LINK_BASE",
    "InferredArmyResult",
    "META_ARCHETYPES",
    "ParseResult",
    "build_army_link",
    "infer_player_army",
    "parse_army_link",
    "validate_army_capacity",
]

