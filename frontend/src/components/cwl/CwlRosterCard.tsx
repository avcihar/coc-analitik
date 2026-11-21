"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Copy,
  Check,
  Star,
  Swords,
  Shield,
  Zap,
  Castle,
  Crown,
  Flame,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  X,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  buildCopyArmyLink,
  parseArmyShareCode,
  type DecodedArmyShare,
} from "@/lib/armyLink";
import { useLanguage, type TranslationDict } from "@/lib/i18n";
import {
  COMMON_MAX_LEVEL,
  EPIC_MAX_LEVEL,
  detectEquipmentRarity,
} from "@/lib/equipmentCosts";
import {
  GameButton,
  IconFrame,
  StatPill,
  TownHallImage,
} from "@/components/game";
import "../clan/clan.css";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Domain Interfaces ---
export interface Hero {
  id?: string | number;
  name: string;
  level?: number;
  maxLevel?: number;
  equipments: {
    id?: number;
    name: string;
    level?: number;
    maxLevel?: number;
    rarity?: string;
    isEpic?: boolean;
  }[];
  pet?: { id?: number; name: string; level?: number } | null;
}

export interface Unit {
  id: string | number;
  name: string;
  count: number;
  level?: number;
  housingSpace?: number;
  totalHousingSpace?: number;
  totalSpellSpace?: number;
}

export interface WarAttack {
  attackerTag: string;
  defenderTag: string;
  defenderName?: string;
  defenderTownHall?: number;
  defenderMapPosition?: number;
  stars: number;
  destructionPercentage: number;
  order: number;
  duration?: number;
}

export interface RecentArmyOption {
  battleType: string;
  source?: string;
  sourceBadge?: string;
  sourceLabel: string;
  summary?: string;
  warning?: string | null;
  usageCount?: number;
  threeStarCount?: number;
  threeStarRate?: number;
  avgDestruction?: number;
  otherArmiesCount?: number;
  battleTime?: string | null;
  opponentName?: string;
  opponentTag?: string;
  opponentTownHallLevel?: number;
  stars: number;
  destructionPercentage: number;
  armyShareCode: string;
  armyLink: string;
  armyName: string;
  heroes: {
    id: number;
    name: string;
    pet?: { id: number; name: string } | null;
    equipment: { id: number; name: string; rarity?: string; maxLevel?: number }[];
  }[];
  siegeMachines: Unit[];
  clanCastle: Unit[];
  troops: Unit[];
  spells: Unit[];
  totalTroopHousing: number;
  totalSpellSpace: number;
}

export interface ThreeStarDefenseEntry {
  opponentName: string;
  opponentPlayerTag?: string;
  opponentTownHallLevel?: number;
  stars: number;
  destructionPercentage: number;
  battleType: string;
  armyShareCode: string;
  armyLink: string;
  armyName: string;
  timestamp?: string;
  troops?: Unit[];
  spells?: Unit[];
  siegeMachines?: Unit[];
  heroes?: { name: string; equipment?: { name: string }[] }[];
  clanCastle?: Unit[];
  decodedArmy?: unknown;
}

export interface CwlRoundSummary {
  roundNumber: number;
  warTag: string;
  state: "inWar" | "preparation" | "warEnded" | "unrevealed" | string;
  stateLabel: string;
  opponentClan?: {
    tag: string;
    name: string;
    clanLevel?: number;
    stars?: number;
    destructionPercentage?: number;
    badgeUrls?: { small?: string };
  } | null;
  isSavasGunu?: boolean;
  isHazirlikGunu?: boolean;
  isBitti?: boolean;
  isUnrevealed?: boolean;
}

export interface ScoutData {
  playerTag?: string;
  opponentName: string;
  mapPosition?: number;
  townHallLevel: number;
  trophies: number;
  stars: number;
  destruction: number;
  isCwl?: boolean;
  armyDetected?: boolean;
  failureReason?: string;
  armySource?: string;
  sourceBadge?: string;
  armySourceLabel?: string;
  armySummary?: string;
  warning?: string | null;
  otherArmiesCount?: number;
  inferredArchetype?: string;
  armyName?: string;
  armyShareCode?: string;
  armyLink: string;
  activeSuperTroops?: string[];
  recentArmies?: RecentArmyOption[];
  warAttacks?: WarAttack[];
  battlelogAttacks?: RecentArmyOption[];
  heroes: Hero[];
  profileHeroes?: Hero[];
  troops: Unit[];
  spells: Unit[];
  siege?: Unit | null;
  clanCastle: Unit[];
  threeStarDefenses?: ThreeStarDefenseEntry[];
  threeStarDefenseCount?: number;
  totalRankedDefenses?: number;
  primaryDefenseArmy?: string;
}

export interface CwlScoutReport {
  status: string;
  clanTag: string;
  clanName?: string;
  opponentClan?: {
    tag: string;
    name: string;
    clanLevel?: number;
    stars?: number;
    destructionPercentage?: number;
  };
  season?: string;
  roundNumber?: number;
  roundsSummary?: CwlRoundSummary[];
  isPreparationDay?: boolean;
  warTag?: string;
  warState?: string;
  teamSize?: number;
  cwlCount?: number;
  allCount?: number;
  rosterFilter?: "cwl" | "all";
  message?: string;
  opponents: ScoutData[];
}

const KNOWN_EPIC_EQUIPMENTS = new Set([
  "giant gauntlet",
  "spiky ball",
  "snake bracelet",
  "stick horse",
  "frozen arrow",
  "magic mirror",
  "action figure",
  "fireball",
  "heroic torch",
  "lavaloon puppet",
  "rocket spear",
  "electro boots",
  "frost flake",
  "dark crown",
  "meteor staff",
  "portal pendant",
  "electro fangs",
  "revenge deck",
  "rocket backpack",
]);

function hasUnknownName(items?: { name?: string }[] | null): boolean {
  return Boolean(
    items?.some(
      (x) => (x.name || "").includes("Bilinmeyen") || (x.name || "").includes("Unknown")
    )
  );
}

function resolveEquipmentRarity(
  eq: {
    name: string;
    maxLevel?: number;
    rarity?: string;
    isEpic?: boolean;
  },
  parsedArmy?: DecodedArmyShare | null
): "epic" | "common" {
  if (eq.maxLevel === COMMON_MAX_LEVEL || eq.maxLevel === EPIC_MAX_LEVEL) {
    const detected = detectEquipmentRarity(eq.maxLevel);
    if (detected) return detected === "Epic" ? "epic" : "common";
  }
  if (typeof eq.maxLevel === "number" && eq.maxLevel > COMMON_MAX_LEVEL) {
    return "epic";
  }
  if (eq.isEpic === true || eq.rarity?.toLowerCase() === "epic") {
    return "epic";
  }

  const key = (eq.name || "").trim().toLowerCase();
  if (parsedArmy?.heroes?.length) {
    for (const hero of parsedArmy.heroes) {
      const matched = hero.equipment.find(
        (item) => (item.name || "").trim().toLowerCase() === key && !item.unknown
      );
      if (matched?.rarity) {
        return matched.rarity.toLowerCase() === "epic" ? "epic" : "common";
      }
    }
  }

  if (KNOWN_EPIC_EQUIPMENTS.has(key)) {
    return "epic";
  }
  return "common";
}

