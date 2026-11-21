"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Swords,
  Crown,
  Castle,
  Zap,
  Shield,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  buildCopyArmyLink,
  parseArmyShareCode,
  type DecodedArmyShare,
} from "@/lib/armyLink";
import { safeFetchJson } from "@/lib/apiClient";
import { useLanguage } from "@/lib/i18n";
import {
  GameButton,
  IconFrame,
  SkeletonBlock,
} from "@/components/game";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type EquipmentRarityKind = "common" | "epic";

const ALL_HERO_FILTER = "ALL";

const HERO_TR_LABELS: Record<string, string> = {
  "Barbarian King": "Barbar Kral",
  "Archer Queen": "Okçu Kraliçe",
  "Grand Warden": "Büyük Koruyucu",
  "Royal Champion": "Kraliyet Şampiyonu",
  "Minion Prince": "Minyon Prens",
  "Dragon Duke": "Ejderha Dük",
};

function getHeroDisplayName(heroName: string, isTr: boolean): string {
  if (!isTr) return heroName;
  return HERO_TR_LABELS[heroName] || heroName;
}

interface EquipmentPairStat {
  hero: string;
  pair: string;
  equipments: string[];
  count: number;
  usagePct: number;
}

interface PetStat {
  hero?: string;
  name: string;
  count: number;
  usagePct: number;
  avgLevel?: number | null;
  levelSource?: string | null;
}

interface UnitUsageStat {
  name: string;
  count: number;
  usagePct: number;
  maxedPct?: number;
  avgLevel?: number;
}

interface HeroUsageStat {
  name: string;
  count: number;
  usagePct: number;
  avgLevel?: number | null;
  maxedPct?: number;
  maxedCount?: number;
}

interface RecommendedArmy {
  id: string;
  rank: number;
  name: string;
  townHallLevel: number;
  style: string;
  sampleCount?: number;
  threeStarCount?: number;
  avgDestructionPct?: number;
  usagePct: number;
  threeStarRatePct: number;
  totalTroopHousing?: number;
  totalSpellSpace?: number;
  heroLoadout: Record<
    string,
    {
      primaryPair: string[];
      pet?: string | null;
    }
  >;
  troops: {
    id: number;
    name: string;
    count: number;
    housingSpace?: number;
    totalHousingSpace?: number;
  }[];
  spells: {
    id: number;
    name: string;
    count: number;
    housingSpace?: number;
    totalSpellSpace?: number;
  }[];
  siegeMachines?: {
    id: number;
    name: string;
    count: number;
  }[];
  clanCastle?: {
    id: number;
    name: string;
    count: number;
    housingSpace?: number;
  }[];
  armyShareCode: string;
  copyArmyLink?: string;
  armyLink?: string;
}

interface MetaDashboardPayload {
  status: string;
  sampleSize: number;
  totalPlayersAnalyzed: number;
  filteredPlayersCount: number;
  failedPlayersCount: number;
  totalRankedAttacksAnalyzed: number;
  totalBattlesAnalyzed?: number;
  dataFetchedAt: string;
  townHallFilter: number;
  hasSufficientData?: boolean;
  isProcessing?: boolean;
  progress?: {
    processed: number;
    target: number;
    percentage: number;
    message: string;
  };
  statistics?: {
    hasSufficientData?: boolean;
    totalRankedAttacksAnalyzed?: number;
    heroUsage?: HeroUsageStat[];
    heroEquipmentPairs?: EquipmentPairStat[];
    equipmentByHero?: Record<string, EquipmentPairStat[]>;
    equipmentUsage?: { hero: string; name: string; count: number; usagePct: number }[];
    petUsage?: PetStat[];
    petUsageByHero?: Record<string, PetStat[]>;
    superTroopUsage?: { name: string; count: number; usagePct: number }[];
    troopUsage?: UnitUsageStat[];
    spellUsage?: UnitUsageStat[];
    siegeUsage?: UnitUsageStat[];
    townHallDistribution?: Record<string, number>;
  };
  metaArmies?: {
    topRecommendations?: RecommendedArmy[];
    recommendationsByTownHall?: Record<string, RecommendedArmy[]>;
  };
}

// Canonical Item Definitions matching official icons in frontend/public/icons/
// Rarity verified against armyLink.ts (EQUIPMENT_BY_ID) and inference.py (EQUIPMENT_BY_HERO)
const CANONICAL_EQUIPMENTS: {
  hero: string;
  name: string;
  rarity: EquipmentRarityKind;
}[] = [
  // Barbarian King (8)
  { hero: "Barbarian King", name: "Barbarian Puppet", rarity: "common" },
  { hero: "Barbarian King", name: "Rage Vial", rarity: "common" },
  { hero: "Barbarian King", name: "Earthquake Boots", rarity: "common" },
  { hero: "Barbarian King", name: "Vampstache", rarity: "common" },
  { hero: "Barbarian King", name: "Giant Gauntlet", rarity: "epic" },
  { hero: "Barbarian King", name: "Spiky Ball", rarity: "epic" },
  { hero: "Barbarian King", name: "Snake Bracelet", rarity: "epic" },
  { hero: "Barbarian King", name: "Stick Horse", rarity: "epic" },
  // Archer Queen (8)
  { hero: "Archer Queen", name: "Archer Puppet", rarity: "common" },
  { hero: "Archer Queen", name: "Invisibility Vial", rarity: "common" },
  { hero: "Archer Queen", name: "Giant Arrow", rarity: "common" },
  { hero: "Archer Queen", name: "Healer Puppet", rarity: "common" },
  { hero: "Archer Queen", name: "Frozen Arrow", rarity: "epic" },
  { hero: "Archer Queen", name: "Magic Mirror", rarity: "epic" },
  { hero: "Archer Queen", name: "Action Figure", rarity: "epic" },
  { hero: "Archer Queen", name: "Monolith Arrow", rarity: "common" },
  // Grand Warden (7)
  { hero: "Grand Warden", name: "Eternal Tome", rarity: "common" },
  { hero: "Grand Warden", name: "Life Gem", rarity: "common" },
  { hero: "Grand Warden", name: "Rage Gem", rarity: "common" },
  { hero: "Grand Warden", name: "Healing Tome", rarity: "common" },
  { hero: "Grand Warden", name: "Fireball", rarity: "epic" },
  { hero: "Grand Warden", name: "Heroic Torch", rarity: "epic" },
  { hero: "Grand Warden", name: "Lavaloon Puppet", rarity: "epic" },
  // Royal Champion (7)
  { hero: "Royal Champion", name: "Seeking Shield", rarity: "common" },
  { hero: "Royal Champion", name: "Royal Gem", rarity: "common" },
  { hero: "Royal Champion", name: "Haste Vial", rarity: "common" },
  { hero: "Royal Champion", name: "Hog Rider Puppet", rarity: "common" },
  { hero: "Royal Champion", name: "Rocket Spear", rarity: "epic" },
  { hero: "Royal Champion", name: "Electro Boots", rarity: "epic" },
  { hero: "Royal Champion", name: "Frost Flake", rarity: "epic" },
  // Minion Prince (7)
  { hero: "Minion Prince", name: "Dark Crown", rarity: "epic" },
  { hero: "Minion Prince", name: "Dark Orb", rarity: "common" },
  { hero: "Minion Prince", name: "Henchmen Puppet", rarity: "common" },
  { hero: "Minion Prince", name: "Metal Pants", rarity: "common" },
  { hero: "Minion Prince", name: "Meteor Staff", rarity: "epic" },
  { hero: "Minion Prince", name: "Noble Iron", rarity: "common" },
  { hero: "Minion Prince", name: "Portal Pendant", rarity: "epic" },
  // Dragon Duke (6)
  { hero: "Dragon Duke", name: "Electro Fangs", rarity: "epic" },
  { hero: "Dragon Duke", name: "Fire Heart", rarity: "common" },
  { hero: "Dragon Duke", name: "Flame Blower", rarity: "common" },
  { hero: "Dragon Duke", name: "Revenge Deck", rarity: "epic" },
  { hero: "Dragon Duke", name: "Rocket Backpack", rarity: "epic" },
  { hero: "Dragon Duke", name: "Stun Blaster", rarity: "common" },
];

