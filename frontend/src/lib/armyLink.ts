/**
 * Clash of Clans `armyShareCode` Link Builder & Decoder
 * ======================================================
 * Core Rules:
 *   1. Single helper `buildCopyArmyLink(code)` generates all CopyArmy URLs:
 *      `https://link.clashofclans.com/en/?action=CopyArmy&army={armyShareCode}`
 *   2. NEVER call `encodeURIComponent` on `armyShareCode` (`_`, `-`, `x` must
 *      remain unencoded).
 *   3. Unknown IDs are never guessed — they are rendered as `"Bilinmeyen (ID: X)"`
 *      and logged with `console.warn`.
 */

export const COPY_ARMY_BASE_URL =
  "https://link.clashofclans.com/en/?action=CopyArmy&army=";

export function buildCopyArmyLink(code: string): string {
  const raw = (code || "").trim();
  if (!raw) return "";
  if (raw.includes("army=")) {
    const extracted = raw.split("army=", 2)[1]?.split("&", 1)[0]?.trim() || "";
    return extracted ? `${COPY_ARMY_BASE_URL}${extracted}` : "";
  }
  return `${COPY_ARMY_BASE_URL}${raw}`;
}

export interface DecodedHeroEquipment {
  id: number;
  name: string;
  rarity?: string;
  unknown?: boolean;
}

export interface DecodedHeroPet {
  id: number;
  name: string;
  unknown?: boolean;
}

export interface DecodedHeroSlot {
  id: number;
  name: string;
  pet: DecodedHeroPet | null;
  equipment: DecodedHeroEquipment[];
  unknown?: boolean;
}

export interface DecodedUnitSlot {
  id: number;
  name: string;
  count: number;
  housingSpace?: number;
  totalHousingSpace?: number;
  totalSpellSpace?: number;
  superTroopIsActive?: boolean;
  category?: "troop" | "spell" | "siege";
  unknown?: boolean;
}

export interface DecodedArmyShare {
  armyShareCode: string;
  armyLink: string;
  armyName: string;
  troopSignature: string;
  heroes: DecodedHeroSlot[];
  siegeMachines: DecodedUnitSlot[];
  clanCastle: DecodedUnitSlot[];
  clanCastleTroops: DecodedUnitSlot[];
  clanCastleSpells: DecodedUnitSlot[];
  troops: DecodedUnitSlot[];
  spells: DecodedUnitSlot[];
  totalTroopHousing: number;
  totalSpellSpace: number;
  unknownIds: string[];
}

// Official ClashKing / Supercell ID maps (offset from base IDs:
// TROOP=4000000, SPELL=26000000, HERO=28000000, PET=73000000, EQUIPMENT=90000000)

const HERO_BY_ID: Record<number, string> = {
  0: "Barbarian King",
  1: "Archer Queen",
  2: "Grand Warden",
  3: "Battle Machine",
  4: "Royal Champion",
  5: "Battle Copter",
  6: "Minion Prince",
  7: "Dragon Duke",
};

const PET_BY_ID: Record<number, string> = {
  0: "L.A.S.S.I",
  1: "Mighty Yak",
  2: "Electro Owl",
  3: "Unicorn",
  4: "Phoenix",
  7: "Poison Lizard",
  8: "Diggy",
  9: "Frosty",
  10: "Spirit Fox",
  11: "Angry Jelly",
  16: "Sneezy",
  17: "Greedy Raven",
};