function getEquipmentFrameClass(rarity: "epic" | "common"): string {
  return rarity === "epic"
    ? "!border-[var(--ui-text-gold)]"
    : "!border-[var(--ui-panel-border)]";
}

export function cleanDisplayName(
  raw: string | null | undefined,
  isTr: boolean
): string {
  const cleaned = (raw || "").replace(/\s*[\(\[]ID:\s*\d+[\)\]]/gi, "").trim();
  if (!cleaned) return isTr ? "Bilinmeyen" : "Unknown";
  const lower = cleaned.toLowerCase();
  if (lower === "bilinmeyen ordu") {
    return isTr ? "Bilinmeyen Ordu" : "Unknown Army";
  }
  if (lower === "bilinmeyen rakip") {
    return isTr ? "Bilinmeyen Rakip" : "Unknown Opponent";
  }
  if (lower === "ordu tespit edilemedi") {
    return isTr ? "Ordu tespit edilemedi" : "Army not detected";
  }
  if (lower === "bilinmeyen") {
    return isTr ? "Bilinmeyen Birim" : "Unknown Unit";
  }
  return cleaned;
}

export function cleanClanDisplayName(
  raw: string | null | undefined,
  isTr: boolean
): string {
  const text = (raw || "").trim();
  if (!text) return isTr ? "Rakip Klan" : "Opponent Clan";
  if (!isTr) {
    return text
      .replace(/\s*\(Canlı Klan Kadrosu\)\s*$/i, "")
      .replace(/^Rakip Klan$/i, "Opponent Clan")
      .trim();
  }
  return text;
}

interface NormalizedFailureStatus {
  badge: string;
  title: string;
  detail: string;
}

function normalizeFailureStatus(
  rawReason: string | null | undefined,
  isTr: boolean,
  t: TranslationDict
): NormalizedFailureStatus {
  const reason = (rawReason || "").trim();
  const lower = reason.toLowerCase();

  if (lower.includes("429")) {
    return {
      badge: isTr ? "Yoğunluk" : "Rate Limited",
      title: isTr ? "Veri Geçici Olarak Alınamadı" : "Temporarily Unavailable",
      detail: t.errors.rateLimit,
    };
  }
  if (lower.includes("403")) {
    return {
      badge: isTr ? "Erişim Kısıtı" : "Restricted",
      title: isTr ? "Profil Verisine Erişilemedi" : "Profile Access Restricted",
      detail: t.errors.forbidden,
    };
  }
  if (lower.includes("404") || lower.includes("geçersiz oyuncu")) {
    return {
      badge: isTr ? "Kayıt Bulunamadı" : "Not Found",
      title: isTr ? "Oyuncu Kaydı Bulunamadı" : "Player Record Not Found",
      detail: t.errors.notFound,
    };
  }
  if (lower.startsWith("api hatas") || lower.includes("5xx")) {
    return {
      badge: isTr ? "Bağlantı Sorunu" : "Service Issue",
      title: isTr ? "Savaş Geçmişi Alınamadı" : "Battle Log Unavailable",
      detail: t.errors.serverError,
    };
  }
  if (lower === "ranked kayıt yok") {
    return {
      badge: t.cwl.noAttackLog,
      title: isTr ? "Ranked Saldırı Kaydı Yok" : "No Ranked Attack Log",
      detail: isTr
        ? "Oyuncunun son savaş geçmişinde ranked saldırı kaydı bulunamadı."
        : "No ranked attacks were found in this player's recent battle log.",
    };
  }
  if (lower === "battle log boş") {
    return {
      badge: t.cwl.noAttackLog,
      title: isTr ? "Savaş Geçmişi Boş" : "Empty Battle Log",
      detail: isTr
        ? "Oyuncunun savaş geçmişi boş veya henüz yeni kayıt oluşmamış."
        : "This player's battle log is empty or has no recent entries.",
    };
  }
  if (lower === "saldırı kaydı yok") {
    return {
      badge: t.cwl.noAttackLog,
      title: t.cwl.noAttackLog,
      detail: isTr
        ? "Oyuncunun son savaş geçmişinde saldırı kaydı bulunamadı."
        : "No recent attack entries were found in this player's battle log.",
    };
  }
  if (lower.includes("sharecode") || lower.includes("armyshare")) {
    return {
      badge: t.cwl.noAttackLog,
      title: isTr ? "Ordu Dizilimi Mevcut Değil" : "Army Loadout Unavailable",
      detail: isTr
        ? "Bu oyuncunun son saldırıları için ordu dizilimi verisi paylaşılmamış."
        : "No army composition details were recorded for recent attacks.",
    };
  }

  return {
    badge: t.cwl.noAttackLog,
    title: t.cwl.noAttackLog,
    detail: isTr
      ? "Saldırı ordusu tespit edilemedi. Yalnızca oyuncunun profilindeki kahraman ve ekipman seviyeleri gösteriliyor."
      : "Attack army could not be detected. Showing hero and equipment levels from the player's official profile.",
  };
}

function localizeSourceBadge(
  source: string | undefined,
  sourceBadge: string | undefined,
  isTr: boolean
): { isRanked: boolean; label: string } {
  const isRanked =
    source === "ranked" || (sourceBadge || "").toLowerCase() === "ranked";
  if (isRanked) {
    return { isRanked: true, label: "Ranked" };
  }
  return {
    isRanked: false,
    label: isTr ? "Ganimet (Ranked Yok)" : "Loot (No Ranked)",
  };
}

function localizeWarning(
  warning: string | null | undefined,
  isTr: boolean
): string | null {
  if (!warning) return null;
  if (warning.toLowerCase().includes("ranked tespit edilemedi")) {
    return isTr ? "Ranked kayıt yok" : "No ranked attacks";
  }
  return isTr ? warning : "Fallback loot data";
}

