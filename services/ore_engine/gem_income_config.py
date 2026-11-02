"""
Gem & Ore Income Configuration — Single Source of Truth
=======================================================
Centralized configuration for all Clash of Clans ore income streams:
  1. Multiplayer League Star Bonus (Daily, 37 League Tiers: 105000000 - 105000036)
  2. Regular Clan War (CW) Rewards & Loss Floor
  3. Clan War League (CWL) Rewards & Loss Floor
  4. Weekly Raid Medals Ore
  5. Bi-Monthly New Epic Equipment Injection & Event Pass/Medal Packages

Ore Tuple Order Everywhere: (Shiny/Parlak, Glowy/Işıltılı, Starry/Yıldızlı)
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

from services.ore_engine.equipment_costs import (
    EPIC_UPGRADE_COSTS,
    OreCost,
)


@dataclass(frozen=True, slots=True)
class LeagueTierInfo:
    """Represents a multiplayer league tier with its exact daily star bonus ore reward and icons."""
    id: int
    name: str          # English / API name from response JSON (e.g. "Legend I")
    name_tr: str       # Turkish name (e.g. "Efsane I")
    tier_number: int   # 0 to 36
    daily_shiny: int
    daily_glowy: int
    daily_starry: int
    icon_small: str = ""
    icon_large: str = ""
    is_unknown: bool = False

    @property
    def daily_reward(self) -> OreCost:
        return OreCost(self.daily_shiny, self.daily_glowy, self.daily_starry)


# ---------------------------------------------------------------------------
# 1. 37 Multiplayer League Tiers (Daily Star Bonus)
# ---------------------------------------------------------------------------
# IDs and names match official CoC API `leaguetiers` (105000000 - 105000036).
# Ordered strictly from lowest to highest tier.
# ---------------------------------------------------------------------------

LEAGUE_TIERS: List[LeagueTierInfo] = [
    LeagueTierInfo(105000000, "Unranked", "Sıralanmamış", 0, 0, 0, 0, "https://api-assets.clashofclans.com/leaguetiers/125/yyYo5DUFeFBZvmMEQh0ZxvG-1sUOZ_S3kDMB7RllXX0.png", "https://api-assets.clashofclans.com/leaguetiers/326/yyYo5DUFeFBZvmMEQh0ZxvG-1sUOZ_S3kDMB7RllXX0.png", is_unknown=True),
    LeagueTierInfo(105000001, "Skeleton League 1", "İskelet 1", 1, 790, 39, 1, "https://api-assets.clashofclans.com/leaguetiers/125/CiSJYHyhMuloCpIIJ3n5-xCnRWrEd9vcq_zu6Ahkl3o.png", "https://api-assets.clashofclans.com/leaguetiers/326/CiSJYHyhMuloCpIIJ3n5-xCnRWrEd9vcq_zu6Ahkl3o.png"),
    LeagueTierInfo(105000002, "Skeleton League 2", "İskelet 2", 2, 795, 39, 1, "https://api-assets.clashofclans.com/leaguetiers/125/CmM-Tihn6ojPGJstmTK_HC-QairrpYLyRhdKhQjkacQ.png", "https://api-assets.clashofclans.com/leaguetiers/326/CmM-Tihn6ojPGJstmTK_HC-QairrpYLyRhdKhQjkacQ.png"),
    LeagueTierInfo(105000003, "Skeleton League 3", "İskelet 3", 3, 800, 39, 1, "https://api-assets.clashofclans.com/leaguetiers/125/YMnWU25Xs2SvtAkVS2WDDbcUQY-PTfCK9OSvCKJnwJU.png", "https://api-assets.clashofclans.com/leaguetiers/326/YMnWU25Xs2SvtAkVS2WDDbcUQY-PTfCK9OSvCKJnwJU.png"),
    LeagueTierInfo(105000004, "Barbarian League 4", "Barbar 4", 4, 850, 44, 1, "https://api-assets.clashofclans.com/leaguetiers/125/CoTrW7nhyiNIDCI4WHUK-0BuhOxibwd_tfASdtmMWFE.png", "https://api-assets.clashofclans.com/leaguetiers/326/CoTrW7nhyiNIDCI4WHUK-0BuhOxibwd_tfASdtmMWFE.png"),
    LeagueTierInfo(105000005, "Barbarian League 5", "Barbar 5", 5, 855, 44, 1, "https://api-assets.clashofclans.com/leaguetiers/125/7Alm6gwA1lYoRn5m8vrXAfbTKIK2fFU7OxfYhYwWJYM.png", "https://api-assets.clashofclans.com/leaguetiers/326/7Alm6gwA1lYoRn5m8vrXAfbTKIK2fFU7OxfYhYwWJYM.png"),
    LeagueTierInfo(105000006, "Barbarian League 6", "Barbar 6", 6, 860, 44, 1, "https://api-assets.clashofclans.com/leaguetiers/125/pQHVG1p0IboE8Ggp0U1YR7U8dWhVn4YSS1zSPH61F0I.png", "https://api-assets.clashofclans.com/leaguetiers/326/pQHVG1p0IboE8Ggp0U1YR7U8dWhVn4YSS1zSPH61F0I.png"),
    LeagueTierInfo(105000007, "Archer League 7", "Okçu 7", 7, 910, 49, 1, "https://api-assets.clashofclans.com/leaguetiers/125/x1c7byHQmOHQVKGxAn1sqOW2XOCzTYW-e6OKjq-FBco.png", "https://api-assets.clashofclans.com/leaguetiers/326/x1c7byHQmOHQVKGxAn1sqOW2XOCzTYW-e6OKjq-FBco.png"),
    LeagueTierInfo(105000008, "Archer League 8", "Okçu 8", 8, 915, 49, 1, "https://api-assets.clashofclans.com/leaguetiers/125/lzneKpnJ_ADL1Xb1rceH7-svqRN1UaLnI7ldd8BbyxI.png", "https://api-assets.clashofclans.com/leaguetiers/326/lzneKpnJ_ADL1Xb1rceH7-svqRN1UaLnI7ldd8BbyxI.png"),
    LeagueTierInfo(105000009, "Archer League 9", "Okçu 9", 9, 920, 49, 1, "https://api-assets.clashofclans.com/leaguetiers/125/ieEdz9Mqbo7g9iJfXwTnIh7Iwz-37aPEmWma1ENEwXE.png", "https://api-assets.clashofclans.com/leaguetiers/326/ieEdz9Mqbo7g9iJfXwTnIh7Iwz-37aPEmWma1ENEwXE.png"),
    LeagueTierInfo(105000010, "Wizard League 10", "Büyücü 10", 10, 970, 52, 1, "https://api-assets.clashofclans.com/leaguetiers/125/3kJYaYpDwKF8AEkwRLkm-947_t2mAhpEQcZJYulPPIA.png", "https://api-assets.clashofclans.com/leaguetiers/326/3kJYaYpDwKF8AEkwRLkm-947_t2mAhpEQcZJYulPPIA.png"),
    LeagueTierInfo(105000011, "Wizard League 11", "Büyücü 11", 11, 975, 52, 1, "https://api-assets.clashofclans.com/leaguetiers/125/XazuJHG2wjBq39KEA4g4hh1nKJQwVO0fRoVDPHvWwAY.png", "https://api-assets.clashofclans.com/leaguetiers/326/XazuJHG2wjBq39KEA4g4hh1nKJQwVO0fRoVDPHvWwAY.png"),
    LeagueTierInfo(105000012, "Wizard League 12", "Büyücü 12", 12, 980, 52, 1, "https://api-assets.clashofclans.com/leaguetiers/125/A_ZoGbh1g8wYRWygsQ_wMgbVz8GXvvfavKwlSx8C8PQ.png", "https://api-assets.clashofclans.com/leaguetiers/326/A_ZoGbh1g8wYRWygsQ_wMgbVz8GXvvfavKwlSx8C8PQ.png"),
    LeagueTierInfo(105000013, "Valkyrie League 13", "Valkyrie 13", 13, 1030, 57, 1, "https://api-assets.clashofclans.com/leaguetiers/125/6BwmbzkNm6p2unZonTauFQ_683uNl4NYtoOXJmEs78c.png", "https://api-assets.clashofclans.com/leaguetiers/326/6BwmbzkNm6p2unZonTauFQ_683uNl4NYtoOXJmEs78c.png"),
    LeagueTierInfo(105000014, "Valkyrie League 14", "Valkyrie 14", 14, 1035, 57, 1, "https://api-assets.clashofclans.com/leaguetiers/125/7AbbZbiV6whmfa6CZtqt6Ml4NgFH1B-UqCxc59ziqfk.png", "https://api-assets.clashofclans.com/leaguetiers/326/7AbbZbiV6whmfa6CZtqt6Ml4NgFH1B-UqCxc59ziqfk.png"),
    LeagueTierInfo(105000015, "Valkyrie League 15", "Valkyrie 15", 15, 1040, 57, 1, "https://api-assets.clashofclans.com/leaguetiers/125/vT-0ssHYx5zJbBbbjB5NHPXnlHk76MDxJmG7iKmghc4.png", "https://api-assets.clashofclans.com/leaguetiers/326/vT-0ssHYx5zJbBbbjB5NHPXnlHk76MDxJmG7iKmghc4.png"),
    LeagueTierInfo(105000016, "Witch League 16", "Cadı 16", 16, 1090, 60, 1, "https://api-assets.clashofclans.com/leaguetiers/125/a3zg3PSqri2WrWD8tGzKs0hJ5OrND1Rx1SJ45f5O0gE.png", "https://api-assets.clashofclans.com/leaguetiers/326/a3zg3PSqri2WrWD8tGzKs0hJ5OrND1Rx1SJ45f5O0gE.png"),
    LeagueTierInfo(105000017, "Witch League 17", "Cadı 17", 17, 1095, 60, 1, "https://api-assets.clashofclans.com/leaguetiers/125/3mEMvpajLceJ3EKu7u_JIh_cOEsT7wyh701zum9hqCY.png", "https://api-assets.clashofclans.com/leaguetiers/326/3mEMvpajLceJ3EKu7u_JIh_cOEsT7wyh701zum9hqCY.png"),
    LeagueTierInfo(105000018, "Witch League 18", "Cadı 18", 18, 1100, 60, 1, "https://api-assets.clashofclans.com/leaguetiers/125/GeLamlTvRYNnZp5lEW64pyaORN30rCdrxTjU7oJoTN8.png", "https://api-assets.clashofclans.com/leaguetiers/326/GeLamlTvRYNnZp5lEW64pyaORN30rCdrxTjU7oJoTN8.png"),
    LeagueTierInfo(105000019, "Golem League 19", "Golem 19", 19, 1150, 63, 1, "https://api-assets.clashofclans.com/leaguetiers/125/yS8XBv_a_SNtCpcofsWMFaojRNwO504Py7HyDCBCjYU.png", "https://api-assets.clashofclans.com/leaguetiers/326/yS8XBv_a_SNtCpcofsWMFaojRNwO504Py7HyDCBCjYU.png"),
    LeagueTierInfo(105000020, "Golem League 20", "Golem 20", 20, 1155, 63, 1, "https://api-assets.clashofclans.com/leaguetiers/125/uizNRh8glQZuAbLdCa-EQSf3oJnge3nqoXHjtQ6O8pw.png", "https://api-assets.clashofclans.com/leaguetiers/326/uizNRh8glQZuAbLdCa-EQSf3oJnge3nqoXHjtQ6O8pw.png"),
    LeagueTierInfo(105000021, "Golem League 21", "Golem 21", 21, 1160, 63, 1, "https://api-assets.clashofclans.com/leaguetiers/125/WkqDvnK0CXI-Nc0TNTKG_fSuzRYoLRC54HFOdMCxVTI.png", "https://api-assets.clashofclans.com/leaguetiers/326/WkqDvnK0CXI-Nc0TNTKG_fSuzRYoLRC54HFOdMCxVTI.png"),
    LeagueTierInfo(105000022, "P.E.K.K.A League 22", "P.E.K.K.A 22", 22, 1170, 66, 1, "https://api-assets.clashofclans.com/leaguetiers/125/iTWXPUUFQy0uEb7NDpMTyzGMFOJvlC4SLAqlHYgC8do.png", "https://api-assets.clashofclans.com/leaguetiers/326/iTWXPUUFQy0uEb7NDpMTyzGMFOJvlC4SLAqlHYgC8do.png"),
    LeagueTierInfo(105000023, "P.E.K.K.A League 23", "P.E.K.K.A 23", 23, 1175, 66, 1, "https://api-assets.clashofclans.com/leaguetiers/125/0eDMQmsiZ0gs8xzViGfVETnYjwzgELTKwYhH3izevT4.png", "https://api-assets.clashofclans.com/leaguetiers/326/0eDMQmsiZ0gs8xzViGfVETnYjwzgELTKwYhH3izevT4.png"),
    LeagueTierInfo(105000024, "P.E.K.K.A League 24", "P.E.K.K.A 24", 24, 1180, 66, 1, "https://api-assets.clashofclans.com/leaguetiers/125/vxV7LI0votsz0_n-8lW-Lag96D5HwKsEgEk_7247zC4.png", "https://api-assets.clashofclans.com/leaguetiers/326/vxV7LI0votsz0_n-8lW-Lag96D5HwKsEgEk_7247zC4.png"),
    LeagueTierInfo(105000025, "Titan League 25", "Titan 25", 25, 1190, 69, 1, "https://api-assets.clashofclans.com/leaguetiers/125/JLqVXdNkAGjD_yqMRDgu9KK-hDrulNPjsKU4EugHqX8.png", "https://api-assets.clashofclans.com/leaguetiers/326/JLqVXdNkAGjD_yqMRDgu9KK-hDrulNPjsKU4EugHqX8.png"),
    LeagueTierInfo(105000026, "Titan League 26", "Titan 26", 26, 1195, 69, 1, "https://api-assets.clashofclans.com/leaguetiers/125/yIfqSgrhiYRcuMbAPCoeCj1FTmfylCLxnrAljEZc8K0.png", "https://api-assets.clashofclans.com/leaguetiers/326/yIfqSgrhiYRcuMbAPCoeCj1FTmfylCLxnrAljEZc8K0.png"),
    LeagueTierInfo(105000027, "Titan League 27", "Titan 27", 27, 1200, 69, 1, "https://api-assets.clashofclans.com/leaguetiers/125/1AhObOl55grQIWnGmn1J9qMWq5pmRA3aBObfYkQEjko.png", "https://api-assets.clashofclans.com/leaguetiers/326/1AhObOl55grQIWnGmn1J9qMWq5pmRA3aBObfYkQEjko.png"),
    LeagueTierInfo(105000028, "Dragon League 28", "Ejderha 28", 28, 1210, 70, 1, "https://api-assets.clashofclans.com/leaguetiers/125/YCZ7O_3_c8eCBYvX-92qiWeLc6Md6eNJ5A8O-2vUg7I.png", "https://api-assets.clashofclans.com/leaguetiers/326/YCZ7O_3_c8eCBYvX-92qiWeLc6Md6eNJ5A8O-2vUg7I.png"),
    LeagueTierInfo(105000029, "Dragon League 29", "Ejderha 29", 29, 1215, 70, 1, "https://api-assets.clashofclans.com/leaguetiers/125/DIMeRH3N4lrNObA3zAmk_eUin8nvNeLR89qYznnA--s.png", "https://api-assets.clashofclans.com/leaguetiers/326/DIMeRH3N4lrNObA3zAmk_eUin8nvNeLR89qYznnA--s.png"),
    LeagueTierInfo(105000030, "Dragon League 30", "Ejderha 30", 30, 1220, 70, 1, "https://api-assets.clashofclans.com/leaguetiers/125/g7m9aF8YoYj9b0olPsyT4eUIxyYEmkqr53wYxWmzpE4.png", "https://api-assets.clashofclans.com/leaguetiers/326/g7m9aF8YoYj9b0olPsyT4eUIxyYEmkqr53wYxWmzpE4.png"),
    LeagueTierInfo(105000031, "Electro League 31", "Elektro 31", 31, 1230, 71, 2, "https://api-assets.clashofclans.com/leaguetiers/125/qVORiRguZ-xMq8L0g7rE1-rZuiA-lKlI8VKuMndRy4w.png", "https://api-assets.clashofclans.com/leaguetiers/326/qVORiRguZ-xMq8L0g7rE1-rZuiA-lKlI8VKuMndRy4w.png"),
    LeagueTierInfo(105000032, "Electro League 32", "Elektro 32", 32, 1235, 71, 2, "https://api-assets.clashofclans.com/leaguetiers/125/iX8uNhG6jBcQATWFS8a0gtidGy9O1PRYtXZZMTtUK3U.png", "https://api-assets.clashofclans.com/leaguetiers/326/iX8uNhG6jBcQATWFS8a0gtidGy9O1PRYtXZZMTtUK3U.png"),
    LeagueTierInfo(105000033, "Electro League 33", "Elektro 33", 33, 1240, 71, 2, "https://api-assets.clashofclans.com/leaguetiers/125/VFqkaQimExWtSmIf9PC8WEpj4Vd58oLjPWyZqfVb5VE.png", "https://api-assets.clashofclans.com/leaguetiers/326/VFqkaQimExWtSmIf9PC8WEpj4Vd58oLjPWyZqfVb5VE.png"),
    LeagueTierInfo(105000034, "Legend III", "Efsane III", 34, 1250, 72, 2, "https://api-assets.clashofclans.com/leaguetiers/125/BvEu_UE53UzADvTRiU9AdyOrlvb1RqvBmMau_uX6xm0.png", "https://api-assets.clashofclans.com/leaguetiers/326/BvEu_UE53UzADvTRiU9AdyOrlvb1RqvBmMau_uX6xm0.png"),
    LeagueTierInfo(105000035, "Legend II", "Efsane II", 35, 1250, 72, 2, "https://api-assets.clashofclans.com/leaguetiers/125/2fQPjjBJCXzHdYY8Eul4DQUBB232Bhiw5KPv6TOLMgQ.png", "https://api-assets.clashofclans.com/leaguetiers/326/2fQPjjBJCXzHdYY8Eul4DQUBB232Bhiw5KPv6TOLMgQ.png"),
    LeagueTierInfo(105000036, "Legend I", "Efsane I", 36, 1250, 72, 2, "https://api-assets.clashofclans.com/leaguetiers/125/s5Y12RDRg7tgznd2RwU9kgLbedC5Not4peiHfOaWfJo.png", "https://api-assets.clashofclans.com/leaguetiers/326/s5Y12RDRg7tgznd2RwU9kgLbedC5Not4peiHfOaWfJo.png"),
]

LEAGUE_TIERS_BY_ID: Dict[int, LeagueTierInfo] = {lt.id: lt for lt in LEAGUE_TIERS}
LEAGUE_TIERS_BY_NAME: Dict[str, LeagueTierInfo] = {
    lt.name.lower(): lt for lt in LEAGUE_TIERS
}
for lt in LEAGUE_TIERS:
    LEAGUE_TIERS_BY_NAME[lt.name_tr.lower()] = lt

# Canonical fallback: Legend I (or default)
DEFAULT_LEAGUE_TIER_ID: int = 105000036  # Legend I


# ---------------------------------------------------------------------------
# Legacy CoC Multiplayer League Mapping (IDs 29000000 - 29000022 -> 37 Tiers)
# ---------------------------------------------------------------------------
LEGACY_LEAGUE_ID_MAP: Dict[int, int] = {
    29000000: 105000000,  # Unranked -> Sıralanmamış (0, 0, 0)
    29000001: 105000001,  # Bronze League III -> İskelet 1 (790, 39, 1)
    29000002: 105000002,  # Bronze League II  -> İskelet 2 (795, 39, 1)
    29000003: 105000003,  # Bronze League I   -> İskelet 3 (800, 39, 1)
    29000004: 105000004,  # Silver League III -> Barbar 4 (850, 44, 1)
    29000005: 105000005,  # Silver League II  -> Barbar 5 (855, 44, 1)
    29000006: 105000006,  # Silver League I   -> Barbar 6 (860, 44, 1)
    29000007: 105000007,  # Gold League III   -> Okçu 7 (910, 49, 1)
    29000008: 105000008,  # Gold League II    -> Okçu 8 (915, 49, 1)
    29000009: 105000009,  # Gold League I     -> Okçu 9 (920, 49, 1)
    29000010: 105000010,  # Crystal League III-> Büyücü 10 (970, 52, 1)
    29000011: 105000011,  # Crystal League II -> Büyücü 11 (975, 52, 1)
    29000012: 105000012,  # Crystal League I  -> Büyücü 12 (980, 52, 1)
    29000013: 105000013,  # Master League III -> Valkyrie 13 (1030, 57, 1)
    29000014: 105000014,  # Master League II  -> Valkyrie 14 (1035, 57, 1)
    29000015: 105000015,  # Master League I   -> Valkyrie 15 (1040, 57, 1)
    29000016: 105000016,  # Champion League III-> Cadı 16 (1090, 60, 1)
    29000017: 105000017,  # Champion League II -> Cadı 17 (1095, 60, 1)
    29000018: 105000018,  # Champion League I  -> Cadı 18 (1100, 60, 1)
    29000019: 105000025,  # Titan League III  -> Titan 25 (1190, 69, 1)
    29000020: 105000026,  # Titan League II   -> Titan 26 (1195, 69, 1)
    29000021: 105000027,  # Titan League I    -> Titan 27 (1200, 69, 1)
    29000022: 105000036,  # Legend League     -> Efsane I (1250, 72, 2)
}


# ---------------------------------------------------------------------------
# Named League Aliases Mapping
# ---------------------------------------------------------------------------
LEAGUE_NAME_ALIASES: Dict[str, int] = {
    # Sıralanmamış / Unranked
    "unranked": 105000000,
    "sıralanmamış": 105000000,
    "bilinmiyor": 105000000,
    "none": 105000000,

    # İskelet 1/2/3 (Bronze)
    "iskelet 1": 105000001,
    "iskelet league 1": 105000001,
    "skeleton 1": 105000001,
    "skeleton league 1": 105000001,
    "bronze league iii": 105000001,
    "bronze iii": 105000001,
    "bronze 3": 105000001,
    "bronz iii": 105000001,
    "bronz 3": 105000001,

    "iskelet 2": 105000002,
    "iskelet league 2": 105000002,
    "skeleton 2": 105000002,
    "skeleton league 2": 105000002,
    "bronze league ii": 105000002,
    "bronze ii": 105000002,
    "bronze 2": 105000002,
    "bronz ii": 105000002,
    "bronz 2": 105000002,

    "iskelet 3": 105000003,
    "iskelet league 3": 105000003,
    "skeleton 3": 105000003,
    "skeleton league 3": 105000003,
    "bronze league i": 105000003,
    "bronze i": 105000003,
    "bronze 1": 105000003,
    "bronz i": 105000003,
    "bronz 1": 105000003,

    # Barbar 4/5/6 (Silver)
    "barbar 4": 105000004,
    "barbarian 4": 105000004,
    "barbarian league 4": 105000004,
    "silver league iii": 105000004,
    "silver iii": 105000004,
    "silver 3": 105000004,
    "gümüş iii": 105000004,
    "gümüş 3": 105000004,

    "barbar 5": 105000005,
    "barbarian 5": 105000005,
    "barbarian league 5": 105000005,
    "silver league ii": 105000005,
    "silver ii": 105000005,
    "silver 2": 105000005,
    "gümüş ii": 105000005,
    "gümüş 2": 105000005,

    "barbar 6": 105000006,
    "barbarian 6": 105000006,
    "barbarian league 6": 105000006,
    "silver league i": 105000006,
    "silver i": 105000006,
    "silver 1": 105000006,
    "gümüş i": 105000006,
    "gümüş 1": 105000006,

    # Okçu 7/8/9 (Gold)
    "okçu 7": 105000007,
    "archer 7": 105000007,
    "archer league 7": 105000007,
    "gold league iii": 105000007,
    "gold iii": 105000007,
    "gold 3": 105000007,
    "altın iii": 105000007,
    "altın 3": 105000007,

    "okçu 8": 105000008,
    "archer 8": 105000008,
    "archer league 8": 105000008,
    "gold league ii": 105000008,
    "gold ii": 105000008,
    "gold 2": 105000008,
    "altın ii": 105000008,
    "altın 2": 105000008,

    "okçu 9": 105000009,
    "archer 9": 105000009,
    "archer league 9": 105000009,
    "gold league i": 105000009,
    "gold i": 105000009,
    "gold 1": 105000009,
    "altın i": 105000009,
    "altın 1": 105000009,

    # Büyücü 10/11/12 (Crystal)
    "büyücü 10": 105000010,
    "wizard 10": 105000010,
    "wizard league 10": 105000010,
    "crystal league iii": 105000010,
    "crystal iii": 105000010,
    "crystal 3": 105000010,
    "kristal iii": 105000010,
    "kristal 3": 105000010,

    "büyücü 11": 105000011,
    "wizard 11": 105000011,
    "wizard league 11": 105000011,
    "crystal league ii": 105000011,
    "crystal ii": 105000011,
    "crystal 2": 105000011,
    "kristal ii": 105000011,
    "kristal 2": 105000011,

    "büyücü 12": 105000012,
    "wizard 12": 105000012,
    "wizard league 12": 105000012,
    "crystal league i": 105000012,
    "crystal i": 105000012,
    "crystal 1": 105000012,
    "kristal i": 105000012,
    "kristal 1": 105000012,

    # Valkyrie 13/14/15 (Master)
    "valkyrie 13": 105000013,
    "valkyrie league 13": 105000013,
    "master league iii": 105000013,
    "master iii": 105000013,
    "master 3": 105000013,
    "usta iii": 105000013,
    "usta 3": 105000013,

    "valkyrie 14": 105000014,
    "valkyrie league 14": 105000014,
    "master league ii": 105000014,
    "master ii": 105000014,
    "master 2": 105000014,
    "usta ii": 105000014,
    "usta 2": 105000014,

    "valkyrie 15": 105000015,
    "valkyrie league 15": 105000015,
    "master league i": 105000015,
    "master i": 105000015,
    "master 1": 105000015,
    "usta i": 105000015,
    "usta 1": 105000015,

    # Cadı 16/17/18 (Champion)
    "cadı 16": 105000016,
    "witch 16": 105000016,
    "witch league 16": 105000016,
    "champion league iii": 105000016,
    "champion iii": 105000016,
    "champion 3": 105000016,
    "şampiyon iii": 105000016,
    "şampiyon 3": 105000016,

    "cadı 17": 105000017,
    "witch 17": 105000017,
    "witch league 17": 105000017,
    "champion league ii": 105000017,
    "champion ii": 105000017,
    "champion 2": 105000017,
    "şampiyon ii": 105000017,
    "şampiyon 2": 105000017,

    "cadı 18": 105000018,
    "witch 18": 105000018,
    "witch league 18": 105000018,
    "champion league i": 105000018,
    "champion i": 105000018,
    "champion 1": 105000018,
    "şampiyon i": 105000018,
    "şampiyon 1": 105000018,

    # Golem 19/20/21
    "golem 19": 105000019,
    "golem league 19": 105000019,
    "golem 20": 105000020,
    "golem league 20": 105000020,
    "golem 21": 105000021,
    "golem league 21": 105000021,

    # P.E.K.K.A 22/23/24
    "p.e.k.k.a 22": 105000022,
    "p.e.k.k.a league 22": 105000022,
    "pekka 22": 105000022,
    "pekka league 22": 105000022,

    "p.e.k.k.a 23": 105000023,
    "p.e.k.k.a league 23": 105000023,
    "pekka 23": 105000023,
    "pekka league 23": 105000023,

    "p.e.k.k.a 24": 105000024,
    "p.e.k.k.a league 24": 105000024,
    "pekka 24": 105000024,
    "pekka league 24": 105000024,

    # Titan 25/26/27 (Titan 1 / Titan League I -> Titan 27)
    "titan 25": 105000025,
    "titan league 25": 105000025,
    "titan league iii": 105000025,
    "titan iii": 105000025,
    "titan 3": 105000025,

    "titan 26": 105000026,
    "titan league 26": 105000026,
    "titan league ii": 105000026,
    "titan ii": 105000026,
    "titan 2": 105000026,

    "titan 27": 105000027,
    "titan league 27": 105000027,
    "titan league i": 105000027,
    "titan i": 105000027,
    "titan 1": 105000027,

    # Ejderha 28/29/30 (Dragon)
    "ejderha 28": 105000028,
    "dragon 28": 105000028,
    "dragon league 28": 105000028,

    "ejderha 29": 105000029,
    "dragon 29": 105000029,
    "dragon league 29": 105000029,

    "ejderha 30": 105000030,
    "dragon 30": 105000030,
    "dragon league 30": 105000030,

    # Elektro 31/32/33 (Electro)
    "elektro 31": 105000031,
    "electro 31": 105000031,
    "electro league 31": 105000031,

    "elektro 32": 105000032,
    "electro 32": 105000032,
    "electro league 32": 105000032,

    "elektro 33": 105000033,
    "electro 33": 105000033,
    "electro league 33": 105000033,

    # Efsane III/II/I (Legend)
    "efsane iii": 105000034,
    "legend iii": 105000034,
    "efsane 3": 105000034,
    "legend 3": 105000034,

    "efsane ii": 105000035,
    "legend ii": 105000035,
    "efsane 2": 105000035,
    "legend 2": 105000035,

    "efsane i": 105000036,
    "legend i": 105000036,
    "efsane 1": 105000036,
    "legend 1": 105000036,
    "efsane": 105000036,
    "legend": 105000036,
    "legend league": 105000036,
}


def match_league_to_37_tiers(
    raw_name: str | None = None,
    raw_id: int | None = None,
) -> LeagueTierInfo:
    """
    Match any CoC league name or ID (legacy CoC leagues 29000000-29000022,
    new 37-tier IDs 105000000-105000036, or textual aliases like 'Titan League I',
    'Titan 1', 'Titan 27') to its exact LeagueTierInfo.
    """
    # 1. Direct 37-tier ID match (105000000 - 105000036)
    if raw_id is not None and 105000000 <= raw_id <= 105000036:
        if raw_id in LEAGUE_TIERS_BY_ID:
            return LEAGUE_TIERS_BY_ID[raw_id]

    # 2. Legacy CoC league ID map (29000000 - 29000022)
    if raw_id is not None and raw_id in LEGACY_LEAGUE_ID_MAP:
        target_id = LEGACY_LEAGUE_ID_MAP[raw_id]
        if target_id in LEAGUE_TIERS_BY_ID:
            return LEAGUE_TIERS_BY_ID[target_id]

    # 3. Name alias match
    if raw_name:
        clean = raw_name.strip().lower()
        if clean in LEAGUE_NAME_ALIASES:
            target_id = LEAGUE_NAME_ALIASES[clean]
            if target_id in LEAGUE_TIERS_BY_ID:
                return LEAGUE_TIERS_BY_ID[target_id]

        if clean in LEAGUE_TIERS_BY_NAME:
            return LEAGUE_TIERS_BY_NAME[clean]

        for alias, target_id in LEAGUE_NAME_ALIASES.items():
            if alias in clean or clean in alias:
                if target_id in LEAGUE_TIERS_BY_ID:
                    return LEAGUE_TIERS_BY_ID[target_id]

    # Fallback to Unranked (0, 0, 0)
    return LEAGUE_TIERS[0]


def get_league_tier_by_id(tier_id: int | None) -> LeagueTierInfo:
    """Find league tier by ID or return Unranked if unknown."""
    if tier_id is not None:
        return match_league_to_37_tiers(raw_id=tier_id)
    return LEAGUE_TIERS[0]  # Unranked


def get_league_tier_by_name(name: str | None) -> LeagueTierInfo:
    """Find league tier by English or Turkish name or return default."""
    if not name:
        return LEAGUE_TIERS_BY_ID[DEFAULT_LEAGUE_TIER_ID]
    matched = match_league_to_37_tiers(raw_name=name)
    if matched.is_unknown and name.strip().lower() not in ("unranked", "sıralanmamış", "bilinmiyor"):
        return LEAGUE_TIERS_BY_ID[DEFAULT_LEAGUE_TIER_ID]
    return matched


# ---------------------------------------------------------------------------
# 2. Regular Clan War (CW)
# ---------------------------------------------------------------------------
# 2-day war cycle (prep + battle). Practical max 14 wars / month.
# Win max reward: (2220, 78, 12)
# Loss reward: half, floored per ore -> (1110, 39, 6)
# ---------------------------------------------------------------------------

DEFAULT_CW_WARS_MONTHLY: int = 14
MAX_CW_WARS_MONTHLY: int = 14
DEFAULT_CW_WIN_ORE: OreCost = OreCost(shiny=2220, glowy=78, starry=12)


def compute_cw_loss_ore(win_ore: OreCost) -> OreCost:
    """Loss reward is exactly half of win reward, with integer floor per ore."""
    return OreCost(
        shiny=win_ore.shiny // 2,
        glowy=win_ore.glowy // 2,
        starry=win_ore.starry // 2,
    )


DEFAULT_CW_LOSS_ORE: OreCost = compute_cw_loss_ore(DEFAULT_CW_WIN_ORE)  # (1110, 39, 6)


# ---------------------------------------------------------------------------
# 3. Clan War League (CWL)
# ---------------------------------------------------------------------------
# Starts beginning of every month, 7 consecutive wars in 10 days.
# Win max reward: (1110, 39, 6)
# Loss reward: half, floored per ore -> (555, 19, 3)
# ---------------------------------------------------------------------------

CWL_WAR_COUNT: int = 7
CWL_DURATION_DAYS: int = 10
DEFAULT_CWL_WIN_ORE: OreCost = OreCost(shiny=1110, glowy=39, starry=6)


def compute_cwl_loss_ore(win_ore: OreCost) -> OreCost:
    """Loss reward is exactly half of CWL win reward, with integer floor."""
    return OreCost(
        shiny=win_ore.shiny // 2,
        glowy=win_ore.glowy // 2,
        starry=win_ore.starry // 2,
    )


DEFAULT_CWL_LOSS_ORE: OreCost = compute_cwl_loss_ore(DEFAULT_CWL_WIN_ORE)  # (555, 19, 3)


# ---------------------------------------------------------------------------
# 4. Raid Medals (Weekly)
# ---------------------------------------------------------------------------
# Weekly fixed: 0 Shiny, 100 Glowy, 10 Starry -> (0, 100, 10)
# Daily average: (0, 100 / 7, 10 / 7)
# ---------------------------------------------------------------------------

WEEKLY_RAID_MEDALS_ORE: OreCost = OreCost(shiny=0, glowy=100, starry=10)


# ---------------------------------------------------------------------------
# 5. Bi-Monthly New Epic Equipment & Event Packages
# ---------------------------------------------------------------------------
# New epic arrives every 2 months: February (2), April (4), June (6),
# August (8), October (10), December (12).
# ---------------------------------------------------------------------------

EPIC_CYCLE_MONTHS: Tuple[int, ...] = (2, 4, 6, 8, 10, 12)


def compute_epic_full_max_cost() -> OreCost:
    """
    Computes total cost to max an Epic equipment from Level 1 -> 27
    using the single source of truth table (EPIC_UPGRADE_COSTS).
    Must strictly equal (56060, 3720, 480).
    """
    total_shiny = sum(cost.shiny for cost in EPIC_UPGRADE_COSTS.values())
    total_glowy = sum(cost.glowy for cost in EPIC_UPGRADE_COSTS.values())
    total_starry = sum(cost.starry for cost in EPIC_UPGRADE_COSTS.values())
    cost = OreCost(total_shiny, total_glowy, total_starry)
    assert cost == OreCost(56060, 3720, 480), (
        f"Calculated Epic 1->27 cost {cost} does not match expected (56060, 3720, 480)"
    )
    return cost


EPIC_FULL_MAX_COST: OreCost = compute_epic_full_max_cost()

# Event Ore Rewards (accompanying each new epic release)
EVENT_FREE_PLAN_ORE: OreCost = OreCost(shiny=5000, glowy=400, starry=0)
EVENT_PASS_EXTRA_ORE: OreCost = OreCost(shiny=0, glowy=600, starry=80)
EVENT_MEDAL_EXTRA_ORE: OreCost = OreCost(shiny=0, glowy=600, starry=80)


def compute_single_event_ore(
    has_event_pass: bool = False,
    has_event_medals: bool = False,
) -> OreCost:
    """
    Total ore gained from a single event:
      Free Plan: (5000, 400, 0)
      + Event Pass: +(0, 600, 80)
      + Event Medals: +(0, 600, 80)
    """
    result = EVENT_FREE_PLAN_ORE
    if has_event_pass:
        result = result + EVENT_PASS_EXTRA_ORE
    if has_event_medals:
        result = result + EVENT_MEDAL_EXTRA_ORE
    return result