const EQUIPMENT_BY_ID: Record<number, { name: string; rarity: "Common" | "Epic" }> = {
  0: { name: "Barbarian Puppet", rarity: "Common" },
  1: { name: "Rage Vial", rarity: "Common" },
  2: { name: "Archer Puppet", rarity: "Common" },
  3: { name: "Invisibility Vial", rarity: "Common" },
  4: { name: "Eternal Tome", rarity: "Common" },
  5: { name: "Life Gem", rarity: "Common" },
  6: { name: "Seeking Shield", rarity: "Common" },
  7: { name: "Royal Gem", rarity: "Common" },
  8: { name: "Earthquake Boots", rarity: "Common" },
  9: { name: "Hog Rider Puppet", rarity: "Common" },
  10: { name: "Giant Gauntlet", rarity: "Epic" },
  11: { name: "Vampstache", rarity: "Common" },
  12: { name: "Haste Vial", rarity: "Common" },
  13: { name: "Rocket Spear", rarity: "Epic" },
  14: { name: "Spiky Ball", rarity: "Epic" },
  15: { name: "Frozen Arrow", rarity: "Epic" },
  16: { name: "Monolith Arrow", rarity: "Common" },
  17: { name: "Giant Arrow", rarity: "Common" },
  19: { name: "Heroic Torch", rarity: "Epic" },
  20: { name: "Healer Puppet", rarity: "Common" },
  22: { name: "Fireball", rarity: "Epic" },
  24: { name: "Rage Gem", rarity: "Common" },
  32: { name: "Snake Bracelet", rarity: "Epic" },
  34: { name: "Healing Tome", rarity: "Common" },
  35: { name: "Dark Crown", rarity: "Epic" },
  39: { name: "Magic Mirror", rarity: "Epic" },
  40: { name: "Electro Boots", rarity: "Epic" },
  41: { name: "Lavaloon Puppet", rarity: "Epic" },
  42: { name: "Henchmen Puppet", rarity: "Common" },
  43: { name: "Dark Orb", rarity: "Common" },
  44: { name: "Metal Pants", rarity: "Common" },
  47: { name: "Noble Iron", rarity: "Common" },
  48: { name: "Action Figure", rarity: "Epic" },
  49: { name: "Meteor Staff", rarity: "Epic" },
  50: { name: "Frost Flake", rarity: "Epic" },
  51: { name: "Stick Horse", rarity: "Epic" },
  52: { name: "Fire Heart", rarity: "Common" },
  53: { name: "Rocket Backpack", rarity: "Epic" },
  56: { name: "Stun Blaster", rarity: "Common" },
  57: { name: "Flame Blower", rarity: "Common" },
  59: { name: "Electro Fangs", rarity: "Epic" },
  60: { name: "Revenge Deck", rarity: "Epic" },
};

const TROOP_BY_ID: Record<
  number,
  { name: string; housingSpace: number; isSiege?: boolean; isSuper?: boolean }
