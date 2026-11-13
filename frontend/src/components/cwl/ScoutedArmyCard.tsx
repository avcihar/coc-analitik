"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Copy,
  Check,
  Star,
  Trophy,
  Swords,
  Shield,
  Zap,
  Sparkles,
  ScrollText,
  RefreshCw,
  Flame,
  LayoutGrid,
  User,
  Users,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { buildCopyArmyLink } from "@/lib/armyLink";
import { safeFetchJson } from "@/lib/apiClient";
import { useLanguage, type TranslationDict } from "@/lib/i18n";
import {
  COMMON_MAX_LEVEL,
  EPIC_MAX_LEVEL,
  detectEquipmentRarity,
} from "@/lib/equipmentCosts";
import {
  GameButton,
  GameInput,
  IconFrame,
  StatPill,
  TownHallImage,
} from "@/components/game";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Domain Interfaces ---
interface Hero {
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

interface Unit {
  id: string | number;
  name: string;
  count: number;
  level?: number;
  housingSpace?: number;
  totalHousingSpace?: number;
  totalSpellSpace?: number;
}

interface WarAttack {
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

interface RecentArmyOption {
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

interface CwlScoutReport {
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

// Known Epic Equipment fallback set when maxLevel is absent on decoded loadout items
const KNOWN_EPIC_EQUIPMENTS = new Set([
  "Giant Gauntlet",
  "Spiky Ball",
  "Snake Bracelet",
  "Stick Horse",
  "Frozen Arrow",
  "Magic Mirror",
  "Action Figure",
  "Fireball",
  "Heroic Torch",
  "Lavaloon Puppet",
  "Rocket Spear",
  "Electro Boots",
  "Frost Flake",
  "Dark Crown",
  "Meteor Staff",
  "Electro Fangs",
  "Revenge Deck",
]);

function getEquipmentRarity(eq: {
  name: string;
  maxLevel?: number;
  rarity?: string;
  isEpic?: boolean;
}): "Epic" | "Common" {
  if (eq.maxLevel === COMMON_MAX_LEVEL || eq.maxLevel === EPIC_MAX_LEVEL) {
    const detected = detectEquipmentRarity(eq.maxLevel);
    if (detected) return detected;
  }
  if (typeof eq.maxLevel === "number" && eq.maxLevel > COMMON_MAX_LEVEL) {
    return "Epic";
  }
  if (eq.isEpic === true || eq.rarity?.toLowerCase() === "epic") {
    return "Epic";
  }
  if (KNOWN_EPIC_EQUIPMENTS.has(eq.name)) {
    return "Epic";
  }
  return "Common";
}

function cleanDisplayName(raw: string | null | undefined, isTr: boolean): string {
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

function cleanClanDisplayName(raw: string | null | undefined, isTr: boolean): string {
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

function localizeWarning(warning: string | null | undefined, isTr: boolean): string | null {
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
        ? `En iyi ordu (3★ ×${stars} / ${total})`
        : `Top army (3★ ×${stars} / ${total})`,
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
      sourceLabel: isTr
        ? `En iyi ordu (3★ ×${stars} / ${total})`
        : `Top army (3★ ×${stars} / ${total})`,
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
      sourceLabel: isTr
        ? `En iyi ordu (3★ ×${stars} / ${total})`
        : `Top army (3★ ×${stars} / ${total})`,
    };
  }

  if (rawLabel.toLowerCase() === "son ranked saldırısı") {
    return {
      summary: "",
      sourceLabel: isTr ? "Son ranked saldırısı" : "Latest ranked attack",
    };
  }

  return {
    summary: isTr ? rawSummary : "",
    sourceLabel: isTr
      ? rawLabel || "Son ranked saldırısı"
      : "Top ranked army",
  };
}

function localizeWarState(
  state: string | undefined,
  t: TranslationDict,
  isTr: boolean
): string {
  const s = (state || "").toLowerCase();
  if (s === "inwar") return t.cwl.statusLabels.inWar;
  if (s === "preparation") return t.cwl.statusLabels.preparation;
  if (s === "warended") return t.cwl.statusLabels.warEnded;
  if (s === "unrevealed") return isTr ? "Henüz Belli Değil" : "Unrevealed";
  return t.cwl.statusLabels.notInWar;
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

const UnitCard = ({
  unit,
  type,
}: {
  unit: Unit;
  type: "troop" | "spell" | "siege" | "cc";
}) => {
  const { isTr, fmtNum } = useLanguage();
  const displayName = cleanDisplayName(unit.name, isTr);

  const badgeTheme = {
    troop:
      "bg-gradient-to-b from-[#3399E8] to-[#1B72C6] text-white border-[#104C8A]",
    spell:
      "bg-gradient-to-b from-[#2E6B70] to-[#1A474B] text-teal-50 border-[#0F2C2E]",
    siege:
      "bg-gradient-to-b from-[#F5B824] to-[#C97F08] text-stone-950 border-[#663F02]",
    cc: "bg-gradient-to-b from-[#72BD36] to-[#438719] text-white border-[#24540A]",
  };

  const tileType =
    type === "spell" ? "spell" : type === "siege" ? "siege" : undefined;

  return (
    <div className="bg-[#241710] border-2 border-[#3D2517] rounded-xl p-2.5 flex items-center justify-between gap-2.5 shadow-sm hover:border-amber-500/50 transition-colors select-none min-w-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <IconFrame name={displayName} size="sm" tileType={tileType} />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-white truncate leading-snug">
            {displayName}
          </div>
          {unit.housingSpace !== undefined && unit.housingSpace > 0 && (
            <div className="text-xs text-amber-200/70 tabular-nums truncate">
              {fmtNum(unit.housingSpace * unit.count)}{" "}
              {isTr ? "Alan" : "Space"}
            </div>
          )}
        </div>
      </div>
      <span
        className={cn(
          "px-2.5 py-0.5 rounded-lg text-xs font-bold shadow-sm border shrink-0 tabular-nums",
          badgeTheme[type]
        )}
      >
        ×{fmtNum(unit.count)}
      </span>
    </div>
  );
};

const PlayerScoutCardDetail = ({ player }: { player: ScoutData }) => {
  const { isTr, t, fmtNum, fmtPct, fmtTemplate } = useLanguage();
  const [selectedArmyIdx, setSelectedArmyIdx] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    setSelectedArmyIdx(0);
    setCopiedCode(false);
  }, [player.playerTag]);

  const recentArmies = player.recentArmies || [];
  const activeOption: RecentArmyOption | null =
    recentArmies[selectedArmyIdx] || recentArmies[0] || null;

  const hasDetectedArmy = Boolean(
    player.armyDetected &&
      (activeOption?.armyShareCode || player.armyShareCode)
  );
  const currentShareCode = (
    activeOption?.armyShareCode ||
    player.armyShareCode ||
    ""
  ).trim();
  const currentCopyLink = currentShareCode
    ? buildCopyArmyLink(currentShareCode)
    : "";

  const failureStatus = normalizeFailureStatus(
    player.failureReason || player.armySourceLabel,
    isTr,
    t
  );

  const currentArmyName = hasDetectedArmy
    ? cleanDisplayName(
        activeOption?.armyName || player.armyName || player.inferredArchetype,
        isTr
      )
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

  const displayedTroops = activeOption
    ? activeOption.troops
    : player.troops || [];
  const displayedSpells = activeOption
    ? activeOption.spells
    : player.spells || [];
  const displayedSiege = activeOption
    ? activeOption.siegeMachines?.[0] || null
    : player.siege || null;
  const displayedCc = activeOption
    ? activeOption.clanCastle || []
    : player.clanCastle || [];

  const starsCount = activeOption?.stars ?? player.stars ?? 0;
  const destructionRaw =
    activeOption?.destructionPercentage ?? player.destruction ?? 0;
  const destructionStr = Number(destructionRaw).toLocaleString(
    isTr ? "tr-TR" : "en-US",
    { maximumFractionDigits: 1 }
  );

  const profileHeroes = player.profileHeroes || player.heroes || [];
  const totalDefenses = player.totalRankedDefenses || 0;
  const threeStarDefCount = player.threeStarDefenseCount || 0;

  const handleCopyCode = async () => {
    if (!currentShareCode) return;
    const ok = await copyToClipboard(currentShareCode);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full game-panel-wood rounded-2xl border-4 border-[#2C180E] shadow-2xl overflow-hidden text-stone-100"
    >
      {/* Header Bar */}
      <div className="game-panel-header px-4 py-4 sm:px-6 sm:py-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 w-full lg:w-auto">
          <div className="relative shrink-0 flex flex-col items-center">
            <TownHallImage
              level={player.townHallLevel}
              size={56}
              className="drop-shadow-lg"
            />
            <span className="mt-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/45 text-amber-200 text-xs font-bold leading-none tabular-nums">
              {t.common.thShort} {player.townHallLevel}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="game-text-stroke-gold text-lg sm:text-2xl font-black tracking-wide break-words">
                <span className="tabular-nums">#{player.mapPosition || 1}</span>{" "}
                {player.opponentName}
              </h2>
              {player.playerTag && (
                <span className="text-xs font-medium text-amber-200/75 tabular-nums">
                  ({player.playerTag})
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-md text-xs font-semibold border",
                  hasDetectedArmy
                    ? "bg-[#3E2B1E] text-amber-100 border-amber-500/45"
                    : "bg-[#241710] text-stone-300 border-[#4A3223]"
                )}
              >
                {currentArmyName}
              </span>

              {hasDetectedArmy ? (
                <>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-md text-xs font-semibold border",
                      sourceInfo.isRanked
                        ? "bg-[#163336] text-teal-200 border-teal-500/45"
                        : "bg-amber-950/75 text-amber-200 border-amber-500/45"
                    )}
                  >
                    {sourceInfo.label}
                  </span>
                  {armyStatsText.sourceLabel && (
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-950/75 text-emerald-200 border border-emerald-500/40 tabular-nums">
                      {armyStatsText.sourceLabel}
                    </span>
                  )}
                </>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-950/75 text-rose-200 border border-rose-500/45">
                  {failureStatus.badge}
                </span>
              )}

