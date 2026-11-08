/**
 * Town Halls Asset Manifest
 * Generated from docs/Town Halls/
 *
 * NOTE: TH11 is missing from the asset directory and falls back to a placeholder badge.
 * TH17 has weapon variant 1 (Town_Hall17-1.webp).
 */

export interface TownHallAsset {
  level: number;
  image: string;
  weaponVariant?: number;
}

export const TOWN_HALL_MANIFEST: Record<number, string> = {
  1: "/town-halls/Town_Hall1.webp",
  2: "/town-halls/Town_Hall2.webp",
  3: "/town-halls/Town_Hall3.webp",
  4: "/town-halls/Town_Hall4.webp",
  5: "/town-halls/Town_Hall5.webp",
  6: "/town-halls/Town_Hall6.webp",
  7: "/town-halls/Town_Hall7.webp",
  8: "/town-halls/Town_Hall8.webp",
  9: "/town-halls/Town_Hall9.webp",
  10: "/town-halls/Town_Hall10.webp",
  // 11 is missing in docs/Town Halls
  12: "/town-halls/Town_Hall12.webp",
  13: "/town-halls/Town_Hall13.webp",
  14: "/town-halls/Town_Hall14.webp",
  15: "/town-halls/Town_Hall15.webp",
  16: "/town-halls/Town_Hall16.webp",
  17: "/town-halls/Town_Hall17-1.webp",
  18: "/town-halls/Town_Hall18.webp",
};

/**
 * Returns the public image URL for a given Town Hall level and optional weapon level.
 * Returns null if no asset is available (e.g., TH11).
 */
export function getTownHallImageUrl(level: number, weaponLevel?: number): string | null {
  if (level === 17 && weaponLevel === 1) {
    return "/town-halls/Town_Hall17-1.webp";
  }
  return TOWN_HALL_MANIFEST[level] || null;
}