const EQUIPMENT_RARITY_BY_NAME: Record<string, EquipmentRarityKind> = Object.fromEntries(
  CANONICAL_EQUIPMENTS.map((eq) => [eq.name.trim().toLowerCase(), eq.rarity])
);

function resolveEquipmentRarity(
  equipmentName?: string | null,
  parsedArmy?: DecodedArmyShare | null
): EquipmentRarityKind {
  const key = (equipmentName || "").trim().toLowerCase();
  if (!key) return "common";

  if (parsedArmy?.heroes?.length) {
    for (const hero of parsedArmy.heroes) {
      const matched = hero.equipment.find(
        (eq) => (eq.name || "").trim().toLowerCase() === key && !eq.unknown
      );
      if (matched?.rarity) {
        return matched.rarity.toLowerCase() === "epic" ? "epic" : "common";
      }
    }
  }

  return EQUIPMENT_RARITY_BY_NAME[key] ?? "common";
}

function getEquipmentFrameClass(rarity: EquipmentRarityKind): string {
  return rarity === "epic"
    ? "!border-[var(--game-btn-gold-mid)]"
    : "!border-[var(--game-btn-gray-bot)]";
}

function UsageMiniBar({ pct }: { pct: number }) {
  const safePct = Math.max(0, Math.min(100, pct));
  return (
    <div
      className="h-1.5 w-full rounded-full bg-[var(--game-dark-box-border)] overflow-hidden"
      aria-hidden="true"
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          safePct >= 70
            ? "bg-[var(--game-btn-green-mid)]"
            : "bg-[var(--game-btn-gold-mid)]"
        )}
        style={{ width: `${safePct}%` }}
      />
    </div>
  );
}

