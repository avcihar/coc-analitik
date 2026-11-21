/**
 * Builder Base Assets & Leagues Manifest
 * Maps Builder Hall levels (1..10) and all 42 Builder Base 2.0 leagues
 * to local PNG assets under public/builder-halls/ and public/builder-leagues/.
 */

export const BUILDER_HALL_MANIFEST: Record<number, string> = {
  1: "/builder-halls/level-1.png",
  2: "/builder-halls/level-2.png",
  3: "/builder-halls/level-3.png",
  4: "/builder-halls/level-4.png",
  5: "/builder-halls/level-5.png",
  6: "/builder-halls/level-6.png",
  7: "/builder-halls/level-7.png",
  8: "/builder-halls/level-8.png",
  9: "/builder-halls/level-9.png",
  10: "/builder-halls/level-10.png",
};

/**
 * Returns the local public image URL for a given Builder Hall level (1..10).
 * Returns null if no local asset exists for that level.
 */
export function getBuilderHallImageUrl(level: number): string | null {
  return BUILDER_HALL_MANIFEST[level] || null;
}

export interface BuilderBaseLeagueMeta {
  slug: string;
  nameEn: string;
  nameTr: string;
  iconUrl: string;
  minTrophies: number;
}

/**
 * All 42 Builder Base 2.0 leagues ordered from lowest to highest trophy threshold.
 */