> = {
  0: { name: "Barbarian", housingSpace: 1 },
  1: { name: "Archer", housingSpace: 1 },
  2: { name: "Goblin", housingSpace: 1 },
  3: { name: "Giant", housingSpace: 5 },
  4: { name: "Wall Breaker", housingSpace: 2 },
  5: { name: "Balloon", housingSpace: 5 },
  6: { name: "Wizard", housingSpace: 4 },
  7: { name: "Healer", housingSpace: 14 },
  8: { name: "Dragon", housingSpace: 20 },
  9: { name: "P.E.K.K.A", housingSpace: 25 },
  10: { name: "Minion", housingSpace: 2 },
  11: { name: "Hog Rider", housingSpace: 5 },
  12: { name: "Valkyrie", housingSpace: 8 },
  13: { name: "Golem", housingSpace: 30 },
  15: { name: "Witch", housingSpace: 12 },
  17: { name: "Lava Hound", housingSpace: 30 },
  22: { name: "Bowler", housingSpace: 6 },
  23: { name: "Baby Dragon", housingSpace: 10 },
  24: { name: "Miner", housingSpace: 6 },
  26: { name: "Super Barbarian", housingSpace: 5, isSuper: true },
  27: { name: "Super Archer", housingSpace: 12, isSuper: true },
  28: { name: "Super Wall Breaker", housingSpace: 8, isSuper: true },
  29: { name: "Super Giant", housingSpace: 10, isSuper: true },
  30: { name: "Ice Wizard", housingSpace: 4 },
  45: { name: "Battle Ram", housingSpace: 4 },
  47: { name: "Royal Ghost", housingSpace: 8 },
  48: { name: "Pumpkin Barbarian", housingSpace: 1 },
  50: { name: "Giant Skeleton", housingSpace: 20 },
  51: { name: "Wall Wrecker", housingSpace: 1, isSiege: true },
  52: { name: "Battle Blimp", housingSpace: 1, isSiege: true },
  53: { name: "Yeti", housingSpace: 18 },
  55: { name: "Sneaky Goblin", housingSpace: 3, isSuper: true },
  56: { name: "Super Miner", housingSpace: 24, isSuper: true },
  57: { name: "Rocket Balloon", housingSpace: 8, isSuper: true },
  58: { name: "Ice Golem", housingSpace: 15 },
  59: { name: "Electro Dragon", housingSpace: 30 },
  61: { name: "Skeleton Barrel", housingSpace: 5 },
  62: { name: "Stone Slammer", housingSpace: 1, isSiege: true },
  63: { name: "Inferno Dragon", housingSpace: 15, isSuper: true },
  64: { name: "Super Valkyrie", housingSpace: 20, isSuper: true },
  65: { name: "Dragon Rider", housingSpace: 25 },
  66: { name: "Super Witch", housingSpace: 40, isSuper: true },
  67: { name: "M.E.C.H.A", housingSpace: 10 },
  72: { name: "Party Wizard", housingSpace: 4 },
  75: { name: "Siege Barracks", housingSpace: 1, isSiege: true },
  76: { name: "Ice Hound", housingSpace: 40, isSuper: true },
  80: { name: "Super Bowler", housingSpace: 30, isSuper: true },
  81: { name: "Super Dragon", housingSpace: 40, isSuper: true },
  82: { name: "Headhunter", housingSpace: 6 },
  83: { name: "Super Wizard", housingSpace: 10, isSuper: true },
  84: { name: "Super Minion", housingSpace: 12, isSuper: true },
  87: { name: "Log Launcher", housingSpace: 1, isSiege: true },
  91: { name: "Flame Flinger", housingSpace: 1, isSiege: true },
  92: { name: "Battle Drill", housingSpace: 1, isSiege: true },
  94: { name: "Ram Rider", housingSpace: 12 },
  95: { name: "Electro Titan", housingSpace: 32 },
  97: { name: "Apprentice Warden", housingSpace: 20 },
  98: { name: "Super Hog Rider", housingSpace: 12, isSuper: true },
  101: { name: "Barcher", housingSpace: 3 },
  102: { name: "Witch Golem", housingSpace: 41 },
  103: { name: "Hog Wizard", housingSpace: 7 },
  104: { name: "Lavaloon", housingSpace: 21 },
  106: { name: "Electrofire Wizard", housingSpace: 14 },
  109: { name: "Ruin Witch", housingSpace: 26 },
  110: { name: "Root Rider", housingSpace: 20 },
  118: { name: "C.O.O.K.I.E", housingSpace: 10 },
  119: { name: "Firecracker", housingSpace: 10 },
  120: { name: "Azure Dragon", housingSpace: 40 },
  121: { name: "Barbarian Kicker", housingSpace: 12 },
  122: { name: "Giant Thrower", housingSpace: 15 },
  123: { name: "Druid", housingSpace: 16 },
  125: { name: "Broom Witch", housingSpace: 20 },
  130: { name: "Ice Minion", housingSpace: 4 },
  132: { name: "Thrower", housingSpace: 16 },
  135: { name: "Troop Launcher", housingSpace: 1, isSiege: true },
  136: { name: "Debt Collector", housingSpace: 4 },
  142: { name: "Snake Barrel", housingSpace: 8 },
  147: { name: "Super Yeti", housingSpace: 35, isSuper: true },
  150: { name: "Furnace", housingSpace: 18 },
  156: { name: "Giant Giant", housingSpace: 50 },
  157: { name: "K.A.N.E", housingSpace: 75 },
  158: { name: "The Disarmer", housingSpace: 60 },
  159: { name: "YEETer", housingSpace: 45 },
  167: { name: "Meteor Golem", housingSpace: 40 },
  177: { name: "Meteor Golem", housingSpace: 40 },
  185: { name: "Elephant Rider", housingSpace: 24 },
  188: { name: "Sky Wagon", housingSpace: 1, isSiege: true },
  190: { name: "Yeti Undertaker", housingSpace: 80 },
};

