"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Crown,
  Sparkles,
  Swords,
  Flame,
  Shield,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
  Castle,
} from "lucide-react";
import { SectionPanel, TownHallImage, IconFrame, GameButton } from "@/components/game";
import AccordionSection from "./AccordionSection";
import PlayerBattleLogSection from "./PlayerBattleLogSection";
import { useLanguage } from "@/lib/i18n";
import type {
  PlayerProfileViewData,
  UnitItem,
  ImportedEquipmentItem,
  BattleLogEntry,
} from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function normalizeUnitKey(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

const CANONICAL_NAME_MAP: Record<string, string> = {
  ruinwitch: "Ruin Witch",
  trooplauncher: "Troop Launcher",
  headhunter: "Headhunter",
  lassi: "L.A.S.S.I",
  superpekka: "Super P.E.K.K.A",
  pekkatitansquad: "P.E.K.K.A Titan Squad",
};

function getCanonicalUnitName(rawName: string): string {
  const key = normalizeUnitKey(rawName);
  return CANONICAL_NAME_MAP[key] || rawName.trim();
}

const DARK_TROOP_KEYS = new Set([
  "minion",
  "hogrider",
  "valkyrie",
  "golem",
  "witch",
  "lavahound",
  "bowler",
  "icegolem",
  "headhunter",
  "apprenticewarden",
  "druid",
  "furnace",
  "ruinwitch",
]);

const SQUAD_TROOP_KEYS = new Set([
  "barchsquad",
  "giantwizardsquad",
  "wallbreakersquad",
  "minionsquad",
  "balloonsquad",
  "golemwitchsquad",
  "hogridersquad",
  "minersquad",
  "healersquad",
  "pekkatitansquad",
  "dragonssquad",
  "babydragonsquad",
]);

const SIEGE_MACHINE_KEYS = new Set([
  "wallwrecker",
  "battleblimp",
  "stoneslammer",
  "siegebarracks",
  "loglauncher",
  "flameflinger",
  "battledrill",
  "trooplauncher",
  "skywagon",
]);

const KNOWN_PET_KEYS = new Set([
  "lassi",
  "electroowl",
  "mightyyak",
  "unicorn",
  "frosty",
  "diggy",
  "poisonlizard",
  "phoenix",
  "spiritfox",
  "angryjelly",
  "snoop",
  "sneezy",
  "walrus",
  "greedyraven",
]);

const KNOWN_SUPER_TROOP_KEYS = new Set([
  "superbarbarian",
  "superarcher",
  "supergiant",
  "sneakygoblin",
  "superwallbreaker",
  "rocketballoon",
  "superwizard",
  "superdragon",
  "infernodragon",
  "superminion",
  "supervalkyrie",
  "superwitch",
  "icehound",
  "superbowler",
  "superminer",
  "superhogrider",
  "superyeti",
  "superpekka",
]);

const CANONICAL_HOME_HEROES: string[] = [
  "Barbarian King",
  "Archer Queen",
  "Minion Prince",
  "Grand Warden",
  "Royal Champion",
  "Dragon Duke",
];

const CANONICAL_HOME_PETS: string[] = [
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
  "Sneezy",
  "Greedy Raven",
];

const CANONICAL_ELIXIR_TROOPS: string[] = [
  "Barbarian",
  "Archer",
  "Giant",
  "Goblin",
  "Wall Breaker",
  "Balloon",
  "Wizard",
  "Healer",
  "Dragon",
  "P.E.K.K.A",
  "Baby Dragon",
  "Miner",
  "Electro Dragon",
  "Yeti",
  "Dragon Rider",
  "Electro Titan",
  "Root Rider",
  "Thrower",
  "Meteor Golem",
];

const CANONICAL_DARK_TROOPS: string[] = [
  "Minion",
  "Hog Rider",
  "Valkyrie",
  "Golem",
  "Witch",
  "Lava Hound",
  "Bowler",
  "Ice Golem",
  "Headhunter",
  "Apprentice Warden",
  "Druid",
  "Furnace",
  "Ruin Witch",
];

const CANONICAL_SQUAD_TROOPS: string[] = [
  "Barch Squad",
  "Giant Wizard Squad",
  "Wall Breaker Squad",
  "Minion Squad",
  "Balloon Squad",
  "Golem Witch Squad",
  "Hog Rider Squad",
  "Miner Squad",
  "Healer Squad",
  "P.E.K.K.A Titan Squad",
  "Dragons Squad",
  "Baby Dragon Squad",
];

const CANONICAL_HOME_SPELLS: string[] = [
  "Lightning Spell",
  "Healing Spell",
  "Rage Spell",
  "Jump Spell",
  "Freeze Spell",
  "Clone Spell",
  "Invisibility Spell",
  "Recall Spell",
  "Revive Spell",
  "Overgrowth Spell",
  "Heroic Spell",
  "Poison Spell",
  "Earthquake Spell",
  "Haste Spell",
  "Skeleton Spell",
  "Bat Spell",
  "Ice Block Spell",
  "Totem Spell",
  "Angry Spell",
];

const CANONICAL_SIEGE_MACHINES: string[] = [
  "Wall Wrecker",
  "Battle Blimp",
  "Stone Slammer",
  "Siege Barracks",
  "Log Launcher",
  "Flame Flinger",
  "Battle Drill",
  "Troop Launcher",
  "Sky Wagon",
];

const CANONICAL_SUPER_TROOPS: string[] = [
  "Super Barbarian",
  "Super Archer",
  "Super Giant",
  "Sneaky Goblin",
  "Super Wall Breaker",
  "Rocket Balloon",
  "Super Wizard",
  "Super Dragon",
  "Inferno Dragon",
  "Super Minion",
  "Super Valkyrie",
  "Super Witch",
  "Ice Hound",
  "Super Bowler",
  "Super Miner",
  "Super Hog Rider",
  "Super Yeti",
];

interface CanonicalHeroEquipment {
  name: string;
  heroName: string;
  rarity: "Common" | "Epic";
}

const CANONICAL_HERO_EQUIPMENT: CanonicalHeroEquipment[] = [
  // Barbarian King
  { name: "Barbarian Puppet", heroName: "Barbarian King", rarity: "Common" },
  { name: "Rage Vial", heroName: "Barbarian King", rarity: "Common" },
  { name: "Earthquake Boots", heroName: "Barbarian King", rarity: "Common" },
  { name: "Vampstache", heroName: "Barbarian King", rarity: "Common" },
  { name: "Giant Gauntlet", heroName: "Barbarian King", rarity: "Epic" },
  { name: "Spiky Ball", heroName: "Barbarian King", rarity: "Epic" },
  { name: "Snake Bracelet", heroName: "Barbarian King", rarity: "Epic" },
  { name: "Stick Horse", heroName: "Barbarian King", rarity: "Epic" },
  // Archer Queen
  { name: "Archer Puppet", heroName: "Archer Queen", rarity: "Common" },
  { name: "Invisibility Vial", heroName: "Archer Queen", rarity: "Common" },
  { name: "Giant Arrow", heroName: "Archer Queen", rarity: "Common" },
  { name: "Healer Puppet", heroName: "Archer Queen", rarity: "Common" },
  { name: "Monolith Arrow", heroName: "Archer Queen", rarity: "Common" },
  { name: "Frozen Arrow", heroName: "Archer Queen", rarity: "Epic" },
  { name: "Magic Mirror", heroName: "Archer Queen", rarity: "Epic" },
  { name: "Action Figure", heroName: "Archer Queen", rarity: "Epic" },
  // Minion Prince
  { name: "Henchmen Puppet", heroName: "Minion Prince", rarity: "Common" },
  { name: "Dark Orb", heroName: "Minion Prince", rarity: "Common" },
  { name: "Metal Pants", heroName: "Minion Prince", rarity: "Common" },
  { name: "Noble Iron", heroName: "Minion Prince", rarity: "Common" },
  { name: "Dark Crown", heroName: "Minion Prince", rarity: "Epic" },
  { name: "Meteor Staff", heroName: "Minion Prince", rarity: "Epic" },
  { name: "Portal Pendant", heroName: "Minion Prince", rarity: "Epic" },
  // Grand Warden
  { name: "Eternal Tome", heroName: "Grand Warden", rarity: "Common" },
  { name: "Life Gem", heroName: "Grand Warden", rarity: "Common" },
  { name: "Rage Gem", heroName: "Grand Warden", rarity: "Common" },
  { name: "Healing Tome", heroName: "Grand Warden", rarity: "Common" },
  { name: "Fireball", heroName: "Grand Warden", rarity: "Epic" },
  { name: "Heroic Torch", heroName: "Grand Warden", rarity: "Epic" },
  { name: "Lavaloon Puppet", heroName: "Grand Warden", rarity: "Epic" },
  // Royal Champion
  { name: "Royal Gem", heroName: "Royal Champion", rarity: "Common" },
  { name: "Seeking Shield", heroName: "Royal Champion", rarity: "Common" },
  { name: "Hog Rider Puppet", heroName: "Royal Champion", rarity: "Common" },
  { name: "Haste Vial", heroName: "Royal Champion", rarity: "Common" },
  { name: "Rocket Spear", heroName: "Royal Champion", rarity: "Epic" },
  { name: "Electro Boots", heroName: "Royal Champion", rarity: "Epic" },
  { name: "Frost Flake", heroName: "Royal Champion", rarity: "Epic" },
  // Dragon Duke
  { name: "Fire Heart", heroName: "Dragon Duke", rarity: "Common" },
  { name: "Flame Blower", heroName: "Dragon Duke", rarity: "Common" },
  { name: "Stun Blaster", heroName: "Dragon Duke", rarity: "Common" },
  { name: "Electro Fangs", heroName: "Dragon Duke", rarity: "Epic" },
  { name: "Revenge Deck", heroName: "Dragon Duke", rarity: "Epic" },
  { name: "Rocket Backpack", heroName: "Dragon Duke", rarity: "Epic" },
];

interface EquipmentGridEntry {
  name: string;
  heroName?: string;
  rarity: "Common" | "Epic";
  level?: number;
  maxLevel?: number;
  isActive: boolean;
  locked: boolean;
  canonicalOrder: number;
}

function resolveEquipmentRarity(
  activeEq?: ImportedEquipmentItem,
  unlockedEq?: ImportedEquipmentItem,
  canonicalRarity?: "Common" | "Epic"
): "Common" | "Epic" {
  for (const eq of [activeEq, unlockedEq]) {
    const apiRarity = eq?.rarity?.trim().toLowerCase();
    if (apiRarity === "epic") return "Epic";
    if (apiRarity === "common") return "Common";
  }
  for (const eq of [activeEq, unlockedEq]) {
    if (eq?.maxLevel === 27) return "Epic";
    if (eq?.maxLevel === 18) return "Common";
  }
  return canonicalRarity ?? "Common";
}

function getEquipmentSortBucket(entry: EquipmentGridEntry): number {
  if (entry.isActive) return 0;
  if (!entry.locked) return 1;
  return 2;
}

interface MergedUnitEntry {
  name: string;
  item?: UnitItem;
  locked: boolean;
}

function mergeWithCanonical(
  unlockedItems: UnitItem[],
  canonicalNames: string[]
): MergedUnitEntry[] {
  const byKey = new Map<string, UnitItem>();
  for (const item of unlockedItems) {
    byKey.set(normalizeUnitKey(item.name), item);
  }

  const out: MergedUnitEntry[] = [];
  const usedKeys = new Set<string>();

  for (const canonicalName of canonicalNames) {
    const key = normalizeUnitKey(canonicalName);
    usedKeys.add(key);
    const matched = byKey.get(key);
    const isUnlocked = Boolean(matched && (matched.level ?? 1) > 0);
    out.push({
      name: matched?.name || canonicalName,
      item: isUnlocked ? matched : undefined,
      locked: !isUnlocked,
    });
  }

  for (const item of unlockedItems) {
    const key = normalizeUnitKey(item.name);
    if (!usedKeys.has(key)) {
      usedKeys.add(key);
      out.push({
        name: item.name,
        item,
        locked: false,
      });
    }
  }

  return out;
}

function UnitGridTile({
  name,
  level,
  maxLevel,
  tileType,
  showName = true,
  locked = false,
  lockedLabel = "Locked",
  className,
}: {
  name: string;
  level?: number;
  maxLevel?: number;
  tileType: "elixir" | "dark-elixir" | "spell" | "siege" | "super" | "hero" | "pet";
  showName?: boolean;
  locked?: boolean;
  lockedLabel?: string;
  className?: string;
}) {
  const isMax =
    !locked &&
    level !== undefined &&
    maxLevel !== undefined &&
    level >= maxLevel &&
    maxLevel > 0;

  return (
    <div
      title={
        locked
          ? `${name} (${lockedLabel})`
          : `${name}${level !== undefined ? ` (${level}${maxLevel ? `/${maxLevel}` : ""})` : ""}`
      }
      className={cn(
        "ui-info p-1.5 sm:p-2 flex flex-col items-center justify-start gap-1 text-center shadow-inner min-w-0 transition-opacity",
        locked && "opacity-75",
        isMax && "border-[var(--ui-text-gold)]/40",
        className
      )}
    >
      <IconFrame
        name={name}
        level={locked ? undefined : level}
        maxLevel={locked ? undefined : maxLevel}
        isMax={isMax}
        size="unit"
        tileType={tileType}
        className={locked ? "grayscale brightness-75 opacity-60" : undefined}
      />
      {showName && (
        <span
          className={cn(
            "text-[11px] font-semibold leading-tight truncate w-full",
            locked ? "text-[var(--ui-text-muted)]" : "text-[var(--ui-text-main)]"
          )}
        >
          {name}
        </span>
      )}
    </div>
  );
}

interface CategoryProgressStats {
  current: number;
  max: number;
  pct: number;
  maxedCount: number;
  totalCount: number;
}

function computeProgress(
  items: { level?: number; maxLevel?: number }[]
): CategoryProgressStats {
  let current = 0;
  let max = 0;
  let maxedCount = 0;
  let totalCount = 0;

  for (const item of items) {
    if (
      typeof item.maxLevel === "number" &&
      item.maxLevel > 0 &&
      typeof item.level === "number"
    ) {
      const lvl = Math.max(0, Math.min(item.level, item.maxLevel));
      current += lvl;
      max += item.maxLevel;
      totalCount += 1;
      if (lvl >= item.maxLevel) {
        maxedCount += 1;
      }
    }
  }

  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 1000) / 10) : 0;
  return { current, max, pct, maxedCount, totalCount };
}

