"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Search,
  RefreshCw,
  Flame,
  LayoutGrid,
  User,
  Users,
  ChevronDown,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { buildCopyArmyLink } from "@/lib/armyLink";
import { safeFetchJson } from "@/lib/apiClient";
import UnitIcon from "@/components/common/UnitIcon";
import {
  GameButton,
  GameInput,
  TownHallImage,
} from "@/components/game";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Domain Interfaces ---
interface Hero {
  id: string | number;
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
    equipment: { id: number; name: string; rarity?: string }[];
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
  decodedArmy?: any;
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

const UnitCard = ({
  unit,
  type,
}: {
  unit: Unit;
  type: "troop" | "spell" | "siege" | "cc";
}) => {
  const badgeTheme = {
    troop: "bg-gradient-to-b from-[#3399E8] to-[#1B72C6] text-white border-[#104C8A]",
    spell: "bg-gradient-to-b from-[#A238D6] to-[#71199E] text-white border-[#4A0969]",
    siege: "bg-gradient-to-b from-[#F5B824] to-[#C97F08] text-stone-950 border-[#663F02]",
    cc: "bg-gradient-to-b from-[#72BD36] to-[#438719] text-white border-[#24540A]",
  };

  return (
    <div className="bg-[#241710] border-2 border-[#3D2517] rounded-xl p-2.5 flex items-center justify-between gap-2.5 shadow-md hover:border-amber-500/50 transition-all select-none">
      <div className="flex items-center gap-2.5 min-w-0">
        <UnitIcon name={unit.name} size="sm" />
        <div className="truncate">
          <div className="text-xs font-game text-white tracking-wide truncate drop-shadow-sm">
            {unit.name}
          </div>
          {unit.housingSpace && (
            <div className="text-[10px] text-amber-200/70 font-bold truncate">
              {unit.housingSpace * unit.count} Alan Kapasitesi
            </div>
          )}
        </div>
      </div>
      <span
        className={cn(
          "px-2.5 py-0.5 rounded-lg text-xs font-game shadow-sm border shrink-0",
          badgeTheme[type]
        )}
      >
        x{unit.count}
      </span>
    </div>
  );
};

const PlayerScoutCardDetail = ({ player }: { player: ScoutData }) => {
  const [selectedArmyIdx, setSelectedArmyIdx] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  // Reset selected recent army index when player changes
  useEffect(() => {
    setSelectedArmyIdx(0);
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
  const currentArmyName = hasDetectedArmy
    ? activeOption?.armyName ||
      player.armyName ||
      player.inferredArchetype ||
      "Ordu tespit edilemedi"
    : player.armyName || player.failureReason || "Ordu tespit edilemedi";
  const currentSourceLabel = hasDetectedArmy
    ? activeOption?.sourceLabel ||
      player.armySourceLabel ||
      "Son ranked saldırısı"
    : player.armySourceLabel || player.failureReason || "Ordu tespit edilemedi";

  const displayedTroops = activeOption ? activeOption.troops : player.troops || [];
  const displayedSpells = activeOption ? activeOption.spells : player.spells || [];
  const displayedSiege = activeOption
    ? activeOption.siegeMachines?.[0] || null
    : player.siege || null;
  const displayedCc = activeOption
    ? activeOption.clanCastle || []
    : player.clanCastle || [];

  const handleCopyCode = async () => {
    if (!currentShareCode) return;
    try {
      await navigator.clipboard.writeText(currentShareCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error("Failed to copy armyShareCode", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full game-panel-wood rounded-2xl border-4 border-[#2C180E] shadow-2xl overflow-hidden space-y-0 text-stone-100"
    >
      {/* Header Bar */}
      <div className="game-panel-header px-5 py-4 sm:px-6 sm:py-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <div className="relative shrink-0 flex flex-col items-center">
            <TownHallImage level={player.townHallLevel} size={58} className="drop-shadow-lg" />
            <span className="mt-1 px-2 py-0.2 rounded-md bg-amber-500/25 border border-amber-400/40 text-amber-300 font-game text-[10px] font-black leading-none">
              BB {player.townHallLevel}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="game-text-stroke-gold text-lg sm:text-2xl font-black tracking-wide truncate">
                #{player.mapPosition || 1} {player.opponentName}
              </h2>
              {player.playerTag && (
                <span className="text-xs font-bold text-amber-200/70">
                  ({player.playerTag})
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-game font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                TH{player.townHallLevel}
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-game font-black border",
                  hasDetectedArmy
                    ? "bg-sky-950/80 text-sky-200 border-sky-500/40"
                    : "bg-stone-900/80 text-stone-300 border-stone-700"
                )}
              >
                {currentArmyName}
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-game font-black border",
                  hasDetectedArmy
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                    : "bg-rose-950/80 text-rose-300 border-rose-600/40"
                )}
              >
                {currentSourceLabel}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-amber-200/90 mt-2">
              <span className="game-stat-pill">
                <Trophy size={13} className="text-amber-400" /> {player.trophies} Kupa
              </span>
              {player.activeSuperTroops && player.activeSuperTroops.length > 0 && (
                <span className="game-stat-pill text-rose-300 border-rose-800/40">
                  <Flame size={13} className="text-rose-400" /> Aktif Süper Birlik:{" "}
                  {player.activeSuperTroops.join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons & Stars */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          {hasDetectedArmy && (
            <>
              <div className="flex flex-col items-start lg:items-end">
                <div className="flex gap-1 items-center">
                  {[...Array(3)].map((_, i) => {
                    const starsCount = activeOption?.stars ?? player.stars ?? 0;
                    return (
                      <Star
                        key={i}
                        size={20}
                        fill={i < starsCount ? "#FFD200" : "transparent"}
                        className={
                          i < starsCount
                            ? "text-[#FFD200] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                            : "text-stone-700"
                        }
                      />
                    );
                  })}
                </div>
                <div className="font-game text-xs text-amber-200 tracking-wide mt-0.5">
                  %{activeOption?.destructionPercentage ?? player.destruction ?? 0} Yıkım
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <GameButton
                  variant="green"
                  size="md"
                  href={currentCopyLink}
                  target="_blank"
                  icon={<ExternalLink size={15} />}
                  className="px-3.5 py-2 text-xs sm:text-sm font-game"
                  title="Doğrudan Clash of Clans oyununda aç"
                >
                  Orduyu Kopyala
                </GameButton>

                <GameButton
                  variant={copiedCode ? "green" : "gold"}
                  size="md"
                  onClick={handleCopyCode}
                  icon={copiedCode ? <Check size={14} /> : <Copy size={14} />}
                  className="px-3 py-2 text-xs sm:text-sm font-game"
                >
                  {copiedCode ? "Kopyalandı" : "Kodu Kopyala"}
                </GameButton>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* Selector for up to 3 recent distinct attack armies */}
        {recentArmies.length > 1 && (
          <div className="game-slot-well p-3.5 flex flex-wrap items-center justify-between gap-3">
            <span className="font-game text-xs uppercase tracking-wider text-amber-200">
              Son {recentArmies.length} Farklı Saldırı Ordusu (Seçilebilir):
            </span>
            <div className="flex flex-wrap gap-2">
              {recentArmies.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedArmyIdx(idx)}
                  className={cn(
                    "game-btn text-xs py-1.5 px-3",
                    selectedArmyIdx === idx
                      ? "game-btn-blue scale-[1.02]"
                      : "game-btn-silver opacity-85 hover:opacity-100"
                  )}
                >
                  #{idx + 1} {opt.armyName} ({opt.stars}★ %{opt.destructionPercentage})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section 1: Player Profile Heroes & Equipments */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b-2 border-[#3D2517] pb-2">
            <h3 className="font-game text-xs sm:text-sm uppercase text-amber-200 tracking-widest flex items-center gap-2">
              <Shield size={16} className="text-sky-400" />{" "}
              Oyuncu Profili Kahraman & Ekipman Seviyeleri
            </h3>
            <span className="text-[11px] font-bold text-amber-200/70">
              Resmi `/players/{player.playerTag}` Verisi
            </span>
          </div>

          {(player.profileHeroes || player.heroes || []).length === 0 ? (
            <div className="text-xs font-bold text-stone-400 p-3 rounded-xl bg-[#241710] border border-[#3D2517]">
              Bu oyuncu için kahraman bilgisi bulunamadı.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
              {(player.profileHeroes || player.heroes).map((hero) => (
                <div
                  key={hero.id || hero.name}
                  className="bg-[#241710] border-2 border-[#3D2517] rounded-xl p-3 flex flex-col justify-between shadow-md hover:border-amber-500/40 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2 font-game text-xs text-white tracking-wide truncate">
                        <UnitIcon name={hero.name} size="xs" />
                        <span className="truncate">{hero.name}</span>
                      </div>
                      {hero.level !== undefined && (
                        <span className="px-1.5 py-0.5 rounded bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950 font-game text-[11px] font-black border border-amber-300 shadow-sm shrink-0">
                          Lv.{hero.level}
                        </span>
                      )}
                    </div>

                    {hero.pet && (
                      <div className="mb-2.5 p-1.5 rounded-lg bg-[#180E09] border border-[#3A2216] flex items-center justify-between text-xs font-bold">
                        <span className="text-cyan-300 font-game flex items-center gap-1.5 text-xs truncate">
                          <UnitIcon name={hero.pet.name} size="xs" />
                          <span className="truncate">{hero.pet.name}</span>
                        </span>
                        {hero.pet.level !== undefined && (
                          <span className="text-[10px] font-game text-cyan-200 px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/40 shrink-0">
                            Lv.{hero.pet.level}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 pt-2 border-t border-[#3D2517]">
                    <div className="text-[10px] font-game text-amber-300/80 uppercase tracking-wider">
                      Ekipmanlar:
                    </div>
                    {(hero.equipments || []).length === 0 ? (
                      <div className="text-[11px] font-semibold text-stone-400">
                        Kuşanılmış ekipman yok
                      </div>
                    ) : (
                      (hero.equipments || []).map((eq, i) => {
                        const isEpic = eq.isEpic || eq.rarity === "Epic";
                        return (
                          <div
                            key={i}
                            className={cn(
                              "flex items-center justify-between text-xs py-1 px-1.5 rounded border font-bold transition-colors",
                              isEpic
                                ? "bg-purple-950/50 border-purple-500/60 text-purple-200 shadow-[0_0_6px_rgba(168,85,247,0.2)]"
                                : "bg-[#180E09] border-[#3A2216] text-stone-200"
                            )}
                          >
                            <div className="flex items-center gap-1.5 truncate pr-1">
                              <UnitIcon name={eq.name} size="xs" isEpic={isEpic} />
                              <span className="truncate text-[11px] font-game">{eq.name}</span>
                            </div>
                            {eq.level !== undefined && (
                              <span
                                className={cn(
                                  "text-[10px] px-1 py-0.2 rounded font-game font-black shrink-0",
                                  isEpic
                                    ? "bg-purple-800/80 text-purple-100 border border-purple-400/50"
                                    : "bg-black/40 text-stone-300 border border-stone-700/60"
                                )}
                              >
                                Lv.{eq.level}
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

        {/* Section 2: Decoded Attack Army OR Specific Failure Reason */}
        {!hasDetectedArmy ? (
          <div className="bg-[#241710] border-2 border-[#3D2517] rounded-xl p-4 flex items-center gap-3 text-sm font-bold text-amber-200 shadow-md">
            <AlertCircle size={20} className="text-amber-400 shrink-0" />
            <div>
              <div className="font-game text-white text-sm tracking-wide">
                {currentSourceLabel}
              </div>
              <div className="text-xs font-semibold text-amber-200/80 mt-0.5">
                {currentSourceLabel === "Ranked kayıt yok"
                  ? "Oyuncunun Battle Log geçmişinde ranked türünde bir savaş kaydı bulunamadı."
                  : currentSourceLabel === "Battle log boş"
                  ? "Oyuncunun Battle Log geçmişi boş veya API tarafından kayıt döndürülmedi."
                  : currentSourceLabel === "armyShareCode yok"
                  ? "Oyuncunun savaş geçmişinde geçerli bir ordu paylaşım kodu (armyShareCode) bulunamadı."
                  : currentSourceLabel.startsWith("API hatası")
                  ? `Resmi Clash of Clans API'sinden veri alınırken hata oluştu: ${currentSourceLabel}`
                  : "Oyuncunun Battle Log geçmişinde ordu tespit edilemedi. Yalnızca oyuncunun profilindeki mevcut kahraman ve ekipman seviyeleri gösterilmektedir."}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Decoded Attack Heroes from armyShareCode */}
            {activeOption && activeOption.heroes && activeOption.heroes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b-2 border-[#3D2517] pb-2">
                  <h3 className="font-game text-xs sm:text-sm uppercase text-amber-200 tracking-widest flex items-center gap-2">
                    <Sparkles size={15} className="text-amber-400" /> Saldırıda Kullanılan Kahraman, Pet ve Ekipman Dizilimi (`armyShareCode`)
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {activeOption.heroes.map((h) => (
                    <div
                      key={h.id}
                      className="bg-[#241710] border-2 border-[#3D2517] rounded-xl p-3 space-y-2 shadow-md"
                    >
                      <div className="flex items-center justify-between text-xs font-game text-white">
                        <div className="flex items-center gap-1.5 truncate">
                          <UnitIcon name={h.name} size="xs" />
                          <span className="truncate">{h.name}</span>
                        </div>
                        {h.pet && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-300 shrink-0">
                            <UnitIcon name={h.pet.name} size="xs" />
                            <span>{h.pet.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        {h.equipment.map((eq) => {
                          const isEpic = eq.rarity === "Epic";
                          return (
                            <div
                              key={eq.id}
                              className={cn(
                                "text-xs font-game px-2 py-1 rounded border flex items-center gap-1.5",
                                isEpic
                                  ? "bg-purple-950/50 border-purple-500/50 text-purple-200 shadow-[0_0_6px_rgba(168,85,247,0.2)]"
                                  : "bg-[#180E09] border-[#3A2216] text-stone-200"
                              )}
                            >
                              <UnitIcon name={eq.name} size="xs" isEpic={isEpic} />
                              <span className="truncate">{eq.name}</span>
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
              <div className="flex items-center justify-between border-b-2 border-[#3D2517] pb-2">
                <h3 className="font-game text-xs sm:text-sm uppercase text-amber-200 tracking-widest flex items-center gap-2">
                  <Swords size={16} className="text-amber-400" /> Tespit Edilen Saldırı Ordusu Birlikleri ({currentArmyName})
                </h3>
                <span className="text-[11px] font-bold text-amber-200/70">
                  Kaynak: {currentSourceLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                <h4 className="font-game text-xs uppercase text-purple-300 tracking-widest flex items-center gap-2 border-b-2 border-[#3D2517] pb-2">
                  <Zap size={15} className="text-purple-400" /> Büyüler
                </h4>
                <div className="space-y-2">
                  {displayedSpells.map((spell, idx) => (
                    <UnitCard
                      key={`${spell.id}-${idx}`}
                      unit={spell}
                      type="spell"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="font-game text-xs uppercase text-amber-300 tracking-widest flex items-center gap-2 border-b-2 border-[#3D2517] pb-2">
                  <Shield size={15} className="text-amber-400" /> Kuşatma Makinesi
                </h4>
                {displayedSiege ? (
                  <UnitCard unit={displayedSiege} type="siege" />
                ) : (
                  <div className="text-xs font-bold text-stone-400 p-3 rounded-xl bg-[#241710] border border-[#3D2517]">
                    Yok
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                <h4 className="font-game text-xs uppercase text-emerald-300 tracking-widest flex items-center gap-2 border-b-2 border-[#3D2517] pb-2">
                  <ScrollText size={15} className="text-emerald-400" /> Klan Kalesi
                </h4>
                <div className="space-y-2">
                  {displayedCc.length === 0 ? (
                    <div className="text-xs font-bold text-stone-400 p-3 rounded-xl bg-[#241710] border border-[#3D2517]">
                      Yok
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
              <h4 className="font-game text-xs uppercase text-amber-300 tracking-widest flex items-center gap-2">
                <Trophy size={15} className="text-amber-400" /> CWL / Savaş Saldırıları ({player.warAttacks.length})
              </h4>
              <div className="space-y-2">
                {player.warAttacks.map((atk, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#241710] border border-[#3D2517] flex items-center justify-between text-xs font-bold text-stone-200"
                  >
                    <div>
                      Hedef: #{atk.defenderMapPosition || "?"}{" "}
                      <span className="font-game text-white">{atk.defenderName || atk.defenderTag}</span>
                      {atk.defenderTownHall ? ` (TH${atk.defenderTownHall})` : ""}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-300 font-game text-sm">
                        {atk.stars}★
                      </span>
                      <span className="text-amber-200/70 font-bold">
                        %{atk.destructionPercentage}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Savunma Analizi — 3 Yıldız Yediği Ordular */}
        <div className="pt-2 border-t-2 border-[#3D2517] space-y-3">
          <div className="game-slot-well p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#3D2517] pb-2.5">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-rose-400" />
                <h4 className="font-game text-xs sm:text-sm uppercase tracking-wider text-amber-200">
                  Savunma Analizi — 3 Yıldız Yediği Ordular ({player.threeStarDefenseCount || 0})
                </h4>
              </div>
              <span className="text-[11px] font-bold text-amber-200/70">
                Toplam {player.totalRankedDefenses || 0} Ranked Savunma
              </span>
            </div>

            {!player.threeStarDefenses || player.threeStarDefenses.length === 0 ? (
              <div className="text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 p-3 rounded-xl flex items-center gap-2 shadow-inner">
                <Check size={16} className="text-emerald-400 shrink-0" />
                <span>
                  {player.totalRankedDefenses && player.totalRankedDefenses > 0
                    ? `Bu oyuncu son ${player.totalRankedDefenses} ranked savunmasında hiç 3 yıldız yemedi.`
                    : "Bu oyuncunun ranked savunma geçmişinde 3 yıldız yediği bir saldırı kaydı bulunmuyor."}
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {player.threeStarDefenses.map((def, dIdx) => (
                  <div
                    key={`def-${dIdx}`}
                    className="p-3.5 rounded-xl bg-[#241710] border-2 border-[#3D2517] space-y-2.5 text-xs shadow-md"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3D2517] pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 font-game text-[10px] border border-rose-600/50">
                          100% (3★)
                        </span>
                        <span className="font-game text-sm text-white drop-shadow-sm">
                          {def.armyName}
                        </span>
                        <span className="text-[11px] font-bold text-amber-200/70">
                          (Saldıran: <strong className="text-white font-game">{def.opponentName}</strong> • TH{def.opponentTownHallLevel || "?"})
                        </span>
                      </div>
                      {def.armyLink && (
                        <GameButton
                          variant="green"
                          size="sm"
                          href={def.armyLink}
                          target="_blank"
                          icon={<Copy size={11} />}
                          className="px-2.5 py-1 text-[10px] font-game"
                        >
                          Orduyu Kopyala
                        </GameButton>
                      )}
                    </div>
                    {/* Unit details */}
                    {def.troops && def.troops.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-game uppercase text-amber-300/80 tracking-wider">
                          Kullanılan Birlikler & Büyüler:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {def.troops.map((u, uIdx) => (
                            <span
                              key={`tu-${uIdx}`}
                              className="px-2 py-0.5 rounded-md bg-[#180E09] border border-[#3A2216] text-[10px] font-bold text-stone-200"
                            >
                              {u.count}x {u.name}
                            </span>
                          ))}
                          {def.spells &&
                            def.spells.map((s, sIdx) => (
                              <span
                                key={`ts-${sIdx}`}
                                className="px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-500/40 text-[10px] font-bold text-purple-300"
                              >
                                {s.count}x {s.name}
                              </span>
                            ))}
                          {def.siegeMachines &&
                            def.siegeMachines.map((sg, sgIdx) => (
                              <span
                                key={`tsg-${sgIdx}`}
                                className="px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/40 text-[10px] font-bold text-amber-300"
                              >
                                {sg.name}
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
  const [clanTagInput, setClanTagInput] = useState(initialClanTag || "#2PP");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [report, setReport] = useState<CwlScoutReport | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"single" | "all">("single");
  const [copiedRowIdx, setCopiedRowIdx] = useState<number | null>(null);
  const [copiedOtherCode, setCopiedOtherCode] = useState<string | null>(null);
  const [rosterFilter, setRosterFilter] = useState<"cwl" | "all">("cwl");
  const [expandedRowTags, setExpandedRowTags] = useState<Set<string>>(new Set());

  // Round / Battle Day Switcher State & Memory Cache
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [reportsCache, setReportsCache] = useState<Record<string, CwlScoutReport>>({});

  const updateUrl = (tag: string, round?: number | null) => {
    if (typeof window === "undefined") return;
    const clean = tag.trim().replace(/^#/, "");
    if (!clean) return;
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
      if (!forceRefresh && reportsCache[cacheKey]) {
        const cached = reportsCache[cacheKey];
        setReport(cached);
        setSelectedRound(cached.roundNumber || targetRound || null);
        updateUrl(clean, cached.roundNumber || targetRound);
        setSelectedIndex(0);
        return;
      }

      setLoading(true);
      setStatusMsg(null);
      try {
        let path = `/api/v1/cwl/scout/${encodeURIComponent(clean)}?force_refresh=${forceRefresh}&roster_filter=${targetFilter}`;
        if (targetRound) {
          path += `&round=${targetRound}`;
        }
        const body = await safeFetchJson<any>(path);
        setReport(body);
        setReportsCache((prev) => ({ ...prev, [cacheKey]: body }));
        const activeR = body.roundNumber || targetRound || null;
        setSelectedRound(activeR);
        updateUrl(clean, activeR);
        setSelectedIndex(0);
        if (!body.opponents || body.opponents.length === 0) {
          if (body.status === "unrevealed") {
            setStatusMsg(body.message || "Sonraki tur rakibi henüz belli değil.");
          } else {
            setStatusMsg(
              `Klan (${tagToFetch}) için rakip/üye kadrosu bulunamadı (${body.status || "notInWar"}).`
            );
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Bağlantı hatası";
        setStatusMsg(`API Hatası: ${msg}`);
        setReport(null);
      } finally {
        setLoading(false);
      }
    },
    [rosterFilter, selectedRound, reportsCache]
  );

  useEffect(() => {
    let initialTag = initialClanTag || "#2PP";
    let initialRound: number | null = null;
    if (typeof window !== "undefined" && window.location.hash.includes("#/cwl")) {
      const parts = window.location.hash.split("?");
      if (parts[1]) {
        const params = new URLSearchParams(parts[1]);
        const clanParam = params.get("clan");
        const roundParam = params.get("round");
        if (clanParam) initialTag = clanParam.startsWith("#") ? clanParam : `#${clanParam}`;
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

  // Sort: CWL roster players first, then by mapPosition
  const sortedOpponents = useMemo(() => {
    return [...opponents].sort((a, b) => {
      const aCwl = Boolean(a.isCwl);
      const bCwl = Boolean(b.isCwl);
      if (aCwl !== bCwl) {
        return aCwl ? -1 : 1; // CWL players come first!
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

  const handleCopyRowCode = async (
    e: React.MouseEvent,
    code: string,
    idx: number
  ) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopiedRowIdx(idx);
      setTimeout(() => setCopiedRowIdx(null), 2000);
    } catch (err) {
      console.error("Failed to copy row code", err);
    }
  };

  const handleCopyCustomCode = async (
    e: React.MouseEvent,
    code: string
  ) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopiedOtherCode(code);
      setTimeout(() => setCopiedOtherCode(null), 2000);
    } catch (err) {
      console.error("Failed to copy code", err);
    }
  };

  return (
    <div className="game-theme w-full space-y-6 font-sans">
      {/* Top CWL Clan Tag Search & Roster Control Bar */}
      <div className="game-panel-wood rounded-2xl border-4 border-[#2C180E] p-4 sm:p-6 shadow-2xl space-y-4">
        {/* Panel Header Strip */}
        <div className="game-panel-header -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-2 px-4 py-3 sm:px-6 sm:py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Swords className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 drop-shadow" />
            <h1 className="game-text-stroke-gold text-lg sm:text-2xl font-black tracking-wide">
              CWL Savaş Keşfi
            </h1>
          </div>
          {report && (
            <div className="flex items-center gap-2">
              <span className="game-stat-pill text-amber-200">
                <Shield size={12} className="text-amber-400" /> Tur {report.roundNumber || 1}
              </span>
            </div>
          )}
        </div>

        {/* Search Input and Action Buttons */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          <div className="flex-1">
            <GameInput
              prefixTag="#"
              value={clanTagInput.replace(/^#/, "")}
              onChange={(e) => setClanTagInput(`#${e.target.value.replace(/^#/, "")}`)}
              onKeyDown={(e) =>
                e.key === "Enter" && handleScoutClan(clanTagInput, false)
              }
              placeholder="CWL Klan Etiketi (Örn: 2PP)"
              containerClassName="w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <GameButton
              variant="green"
              size="md"
              onClick={() => handleScoutClan(clanTagInput, false)}
              disabled={loading}
              icon={<Swords size={16} />}
              className="px-4 py-2 text-xs sm:text-sm font-game"
            >
              {loading ? "Taranıyor..." : "Keşfet"}
            </GameButton>

            <button
              type="button"
              onClick={() => handleScoutClan(clanTagInput, true)}
              disabled={loading}
              title="Önbelleği Atla ve Canlı Yenile"
              className="clan-sort-button p-2.5 shrink-0"
              aria-label="Yenile"
            >
              <RefreshCw size={16} className={cn(loading && "animate-spin text-amber-600")} />
            </button>

            {/* View Toggle: Single Player vs All Roster Cards */}
            <div className="game-segmented-bar shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("single")}
                className={cn(
                  "game-segmented-item text-xs py-1.5 px-3 min-h-[38px]",
                  viewMode === "single" && "game-segmented-item-active"
                )}
              >
                <User size={13} className="mr-1 inline" /> Seçili Oyuncu
              </button>
              <button
                type="button"
                onClick={() => setViewMode("all")}
                className={cn(
                  "game-segmented-item text-xs py-1.5 px-3 min-h-[38px]",
                  viewMode === "all" && "game-segmented-item-active"
                )}
              >
                <LayoutGrid size={13} className="mr-1 inline" /> Tüm Kadro ({sortedOpponents.length})
              </button>
            </div>
          </div>
        </div>

        {/* Round / Battle Day Switcher Bar */}
        {report && report.roundsSummary && report.roundsSummary.length > 0 && (
          <div className="pt-3 border-t-2 border-[#3D2517] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Segmented control: Savaş Günü vs Hazırlık Günü */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Savaş Günü Tab */}
              {(() => {
                const inWarRound = report.roundsSummary?.find(
                  (r) => r.state.toLowerCase() === "inwar"
                );
                const isSelected =
                  inWarRound && report.roundNumber === inWarRound.roundNumber;
                return (
                  <button
                    type="button"
                    disabled={!inWarRound || loading}
                    onClick={() => {
                      if (inWarRound) {
                        handleScoutClan(clanTagInput, false, rosterFilter, inWarRound.roundNumber);
                      }
                    }}
                    className={cn(
                      "game-btn text-xs px-3.5 py-2",
                      isSelected
                        ? "game-btn-green scale-[1.02]"
                        : inWarRound
                        ? "game-btn-gold opacity-85 hover:opacity-100"
                        : "game-btn-silver opacity-45 cursor-not-allowed"
                    )}
                  >
                    <Swords size={14} className="mr-1.5 inline text-amber-200" />
                    <span>
                      {inWarRound
                        ? `Savaş Günü – Tur ${inWarRound.roundNumber} vs ${inWarRound.opponentClan?.name || "Rakip"}`
                        : "Savaş Günü (Aktif savaş yok)"}
                    </span>
                  </button>
                );
              })()}

              {/* Hazırlık Günü Tab */}
              {(() => {
                const prepRound = report.roundsSummary?.find(
                  (r) => r.state.toLowerCase() === "preparation"
                );
                const isSelected =
                  prepRound && report.roundNumber === prepRound.roundNumber;
                return (
                  <button
                    type="button"
                    disabled={!prepRound || loading}
                    onClick={() => {
                      if (prepRound) {
                        handleScoutClan(clanTagInput, false, rosterFilter, prepRound.roundNumber);
                      }
                    }}
                    className={cn(
                      "game-btn text-xs px-3.5 py-2",
                      isSelected
                        ? "game-btn-blue scale-[1.02]"
                        : prepRound
                        ? "game-btn-silver opacity-85 hover:opacity-100"
                        : "game-btn-silver opacity-45 cursor-not-allowed"
                    )}
                  >
                    <Shield size={14} className="mr-1.5 inline text-sky-200" />
                    <span>
                      {prepRound
                        ? `Hazırlık Günü – Tur ${prepRound.roundNumber} vs ${prepRound.opponentClan?.name || "Rakip"}`
                        : "Hazırlık Günü – Sonraki tur rakibi henüz belli değil"}
                    </span>
                  </button>
                );
              })()}
            </div>

            {/* Dropdown: Tur Seç (Tur 1-7) */}
            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              <span className="font-game text-xs text-amber-200/90 tracking-wider uppercase">
                Tur Seç:
              </span>
              <select
                value={report.roundNumber || 1}
                onChange={(e) => {
                  const rNum = parseInt(e.target.value, 10);
                  if (rNum) {
                    handleScoutClan(clanTagInput, false, rosterFilter, rNum);
                  }
                }}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl bg-[#2A1B12] border-2 border-[#543621] text-xs font-game text-amber-200 cursor-pointer focus:outline-none focus:border-amber-400"
              >
                {report.roundsSummary.map((r) => (
                  <option
                    key={r.roundNumber}
                    value={r.roundNumber}
                    disabled={r.state === "unrevealed"}
                    className="bg-[#2A1B12] text-stone-100"
                  >
                    Tur {r.roundNumber}: {r.opponentClan?.name ? `vs ${r.opponentClan.name}` : ""}{" "}
                    ({r.stateLabel})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Preparation Day Banner */}
        {report?.isPreparationDay && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-amber-950/80 border-2 border-amber-600/60 flex items-center gap-3 text-xs font-bold text-amber-200 shadow-md">
            <Shield size={20} className="text-amber-400 shrink-0" />
            <span>
              <strong className="text-amber-300 font-game tracking-wide">Hazırlık Günü</strong> — Bu tur için savaş henüz başlamadı. Savaş içi saldırı sonuçları oluşmadığından yalnızca rakip kadro, Belediye Seviyesi ve ranked Battle Log analizleri gösterilmektedir.
            </span>
          </div>
        )}

        {statusMsg && (
          <div className="p-3 rounded-xl bg-red-950/70 border-2 border-red-600/50 text-xs font-bold text-red-200 shadow-md flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Opponent Roster List & Table */}
        {((report && sortedOpponents.length > 0) || loading) && (
          <div className="pt-3 border-t-2 border-[#3D2517] space-y-4">
            {/* Filter Buttons & Clan Info Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFilterChange("cwl")}
                  disabled={loading}
                  className={cn(
                    "game-btn text-xs px-3 py-1.5",
                    rosterFilter === "cwl" ? "game-btn-gold" : "game-btn-silver"
                  )}
                >
                  <Swords size={13} className="mr-1 inline" /> CWL Kadrosu ({cwlCount})
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange("all")}
                  disabled={loading}
                  className={cn(
                    "game-btn text-xs px-3 py-1.5",
                    rosterFilter === "all" ? "game-btn-gold" : "game-btn-silver"
                  )}
                >
                  <Users size={13} className="mr-1 inline" /> Tüm Klan Üyeleri ({allCount})
                </button>
              </div>

              {report && (
                <div className="text-xs font-bold text-amber-200/90 font-sans">
                  İncelenen Klan:{" "}
                  <strong className="text-white font-game tracking-wide">
                    {report.opponentClan?.name || report.clanName || clanTagInput}
                  </strong>{" "}
                  <span className="text-amber-300 font-semibold">
                    ({report.opponentClan?.tag || report.clanTag || clanTagInput})
                  </span>{" "}
                  • Tur {report.roundNumber || 1} • Durum:{" "}
                  <span className="uppercase text-amber-300 font-game">
                    {report.warState || "preparation"}
                  </span>
                </div>
              )}
            </div>

            {/* Compact In-Game Roster Table */}
            <div className="overflow-x-auto rounded-xl border-2 border-[#2C180E] shadow-inner bg-[#1F140D]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#3A2216] border-b-2 border-[#201008] text-amber-200/90 font-game tracking-wider uppercase text-[11px]">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[170px]">Rakip Oyuncu</th>
                    <th className="py-2.5 px-3 w-16 text-center">BB</th>
                    <th className="py-2.5 px-3 min-w-[230px]">Tespit Edilen Saldırı Ordusu</th>
                    <th className="py-2.5 px-3 min-w-[190px]">Ana Birlikler</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Savunma (3★)</th>
                    <th className="py-2.5 px-3 text-right min-w-[160px]">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3D2517]/50 font-bold text-stone-200">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, sIdx) => (
                      <tr
                        key={`skeleton-${sIdx}`}
                        className="animate-pulse border-b border-[#3D2517]/40 bg-[#25170F]"
                      >
                        <td className="py-3 px-3">
                          <div className="h-4 w-6 bg-[#3D2517] rounded mx-auto" />
                        </td>
                        <td className="py-3 px-3">
                          <div className="h-4 w-28 bg-[#3D2517] rounded mb-1" />
                          <div className="h-3 w-16 bg-[#3D2517]/60 rounded" />
                        </td>
                        <td className="py-3 px-3">
                          <div className="h-6 w-8 bg-[#3D2517] rounded mx-auto" />
                        </td>
                        <td className="py-3 px-3">
                          <div className="h-4 w-36 bg-[#3D2517] rounded mb-1" />
                          <div className="h-3 w-24 bg-[#3D2517]/60 rounded" />
                        </td>
                        <td className="py-3 px-3">
                          <div className="h-5 w-32 bg-[#3D2517] rounded" />
                        </td>
                        <td className="py-3 px-3">
                          <div className="h-5 w-24 bg-[#3D2517] rounded" />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="h-6 w-24 bg-[#3D2517] rounded ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : sortedOpponents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-xs font-bold text-stone-400"
                      >
                        Kadroda gösterilecek oyuncu bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    sortedOpponents.map((opp, idx) => {
                      const detected = Boolean(
                        opp.armyDetected && (opp.armyShareCode || "").trim()
                      );
                      const hasNoAttacks =
                        !detected &&
                        (opp.failureReason === "Saldırı kaydı yok" || !opp.armyDetected);
                      const rowCode = (opp.armyShareCode || "").trim();
                      const rowCopyUrl = detected
                        ? buildCopyArmyLink(rowCode)
                        : "";
                      const isRowExpanded = Boolean(
                        opp.playerTag && expandedRowTags.has(opp.playerTag)
                      );
                      const recentArmies = opp.recentArmies || [];
                      const hasMultipleArmies = recentArmies.length >= 2;

                      return (
                        <React.Fragment key={opp.playerTag || idx}>
                          <tr
                            onClick={() => {
                              setSelectedIndex(idx);
                              setViewMode("single");
                            }}
                            className={cn(
                              "cursor-pointer transition-colors border-b border-[#3D2517]/40",
                              idx % 2 === 0 ? "bg-[#2A1B12]/80" : "bg-[#23150D]/90",
                              "hover:bg-[#3D281B]",
                              idx === selectedIndex && "bg-[#452D1A] border-l-4 border-amber-400",
                              hasNoAttacks && "opacity-65"
                            )}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-black/40 border border-[#4A3223] font-game text-amber-300 text-xs">
                                #{opp.mapPosition || idx + 1}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-game text-white text-sm tracking-wide drop-shadow-sm">
                                  {opp.opponentName}
                                </span>
                                {opp.isCwl && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[10px] font-black">
                                    <Swords size={10} /> CWL
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-amber-200/60 font-semibold">
                                {opp.playerTag}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <TownHallImage level={opp.townHallLevel} size={34} />
                                <span className="text-[10px] font-game text-amber-300 -mt-1">
                                  TH{opp.townHallLevel}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              {detected ? (
                                <div className="space-y-1">
                                  <div className="font-game text-amber-300 text-xs drop-shadow-sm">
                                    {opp.armyName ||
                                      opp.inferredArchetype ||
                                      "Bilinmeyen Ordu"}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                    {opp.sourceBadge === "Ranked" ||
                                    opp.armySource === "ranked" ? (
                                      <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-500/40 font-black">
                                        Ranked
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-black">
                                        Ganimet (ranked yok)
                                      </span>
                                    )}
                                    {opp.warning && (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-600/30 font-bold">
                                        {opp.warning}
                                      </span>
                                    )}
                                    {opp.armySummary ? (
                                      <span className="text-amber-200/70 font-bold">
                                        {opp.armySummary}
                                      </span>
                                    ) : opp.armySourceLabel ? (
                                      <span className="text-amber-200/70 font-bold">
                                        {opp.armySourceLabel}
                                      </span>
                                    ) : null}
                                  </div>
                                  {hasMultipleArmies && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (opp.playerTag)
                                          toggleRowExpanded(opp.playerTag);
                                      }}
                                      className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/40 hover:bg-black/60 border border-[#4A3223] text-[10px] font-game text-amber-300 transition-colors cursor-pointer"
                                    >
                                      <span>
                                        {isRowExpanded
                                          ? "Ek orduları gizle"
                                          : `${recentArmies.length - 1} ordu daha göster`}
                                      </span>
                                      <ChevronDown
                                        size={11}
                                        className={cn(
                                          "transition-transform duration-200",
                                          isRowExpanded && "rotate-180"
                                        )}
                                      />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-stone-400 italic">
                                    {opp.failureReason || "Saldırı kaydı yok"}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {detected && opp.troops && opp.troops.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {opp.troops.slice(0, 4).map((t, tIdx) => (
                                    <span
                                      key={`${t.id}-${tIdx}`}
                                      className="px-1.5 py-0.5 rounded bg-black/40 border border-[#4A3223] text-[10px] font-bold text-stone-200"
                                    >
                                      {t.name} x{t.count}
                                    </span>
                                  ))}
                                  {opp.troops.length > 4 && (
                                    <span className="px-1 py-0.5 text-[10px] text-amber-300 font-bold">
                                      +{opp.troops.length - 4}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-stone-400 font-bold">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {opp.threeStarDefenseCount && opp.threeStarDefenseCount > 0 ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-950/80 text-rose-300 border border-rose-600/50 w-fit">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    {opp.threeStarDefenseCount}x 3★ Yedi
                                  </span>
                                  {opp.primaryDefenseArmy && (
                                    <span
                                      className="text-[10px] font-bold text-amber-200/70 truncate max-w-[140px]"
                                      title={opp.primaryDefenseArmy}
                                    >
                                      {opp.primaryDefenseArmy}
                                    </span>
                                  )}
                                </div>
                              ) : opp.totalRankedDefenses && opp.totalRankedDefenses > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 w-fit">
                                  <Shield size={10} /> 3★ Yok ({opp.totalRankedDefenses} Savunma)
                                </span>
                              ) : (
                                <span className="text-[11px] text-stone-400 font-bold">—</span>
                              )}
                            </td>
                            <td
                              className="py-2.5 px-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {detected && rowCopyUrl ? (
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  <GameButton
                                    variant="green"
                                    size="sm"
                                    href={rowCopyUrl}
                                    target="_blank"
                                    icon={<ExternalLink size={11} />}
                                    className="px-2.5 py-1 text-[10px] font-game"
                                    title="Clash of Clans oyununda aç"
                                  >
                                    Kopyala
                                  </GameButton>
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleCopyRowCode(e, rowCode, idx)
                                    }
                                    className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 border border-[#4A3223] text-stone-200 text-[10px] font-black inline-flex items-center gap-1 cursor-pointer"
                                    title="Ordu kodunu kopyala"
                                  >
                                    {copiedRowIdx === idx ? (
                                      <Check
                                        size={12}
                                        className="text-emerald-400"
                                      />
                                    ) : (
                                      <Copy size={12} />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-stone-400 font-bold">
                                  -
                                </span>
                              )}
                            </td>
                          </tr>

                          {/* Accordion Row for Other Detected Armies */}
                          {isRowExpanded && hasMultipleArmies && (
                            <tr className="bg-[#1C120B]/90 border-b-2 border-[#3D2517]">
                              <td colSpan={7} className="p-3 pl-6 sm:pl-10">
                                <div className="bg-[#241710] rounded-xl border-2 border-[#3D2517] p-3.5 space-y-3 shadow-md">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3D2517] pb-2 text-xs font-game text-amber-200">
                                    <span className="flex items-center gap-1.5">
                                      <Sparkles
                                        size={13}
                                        className="text-amber-400"
                                      />
                                      {opp.opponentName} için Diğer Tespit Edilen Ordular ({recentArmies.length - 1})
                                    </span>
                                    <span className="text-[10px] text-amber-200/70 font-sans font-bold">
                                      Greedy Sıralaması (3★ &gt; 3★ % &gt; Ort. Yıkım)
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    {recentArmies.slice(1).map((altArmy, altIdx) => {
                                      const altCode = (
                                        altArmy.armyShareCode || ""
                                      ).trim();
                                      const altLink = altCode
                                        ? buildCopyArmyLink(altCode)
                                        : "";
                                      const isCopied =
                                        copiedOtherCode === altCode;

                                      return (
                                        <div
                                          key={altIdx}
                                          className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2.5 rounded-lg bg-[#180E09] border border-[#3A2216]"
                                        >
                                          <div className="space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="text-xs font-game text-white">
                                                {altArmy.armyName ||
                                                  `Alternatif Ordu #${altIdx + 2}`}
                                              </span>
                                              {altArmy.sourceBadge === "Ranked" ? (
                                                <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-500/40 text-[10px] font-black">
                                                  Ranked
                                                </span>
                                              ) : (
                                                <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-black">
                                                  Ganimet (ranked yok)
                                                </span>
                                              )}
                                              {altArmy.summary && (
                                                <span className="text-[11px] font-bold text-amber-200/70">
                                                  {altArmy.summary}
                                                </span>
                                              )}
                                              {altArmy.avgDestruction !== undefined &&
                                                altArmy.avgDestruction > 0 && (
                                                  <span className="text-[10px] text-amber-200/70 font-bold">
                                                    • Ort. %{altArmy.avgDestruction}
                                                  </span>
                                                )}
                                            </div>

                                            {altArmy.troops &&
                                              altArmy.troops.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                  {altArmy.troops
                                                    .slice(0, 5)
                                                    .map((t, tIdx) => (
                                                      <span
                                                        key={tIdx}
                                                        className="px-1.5 py-0.5 rounded bg-black/40 border border-[#3A2216] text-[10px] font-bold text-stone-200"
                                                      >
                                                        {t.name} x{t.count}
                                                      </span>
                                                    ))}
                                                  {altArmy.troops.length > 5 && (
                                                    <span className="px-1 py-0.5 text-[10px] text-amber-300 font-bold">
                                                      +{altArmy.troops.length - 5}
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
                                                icon={<ExternalLink size={11} />}
                                                className="px-2.5 py-1 text-[10px] font-game"
                                              >
                                                Ordu Kopyala
                                              </GameButton>
                                              <button
                                                type="button"
                                                onClick={(e) =>
                                                  handleCopyCustomCode(
                                                    e,
                                                    altCode
                                                  )
                                                }
                                                className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 border border-[#3A2216] text-stone-200 text-[10px] font-black inline-flex items-center gap-1 cursor-pointer"
                                              >
                                                {isCopied ? (
                                                  <Check
                                                    size={12}
                                                    className="text-emerald-400"
                                                  />
                                                ) : (
                                                  <Copy size={12} />
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
              <div className="px-4 py-2.5 text-[11px] font-bold text-amber-200/70 bg-[#2C180E]/70 border-t-2 border-[#201008] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span>
                  Son battle log kayıtlarına göre. Ranked saldırısı olmayan oyuncularda ganimet saldırıları gösterilir.
                </span>
                <span className="font-game text-amber-300">
                  Toplam: {sortedOpponents.length} oyuncu
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Render either Selected Player Card or All Roster Cards */}
      {activePlayer &&
        (viewMode === "single" ? (
          <PlayerScoutCardDetail player={activePlayer} />
        ) : (
          <div className="space-y-6">
            {sortedOpponents.map((opp, idx) => (
              <PlayerScoutCardDetail key={opp.playerTag || idx} player={opp} />
            ))}
          </div>
        ))}
    </div>
  );
}