const CANONICAL_PETS: string[] = [
  "L.A.S.S.I",
  "Mighty Yak",
  "Electro Owl",
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

const CANONICAL_SIEGES: string[] = [
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

const CANONICAL_SPELLS: string[] = [
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
  "Poison Spell",
  "Earthquake Spell",
  "Haste Spell",
  "Skeleton Spell",
  "Bat Spell",
  "Ice Block Spell",
  "Totem Spell",
  "Angry Spell",
  "Heroic Spell",
];

const CANONICAL_TROOPS: string[] = [
  // Regular Elixir Troops (19)
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
  // Regular Dark Elixir Troops (13)
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
  // TH19 Squad Troops (12)
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

// Single Army Card Component matching in-game "Ordum -> Kaydedilen Setler"
function MetaArmyCard({
  army,
  defaultExpanded = false,
}: {
  army: RecommendedArmy;
  defaultExpanded?: boolean;
}) {
  const { locale, isTr, t, fmtNum, fmtPct, fmtTemplate } = useLanguage();
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  const shareCode = army.armyShareCode || army.armyLink || "";
  const copyUrl = army.copyArmyLink || buildCopyArmyLink(shareCode);
  const bodyId = `meta-army-body-${army.id}`;

  const parsedArmy = useMemo(
    () => (shareCode ? parseArmyShareCode(shareCode, locale) : null),
    [shareCode, locale]
  );

  // Real housing space & capacity calculations (parsedArmy via armyLink registries + backend field fallback)
  const fallbackTroopHousing = (army.troops || []).reduce((acc, item) => {
    if (typeof item.totalHousingSpace === "number" && item.totalHousingSpace > 0) {
      return acc + item.totalHousingSpace;
    }
    if (typeof item.housingSpace === "number" && item.housingSpace > 0) {
      return acc + item.housingSpace * (item.count || 0);
    }
    return acc;
  }, 0);

  const totalTroopHousing =
    (parsedArmy && parsedArmy.totalTroopHousing > 0 ? parsedArmy.totalTroopHousing : null) ??
    (typeof army.totalTroopHousing === "number" && army.totalTroopHousing > 0
      ? army.totalTroopHousing
      : null) ??
    fallbackTroopHousing;

  const fallbackSpellSpace = (army.spells || []).reduce((acc, item) => {
    if (typeof item.totalSpellSpace === "number" && item.totalSpellSpace > 0) {
      return acc + item.totalSpellSpace;
    }
    if (typeof item.housingSpace === "number" && item.housingSpace > 0) {
      return acc + item.housingSpace * (item.count || 0);
    }
    return acc;
  }, 0);

  const totalSpellSpace =
    (parsedArmy && parsedArmy.totalSpellSpace > 0 ? parsedArmy.totalSpellSpace : null) ??
    (typeof army.totalSpellSpace === "number" && army.totalSpellSpace > 0
      ? army.totalSpellSpace
      : null) ??
    fallbackSpellSpace;

  const backendSiegeUnits = (army.siegeMachines || []).reduce(
    (acc, sg) => acc + (sg.count || 0),
    0
  );
  const parsedSiegeUnits = (parsedArmy?.siegeMachines || []).reduce(
    (acc, sg) => acc + (sg.count || 0),
    0
  );
  const totalSiegeUnits = backendSiegeUnits > 0 ? backendSiegeUnits : parsedSiegeUnits;

  const parsedCcTroopSpace = (parsedArmy?.clanCastleTroops || []).reduce(
    (acc, item) =>
      acc +
      (item.totalHousingSpace ??
        ((item.housingSpace || 0) * (item.count || 0))),
    0
  );
  const parsedCcSpellSpace = (parsedArmy?.clanCastleSpells || []).reduce(
    (acc, item) =>
      acc +
      (item.totalSpellSpace ??
        ((item.housingSpace || 0) * (item.count || 0))),
    0
  );
  const backendCcHousing = (army.clanCastle || []).reduce(
    (acc, cc) =>
      acc +
      (typeof cc.housingSpace === "number" && cc.housingSpace > 0
        ? cc.housingSpace * (cc.count || 0)
        : 0),
    0
  );
  const totalCCUnits = (army.clanCastle || []).reduce(
    (acc, cc) => acc + (cc.count || 0),
    0
  );
  const ccTroopOrTotalSpace =
    parsedCcTroopSpace > 0
      ? parsedCcTroopSpace
      : backendCcHousing > 0
      ? backendCcHousing
      : totalCCUnits;
  const ccDisplayValue =
    parsedCcSpellSpace > 0
      ? `${fmtNum(ccTroopOrTotalSpace)} + ${fmtNum(parsedCcSpellSpace)}`
      : fmtNum(ccTroopOrTotalSpace);

  const hasUnknownName = (items?: { name?: string }[]) =>
    Boolean(
      items?.some(
        (x) =>
          (x.name || "").includes("Bilinmeyen") || (x.name || "").includes("Unknown")
      )
    );

  const displayTroops =
    army.troops && army.troops.length > 0 && !hasUnknownName(army.troops)
      ? army.troops
      : parsedArmy?.troops && parsedArmy.troops.length > 0
      ? parsedArmy.troops
      : army.troops || [];

  const displaySpells =
    army.spells && army.spells.length > 0 && !hasUnknownName(army.spells)
      ? army.spells
      : parsedArmy?.spells && parsedArmy.spells.length > 0
      ? parsedArmy.spells
      : army.spells || [];

  const displaySieges =
    army.siegeMachines && army.siegeMachines.length > 0 && !hasUnknownName(army.siegeMachines)
      ? army.siegeMachines
      : parsedArmy?.siegeMachines && parsedArmy.siegeMachines.length > 0
      ? parsedArmy.siegeMachines
      : army.siegeMachines || [];

  const displayClanCastle =
    army.clanCastle && army.clanCastle.length > 0 && !hasUnknownName(army.clanCastle)
      ? army.clanCastle
      : parsedArmy?.clanCastle && parsedArmy.clanCastle.length > 0
      ? parsedArmy.clanCastle
      : army.clanCastle || [];

  const displayArmyName =
    army.name && !army.name.includes("Bilinmeyen") && !army.name.includes("Unknown")
      ? army.name
      : parsedArmy?.armyName || army.name;

  const hasLoadout = army.heroLoadout && Object.keys(army.heroLoadout).length > 0;
  const hasRecordCount = typeof army.sampleCount === "number" && army.sampleCount > 0;

  return (
    <div className="ui-panel overflow-hidden transition-all">
      {/* Header Row */}
      <div
        className="ui-panel-header flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-3.5 py-3 sm:px-4 cursor-pointer select-none"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2.5 sm:gap-4 min-w-0 w-full lg:w-auto lg:flex-1">
          {/* Left: #1 • Army Name + real record count */}
          <div className="min-w-0 max-w-full">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-game font-extrabold text-[var(--ui-text-main)] text-base sm:text-lg tracking-wide break-words">
                #{army.rank} • {displayArmyName}
              </span>
            </div>
            {hasRecordCount && (
              <div className="text-xs text-[var(--ui-text-muted)] font-semibold mt-0.5 tabular-nums">
                {fmtTemplate(t.meta.recordsCount, {
                  count: fmtNum(army.sampleCount as number),
                })}
              </div>
            )}
          </div>

          {/* Center: Opaque Stat Boxes */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="ui-info px-3 py-1.5 flex items-center gap-2">
              <span className="text-[11px] text-[var(--ui-text-muted)] font-bold uppercase tracking-wider">
                {t.meta.usageLabel}
              </span>
              <span className="font-game text-base sm:text-lg font-extrabold text-[var(--ui-text-gold)] tabular-nums">
                {fmtPct(army.usagePct, 1)}
              </span>
            </div>

            <div className="ui-info px-3 py-1.5 flex items-center gap-2">
              <span className="text-[11px] text-[var(--ui-text-muted)] font-bold uppercase tracking-wider">
                {t.meta.threeStarLabel}
              </span>
              <span className="font-game text-base sm:text-lg font-extrabold text-[var(--ui-text-green)] tabular-nums">
                {fmtPct(army.threeStarRatePct, 1)}
              </span>
            </div>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center justify-end gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GameButton
            variant="green"
            size="md"
            href={copyUrl || undefined}
            target={copyUrl ? "_blank" : undefined}
            disabled={!copyUrl}
            icon={<ExternalLink size={16} />}
            className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-extrabold whitespace-nowrap shrink-0"
            title={t.meta.copyTooltip}
          >
            {t.meta.copyArmy}
          </GameButton>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls={bodyId}
            aria-label={
              isExpanded
                ? isTr
                  ? "Ordu detaylarını daralt"
                  : "Collapse army details"
                : isTr
                ? "Ordu detaylarını genişlet"
                : "Expand army details"
            }
            className="ui-info inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-[var(--ui-text-gold)] hover:bg-[var(--game-slot-bg-light)] active:scale-95 transition-colors cursor-pointer shrink-0"
          >
            <ChevronDown
              size={20}
              className={cn(
                "transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div id={bodyId} className="p-3 sm:p-4 space-y-3">
          {/* Real Capacity Row */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="ui-pill px-2.5 py-1 text-xs font-bold text-[var(--ui-text-main)] tabular-nums inline-flex items-center gap-1.5"
              title={t.meta.troopCapLabel}
            >
              <Swords size={12} className="text-[var(--ui-text-gold)] shrink-0" />
              <span className="text-[var(--ui-text-muted)]">{t.meta.troopCapLabel}:</span>
              <span>{fmtNum(totalTroopHousing)}</span>
            </span>
            <span
              className="ui-pill px-2.5 py-1 text-xs font-bold text-[var(--ui-text-main)] tabular-nums inline-flex items-center gap-1.5"
              title={t.meta.spellCapLabel}
            >
              <Zap size={12} className="text-[var(--ui-text-blue)] shrink-0" />
              <span className="text-[var(--ui-text-muted)]">{t.meta.spellCapLabel}:</span>
              <span>{fmtNum(totalSpellSpace)}</span>
            </span>
            <span
              className="ui-pill px-2.5 py-1 text-xs font-bold text-[var(--ui-text-main)] tabular-nums inline-flex items-center gap-1.5"
              title={t.meta.siegeCapLabel}
            >
              <Shield size={12} className="text-[var(--ui-text-gold)] shrink-0" />
              <span className="text-[var(--ui-text-muted)]">{t.meta.siegeCapLabel}:</span>
              <span>{fmtNum(totalSiegeUnits)}</span>
            </span>
            <span
              className="ui-pill px-2.5 py-1 text-xs font-bold text-[var(--ui-text-main)] tabular-nums inline-flex items-center gap-1.5"
              title={t.meta.ccCapLabel}
            >
              <Castle size={12} className="text-[var(--ui-text-green)] shrink-0" />
              <span className="text-[var(--ui-text-muted)]">{t.meta.ccCapLabel}:</span>
              <span>{ccDisplayValue}</span>
            </span>
          </div>

          {/* Unified Row 1 Box: Troops + Spells + Siege Machines */}
          <div className="ui-well p-3 space-y-2 w-full">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ui-text-muted)] flex items-center gap-1.5">
              <Swords size={13} className="text-[var(--ui-text-gold)] shrink-0" />
              <span>{t.meta.sectionAttack}</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {displayTroops.map((troop, idx) => (
                <IconFrame
                  key={`troop-${troop.id}-${idx}`}
                  name={troop.name}
                  count={troop.count}
                  size="unit"
                />
              ))}

              {displaySpells.length > 0 && (
                <div className="w-px h-8 sm:h-10 bg-[var(--ui-panel-border)] my-auto mx-0.5 shrink-0" />
              )}

              {displaySpells.map((spell, idx) => (
                <IconFrame
                  key={`spell-${spell.id}-${idx}`}
                  name={spell.name}
                  count={spell.count}
                  size="unit"
                />
              ))}

              {displaySieges.length > 0 && (
                <div className="w-px h-8 sm:h-10 bg-[var(--ui-panel-border)] my-auto mx-0.5 shrink-0" />
              )}

              {displaySieges.map((sg, idx) => (
                <IconFrame
                  key={`siege-${sg.id}-${idx}`}
                  name={sg.name}
                  count={sg.count}
                  size="unit"
                />
              ))}
            </div>
          </div>

          {/* Row 2: Heroes & Clan Castle */}
          {(hasLoadout || displayClanCastle.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 w-full">
              {hasLoadout && (
                <div
                  className={cn(
                    "ui-well p-3 space-y-2 min-w-0",
                    displayClanCastle.length > 0
                      ? "lg:col-span-8"
                      : "lg:col-span-12"
                  )}
                >
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ui-text-muted)] flex items-center gap-1.5">
                    <Crown size={13} className="text-[var(--ui-text-gold)] shrink-0" />
                    <span>{t.meta.sectionHeroes}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {Object.entries(army.heroLoadout).map(([heroName, loadout]) => (
                      <div
                        key={heroName}
                        className="ui-info flex items-center gap-1.5 p-1.5 rounded-lg"
                      >
                        <IconFrame name={heroName} size="hero" />

                        <div className="flex flex-col gap-0.5 justify-between h-[44px] sm:h-[50px] md:h-[56px] lg:h-[58px]">
                          <div className="flex items-center gap-0.5">
                            {loadout.primaryPair.slice(0, 2).map((eq, eIdx) => {
                              const eqRarity = resolveEquipmentRarity(eq, parsedArmy);
                              return (
                                <IconFrame
                                  key={`${heroName}-eq-${eIdx}`}
                                  name={eq}
                                  size="equipment"
                                  tileType="equipment"
                                  rarity={eqRarity}
                                  className={getEquipmentFrameClass(eqRarity)}
                                />
                              );
                            })}
                          </div>
                          {loadout.pet && (
                            <IconFrame
                              name={loadout.pet}
                              size="pet"
                              rarity="legendary"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {displayClanCastle.length > 0 && (
                <div
                  className={cn(
                    "ui-well p-3 space-y-2 min-w-0",
                    hasLoadout ? "lg:col-span-4" : "lg:col-span-12"
                  )}
                >
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ui-text-muted)] flex items-center gap-1.5">
                    <Castle size={13} className="text-[var(--ui-text-green)] shrink-0" />
                    <span>{t.meta.sectionCC}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {displayClanCastle.map((cc, idx) => (
                      <IconFrame
                        key={`cc-${cc.id}-${idx}`}
                        name={cc.name}
                        count={cc.count}
                        size="unit"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MetaDashboardView() {
  const {
    locale,
    isTr,
    t,
    fmtNum,
    fmtPct,
    fmtTime,
    fmtTemplate,
    getApiErrorMessage,
  } = useLanguage();

  const [activeTab, setActiveTab] = useState<"armies" | "stats">("armies");
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<unknown>(null);
  const [dashboard, setDashboard] = useState<MetaDashboardPayload | null>(null);

  // Phase 2 State (Usage Statistics)
  const [selectedHeroEqFilter, setSelectedHeroEqFilter] = useState<string>(ALL_HERO_FILTER);
  const [unitCategoryTab, setUnitCategoryTab] = useState<
    "troops" | "spells" | "siege" | "super"
  >("troops");

  const errorMsg = fetchError ? getApiErrorMessage(fetchError, t.meta.errorLoad) : null;

  // Sync tab with URL hash parameter (e.g. #/meta?tab=stats or #/meta?tab=armies)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.includes("tab=stats")) {
        setActiveTab("stats");
      } else if (hash.includes("tab=armies")) {
        setActiveTab("armies");
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const switchTab = (tab: "armies" | "stats") => {
    setActiveTab(tab);
    const base = window.location.hash.split("?")[0] || "#/meta";
    window.location.hash = `${base}?tab=${tab}`;
  };

  const fetchDashboard = useCallback(async (force = false) => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await safeFetchJson<MetaDashboardPayload>(
        `/api/v1/meta/top-analysis?sample_size=200&force_refresh=${force}`
      );
      setDashboard(data);
    } catch (err: unknown) {
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(false);
  }, [fetchDashboard]);

  // Poll every 3500ms while backend scanning/assembling is in progress
  useEffect(() => {
    if (dashboard?.isProcessing && !loading) {
      const timer = setTimeout(() => {
        fetchDashboard(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [
    dashboard?.isProcessing,
    dashboard?.progress?.processed,
    dashboard?.progress?.percentage,
    dashboard?.dataFetchedAt,
    loading,
    fetchDashboard,
  ]);

  const activeArmies: RecommendedArmy[] =
    dashboard?.metaArmies?.topRecommendations ||
    dashboard?.metaArmies?.recommendationsByTownHall?.["TH19"] ||
    dashboard?.metaArmies?.recommendationsByTownHall?.["TH18"] ||
    [];

  // Phase 2: Data Extraction & Complete Canonical Merging (100% item coverage)
  const stats = dashboard?.statistics;
  const heroes = stats?.heroUsage || [];
  const rawEquipments = stats?.equipmentUsage || [];
  const rawPairs = stats?.heroEquipmentPairs || [];
  const heroEqByHero = stats?.equipmentByHero || {};
  const combinedRawPairs = [...rawPairs];
  for (const hName of Object.keys(heroEqByHero)) {
    const list = heroEqByHero[hName] || [];
    combinedRawPairs.push(...list);
  }

  // Canonicalize & deduplicate pairs (strictly max count across endpoints, never double-counted)
  const pairMap = new Map<string, EquipmentPairStat>();
  for (const pair of combinedRawPairs) {
    if (!pair || !pair.hero) continue;
    const equips =
      pair.equipments && pair.equipments.length >= 2
        ? pair.equipments.slice(0, 2).map((s) => s.trim())
        : (pair.pair || "")
            .split("+")
            .map((s) => s.trim())
            .filter(Boolean);

    if (equips.length < 2) continue;

    const sortedEquips = [...equips].sort();
    const canonicalPairLabel = `${sortedEquips[0]} + ${sortedEquips[1]}`;
    const key = `${pair.hero}:::${canonicalPairLabel}`;

    const existing = pairMap.get(key);
    const pairCount = pair.count || 0;
    if (!existing) {
      pairMap.set(key, {
        hero: pair.hero,
        pair: canonicalPairLabel,
        equipments: sortedEquips,
        count: pairCount,
        usagePct: pair.usagePct || 0,
      });
    } else if (pairCount > existing.count) {
      existing.count = pairCount;
      existing.usagePct = pair.usagePct || existing.usagePct;
    }
  }

  const allPairs = Array.from(pairMap.values());
  const rawPets = stats?.petUsage || [];
  const rawTroops = stats?.troopUsage || [];
  const rawSpells = stats?.spellUsage || [];
  const rawSieges = stats?.siegeUsage || [];
  const rawSuperTroops = stats?.superTroopUsage || [];

  // 1. Merge Equipments (43 official items)
  const validCanonicalKeys = new Set(CANONICAL_EQUIPMENTS.map((c) => `${c.hero}:::${c.name}`));
  const eqMap = new Map<string, { hero: string; name: string; count: number; usagePct: number }>();
  for (const eq of rawEquipments) {
    const key = `${eq.hero}:::${eq.name}`;
    if (!validCanonicalKeys.has(key)) continue;
    eqMap.set(key, { ...eq });
  }
  for (const c of CANONICAL_EQUIPMENTS) {
    const key = `${c.hero}:::${c.name}`;
    if (!eqMap.has(key)) {
      eqMap.set(key, { hero: c.hero, name: c.name, count: 0, usagePct: 0.0 });
    }
  }
  const allEquipments = Array.from(eqMap.values());

  // 2. Merge Pets (12 official items, zero fake default levels)
  const petMap = new Map<string, PetStat>();
  for (const p of rawPets) {
    if (!CANONICAL_PETS.includes(p.name)) continue;
    petMap.set(p.name, { ...p });
  }
  for (const name of CANONICAL_PETS) {
    if (!petMap.has(name)) {
      petMap.set(name, { name, count: 0, usagePct: 0.0 });
    }
  }
  const pets = Array.from(petMap.values()).sort((a, b) => b.usagePct - a.usagePct);

  const isSuperTroop = (name: string) =>
    CANONICAL_SUPER_TROOPS.includes(name) || name.startsWith("Super ");

  // 3. Merge Troops (zero fake default levels)
  const troopMap = new Map<string, UnitUsageStat>();
  for (const item of rawTroops) {
    const cleanName = item.name === "Head Hunter" ? "Headhunter" : item.name;
    if (isSuperTroop(cleanName)) continue;
    if (!CANONICAL_TROOPS.includes(cleanName)) continue;
    troopMap.set(cleanName, { ...item, name: cleanName });
  }
  for (const name of CANONICAL_TROOPS) {
    if (!troopMap.has(name)) {
      troopMap.set(name, { name, count: 0, usagePct: 0.0 });
    }
  }
  const troops = Array.from(troopMap.values()).sort((a, b) => b.usagePct - a.usagePct);

  // 4. Merge Spells (zero fake default levels)
  const spellMap = new Map<string, UnitUsageStat>();
  for (const sp of rawSpells) {
    if (!CANONICAL_SPELLS.includes(sp.name)) continue;
    spellMap.set(sp.name, { ...sp });
  }
  for (const name of CANONICAL_SPELLS) {
    if (!spellMap.has(name)) {
      spellMap.set(name, { name, count: 0, usagePct: 0.0 });
    }
  }
  const spells = Array.from(spellMap.values()).sort((a, b) => b.usagePct - a.usagePct);

  // 5. Merge Sieges (zero fake default levels)
  const siegeMap = new Map<string, UnitUsageStat>();
  for (const s of rawSieges) {
    if (!CANONICAL_SIEGES.includes(s.name)) continue;
    siegeMap.set(s.name, { ...s });
  }
  for (const name of CANONICAL_SIEGES) {
    if (!siegeMap.has(name)) {
      siegeMap.set(name, { name, count: 0, usagePct: 0.0 });
    }
  }
  const sieges = Array.from(siegeMap.values()).sort((a, b) => b.usagePct - a.usagePct);

  // 6. Merge Super Troops
  const superMap = new Map<string, UnitUsageStat>();
  for (const st of [...rawSuperTroops, ...rawTroops.filter((item) => isSuperTroop(item.name))]) {
    if (!CANONICAL_SUPER_TROOPS.includes(st.name)) continue;
    if (!superMap.has(st.name) || (st.usagePct || 0) > (superMap.get(st.name)?.usagePct || 0)) {
      superMap.set(st.name, { name: st.name, count: st.count || 0, usagePct: st.usagePct || 0.0 });
    }
  }
  for (const name of CANONICAL_SUPER_TROOPS) {
    if (!superMap.has(name)) {
      superMap.set(name, { name, count: 0, usagePct: 0.0 });
    }
  }
  const superTroops = Array.from(superMap.values()).sort((a, b) => b.usagePct - a.usagePct);

  const totalRankedAttacks =
    dashboard?.totalRankedAttacksAnalyzed || stats?.totalRankedAttacksAnalyzed || 0;

  const HERO_FILTER_OPTIONS = [
    ALL_HERO_FILTER,
    "Barbarian King",
    "Archer Queen",
    "Grand Warden",
    "Royal Champion",
    "Minion Prince",
    "Dragon Duke",
  ];

  const calcPoolPct = (count: number): number =>
    totalRankedAttacks > 0 ? Number(((count / totalRankedAttacks) * 100).toFixed(2)) : 0;

  const filteredEquipments = allEquipments
    .filter((eq) => selectedHeroEqFilter === ALL_HERO_FILTER || eq.hero === selectedHeroEqFilter)
    .map((eq) => ({
      ...eq,
      displayPct: calcPoolPct(eq.count),
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.displayPct - a.displayPct ||
        a.name.localeCompare(b.name)
    );

  const filteredPairs = allPairs
    .filter((pair) => selectedHeroEqFilter === ALL_HERO_FILTER || pair.hero === selectedHeroEqFilter)
    .map((pair) => ({
      ...pair,
      displayPct: calcPoolPct(pair.count),
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.displayPct - a.displayPct ||
        a.pair.localeCompare(b.pair)
    );

  const hasLiveSummary =
    Boolean(dashboard) &&
    ((dashboard?.totalPlayersAnalyzed ?? 0) > 0 ||
      (dashboard?.totalRankedAttacksAnalyzed ?? 0) > 0 ||
      !dashboard?.isProcessing);

  const summaryText =
    hasLiveSummary && dashboard
      ? fmtTemplate(t.meta.summary, {
          players: fmtNum(dashboard.totalPlayersAnalyzed ?? 0),
          attacks: fmtNum(dashboard.totalRankedAttacksAnalyzed ?? 0),
          time: dashboard.dataFetchedAt ? fmtTime(dashboard.dataFetchedAt) : "—",
        })
      : t.meta.summaryLoading;

  const progressPct = Math.max(
    5,
    Math.min(100, Math.round(dashboard?.progress?.percentage ?? 10))
  );

  const activeUnitItems: UnitUsageStat[] = {
    troops,
    spells,
    siege: sieges,
    super: superTroops,
  }[unitCategoryTab];

  return (
    <div className="w-full space-y-4 font-sans">
      {/* Top Controls: Inner Tab Switcher + Live Summary Bar */}
      <div className="space-y-3">
        <div
          className="ui-info p-1.5 rounded-xl grid grid-cols-2 sm:inline-flex gap-1.5 w-full sm:w-auto"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "armies"}
            onClick={() => switchTab("armies")}
            className={cn(
              "min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-game font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer",
              activeTab === "armies"
                ? "bg-[var(--ui-tab-active-bg)] border-2 border-[var(--ui-tab-active-border)] text-[var(--ui-text-main)] shadow-sm"
                : "bg-transparent border-2 border-transparent text-[var(--ui-text-muted)] hover:bg-[var(--game-slot-bg-light)] hover:text-[var(--ui-text-main)]"
            )}
          >
            <Swords size={16} className="shrink-0" />
            <span>{t.meta.tabArmies}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "stats"}
            onClick={() => switchTab("stats")}
            className={cn(
              "min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-game font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer",
              activeTab === "stats"
                ? "bg-[var(--ui-tab-active-bg)] border-2 border-[var(--ui-tab-active-border)] text-[var(--ui-text-main)] shadow-sm"
                : "bg-transparent border-2 border-transparent text-[var(--ui-text-muted)] hover:bg-[var(--game-slot-bg-light)] hover:text-[var(--ui-text-main)]"
            )}
          >
            <Shield size={16} className="shrink-0" />
            <span>{t.meta.tabStats}</span>
          </button>
        </div>

        {/* Pinned Live Summary Bar */}
        <div className="ui-info p-3 sm:px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs sm:text-sm text-[var(--ui-text-main)] font-medium">
          <div className="min-w-0 leading-relaxed tabular-nums">
            <span>{summaryText}</span>
          </div>

          <div className="self-end sm:self-auto shrink-0">
            <GameButton
              variant="green"
              size="sm"
              onClick={() => fetchDashboard(true)}
              disabled={loading || Boolean(dashboard?.isProcessing)}
              className="min-h-[44px] px-4 text-xs sm:text-sm font-extrabold"
              icon={
                <RefreshCw
                  size={15}
                  className={loading || dashboard?.isProcessing ? "animate-spin" : ""}
                />
              }
              title={
                isTr
                  ? "En son lider tablosu verilerini yenile"
                  : "Refresh latest leaderboard data"
              }
            >
              {loading || dashboard?.isProcessing ? t.common.refreshing : t.common.refresh}
            </GameButton>
          </div>
        </div>

        {/* Background Processing Progress Banner */}
        {dashboard?.isProcessing && (
          <div className="ui-info p-3 rounded-xl border-2 border-[var(--game-btn-gold-mid)] text-xs sm:text-sm text-[var(--ui-text-gold)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <RefreshCw size={15} className="animate-spin text-[var(--ui-text-gold)] shrink-0" />
              <span className="font-bold leading-snug">{t.meta.scanning}</span>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
              {dashboard.progress && dashboard.progress.target > 0 && (
                <span className="text-xs font-extrabold text-[var(--ui-text-main)] tabular-nums shrink-0">
                  {fmtNum(dashboard.progress.processed)}/{fmtNum(dashboard.progress.target)} (
                  {fmtPct(progressPct, 0)})
                </span>
              )}
              <div className="flex-1 sm:w-32 bg-[var(--game-dark-box-border)] rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[var(--game-btn-green-mid)] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="ui-panel p-3 rounded-xl border-2 border-[var(--game-btn-red-mid)] text-xs sm:text-sm text-[var(--ui-text-red)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle size={16} className="text-[var(--ui-text-gold)] shrink-0" />
              <span className="leading-snug text-[var(--ui-text-main)]">{errorMsg}</span>
            </div>
            <GameButton
              variant="gold"
              size="sm"
              onClick={() => fetchDashboard(true)}
              className="min-h-[44px] px-3.5 text-xs font-extrabold self-end sm:self-auto shrink-0"
            >
              {t.common.retry}
            </GameButton>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        {/* Tab 1: Meta Armies */}
        {activeTab === "armies" && (
          <div className="space-y-4">
            {(loading && !dashboard) || (dashboard?.isProcessing && activeArmies.length === 0) ? (
              <div className="space-y-3">
                {dashboard?.isProcessing && (
                  <div className="text-xs sm:text-sm text-[var(--ui-text-gold)] font-semibold px-1">
                    {t.meta.scanning}
                  </div>
                )}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="ui-panel p-3.5 sm:p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-[180px]">
                        <SkeletonBlock height="1.5rem" width="60%" />
                        <SkeletonBlock height="0.875rem" width="35%" />
                      </div>
                      <div className="flex items-center gap-2">
                        <SkeletonBlock height="2.75rem" width="5rem" />
                        <SkeletonBlock height="2.75rem" width="7.5rem" />
                      </div>
                    </div>
                    <SkeletonBlock height="4.25rem" width="100%" />
                  </div>
                ))}
              </div>
            ) : activeArmies.length > 0 ? (
              <div className="space-y-4">
                {activeArmies.map((army) => (
                  <MetaArmyCard
                    key={army.id}
                    army={army}
                    defaultExpanded={army.rank === 1}
                  />
                ))}
              </div>
            ) : errorMsg && !dashboard ? (
              <div className="ui-panel text-center py-10 px-4 space-y-3">
                <div className="text-sm text-[var(--ui-text-main)] font-bold">{errorMsg}</div>
                <GameButton
                  variant="green"
                  size="sm"
                  onClick={() => fetchDashboard(true)}
                  className="min-h-[44px]"
                >
                  {t.common.retry}
                </GameButton>
              </div>
            ) : (
              <div className="ui-panel text-center py-10 px-4">
                <span className="text-sm text-[var(--ui-text-muted)] font-bold">
                  {t.meta.noDataTitle}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Usage Statistics */}
        {activeTab === "stats" && (
          <div className="space-y-4">
            {/* Header Note */}
            <div className="ui-info px-3.5 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[var(--ui-text-muted)] font-medium">
              <span className="leading-relaxed tabular-nums">
                *{" "}
                <strong className="text-[var(--ui-text-gold)] font-bold">
                  {isTr ? "Kullanım Oranı" : "Usage Rate"}:
                </strong>{" "}
                {typeof dashboard?.totalRankedAttacksAnalyzed === "number" &&
                dashboard.totalRankedAttacksAnalyzed > 0
                  ? `${fmtNum(dashboard.totalRankedAttacksAnalyzed)} ${
                      isTr ? "saldırı" : "attacks"
                    } • `
                  : ""}
                {t.meta.statsNote}
              </span>
              <span className="ui-pill shrink-0 text-xs text-[var(--ui-text-gold)] font-extrabold px-2.5 py-1">
                {isTr ? "TH18 Meta Havuzu" : "TH18 Meta Pool"}
              </span>
            </div>

            {(loading && !dashboard) ||
            (dashboard?.isProcessing &&
              (!stats || (dashboard?.totalRankedAttacksAnalyzed ?? 0) === 0)) ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="ui-panel p-3.5 sm:p-4 space-y-3">
                    <SkeletonBlock height="1.5rem" width="45%" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      {[1, 2, 3, 4, 5, 6].map((j) => (
                        <SkeletonBlock key={j} height="6.5rem" width="100%" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : !stats ||
              (errorMsg && !dashboard) ||
              ((dashboard?.totalRankedAttacksAnalyzed ?? 0) === 0 && heroes.length === 0) ? (
              <div className="ui-panel text-center py-10 px-4 space-y-3">
                <div className="text-sm text-[var(--ui-text-muted)] font-bold">
                  {errorMsg || t.meta.noDataTitle}
                </div>
                <GameButton
                  variant="green"
                  size="sm"
                  onClick={() => fetchDashboard(true)}
                  className="min-h-[44px]"
                >
                  {t.common.retry}
                </GameButton>
              </div>
            ) : (
              <>
                {/* 1. HEROES */}
                <div className="ui-panel overflow-hidden">
                  <div className="ui-panel-header px-3.5 py-2.5 sm:px-4 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Crown size={18} className="text-[var(--ui-text-gold)] shrink-0" />
                      <span className="font-game font-extrabold text-[var(--ui-text-main)] text-base sm:text-lg tracking-wide">
                        {isTr ? "Kahramanlar" : "Heroes"}
                      </span>
                      <span className="ui-pill px-2 py-0.5 text-xs text-[var(--ui-text-muted)] font-bold tabular-nums">
                        {fmtNum(heroes.length)}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4">
                    <div className="ui-well p-2.5 sm:p-3.5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                        {heroes.map((hero) => (
                          <div
                            key={hero.name}
                            className="ui-info p-2.5 flex flex-col items-center justify-between gap-1.5 text-center"
                          >
                            <IconFrame
                              name={hero.name}
                              size="unit"
                              level={hero.avgLevel ? Math.round(hero.avgLevel) : undefined}
                              isMax={hero.maxedPct ? hero.maxedPct > 95 : false}
                            />
                            <div className="text-xs text-[var(--ui-text-main)] font-bold leading-snug break-words max-w-full text-center mt-0.5">
                              {hero.name}
                            </div>
                            <div
                              className={cn(
                                "font-game text-base sm:text-lg font-extrabold tabular-nums",
                                hero.usagePct >= 70
                                  ? "text-[var(--ui-text-green)]"
                                  : "text-[var(--ui-text-gold)]"
                              )}
                            >
                              {fmtPct(hero.usagePct, 1)}
                            </div>
                            <UsageMiniBar pct={hero.usagePct} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. HERO EQUIPMENT: 2 PANELS (1- Single / Tekli, 2- Pairs / İkili) */}
                <div className="space-y-3">
                  {/* Shared Hero Filter Strip */}
                  <div className="ui-panel p-3 sm:px-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {HERO_FILTER_OPTIONS.map((opt) => {
                        const isSelected = selectedHeroEqFilter === opt;
                        const label =
                          opt === ALL_HERO_FILTER ? t.meta.filterAll : getHeroDisplayName(opt, isTr);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setSelectedHeroEqFilter(opt)}
                            className={cn(
                              "min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap tabular-nums cursor-pointer",
                              isSelected
                                ? "bg-[var(--game-btn-green-mid)] border-2 border-[var(--game-btn-green-border)] text-[var(--ui-text-main)] font-extrabold shadow-sm"
                                : "ui-info text-[var(--ui-text-muted)] hover:bg-[var(--game-slot-bg-light)] hover:text-[var(--ui-text-main)]"
                            )}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    <span className="text-xs text-[var(--ui-text-muted)] font-semibold tabular-nums">
                      {isTr
                        ? `Havuz: ${fmtNum(totalRankedAttacks)} ranked saldırı`
                        : `Pool: ${fmtNum(totalRankedAttacks)} ranked attacks`}
                    </span>
                  </div>

                  {/* Side-by-side 2 Panels */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                    {/* Panel 1: Single Equipment (Tekli) */}
                    <div className="lg:col-span-7 ui-panel overflow-hidden flex flex-col">
                      <div className="ui-panel-header px-3.5 py-2.5 sm:px-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Zap size={18} className="text-[var(--ui-text-gold)] shrink-0" />
                          <span className="font-game font-extrabold text-[var(--ui-text-main)] text-base sm:text-lg tracking-wide">
                            {t.meta.statsHeroEquipTitle}
                          </span>
                          <span className="ui-pill px-2 py-0.5 text-xs text-[var(--ui-text-muted)] font-bold tabular-nums">
                            {fmtNum(filteredEquipments.length)}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--ui-text-muted)] font-semibold">
                          {isTr ? "Kullanım / Tüm saldırılar" : "Uses / Total attacks"}
                        </span>
                      </div>

                      <div className="p-3 sm:p-4 flex-1 flex flex-col">
                        <div className="ui-well p-2.5 sm:p-3 flex-1">
                          {filteredEquipments.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                              {filteredEquipments.map((eq, idx) => {
                                const eqRarity = resolveEquipmentRarity(eq.name);
                                return (
                                  <div
                                    key={`${eq.hero}-${eq.name}`}
                                    className="ui-info relative p-2.5 flex flex-col items-center justify-between gap-1 text-center"
                                  >
                                    <span className="absolute top-1.5 left-1.5 ui-pill px-1.5 py-0.5 text-[10px] font-extrabold text-[var(--ui-text-muted)] tabular-nums">
                                      #{idx + 1}
                                    </span>
                                    <IconFrame
                                      name={eq.name}
                                      size="unit"
                                      tileType="equipment"
                                      rarity={eqRarity}
                                      className={getEquipmentFrameClass(eqRarity)}
                                    />
                                    <div className="text-xs text-[var(--ui-text-main)] font-bold leading-snug break-words max-w-full mt-0.5">
                                      {eq.name}
                                    </div>
                                    <div className="text-xs text-[var(--ui-text-muted)] font-semibold leading-tight max-w-full break-words">
                                      {getHeroDisplayName(eq.hero, isTr)}
                                    </div>
                                    <div
                                      className={cn(
                                        "font-game text-base font-extrabold tabular-nums",
                                        eq.displayPct >= 70
                                          ? "text-[var(--ui-text-green)]"
                                          : "text-[var(--ui-text-gold)]"
                                      )}
                                    >
                                      {fmtPct(eq.displayPct, 1)}
                                    </div>
                                    <div className="text-[11px] text-[var(--ui-text-muted)] font-semibold tabular-nums">
                                      {fmtNum(eq.count)} / {fmtNum(totalRankedAttacks)}
                                    </div>
                                    <UsageMiniBar pct={eq.displayPct} />
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-xs sm:text-sm text-[var(--ui-text-muted)] font-medium">
                              {t.meta.statsNoEquipFilter}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Panel 2: Top Equipment Pairs (İkili) */}
                    <div className="lg:col-span-5 ui-panel overflow-hidden flex flex-col">
                      <div className="ui-panel-header px-3.5 py-2.5 sm:px-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-game font-extrabold text-[var(--ui-text-main)] text-base sm:text-lg tracking-wide">
                            {t.meta.statsPairsTitle}
                          </span>
                          <span className="ui-pill px-2 py-0.5 text-xs text-[var(--ui-text-muted)] font-bold tabular-nums">
                            {fmtNum(filteredPairs.length)}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--ui-text-muted)] font-semibold">
                          {isTr ? "İkili kullanım / Tüm saldırılar" : "Pair uses / Total attacks"}
                        </span>
                      </div>

                      <div className="p-3 sm:p-4 flex-1 flex flex-col">
                        <div className="ui-well p-2.5 sm:p-3 flex-1 space-y-2.5">
                          {filteredPairs.length > 0 ? (
                            filteredPairs.map((pair, pIdx) => {
                              const eq1 = pair.equipments?.[0] || pair.pair.split(" + ")[0];
                              const eq2 = pair.equipments?.[1] || pair.pair.split(" + ")[1];
                              const r1 = resolveEquipmentRarity(eq1);
                              const r2 = eq2 ? resolveEquipmentRarity(eq2) : "common";

                              return (
                                <div
                                  key={`${pair.hero}-${pair.pair}-${pIdx}`}
                                  className="ui-info p-2.5 sm:p-3 space-y-2"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                                    <div className="flex items-center justify-between sm:justify-start gap-2">
                                      <span className="ui-pill px-1.5 py-0.5 text-[10px] font-extrabold text-[var(--ui-text-muted)] tabular-nums shrink-0">
                                        #{pIdx + 1}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <IconFrame
                                          name={eq1}
                                          size="unit"
                                          tileType="equipment"
                                          rarity={r1}
                                          className={getEquipmentFrameClass(r1)}
                                        />
                                        {eq2 && (
                                          <span className="text-[var(--ui-text-gold)] font-extrabold text-sm">
                                            +
                                          </span>
                                        )}
                                        {eq2 && (
                                          <IconFrame
                                            name={eq2}
                                            size="unit"
                                            tileType="equipment"
                                            rarity={r2}
                                            className={getEquipmentFrameClass(r2)}
                                          />
                                        )}
                                      </div>

                                      <div className="sm:hidden text-right shrink-0">
                                        <span
                                          className={cn(
                                            "font-game text-lg font-extrabold tabular-nums",
                                            pair.displayPct >= 70
                                              ? "text-[var(--ui-text-green)]"
                                              : "text-[var(--ui-text-gold)]"
                                          )}
                                        >
                                          {fmtPct(pair.displayPct, 1)}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm text-[var(--ui-text-main)] font-bold leading-snug break-words">
                                        {pair.pair}
                                      </div>
                                      <div className="text-xs text-[var(--ui-text-muted)] font-semibold mt-0.5">
                                        {getHeroDisplayName(pair.hero, isTr)}
                                      </div>
                                    </div>

                                    <div className="hidden sm:block text-right shrink-0">
                                      <span
                                        className={cn(
                                          "font-game text-base sm:text-lg font-extrabold tabular-nums block",
                                          pair.displayPct >= 70
                                            ? "text-[var(--ui-text-green)]"
                                            : "text-[var(--ui-text-gold)]"
                                        )}
                                      >
                                        {fmtPct(pair.displayPct, 1)}
                                      </span>
                                      <span className="text-[11px] text-[var(--ui-text-muted)] font-semibold tabular-nums block">
                                        {fmtNum(pair.count)} / {fmtNum(totalRankedAttacks)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="sm:hidden text-[11px] text-[var(--ui-text-muted)] font-semibold tabular-nums">
                                    {fmtNum(pair.count)} / {fmtNum(totalRankedAttacks)}
                                  </div>

                                  <UsageMiniBar pct={pair.displayPct} />
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-8 text-xs sm:text-sm text-[var(--ui-text-muted)] font-medium">
                              {t.meta.statsNoPairs}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. PETS */}
                <div className="ui-panel overflow-hidden">
                  <div className="ui-panel-header px-3.5 py-2.5 sm:px-4 flex flex-wrap items-center gap-2">
                    <span className="font-game font-extrabold text-[var(--ui-text-main)] text-base sm:text-lg tracking-wide">
                      {t.player.pets}
                    </span>
                    <span className="ui-pill px-2 py-0.5 text-xs text-[var(--ui-text-muted)] font-bold tabular-nums">
                      {fmtNum(pets.length)}
                    </span>
                  </div>
                  <div className="p-3 sm:p-4">
                    <div className="ui-well p-2.5 sm:p-3.5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
                        {pets.map((pet) => (
                          <div
                            key={pet.name}
                            className="ui-info p-2.5 flex flex-col items-center justify-between gap-1.5 text-center"
                          >
                            <IconFrame
                              name={pet.name}
                              size="unit"
                              rarity="legendary"
                              level={pet.avgLevel ? Math.round(pet.avgLevel) : undefined}
                            />
                            <div className="text-xs text-[var(--ui-text-main)] font-bold leading-snug break-words max-w-full text-center mt-0.5">
                              {pet.name}
                            </div>
                            <div
                              className={cn(
                                "font-game text-base sm:text-lg font-extrabold tabular-nums",
                                pet.usagePct >= 70
                                  ? "text-[var(--ui-text-green)]"
                                  : "text-[var(--ui-text-gold)]"
                              )}
                            >
                              {fmtPct(pet.usagePct, 1)}
                            </div>
                            <UsageMiniBar pct={pet.usagePct} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. TROOPS, SPELLS, SIEGE MACHINES, SUPER TROOPS */}
                <div className="ui-panel overflow-hidden">
                  <div className="ui-panel-header px-3.5 py-2.5 sm:px-4 flex items-center gap-2">
                    <Swords size={18} className="text-[var(--ui-text-gold)] shrink-0" />
                    <span className="font-game font-extrabold text-[var(--ui-text-main)] text-base sm:text-lg tracking-wide">
                      {t.meta.statsUnitsTitle}
                    </span>
                  </div>
                  <div className="p-3 sm:p-4 space-y-3">
                    {/* Category Selector Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--ui-panel-border)] pb-2">
                      {[
                        {
                          id: "troops" as const,
                          label: t.meta.filterTroops,
                          count: troops.length,
                          icon: Swords,
                        },
                        {
                          id: "spells" as const,
                          label: t.meta.filterSpells,
                          count: spells.length,
                          icon: Zap,
                        },
                        {
                          id: "siege" as const,
                          label: t.meta.filterSiege,
                          count: sieges.length,
                          icon: Shield,
                        },
                        {
                          id: "super" as const,
                          label: t.meta.filterSuper,
                          count: superTroops.length,
                          icon: Sparkles,
                        },
                      ].map((cat) => {
                        const Icon = cat.icon;
                        const isActive = unitCategoryTab === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setUnitCategoryTab(cat.id)}
                            className={cn(
                              "flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors tabular-nums cursor-pointer",
                              isActive
                                ? "bg-[var(--game-btn-green-mid)] border-2 border-[var(--game-btn-green-border)] text-[var(--ui-text-main)] font-extrabold shadow-sm"
                                : "ui-info text-[var(--ui-text-muted)] hover:bg-[var(--game-slot-bg-light)] hover:text-[var(--ui-text-main)]"
                            )}
                          >
                            <Icon size={14} />
                            <span>{cat.label}</span>
                            <span className="ui-pill text-xs px-1.5 py-0.5 font-semibold tabular-nums">
                              {fmtNum(cat.count)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Unified Grid for Active Category */}
                    <div className="ui-well p-2.5 sm:p-3.5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
                        {activeUnitItems.map((item) => (
                          <div
                            key={item.name}
                            className="ui-info p-2.5 flex flex-col items-center justify-between gap-1.5 text-center"
                          >
                            <IconFrame
                              name={item.name}
                              size="unit"
                              level={item.avgLevel ? Math.round(item.avgLevel) : undefined}
                              isMax={item.maxedPct ? item.maxedPct > 95 : false}
                            />
                            <div className="text-xs text-[var(--ui-text-main)] font-bold leading-snug break-words max-w-full">
                              {item.name}
                            </div>
                            <div
                              className={cn(
                                "font-game text-base sm:text-lg font-extrabold tabular-nums",
                                item.usagePct >= 70
                                  ? "text-[var(--ui-text-green)]"
                                  : "text-[var(--ui-text-gold)]"
                              )}
                            >
                              {fmtPct(item.usagePct, 1)}
                            </div>
                            <UsageMiniBar pct={item.usagePct} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
