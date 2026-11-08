import type { ClanMember, ClanVillageTab } from "./types";

export interface LeagueTierData {
  id: number;
  name: string;
  nameTr: string;
  tier: number;
  iconSmall: string;
}

/**
 * Official Supercell 37 Multiplayer League Tiers (105000000 - 105000036).
 * Matched with real api-assets.clashofclans.com small icons from CoC API.
 */
export const MODERN_37_LEAGUE_TIERS: LeagueTierData[] = [
  { id: 105000000, name: "Unranked", nameTr: "Sıralanmamış", tier: 0, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/yyYo5DUFeFBZvmMEQh0ZxvG-1sUOZ_S3kDMB7RllXX0.png" },
  { id: 105000001, name: "Skeleton League 1", nameTr: "İskelet 1", tier: 1, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/CiSJYHyhMuloCpIIJ3n5-xCnRWrEd9vcq_zu6Ahkl3o.png" },
  { id: 105000002, name: "Skeleton League 2", nameTr: "İskelet 2", tier: 2, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/CmM-Tihn6ojPGJstmTK_HC-QairrpYLyRhdKhQjkacQ.png" },
  { id: 105000003, name: "Skeleton League 3", nameTr: "İskelet 3", tier: 3, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/YMnWU25Xs2SvtAkVS2WDDbcUQY-PTfCK9OSvCKJnwJU.png" },
  { id: 105000004, name: "Barbarian League 4", nameTr: "Barbar 4", tier: 4, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/CoTrW7nhyiNIDCI4WHUK-0BuhOxibwd_tfASdtmMWFE.png" },
  { id: 105000005, name: "Barbarian League 5", nameTr: "Barbar 5", tier: 5, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/7Alm6gwA1lYoRn5m8vrXAfbTKIK2fFU7OxfYhYwWJYM.png" },
  { id: 105000006, name: "Barbarian League 6", nameTr: "Barbar 6", tier: 6, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/pQHVG1p0IboE8Ggp0U1YR7U8dWhVn4YSS1zSPH61F0I.png" },
  { id: 105000007, name: "Archer League 7", nameTr: "Okçu 7", tier: 7, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/x1c7byHQmOHQVKGxAn1sqOW2XOCzTYW-e6OKjq-FBco.png" },
  { id: 105000008, name: "Archer League 8", nameTr: "Okçu 8", tier: 8, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/lzneKpnJ_ADL1Xb1rceH7-svqRN1UaLnI7ldd8BbyxI.png" },
  { id: 105000009, name: "Archer League 9", nameTr: "Okçu 9", tier: 9, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/ieEdz9Mqbo7g9iJfXwTnIh7Iwz-37aPEmWma1ENEwXE.png" },
  { id: 105000010, name: "Wizard League 10", nameTr: "Büyücü 10", tier: 10, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/3kJYaYpDwKF8AEkwRLkm-947_t2mAhpEQcZJYulPPIA.png" },
  { id: 105000011, name: "Wizard League 11", nameTr: "Büyücü 11", tier: 11, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/XazuJHG2wjBq39KEA4g4hh1nKJQwVO0fRoVDPHvWwAY.png" },
  { id: 105000012, name: "Wizard League 12", nameTr: "Büyücü 12", tier: 12, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/A_ZoGbh1g8wYRWygsQ_wMgbVz8GXvvfavKwlSx8C8PQ.png" },
  { id: 105000013, name: "Valkyrie League 13", nameTr: "Valkyrie 13", tier: 13, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/6BwmbzkNm6p2unZonTauFQ_683uNl4NYtoOXJmEs78c.png" },
  { id: 105000014, name: "Valkyrie League 14", nameTr: "Valkyrie 14", tier: 14, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/7AbbZbiV6whmfa6CZtqt6Ml4NgFH1B-UqCxc59ziqfk.png" },
  { id: 105000015, name: "Valkyrie League 15", nameTr: "Valkyrie 15", tier: 15, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/vT-0ssHYx5zJbBbbjB5NHPXnlHk76MDxJmG7iKmghc4.png" },
  { id: 105000016, name: "Witch League 16", nameTr: "Cadı 16", tier: 16, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/a3zg3PSqri2WrWD8tGzKs0hJ5OrND1Rx1SJ45f5O0gE.png" },
  { id: 105000017, name: "Witch League 17", nameTr: "Cadı 17", tier: 17, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/3mEMvpajLceJ3EKu7u_JIh_cOEsT7wyh701zum9hqCY.png" },
  { id: 105000018, name: "Witch League 18", nameTr: "Cadı 18", tier: 18, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/GeLamlTvRYNnZp5lEW64pyaORN30rCdrxTjU7oJoTN8.png" },
  { id: 105000019, name: "Golem League 19", nameTr: "Golem 19", tier: 19, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/yS8XBv_a_SNtCpcofsWMFaojRNwO504Py7HyDCBCjYU.png" },
  { id: 105000020, name: "Golem League 20", nameTr: "Golem 20", tier: 20, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/uizNRh8glQZuAbLdCa-EQSf3oJnge3nqoXHjtQ6O8pw.png" },
  { id: 105000021, name: "Golem League 21", nameTr: "Golem 21", tier: 21, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/WkqDvnK0CXI-Nc0TNTKG_fSuzRYoLRC54HFOdMCxVTI.png" },
  { id: 105000022, name: "P.E.K.K.A League 22", nameTr: "P.E.K.K.A 22", tier: 22, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/iTWXPUUFQy0uEb7NDpMTyzGMFOJvlC4SLAqlHYgC8do.png" },
  { id: 105000023, name: "P.E.K.K.A League 23", nameTr: "P.E.K.K.A 23", tier: 23, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/0eDMQmsiZ0gs8xzViGfVETnYjwzgELTKwYhH3izevT4.png" },
  { id: 105000024, name: "P.E.K.K.A League 24", nameTr: "P.E.K.K.A 24", tier: 24, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/vxV7LI0votsz0_n-8lW-Lag96D5HwKsEgEk_7247zC4.png" },
  { id: 105000025, name: "Titan League 25", nameTr: "Titan 25", tier: 25, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/JLqVXdNkAGjD_yqMRDgu9KK-hDrulNPjsKU4EugHqX8.png" },
  { id: 105000026, name: "Titan League 26", nameTr: "Titan 26", tier: 26, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/yIfqSgrhiYRcuMbAPCoeCj1FTmfylCLxnrAljEZc8K0.png" },
  { id: 105000027, name: "Titan League 27", nameTr: "Titan 27", tier: 27, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/1AhObOl55grQIWnGmn1J9qMWq5pmRA3aBObfYkQEjko.png" },
  { id: 105000028, name: "Dragon League 28", nameTr: "Ejderha 28", tier: 28, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/YCZ7O_3_c8eCBYvX-92qiWeLc6Md6eNJ5A8O-2vUg7I.png" },
  { id: 105000029, name: "Dragon League 29", nameTr: "Ejderha 29", tier: 29, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/DIMeRH3N4lrNObA3zAmk_eUin8nvNeLR89qYznnA--s.png" },
  { id: 105000030, name: "Dragon League 30", nameTr: "Ejderha 30", tier: 30, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/g7m9aF8YoYj9b0olPsyT4eUIxyYEmkqr53wYxWmzpE4.png" },
  { id: 105000031, name: "Electro League 31", nameTr: "Elektro 31", tier: 31, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/qVORiRguZ-xMq8L0g7rE1-rZuiA-lKlI8VKuMndRy4w.png" },
  { id: 105000032, name: "Electro League 32", nameTr: "Elektro 32", tier: 32, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/iX8uNhG6jBcQATWFS8a0gtidGy9O1PRYtXZZMTtUK3U.png" },
  { id: 105000033, name: "Electro League 33", nameTr: "Elektro 33", tier: 33, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/VFqkaQimExWtSmIf9PC8WEpj4Vd58oLjPWyZqfVb5VE.png" },
  { id: 105000034, name: "Legend III", nameTr: "Efsane III", tier: 34, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/BvEu_UE53UzADvTRiU9AdyOrlvb1RqvBmMau_uX6xm0.png" },
  { id: 105000035, name: "Legend II", nameTr: "Efsane II", tier: 35, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/2fQPjjBJCXzHdYY8Eul4DQUBB232Bhiw5KPv6TOLMgQ.png" },
  { id: 105000036, name: "Legend I", nameTr: "Efsane I", tier: 36, iconSmall: "https://api-assets.clashofclans.com/leaguetiers/125/s5Y12RDRg7tgznd2RwU9kgLbedC5Not4peiHfOaWfJo.png" },
];

/**
 * Mapping from legacy CoC league IDs (29000000 - 29000022) to modern 37-tier IDs.
 */
export const LEGACY_LEAGUE_MAP: Record<number, number> = {
  29000000: 105000000, // Unranked
  29000001: 105000001, // Bronze III -> Skeleton 1
  29000002: 105000002, // Bronze II  -> Skeleton 2
  29000003: 105000003, // Bronze I   -> Skeleton 3
  29000004: 105000004, // Silver III -> Barbarian 4
  29000005: 105000005, // Silver II  -> Barbarian 5
  29000006: 105000006, // Silver I   -> Barbarian 6
  29000007: 105000007, // Gold III   -> Archer 7
  29000008: 105000008, // Gold II    -> Archer 8
  29000009: 105000009, // Gold I     -> Archer 9
  29000010: 105000010, // Crystal III-> Wizard 10
  29000011: 105000011, // Crystal II -> Wizard 11
  29000012: 105000012, // Crystal I  -> Wizard 12
  29000013: 105000013, // Master III -> Valkyrie 13
  29000014: 105000014, // Master II  -> Valkyrie 14
  29000015: 105000015, // Master I   -> Valkyrie 15
  29000016: 105000016, // Champion III-> Witch 16
  29000017: 105000017, // Champion II -> Witch 17
  29000018: 105000018, // Champion I  -> Witch 18
  29000019: 105000025, // Titan III   -> Titan 25
  29000020: 105000026, // Titan II    -> Titan 26
  29000021: 105000027, // Titan I     -> Titan 27
  29000022: 105000036, // Legend      -> Legend I
};

/**
 * Estimate home village modern 37-tier league based on trophies.
 */
export function getLeagueTierByTrophies(trophies: number): LeagueTierData {
  if (!trophies || trophies < 400) return MODERN_37_LEAGUE_TIERS[0];
  if (trophies >= 5000) return MODERN_37_LEAGUE_TIERS[36]; // Legend I
  if (trophies >= 4700) return MODERN_37_LEAGUE_TIERS[33]; // Electro 33
  if (trophies >= 4400) return MODERN_37_LEAGUE_TIERS[32]; // Electro 32
  if (trophies >= 4100) return MODERN_37_LEAGUE_TIERS[31]; // Electro 31
  if (trophies >= 3800) return MODERN_37_LEAGUE_TIERS[30]; // Dragon 30
  if (trophies >= 3500) return MODERN_37_LEAGUE_TIERS[29]; // Dragon 29
  if (trophies >= 3200) return MODERN_37_LEAGUE_TIERS[28]; // Dragon 28
  if (trophies >= 2900) return MODERN_37_LEAGUE_TIERS[27]; // Titan 27
  if (trophies >= 2600) return MODERN_37_LEAGUE_TIERS[24]; // P.E.K.A 24
  if (trophies >= 2300) return MODERN_37_LEAGUE_TIERS[21]; // Golem 21
  if (trophies >= 2000) return MODERN_37_LEAGUE_TIERS[18]; // Witch 18
  if (trophies >= 1700) return MODERN_37_LEAGUE_TIERS[15]; // Valkyrie 15
  if (trophies >= 1400) return MODERN_37_LEAGUE_TIERS[12]; // Wizard 12
  if (trophies >= 1100) return MODERN_37_LEAGUE_TIERS[9];  // Archer 9
  if (trophies >= 800) return MODERN_37_LEAGUE_TIERS[6];   // Barbarian 6
  return MODERN_37_LEAGUE_TIERS[3]; // Skeleton 3
}

/**
 * Resolve builder base league information and icon.
 */
export function getBuilderBaseLeagueInfo(member: ClanMember): { iconUrl?: string; name: string } {
  if (member.builderBaseLeague?.iconUrls?.small || member.builderBaseLeague?.iconUrls?.medium) {
    return {
      iconUrl: member.builderBaseLeague.iconUrls.small || member.builderBaseLeague.iconUrls.medium,
      name: member.builderBaseLeague.name || "İnşaatçı Ligi",
    };
  }
  if (member.builderBaseLeague?.name) {
    return {
      name: member.builderBaseLeague.name,
    };
  }
  // Kupa bazlı eşleşme
  const bbTrophies = member.builderBaseTrophies ?? member.trophies ?? 0;
  if (bbTrophies >= 5000) return { name: "Elmas Ligi" };
  if (bbTrophies >= 4000) return { name: "Zümrüt Ligi" };
  if (bbTrophies >= 3000) return { name: "Platin Ligi" };
  if (bbTrophies >= 2200) return { name: "Çelik Ligi" };
  if (bbTrophies >= 1600) return { name: "Demir Ligi" };
  if (bbTrophies >= 1000) return { name: "Bakır Ligi" };
  if (bbTrophies >= 500) return { name: "Taş Ligi" };
  if (bbTrophies > 0) return { name: "Ahşap Ligi" };
  return { name: "Ligsiz" };
}

/**
 * Resolves the accurate league symbol and title for a clan member:
 * 1. If villageTab === "builderBase": Priority to member.builderBaseLeague icon, else trophy estimation.
 * 2. Home Village:
 *    - Priority 1: member.leagueTier?.iconUrls?.small (Modern 37-tier Electro/Valkyrie/Skeleton)
 *    - Priority 2: member.leagueTier?.id -> matched tier in MODERN_37_LEAGUE_TIERS
 *    - Priority 3: member.league?.iconUrls?.small (or medium/tiny)
 *    - Priority 4: member.league?.id -> legacy mapping to 37 tiers
 *    - Priority 5: Trophy count matching if trophies > 0
 */
export function getMemberLeagueInfo(
  member: ClanMember,
  villageTab?: ClanVillageTab
): { iconUrl?: string; name: string } {
  // 1. Builder Base Tab
  if (villageTab === "builderBase") {
    return getBuilderBaseLeagueInfo(member);
  }

  // 2. Modern 37-tier CoC API leagueTier icon (only if NOT unranked)
  if (
    member.leagueTier?.iconUrls?.small &&
    member.leagueTier.id !== 105000000 &&
    member.leagueTier.name?.toLowerCase() !== "unranked"
  ) {
    return {
      iconUrl: member.leagueTier.iconUrls.small,
      name: member.leagueTier.name || "Lig",
    };
  }

  // 3. Modern 37-tier by id lookup (only if NOT unranked)
  if (member.leagueTier?.id && member.leagueTier.id !== 105000000) {
    const matched = MODERN_37_LEAGUE_TIERS.find((t) => t.id === member.leagueTier?.id);
    if (matched && matched.iconSmall) {
      return {
        iconUrl: matched.iconSmall,
        name: member.leagueTier.name || matched.nameTr,
      };
    }
  }

  // 4. Legacy CoC API league icon (only if NOT unranked)
  if (
    member.league &&
    member.league.id !== 29000000 &&
    member.league.name?.toLowerCase() !== "unranked"
  ) {
    if (member.league.id && LEGACY_LEAGUE_MAP[member.league.id]) {
      const tierId = LEGACY_LEAGUE_MAP[member.league.id];
      const matched = MODERN_37_LEAGUE_TIERS.find((t) => t.id === tierId);
      if (matched && matched.iconSmall) {
        return {
          iconUrl: matched.iconSmall,
          name: member.league.name || matched.nameTr,
        };
      }
    }
    const legacyIcon = member.league.iconUrls?.small || member.league.iconUrls?.medium;
    if (legacyIcon) {
      return {
        iconUrl: legacyIcon,
        name: member.league.name || "Lig",
      };
    }
  }

  // 5. Trophy-based resolution if player has trophies (active players in clan)
  if (member.trophies && member.trophies > 0) {
    const matched = getLeagueTierByTrophies(member.trophies);
    if (matched && matched.id !== 105000000 && matched.iconSmall) {
      return {
        iconUrl: matched.iconSmall,
        name: matched.nameTr,
      };
    }
  }

  // 6. True Unranked fallback
  const unrankedTier = MODERN_37_LEAGUE_TIERS[0];
  return {
    iconUrl: unrankedTier.iconSmall,
    name: "Ligsiz",
  };
}