const SPELL_BY_ID: Record<number, { name: string; housingSpace: number }> = {
  0: { name: "Lightning Spell", housingSpace: 1 },
  1: { name: "Healing Spell", housingSpace: 2 },
  2: { name: "Rage Spell", housingSpace: 2 },
  3: { name: "Jump Spell", housingSpace: 2 },
  5: { name: "Freeze Spell", housingSpace: 1 },
  6: { name: "Clone Spell", housingSpace: 3 },
  9: { name: "Poison Spell", housingSpace: 1 },
  10: { name: "Earthquake Spell", housingSpace: 1 },
  11: { name: "Haste Spell", housingSpace: 1 },
  17: { name: "Skeleton Spell", housingSpace: 1 },
  28: { name: "Bat Spell", housingSpace: 1 },
  35: { name: "Invisibility Spell", housingSpace: 1 },
  53: { name: "Recall Spell", housingSpace: 2 },
  70: { name: "Overgrowth Spell", housingSpace: 2 },
  88: { name: "Bag of Frostmites", housingSpace: 1 },
  94: { name: "Santa's Surprise", housingSpace: 1 },
  98: { name: "Revive Spell", housingSpace: 2 },
  109: { name: "Ice Block Spell", housingSpace: 1 },
  120: { name: "Totem Spell", housingSpace: 1 },
};

export function deriveArmyName(
  troops: { name: string; count: number; housingSpace?: number; totalHousingSpace?: number }[],
  maxUnits = 3,
  locale: "tr" | "en" = "tr"
): string {
  const emptyLabel = locale === "tr" ? "Ordu tespit edilemedi" : "Army not detected";
  if (!troops || troops.length === 0) return emptyLabel;
  const scored: { totalSpace: number; count: number; name: string }[] = [];
  for (const t of troops) {
    const name = (t.name || "").trim();
    if (!name) continue;
    const count = Math.max(1, Number(t.count || 1));
    const unitSpace = Math.max(1, Number(t.housingSpace || 1));
    const totalSpace = Number(t.totalHousingSpace || count * unitSpace);
    scored.push({ totalSpace, count, name });
  }
  if (scored.length === 0) return emptyLabel;
  scored.sort((a, b) => b.totalSpace - a.totalSpace || b.count - a.count);
  const significant = scored.filter((s) => s.totalSpace >= 12);
  const chosen = (significant.length > 0 ? significant : scored).slice(0, maxUnits);
  return chosen.map((c) => c.name).join(" + ");
}

function unknownLabel(id: number, locale: "tr" | "en"): string {
  return locale === "tr" ? `Bilinmeyen (ID: ${id})` : `Unknown (ID: ${id})`;
}

function parseCountXIdPairs(segment: string): { count: number; id: number }[] {
  if (!segment) return [];
  const out: { count: number; id: number }[] = [];
  for (const tok of segment.split("-")) {
    const clean = tok.trim();
    if (!clean) continue;
    const m = /^(\d+)x(\d+)$/i.exec(clean);
    if (m) {
      out.push({ count: parseInt(m[1], 10), id: parseInt(m[2], 10) });
    }
  }
  return out;
}

