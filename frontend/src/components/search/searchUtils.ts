/**
 * Clash of Clans Search Utilities & Tag Helpers
 * =============================================
 * Handles tag normalization (O->0, space removal, uppercase),
 * Supercell tag character validation, and recent search history persistence.
 */

// Supercell valid tag character set (0, 2, 8, 9, P, Y, L, Q, G, R, J, C, U, V)
// Ambiguous characters (O, I, 1, 5, S, etc.) are excluded by Supercell.
export const VALID_TAG_CHARS = "0289PYLQGRJCUV";
export const VALID_TAG_REGEX = /^[0289PYLQGRJCUV]{3,15}$/;
const IMPLICIT_TAG_REGEX = /^[0289PYLQGRJCUV]{4,15}$/i;

/**
 * Normalizes a Clash of Clans tag:
 * 1. Strips all whitespace
 * 2. Strips leading '#' characters
 * 3. Converts to uppercase
 * 4. Converts all 'O' characters to '0' (zero)
 */
export function normalizeTag(raw: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/\s+/g, "")
    .replace(/^#+/, "")
    .toUpperCase()
    .replace(/O/g, "0");
}

/**
 * Returns a display-friendly tag with a single '#' prefix (e.g. "#P89PCUPUQ")
 */
export function formatDisplayTag(raw: string): string {
  const clean = normalizeTag(raw);
  return clean ? `#${clean}` : "";
}

/**
 * Validates whether a clean tag matches the Supercell tag format.
 */
export function isValidTag(cleanTag: string): boolean {
  if (!cleanTag) return false;
  return VALID_TAG_REGEX.test(cleanTag);
}

/**
 * Determines whether a search string looks like a tag rather than a clan name.
 * Only treats input as a #tag lookup when:
 * - it explicitly starts with '#', OR
 * - it contains no spaces, matches /^[0289PYLQGRJCUV]{4,}$/i, AND includes at least one digit
 *   (so alphabetical clan names like "GURU" still search by name instead of failing tag lookup).
 */
export function looksLikeTag(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("#")) return true;
  if (/\s/.test(trimmed)) return false;
  return IMPLICIT_TAG_REGEX.test(trimmed) && /\d/.test(trimmed);
}

// -----------------------------------------------------------------------------
// Recent Searches (localStorage)
// -----------------------------------------------------------------------------

export interface RecentPlayerSearchItem {
  tag: string; // clean tag (without #)
  displayTag: string; // "#TAG"
  name?: string;
  timestamp: number;
}

export interface RecentClanSearchItem {
  query: string; // Clan name or clean tag
  isTag: boolean;
  name?: string;
  tag?: string;
  timestamp: number;
}

const PLAYER_HISTORY_KEY = "coc_recent_player_searches";
const CLAN_HISTORY_KEY = "coc_recent_clan_searches";
const MAX_HISTORY_ITEMS = 5;

export function getRecentPlayerSearches(): RecentPlayerSearchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PLAYER_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecentPlayerSearch(tag: string, name?: string): RecentPlayerSearchItem[] {
  if (typeof window === "undefined") return [];
  const clean = normalizeTag(tag);
  if (!clean) return [];

  try {
    const current = getRecentPlayerSearches();
    const filtered = current.filter((item) => item.tag !== clean);
    const updated: RecentPlayerSearchItem[] = [
      {
        tag: clean,
        displayTag: `#${clean}`,
        name: name?.trim() || undefined,
        timestamp: Date.now(),
      },
      ...filtered,
    ].slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(PLAYER_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function removeRecentPlayerSearch(tag: string): RecentPlayerSearchItem[] {
  if (typeof window === "undefined") return [];
  const clean = normalizeTag(tag);
  try {
    const current = getRecentPlayerSearches();
    const updated = current.filter((item) => item.tag !== clean);
    localStorage.setItem(PLAYER_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearRecentPlayerSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PLAYER_HISTORY_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function getRecentClanSearches(): RecentClanSearchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CLAN_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecentClanSearch(
  item: Omit<RecentClanSearchItem, "timestamp">
): RecentClanSearchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const current = getRecentClanSearches();
    const key = item.tag ? normalizeTag(item.tag) : item.query.toLowerCase().trim();
    const filtered = current.filter((c) => {
      const cKey = c.tag ? normalizeTag(c.tag) : c.query.toLowerCase().trim();
      return cKey !== key;
    });
    const updated: RecentClanSearchItem[] = [
      { ...item, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(CLAN_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function removeRecentClanSearch(queryOrTag: string): RecentClanSearchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const current = getRecentClanSearches();
    const norm = queryOrTag.toLowerCase().trim();
    const normTag = normalizeTag(queryOrTag);
    const updated = current.filter((c) => {
      const qMatch = c.query.toLowerCase().trim() === norm;
      const tMatch = c.tag ? normalizeTag(c.tag) === normTag || c.tag.toLowerCase().trim() === norm : false;
      return !qMatch && !tMatch;
    });
    localStorage.setItem(CLAN_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearRecentClanSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CLAN_HISTORY_KEY);
  } catch {
    // Ignore storage errors
  }
}
