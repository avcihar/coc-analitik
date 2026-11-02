/**
 * Clash of Clans Analytics Platform — TypeScript Data Schemas
 * ============================================================
 * Strict TypeScript types and Zod runtime validators for:
 *   - Player profile (heroes, pets, equipment)
 *   - Supercell BattleLogEntry
 *   - Parsed army structure (troops, spells, sieges, hero equipment)
 *
 * Stack: TypeScript 5.x + Zod v3
 * All schemas are co-located with their Zod validator so both static
 * types and runtime validation are available from a single import.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared Validators / Constants
// ---------------------------------------------------------------------------

/** CoC player/clan tag without leading #, uppercase, 3–12 alphanumeric chars */
const CocTagSchema = z
  .string()
  .min(3)
  .max(12)
  .regex(/^[0-9A-Z]+$/, "Tag must be uppercase alphanumeric without #")
  .transform((v) => v.replace(/^#/, "").toUpperCase());

export type CocTag = z.infer<typeof CocTagSchema>;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const BattleTypeSchema = z.enum([
  "multiplayer",
  "clan_war",
  "cwl",
  "raid_weekend",
  "friendly",
  "builder_base",
]);
export type BattleType = z.infer<typeof BattleTypeSchema>;

export const HeroNameSchema = z.enum([
  "Barbarian King",
  "Archer Queen",
  "Grand Warden",
  "Royal Champion",
  "Minion Prince",
]);
export type HeroName = z.infer<typeof HeroNameSchema>;

export const PetNameSchema = z.enum([
  "L.A.S.S.I",
  "Electro Owl",
  "Mighty Yak",
  "Unicorn",
  "Frosty",
  "Diggy",
  "Poison Lizard",
  "Phoenix",
  "Spirit Fox",
  "Angry Jelly",
]);
export type PetName = z.infer<typeof PetNameSchema>;

export const EquipmentRaritySchema = z.enum(["Common", "Epic"]);
export type EquipmentRarity = z.infer<typeof EquipmentRaritySchema>;

export const ClanRoleSchema = z.enum(["member", "elder", "coLeader", "leader"]);
export type ClanRole = z.infer<typeof ClanRoleSchema>;

export const WarPreferenceSchema = z.enum(["in", "out"]);
export type WarPreference = z.infer<typeof WarPreferenceSchema>;

// ---------------------------------------------------------------------------
// ── Hero Equipment ────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

export const HeroEquipmentSchema = z
  .object({
    name: z.string().min(1),
    level: z.number().int().min(1),
    maxLevel: z.number().int().min(1),
    rarity: EquipmentRaritySchema,
    village: z.enum(["home", "builderBase"]).default("home"),
  })
  .refine((eq) => eq.level <= eq.maxLevel, {
    message: "Equipment level cannot exceed maxLevel",
    path: ["level"],
  });

export type HeroEquipment = z.infer<typeof HeroEquipmentSchema>;

// ---------------------------------------------------------------------------
// ── Hero ─────────────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

export const HeroSchema = z
  .object({
    name: HeroNameSchema,
    level: z.number().int().min(1),
    maxLevel: z.number().int().min(1),
    village: z.enum(["home", "builderBase"]).default("home"),
    /** Equipment CURRENTLY equipped on this hero (max 2 in home village). */
    equipment: z.array(HeroEquipmentSchema).max(2).default([]),
  })
  .refine((h) => h.level <= h.maxLevel, {
    message: "Hero level cannot exceed maxLevel",
    path: ["level"],
  });

export type Hero = z.infer<typeof HeroSchema>;

// ---------------------------------------------------------------------------
// ── Pet ──────────────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

export const PetSchema = z
  .object({
    name: PetNameSchema,
    level: z.number().int().min(1),
    maxLevel: z.number().int().min(1),
    village: z.literal("home").default("home"),
  })
  .refine((p) => p.level <= p.maxLevel, {
    message: "Pet level cannot exceed maxLevel",
    path: ["level"],
  });

export type Pet = z.infer<typeof PetSchema>;

// ---------------------------------------------------------------------------
// ── Clan Reference ───────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

export const ClanReferenceSchema = z.object({
  tag: CocTagSchema,
  name: z.string().min(1),
  clanLevel: z.number().int().min(1).optional(),
  badgeUrls: z
    .object({
      small: z.string().url(),
      medium: z.string().url().optional(),
      large: z.string().url().optional(),
    })
    .optional(),
});

export type ClanReference = z.infer<typeof ClanReferenceSchema>;

// ---------------------------------------------------------------------------
// ── Player Profile ────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

export const PlayerProfileSchema = z
  .object({
    // ── Identity
    tag: CocTagSchema,
    name: z.string().min(1).max(64),
    expLevel: z.number().int().min(1),

    // ── Village levels
    townHallLevel: z.number().int().min(1).max(17),
    townHallWeaponLevel: z.number().int().min(1).max(5).optional(),
    builderHallLevel: z.number().int().min(1).max(10).optional(),

    // ── Trophies
    trophies: z.number().int().min(0),
    bestTrophies: z.number().int().min(0),
    builderBaseTrophies: z.number().int().min(0).optional(),
    bestBuilderBaseTrophies: z.number().int().min(0).optional(),

    // ── War stats
    warStars: z.number().int().min(0).default(0),
    warPreference: WarPreferenceSchema.optional(),
    attackWins: z.number().int().min(0).default(0),
    defenseWins: z.number().int().min(0).default(0),

    // ── Heroes
    heroes: z.array(HeroSchema).default([]),

    // ── Pets (aliased as heroEquipment.troops in CoC API; re-typed here)
    heroEquipmentPets: z.array(PetSchema).default([]),

    // ── Clan membership
    clan: ClanReferenceSchema.optional(),
    role: ClanRoleSchema.optional(),
    donations: z.number().int().min(0).default(0),
    donationsReceived: z.number().int().min(0).default(0),

    // ── Analytics metadata
    lastScoutedAt: z.string().datetime({ offset: true }),
    scoutedBy: z.string().optional(),
  })
  .refine(
    (p) => {
      // TH Weapon level is only present from TH13+
      if (p.townHallWeaponLevel !== undefined && p.townHallLevel < 13) {
        return false;
      }
      return true;
    },
    {
      message: "townHallWeaponLevel is only applicable for Town Hall 13+",
      path: ["townHallWeaponLevel"],
    }
  );

export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

// ---------------------------------------------------------------------------
// ── Parsed Army Structure ────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

export const TroopSlotSchema = z.object({
  id: z.number().int().min(1),
  name: z.string().min(1),
  count: z.number().int().min(1),
  level: z.number().int().min(1),
  superTroopIsActive: z.boolean().default(false),
});
export type TroopSlot = z.infer<typeof TroopSlotSchema>;

export const SpellSlotSchema = z.object({
  id: z.number().int().min(1),
  name: z.string().min(1),
  count: z.number().int().min(1),
  level: z.number().int().min(1),
});
export type SpellSlot = z.infer<typeof SpellSlotSchema>;

export const SiegeMachineSchema = z.object({
  id: z.number().int().min(1),
  name: z.string().min(1),
  level: z.number().int().min(1),
  count: z.literal(1).default(1),
});
export type SiegeMachine = z.infer<typeof SiegeMachineSchema>;

export const HeroEquipmentSlotSchema = z.object({
  hero: HeroNameSchema,
  equipmentName: z.string().min(1),
  equipmentLevel: z.number().int().min(1),
});
export type HeroEquipmentSlot = z.infer<typeof HeroEquipmentSlotSchema>;

export const ParsedArmySchema = z
  .object({
    troops: z.array(TroopSlotSchema).default([]),
    spells: z.array(SpellSlotSchema).default([]),
    /** At most one siege machine per attack. */
    sieges: z.array(SiegeMachineSchema).max(1).default([]),
    /** Equipment active on each hero during this specific attack. */
    heroEquipment: z.array(HeroEquipmentSlotSchema).default([]),
    armyShareCode: z.string().max(64).optional(),
    totalHousingSpace: z.number().int().min(0).optional(),
  })
  .refine(
    (army) => {
      // Ensure no duplicate hero entries
      const heroes = army.heroEquipment.map((s) => s.hero);
      return heroes.length === new Set(heroes).size;
    },
    { message: "Duplicate hero entries found in heroEquipment.", path: ["heroEquipment"] }
  );

export type ParsedArmy = z.infer<typeof ParsedArmySchema>;

// ---------------------------------------------------------------------------
// ── BattleLogEntry ───────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

export const AttackDetailSchema = z.object({
  attackerTag: CocTagSchema,
  defenderTag: CocTagSchema,
  stars: z.number().int().min(0).max(3),
  destructionPercentage: z.number().min(0).max(100),
  order: z.number().int().min(1),
  /** Attack duration in seconds (reported by the API on some battle types). */
  duration: z.number().int().min(0).optional(),
});
export type AttackDetail = z.infer<typeof AttackDetailSchema>;

export const BattleLogEntrySchema = z
  .object({
    // ── Identifiers
    battleId: z.string().uuid(),
    playerTag: CocTagSchema,

    // ── Classification
    battleType: BattleTypeSchema,

    // ── Top-level outcome (for fast aggregation)
    stars: z.number().int().min(0).max(3),
    destructionPercentage: z.number().min(0).max(100),

    // ── Attacks (at least one required)
    attacks: z.array(AttackDetailSchema).min(1),

    // ── Opposing base
    defenderTag: CocTagSchema.optional(),
    defenderTownHall: z.number().int().min(1).max(17).optional(),

    // ── Clan war context
    clanWarId: z.string().uuid().optional(),
    warMapPosition: z.number().int().min(1).optional(),
    attackOrder: z.number().int().min(1).max(2).optional(),

    // ── Army
    armyShareCode: z.string().max(64).optional(),
    parsedArmy: ParsedArmySchema.optional(),

    // ── Timestamps (ISO 8601 with timezone offset required)
    battleTimestamp: z.string().datetime({ offset: true }),
    ingestedAt: z.string().datetime({ offset: true }),
  })
  // CWL battles must carry a clan war ID
  .refine(
    (e) => !(e.battleType === "cwl" && !e.clanWarId),
    { message: "CWL battles require a clanWarId.", path: ["clanWarId"] }
  )
  // stars field must match first attack for single-attack battles
  .refine(
    (e) => {
      if (e.attacks.length === 1 && e.attacks[0].stars !== e.stars) {
        return false;
      }
      return true;
    },
    {
      message:
        "stars must match attacks[0].stars for single-attack battles.",
      path: ["stars"],
    }
  );

export type BattleLogEntry = z.infer<typeof BattleLogEntrySchema>;

// ---------------------------------------------------------------------------
// ── Convenience: type guards ─────────────────────────────────────────────────
// ---------------------------------------------------------------------------

export function isPlayerProfile(data: unknown): data is PlayerProfile {
  return PlayerProfileSchema.safeParse(data).success;
}

export function isBattleLogEntry(data: unknown): data is BattleLogEntry {
  return BattleLogEntrySchema.safeParse(data).success;
}

export function isParsedArmy(data: unknown): data is ParsedArmy {
  return ParsedArmySchema.safeParse(data).success;
}