export function parseArmyShareCode(
  rawCode: string,
  locale: "tr" | "en" = "tr"
): DecodedArmyShare {
  let clean = (rawCode || "").trim();
  if (clean.includes("army=")) {
    clean = clean.split("army=", 2)[1]?.split("&", 1)[0]?.trim() || "";
  }
  const armyLink = buildCopyArmyLink(clean);

  if (!clean) {
    return {
      armyShareCode: "",
      armyLink: "",
      armyName: locale === "tr" ? "Ordu tespit edilemedi" : "Army not detected",
      troopSignature: "",
      heroes: [],
      siegeMachines: [],
      clanCastle: [],
      clanCastleTroops: [],
      clanCastleSpells: [],
      troops: [],
      spells: [],
      totalTroopHousing: 0,
      totalSpellSpace: 0,
      unknownIds: [],
    };
  }

  // Extract h, i, d, u, s, e sections
  const sections: Record<string, string> = {};
  const tokenRegex = /(?:^|(?<=\d))([hiduse])(?=\d)/gi;
  const matches: { key: string; index: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(clean)) !== null) {
    matches.push({ key: match[1].toLowerCase(), index: match.index });
  }
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + 1;
    const end = i + 1 < matches.length ? matches[i + 1].index : clean.length;
    sections[matches[i].key] = clean.slice(start, end).replace(/^-+|-+$/g, "");
  }

  const heroes: DecodedHeroSlot[] = [];
  const siegeMachines: DecodedUnitSlot[] = [];
  const clanCastleTroops: DecodedUnitSlot[] = [];
  const clanCastleSpells: DecodedUnitSlot[] = [];
  const troops: DecodedUnitSlot[] = [];
  const spells: DecodedUnitSlot[] = [];
  const unknownIds: string[] = [];

  // 1. Heroes (`h`)
  const hSeg = sections["h"] || "";
  if (hSeg) {
    for (const hTok of hSeg.split("-")) {
      const token = hTok.trim();
      if (!token) continue;
      const hm = /^(\d+)(?:m\d+)?(?:p(\d+))?(?:e([\d_]+))?$/i.exec(token);
      if (!hm) continue;
      const heroId = parseInt(hm[1], 10);
      const petId = hm[2] !== undefined ? parseInt(hm[2], 10) : null;
      const eqRaw = hm[3];

      let heroName = HERO_BY_ID[heroId];
      const heroUnknown = !heroName;
      if (!heroName) {
        heroName = unknownLabel(heroId, locale);
        unknownIds.push(`hero:${heroId}`);
        console.warn(`Unknown Hero ID in armyShareCode: ${heroId}`);
      }

      let petObj: DecodedHeroPet | null = null;
      if (petId !== null) {
        let petName = PET_BY_ID[petId];
        const petUnknown = !petName;
        if (!petName) {
          petName = unknownLabel(petId, locale);
          unknownIds.push(`pet:${petId}`);
          console.warn(`Unknown Pet ID in armyShareCode: ${petId}`);
        }
        petObj = { id: petId, name: petName, unknown: petUnknown };
      }

      const eqList: DecodedHeroEquipment[] = [];
      if (eqRaw) {
        for (const eqPart of eqRaw.split("_")) {
          if (!eqPart || !/^\d+$/.test(eqPart)) continue;
          const eqId = parseInt(eqPart, 10);
          const eqMeta = EQUIPMENT_BY_ID[eqId];
          if (eqMeta) {
            eqList.push({
              id: eqId,
              name: eqMeta.name,
              rarity: eqMeta.rarity,
              unknown: false,
            });
          } else {
            unknownIds.push(`equipment:${eqId}`);
            console.warn(`Unknown Equipment ID in armyShareCode: ${eqId}`);
            eqList.push({
              id: eqId,
              name: unknownLabel(eqId, locale),
              rarity: "Common",
              unknown: true,
            });
          }
        }
      }

      heroes.push({
        id: heroId,
        name: heroName,
        pet: petObj,
        equipment: eqList,
        unknown: heroUnknown,
      });
    }
  }

  // 2. Clan Castle troops / sieges (`i`)
  for (const { count, id } of parseCountXIdPairs(sections["i"] || "")) {
    const tMeta = TROOP_BY_ID[id];
    if (tMeta?.isSiege) {
      siegeMachines.push({
        id,
        name: tMeta.name,
        count,
        category: "siege",
        unknown: false,
      });
    } else if (tMeta) {
      clanCastleTroops.push({
        id,
        name: tMeta.name,
        count,
        housingSpace: tMeta.housingSpace,
        totalHousingSpace: tMeta.housingSpace * count,
        category: "troop",
        unknown: false,
      });
    } else {
      unknownIds.push(`cc_troop:${id}`);
      console.warn(`Unknown CC Troop ID in armyShareCode (i): ${id}`);
      clanCastleTroops.push({
        id,
        name: unknownLabel(id, locale),
        count,
        housingSpace: 1,
        totalHousingSpace: count,
        category: "troop",
        unknown: true,
      });
    }
  }

  // 3. Clan Castle spells / troops (`d`)
  for (const { count, id } of parseCountXIdPairs(sections["d"] || "")) {
    const sMeta = SPELL_BY_ID[id];
    if (sMeta) {
      clanCastleSpells.push({
        id,
        name: sMeta.name,
        count,
        housingSpace: sMeta.housingSpace,
        totalSpellSpace: sMeta.housingSpace * count,
        category: "spell",
        unknown: false,
      });
    } else if (TROOP_BY_ID[id]) {
      const tMeta = TROOP_BY_ID[id];
      clanCastleTroops.push({
        id,
        name: tMeta.name,
        count,
        housingSpace: tMeta.housingSpace,
        totalHousingSpace: tMeta.housingSpace * count,
        category: "troop",
        unknown: false,
      });
    } else {
      unknownIds.push(`cc_spell:${id}`);
      console.warn(`Unknown CC Spell ID in armyShareCode (d): ${id}`);
      clanCastleSpells.push({
        id,
        name: unknownLabel(id, locale),
        count,
        housingSpace: 1,
        totalSpellSpace: count,
        category: "spell",
        unknown: true,
      });
    }
  }

  // 4. Main Troops & Siege Machines (`u`)
  let totalTroopHousing = 0;
  for (const { count, id } of parseCountXIdPairs(sections["u"] || "")) {
    const tMeta = TROOP_BY_ID[id];
    if (tMeta?.isSiege) {
      siegeMachines.push({
        id,
        name: tMeta.name,
        count,
        category: "siege",
        unknown: false,
      });
    } else if (tMeta) {
      const totalSpace = tMeta.housingSpace * count;
      totalTroopHousing += totalSpace;
      troops.push({
        id,
        name: tMeta.name,
        count,
        housingSpace: tMeta.housingSpace,
        totalHousingSpace: totalSpace,
        superTroopIsActive: Boolean(tMeta.isSuper),
        category: "troop",
        unknown: false,
      });
    } else {
      unknownIds.push(`troop:${id}`);
      console.warn(`Unknown Troop ID in armyShareCode (u): ${id}`);
      troops.push({
        id,
        name: unknownLabel(id, locale),
        count,
        housingSpace: 1,
        totalHousingSpace: count,
        superTroopIsActive: false,
        category: "troop",
        unknown: true,
      });
    }
  }

  // 5. Main Spells (`s`)
  let totalSpellSpace = 0;
  for (const { count, id } of parseCountXIdPairs(sections["s"] || "")) {
    const sMeta = SPELL_BY_ID[id];
    if (sMeta) {
      const totalSpace = sMeta.housingSpace * count;
      totalSpellSpace += totalSpace;
      spells.push({
        id,
        name: sMeta.name,
        count,
        housingSpace: sMeta.housingSpace,
        totalSpellSpace: totalSpace,
        category: "spell",
        unknown: false,
      });
    } else {
      unknownIds.push(`spell:${id}`);
      console.warn(`Unknown Spell ID in armyShareCode (s): ${id}`);
      spells.push({
        id,
        name: unknownLabel(id, locale),
        count,
        housingSpace: 1,
        totalSpellSpace: count,
        category: "spell",
        unknown: true,
      });
    }
  }

  const clanCastle: DecodedUnitSlot[] = [...clanCastleTroops, ...clanCastleSpells];
  const armyName = deriveArmyName(troops, 3, locale);
  const troopSignature = [...troops]
    .sort((a, b) => a.id - b.id)
    .map((t) => `${t.count}x${t.id}`)
    .join("-");

  return {
    armyShareCode: clean,
    armyLink,
    armyName,
    troopSignature,
    heroes,
    siegeMachines,
    clanCastle,
    clanCastleTroops,
    clanCastleSpells,
    troops,
    spells,
    totalTroopHousing,
    totalSpellSpace,
    unknownIds,
  };
}

