/**
 * Gem & Ore Income Configuration — Single Source of Truth
 * =======================================================
 * Centralized configuration for all Clash of Clans ore income streams:
 *   1. Multiplayer League Star Bonus (Daily, 37 League Tiers: 105000000 - 105000036)
 *   2. Regular Clan War (CW) Rewards & Loss Floor
 *   3. Clan War League (CWL) Rewards & Loss Floor
 *   4. Weekly Raid Medals Ore (0, 100, 10)
 *   5. Bi-Monthly New Epic Equipment Injection & Event Packages
 *
 * Ore Tuple Order Everywhere: (Shiny/Parlak, Glowy/Işıltılı, Starry/Yıldızlı)
 */

import { OreCost, EPIC_UPGRADE_COSTS } from "@/lib/equipmentCosts";

export interface LeagueTierInfo {
  id: number;
  name: string;        // Official / English (e.g. "Legend I")
  nameTr: string;      // Turkish name (e.g. "Efsane I")
  tierNumber: number;  // 0 to 36
  iconSmall: string;   // 125px icon URL from response JSON
  iconLarge: string;   // 326px icon URL from response JSON
  dailyShiny: number;
  dailyGlowy: number;
  dailyStarry: number;
  isUnknown?: boolean;
}

// ---------------------------------------------------------------------------
// 1. 37 Multiplayer League Tiers (Daily Star Bonus)
// ---------------------------------------------------------------------------
// Low to High order matching official CoC API `/leaguetiers`
// ---------------------------------------------------------------------------