              {currentWarning && (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-950/80 text-amber-200 border border-amber-500/40">
                  {currentWarning}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-amber-100 mt-2.5">
              <StatPill
                icon={<Trophy size={13} className="text-amber-400" />}
                value={fmtNum(player.trophies)}
                variant="amber"
              />
              {player.activeSuperTroops && player.activeSuperTroops.length > 0 && (
                <span className="game-stat-pill text-rose-200 border-rose-700/50 text-xs">
                  <Flame size={13} className="text-rose-400 shrink-0" />
                  <span>
                    {t.cwl.activeSuperTroop}{" "}
                    <strong className="font-semibold text-white">
                      {player.activeSuperTroops.join(", ")}
                    </strong>
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons & Stars */}
        {hasDetectedArmy && (
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end pt-2 lg:pt-0 border-t border-[#3D2517]/70 lg:border-t-0">
            <div className="flex flex-col items-start lg:items-end">
              <div className="flex gap-1 items-center">
                {[...Array(3)].map((_, i) => (
                  <Star
                    key={i}
                    size={19}
                    fill={i < starsCount ? "#FFD200" : "transparent"}
                    className={
                      i < starsCount
                        ? "text-[#FFD200] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                        : "text-stone-600"
                    }
                  />
                ))}
              </div>
              <div className="text-xs sm:text-sm font-bold text-amber-200 tracking-wide mt-0.5 tabular-nums">
                {fmtTemplate(t.cwl.destructionPct, { pct: destructionStr })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <GameButton
                variant="green"
                size="md"
                href={currentCopyLink}
                target="_blank"
                icon={<ExternalLink size={15} />}
                className="min-h-[44px] px-3.5 py-2 text-xs sm:text-sm"
                title={t.meta.copyTooltip}
              >
                {t.meta.copyArmy}
              </GameButton>

              <GameButton
                variant={copiedCode ? "green" : "gold"}
                size="md"
                onClick={handleCopyCode}
                icon={copiedCode ? <Check size={14} /> : <Copy size={14} />}
                className="min-h-[44px] px-3 py-2 text-xs sm:text-sm"
              >
                {copiedCode ? t.common.copied : t.cwl.copyCode}
              </GameButton>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* Selector for up to 3 recent distinct attack armies */}
        {recentArmies.length > 1 && (
          <div className="game-slot-well p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-semibold text-amber-200">
              {fmtTemplate(t.cwl.detailBestMatch, {
                count: fmtNum(recentArmies.length),
              })}
            </span>
            <div className="flex flex-wrap gap-2">
              {recentArmies.map((opt, idx) => {
                const isActiveOpt = selectedArmyIdx === idx;
                return (
                  <GameButton
                    key={idx}
                    variant={isActiveOpt ? "blue" : "gold"}
                    size="sm"
                    onClick={() => setSelectedArmyIdx(idx)}
                    className={cn(
                      "min-h-[44px] px-3 text-xs tabular-nums",
                      !isActiveOpt && "opacity-75 hover:opacity-100"
                    )}
                  >
                    #{idx + 1} {cleanDisplayName(opt.armyName, isTr)} ({opt.stars}★ •{" "}
                    {fmtPct(opt.destructionPercentage, 0)})
                  </GameButton>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 1: Player Profile Heroes & Equipments */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#3D2517] pb-2">
            <h3 className="font-game text-sm sm:text-base text-amber-200 tracking-wide flex items-center gap-2">
              <Shield size={16} className="text-amber-400 shrink-0" />
              <span>{t.cwl.detailHeroTitle}</span>
            </h3>
            <span className="text-xs font-medium text-amber-200/75">
              {t.cwl.detailHeroSource}
            </span>
          </div>

          {profileHeroes.length === 0 ? (
            <div className="text-xs sm:text-sm font-medium text-stone-300 p-3.5 rounded-xl bg-[#241710] border border-[#3D2517]">
              {t.cwl.noHeroData}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {profileHeroes.map((hero) => (
                <div
                  key={hero.id || hero.name}
                  className="bg-[#241710] border-2 border-[#3D2517] rounded-xl p-3 flex flex-col justify-between gap-2.5 shadow-md hover:border-amber-500/40 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <IconFrame
                          name={hero.name}
                          size="sm"
                          tileType="hero"
                          level={hero.level}
                          maxLevel={hero.maxLevel}
                        />
                        <span className="text-sm font-bold text-white truncate">
                          {cleanDisplayName(hero.name, isTr)}
                        </span>
                      </div>
                      {hero.level !== undefined && (
                        <span className="px-2 py-0.5 rounded-md bg-gradient-to-b from-amber-400 to-amber-500 text-stone-950 text-xs font-bold border border-amber-300 shadow-sm shrink-0 tabular-nums">
                          {t.common.levelShort} {fmtNum(hero.level)}
                          {hero.maxLevel ? `/${fmtNum(hero.maxLevel)}` : ""}
                        </span>
                      )}
                    </div>

                    {hero.pet && (
                      <div className="p-2 rounded-lg bg-[#142627] border border-teal-500/35 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <IconFrame
                            name={hero.pet.name}
                            size="xs"
                            tileType="pet"
                            level={hero.pet.level}
                          />
                          <span className="text-xs font-semibold text-teal-100 truncate">
                            {cleanDisplayName(hero.pet.name, isTr)}
                          </span>
                        </div>
                        {hero.pet.level !== undefined && (
                          <span className="text-xs font-semibold text-teal-200 px-1.5 py-0.5 rounded bg-[#0E1B1C] border border-teal-500/40 shrink-0 tabular-nums">
                            {t.common.levelShort} {fmtNum(hero.pet.level)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-[#3D2517]">
                    {(hero.equipments || []).length === 0 ? (
                      <div className="text-xs text-stone-400 py-1">
                        {t.cwl.noEquipText}
                      </div>
                    ) : (
                      (hero.equipments || []).map((eq, i) => {
                        const rarity = getEquipmentRarity(eq);
                        const isEpic = rarity === "Epic";
                        const maxLvl =
                          eq.maxLevel ??
                          (isEpic ? EPIC_MAX_LEVEL : COMMON_MAX_LEVEL);
                        return (
                          <div
                            key={`${eq.name}-${i}`}
                            className={cn(
                              "flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded-lg border transition-colors",
                              isEpic
                                ? "bg-amber-950/45 border-amber-400/65 text-amber-100"
                                : "bg-[#1C1612] border-[#4A3F35] text-stone-200"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <IconFrame
                                name={eq.name}
                                size="xs"
                                tileType="equipment"
                                rarity={isEpic ? "epic" : "common"}
                                level={eq.level}
                                maxLevel={maxLvl}
                              />
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-xs leading-snug">
                                  {cleanDisplayName(eq.name, isTr)}
                                </div>
                                <div
                                  className={cn(
                                    "text-[11px] font-medium leading-tight",
                                    isEpic ? "text-amber-300" : "text-stone-400"
                                  )}
                                >
                                  {isEpic
                                    ? t.ore.epicRarity
                                    : t.ore.commonRarity}
                                </div>
                              </div>
                            </div>
                            {eq.level !== undefined && (
                              <span
                                className={cn(
                                  "text-xs px-2 py-0.5 rounded font-bold shrink-0 tabular-nums border",
                                  isEpic
                                    ? "bg-amber-400 text-stone-950 border-amber-200"
                                    : "bg-[#2C241E] text-stone-200 border-[#4E4237]"
                                )}
                              >
                                {t.common.levelShort} {fmtNum(eq.level)}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Decoded Attack Army OR Normalized Failure Reason */}
        {!hasDetectedArmy ? (
          <div className="bg-[#241710] border-2 border-[#4A3223] rounded-xl p-4 flex items-start gap-3 text-sm text-amber-100 shadow-md">
            <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-game text-sm sm:text-base text-white tracking-wide">
                {failureStatus.title}
              </div>
              <p className="text-xs sm:text-sm text-amber-200/85 leading-relaxed">
                {failureStatus.detail}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Attack Heroes Setup */}
            {activeOption &&
              activeOption.heroes &&
              activeOption.heroes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-[#3D2517] pb-2">
                    <h3 className="font-game text-sm sm:text-base text-amber-200 tracking-wide flex items-center gap-2">
                      <Sparkles size={16} className="text-amber-400 shrink-0" />
                      <span>{t.cwl.detailShareSetup}</span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {activeOption.heroes.map((h) => (
                      <div
                        key={h.id}
                        className="bg-[#241710] border-2 border-[#3D2517] rounded-xl p-3 space-y-2.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <IconFrame
                              name={h.name}
                              size="xs"
                              tileType="hero"
                            />
                            <span className="text-xs sm:text-sm font-bold text-white truncate">
                              {cleanDisplayName(h.name, isTr)}
                            </span>
                          </div>
                          {h.pet && (
                            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-[#142627] border border-teal-500/35 text-xs font-medium text-teal-200 shrink-0 max-w-[130px]">
                              <IconFrame
                                name={h.pet.name}
                                size="xs"
                                tileType="pet"
                                className="w-5 h-5"
                              />
                              <span className="truncate">
                                {cleanDisplayName(h.pet.name, isTr)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {h.equipment.map((eq) => {
                            const isEpic = getEquipmentRarity(eq) === "Epic";
                            return (
                              <div
                                key={eq.id}
                                className={cn(
                                  "text-xs px-2 py-1 rounded-lg border flex items-center justify-between gap-2 font-medium",
                                  isEpic
                                    ? "bg-amber-950/45 border-amber-400/65 text-amber-100"
                                    : "bg-[#1C1612] border-[#4A3F35] text-stone-200"
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <IconFrame
                                    name={eq.name}
                                    size="xs"
                                    tileType="equipment"
                                    rarity={isEpic ? "epic" : "common"}
                                  />
                                  <span className="truncate">
                                    {cleanDisplayName(eq.name, isTr)}
                                  </span>
                                </div>
                                <span
                                  className={cn(
                                    "text-[11px] font-semibold shrink-0",
                                    isEpic ? "text-amber-300" : "text-stone-400"
                                  )}
                                >
                                  {isEpic
                                    ? t.ore.epicRarity
                                    : t.ore.commonRarity}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Deployed Troops Grid */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#3D2517] pb-2">
                <h3 className="font-game text-sm sm:text-base text-amber-200 tracking-wide flex items-center gap-2">
                  <Swords size={16} className="text-amber-400 shrink-0" />
                  <span>
                    {t.cwl.detailUnitsTitle} ({currentArmyName})
                  </span>
                </h3>
                {armyStatsText.sourceLabel && (
                  <span className="text-xs font-medium text-amber-200/75 tabular-nums">
                    {armyStatsText.sourceLabel}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {displayedTroops.map((troop, idx) => (
                  <UnitCard
                    key={`${troop.id}-${idx}`}
                    unit={troop}
                    type="troop"
                  />
                ))}
              </div>
            </div>

            {/* Spells, Siege & Clan Castle */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="space-y-2.5">
                <h4 className="font-game text-sm uppercase text-teal-300 tracking-wider flex items-center gap-2 border-b-2 border-[#3D2517] pb-2">
                  <Zap size={15} className="text-teal-400 shrink-0" />
                  <span>{t.cwl.detailSpells}</span>
                </h4>
                <div className="space-y-2">
                  {displayedSpells.length === 0 ? (
                    <div className="text-xs font-medium text-stone-400 p-3 rounded-xl bg-[#241710] border border-[#3D2517]">
                      {t.common.noData}
                    </div>
                  ) : (
                    displayedSpells.map((spell, idx) => (
                      <UnitCard
                        key={`${spell.id}-${idx}`}
                        unit={spell}
                        type="spell"
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="font-game text-sm uppercase text-amber-300 tracking-wider flex items-center gap-2 border-b-2 border-[#3D2517] pb-2">
                  <Shield size={15} className="text-amber-400 shrink-0" />
                  <span>{t.cwl.detailSiege}</span>
                </h4>
                {displayedSiege ? (
                  <UnitCard unit={displayedSiege} type="siege" />
                ) : (
                  <div className="text-xs font-medium text-stone-400 p-3 rounded-xl bg-[#241710] border border-[#3D2517]">
                    {t.common.noData}
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                <h4 className="font-game text-sm uppercase text-emerald-300 tracking-wider flex items-center gap-2 border-b-2 border-[#3D2517] pb-2">
                  <ScrollText size={15} className="text-emerald-400 shrink-0" />
                  <span>{t.cwl.detailCC}</span>
                </h4>
                <div className="space-y-2">
                  {displayedCc.length === 0 ? (
                    <div className="text-xs font-medium text-stone-400 p-3 rounded-xl bg-[#241710] border border-[#3D2517]">
                      {t.common.noData}
                    </div>
                  ) : (
                    displayedCc.map((unit, idx) => (
                      <UnitCard
                        key={`${unit.id}-${idx}`}
                        unit={unit}
                        type="cc"
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Live CWL War Attacks if present */}
        {player.warAttacks && player.warAttacks.length > 0 && (
          <div className="pt-2 border-t-2 border-[#3D2517]">
            <div className="game-slot-well p-4 space-y-3">
              <h4 className="font-game text-sm uppercase text-amber-300 tracking-wider flex items-center gap-2">
                <Trophy size={15} className="text-amber-400 shrink-0" />
                <span className="tabular-nums">
                  {isTr ? "CWL / Savaş Saldırıları" : "CWL / War Attacks"} (
                  {fmtNum(player.warAttacks.length)})
                </span>
              </h4>
              <div className="space-y-2">
                {player.warAttacks.map((atk, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#241710] border border-[#3D2517] flex items-center justify-between gap-2 text-xs sm:text-sm text-stone-200"
                  >
                    <div className="min-w-0 truncate">
                      <span className="text-amber-200/75 mr-1">
                        {isTr ? "Hedef:" : "Target:"}
                      </span>
                      <span className="tabular-nums font-semibold mr-1">
                        #{atk.defenderMapPosition || "?"}
                      </span>
                      <span className="font-bold text-white">
                        {atk.defenderName || atk.defenderTag}
                      </span>
                      {atk.defenderTownHall
                        ? ` (${t.common.thShort}${atk.defenderTownHall})`
                        : ""}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      <span className="text-amber-300 font-bold text-sm">
                        {atk.stars}★
                      </span>
                      <span className="text-amber-200/80 font-semibold">
                        {fmtPct(atk.destructionPercentage, 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Defense Analysis — 3-Star Defenses */}
        <div className="pt-2 border-t-2 border-[#3D2517] space-y-3">
          <div className="game-slot-well p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#3D2517] pb-2.5">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-rose-400 shrink-0" />
                <h4 className="font-game text-sm uppercase tracking-wider text-amber-200">
                  {t.cwl.detailDefTitle} ({fmtNum(threeStarDefCount)})
                </h4>
              </div>
              <span className="text-xs font-medium text-amber-200/75 tabular-nums">
                {isTr
                  ? `Toplam ${fmtNum(totalDefenses)} Ranked Savunma`
                  : `${fmtNum(totalDefenses)} Ranked Defenses`}
              </span>
            </div>

            {!player.threeStarDefenses ||
            player.threeStarDefenses.length === 0 ? (
              <div className="text-xs sm:text-sm font-medium text-emerald-200 bg-emerald-950/60 border border-emerald-500/40 p-3 rounded-xl flex items-center gap-2 shadow-inner">
                <Check size={16} className="text-emerald-400 shrink-0" />
                <span>
                  {totalDefenses > 0
                    ? fmtTemplate(t.cwl.detailDefClean, {
                        count: fmtNum(totalDefenses),
                      })
                    : isTr
                    ? "Bu oyuncunun ranked savunma geçmişinde 3 yıldız yediği bir saldırı kaydı bulunmuyor."
                    : "No 3-star defenses found in recent ranked history."}
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {totalDefenses > 0 && (
                  <p className="text-xs font-medium text-amber-200/80 tabular-nums">
                    {fmtTemplate(t.cwl.detailDefSummary, {
                      total: fmtNum(totalDefenses),
                      hits: fmtNum(threeStarDefCount),
                    })}
                  </p>
                )}

                {player.threeStarDefenses.map((def, dIdx) => (
                  <div
                    key={`def-${dIdx}`}
                    className="p-3.5 rounded-xl bg-[#241710] border-2 border-[#3D2517] space-y-2.5 text-xs shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3D2517] pb-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-200 font-bold text-xs border border-rose-600/50 tabular-nums">
                          {fmtPct(def.destructionPercentage ?? 100, 0)} (3★)
                        </span>
                        <span className="font-bold text-sm text-white">
                          {cleanDisplayName(def.armyName, isTr)}
                        </span>
                        <span className="text-xs text-amber-200/75">
                          ({t.cwl.attackerLabel}{" "}
                          <strong className="text-white font-semibold">
                            {cleanDisplayName(def.opponentName, isTr)}
                          </strong>{" "}
                          • {t.common.thShort}
                          {def.opponentTownHallLevel || "?"})
                        </span>
                      </div>
                      {def.armyLink && (
                        <GameButton
                          variant="green"
                          size="sm"
                          href={def.armyLink}
                          target="_blank"
                          icon={<ExternalLink size={12} />}
                          className="min-h-[38px] px-3 text-xs"
                          title={t.meta.copyTooltip}
                        >
                          {t.meta.copyArmy}
                        </GameButton>
                      )}
                    </div>

                    {def.troops && def.troops.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-amber-200/80">
                          {isTr
                            ? "Kullanılan Birlikler & Büyüler:"
                            : "Troops & Spells Used:"}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {def.troops.map((u, uIdx) => (
                            <span
                              key={`tu-${uIdx}`}
                              className="px-2 py-0.5 rounded-md bg-[#180E09] border border-[#3A2216] text-xs font-medium text-stone-200 tabular-nums"
                            >
                              {u.count}× {cleanDisplayName(u.name, isTr)}
                            </span>
                          ))}
                          {def.spells &&
                            def.spells.map((s, sIdx) => (
                              <span
                                key={`ts-${sIdx}`}
                                className="px-2 py-0.5 rounded-md bg-[#162D30] border border-teal-500/45 text-xs font-medium text-teal-200 tabular-nums"
                              >
                                {s.count}× {cleanDisplayName(s.name, isTr)}
                              </span>
                            ))}
                          {def.siegeMachines &&
                            def.siegeMachines.map((sg, sgIdx) => (
                              <span
                                key={`tsg-${sgIdx}`}
                                className="px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/45 text-xs font-medium text-amber-200"
                              >
                                {cleanDisplayName(sg.name, isTr)}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function ScoutedArmyCard({
  initialClanTag,
}: {
  initialClanTag?: string;
}) {
  const { isTr, t, fmtNum, fmtPct, fmtTemplate, getApiErrorMessage } =
    useLanguage();

  const [clanTagInput, setClanTagInput] = useState(initialClanTag || "#2PP");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [report, setReport] = useState<CwlScoutReport | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"single" | "all">("single");
  const [copiedRowIdx, setCopiedRowIdx] = useState<number | null>(null);
  const [copiedOtherCode, setCopiedOtherCode] = useState<string | null>(null);
  const [rosterFilter, setRosterFilter] = useState<"cwl" | "all">("cwl");
  const [expandedRowTags, setExpandedRowTags] = useState<Set<string>>(
    new Set()
  );

  // Round / Battle Day Switcher State & Ref Cache
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const cacheRef = useRef<Record<string, CwlScoutReport>>({});
  const rosterSectionRef = useRef<HTMLDivElement | null>(null);
  const detailSectionRef = useRef<HTMLDivElement | null>(null);

  const updateUrl = (tag: string, round?: number | null) => {
    if (typeof window === "undefined") return;
    const clean = tag.trim().replace(/^#/, "");
    if (!clean || !window.location.hash.startsWith("#/cwl")) return;
    const base = `#/cwl?clan=${encodeURIComponent(clean)}`;
    const finalHash = round ? `${base}&round=${round}` : base;
    if (window.location.hash !== finalHash) {
      window.history.replaceState(null, "", finalHash);
    }
  };

  const handleScoutClan = useCallback(
    async (
      tagToFetch: string,
      forceRefresh = false,
      filterOverride?: "cwl" | "all",
      roundOverride?: number | null
    ) => {
      const clean = tagToFetch.trim().replace(/^#/, "");
      if (!clean) return;
      const targetFilter =
        filterOverride !== undefined ? filterOverride : rosterFilter;
      const targetRound =
        roundOverride !== undefined ? roundOverride : selectedRound;

      const cacheKey = `${clean}_r${targetRound || "def"}_${targetFilter}`;
      if (!forceRefresh && cacheRef.current[cacheKey]) {
        const cached = cacheRef.current[cacheKey];
        setReport(cached);
        setSelectedRound(cached.roundNumber || targetRound || null);
        updateUrl(clean, cached.roundNumber || targetRound);
        setSelectedIndex(0);
        setStatusMsg(null);
        return;
      }

      setLoading(true);
      setStatusMsg(null);
      try {
        let path = `/api/v1/cwl/scout/${encodeURIComponent(
          clean
        )}?force_refresh=${forceRefresh}&roster_filter=${targetFilter}`;
        if (targetRound) {
          path += `&round=${targetRound}`;
        }
        const body = await safeFetchJson<CwlScoutReport>(path);
        setReport(body);
        cacheRef.current[cacheKey] = body;
        const activeR = body.roundNumber || targetRound || null;
        setSelectedRound(activeR);
        updateUrl(clean, activeR);
        setSelectedIndex(0);

        if (!body.opponents || body.opponents.length === 0) {
          if (body.status === "unrevealed") {
            setStatusMsg(
              isTr
                ? "Sonraki tur rakibi henüz belli değil."
                : "Next round opponent has not been revealed yet."
            );
          } else {
            setStatusMsg(fmtTemplate(t.cwl.noRosterFound, { tag: clean }));
          }
        }
      } catch (err: unknown) {
        setStatusMsg(getApiErrorMessage(err));
        setReport(null);
      } finally {
        setLoading(false);
      }
    },
    [rosterFilter, selectedRound, isTr, t, fmtTemplate, getApiErrorMessage]
  );

  useEffect(() => {
    let initialTag = initialClanTag || "#2PP";
    let initialRound: number | null = null;
    if (
      typeof window !== "undefined" &&
      window.location.hash.includes("#/cwl")
    ) {
      const parts = window.location.hash.split("?");
      if (parts[1]) {
        const params = new URLSearchParams(parts[1]);
        const clanParam = params.get("clan");
        const roundParam = params.get("round");
        if (clanParam)
          initialTag = clanParam.startsWith("#") ? clanParam : `#${clanParam}`;
        if (roundParam) {
          const parsed = parseInt(roundParam, 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 7) {
            initialRound = parsed;
          }
        }
      }
    }
    setClanTagInput(initialTag);
    setSelectedRound(initialRound);
    handleScoutClan(initialTag, false, "cwl", initialRound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClanTag]);

  const handleFilterChange = (newFilter: "cwl" | "all") => {
    if (newFilter === rosterFilter) return;
    setRosterFilter(newFilter);
    handleScoutClan(clanTagInput, false, newFilter, selectedRound);
  };

  const toggleRowExpanded = (playerTag: string) => {
    setExpandedRowTags((prev) => {
      const next = new Set(prev);
      if (next.has(playerTag)) {
        next.delete(playerTag);
      } else {
        next.add(playerTag);
      }
      return next;
    });
  };

  const opponents = report?.opponents || [];

  const sortedOpponents = useMemo(() => {
    return [...opponents].sort((a, b) => {
      const aCwl = Boolean(a.isCwl);
      const bCwl = Boolean(b.isCwl);
      if (aCwl !== bCwl) {
        return aCwl ? -1 : 1;
      }
      const aPos = a.mapPosition ?? 999;
      const bPos = b.mapPosition ?? 999;
      return aPos - bPos;
    });
  }, [opponents]);

  const cwlCount =
    report?.cwlCount ??
    (opponents.some((o) => o.isCwl !== undefined)
      ? opponents.filter((o) => o.isCwl).length
      : 15);
  const allCount = report?.allCount ?? opponents.length;

  const activePlayer: ScoutData | null =
    sortedOpponents[selectedIndex] || sortedOpponents[0] || null;

  const selectPlayerAndScroll = (idx: number) => {
    setSelectedIndex(idx);
    setViewMode("single");
    requestAnimationFrame(() => {
      detailSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const scrollBackToRoster = () => {
    rosterSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleCopyRowCode = async (
    e: React.MouseEvent,
    code: string,
    idx: number
  ) => {
    e.stopPropagation();
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopiedRowIdx(idx);
      setTimeout(() => setCopiedRowIdx(null), 2000);
    }
  };

  const handleCopyCustomCode = async (
    e: React.MouseEvent,
    code: string
  ) => {
    e.stopPropagation();
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopiedOtherCode(code);
      setTimeout(() => setCopiedOtherCode(null), 2000);
    }
  };

  const inWarRound = report?.roundsSummary?.find(
    (r) => r.state.toLowerCase() === "inwar"
  );
  const prepRound = report?.roundsSummary?.find(
    (r) => r.state.toLowerCase() === "preparation"
  );

  return (
    <div className="game-theme w-full space-y-6 font-sans">
      {/* Top CWL Clan Tag Search & Roster Control Bar */}
      <div
        ref={rosterSectionRef}
        className="game-panel-wood rounded-2xl border-4 border-[#2C180E] p-3.5 sm:p-6 shadow-2xl space-y-4 scroll-mt-16 lg:scroll-mt-4"
      >
        {/* Panel Header Strip */}
        <div className="game-panel-header -mx-3.5 -mt-3.5 sm:-mx-6 sm:-mt-6 mb-2 px-4 py-3 sm:px-6 sm:py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Swords className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 drop-shadow shrink-0" />
            <h1 className="game-text-stroke-gold text-lg sm:text-2xl font-black tracking-wide truncate">
              {t.cwl.title}
            </h1>
          </div>
          {report && (
            <StatPill
              icon={<Shield size={13} className="text-amber-400" />}
              value={fmtTemplate(t.cwl.roundLabel, {
                round: report.roundNumber || 1,
              })}
              variant="amber"
            />
          )}
        </div>

        {/* Search Input and Action Buttons */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            <div className="flex-1 min-w-0">
              <GameInput
                prefixTag="#"
                value={clanTagInput.replace(/^#/, "")}
                onChange={(e) =>
                  setClanTagInput(`#${e.target.value.replace(/^#/, "")}`)
                }
                onKeyDown={(e) =>
                  e.key === "Enter" && handleScoutClan(clanTagInput, false)
                }
                placeholder={t.cwl.searchPlaceholder}
                aria-label={t.cwl.searchPlaceholder}
                containerClassName="w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <GameButton
                variant="green"
                size="md"
                onClick={() => handleScoutClan(clanTagInput, false)}
                disabled={loading}
                icon={<Swords size={16} />}
                className="min-h-[44px] flex-1 sm:flex-initial px-4 text-xs sm:text-sm"
              >
                {loading ? t.cwl.scanning : t.cwl.scanBtn}
              </GameButton>

              <GameButton
                variant="blue"
                size="sm"
                onClick={() => handleScoutClan(clanTagInput, true)}
                disabled={loading}
                icon={
                  <RefreshCw
                    size={15}
                    className={cn(loading && "animate-spin")}
                  />
                }
                className="min-h-[44px] px-3.5 text-xs sm:text-sm shrink-0"
                title={t.cwl.refreshLive}
                aria-label={t.cwl.refreshLive}
              >
                {t.cwl.refreshLive}
              </GameButton>
            </div>
          </div>

          {/* View Toggle: Selected Player vs Full Roster */}
          <div className="grid grid-cols-2 sm:inline-flex p-1 rounded-xl bg-[#1A100A] border-2 border-[#3D2517] gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("single")}
              className={cn(
                "min-h-[44px] px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                viewMode === "single"
                  ? "bg-gradient-to-b from-[#F5EBD8] to-[#D8AF86] text-[#261810] border border-[#543621] shadow-sm"
                  : "text-amber-100/80 hover:text-white hover:bg-[#2B1F16]"
              )}
            >
              <User size={14} className="shrink-0" />
              <span className="truncate">{t.cwl.viewSelected}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={cn(
                "min-h-[44px] px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer tabular-nums",
                viewMode === "all"
                  ? "bg-gradient-to-b from-[#F5EBD8] to-[#D8AF86] text-[#261810] border border-[#543621] shadow-sm"
                  : "text-amber-100/80 hover:text-white hover:bg-[#2B1F16]"
              )}
            >
              <LayoutGrid size={14} className="shrink-0" />
              <span className="truncate">
                {fmtTemplate(t.cwl.viewAll, {
                  count: fmtNum(sortedOpponents.length),
                })}
              </span>
            </button>
          </div>
        </div>

        {/* Round / Battle Day Switcher Bar */}
        {report && report.roundsSummary && report.roundsSummary.length > 0 && (
          <div className="pt-3 border-t-2 border-[#3D2517] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
              <button
                type="button"
                disabled={!inWarRound || loading}
                onClick={() => {
                  if (inWarRound) {
                    handleScoutClan(
                      clanTagInput,
                      false,
                      rosterFilter,
                      inWarRound.roundNumber
                    );
                  }
                }}
                className={cn(
                  "game-btn min-h-[44px] text-xs px-3.5 py-2 text-left sm:text-center",
                  inWarRound && report.roundNumber === inWarRound.roundNumber
                    ? "game-btn-green"
                    : inWarRound
                    ? "game-btn-gold opacity-90 hover:opacity-100"
                    : "game-btn-silver opacity-45 cursor-not-allowed"
                )}
              >
                <Swords size={14} className="shrink-0 text-amber-200" />
                <span className="truncate">
                  {inWarRound
                    ? fmtTemplate(t.cwl.warDayActive, {
                        round: inWarRound.roundNumber,
                        vs: cleanClanDisplayName(
                          inWarRound.opponentClan?.name,
                          isTr
                        ),
                      })
                    : t.cwl.warDayNone}
                </span>
              </button>

              <button
                type="button"
                disabled={!prepRound || loading}
                onClick={() => {
                  if (prepRound) {
                    handleScoutClan(
                      clanTagInput,
                      false,
                      rosterFilter,
                      prepRound.roundNumber
                    );
                  }
                }}
                className={cn(
                  "game-btn min-h-[44px] text-xs px-3.5 py-2 text-left sm:text-center",
                  prepRound && report.roundNumber === prepRound.roundNumber
                    ? "game-btn-blue"
                    : prepRound
                    ? "game-btn-silver opacity-90 hover:opacity-100"
                    : "game-btn-silver opacity-45 cursor-not-allowed"
                )}
              >
                <Shield size={14} className="shrink-0 text-teal-200" />
                <span className="truncate">
                  {prepRound
                    ? fmtTemplate(t.cwl.prepDayActive, {
                        round: prepRound.roundNumber,
                        vs: cleanClanDisplayName(
                          prepRound.opponentClan?.name,
                          isTr
                        ),
                      })
                    : t.cwl.prepDayWait}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
              <label
                htmlFor="cwl-round-select"
                className="text-xs sm:text-sm font-semibold text-amber-200/90 shrink-0"
              >
                {t.cwl.roundSelect}
              </label>
              <select
                id="cwl-round-select"
                value={report.roundNumber || 1}
                onChange={(e) => {
                  const rNum = parseInt(e.target.value, 10);
                  if (rNum) {
                    handleScoutClan(clanTagInput, false, rosterFilter, rNum);
                  }
                }}
                disabled={loading}
                className="min-h-[44px] max-w-full px-3 py-1.5 rounded-xl bg-[#241710] border-2 border-[#543621] text-xs font-semibold text-amber-100 cursor-pointer focus:outline-none focus:border-amber-400 tabular-nums"
              >
                {report.roundsSummary.map((r) => {
                  const oppName = r.opponentClan?.name
                    ? `vs ${cleanClanDisplayName(r.opponentClan.name, isTr)} `
                    : "";
                  const stateLbl = localizeWarState(r.state, t, isTr);
                  return (
                    <option
                      key={r.roundNumber}
                      value={r.roundNumber}
                      disabled={r.state === "unrevealed"}
                      className="bg-[#241710] text-stone-100"
                    >
                      {fmtTemplate(t.cwl.roundLabel, { round: r.roundNumber })}:{" "}
                      {oppName}({stateLbl})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        )}

        {/* Preparation Day Banner */}
        {report?.isPreparationDay && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#3E2B1E] via-[#4A2E1E] to-[#3E2B1E] border-2 border-amber-500/50 flex items-center gap-3 text-xs sm:text-sm font-medium text-amber-100 shadow-md">
            <Shield size={20} className="text-amber-400 shrink-0" />
            <span>{t.cwl.prepNotice}</span>
          </div>
        )}

        {statusMsg && (
          <div className="p-3.5 rounded-xl bg-red-950/75 border-2 border-red-600/50 text-xs sm:text-sm font-medium text-red-100 shadow-md flex items-center gap-2.5">
            <AlertCircle size={17} className="text-red-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Filter Buttons & Clan Info Bar + Roster List (in Single mode) */}
        {((report && sortedOpponents.length > 0) || loading) && (
          <div className="pt-3 border-t-2 border-[#3D2517] space-y-4">
            {/* Filter Buttons & Clan Info Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFilterChange("cwl")}
                  disabled={loading}
                  className={cn(
                    "game-btn min-h-[44px] text-xs px-3 py-2",
                    rosterFilter === "cwl" ? "game-btn-gold" : "game-btn-silver"
                  )}
                >
                  <Swords size={13} className="shrink-0" />
                  <span className="whitespace-nowrap tabular-nums">
                    {fmtTemplate(t.cwl.rosterTabCwl, {
                      count: fmtNum(cwlCount),
                    })}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange("all")}
                  disabled={loading}
                  className={cn(
                    "game-btn min-h-[44px] text-xs px-3 py-2",
                    rosterFilter === "all" ? "game-btn-gold" : "game-btn-silver"
                  )}
                >
                  <Users size={13} className="shrink-0" />
                  <span className="whitespace-nowrap tabular-nums">
                    {fmtTemplate(t.cwl.rosterTabMembers, {
                      count: fmtNum(allCount),
                    })}
                  </span>
                </button>
              </div>

              {report && (
                <div className="text-xs sm:text-sm font-medium text-amber-100/90 tabular-nums">
                  {fmtTemplate(t.cwl.clanStatusLine, {
                    name: cleanClanDisplayName(
                      report.opponentClan?.name ||
                        report.clanName ||
                        clanTagInput,
                      isTr
                    ),
                    tag: (
                      report.opponentClan?.tag ||
                      report.clanTag ||
                      clanTagInput
                    ).replace(/^#/, ""),
                    status: localizeWarState(report.warState, t, isTr),
                  })}
                </div>
              )}
            </div>

            {/* Roster Table (Desktop) & Stacked Cards (Mobile) — shown when viewMode === "single" */}
            {viewMode === "single" && (
              <>
                {/* Prompt banner */}
                {!loading && sortedOpponents.length > 0 && (
                  <div className="px-3.5 py-2 rounded-xl bg-[#241710] border border-[#4A3223] text-xs text-amber-200/85 flex items-center justify-between gap-2">
                    <span>{t.cwl.selectPrompt}</span>
                    {activePlayer && (
                      <button
                        type="button"
                        onClick={() => selectPlayerAndScroll(selectedIndex)}
                        className="text-xs font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2 shrink-0 cursor-pointer"
                      >
                        #{activePlayer.mapPosition || selectedIndex + 1}{" "}
                        {activePlayer.opponentName}
                      </button>
                    )}
                  </div>
                )}

                {/* MOBILE: Stacked Player Cards (< md) */}
                <div className="md:hidden space-y-2.5">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, sIdx) => (
                      <div
                        key={`m-skel-${sIdx}`}
                        className="animate-pulse rounded-xl bg-[#241710] border-2 border-[#3D2517] p-3 space-y-2.5 min-h-[84px]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded bg-[#3D2517]" />
                            <div className="w-7 h-7 rounded bg-[#3D2517]" />
                            <div className="h-4 w-28 rounded bg-[#3D2517]" />
                          </div>
                          <div className="h-6 w-16 rounded bg-[#3D2517]" />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="h-4 w-36 rounded bg-[#3D2517]" />
                          <div className="w-11 h-11 rounded-xl bg-[#3D2517]" />
                        </div>
                      </div>
                    ))
                  ) : sortedOpponents.length === 0 ? (
                    <div className="p-6 text-center text-xs font-medium text-stone-300 bg-[#241710] rounded-xl border border-[#3D2517]">
                      {isTr
                        ? "Kadroda gösterilecek oyuncu bulunamadı."
                        : "No players found in roster."}
                    </div>
                  ) : (
                    sortedOpponents.map((opp, idx) => {
                      const detected = Boolean(
                        opp.armyDetected && (opp.armyShareCode || "").trim()
                      );
                      const rowCode = (opp.armyShareCode || "").trim();
                      const rowCopyUrl = detected
                        ? buildCopyArmyLink(rowCode)
                        : "";
                      const isSelected = idx === selectedIndex;
                      const isRowExpanded = Boolean(
                        opp.playerTag && expandedRowTags.has(opp.playerTag)
                      );
                      const recentArmies = opp.recentArmies || [];
                      const hasMultipleArmies = recentArmies.length >= 2;
                      const primaryOpt = recentArmies[0] || null;
                      const srcInfo = localizeSourceBadge(
                        opp.armySource,
                        opp.sourceBadge,
                        isTr
                      );
                      const statsTxt = localizeArmyStats(
                        primaryOpt,
                        opp.armySummary,
                        opp.armySourceLabel,
                        isTr,
                        fmtNum
                      );
                      const failInfo = normalizeFailureStatus(
                        opp.failureReason,
                        isTr,
                        t
                      );

                      return (
                        <div
                          key={opp.playerTag || idx}
                          onClick={() => selectPlayerAndScroll(idx)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              selectPlayerAndScroll(idx);
                            }
                          }}
                          className={cn(
                            "rounded-xl border-2 p-3 space-y-2.5 min-h-[56px] transition-colors cursor-pointer",
                            isSelected
                              ? "bg-[#3E2B1E] border-amber-400 shadow-md"
                              : "bg-[#241710] border-[#3D2517] hover:border-[#5C3A24]",
                            !detected && "opacity-85"
                          )}
                        >
                          {/* Top Row: Rank # + TH Badge + Full Player Name + Defense 3★ Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-md bg-[#180E09] border border-[#4A3223] text-xs font-bold text-amber-300 tabular-nums shrink-0">
                                #{opp.mapPosition || idx + 1}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <TownHallImage
                                  level={opp.townHallLevel}
                                  size={28}
                                />
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-[11px] font-bold text-amber-200 tabular-nums">
                                  {t.common.thShort}
                                  {opp.townHallLevel}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-white leading-snug break-words">
                                  {opp.opponentName}
                                </div>
                                {opp.isCwl && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                                    <Swords size={10} /> CWL
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0">
                              {opp.threeStarDefenseCount &&
                              opp.threeStarDefenseCount > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-rose-950/80 text-rose-200 border border-rose-500/50 tabular-nums">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                  {fmtTemplate(t.cwl.hitsTaken, {
                                    count: fmtNum(opp.threeStarDefenseCount),
                                  })}
                                </span>
                              ) : opp.totalRankedDefenses &&
                                opp.totalRankedDefenses > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-950/75 text-emerald-200 border border-emerald-500/45 tabular-nums">
                                  <Shield size={11} />
                                  0× 3★
                                </span>
                              ) : (
                                <span className="text-xs text-stone-400 font-semibold px-1">
                                  —
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Second Row: Featured Army Summary + Key Troop Icons + Detail Chevron */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#3D2517]/70">
                            <div className="min-w-0 flex-1 space-y-1.5">
                              {detected ? (
                                <>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-bold text-amber-200 leading-snug">
                                      {cleanDisplayName(
                                        opp.armyName || opp.inferredArchetype,
                                        isTr
                                      )}
                                    </span>
                                    <span
                                      className={cn(
                                        "px-1.5 py-0.5 rounded text-[11px] font-semibold border",
                                        srcInfo.isRanked
                                          ? "bg-[#163336] text-teal-200 border-teal-500/45"
                                          : "bg-amber-950/75 text-amber-200 border-amber-500/45"
                                      )}
                                    >
                                      {srcInfo.label}
                                    </span>
                                    {statsTxt.summary && (
                                      <span className="text-xs text-stone-300 tabular-nums">
                                        {statsTxt.summary}
                                      </span>
                                    )}
                                  </div>

                                  {opp.troops && opp.troops.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1">
                                      {opp.troops.slice(0, 4).map((tr, tIdx) => (
                                        <IconFrame
                                          key={`${tr.id}-${tIdx}`}
                                          name={cleanDisplayName(tr.name, isTr)}
                                          count={tr.count}
                                          size="xs"
                                        />
                                      ))}
                                      {opp.troops.length > 4 && (
                                        <span className="px-1.5 py-0.5 rounded bg-[#180E09] border border-[#4A3223] text-xs font-semibold text-amber-300 tabular-nums">
                                          +{opp.troops.length - 4}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-stone-400 italic">
                                  {failInfo.badge}
                                </span>
                              )}
                            </div>

                            <div
                              className="flex items-center gap-1.5 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {detected && rowCopyUrl && (
                                <GameButton
                                  variant="green"
                                  size="sm"
                                  href={rowCopyUrl}
                                  target="_blank"
                                  icon={<ExternalLink size={15} />}
                                  className="min-h-[44px] min-w-[44px] px-2.5"
                                  title={t.meta.copyTooltip}
                                  aria-label={t.meta.copyArmy}
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => selectPlayerAndScroll(idx)}
                                className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl bg-[#3A2517] hover:bg-[#4A2E1E] border border-[#614029] text-amber-200 inline-flex items-center justify-center cursor-pointer"
                                aria-label={
                                  isTr
                                    ? `${opp.opponentName} detayını gör`
                                    : `Inspect ${opp.opponentName}`
                                }
                              >
                                <ChevronRight size={18} />
                              </button>
                            </div>
                          </div>

                          {/* Optional Alternate Armies Toggle on Mobile */}
                          {hasMultipleArmies && (
                            <div
                              className="pt-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  if (opp.playerTag)
                                    toggleRowExpanded(opp.playerTag);
                                }}
                                className="w-full min-h-[44px] px-3 rounded-lg bg-[#1A100A] hover:bg-[#2B1B11] border border-[#4A3223] text-xs font-semibold text-amber-200 flex items-center justify-between cursor-pointer"
                              >
                                <span>
                                  {isRowExpanded
                                    ? t.cwl.hideMoreArmies
                                    : fmtTemplate(t.cwl.showMoreArmies, {
                                        count: fmtNum(recentArmies.length - 1),
                                      })}
                                </span>
                                <ChevronDown
                                  size={14}
                                  className={cn(
                                    "transition-transform duration-200",
                                    isRowExpanded && "rotate-180"
                                  )}
                                />
                              </button>

                              {isRowExpanded && (
                                <div className="mt-2 space-y-2">
                                  {recentArmies.slice(1).map((altArmy, altIdx) => {
                                    const altCode = (
                                      altArmy.armyShareCode || ""
                                    ).trim();
                                    const altLink = altCode
                                      ? buildCopyArmyLink(altCode)
                                      : "";
                                    const altSrc = localizeSourceBadge(
                                      altArmy.source,
                                      altArmy.sourceBadge,
                                      isTr
                                    );
                                    const altStats = localizeArmyStats(
                                      altArmy,
                                      altArmy.summary,
                                      altArmy.sourceLabel,
                                      isTr,
                                      fmtNum
                                    );
                                    return (
                                      <div
                                        key={altIdx}
                                        className="p-2.5 rounded-lg bg-[#180E09] border border-[#3A2216] space-y-2"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="min-w-0">
                                            <div className="text-xs font-bold text-white truncate">
                                              {cleanDisplayName(
                                                altArmy.armyName,
                                                isTr
                                              )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                              <span
                                                className={cn(
                                                  "px-1.5 py-0.5 rounded text-[11px] font-semibold border",
                                                  altSrc.isRanked
                                                    ? "bg-[#163336] text-teal-200 border-teal-500/45"
                                                    : "bg-amber-950/75 text-amber-200 border-amber-500/45"
                                                )}
                                              >
                                                {altSrc.label}
                                              </span>
                                              {altStats.summary && (
                                                <span className="text-xs text-stone-300 tabular-nums">
                                                  {altStats.summary}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          {altLink && (
                                            <GameButton
                                              variant="green"
                                              size="sm"
                                              href={altLink}
                                              target="_blank"
                                              icon={<ExternalLink size={14} />}
                                              className="min-h-[44px] min-w-[44px] px-2.5 shrink-0"
                                              aria-label={t.meta.copyArmy}
                                            />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* DESKTOP: Full-Width Clean Roster Table (hidden md:block, zero min-w overflow) */}
                <div className="hidden md:block rounded-xl border-2 border-[#2C180E] shadow-inner bg-[#1F140D] overflow-hidden">
                  <table className="w-full table-fixed text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-[#3A2216] border-b-2 border-[#201008] text-amber-200/95 font-bold tracking-wide uppercase text-xs">
                        <th className="py-3 px-2.5 w-[6%] text-center">
                          {t.cwl.colRank}
                        </th>
                        <th className="py-3 px-3 w-[23%]">
                          {t.cwl.colPlayer} • {t.cwl.colTh}
                        </th>
                        <th className="py-3 px-3 w-[24%]">
                          {t.cwl.colAttack}
                        </th>
                        <th className="py-3 px-3 w-[20%]">
                          {t.cwl.colTroops}
                        </th>
                        <th className="py-3 px-3 w-[15%]">
                          {t.cwl.colDefense}
                        </th>
                        <th className="py-3 px-3 w-[12%] text-right">
                          {t.cwl.colAction}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3D2517]/50 text-stone-200">
                      {loading ? (
                        Array.from({ length: 6 }).map((_, sIdx) => (
                          <tr
                            key={`skeleton-${sIdx}`}
                            className="animate-pulse border-b border-[#3D2517]/40 bg-[#25170F]"
                          >
                            <td className="py-3.5 px-2.5">
                              <div className="h-5 w-7 bg-[#3D2517] rounded mx-auto" />
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="h-4 w-3/4 bg-[#3D2517] rounded mb-1.5" />
                              <div className="h-3 w-1/2 bg-[#3D2517]/60 rounded" />
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="h-4 w-4/5 bg-[#3D2517] rounded mb-1.5" />
                              <div className="h-3 w-1/2 bg-[#3D2517]/60 rounded" />
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="h-7 w-28 bg-[#3D2517] rounded" />
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="h-5 w-24 bg-[#3D2517] rounded" />
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <div className="h-7 w-20 bg-[#3D2517] rounded ml-auto" />
                            </td>
                          </tr>
                        ))
                      ) : sortedOpponents.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-8 text-center text-xs sm:text-sm font-medium text-stone-300"
                          >
                            {isTr
                              ? "Kadroda gösterilecek oyuncu bulunamadı."
                              : "No players found in roster."}
                          </td>
                        </tr>
                      ) : (
                        sortedOpponents.map((opp, idx) => {
                          const detected = Boolean(
                            opp.armyDetected &&
                              (opp.armyShareCode || "").trim()
                          );
                          const rowCode = (opp.armyShareCode || "").trim();
                          const rowCopyUrl = detected
                            ? buildCopyArmyLink(rowCode)
                            : "";
                          const isRowExpanded = Boolean(
                            opp.playerTag && expandedRowTags.has(opp.playerTag)
                          );
                          const recentArmies = opp.recentArmies || [];
                          const hasMultipleArmies = recentArmies.length >= 2;
                          const primaryOpt = recentArmies[0] || null;
                          const srcInfo = localizeSourceBadge(
                            opp.armySource,
                            opp.sourceBadge,
                            isTr
                          );
                          const statsTxt = localizeArmyStats(
                            primaryOpt,
                            opp.armySummary,
                            opp.armySourceLabel,
                            isTr,
                            fmtNum
                          );
                          const warnTxt = localizeWarning(opp.warning, isTr);
                          const failInfo = normalizeFailureStatus(
                            opp.failureReason,
                            isTr,
                            t
                          );
                          const isSelected = idx === selectedIndex;

                          return (
                            <React.Fragment key={opp.playerTag || idx}>
                              <tr
                                onClick={() => selectPlayerAndScroll(idx)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    selectPlayerAndScroll(idx);
                                  }
                                }}
                                tabIndex={0}
                                role="button"
                                aria-pressed={isSelected}
                                className={cn(
                                  "cursor-pointer transition-colors border-b border-[#3D2517]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset",
                                  idx % 2 === 0
                                    ? "bg-[#2A1B12]/85"
                                    : "bg-[#23150D]/90",
                                  "hover:bg-[#3D281B]",
                                  isSelected &&
                                    "bg-[#452D1A] border-l-4 border-l-amber-400",
                                  !detected && "opacity-75"
                                )}
                              >
                                <td className="py-3 px-2 text-center align-middle">
                                  <span className="inline-flex items-center justify-center min-w-[30px] h-7 px-1.5 rounded-md bg-[#180E09] border border-[#4A3223] font-bold text-amber-300 text-xs tabular-nums">
                                    #{opp.mapPosition || idx + 1}
                                  </span>
                                </td>

                                <td className="py-3 px-3 align-middle">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="flex flex-col items-center shrink-0">
                                      <TownHallImage
                                        level={opp.townHallLevel}
                                        size={32}
                                      />
                                      <span className="text-[11px] font-bold text-amber-300 -mt-1 tabular-nums">
                                        {t.common.thShort}
                                        {opp.townHallLevel}
                                      </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span
                                          className="font-bold text-white text-sm truncate"
                                          title={opp.opponentName}
                                        >
                                          {opp.opponentName}
                                        </span>
                                        {opp.isCwl && (
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold shrink-0">
                                            CWL
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-amber-200/65 tabular-nums truncate">
                                        {opp.playerTag}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-3 align-middle">
                                  {detected ? (
                                    <div className="space-y-1 min-w-0">
                                      <div
                                        className="font-bold text-amber-200 text-[13px] truncate"
                                        title={cleanDisplayName(
                                          opp.armyName || opp.inferredArchetype,
                                          isTr
                                        )}
                                      >
                                        {cleanDisplayName(
                                          opp.armyName || opp.inferredArchetype,
                                          isTr
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                        <span
                                          className={cn(
                                            "px-1.5 py-0.5 rounded text-[11px] font-semibold border",
                                            srcInfo.isRanked
                                              ? "bg-[#163336] text-teal-200 border-teal-500/45"
                                              : "bg-amber-950/75 text-amber-200 border-amber-500/45"
                                          )}
                                        >
                                          {srcInfo.label}
                                        </span>
                                        {warnTxt && (
                                          <span className="px-1.5 py-0.5 rounded text-[11px] bg-amber-950/80 text-amber-200 border border-amber-500/35">
                                            {warnTxt}
                                          </span>
                                        )}
                                        {statsTxt.summary && (
                                          <span className="text-xs text-amber-200/80 tabular-nums">
                                            {statsTxt.summary}
                                          </span>
                                        )}
                                      </div>
                                      {hasMultipleArmies && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (opp.playerTag)
                                              toggleRowExpanded(opp.playerTag);
                                          }}
                                          className="mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#180E09] hover:bg-[#2F1D13] border border-[#4A3223] text-xs font-semibold text-amber-300 transition-colors cursor-pointer"
                                        >
                                          <span>
                                            {isRowExpanded
                                              ? t.cwl.hideMoreArmies
                                              : fmtTemplate(
                                                  t.cwl.showMoreArmies,
                                                  {
                                                    count: fmtNum(
                                                      recentArmies.length - 1
                                                    ),
                                                  }
                                                )}
                                          </span>
                                          <ChevronDown
                                            size={12}
                                            className={cn(
                                              "transition-transform duration-200",
                                              isRowExpanded && "rotate-180"
                                            )}
                                          />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs font-medium text-stone-400 italic">
                                      {failInfo.badge}
                                    </span>
                                  )}
                                </td>

                                <td className="py-3 px-3 align-middle">
                                  {detected &&
                                  opp.troops &&
                                  opp.troops.length > 0 ? (
                                    <div className="flex flex-wrap items-center gap-1">
                                      {opp.troops.slice(0, 4).map((tr, tIdx) => (
                                        <IconFrame
                                          key={`${tr.id}-${tIdx}`}
                                          name={cleanDisplayName(tr.name, isTr)}
                                          count={tr.count}
                                          size="xs"
                                        />
                                      ))}
                                      {opp.troops.length > 4 && (
                                        <span className="px-1.5 py-0.5 rounded bg-[#180E09] border border-[#4A3223] text-xs text-amber-300 font-bold tabular-nums">
                                          +{opp.troops.length - 4}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-stone-400">
                                      —
                                    </span>
                                  )}
                                </td>

                                <td className="py-3 px-3 align-middle">
                                  {opp.threeStarDefenseCount &&
                                  opp.threeStarDefenseCount > 0 ? (
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-rose-950/80 text-rose-200 border border-rose-600/50 w-fit tabular-nums">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                        {fmtTemplate(t.cwl.hitsTaken, {
                                          count: fmtNum(
                                            opp.threeStarDefenseCount
                                          ),
                                        })}
                                      </span>
                                      {opp.primaryDefenseArmy && (
                                        <span
                                          className="text-xs text-amber-200/75 truncate"
                                          title={cleanDisplayName(
                                            opp.primaryDefenseArmy,
                                            isTr
                                          )}
                                        >
                                          {cleanDisplayName(
                                            opp.primaryDefenseArmy,
                                            isTr
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  ) : opp.totalRankedDefenses &&
                                    opp.totalRankedDefenses > 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-950/75 text-emerald-200 border border-emerald-500/40 w-fit tabular-nums">
                                      <Shield size={11} />
                                      {fmtTemplate(t.cwl.noHitsTaken, {
                                        count: fmtNum(opp.totalRankedDefenses),
                                      })}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-stone-400">
                                      —
                                    </span>
                                  )}
                                </td>

                                <td
                                  className="py-3 px-2.5 text-right align-middle"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="inline-flex items-center justify-end gap-1">
                                    {detected && rowCopyUrl && (
                                      <>
                                        <GameButton
                                          variant="green"
                                          size="sm"
                                          href={rowCopyUrl}
                                          target="_blank"
                                          icon={<ExternalLink size={13} />}
                                          className="min-h-[34px] px-2 text-xs"
                                          title={t.meta.copyTooltip}
                                          aria-label={t.meta.copyArmy}
                                        />
                                        <button
                                          type="button"
                                          onClick={(e) =>
                                            handleCopyRowCode(e, rowCode, idx)
                                          }
                                          className="min-h-[34px] min-w-[34px] p-1.5 rounded-lg bg-[#180E09] hover:bg-[#3A2517] border border-[#4A3223] text-stone-200 inline-flex items-center justify-center cursor-pointer"
                                          title={t.cwl.copyCode}
                                          aria-label={t.cwl.copyCode}
                                        >
                                          {copiedRowIdx === idx ? (
                                            <Check
                                              size={13}
                                              className="text-emerald-400"
                                            />
                                          ) : (
                                            <Copy size={13} />
                                          )}
                                        </button>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => selectPlayerAndScroll(idx)}
                                      className="min-h-[34px] min-w-[30px] p-1 rounded-lg text-amber-300 hover:bg-[#3A2517] inline-flex items-center justify-center cursor-pointer"
                                      title={
                                        isTr ? "Detayı incele" : "View details"
                                      }
                                      aria-label={
                                        isTr ? "Detayı incele" : "View details"
                                      }
                                    >
                                      <ChevronRight size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Accordion Row for Other Detected Armies */}
                              {isRowExpanded && hasMultipleArmies && (
                                <tr className="bg-[#1C120B]/95 border-b-2 border-[#3D2517]">
                                  <td colSpan={6} className="p-3 pl-8">
                                    <div className="bg-[#241710] rounded-xl border-2 border-[#3D2517] p-3.5 space-y-3 shadow-md">
                                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3D2517] pb-2 text-xs text-amber-200">
                                        <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                                          <Sparkles
                                            size={14}
                                            className="text-amber-400"
                                          />
                                          {opp.opponentName} •{" "}
                                          {fmtTemplate(
                                            t.cwl.detailOtherArmies,
                                            {
                                              count: fmtNum(
                                                recentArmies.length - 1
                                              ),
                                            }
                                          )}
                                        </span>
                                        <span className="text-xs text-amber-200/75 font-medium">
                                          {isTr
                                            ? "3★ Sayısı & Başarı Sıralaması"
                                            : "Ranked by 3★ Count & Rate"}
                                        </span>
                                      </div>

                                      <div className="space-y-2">
                                        {recentArmies
                                          .slice(1)
                                          .map((altArmy, altIdx) => {
                                            const altCode = (
                                              altArmy.armyShareCode || ""
                                            ).trim();
                                            const altLink = altCode
                                              ? buildCopyArmyLink(altCode)
                                              : "";
                                            const isCopied =
                                              copiedOtherCode === altCode;
                                            const altSrc = localizeSourceBadge(
                                              altArmy.source,
                                              altArmy.sourceBadge,
                                              isTr
                                            );
                                            const altStats = localizeArmyStats(
                                              altArmy,
                                              altArmy.summary,
                                              altArmy.sourceLabel,
                                              isTr,
                                              fmtNum
                                            );

                                            return (
                                              <div
                                                key={altIdx}
                                                className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2.5 rounded-lg bg-[#180E09] border border-[#3A2216]"
                                              >
                                                <div className="space-y-1.5 min-w-0">
                                                  <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs sm:text-sm font-bold text-white">
                                                      {cleanDisplayName(
                                                        altArmy.armyName,
                                                        isTr
                                                      )}
                                                    </span>
                                                    <span
                                                      className={cn(
                                                        "px-1.5 py-0.5 rounded text-[11px] font-semibold border",
                                                        altSrc.isRanked
                                                          ? "bg-[#163336] text-teal-200 border-teal-500/45"
                                                          : "bg-amber-950/75 text-amber-200 border-amber-500/45"
                                                      )}
                                                    >
                                                      {altSrc.label}
                                                    </span>
                                                    {altStats.summary && (
                                                      <span className="text-xs font-medium text-amber-200/80 tabular-nums">
                                                        {altStats.summary}
                                                      </span>
                                                    )}
                                                    {altArmy.avgDestruction !==
                                                      undefined &&
                                                      altArmy.avgDestruction >
                                                        0 && (
                                                        <span className="text-xs text-amber-200/75 tabular-nums">
                                                          •{" "}
                                                          {isTr ? "Ort." : "Avg"}{" "}
                                                          {fmtPct(
                                                            altArmy.avgDestruction,
                                                            0
                                                          )}
                                                        </span>
                                                      )}
                                                  </div>

                                                  {altArmy.troops &&
                                                    altArmy.troops.length >
                                                      0 && (
                                                      <div className="flex flex-wrap gap-1">
                                                        {altArmy.troops
                                                          .slice(0, 5)
                                                          .map((tr, tIdx) => (
                                                            <IconFrame
                                                              key={tIdx}
                                                              name={cleanDisplayName(
                                                                tr.name,
                                                                isTr
                                                              )}
                                                              count={tr.count}
                                                              size="xs"
                                                            />
                                                          ))}
                                                        {altArmy.troops.length >
                                                          5 && (
                                                          <span className="px-1.5 py-0.5 text-xs text-amber-300 font-bold tabular-nums">
                                                            +
                                                            {altArmy.troops
                                                              .length - 5}
                                                          </span>
                                                        )}
                                                      </div>
                                                    )}
                                                </div>

                                                {altLink && (
                                                  <div className="flex items-center gap-1.5 shrink-0">
                                                    <GameButton
                                                      variant="green"
                                                      size="sm"
                                                      href={altLink}
                                                      target="_blank"
                                                      icon={
                                                        <ExternalLink
                                                          size={12}
                                                        />
                                                      }
                                                      className="min-h-[36px] px-2.5 text-xs"
                                                    >
                                                      {t.meta.copyArmy}
                                                    </GameButton>
                                                    <button
                                                      type="button"
                                                      onClick={(e) =>
                                                        handleCopyCustomCode(
                                                          e,
                                                          altCode
                                                        )
                                                      }
                                                      className="min-h-[36px] min-w-[36px] p-1.5 rounded-lg bg-[#241710] hover:bg-[#3A2517] border border-[#4A3223] text-stone-200 inline-flex items-center justify-center cursor-pointer"
                                                      aria-label={
                                                        t.cwl.copyCode
                                                      }
                                                      title={t.cwl.copyCode}
                                                    >
                                                      {isCopied ? (
                                                        <Check
                                                          size={13}
                                                          className="text-emerald-400"
                                                        />
                                                      ) : (
                                                        <Copy size={13} />
                                                      )}
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Table Footer Note */}
                  <div className="px-4 py-2.5 text-xs font-medium text-amber-200/80 bg-[#2C180E]/80 border-t-2 border-[#201008] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span>{t.cwl.footnote}</span>
                    <span className="font-bold text-amber-300 shrink-0 tabular-nums">
                      {isTr
                        ? `Toplam: ${fmtNum(sortedOpponents.length)} oyuncu`
                        : `Total: ${fmtNum(sortedOpponents.length)} players`}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Selected Player Detail OR Full Roster Cards */}
      {activePlayer && (
        <div
          ref={detailSectionRef}
          className="scroll-mt-16 lg:scroll-mt-4 space-y-4"
        >
          {viewMode === "single" ? (
            <>
              {/* Quick Player Stepper & Back to Roster Bar */}
              {sortedOpponents.length > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#2B1F16] border-2 border-[#3E2B1E] shadow-md">
                  <button
                    type="button"
                    onClick={scrollBackToRoster}
                    className="min-h-[44px] px-3 rounded-lg bg-[#3E2B1E] hover:bg-[#4A2E1E] border border-[#5C3D28] text-xs font-semibold text-amber-200 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowUp size={14} />
                    <span>
                      {isTr ? "Kadro Listesi" : "Back to Roster"}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={selectedIndex <= 0}
                      onClick={() =>
                        setSelectedIndex((prev) => Math.max(0, prev - 1))
                      }
                      className="min-h-[44px] min-w-[44px] px-2.5 rounded-lg bg-[#241710] hover:bg-[#3E2B1E] disabled:opacity-40 disabled:cursor-not-allowed border border-[#4A3223] text-amber-200 inline-flex items-center justify-center cursor-pointer"
                      aria-label={isTr ? "Önceki oyuncu" : "Previous player"}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="px-2.5 text-xs sm:text-sm font-bold text-amber-100 tabular-nums">
                      {fmtNum(selectedIndex + 1)} /{" "}
                      {fmtNum(sortedOpponents.length)}
                    </span>
                    <button
                      type="button"
                      disabled={selectedIndex >= sortedOpponents.length - 1}
                      onClick={() =>
                        setSelectedIndex((prev) =>
                          Math.min(sortedOpponents.length - 1, prev + 1)
                        )
                      }
                      className="min-h-[44px] min-w-[44px] px-2.5 rounded-lg bg-[#241710] hover:bg-[#3E2B1E] disabled:opacity-40 disabled:cursor-not-allowed border border-[#4A3223] text-amber-200 inline-flex items-center justify-center cursor-pointer"
                      aria-label={isTr ? "Sonraki oyuncu" : "Next player"}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              <PlayerScoutCardDetail player={activePlayer} />
            </>
          ) : (
            <div className="space-y-6">
              {sortedOpponents.map((opp, idx) => (
                <PlayerScoutCardDetail
                  key={opp.playerTag || idx}
                  player={opp}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