function localizeArmyStats(
  option: RecentArmyOption | null,
  fallbackSummary: string | undefined,
  fallbackSourceLabel: string | undefined,
  isTr: boolean,
  fmtNum: (n: number | null | undefined) => string
): { summary: string; sourceLabel: string } {
  if (
    option &&
    option.threeStarCount !== undefined &&
    option.usageCount !== undefined
  ) {
    const stars = fmtNum(option.threeStarCount);
    const total = fmtNum(option.usageCount);
    return {
      summary: isTr
        ? `3★ ×${stars} / ${total} saldırı`
        : `3★ ×${stars} / ${total} attacks`,
      sourceLabel: isTr
        ? `3★ ×${stars} / ${total}`
        : `3★ ×${stars} / ${total}`,
    };
  }

  const rawSummary = (fallbackSummary || "").trim();
  const sumMatch = rawSummary.match(/(\d+)\s*\/\s*(\d+)/);
  if (sumMatch) {
    const stars = fmtNum(Number(sumMatch[1]));
    const total = fmtNum(Number(sumMatch[2]));
    return {
      summary: isTr
        ? `3★ ×${stars} / ${total} saldırı`
        : `3★ ×${stars} / ${total} attacks`,
      sourceLabel: `3★ ×${stars} / ${total}`,
    };
  }

  const rawLabel = (fallbackSourceLabel || "").trim();
  const lblMatch = rawLabel.match(/(\d+)\s*\/\s*(\d+)/);
  if (lblMatch) {
    const stars = fmtNum(Number(lblMatch[1]));
    const total = fmtNum(Number(lblMatch[2]));
    return {
      summary: isTr
        ? `3★ ×${stars} / ${total} saldırı`
        : `3★ ×${stars} / ${total} attacks`,
      sourceLabel: `3★ ×${stars} / ${total}`,
    };
  }

  if (rawLabel.toLowerCase() === "son ranked saldırısı") {
    return {
      summary: "",
      sourceLabel: isTr ? "Son ranked" : "Latest ranked",
    };
  }

  return {
    summary: isTr ? rawSummary : "",
    sourceLabel: isTr ? rawLabel || "Son ranked" : "Top ranked",
  };
}