export const BUILDER_BASE_LEAGUES: BuilderBaseLeagueMeta[] = [
  { slug: "wood-v", nameEn: "Wood League V", nameTr: "Ahşap Ligi V", iconUrl: "/builder-leagues/wood-v.png", minTrophies: 0 },
  { slug: "wood-iv", nameEn: "Wood League IV", nameTr: "Ahşap Ligi IV", iconUrl: "/builder-leagues/wood-iv.png", minTrophies: 100 },
  { slug: "wood-iii", nameEn: "Wood League III", nameTr: "Ahşap Ligi III", iconUrl: "/builder-leagues/wood-iii.png", minTrophies: 200 },
  { slug: "wood-ii", nameEn: "Wood League II", nameTr: "Ahşap Ligi II", iconUrl: "/builder-leagues/wood-ii.png", minTrophies: 300 },
  { slug: "wood-i", nameEn: "Wood League I", nameTr: "Ahşap Ligi I", iconUrl: "/builder-leagues/wood-i.png", minTrophies: 400 },

  { slug: "clay-v", nameEn: "Clay League V", nameTr: "Kil Ligi V", iconUrl: "/builder-leagues/clay-v.png", minTrophies: 500 },
  { slug: "clay-iv", nameEn: "Clay League IV", nameTr: "Kil Ligi IV", iconUrl: "/builder-leagues/clay-iv.png", minTrophies: 600 },
  { slug: "clay-iii", nameEn: "Clay League III", nameTr: "Kil Ligi III", iconUrl: "/builder-leagues/clay-iii.png", minTrophies: 700 },
  { slug: "clay-ii", nameEn: "Clay League II", nameTr: "Kil Ligi II", iconUrl: "/builder-leagues/clay-ii.png", minTrophies: 800 },
  { slug: "clay-i", nameEn: "Clay League I", nameTr: "Kil Ligi I", iconUrl: "/builder-leagues/clay-i.png", minTrophies: 900 },

  { slug: "stone-v", nameEn: "Stone League V", nameTr: "Taş Ligi V", iconUrl: "/builder-leagues/stone-v.png", minTrophies: 1000 },
  { slug: "stone-iv", nameEn: "Stone League IV", nameTr: "Taş Ligi IV", iconUrl: "/builder-leagues/stone-iv.png", minTrophies: 1100 },
  { slug: "stone-iii", nameEn: "Stone League III", nameTr: "Taş Ligi III", iconUrl: "/builder-leagues/stone-iii.png", minTrophies: 1200 },
  { slug: "stone-ii", nameEn: "Stone League II", nameTr: "Taş Ligi II", iconUrl: "/builder-leagues/stone-ii.png", minTrophies: 1300 },
  { slug: "stone-i", nameEn: "Stone League I", nameTr: "Taş Ligi I", iconUrl: "/builder-leagues/stone-i.png", minTrophies: 1400 },

  { slug: "copper-v", nameEn: "Copper League V", nameTr: "Bakır Ligi V", iconUrl: "/builder-leagues/copper-v.png", minTrophies: 1500 },
  { slug: "copper-iv", nameEn: "Copper League IV", nameTr: "Bakır Ligi IV", iconUrl: "/builder-leagues/copper-iv.png", minTrophies: 1600 },
  { slug: "copper-iii", nameEn: "Copper League III", nameTr: "Bakır Ligi III", iconUrl: "/builder-leagues/copper-iii.png", minTrophies: 1700 },
  { slug: "copper-ii", nameEn: "Copper League II", nameTr: "Bakır Ligi II", iconUrl: "/builder-leagues/copper-ii.png", minTrophies: 1800 },
  { slug: "copper-i", nameEn: "Copper League I", nameTr: "Bakır Ligi I", iconUrl: "/builder-leagues/copper-i.png", minTrophies: 1900 },

  { slug: "brass-iii", nameEn: "Brass League III", nameTr: "Pirinç Ligi III", iconUrl: "/builder-leagues/brass-iii.png", minTrophies: 2000 },
  { slug: "brass-ii", nameEn: "Brass League II", nameTr: "Pirinç Ligi II", iconUrl: "/builder-leagues/brass-ii.png", minTrophies: 2200 },
  { slug: "brass-i", nameEn: "Brass League I", nameTr: "Pirinç Ligi I", iconUrl: "/builder-leagues/brass-i.png", minTrophies: 2400 },

  { slug: "iron-iii", nameEn: "Iron League III", nameTr: "Demir Ligi III", iconUrl: "/builder-leagues/iron-iii.png", minTrophies: 2600 },
  { slug: "iron-ii", nameEn: "Iron League II", nameTr: "Demir Ligi II", iconUrl: "/builder-leagues/iron-ii.png", minTrophies: 2800 },
  { slug: "iron-i", nameEn: "Iron League I", nameTr: "Demir Ligi I", iconUrl: "/builder-leagues/iron-i.png", minTrophies: 3000 },

  { slug: "steel-iii", nameEn: "Steel League III", nameTr: "Çelik Ligi III", iconUrl: "/builder-leagues/steel-iii.png", minTrophies: 3200 },
  { slug: "steel-ii", nameEn: "Steel League II", nameTr: "Çelik Ligi II", iconUrl: "/builder-leagues/steel-ii.png", minTrophies: 3400 },
  { slug: "steel-i", nameEn: "Steel League I", nameTr: "Çelik Ligi I", iconUrl: "/builder-leagues/steel-i.png", minTrophies: 3600 },

  { slug: "titanium-iii", nameEn: "Titanium League III", nameTr: "Titanyum Ligi III", iconUrl: "/builder-leagues/titanium-iii.png", minTrophies: 3800 },
  { slug: "titanium-ii", nameEn: "Titanium League II", nameTr: "Titanyum Ligi II", iconUrl: "/builder-leagues/titanium-ii.png", minTrophies: 4000 },
  { slug: "titanium-i", nameEn: "Titanium League I", nameTr: "Titanyum Ligi I", iconUrl: "/builder-leagues/titanium-i.png", minTrophies: 4200 },

  { slug: "platinum-iii", nameEn: "Platinum League III", nameTr: "Platin Ligi III", iconUrl: "/builder-leagues/platinum-iii.png", minTrophies: 4400 },
  { slug: "platinum-ii", nameEn: "Platinum League II", nameTr: "Platin Ligi II", iconUrl: "/builder-leagues/platinum-ii.png", minTrophies: 4600 },
  { slug: "platinum-i", nameEn: "Platinum League I", nameTr: "Platin Ligi I", iconUrl: "/builder-leagues/platinum-i.png", minTrophies: 4800 },

  { slug: "emerald-iii", nameEn: "Emerald League III", nameTr: "Zümrüt Ligi III", iconUrl: "/builder-leagues/emerald-iii.png", minTrophies: 5000 },
  { slug: "emerald-ii", nameEn: "Emerald League II", nameTr: "Zümrüt Ligi II", iconUrl: "/builder-leagues/emerald-ii.png", minTrophies: 5200 },
  { slug: "emerald-i", nameEn: "Emerald League I", nameTr: "Zümrüt Ligi I", iconUrl: "/builder-leagues/emerald-i.png", minTrophies: 5400 },

  { slug: "ruby-iii", nameEn: "Ruby League III", nameTr: "Yakut Ligi III", iconUrl: "/builder-leagues/ruby-iii.png", minTrophies: 5600 },
  { slug: "ruby-ii", nameEn: "Ruby League II", nameTr: "Yakut Ligi II", iconUrl: "/builder-leagues/ruby-ii.png", minTrophies: 5800 },
  { slug: "ruby-i", nameEn: "Ruby League I", nameTr: "Yakut Ligi I", iconUrl: "/builder-leagues/ruby-i.png", minTrophies: 6000 },

  { slug: "diamond", nameEn: "Diamond League", nameTr: "Elmas Ligi", iconUrl: "/builder-leagues/diamond.png", minTrophies: 6200 },
];