export interface PlayerArmySectionProps {
  player: PlayerProfileViewData;
  onImportPlayerToOre?: (player: PlayerProfileViewData) => void;
  battleLog?: BattleLogEntry[];
  battleLogLoading?: boolean;
  className?: string;
}

/**
 * PlayerArmySection
 * Spacious full-width row grids for clean scanning:
 *   Row 1: Overview Strip (Town Hall | Season Stats | Ore Calculator CTA)
 *   Row 2: Heroes | Pets (2-column split)
 *   Row 3: Hero Equipment (4-column grid, all Home Village equipment with active highlights)
 *   Row 4: Categorized Army (Elixir Troops, Dark Troops, Squads, Spells & Sieges, Super Troops)
 *   Row 5: Ranked Battle Log (full-width)
 */
export default function PlayerArmySection({
  player,
  onImportPlayerToOre,
  battleLog,
  battleLogLoading = false,
  className,
}: PlayerArmySectionProps) {
  const { t, isTr, fmtNum, fmtPct, fmtTemplate } = useLanguage();
  const [importedFlash, setImportedFlash] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const handleTransferToOre = () => {
    if (!onImportPlayerToOre) return;
    onImportPlayerToOre(player);
    setImportedFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setImportedFlash(false), 2000);
  };

  const isBuilderBase = (u: { village?: string }) =>
    Boolean(u.village && u.village.toLowerCase() === "builderbase");

  // Home Heroes
  const homeHeroes = (player.heroes || []).filter((h) => !isBuilderBase(h));

  // Active Hero Equipment (currently equipped on heroes)
  const activeEquipmentList: (ImportedEquipmentItem & { heroName: string })[] =
    homeHeroes.flatMap((hero) =>
      (hero.equipment || []).map((eq) => ({
        ...eq,
        heroName: eq.hero || hero.name,
      }))
    );

  const activeEqMap = new Map<string, ImportedEquipmentItem & { heroName: string }>();
  for (const eq of activeEquipmentList) {
    const key = normalizeUnitKey(eq.name);
    if (!activeEqMap.has(key)) {
      activeEqMap.set(key, eq);
    }
  }

  // Collect all unlocked equipment (player.heroEquipment merged with activeEquipmentList)
  const unlockedEqMap = new Map<string, ImportedEquipmentItem & { heroName?: string }>();
  for (const eq of player.heroEquipment || []) {
    if (isBuilderBase(eq) || (eq.level ?? 1) <= 0) continue;
    const key = normalizeUnitKey(eq.name);
    if (!unlockedEqMap.has(key)) {
      unlockedEqMap.set(key, eq);
    }
  }
  for (const eq of activeEquipmentList) {
    const key = normalizeUnitKey(eq.name);
    if (!unlockedEqMap.has(key)) {
      unlockedEqMap.set(key, eq);
    }
  }
  const unlockedEquipmentList = Array.from(unlockedEqMap.values());

  // Build unified Home Village Hero Equipment roster (active -> unlocked -> locked)
  const seenEquipmentKeys = new Set<string>();
  const unsortedEquipmentEntries: EquipmentGridEntry[] = [];

  CANONICAL_HERO_EQUIPMENT.forEach((canonical, index) => {
    const key = normalizeUnitKey(canonical.name);
    seenEquipmentKeys.add(key);

    const activeEq = activeEqMap.get(key);
    const unlockedEq = unlockedEqMap.get(key);
    const eqSource = activeEq || unlockedEq;
    const isActive = Boolean(activeEq);
    const isUnlocked = isActive || Boolean(unlockedEq);

    unsortedEquipmentEntries.push({
      name: eqSource?.name || canonical.name,
      heroName: activeEq?.heroName || unlockedEq?.heroName || unlockedEq?.hero || canonical.heroName,
      rarity: resolveEquipmentRarity(activeEq, unlockedEq, canonical.rarity),
      level: activeEq?.level ?? unlockedEq?.level,
      maxLevel: activeEq?.maxLevel ?? unlockedEq?.maxLevel,
      isActive,
      locked: !isUnlocked,
      canonicalOrder: index,
    });
  });

  let extraEquipmentOrder = CANONICAL_HERO_EQUIPMENT.length;
  for (const eq of unlockedEquipmentList) {
    const key = normalizeUnitKey(eq.name);
    if (seenEquipmentKeys.has(key)) continue;
    seenEquipmentKeys.add(key);

    const activeEq = activeEqMap.get(key);
    const eqSource = activeEq || eq;
    const isActive = Boolean(activeEq);

    unsortedEquipmentEntries.push({
      name: eqSource.name,
      heroName: activeEq?.heroName || eq.heroName || eq.hero,
      rarity: resolveEquipmentRarity(activeEq, eq),
      level: activeEq?.level ?? eq.level,
      maxLevel: activeEq?.maxLevel ?? eq.maxLevel,
      isActive,
      locked: false,
      canonicalOrder: extraEquipmentOrder++,
    });
  }

  const allEquipmentEntries = unsortedEquipmentEntries.sort((a, b) => {
    const bucketDiff = getEquipmentSortBucket(a) - getEquipmentSortBucket(b);
    if (bucketDiff !== 0) return bucketDiff;

    if (!a.locked && !a.isActive) {
      const levelDiff = (b.level ?? 0) - (a.level ?? 0);
      if (levelDiff !== 0) return levelDiff;
      const rarityDiff = (b.rarity === "Epic" ? 1 : 0) - (a.rarity === "Epic" ? 1 : 0);
      if (rarityDiff !== 0) return rarityDiff;
    }

    return a.canonicalOrder - b.canonicalOrder;
  });

  const activeEquipmentCount = allEquipmentEntries.filter((e) => e.isActive).length;
  const unlockedEquipmentCount = allEquipmentEntries.filter((e) => !e.locked).length;

  // Pets
  const petsList: UnitItem[] = [...(player.pets || [])].map((p) => ({
    ...p,
    name: getCanonicalUnitName(p.name),
  }));
  for (const tr of player.troops || []) {
    const key = normalizeUnitKey(tr.name);
    if (!isBuilderBase(tr) && KNOWN_PET_KEYS.has(key)) {
      const canonical = getCanonicalUnitName(tr.name);
      if (!petsList.some((p) => normalizeUnitKey(p.name) === key)) {
        petsList.push({ ...tr, name: canonical });
      }
    }
  }

  const homeTroops = (player.troops || [])
    .filter((tr) => !isBuilderBase(tr))
    .map((tr) => ({ ...tr, name: getCanonicalUnitName(tr.name) }));

  // Super Troops (active ones sorted first)
  const superTroopsList = homeTroops
    .filter((tr) => {
      const key = normalizeUnitKey(tr.name);
      return (
        Boolean(tr.superTroopIsActive) ||
        tr.name.toLowerCase().startsWith("super ") ||
        KNOWN_SUPER_TROOP_KEYS.has(key)
      );
    })
    .sort((a, b) => Number(Boolean(b.superTroopIsActive)) - Number(Boolean(a.superTroopIsActive)));

  const superKeySet = new Set(superTroopsList.map((st) => normalizeUnitKey(st.name)));
  const activeSuperCount = superTroopsList.filter((st) => Boolean(st.superTroopIsActive)).length;

  // Siege Machines
  const siegesList = homeTroops.filter((tr) => {
    const key = normalizeUnitKey(tr.name);
    return !superKeySet.has(key) && SIEGE_MACHINE_KEYS.has(key);
  });
  const siegeKeySet = new Set(siegesList.map((sm) => normalizeUnitKey(sm.name)));

  // TH19 Squad Troops
  const squadTroopsList = homeTroops.filter((tr) => {
    const key = normalizeUnitKey(tr.name);
    return (
      !superKeySet.has(key) &&
      !siegeKeySet.has(key) &&
      !KNOWN_PET_KEYS.has(key) &&
      SQUAD_TROOP_KEYS.has(key)
    );
  });
  const squadKeySet = new Set(squadTroopsList.map((sq) => normalizeUnitKey(sq.name)));

  // Dark Troops
  const darkTroopsList = homeTroops.filter((tr) => {
    const key = normalizeUnitKey(tr.name);
    return (
      !superKeySet.has(key) &&
      !siegeKeySet.has(key) &&
      !squadKeySet.has(key) &&
      !KNOWN_PET_KEYS.has(key) &&
      DARK_TROOP_KEYS.has(key)
    );
  });
  const darkKeySet = new Set(darkTroopsList.map((dt) => normalizeUnitKey(dt.name)));

  // Standard Elixir Troops
  const elixirTroopsList = homeTroops.filter((tr) => {
    const key = normalizeUnitKey(tr.name);
    return (
      !superKeySet.has(key) &&
      !siegeKeySet.has(key) &&
      !squadKeySet.has(key) &&
      !darkKeySet.has(key) &&
      !KNOWN_PET_KEYS.has(key)
    );
  });

  // Spells
  const spellsList = (player.spells || []).filter((s) => !isBuilderBase(s));

  // Merge with canonical Home Village rosters so locked units render cleanly in grayscale
  const mergedHeroes = mergeWithCanonical(homeHeroes, CANONICAL_HOME_HEROES);
  const mergedPets = mergeWithCanonical(petsList, CANONICAL_HOME_PETS);
  const mergedElixirTroops = mergeWithCanonical(elixirTroopsList, CANONICAL_ELIXIR_TROOPS);
  const mergedDarkTroops = mergeWithCanonical(darkTroopsList, CANONICAL_DARK_TROOPS);
  const mergedSquadTroops = mergeWithCanonical(squadTroopsList, CANONICAL_SQUAD_TROOPS);
  const mergedSpells = mergeWithCanonical(spellsList, CANONICAL_HOME_SPELLS);
  const mergedSieges = mergeWithCanonical(siegesList, CANONICAL_SIEGE_MACHINES);
  const mergedSuperTroops = mergeWithCanonical(superTroopsList, CANONICAL_SUPER_TROOPS).sort(
    (a, b) =>
      Number(Boolean(b.item?.superTroopIsActive)) -
        Number(Boolean(a.item?.superTroopIsActive)) ||
      Number(a.locked) - Number(b.locked)
  );

  const lockedLabel = isTr ? "Açık değil" : "Locked";
  const unlockedHeroCount = mergedHeroes.filter((u) => !u.locked).length;
  const unlockedPetCount = mergedPets.filter((u) => !u.locked).length;
  const unlockedElixirCount = mergedElixirTroops.filter((u) => !u.locked).length;
  const unlockedDarkCount = mergedDarkTroops.filter((u) => !u.locked).length;
  const unlockedSquadCount = mergedSquadTroops.filter((u) => !u.locked).length;
  const unlockedSpellCount = mergedSpells.filter((u) => !u.locked).length;
  const unlockedSiegeCount = mergedSieges.filter((u) => !u.locked).length;
  const hasTroops = mergedElixirTroops.length > 0 || mergedDarkTroops.length > 0;

  // Real API-backed Village Progression Percentages (Zero fake numbers)
  const heroesProg = computeProgress(homeHeroes);
  const equipmentSourceForProgress =
    unlockedEquipmentList.length > 0 ? unlockedEquipmentList : activeEquipmentList;
  const equipmentProg = computeProgress(equipmentSourceForProgress);
  const petsProg = computeProgress(petsList);
  const troopsProg = computeProgress([
    ...elixirTroopsList,
    ...darkTroopsList,
    ...squadTroopsList,
  ]);
  const spellsProg = computeProgress(spellsList);
  const siegesProg = computeProgress(siegesList);

  const progressCategories = [
    {
      key: "heroes",
      label: isTr ? "Kahramanlar" : "Heroes",
      stats: heroesProg,
    },
    {
      key: "equipment",
      label: isTr ? "Ekipmanlar" : "Equipment",
      stats: equipmentProg,
    },
    {
      key: "pets",
      label: isTr ? "Evcil Hayvanlar" : "Pets",
      stats: petsProg,
    },
    {
      key: "troops",
      label: isTr ? "Birlikler" : "Troops",
      stats: troopsProg,
    },
    {
      key: "spells",
      label: isTr ? "Büyüler" : "Spells",
      stats: spellsProg,
    },
    {
      key: "sieges",
      label: isTr ? "Kuşatma" : "Siege",
      stats: siegesProg,
    },
  ].filter((cat) => cat.stats.max > 0);

  const overallCurrent = progressCategories.reduce((acc, c) => acc + c.stats.current, 0);
  const overallMax = progressCategories.reduce((acc, c) => acc + c.stats.max, 0);
  const overallMaxedCount = progressCategories.reduce((acc, c) => acc + c.stats.maxedCount, 0);
  const overallTotalCount = progressCategories.reduce((acc, c) => acc + c.stats.totalCount, 0);
  const overallPct =
    overallMax > 0 ? Math.min(100, Math.round((overallCurrent / overallMax) * 1000) / 10) : 0;

  const seasonStats = [
    {
      key: "donations",
      label: t.player.donations,
      value: fmtNum(player.donations ?? 0),
      icon: (
        <ArrowUpRight size={14} className="text-[var(--ui-text-green)] shrink-0" aria-hidden="true" />
      ),
      valueColor: "text-[var(--ui-text-main)]",
    },
    {
      key: "donationsReceived",
      label: t.player.donationsReceived,
      value: fmtNum(player.donationsReceived ?? 0),
      icon: (
        <ArrowDownLeft size={14} className="text-[var(--ui-text-gold)] shrink-0" aria-hidden="true" />
      ),
      valueColor: "text-[var(--ui-text-main)]",
    },
    {
      key: "attackWins",
      label: t.player.attackWins,
      value: fmtNum(player.attackWins ?? 0),
      icon: <Swords size={14} className="text-[var(--ui-text-green)] shrink-0" aria-hidden="true" />,
      valueColor: "text-[var(--ui-text-green)]",
    },
    {
      key: "defenseWins",
      label: t.player.defenseWins,
      value: fmtNum(player.defenseWins ?? 0),
      icon: <Shield size={14} className="text-[var(--ui-text-gold)] shrink-0" aria-hidden="true" />,
      valueColor: "text-[var(--ui-text-gold)]",
    },
  ];

  const oreButtonLabel = importedFlash
    ? isTr
      ? "Cevher Analizine Aktarıldı"
      : "Transferred to Ore Analysis"
    : isTr
    ? "Ekipmanları Cevher Analizine Aktar"
    : t.player.sendToOre;

  return (
    <div className={cn("space-y-4", className)}>
      {/* ROW 1: Overview Strip — Town Hall | Season Stats | Ore CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Town Hall Card */}
        <SectionPanel className="lg:col-span-3 p-3.5 sm:p-4 flex items-center">
          <div className="flex items-center gap-3.5 min-w-0 w-full">
            <div className="ui-well p-2 shrink-0 flex items-center justify-center">
              <TownHallImage
                level={player.townHallLevel}
                weaponLevel={player.townHallWeaponLevel}
                size={76}
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-[11px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider">
                {t.common.townHall}
              </div>
              <div className="font-game game-text-stroke text-lg sm:text-xl font-black text-[var(--ui-text-main)] tabular-nums leading-tight">
                {t.common.thShort} {fmtNum(player.townHallLevel)}
              </div>
              {player.townHallWeaponLevel !== undefined && player.townHallWeaponLevel > 1 && (
                <div className="inline-block px-2 py-0.5 rounded bg-[var(--game-dark-box-dark)] border border-[var(--ui-info-border)] text-xs font-bold text-[var(--ui-text-gold)] tabular-nums">
                  {fmtTemplate(t.player.weaponLevel, {
                    level: fmtNum(player.townHallWeaponLevel),
                  })}
                </div>
              )}
            </div>
          </div>
        </SectionPanel>

        {/* Season Stats (4-up horizontal grid) */}
        <SectionPanel
          title={isTr ? "Sezon İstatistikleri" : "Current Season Stats"}
          icon={<TrendingUp size={18} className="text-[var(--ui-text-gold)]" aria-hidden="true" />}
          className={cn(onImportPlayerToOre ? "lg:col-span-6" : "lg:col-span-9")}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {seasonStats.map((stat) => (
              <div
                key={stat.key}
                className="ui-info px-3 py-2.5 flex flex-col justify-between gap-1.5 shadow-inner min-w-0"
              >
                <div className="flex items-start gap-1.5 text-[11px] font-semibold text-[var(--ui-text-muted)] leading-snug min-w-0">
                  <span className="mt-0.5 shrink-0">{stat.icon}</span>
                  <span>{stat.label}</span>
                </div>
                <span
                  className={cn(
                    "text-base sm:text-lg font-black tabular-nums leading-none",
                    stat.valueColor
                  )}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </SectionPanel>

        {/* Ore Calculator CTA Card */}
        {onImportPlayerToOre && (
          <SectionPanel className="lg:col-span-3 p-3.5 sm:p-4 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="ui-well px-2 py-1.5 flex items-center -space-x-1 shrink-0">
                  <img
                    src="/icons/ores/shiny-ore.png"
                    alt=""
                    aria-hidden="true"
                    className="w-4 h-4 object-contain select-none"
                  />
                  <img
                    src="/icons/ores/glowy-ore.png"
                    alt=""
                    aria-hidden="true"
                    className="w-4 h-4 object-contain select-none"
                  />
                  <img
                    src="/icons/ores/starry-ore.png"
                    alt=""
                    aria-hidden="true"
                    className="w-4 h-4 object-contain select-none"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-[var(--ui-text-main)] truncate">
                    {isTr ? "Demirci Cevher" : "Blacksmith Ores"}
                  </div>
                  <div className="text-[11px] font-semibold text-[var(--ui-text-muted)] tabular-nums truncate">
                    {fmtTemplate(t.meta.recordsCount, {
                      count: fmtNum(unlockedEquipmentList.length),
                    })}
                  </div>
                </div>
              </div>
            </div>

            <GameButton
              variant="green"
              size="sm"
              onClick={handleTransferToOre}
              className="w-full min-h-[44px] text-xs font-bold"
              icon={
                importedFlash ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <img
                    src="/icons/ores/starry-ore.png"
                    alt=""
                    aria-hidden="true"
                    className="w-4 h-4 object-contain shrink-0 select-none"
                  />
                )
              }
            >
              {oreButtonLabel}
            </GameButton>
          </SectionPanel>
        )}
      </div>

      {/* ROW 1B: Real API-Backed Village Progression Summary */}
      {overallMax > 0 && (
        <SectionPanel
          title={isTr ? "Köy İlerleme Özeti" : "Village Progression Summary"}
          icon={<CheckCircle2 size={18} className="text-[var(--ui-text-green)]" aria-hidden="true" />}
          rightBadge={
            <div className="flex items-center gap-2 tabular-nums">
              <span className="text-xs font-semibold text-[var(--ui-text-muted)]">
                {overallMaxedCount}/{overallTotalCount} {isTr ? "Maks." : "Max"}
              </span>
              <span
                className={cn(
                  "ui-pill px-2.5 py-0.5 text-xs sm:text-sm font-black",
                  overallPct >= 100
                    ? "text-[var(--ui-text-green)]"
                    : "text-[var(--ui-text-gold)]"
                )}
              >
                {fmtPct(overallPct, 1)}
              </span>
            </div>
          }
        >
          <div className="space-y-3">
            {/* Overall Progress Bar */}
            <div className="ui-well p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold tabular-nums">
                <span className="text-[var(--ui-text-muted)] uppercase tracking-wider">
                  {isTr ? "Genel İlerleme" : "Overall Progress"}
                </span>
                <span className="text-[var(--ui-text-main)] font-mono">
                  {fmtNum(overallCurrent)} / {fmtNum(overallMax)} {isTr ? "Sv." : "Lv."}
                </span>
              </div>
              <div
                className="h-2.5 w-full rounded-full bg-[var(--game-dark-box-dark)] border border-[var(--ui-well-border)] overflow-hidden"
                aria-hidden="true"
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    overallPct >= 100
                      ? "bg-[var(--game-btn-green-mid)]"
                      : "bg-[var(--game-btn-gold-mid)]"
                  )}
                  style={{ width: `${Math.max(2, Math.min(100, overallPct))}%` }}
                />
              </div>
            </div>

            {/* Category Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {progressCategories.map((cat) => {
                const isComplete = cat.stats.pct >= 100;
                return (
                  <div
                    key={cat.key}
                    className="ui-info px-3 py-2.5 flex flex-col justify-between gap-2 shadow-inner min-w-0"
                  >
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <span className="text-[11px] font-bold text-[var(--ui-text-muted)] truncate">
                        {cat.label}
                      </span>
                      <span
                        className={cn(
                          "text-xs sm:text-sm font-black tabular-nums shrink-0",
                          isComplete
                            ? "text-[var(--ui-text-green)]"
                            : "text-[var(--ui-text-gold)]"
                        )}
                      >
                        {fmtPct(cat.stats.pct, 0)}
                      </span>
                    </div>

                    <div
                      className="h-1.5 w-full rounded-full bg-[var(--game-dark-box-dark)] overflow-hidden"
                      aria-hidden="true"
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isComplete
                            ? "bg-[var(--game-btn-green-mid)]"
                            : "bg-[var(--game-btn-gold-mid)]"
                        )}
                        style={{ width: `${Math.max(2, Math.min(100, cat.stats.pct))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--ui-text-muted)] tabular-nums">
                      <span>
                        {fmtNum(cat.stats.maxedCount)}/{fmtNum(cat.stats.totalCount)}{" "}
                        {isTr ? "Maks." : "Max"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionPanel>
      )}

      {/* ROW 2: Heroes & Pets (Balanced 2-column grid) */}
      {(mergedHeroes.length > 0 || mergedPets.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {mergedHeroes.length > 0 && (
            <div className={cn(mergedPets.length > 0 ? "lg:col-span-6" : "lg:col-span-12", "min-w-0")}>
              <AccordionSection
                title={t.player.battleHeroes}
                icon={<Crown size={18} className="text-[var(--ui-text-gold)]" aria-hidden="true" />}
                defaultOpenMobile={true}
                rightBadge={
                  <span className="text-xs font-bold text-[var(--ui-text-muted)] tabular-nums">
                    {fmtNum(unlockedHeroCount)} / {fmtNum(mergedHeroes.length)}
                  </span>
                }
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {mergedHeroes.map((entry) => (
                    <UnitGridTile
                      key={entry.name}
                      name={entry.name}
                      level={entry.item?.level}
                      maxLevel={entry.item?.maxLevel}
                      locked={entry.locked}
                      lockedLabel={lockedLabel}
                      tileType="hero"
                    />
                  ))}
                </div>
              </AccordionSection>
            </div>
          )}

          {mergedPets.length > 0 && (
            <div className={cn(mergedHeroes.length > 0 ? "lg:col-span-6" : "lg:col-span-12", "min-w-0")}>
              <AccordionSection
                title={t.player.pets}
                icon={
                  <Sparkles size={18} className="text-[var(--ui-text-gold)]" aria-hidden="true" />
                }
                defaultOpenMobile={true}
                rightBadge={
                  <span className="text-xs font-bold text-[var(--ui-text-muted)] tabular-nums">
                    {fmtNum(unlockedPetCount)} / {fmtNum(mergedPets.length)}
                  </span>
                }
              >
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {mergedPets.map((entry) => (
                    <UnitGridTile
                      key={entry.name}
                      name={entry.name}
                      level={entry.item?.level}
                      maxLevel={entry.item?.maxLevel}
                      locked={entry.locked}
                      lockedLabel={lockedLabel}
                      tileType="pet"
                    />
                  ))}
                </div>
              </AccordionSection>
            </div>
          )}
        </div>
      )}

      {/* ROW 3: Hero Equipment (Full-width 4-column card grid, all items shown) */}
      {allEquipmentEntries.length > 0 && (
        <AccordionSection
          title={isTr ? "Kahraman Ekipmanları" : "Hero Equipment"}
          icon={
            <img
              src="/icons/ores/glowy-ore.png"
              alt=""
              aria-hidden="true"
              className="w-[18px] h-[18px] object-contain shrink-0 select-none"
            />
          }
          defaultOpenMobile={false}
          rightBadge={
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/35 text-[var(--ui-text-green)] border border-[var(--ui-text-green)]/40 tabular-nums">
                {isTr
                  ? `Aktif: ${fmtNum(activeEquipmentCount)}`
                  : `Active: ${fmtNum(activeEquipmentCount)}`}
              </span>
              <span className="text-xs font-bold text-[var(--ui-text-muted)] tabular-nums">
                {fmtNum(unlockedEquipmentCount)} / {fmtNum(allEquipmentEntries.length)}
              </span>
            </div>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {allEquipmentEntries.map((eq, eqIdx) => {
              const isEpic = eq.rarity === "Epic";
              const rarityLabel = isEpic
                ? isTr
                  ? "Destansı"
                  : "Epic"
                : isTr
                ? "Yaygın"
                : "Common";
              const activeBadgeLabel = isTr ? "Aktif" : "Equipped";

              return (
                <div
                  key={normalizeUnitKey(eq.name) || `${eq.name}-${eqIdx}`}
                  title={
                    eq.locked
                      ? `${eq.name} (${lockedLabel})`
                      : `${eq.name}${
                          eq.level !== undefined
                            ? ` (${t.common.levelShort} ${fmtNum(eq.level)}${
                                eq.maxLevel ? `/${fmtNum(eq.maxLevel)}` : ""
                              })`
                            : ""
                        }${eq.isActive ? ` · ${activeBadgeLabel}` : ""}`
                  }
                  className={cn(
                    "ui-info px-2.5 py-2 flex items-center gap-2.5 shadow-inner min-w-0 transition-all",
                    eq.isActive &&
                      "border-[var(--ui-text-green)]/55 bg-emerald-950/20 ring-1 ring-[var(--ui-text-green)]/25",
                    eq.locked && "opacity-70"
                  )}
                >
                  <IconFrame
                    name={eq.name}
                    level={eq.locked ? undefined : eq.level}
                    maxLevel={eq.locked ? undefined : eq.maxLevel}
                    size="unit"
                    tileType="equipment"
                    rarity={isEpic ? "epic" : "common"}
                    className={eq.locked ? "grayscale brightness-75 opacity-60" : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={cn(
                          "text-xs font-bold truncate min-w-0",
                          eq.locked
                            ? "text-[var(--ui-text-muted)]"
                            : "text-[var(--ui-text-main)]"
                        )}
                      >
                        {eq.name}
                      </span>
                      {eq.isActive && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--game-dark-box-dark)] text-[var(--ui-text-green)] border border-[var(--ui-text-green)]/35 leading-none shrink-0">
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-[var(--ui-text-green)] shrink-0"
                            aria-hidden="true"
                          />
                          <span>{activeBadgeLabel}</span>
                        </span>
                      )}
                    </div>

                    {eq.locked ? (
                      <div className="text-[11px] font-semibold text-[var(--ui-text-muted)] mt-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="shrink-0">{rarityLabel}</span>
                          {eq.heroName && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{eq.heroName}</span>
                            </>
                          )}
                        </div>
                        <div className="text-[10px] font-semibold text-[var(--ui-text-muted)]/80 mt-0.5">
                          {lockedLabel}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] font-semibold text-[var(--ui-text-muted)] tabular-nums flex items-center gap-1 flex-wrap mt-0.5">
                        {eq.level !== undefined && (
                          <span>
                            {t.common.levelShort} {fmtNum(eq.level)}
                          </span>
                        )}
                        {eq.level !== undefined && <span aria-hidden="true">·</span>}
                        <span
                          className={
                            isEpic
                              ? "text-[var(--ui-text-gold)] font-bold"
                              : "text-[var(--ui-text-muted)]"
                          }
                        >
                          {rarityLabel}
                        </span>
                        {eq.heroName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{eq.heroName}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </AccordionSection>
      )}

      {/* ROW 4A: Home Village Troops (Full-width categorized Elixir & Dark Elixir grids) */}
      {hasTroops && (
        <AccordionSection
          title={t.player.armyTroopsTitle}
          icon={<Swords size={18} className="text-[var(--ui-text-gold)]" aria-hidden="true" />}
          defaultOpenMobile={false}
          rightBadge={
            <span className="text-xs font-bold text-[var(--ui-text-muted)] tabular-nums">
              {fmtNum(unlockedElixirCount + unlockedDarkCount)} /{" "}
              {fmtNum(mergedElixirTroops.length + mergedDarkTroops.length)}
            </span>
          }
        >
          <div className="space-y-4">
            {mergedElixirTroops.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src="/icons/ui/elixir.png"
                    alt=""
                    aria-hidden="true"
                    className="w-4 h-4 object-contain shrink-0 select-none"
                  />
                  <span className="text-xs font-bold text-[var(--ui-text-muted)] uppercase tracking-wider">
                    {t.player.elixirTroops}
                  </span>
                  <span className="ui-pill px-2 py-0.5 text-[11px] font-bold text-[var(--ui-text-main)] tabular-nums">
                    {fmtNum(unlockedElixirCount)} / {fmtNum(mergedElixirTroops.length)}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {mergedElixirTroops.map((entry) => (
                    <UnitGridTile
                      key={entry.name}
                      name={entry.name}
                      level={entry.item?.level}
                      maxLevel={entry.item?.maxLevel}
                      locked={entry.locked}
                      lockedLabel={lockedLabel}
                      tileType="elixir"
                    />
                  ))}
                </div>
              </div>
            )}

            {mergedDarkTroops.length > 0 && (
              <div
                className={cn(
                  mergedElixirTroops.length > 0 &&
                    "pt-3.5 border-t border-[var(--ui-panel-border)]"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src="/icons/ui/dark-elixir.png"
                    alt=""
                    aria-hidden="true"
                    className="w-4 h-4 object-contain shrink-0 select-none"
                  />
                  <span className="text-xs font-bold text-[var(--ui-text-muted)] uppercase tracking-wider">
                    {t.player.darkTroops}
                  </span>
                  <span className="ui-pill px-2 py-0.5 text-[11px] font-bold text-[var(--ui-text-main)] tabular-nums">
                    {fmtNum(unlockedDarkCount)} / {fmtNum(mergedDarkTroops.length)}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {mergedDarkTroops.map((entry) => (
                    <UnitGridTile
                      key={entry.name}
                      name={entry.name}
                      level={entry.item?.level}
                      maxLevel={entry.item?.maxLevel}
                      locked={entry.locked}
                      lockedLabel={lockedLabel}
                      tileType="dark-elixir"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </AccordionSection>
      )}

      {/* ROW 4B: TH19 Birlik Mangaları (Squads) */}
      {mergedSquadTroops.length > 0 && (
        <AccordionSection
          title={isTr ? "Birlik Mangaları (Squads)" : "Troop Squads"}
          icon={<Swords size={18} className="text-[var(--ui-text-gold)]" aria-hidden="true" />}
          defaultOpenMobile={false}
          rightBadge={
            <span className="text-xs font-bold text-[var(--ui-text-muted)] tabular-nums">
              {fmtNum(unlockedSquadCount)} / {fmtNum(mergedSquadTroops.length)}
            </span>
          }
        >
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {mergedSquadTroops.map((entry) => (
              <UnitGridTile
                key={entry.name}
                name={entry.name}
                level={entry.item?.level}
                maxLevel={entry.item?.maxLevel}
                locked={entry.locked}
                lockedLabel={lockedLabel}
                tileType="elixir"
              />
            ))}
          </div>
        </AccordionSection>
      )}

      {/* ROW 4C: Spells & Siege Machines (Side-by-side 8 / 4 columns) */}
      {(mergedSpells.length > 0 || mergedSieges.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {mergedSpells.length > 0 && (
            <div className={cn(mergedSieges.length > 0 ? "lg:col-span-8" : "lg:col-span-12", "min-w-0")}>
              <AccordionSection
                title={t.player.spells}
                icon={<Zap size={18} className="text-[var(--ui-text-gold)]" aria-hidden="true" />}
                defaultOpenMobile={false}
                rightBadge={
                  <span className="text-xs font-bold text-[var(--ui-text-muted)] tabular-nums">
                    {fmtNum(unlockedSpellCount)} / {fmtNum(mergedSpells.length)}
                  </span>
                }
              >
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                  {mergedSpells.map((entry) => (
                    <UnitGridTile
                      key={entry.name}
                      name={entry.name}
                      level={entry.item?.level}
                      maxLevel={entry.item?.maxLevel}
                      locked={entry.locked}
                      lockedLabel={lockedLabel}
                      tileType="spell"
                    />
                  ))}
                </div>
              </AccordionSection>
            </div>
          )}

          {mergedSieges.length > 0 && (
            <div className={cn(mergedSpells.length > 0 ? "lg:col-span-4" : "lg:col-span-12", "min-w-0")}>
              <AccordionSection
                title={t.player.siegeMachines}
                icon={
                  <Castle size={18} className="text-[var(--ui-text-gold)]" aria-hidden="true" />
                }
                defaultOpenMobile={false}
                rightBadge={
                  <span className="text-xs font-bold text-[var(--ui-text-muted)] tabular-nums">
                    {fmtNum(unlockedSiegeCount)} / {fmtNum(mergedSieges.length)}
                  </span>
                }
              >
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
                  {mergedSieges.map((entry) => (
                    <UnitGridTile
                      key={entry.name}
                      name={entry.name}
                      level={entry.item?.level}
                      maxLevel={entry.item?.maxLevel}
                      locked={entry.locked}
                      lockedLabel={lockedLabel}
                      tileType="siege"
                    />
                  ))}
                </div>
              </AccordionSection>
            </div>
          )}
        </div>
      )}

      {/* ROW 4D: Super Troops (Real API data + grayscale when inactive or locked; NO level badge) */}
      {mergedSuperTroops.length > 0 && (
        <AccordionSection
          title={isTr ? "Süper Birlikler" : t.player.superTroops}
          icon={<Flame size={18} className="text-[var(--ui-text-gold)]" aria-hidden="true" />}
          defaultOpenMobile={false}
          rightBadge={
            <div className="flex items-center gap-1.5">
              {activeSuperCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--game-dark-box-dark)] text-[var(--ui-text-green)] border border-[var(--ui-text-green)]/40 tabular-nums">
                  {t.player.activeBadge} ({fmtNum(activeSuperCount)})
                </span>
              )}
              <span className="text-xs font-bold text-[var(--ui-text-muted)] tabular-nums">
                {fmtTemplate(t.meta.recordsCount, { count: fmtNum(mergedSuperTroops.length) })}
              </span>
            </div>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {mergedSuperTroops.map((entry) => {
              const isActive = !entry.locked && Boolean(entry.item?.superTroopIsActive);
              return (
                <div
                  key={entry.name}
                  title={entry.locked ? `${entry.name} (${lockedLabel})` : entry.name}
                  className={cn(
                    "ui-info p-2 flex items-center gap-2 shadow-inner min-w-0 transition-all",
                    isActive
                      ? "border-[var(--ui-text-gold)] ring-1 ring-[var(--ui-text-gold)]/55"
                      : "opacity-80"
                  )}
                >
                  <IconFrame
                    name={entry.name}
                    size="sm"
                    tileType="super"
                    className={
                      isActive ? undefined : "grayscale brightness-90 opacity-75"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "text-xs font-bold truncate",
                        isActive
                          ? "text-[var(--ui-text-main)]"
                          : "text-[var(--ui-text-muted)]"
                      )}
                    >
                      {entry.name}
                    </div>
                    {isActive && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--game-dark-box-dark)] text-[var(--ui-text-green)] border border-[var(--ui-text-green)]/35 leading-none">
                        {t.player.activeBadge}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </AccordionSection>
      )}

      {/* ROW 5: Ranked Battle Log (Full-width) */}
      {battleLog !== undefined && (
        <PlayerBattleLogSection
          battleLog={battleLog}
          loading={battleLogLoading}
          defaultOpenMobile={false}
        />
      )}
    </div>
  );
}
