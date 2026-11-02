/**
 * Hero Equipment Ore Costs — Single Source of Truth
 * ==================================================
 * Official equipment upgrade cost tables for Clash of Clans.
 *
 * COMMON (maxLevel 18): Shiny & Glowy only. Starry is always 0.
 * EPIC   (maxLevel 27): Shiny, Glowy & Starry.
 *
 * Each row index represents the cost to REACH that level (e.g. Level 2 = cost for 1 -> 2).
 * Level 1 is base level with 0 cost.
 */

export interface OreCost {
  shiny: number;
  glowy: number;
  starry: number;
}

export type EquipmentRarity = "Common" | "Epic";

export const COMMON_MAX_LEVEL = 18;
export const EPIC_MAX_LEVEL = 27;

export const COMMON_UPGRADE_COSTS: Record<number, OreCost> = {
  2:  { shiny: 120, glowy: 0, starry: 0 },
  3:  { shiny: 240, glowy: 20, starry: 0 },
  4:  { shiny: 400, glowy: 0, starry: 0 },
  5:  { shiny: 600, glowy: 0, starry: 0 },
  6:  { shiny: 840, glowy: 100, starry: 0 },
  7:  { shiny: 1120, glowy: 0, starry: 0 },
  8:  { shiny: 1440, glowy: 0, starry: 0 },
  9:  { shiny: 1800, glowy: 200, starry: 0 },
  10: { shiny: 1900, glowy: 0, starry: 0 },
  11: { shiny: 2000, glowy: 0, starry: 0 },
  12: { shiny: 2100, glowy: 400, starry: 0 },
  13: { shiny: 2200, glowy: 0, starry: 0 },
  14: { shiny: 2300, glowy: 0, starry: 0 },
  15: { shiny: 2400, glowy: 600, starry: 0 },
  16: { shiny: 2500, glowy: 0, starry: 0 },
  17: { shiny: 2600, glowy: 0, starry: 0 },
  18: { shiny: 2700, glowy: 600, starry: 0 },
};

export const EPIC_UPGRADE_COSTS: Record<number, OreCost> = {
  2:  { shiny: 120, glowy: 0, starry: 0 },
  3:  { shiny: 240, glowy: 20, starry: 0 },
  4:  { shiny: 400, glowy: 0, starry: 0 },
  5:  { shiny: 600, glowy: 0, starry: 0 },
  6:  { shiny: 840, glowy: 100, starry: 0 },
  7:  { shiny: 1120, glowy: 0, starry: 0 },
  8:  { shiny: 1440, glowy: 0, starry: 0 },
  9:  { shiny: 1800, glowy: 200, starry: 10 },
  10: { shiny: 1900, glowy: 0, starry: 0 },
  11: { shiny: 2000, glowy: 0, starry: 0 },
  12: { shiny: 2100, glowy: 400, starry: 20 },
  13: { shiny: 2200, glowy: 0, starry: 0 },
  14: { shiny: 2300, glowy: 0, starry: 0 },
  15: { shiny: 2400, glowy: 600, starry: 30 },
  16: { shiny: 2500, glowy: 0, starry: 0 },
  17: { shiny: 2600, glowy: 0, starry: 0 },
  18: { shiny: 2700, glowy: 600, starry: 50 },
  19: { shiny: 2800, glowy: 0, starry: 0 },
  20: { shiny: 2900, glowy: 0, starry: 0 },
  21: { shiny: 3000, glowy: 600, starry: 100 },
  22: { shiny: 3100, glowy: 0, starry: 0 },
  23: { shiny: 3200, glowy: 0, starry: 0 },
  24: { shiny: 3300, glowy: 600, starry: 120 },
  25: { shiny: 3400, glowy: 0, starry: 0 },
  26: { shiny: 3500, glowy: 0, starry: 0 },
  27: { shiny: 3600, glowy: 600, starry: 150 },
};

/**
 * Determine equipment rarity strictly based on maxLevel.
 *  - maxLevel === 18 -> "Common"
 *  - maxLevel === 27 -> "Epic"
 *  - other -> logs warning and returns null (does NOT throw error).
 */
export function detectEquipmentRarity(
  maxLevel: number | undefined | null
): EquipmentRarity | null {
  if (maxLevel === COMMON_MAX_LEVEL) {
    return "Common";
  }
  if (maxLevel === EPIC_MAX_LEVEL) {
    return "Epic";
  }
  console.warn(
    `[equipmentCosts] Unknown equipment maxLevel: ${maxLevel}. Excluding from calculation.`
  );
  return null;
}

/**
 * Pure function: Computes remaining ore cost for upgrading an equipment item.
 *
 * Sums table rows from `currentLevel + 1` to `targetLevel` (inclusive).
 * If `currentLevel >= targetLevel` or `currentLevel >= maxLevel`, returns { shiny: 0, glowy: 0, starry: 0 }.
 */
export function computeEquipmentUpgradeCost(
  rarity: EquipmentRarity,
  currentLevel: number,
  targetLevel?: number
): OreCost {
  const maxLevel = rarity === "Common" ? COMMON_MAX_LEVEL : EPIC_MAX_LEVEL;
  const effectiveTarget =
    targetLevel !== undefined ? Math.min(targetLevel, maxLevel) : maxLevel;

  if (currentLevel >= effectiveTarget || currentLevel >= maxLevel) {
    return { shiny: 0, glowy: 0, starry: 0 };
  }

  const table = rarity === "Common" ? COMMON_UPGRADE_COSTS : EPIC_UPGRADE_COSTS;
  let shiny = 0;
  let glowy = 0;
  let starry = 0;

  const startLevel = Math.max(1, currentLevel) + 1;
  for (let lvl = startLevel; lvl <= effectiveTarget; lvl++) {
    const cost = table[lvl];
    if (cost) {
      shiny += cost.shiny;
      glowy += cost.glowy;
      starry += cost.starry;
    }
  }

  return { shiny, glowy, starry };
}

export interface EquipmentItemInput {
  name: string;
  level: number;
  maxLevel: number;
}

export interface ItemDeficitBreakdown extends OreCost {
  name: string;
  level: number;
  targetLevel: number;
  isEpic: boolean;
  rarity: EquipmentRarity;
}

export interface PlayerOreDeficitResult {
  deficit: OreCost;
  items: ItemDeficitBreakdown[];
}

/**
 * Computes total ore deficit and per-item breakdown for a list of equipment items.
 */
export function calculatePlayerOreDeficit(
  equipments: EquipmentItemInput[],
  targetLevelOverride?: number
): PlayerOreDeficitResult {
  let totalShiny = 0;
  let totalGlowy = 0;
  let totalStarry = 0;
  const items: ItemDeficitBreakdown[] = [];

  for (const eq of equipments) {
    const rarity = detectEquipmentRarity(eq.maxLevel);
    if (!rarity) {
      continue;
    }

    const itemMax = rarity === "Common" ? COMMON_MAX_LEVEL : EPIC_MAX_LEVEL;
    const target =
      targetLevelOverride !== undefined
        ? Math.min(targetLevelOverride, itemMax)
        : itemMax;

    const cost = computeEquipmentUpgradeCost(rarity, eq.level, target);

    totalShiny += cost.shiny;
    totalGlowy += cost.glowy;
    totalStarry += cost.starry;

    items.push({
      name: eq.name,
      level: eq.level,
      targetLevel: target,
      isEpic: rarity === "Epic",
      rarity,
      ...cost,
    });
  }

  return {
    deficit: {
      shiny: totalShiny,
      glowy: totalGlowy,
      starry: totalStarry,
    },
    items,
  };
}