const ARABIC_TO_ROMAN: Record<string, string> = {
  "1": "i",
  "2": "ii",
  "3": "iii",
  "4": "iv",
  "5": "v",
};

const TR_CHAR_MAP: Record<string, string> = {
  İ: "i",
  I: "i",
  ı: "i",
  Ş: "s",
  ş: "s",
  Ç: "c",
  ç: "c",
  Ğ: "g",
  ğ: "g",
  Ü: "u",
  ü: "u",
  Ö: "o",
  ö: "o",
};

const IGNORED_WORDS = new Set(["league", "ligi", "lig"]);
const UNRANKED_KEYS = new Set(["", "unranked", "ligsiz", "builder", "insaatci"]);

function normalizeLeagueKey(raw: string): string {
  const folded = raw
    .replace(/[İIıŞşÇçĞğÜüÖö]/g, (ch) => TR_CHAR_MAP[ch] ?? ch)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const tokens = folded
    .replace(/[-_./]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((tok) => tok.length > 0 && !IGNORED_WORDS.has(tok));

  if (tokens.length > 1) {
    const last = tokens[tokens.length - 1];
    if (ARABIC_TO_ROMAN[last]) {
      tokens[tokens.length - 1] = ARABIC_TO_ROMAN[last];
    }
  }

  return tokens.join(" ");
}

const BUILDER_LEAGUE_LOOKUP: Map<string, BuilderBaseLeagueMeta> = (() => {
  const map = new Map<string, BuilderBaseLeagueMeta>();
  for (const league of BUILDER_BASE_LEAGUES) {
    map.set(normalizeLeagueKey(league.slug), league);
    map.set(normalizeLeagueKey(league.nameEn), league);
    map.set(normalizeLeagueKey(league.nameTr), league);
  }
  return map;
})();

/**
 * Find the Builder Base league matching a trophy count.
 */
export function getBuilderBaseLeagueByTrophies(trophies: number): BuilderBaseLeagueMeta {
  for (let i = BUILDER_BASE_LEAGUES.length - 1; i >= 0; i--) {
    if (trophies >= BUILDER_BASE_LEAGUES[i].minTrophies) {
      return BUILDER_BASE_LEAGUES[i];
    }
  }
  return BUILDER_BASE_LEAGUES[0];
}

/**
 * Match a raw Builder Base league name (EN or TR, with or without "League"/"Ligi")
 * or fall back to trophy brackets when trophies > 0.
 */
export function resolveBuilderBaseLeague(
  rawName?: string,
  trophies?: number,
  locale: "tr" | "en" = "tr"
): { iconUrl?: string; name: string } {
  const isTr = locale === "tr";
  const trimmedName = rawName?.trim();

  if (trimmedName) {
    const key = normalizeLeagueKey(trimmedName);
    const matched = BUILDER_LEAGUE_LOOKUP.get(key);
    if (matched) {
      return {
        iconUrl: matched.iconUrl,
        name: isTr ? matched.nameTr : matched.nameEn,
      };
    }
  }

  if (typeof trophies === "number" && trophies > 0) {
    const matched = getBuilderBaseLeagueByTrophies(trophies);
    return {
      iconUrl: matched.iconUrl,
      name: isTr ? matched.nameTr : matched.nameEn,
    };
  }

  if (trimmedName && !UNRANKED_KEYS.has(normalizeLeagueKey(trimmedName))) {
    return { name: trimmedName };
  }

  return { name: isTr ? "Ligsiz" : "Unranked" };
}