export function localizeWarState(
  state: string | undefined,
  t: TranslationDict,
  isTr: boolean
): string {
  const s = (state || "").toLowerCase();
  if (s === "inwar") return t.cwl.statusLabels.inWar;
  if (s === "preparation") return t.cwl.statusLabels.preparation;
  if (s === "warended") return t.cwl.statusLabels.warEnded;
  if (s === "unrevealed") return isTr ? "Henüz Belli Değil" : "Unrevealed";
  return isTr ? "Aktif Klan Kadrosu" : "Active Clan Roster";
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

function computeArmyCapacities({
  parsedArmy,
  troops,
  spells,
  siegeMachines,
  clanCastle,
  backendTotalTroopHousing,
  backendTotalSpellSpace,
  fmtNum,
}: {
  parsedArmy: DecodedArmyShare | null;
  troops: Unit[];
  spells: Unit[];
  siegeMachines: Unit[];
  clanCastle: Unit[];
  backendTotalTroopHousing?: number;
  backendTotalSpellSpace?: number;
  fmtNum: (n: number | null | undefined) => string;
}) {
  const fallbackTroopHousing = troops.reduce((acc, item) => {
    if (
      typeof item.totalHousingSpace === "number" &&
      item.totalHousingSpace > 0
    ) {
      return acc + item.totalHousingSpace;
    }
    if (typeof item.housingSpace === "number" && item.housingSpace > 0) {
      return acc + item.housingSpace * (item.count || 0);
    }
    return acc;
  }, 0);

  const totalTroopHousing =
    (parsedArmy && parsedArmy.totalTroopHousing > 0
      ? parsedArmy.totalTroopHousing
      : null) ??
    (typeof backendTotalTroopHousing === "number" &&
    backendTotalTroopHousing > 0
      ? backendTotalTroopHousing
      : null) ??
    fallbackTroopHousing;

  const fallbackSpellSpace = spells.reduce((acc, item) => {
    if (typeof item.totalSpellSpace === "number" && item.totalSpellSpace > 0) {
      return acc + item.totalSpellSpace;
    }
    if (typeof item.housingSpace === "number" && item.housingSpace > 0) {
      return acc + item.housingSpace * (item.count || 0);
    }
    return acc;
  }, 0);

  const totalSpellSpace =
    (parsedArmy && parsedArmy.totalSpellSpace > 0
      ? parsedArmy.totalSpellSpace
      : null) ??
    (typeof backendTotalSpellSpace === "number" && backendTotalSpellSpace > 0
      ? backendTotalSpellSpace
      : null) ??
    fallbackSpellSpace;

  const backendSiegeUnits = siegeMachines.reduce(
    (acc, sg) => acc + (sg.count || 0),
    0
  );
  const parsedSiegeUnits = (parsedArmy?.siegeMachines || []).reduce(
    (acc, sg) => acc + (sg.count || 0),
    0
  );
  const totalSiegeUnits =
    backendSiegeUnits > 0 ? backendSiegeUnits : parsedSiegeUnits;

  const parsedCcTroopSpace = (parsedArmy?.clanCastleTroops || []).reduce(
    (acc, item) =>
      acc +
      (item.totalHousingSpace ?? (item.housingSpace || 0) * (item.count || 0)),
    0
  );
  const parsedCcSpellSpace = (parsedArmy?.clanCastleSpells || []).reduce(
    (acc, item) =>
      acc +
      (item.totalSpellSpace ?? (item.housingSpace || 0) * (item.count || 0)),
    0
  );
  const backendCcHousing = clanCastle.reduce(
    (acc, cc) =>
      acc +
      (typeof cc.housingSpace === "number" && cc.housingSpace > 0
        ? cc.housingSpace * (cc.count || 0)
        : 0),
    0
  );
  const totalCCUnits = clanCastle.reduce((acc, cc) => acc + (cc.count || 0), 0);
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

  return {
    totalTroopHousing,
    totalSpellSpace,
    totalSiegeUnits,
    ccDisplayValue,
  };
}

interface NormalizedDisplayHero {
  name: string;
  level?: number;
  maxLevel?: number;
  pet?: { name: string; level?: number } | null;
  equipments: {
    name: string;
    level?: number;
    maxLevel?: number;
    rarity?: string;
    isEpic?: boolean;
  }[];
}

function ArmyUnitsWell({
  troops,
  spells,
  siegeMachines,
}: {
  troops: Unit[];
  spells: Unit[];
  siegeMachines: Unit[];
}) {
  const { isTr, t } = useLanguage();
  if (troops.length === 0 && spells.length === 0 && siegeMachines.length === 0) {
    return null;
  }

  return (
    <div className="game-slot-well flex items-stretch gap-1 sm:gap-1.5 p-1.5 w-full min-w-0">
      <div
        className="game-slot-gutter shrink-0 self-stretch min-h-[44px] sm:min-h-[50px] md:min-h-[56px] flex items-center justify-center"
        title={t.meta.sectionAttack}
      >
        <Swords size={14} />
      </div>

      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1 sm:gap-1.5">
        {troops.map((troop, idx) => (
          <IconFrame
            key={`troop-${troop.id}-${idx}`}
            name={cleanDisplayName(troop.name, isTr)}
            count={troop.count}
            size="unit"
          />
        ))}

        {spells.length > 0 && (
          <div className="w-[1.5px] h-7 sm:h-9 md:h-11 bg-[var(--ui-panel-border)] my-auto mx-0.5 shrink-0" />
        )}

        {spells.map((spell, idx) => (
          <IconFrame
            key={`spell-${spell.id}-${idx}`}
            name={cleanDisplayName(spell.name, isTr)}
            count={spell.count}
            size="unit"
          />
        ))}

        {siegeMachines.length > 0 && (
          <div className="w-[1.5px] h-7 sm:h-9 md:h-11 bg-[var(--ui-panel-border)] my-auto mx-0.5 shrink-0" />
        )}

        {siegeMachines.map((sg, idx) => (
          <IconFrame
            key={`siege-${sg.id}-${idx}`}
            name={cleanDisplayName(sg.name, isTr)}
            count={sg.count}
            size="unit"
          />
        ))}
      </div>
    </div>
  );
}

function ClanCastleWell({ clanCastle }: { clanCastle: Unit[] }) {
  const { isTr, t } = useLanguage();
  if (clanCastle.length === 0) return null;

  return (
    <div className="game-cc-well flex items-stretch gap-1 sm:gap-1.5 p-1.5 w-full lg:w-auto min-w-0 shrink-0">
      <div
        className="game-slot-gutter shrink-0 self-stretch min-h-[44px] sm:min-h-[50px] md:min-h-[56px] flex items-center justify-center"
        title={t.meta.sectionCC}
      >
        <Castle size={14} />
      </div>

      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1 sm:gap-1.5">
        {clanCastle.map((cc, idx) => (
          <IconFrame
            key={`cc-${cc.id}-${idx}`}
            name={cleanDisplayName(cc.name, isTr)}
            count={cc.count}
            size="unit"
          />
        ))}
      </div>
    </div>
  );
}

function HeroesWell({
  heroes,
  parsedArmy,
  title,
}: {
  heroes: NormalizedDisplayHero[];
  parsedArmy?: DecodedArmyShare | null;
  title?: string;
}) {
  const { isTr, t } = useLanguage();
  if (heroes.length === 0) return null;

  return (
    <div className="game-slot-well flex items-stretch gap-1 sm:gap-1.5 p-1.5 w-full min-w-0 flex-1">
      <div
        className="game-slot-gutter shrink-0 self-stretch min-h-[44px] sm:min-h-[50px] md:min-h-[56px] flex items-center justify-center"
        title={title || t.meta.sectionHeroes}
      >
        <Crown size={14} />
      </div>

      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1 sm:gap-1.5">
        {heroes.map((hero, hIdx) => (
          <div
            key={`${hero.name}-${hIdx}`}
            className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--game-dark-box-mid)] border border-[var(--ui-panel-border)]"
          >
            <IconFrame
              name={cleanDisplayName(hero.name, isTr)}
              size="hero"
              tileType="hero"
              level={hero.level}
              maxLevel={hero.maxLevel}
            />

            {(hero.equipments.length > 0 || hero.pet) && (
              <div className="flex flex-col gap-0.5 justify-between h-[44px] sm:h-[50px] md:h-[56px]">
                <div className="flex items-center gap-0.5">
                  {hero.equipments.slice(0, 2).map((eq, eIdx) => {
                    const eqRarity = resolveEquipmentRarity(eq, parsedArmy);
                    return (
                      <IconFrame
                        key={`${hero.name}-eq-${eIdx}`}
                        name={cleanDisplayName(eq.name, isTr)}
                        size="equipment"
                        tileType="equipment"
                        rarity={eqRarity}
                        level={eq.level}
                        maxLevel={eq.maxLevel}
                        className={getEquipmentFrameClass(eqRarity)}
                      />
                    );
                  })}
                </div>
                {hero.pet && (
                  <IconFrame
                    name={cleanDisplayName(hero.pet.name, isTr)}
                    size="pet"
                    tileType="pet"
                    rarity="legendary"
                    level={hero.pet.level}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DefenseEntryCard({ def }: { def: ThreeStarDefenseEntry }) {
  const { locale, isTr, t, fmtPct } = useLanguage();

  const shareCode = (def.armyShareCode || def.armyLink || "").trim();
  const parsedDef = useMemo(
    () => (shareCode ? parseArmyShareCode(shareCode, locale) : null),
    [shareCode, locale]
  );

  const defCopyLink =
    def.armyLink || (shareCode ? buildCopyArmyLink(shareCode) : "");

  const troops =
    def.troops && def.troops.length > 0 && !hasUnknownName(def.troops)
      ? def.troops
      : parsedDef?.troops || def.troops || [];
  const spells =
    def.spells && def.spells.length > 0 && !hasUnknownName(def.spells)
      ? def.spells
      : parsedDef?.spells || def.spells || [];
  const sieges =
    def.siegeMachines && def.siegeMachines.length > 0 && !hasUnknownName(def.siegeMachines)
      ? def.siegeMachines
      : parsedDef?.siegeMachines || def.siegeMachines || [];
  const clanCastle =
    def.clanCastle && def.clanCastle.length > 0 && !hasUnknownName(def.clanCastle)
      ? def.clanCastle
      : parsedDef?.clanCastle || def.clanCastle || [];

  const hasUnits =
    troops.length > 0 ||
    spells.length > 0 ||
    sieges.length > 0 ||
    clanCastle.length > 0;

  const rawTitle =
    def.armyName && !def.armyName.includes("Bilinmeyen") && !def.armyName.includes("Unknown")
      ? def.armyName
      : parsedDef?.armyName || def.armyName;
  const armyTitle = cleanDisplayName(rawTitle, isTr);

  return (
    <div className="ui-well p-3 space-y-2.5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--ui-panel-border)]">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {def.opponentTownHallLevel ? (
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[var(--game-dark-box-dark)] border border-[var(--ui-panel-border)] shrink-0">
              <TownHallImage level={def.opponentTownHallLevel} size={22} />
              <span className="text-[11px] font-extrabold text-[var(--ui-text-main)] tabular-nums">
                {t.common.thShort}
                {def.opponentTownHallLevel}
              </span>
            </div>
          ) : null}

          <span className="px-2 py-0.5 rounded-md bg-[var(--game-dark-box-dark)] text-[var(--ui-text-red)] border border-[var(--ui-text-red)]/50 text-xs font-extrabold tabular-nums shrink-0">
            {fmtPct(def.destructionPercentage ?? 100, 0)} (3★)
          </span>

          <div className="min-w-0">
            <span className="font-extrabold text-xs sm:text-sm text-[var(--ui-text-main)] break-words">
              {armyTitle}
            </span>
            <span className="text-xs text-[var(--ui-text-muted)] ml-1.5">
              ({t.cwl.attackerLabel}{" "}
              <strong className="text-[var(--ui-text-main)] font-bold">
                {cleanDisplayName(def.opponentName, isTr)}
              </strong>
              )
            </span>
          </div>
        </div>

        {defCopyLink && (
          <GameButton
            variant="green"
            size="sm"
            href={defCopyLink}
            target="_blank"
            icon={<ExternalLink size={14} />}
            className="min-h-[44px] px-3.5 text-xs whitespace-nowrap shrink-0"
            title={t.meta.copyTooltip}
          >
            {t.meta.copyArmy}
          </GameButton>
        )}
      </div>

      {hasUnits ? (
        <div className="space-y-2">
          <ArmyUnitsWell
            troops={troops}
            spells={spells}
            siegeMachines={sieges}
          />
          {clanCastle.length > 0 && <ClanCastleWell clanCastle={clanCastle} />}
        </div>
      ) : (
        <div className="text-xs font-medium text-[var(--ui-text-muted)] py-1">
          {t.common.noData}
        </div>
      )}
    </div>
  );
}

export function InlinePlayerDetail({
  player,
  onClose,
}: {
  player: ScoutData;
  onClose?: () => void;
}) {
  const { locale, isTr, t, fmtNum, fmtPct, fmtTemplate } = useLanguage();
  const [activeTab, setActiveTab] = useState<"attack" | "defense">("attack");
  const [selectedArmyIdx, setSelectedArmyIdx] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    setSelectedArmyIdx(0);
    setActiveTab("attack");
    setCopiedCode(false);
  }, [player.playerTag, player.opponentName]);

  const recentArmies = player.recentArmies || [];
  const activeOption: RecentArmyOption | null =
    recentArmies[selectedArmyIdx] || recentArmies[0] || null;

  const currentShareCode = (
    activeOption?.armyShareCode ||
    player.armyShareCode ||
    ""
  ).trim();

  const parsedArmy = useMemo(
    () => (currentShareCode ? parseArmyShareCode(currentShareCode, locale) : null),
    [currentShareCode, locale]
  );

  const currentCopyLink = currentShareCode
    ? buildCopyArmyLink(currentShareCode)
    : "";

  const rawTroops = (activeOption ? activeOption.troops : player.troops) || [];
  const rawSpells = (activeOption ? activeOption.spells : player.spells) || [];
  const rawSieges =
    (activeOption
      ? activeOption.siegeMachines
      : player.siege
      ? [player.siege]
      : []) || [];
  const rawCc =
    (activeOption ? activeOption.clanCastle : player.clanCastle) || [];

  const displayedTroops =
    rawTroops.length > 0 && !hasUnknownName(rawTroops)
      ? rawTroops
      : parsedArmy?.troops || rawTroops;
  const displayedSpells =
    rawSpells.length > 0 && !hasUnknownName(rawSpells)
      ? rawSpells
      : parsedArmy?.spells || rawSpells;
  const displayedSieges =
    rawSieges.length > 0 && !hasUnknownName(rawSieges)
      ? rawSieges
      : parsedArmy?.siegeMachines || rawSieges;
  const displayedCc =
    rawCc.length > 0 && !hasUnknownName(rawCc)
      ? rawCc
      : parsedArmy?.clanCastle || rawCc;

  const hasDetectedArmy = Boolean(
    player.armyDetected &&
      (currentShareCode ||
        displayedTroops.length > 0 ||
        displayedSpells.length > 0)
  );

  const failureStatus = normalizeFailureStatus(
    player.failureReason || player.armySourceLabel,
    isTr,
    t
  );

  const rawArmyTitle =
    activeOption?.armyName ||
    player.armyName ||
    player.inferredArchetype ||
    "";
  const resolvedArmyTitle =
    rawArmyTitle && !rawArmyTitle.includes("Bilinmeyen") && !rawArmyTitle.includes("Unknown")
      ? rawArmyTitle
      : parsedArmy?.armyName || rawArmyTitle;

  const currentArmyName = hasDetectedArmy
    ? cleanDisplayName(resolvedArmyTitle, isTr)
    : failureStatus.title;

  const sourceInfo = localizeSourceBadge(
    activeOption?.source || player.armySource,
    activeOption?.sourceBadge || player.sourceBadge,
    isTr
  );

  const armyStatsText = localizeArmyStats(
    activeOption,
    activeOption?.summary || player.armySummary,
    activeOption?.sourceLabel || player.armySourceLabel,
    isTr,
    fmtNum
  );

  const currentWarning = localizeWarning(
    activeOption?.warning ?? player.warning,
    isTr
  );

  const starsCount = activeOption?.stars ?? player.stars ?? 0;
  const destructionRaw =
    activeOption?.destructionPercentage ?? player.destruction ?? 0;
  const destructionStr = Number(destructionRaw).toLocaleString(
    isTr ? "tr-TR" : "en-US",
    { maximumFractionDigits: 1 }
  );

  const capacities = computeArmyCapacities({
    parsedArmy,
    troops: displayedTroops,
    spells: displayedSpells,
    siegeMachines: displayedSieges,
    clanCastle: displayedCc,
    backendTotalTroopHousing: activeOption?.totalTroopHousing,
    backendTotalSpellSpace: activeOption?.totalSpellSpace,
    fmtNum,
  });

  const attackHeroesSource =
    activeOption?.heroes && activeOption.heroes.length > 0
      ? activeOption.heroes
      : parsedArmy?.heroes && parsedArmy.heroes.length > 0
      ? parsedArmy.heroes
      : [];

  const profileHeroesRaw = player.profileHeroes || player.heroes || [];
  const usingProfileHeroes = attackHeroesSource.length === 0;

  const displayHeroes: NormalizedDisplayHero[] = useMemo(() => {
    if (attackHeroesSource.length > 0) {
      return attackHeroesSource.map((h) => ({
        name: h.name,
        pet: h.pet ? { name: h.pet.name } : null,
        equipments: (h.equipment || []).map((eq) => ({
          name: eq.name,
          rarity: eq.rarity,
          maxLevel: "maxLevel" in eq ? eq.maxLevel : undefined,
        })),
      }));
    }
    return profileHeroesRaw.map((h) => ({
      name: h.name,
      level: h.level,
      maxLevel: h.maxLevel,
      pet: h.pet ? { name: h.pet.name, level: h.pet.level } : null,
      equipments: (h.equipments || []).map((eq) => ({
        name: eq.name,
        level: eq.level,
        maxLevel: eq.maxLevel,
        rarity: eq.rarity,
        isEpic: eq.isEpic,
      })),
    }));
  }, [attackHeroesSource, profileHeroesRaw]);

  const totalDefenses = player.totalRankedDefenses || 0;
  const threeStarDefCount =
    player.threeStarDefenseCount ?? player.threeStarDefenses?.length ?? 0;

  const handleCopyCode = async () => {
    if (!currentShareCode) return;
    const ok = await copyToClipboard(currentShareCode);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="space-y-3 min-w-0">
      {/* Top Switcher Bar: Stats + Attack | Defense + Optional Close */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--ui-panel-border)]">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="ui-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-extrabold tabular-nums">
            <img
              src="/icons/ui/trophy.png"
              alt=""
              aria-hidden="true"
              className="w-3.5 h-3.5 object-contain shrink-0 select-none"
            />
            <span>{fmtNum(player.trophies)}</span>
          </span>

          {player.activeSuperTroops && player.activeSuperTroops.length > 0 && (
            <span className="ui-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border-[var(--ui-text-gold)]/50">
              <Flame size={13} className="text-[var(--ui-text-gold)] shrink-0" />
              <span className="break-words text-[var(--ui-text-muted)]">
                {t.cwl.activeSuperTroop}{" "}
                <strong className="font-extrabold text-[var(--ui-text-main)]">
                  {player.activeSuperTroops.join(", ")}
                </strong>
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className="inline-flex items-center p-1 rounded-xl bg-[var(--game-dark-box-dark)] border border-[var(--ui-panel-border)] gap-1"
            role="tablist"
            aria-label={player.opponentName}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "attack"}
              onClick={() => setActiveTab("attack")}
              className={cn(
                "min-h-[44px] px-3.5 rounded-lg text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap",
                activeTab === "attack"
                  ? "bg-[var(--ui-tab-active-bg)] text-[var(--ui-text-main)] border-2 border-[var(--ui-tab-active-border)] shadow-sm"
                  : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)] hover:bg-[var(--game-dark-box-light)] border-2 border-transparent"
              )}
            >
              <Swords size={14} className="shrink-0" />
              <span>{t.cwl.attackTab}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "defense"}
              onClick={() => setActiveTab("defense")}
              className={cn(
                "min-h-[44px] px-3.5 rounded-lg text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap tabular-nums",
                activeTab === "defense"
                  ? "bg-[var(--ui-tab-active-bg)] text-[var(--ui-text-main)] border-2 border-[var(--ui-tab-active-border)] shadow-sm"
                  : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)] hover:bg-[var(--game-dark-box-light)] border-2 border-transparent"
              )}
            >
              <Shield
                size={14}
                className={cn(
                  "shrink-0",
                  threeStarDefCount > 0
                    ? "text-[var(--ui-text-red)]"
                    : "text-[var(--ui-text-green)]"
                )}
              />
              <span>
                {t.cwl.defenseTab} ({fmtNum(threeStarDefCount)})
              </span>
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl bg-[var(--game-dark-box-dark)] hover:bg-[var(--game-dark-box-light)] border border-[var(--ui-panel-border)] text-xs font-bold text-[var(--ui-text-main)] inline-flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0"
              aria-label={t.cwl.closeDetail}
              title={t.cwl.closeDetail}
            >
              <X size={15} className="shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: ATTACK */}
      {activeTab === "attack" && (
        <div className="space-y-3">
          {hasDetectedArmy && (
            <div className="ui-well p-3 space-y-2.5">
              {/* Unmistakable Army Picker Tabs when player has multiple recent armies */}
              {recentArmies.length > 1 && (
                <div className="space-y-1.5 pb-2.5 border-b border-[var(--ui-panel-border)]">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--ui-text-muted)]">
                    {isTr
                      ? `Ordu Seç (${fmtNum(recentArmies.length)} farklı dizilim)`
                      : `Select Army (${fmtNum(recentArmies.length)} detected)`}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {recentArmies.map((opt, idx) => {
                      const isActiveOpt = selectedArmyIdx === idx;
                      const optName = cleanDisplayName(opt.armyName, isTr);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedArmyIdx(idx)}
                          aria-pressed={isActiveOpt}
                          className={cn(
                            "min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 transition-all cursor-pointer tabular-nums text-left",
                            isActiveOpt
                              ? "bg-[var(--ui-tab-active-bg)] text-[var(--ui-text-main)] border-[var(--ui-text-gold)] shadow-sm"
                              : "bg-[var(--game-dark-box-dark)] hover:bg-[var(--game-dark-box-light)] text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)] border-[var(--ui-panel-border)]"
                          )}
                        >
                          <span className="text-[var(--ui-text-gold)] mr-1">
                            #{idx + 1}
                          </span>
                          <span>{optName}</span>
                          <span className="text-[var(--ui-text-muted)] ml-1.5">
                            ({opt.stars}★ {fmtPct(opt.destructionPercentage, 0)})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected Army Summary & Primary Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm sm:text-base font-extrabold text-[var(--ui-text-main)] break-words">
                      {currentArmyName}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[11px] font-bold border bg-[var(--game-dark-box-dark)]",
                        sourceInfo.isRanked
                          ? "text-[var(--ui-text-blue)] border-[var(--ui-text-blue)]/50"
                          : "text-[var(--ui-text-gold)] border-[var(--ui-text-gold)]/50"
                      )}
                    >
                      {sourceInfo.label}
                    </span>
                    {armyStatsText.sourceLabel && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[var(--game-dark-box-dark)] text-[var(--ui-text-green)] border border-[var(--ui-text-green)]/50 tabular-nums">
                        {armyStatsText.sourceLabel}
                      </span>
                    )}
                    {currentWarning && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--game-dark-box-dark)] text-[var(--ui-text-gold)] border border-[var(--ui-text-gold)]/40">
                        {currentWarning}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--ui-text-muted)] tabular-nums">
                    <span className="inline-flex items-center gap-0.5">
                      {[...Array(3)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          fill={i < starsCount ? "currentColor" : "transparent"}
                          className={
                            i < starsCount
                              ? "text-[var(--ui-text-gold)]"
                              : "text-[var(--ui-text-muted)]/40"
                          }
                        />
                      ))}
                    </span>
                    <span>
                      {fmtTemplate(t.cwl.destructionPct, {
                        pct: destructionStr,
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {currentCopyLink && (
                    <GameButton
                      variant="green"
                      size="md"
                      href={currentCopyLink}
                      target="_blank"
                      icon={<ExternalLink size={15} />}
                      className="min-h-[44px] px-3.5 py-2 text-xs sm:text-sm whitespace-nowrap"
                      title={t.meta.copyTooltip}
                    >
                      {t.meta.copyArmy}
                    </GameButton>
                  )}

                  {currentShareCode && (
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-[var(--game-dark-box-dark)] hover:bg-[var(--game-dark-box-light)] border border-[var(--ui-panel-border)] text-xs sm:text-sm font-bold text-[var(--ui-text-main)] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {copiedCode ? (
                        <Check
                          size={14}
                          className="text-[var(--ui-text-green)] shrink-0"
                        />
                      ) : (
                        <Copy size={14} className="shrink-0" />
                      )}
                      <span>{copiedCode ? t.common.copied : t.cwl.copyCode}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {!hasDetectedArmy ? (
            <div className="space-y-3">
              <div className="ui-well p-3.5 flex items-start gap-3">
                <AlertCircle
                  size={18}
                  className="text-[var(--ui-text-gold)] shrink-0 mt-0.5"
                />
                <div className="space-y-1 min-w-0">
                  <div className="text-sm font-extrabold text-[var(--ui-text-main)]">
                    {failureStatus.title}
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--ui-text-muted)] leading-relaxed">
                    {failureStatus.detail}
                  </p>
                </div>
              </div>

              {displayHeroes.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-xs font-extrabold text-[var(--ui-text-muted)] flex items-center gap-1.5 px-0.5">
                    <Crown
                      size={13}
                      className="text-[var(--ui-text-gold)] shrink-0"
                    />
                    <span>{t.cwl.heroesProfileTitle}</span>
                  </div>
                  <HeroesWell
                    heroes={displayHeroes}
                    parsedArmy={parsedArmy}
                    title={t.cwl.heroesProfileTitle}
                  />
                </div>
              ) : (
                <div className="ui-well p-3 text-xs font-semibold text-[var(--ui-text-muted)]">
                  {t.cwl.noHeroData}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <StatPill
                  variant="amber"
                  icon={<Swords size={12} className="text-[var(--ui-text-gold)]" />}
                  label={t.meta.troopCapLabel}
                  value={fmtNum(capacities.totalTroopHousing)}
                  title={t.meta.troopCapLabel}
                />
                <StatPill
                  variant="copper"
                  icon={<Zap size={12} className="text-[var(--ui-text-gold)]" />}
                  label={t.meta.spellCapLabel}
                  value={fmtNum(capacities.totalSpellSpace)}
                  title={t.meta.spellCapLabel}
                />
                <StatPill
                  variant="amber"
                  icon={<Shield size={12} className="text-[var(--ui-text-gold)]" />}
                  label={t.meta.siegeCapLabel}
                  value={fmtNum(capacities.totalSiegeUnits)}
                  title={t.meta.siegeCapLabel}
                />
                <StatPill
                  variant="green"
                  icon={<Castle size={12} className="text-[var(--ui-text-green)]" />}
                  label={t.meta.ccCapLabel}
                  value={capacities.ccDisplayValue}
                  title={t.meta.ccCapLabel}
                />
              </div>

              <ArmyUnitsWell
                troops={displayedTroops}
                spells={displayedSpells}
                siegeMachines={displayedSieges}
              />

              {(displayHeroes.length > 0 || displayedCc.length > 0) && (
                <div className="space-y-1">
                  {usingProfileHeroes && displayHeroes.length > 0 && (
                    <div className="text-[11px] font-bold text-[var(--ui-text-muted)] flex items-center gap-1 px-0.5">
                      <Crown
                        size={12}
                        className="text-[var(--ui-text-gold)] shrink-0"
                      />
                      <span>{t.cwl.heroesProfileTitle}</span>
                    </div>
                  )}
                  <div className="flex flex-col xl:flex-row items-stretch gap-2.5 w-full">
                    <HeroesWell
                      heroes={displayHeroes}
                      parsedArmy={parsedArmy}
                      title={
                        usingProfileHeroes
                          ? t.cwl.heroesProfileTitle
                          : t.meta.sectionHeroes
                      }
                    />
                    <ClanCastleWell clanCastle={displayedCc} />
                  </div>
                </div>
              )}
            </div>
          )}

          {player.warAttacks && player.warAttacks.length > 0 && (
            <div className="ui-well p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[var(--ui-text-main)] tabular-nums">
                <img
                  src="/icons/ui/trophy.png"
                  alt=""
                  aria-hidden="true"
                  className="w-3.5 h-3.5 object-contain shrink-0 select-none"
                />
                <span>
                  {isTr ? "CWL / Savaş Saldırıları" : "CWL / War Attacks"} (
                  {fmtNum(player.warAttacks.length)})
                </span>
              </div>
              <div className="space-y-1.5">
                {player.warAttacks.map((atk, idx) => (
                  <div
                    key={idx}
                    className="px-2.5 py-2 rounded-lg bg-[var(--game-dark-box-dark)] border border-[var(--ui-panel-border)] flex items-center justify-between gap-2 text-xs sm:text-sm"
                  >
                    <div className="min-w-0 truncate text-[var(--ui-text-main)]">
                      <span className="text-[var(--ui-text-muted)] font-semibold mr-1">
                        {isTr ? "Hedef:" : "Target:"}
                      </span>
                      <span className="tabular-nums font-bold mr-1">
                        #{atk.defenderMapPosition || "?"}
                      </span>
                      <span className="font-extrabold">
                        {atk.defenderName || atk.defenderTag}
                      </span>
                      {atk.defenderTownHall
                        ? ` (${t.common.thShort}${atk.defenderTownHall})`
                        : ""}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      <span className="text-[var(--ui-text-gold)] font-extrabold">
                        {atk.stars}★
                      </span>
                      <span className="text-[var(--ui-text-muted)] font-bold">
                        {fmtPct(atk.destructionPercentage, 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DEFENSE */}
      {activeTab === "defense" && (
        <div className="space-y-3">
          {!player.threeStarDefenses || player.threeStarDefenses.length === 0 ? (
            <div className="ui-well p-3.5 flex flex-wrap items-center justify-between gap-2 border-[var(--ui-text-green)]/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <Check
                  size={17}
                  className="text-[var(--ui-text-green)] shrink-0"
                />
                <span className="text-xs sm:text-sm font-bold text-[var(--ui-text-main)]">
                  {totalDefenses > 0
                    ? fmtTemplate(t.cwl.detailDefClean, {
                        count: fmtNum(totalDefenses),
                      })
                    : isTr
                    ? "Bu oyuncunun ranked savunma geçmişinde 3 yıldız yediği bir saldırı kaydı bulunmuyor."
                    : "No 3-star defenses found in recent ranked history."}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[var(--game-dark-box-dark)] border border-[var(--ui-text-green)]/40 text-xs font-extrabold text-[var(--ui-text-green)] tabular-nums shrink-0">
                {isTr
                  ? `Toplam ${fmtNum(totalDefenses)} Ranked Savunma`
                  : `${fmtNum(totalDefenses)} Ranked Defenses`}
              </span>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="ui-well p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Shield
                    size={16}
                    className="text-[var(--ui-text-red)] shrink-0"
                  />
                  <span className="font-extrabold text-xs sm:text-sm text-[var(--ui-text-main)] tabular-nums">
                    {t.cwl.detailDefTitle} ({fmtNum(threeStarDefCount)})
                  </span>
                </div>
                <span className="text-xs font-bold text-[var(--ui-text-muted)] tabular-nums">
                  {totalDefenses > 0
                    ? fmtTemplate(t.cwl.detailDefSummary, {
                        total: fmtNum(totalDefenses),
                        hits: fmtNum(threeStarDefCount),
                      })
                    : isTr
                    ? `${fmtNum(threeStarDefCount)} kez 3★`
                    : `${fmtNum(threeStarDefCount)}× 3★`}
                </span>
              </div>

              {player.threeStarDefenses.map((def, dIdx) => (
                <DefenseEntryCard key={`def-${dIdx}`} def={def} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Dedicated Desktop Inspector Panel for Selected Opponent
 */
export function PlayerScoutInspector({
  player,
  rank,
}: {
  player: ScoutData;
  rank: number;
}) {
  const { isTr, t } = useLanguage();

  return (
    <div className="ui-panel overflow-hidden min-w-0">
      <div className="ui-panel-header px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="clan-rank-badge !min-w-[34px] !h-[34px] !text-xs tabular-nums shrink-0">
            #{player.mapPosition || rank + 1}
          </div>
          <TownHallImage level={player.townHallLevel} size={32} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="font-game text-sm sm:text-base font-extrabold text-[var(--ui-text-main)] truncate">
                {player.opponentName}
              </h3>
              {player.isCwl && (
                <span className="px-1.5 py-0.5 rounded bg-[var(--game-dark-box-dark)] border border-[var(--ui-text-gold)]/60 text-[10px] font-extrabold text-[var(--ui-text-gold)] shrink-0">
                  CWL
                </span>
              )}
            </div>
            {player.playerTag && (
              <div className="text-[11px] font-semibold text-[var(--ui-text-muted)] tabular-nums truncate">
                {player.playerTag} · {t.common.thShort}
                {player.townHallLevel}
              </div>
            )}
          </div>
        </div>

        <span className="text-[11px] font-bold text-[var(--ui-text-muted)] shrink-0">
          {isTr ? "Seçili Rakip" : "Selected Target"}
        </span>
      </div>

      <div className="p-3.5 sm:p-4">
        <InlinePlayerDetail
          key={player.playerTag || `${player.opponentName}-${rank}`}
          player={player}
        />
      </div>
    </div>
  );
}

export interface CwlRosterCardProps {
  opponent: ScoutData;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

/**
 * Simplified, easy-to-scan CWL Opponent Row.
 * Clicking anywhere on the row selects it in Desktop Inspector or expands inline on Mobile.
 */
export function CwlRosterCard({
  opponent: opp,
  index: idx,
  isExpanded,
  onToggleExpand,
}: CwlRosterCardProps) {
  const { locale, isTr, t, fmtNum, fmtPct } = useLanguage();

  const recentArmies = opp.recentArmies || [];
  const primaryOpt = recentArmies[0] || null;
  const shareCode = (
    primaryOpt?.armyShareCode ||
    opp.armyShareCode ||
    ""
  ).trim();
  const detected = Boolean(opp.armyDetected && shareCode);

  const parsedFallback = useMemo(
    () => (detected ? parseArmyShareCode(shareCode, locale) : null),
    [detected, shareCode, locale]
  );

  const rawArmyTitle = primaryOpt?.armyName || opp.armyName || opp.inferredArchetype || "";
  const resolvedTitle =
    rawArmyTitle && !rawArmyTitle.includes("Bilinmeyen") && !rawArmyTitle.includes("Unknown")
      ? rawArmyTitle
      : parsedFallback?.armyName || rawArmyTitle;

  const failInfo = normalizeFailureStatus(opp.failureReason, isTr, t);
  const starsVal = primaryOpt?.stars ?? opp.stars ?? 0;
  const destructionVal =
    primaryOpt?.destructionPercentage ?? opp.destruction ?? 0;

  return (
    <div
      className={cn(
        "rounded-2xl border-2 transition-all overflow-hidden min-w-0",
        isExpanded
          ? "bg-[var(--ui-tab-active-bg)] border-[var(--ui-text-gold)] shadow-sm"
          : "ui-info border-[var(--ui-panel-border)] hover:border-[var(--ui-text-gold)]/70",
        !detected && !isExpanded && "opacity-85"
      )}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        className="w-full min-h-[60px] px-3 py-2.5 flex items-center justify-between gap-2.5 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-text-gold)]"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="clan-rank-badge !min-w-[32px] !h-[32px] !text-xs tabular-nums shrink-0">
            #{opp.mapPosition || idx + 1}
          </div>

          <div className="flex flex-col items-center shrink-0">
            <TownHallImage level={opp.townHallLevel} size={28} />
            <span className="text-[10px] font-extrabold text-[var(--ui-text-muted)] -mt-0.5 tabular-nums">
              {t.common.thShort}
              {opp.townHallLevel}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-extrabold text-[var(--ui-text-main)] truncate">
                {opp.opponentName}
              </span>
              {opp.isCwl && (
                <span className="px-1.5 py-0.5 rounded bg-[var(--game-dark-box-dark)] border border-[var(--ui-text-gold)]/55 text-[10px] font-extrabold text-[var(--ui-text-gold)] shrink-0">
                  CWL
                </span>
              )}
            </div>

            {detected ? (
              <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                <span className="text-xs font-bold text-[var(--ui-text-gold)] truncate">
                  {cleanDisplayName(resolvedTitle, isTr)}
                </span>
                {recentArmies.length > 1 && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--game-dark-box-dark)] border border-[var(--ui-panel-border)] text-[10px] font-extrabold text-[var(--ui-text-main)] tabular-nums shrink-0">
                    {fmtNum(recentArmies.length)} {isTr ? "ordu" : "armies"}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs font-medium text-[var(--ui-text-muted)] truncate mt-0.5">
                {failInfo.badge}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
          {detected && (starsVal > 0 || destructionVal > 0) && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--game-dark-box-dark)] border border-[var(--ui-panel-border)] text-xs font-extrabold text-[var(--ui-text-gold)]">
              <span>{starsVal}★</span>
              <span className="text-[var(--ui-text-main)]">
                {fmtPct(destructionVal, 0)}
              </span>
            </span>
          )}

          {/* Desktop shows selection arrow, mobile shows expand chevron */}
          <ChevronRight
            size={17}
            className={cn(
              "hidden lg:block transition-colors shrink-0",
              isExpanded
                ? "text-[var(--ui-text-gold)]"
                : "text-[var(--ui-text-muted)]"
            )}
          />
          <ChevronDown
            size={17}
            className={cn(
              "lg:hidden transition-transform duration-200 shrink-0",
              isExpanded
                ? "rotate-180 text-[var(--ui-text-gold)]"
                : "text-[var(--ui-text-muted)]"
            )}
          />
        </div>
      </button>

      {/* Mobile-only Inline Detail Accordion */}
      {isExpanded && (
        <div className="lg:hidden border-t border-[var(--ui-panel-border)] bg-[var(--game-dark-box-dark)] p-3">
          <InlinePlayerDetail
            key={opp.playerTag || `${opp.opponentName}-${idx}`}
            player={opp}
            onClose={onToggleExpand}
          />
        </div>
      )}
    </div>
  );
}