export const LEAGUE_TIERS: LeagueTierInfo[] = [
  { id: 105000000, name: "Unranked", nameTr: "Sıralanmamış", tierNumber: 0, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/yyYo5DUFeFBZvmMEQh0ZxvG-1sUOZ_S3kDMB7RllXX0.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/yyYo5DUFeFBZvmMEQh0ZxvG-1sUOZ_S3kDMB7RllXX0.png", dailyShiny: 0, dailyGlowy: 0, dailyStarry: 0, isUnknown: true, },
  { id: 105000001, name: "Skeleton League 1", nameTr: "İskelet 1", tierNumber: 1, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/CiSJYHyhMuloCpIIJ3n5-xCnRWrEd9vcq_zu6Ahkl3o.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/CiSJYHyhMuloCpIIJ3n5-xCnRWrEd9vcq_zu6Ahkl3o.png", dailyShiny: 790, dailyGlowy: 39, dailyStarry: 1, },
  { id: 105000002, name: "Skeleton League 2", nameTr: "İskelet 2", tierNumber: 2, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/CmM-Tihn6ojPGJstmTK_HC-QairrpYLyRhdKhQjkacQ.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/CmM-Tihn6ojPGJstmTK_HC-QairrpYLyRhdKhQjkacQ.png", dailyShiny: 795, dailyGlowy: 39, dailyStarry: 1, },
  { id: 105000003, name: "Skeleton League 3", nameTr: "İskelet 3", tierNumber: 3, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/YMnWU25Xs2SvtAkVS2WDDbcUQY-PTfCK9OSvCKJnwJU.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/YMnWU25Xs2SvtAkVS2WDDbcUQY-PTfCK9OSvCKJnwJU.png", dailyShiny: 800, dailyGlowy: 39, dailyStarry: 1, },
  { id: 105000004, name: "Barbarian League 4", nameTr: "Barbar 4", tierNumber: 4, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/CoTrW7nhyiNIDCI4WHUK-0BuhOxibwd_tfASdtmMWFE.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/CoTrW7nhyiNIDCI4WHUK-0BuhOxibwd_tfASdtmMWFE.png", dailyShiny: 850, dailyGlowy: 44, dailyStarry: 1, },
  { id: 105000005, name: "Barbarian League 5", nameTr: "Barbar 5", tierNumber: 5, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/7Alm6gwA1lYoRn5m8vrXAfbTKIK2fFU7OxfYhYwWJYM.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/7Alm6gwA1lYoRn5m8vrXAfbTKIK2fFU7OxfYhYwWJYM.png", dailyShiny: 855, dailyGlowy: 44, dailyStarry: 1, },
  { id: 105000006, name: "Barbarian League 6", nameTr: "Barbar 6", tierNumber: 6, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/pQHVG1p0IboE8Ggp0U1YR7U8dWhVn4YSS1zSPH61F0I.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/pQHVG1p0IboE8Ggp0U1YR7U8dWhVn4YSS1zSPH61F0I.png", dailyShiny: 860, dailyGlowy: 44, dailyStarry: 1, },
  { id: 105000007, name: "Archer League 7", nameTr: "Okçu 7", tierNumber: 7, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/x1c7byHQmOHQVKGxAn1sqOW2XOCzTYW-e6OKjq-FBco.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/x1c7byHQmOHQVKGxAn1sqOW2XOCzTYW-e6OKjq-FBco.png", dailyShiny: 910, dailyGlowy: 49, dailyStarry: 1, },
  { id: 105000008, name: "Archer League 8", nameTr: "Okçu 8", tierNumber: 8, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/lzneKpnJ_ADL1Xb1rceH7-svqRN1UaLnI7ldd8BbyxI.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/lzneKpnJ_ADL1Xb1rceH7-svqRN1UaLnI7ldd8BbyxI.png", dailyShiny: 915, dailyGlowy: 49, dailyStarry: 1, },
  { id: 105000009, name: "Archer League 9", nameTr: "Okçu 9", tierNumber: 9, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/ieEdz9Mqbo7g9iJfXwTnIh7Iwz-37aPEmWma1ENEwXE.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/ieEdz9Mqbo7g9iJfXwTnIh7Iwz-37aPEmWma1ENEwXE.png", dailyShiny: 920, dailyGlowy: 49, dailyStarry: 1, },
  { id: 105000010, name: "Wizard League 10", nameTr: "Büyücü 10", tierNumber: 10, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/3kJYaYpDwKF8AEkwRLkm-947_t2mAhpEQcZJYulPPIA.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/3kJYaYpDwKF8AEkwRLkm-947_t2mAhpEQcZJYulPPIA.png", dailyShiny: 970, dailyGlowy: 52, dailyStarry: 1, },
  { id: 105000011, name: "Wizard League 11", nameTr: "Büyücü 11", tierNumber: 11, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/XazuJHG2wjBq39KEA4g4hh1nKJQwVO0fRoVDPHvWwAY.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/XazuJHG2wjBq39KEA4g4hh1nKJQwVO0fRoVDPHvWwAY.png", dailyShiny: 975, dailyGlowy: 52, dailyStarry: 1, },
  { id: 105000012, name: "Wizard League 12", nameTr: "Büyücü 12", tierNumber: 12, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/A_ZoGbh1g8wYRWygsQ_wMgbVz8GXvvfavKwlSx8C8PQ.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/A_ZoGbh1g8wYRWygsQ_wMgbVz8GXvvfavKwlSx8C8PQ.png", dailyShiny: 980, dailyGlowy: 52, dailyStarry: 1, },
  { id: 105000013, name: "Valkyrie League 13", nameTr: "Valkyrie 13", tierNumber: 13, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/6BwmbzkNm6p2unZonTauFQ_683uNl4NYtoOXJmEs78c.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/6BwmbzkNm6p2unZonTauFQ_683uNl4NYtoOXJmEs78c.png", dailyShiny: 1030, dailyGlowy: 57, dailyStarry: 1, },
  { id: 105000014, name: "Valkyrie League 14", nameTr: "Valkyrie 14", tierNumber: 14, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/7AbbZbiV6whmfa6CZtqt6Ml4NgFH1B-UqCxc59ziqfk.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/7AbbZbiV6whmfa6CZtqt6Ml4NgFH1B-UqCxc59ziqfk.png", dailyShiny: 1035, dailyGlowy: 57, dailyStarry: 1, },
  { id: 105000015, name: "Valkyrie League 15", nameTr: "Valkyrie 15", tierNumber: 15, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/vT-0ssHYx5zJbBbbjB5NHPXnlHk76MDxJmG7iKmghc4.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/vT-0ssHYx5zJbBbbjB5NHPXnlHk76MDxJmG7iKmghc4.png", dailyShiny: 1040, dailyGlowy: 57, dailyStarry: 1, },
  { id: 105000016, name: "Witch League 16", nameTr: "Cadı 16", tierNumber: 16, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/a3zg3PSqri2WrWD8tGzKs0hJ5OrND1Rx1SJ45f5O0gE.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/a3zg3PSqri2WrWD8tGzKs0hJ5OrND1Rx1SJ45f5O0gE.png", dailyShiny: 1090, dailyGlowy: 60, dailyStarry: 1, },
  { id: 105000017, name: "Witch League 17", nameTr: "Cadı 17", tierNumber: 17, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/3mEMvpajLceJ3EKu7u_JIh_cOEsT7wyh701zum9hqCY.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/3mEMvpajLceJ3EKu7u_JIh_cOEsT7wyh701zum9hqCY.png", dailyShiny: 1095, dailyGlowy: 60, dailyStarry: 1, },
  { id: 105000018, name: "Witch League 18", nameTr: "Cadı 18", tierNumber: 18, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/GeLamlTvRYNnZp5lEW64pyaORN30rCdrxTjU7oJoTN8.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/GeLamlTvRYNnZp5lEW64pyaORN30rCdrxTjU7oJoTN8.png", dailyShiny: 1100, dailyGlowy: 60, dailyStarry: 1, },
  { id: 105000019, name: "Golem League 19", nameTr: "Golem 19", tierNumber: 19, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/yS8XBv_a_SNtCpcofsWMFaojRNwO504Py7HyDCBCjYU.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/yS8XBv_a_SNtCpcofsWMFaojRNwO504Py7HyDCBCjYU.png", dailyShiny: 1150, dailyGlowy: 63, dailyStarry: 1, },
  { id: 105000020, name: "Golem League 20", nameTr: "Golem 20", tierNumber: 20, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/uizNRh8glQZuAbLdCa-EQSf3oJnge3nqoXHjtQ6O8pw.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/uizNRh8glQZuAbLdCa-EQSf3oJnge3nqoXHjtQ6O8pw.png", dailyShiny: 1155, dailyGlowy: 63, dailyStarry: 1, },
  { id: 105000021, name: "Golem League 21", nameTr: "Golem 21", tierNumber: 21, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/WkqDvnK0CXI-Nc0TNTKG_fSuzRYoLRC54HFOdMCxVTI.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/WkqDvnK0CXI-Nc0TNTKG_fSuzRYoLRC54HFOdMCxVTI.png", dailyShiny: 1160, dailyGlowy: 63, dailyStarry: 1, },
  { id: 105000022, name: "P.E.K.K.A League 22", nameTr: "P.E.K.K.A 22", tierNumber: 22, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/iTWXPUUFQy0uEb7NDpMTyzGMFOJvlC4SLAqlHYgC8do.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/iTWXPUUFQy0uEb7NDpMTyzGMFOJvlC4SLAqlHYgC8do.png", dailyShiny: 1170, dailyGlowy: 66, dailyStarry: 1, },
  { id: 105000023, name: "P.E.K.K.A League 23", nameTr: "P.E.K.K.A 23", tierNumber: 23, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/0eDMQmsiZ0gs8xzViGfVETnYjwzgELTKwYhH3izevT4.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/0eDMQmsiZ0gs8xzViGfVETnYjwzgELTKwYhH3izevT4.png", dailyShiny: 1175, dailyGlowy: 66, dailyStarry: 1, },
  { id: 105000024, name: "P.E.K.K.A League 24", nameTr: "P.E.K.K.A 24", tierNumber: 24, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/vxV7LI0votsz0_n-8lW-Lag96D5HwKsEgEk_7247zC4.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/vxV7LI0votsz0_n-8lW-Lag96D5HwKsEgEk_7247zC4.png", dailyShiny: 1180, dailyGlowy: 66, dailyStarry: 1, },
  { id: 105000025, name: "Titan League 25", nameTr: "Titan 25", tierNumber: 25, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/JLqVXdNkAGjD_yqMRDgu9KK-hDrulNPjsKU4EugHqX8.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/JLqVXdNkAGjD_yqMRDgu9KK-hDrulNPjsKU4EugHqX8.png", dailyShiny: 1190, dailyGlowy: 69, dailyStarry: 1, },
  { id: 105000026, name: "Titan League 26", nameTr: "Titan 26", tierNumber: 26, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/yIfqSgrhiYRcuMbAPCoeCj1FTmfylCLxnrAljEZc8K0.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/yIfqSgrhiYRcuMbAPCoeCj1FTmfylCLxnrAljEZc8K0.png", dailyShiny: 1195, dailyGlowy: 69, dailyStarry: 1, },
  { id: 105000027, name: "Titan League 27", nameTr: "Titan 27", tierNumber: 27, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/1AhObOl55grQIWnGmn1J9qMWq5pmRA3aBObfYkQEjko.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/1AhObOl55grQIWnGmn1J9qMWq5pmRA3aBObfYkQEjko.png", dailyShiny: 1200, dailyGlowy: 69, dailyStarry: 1, },
  { id: 105000028, name: "Dragon League 28", nameTr: "Ejderha 28", tierNumber: 28, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/YCZ7O_3_c8eCBYvX-92qiWeLc6Md6eNJ5A8O-2vUg7I.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/YCZ7O_3_c8eCBYvX-92qiWeLc6Md6eNJ5A8O-2vUg7I.png", dailyShiny: 1210, dailyGlowy: 70, dailyStarry: 1, },
  { id: 105000029, name: "Dragon League 29", nameTr: "Ejderha 29", tierNumber: 29, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/DIMeRH3N4lrNObA3zAmk_eUin8nvNeLR89qYznnA--s.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/DIMeRH3N4lrNObA3zAmk_eUin8nvNeLR89qYznnA--s.png", dailyShiny: 1215, dailyGlowy: 70, dailyStarry: 1, },
  { id: 105000030, name: "Dragon League 30", nameTr: "Ejderha 30", tierNumber: 30, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/g7m9aF8YoYj9b0olPsyT4eUIxyYEmkqr53wYxWmzpE4.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/g7m9aF8YoYj9b0olPsyT4eUIxyYEmkqr53wYxWmzpE4.png", dailyShiny: 1220, dailyGlowy: 70, dailyStarry: 1, },
  { id: 105000031, name: "Electro League 31", nameTr: "Elektro 31", tierNumber: 31, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/qVORiRguZ-xMq8L0g7rE1-rZuiA-lKlI8VKuMndRy4w.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/qVORiRguZ-xMq8L0g7rE1-rZuiA-lKlI8VKuMndRy4w.png", dailyShiny: 1230, dailyGlowy: 71, dailyStarry: 2, },
  { id: 105000032, name: "Electro League 32", nameTr: "Elektro 32", tierNumber: 32, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/iX8uNhG6jBcQATWFS8a0gtidGy9O1PRYtXZZMTtUK3U.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/iX8uNhG6jBcQATWFS8a0gtidGy9O1PRYtXZZMTtUK3U.png", dailyShiny: 1235, dailyGlowy: 71, dailyStarry: 2, },
  { id: 105000033, name: "Electro League 33", nameTr: "Elektro 33", tierNumber: 33, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/VFqkaQimExWtSmIf9PC8WEpj4Vd58oLjPWyZqfVb5VE.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/VFqkaQimExWtSmIf9PC8WEpj4Vd58oLjPWyZqfVb5VE.png", dailyShiny: 1240, dailyGlowy: 71, dailyStarry: 2, },
  { id: 105000034, name: "Legend III", nameTr: "Efsane III", tierNumber: 34, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/BvEu_UE53UzADvTRiU9AdyOrlvb1RqvBmMau_uX6xm0.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/BvEu_UE53UzADvTRiU9AdyOrlvb1RqvBmMau_uX6xm0.png", dailyShiny: 1250, dailyGlowy: 72, dailyStarry: 2, },
  { id: 105000035, name: "Legend II", nameTr: "Efsane II", tierNumber: 35, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/2fQPjjBJCXzHdYY8Eul4DQUBB232Bhiw5KPv6TOLMgQ.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/2fQPjjBJCXzHdYY8Eul4DQUBB232Bhiw5KPv6TOLMgQ.png", dailyShiny: 1250, dailyGlowy: 72, dailyStarry: 2, },
  { id: 105000036, name: "Legend I", nameTr: "Efsane I", tierNumber: 36, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/s5Y12RDRg7tgznd2RwU9kgLbedC5Not4peiHfOaWfJo.png", iconLarge: "https://api-assets.clashofclans.com/leaguetiers/326/s5Y12RDRg7tgznd2RwU9kgLbedC5Not4peiHfOaWfJo.png", dailyShiny: 1250, dailyGlowy: 72, dailyStarry: 2, },
];

export const DEFAULT_LEAGUE_TIER_ID = 105000036; // Legend I

// ---------------------------------------------------------------------------
// Legacy CoC Multiplayer League Mapping (IDs 29000000 - 29000022 -> 37 Tiers)
// ---------------------------------------------------------------------------
export const LEGACY_LEAGUE_ID_MAP: Record<number, number> = {
  29000000: 105000000, // Unranked -> Sıralanmamış (0, 0, 0)
  29000001: 105000001, // Bronze League III -> İskelet 1 (790, 39, 1)
  29000002: 105000002, // Bronze League II  -> İskelet 2 (795, 39, 1)
  29000003: 105000003, // Bronze League I   -> İskelet 3 (800, 39, 1)
  29000004: 105000004, // Silver League III -> Barbar 4 (850, 44, 1)
  29000005: 105000005, // Silver League II  -> Barbar 5 (855, 44, 1)
  29000006: 105000006, // Silver League I   -> Barbar 6 (860, 44, 1)
  29000007: 105000007, // Gold League III   -> Okçu 7 (910, 49, 1)
  29000008: 105000008, // Gold League II    -> Okçu 8 (915, 49, 1)
  29000009: 105000009, // Gold League I     -> Okçu 9 (920, 49, 1)
  29000010: 105000010, // Crystal League III-> Büyücü 10 (970, 52, 1)
  29000011: 105000011, // Crystal League II -> Büyücü 11 (975, 52, 1)
  29000012: 105000012, // Crystal League I  -> Büyücü 12 (980, 52, 1)
  29000013: 105000013, // Master League III -> Valkyrie 13 (1030, 57, 1)
  29000014: 105000014, // Master League II  -> Valkyrie 14 (1035, 57, 1)
  29000015: 105000015, // Master League I   -> Valkyrie 15 (1040, 57, 1)
  29000016: 105000016, // Champion League III-> Cadı 16 (1090, 60, 1)
  29000017: 105000017, // Champion League II -> Cadı 17 (1095, 60, 1)
  29000018: 105000018, // Champion League I  -> Cadı 18 (1100, 60, 1)
  29000019: 105000025, // Titan League III  -> Titan 25 (1190, 69, 1)
  29000020: 105000026, // Titan League II   -> Titan 26 (1195, 69, 1)
  29000021: 105000027, // Titan League I    -> Titan 27 (1200, 69, 1)
  29000022: 105000036, // Legend League     -> Efsane I (1250, 72, 2)
};

// ---------------------------------------------------------------------------
// Named League Aliases Mapping
// ---------------------------------------------------------------------------
export const LEAGUE_NAME_ALIASES: Record<string, number> = {
  // Sıralanmamış / Unranked
  "unranked": 105000000,
  "sıralanmamış": 105000000,
  "bilinmiyor": 105000000,
  "none": 105000000,

  // İskelet 1/2/3 (Bronze)
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

  // Barbar 4/5/6 (Silver)
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

  // Okçu 7/8/9 (Gold)
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

  // Büyücü 10/11/12 (Crystal)
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

  // Valkyrie 13/14/15 (Master)
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

  // Cadı 16/17/18 (Champion)
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

  // Golem 19/20/21
  "golem 19": 105000019,
  "golem league 19": 105000019,
  "golem 20": 105000020,
  "golem league 20": 105000020,
  "golem 21": 105000021,
  "golem league 21": 105000021,

  // P.E.K.K.A 22/23/24
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

  // Titan 25/26/27 (Titan 1 / Titan League I -> Titan 27)
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

  // Ejderha 28/29/30 (Dragon)
  "ejderha 28": 105000028,
  "dragon 28": 105000028,
  "dragon league 28": 105000028,

  "ejderha 29": 105000029,
  "dragon 29": 105000029,
  "dragon league 29": 105000029,

  "ejderha 30": 105000030,
  "dragon 30": 105000030,
  "dragon league 30": 105000030,

  // Elektro 31/32/33 (Electro)
  "elektro 31": 105000031,
  "electro 31": 105000031,
  "electro league 31": 105000031,

  "elektro 32": 105000032,
  "electro 32": 105000032,
  "electro league 32": 105000032,

  "elektro 33": 105000033,
  "electro 33": 105000033,
  "electro league 33": 105000033,

  // Efsane III/II/I (Legend)
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
};

/**
 * Robust matcher for any CoC league string or numeric ID (legacy 29000000-29000022
 * or new 37-tier 105000000-105000036, e.g. "Titan League I", "Titan 1" -> Titan 27).
 */
export function matchLeagueTo37Tiers(
  rawName?: string | null,
  rawId?: number | null
): LeagueTierInfo {
  // 1. Direct 37-tier ID match (105000000 - 105000036)
  if (rawId !== undefined && rawId !== null && rawId >= 105000000 && rawId <= 105000036) {
    const found = LEAGUE_TIERS.find((t) => t.id === rawId);
    if (found) return found;
  }

  // 2. Legacy CoC league ID map (29000000 - 29000022)
  if (rawId !== undefined && rawId !== null && rawId in LEGACY_LEAGUE_ID_MAP) {
    const targetId = LEGACY_LEAGUE_ID_MAP[rawId];
    const found = LEAGUE_TIERS.find((t) => t.id === targetId);
    if (found) return found;
  }

  // 3. Name alias match
  if (rawName) {
    const clean = rawName.trim().toLowerCase();
    if (clean in LEAGUE_NAME_ALIASES) {
      const targetId = LEAGUE_NAME_ALIASES[clean];
      const found = LEAGUE_TIERS.find((t) => t.id === targetId);
      if (found) return found;
    }

    // Direct match inside LEAGUE_TIERS
    const direct = LEAGUE_TIERS.find(
      (t) => t.name.toLowerCase() === clean || t.nameTr.toLowerCase() === clean
    );
    if (direct) return direct;

    // Partial contains in aliases
    for (const [alias, targetId] of Object.entries(LEAGUE_NAME_ALIASES)) {
      if (clean.includes(alias) || alias.includes(clean)) {
        const found = LEAGUE_TIERS.find((t) => t.id === targetId);
        if (found) return found;
      }
    }
  }

  // Fallback: Unranked (0, 0, 0)
  return LEAGUE_TIERS[0];
}

export function getLeagueTierById(tierId: number | undefined | null): LeagueTierInfo {
  if (tierId !== undefined && tierId !== null) {
    return matchLeagueTo37Tiers(undefined, tierId);
  }
  return LEAGUE_TIERS[0]; // Sıralanmamış
}

export function getLeagueTierByName(name: string | undefined | null): LeagueTierInfo {
  if (!name) return getLeagueTierById(DEFAULT_LEAGUE_TIER_ID);
  const matched = matchLeagueTo37Tiers(name, undefined);
  if (matched.isUnknown && !["unranked", "sıralanmamış", "bilinmiyor"].includes(name.trim().toLowerCase())) {
    return LEAGUE_TIERS.find((t) => t.id === DEFAULT_LEAGUE_TIER_ID) || LEAGUE_TIERS[36];
  }
  return matched;
}

// ---------------------------------------------------------------------------
// 2. Regular Clan War (CW)
// ---------------------------------------------------------------------------
export const DEFAULT_CW_WARS_MONTHLY = 14;
export const MAX_CW_WARS_MONTHLY = 14;
export const DEFAULT_CW_WIN_ORE: OreCost = { shiny: 2220, glowy: 78, starry: 12 };

export function computeCwLossOre(winOre: OreCost): OreCost {
  return {
    shiny: Math.floor(winOre.shiny / 2),
    glowy: Math.floor(winOre.glowy / 2),
    starry: Math.floor(winOre.starry / 2),
  };
}

export const DEFAULT_CW_LOSS_ORE: OreCost = computeCwLossOre(DEFAULT_CW_WIN_ORE); // (1110, 39, 6)

// ---------------------------------------------------------------------------
// 3. Clan War League (CWL)
// ---------------------------------------------------------------------------
export const CWL_WAR_COUNT = 7;
export const CWL_DURATION_DAYS = 10;
export const DEFAULT_CWL_WIN_ORE: OreCost = { shiny: 1110, glowy: 39, starry: 6 };

export function computeCwlLossOre(winOre: OreCost): OreCost {
  return {
    shiny: Math.floor(winOre.shiny / 2),
    glowy: Math.floor(winOre.glowy / 2),
    starry: Math.floor(winOre.starry / 2),
  };
}

export const DEFAULT_CWL_LOSS_ORE: OreCost = computeCwlLossOre(DEFAULT_CWL_WIN_ORE); // (555, 19, 3)

// ---------------------------------------------------------------------------
// 4. Raid Medals (Weekly)
// ---------------------------------------------------------------------------
export const WEEKLY_RAID_MEDALS_ORE: OreCost = { shiny: 0, glowy: 100, starry: 10 };

// ---------------------------------------------------------------------------
// 5. Bi-Monthly Epic Releases & Event Packages
// ---------------------------------------------------------------------------
export const EPIC_CYCLE_MONTHS: number[] = [2, 4, 6, 8, 10, 12]; // Feb, Apr, Jun, Aug, Oct, Dec

export function computeEpicFullMaxCost(): OreCost {
  let shiny = 0;
  let glowy = 0;
  let starry = 0;
  for (const lvl in EPIC_UPGRADE_COSTS) {
    const c = EPIC_UPGRADE_COSTS[lvl];
    shiny += c.shiny;
    glowy += c.glowy;
    starry += c.starry;
  }
  return { shiny, glowy, starry };
}

// Exactly (56060, 3720, 480)
export const EPIC_FULL_MAX_COST: OreCost = computeEpicFullMaxCost();

export const EVENT_FREE_PLAN_ORE: OreCost = { shiny: 5000, glowy: 400, starry: 0 };
export const EVENT_PASS_EXTRA_ORE: OreCost = { shiny: 0, glowy: 600, starry: 80 };
export const EVENT_MEDAL_EXTRA_ORE: OreCost = { shiny: 0, glowy: 600, starry: 80 };

export function computeSingleEventOre(
  hasEventPass: boolean = false,
  hasEventMedals: boolean = false
): OreCost {
  let shiny = EVENT_FREE_PLAN_ORE.shiny;
  let glowy = EVENT_FREE_PLAN_ORE.glowy;
  let starry = EVENT_FREE_PLAN_ORE.starry;

  if (hasEventPass) {
    shiny += EVENT_PASS_EXTRA_ORE.shiny;
    glowy += EVENT_PASS_EXTRA_ORE.glowy;
    starry += EVENT_PASS_EXTRA_ORE.starry;
  }
  if (hasEventMedals) {
    shiny += EVENT_MEDAL_EXTRA_ORE.shiny;
    glowy += EVENT_MEDAL_EXTRA_ORE.glowy;
    starry += EVENT_MEDAL_EXTRA_ORE.starry;
  }
  return { shiny, glowy, starry };
}

