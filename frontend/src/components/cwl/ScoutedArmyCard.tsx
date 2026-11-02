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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

const UnitCard = ({
  unit,
  type,
}: {
  unit: Unit;
  type: "troop" | "spell" | "siege" | "cc";
}) => {
  const badgeColors = {
    troop: "bg-blue-600 text-white",
    spell: "bg-purple-600 text-white",
    siege: "bg-amber-600 text-white",
    cc: "bg-emerald-600 text-white",
  };

  return (
    <div className="bg-app-cardSubtle border-2 border-app-border rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm hover:border-blue-500/50 transition-all">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-app-card border border-app-border flex items-center justify-center font-black text-xs text-app-text">
          {unit.name.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="text-xs font-bold text-app-text">{unit.name}</div>
          {unit.housingSpace && (
            <div className="text-[10px] text-app-muted font-semibold">
              {unit.housingSpace * unit.count} Alan Kapasitesi
            </div>
          )}
        </div>
      </div>
      <span
        className={cn(
          "px-2.5 py-1 rounded-lg text-xs font-black shadow-sm",
          badgeColors[type]
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
      className="w-full bg-app-card rounded-2xl border-2 border-app-border shadow-sm overflow-hidden space-y-0"
    >
      {/* Header Bar */}
      <div className="bg-app-cardSubtle px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-app-border gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-red-600/10 rounded-2xl border-2 border-red-500/40 flex flex-col items-center justify-center text-red-600 dark:text-red-400 shadow-sm">
            <span className="text-[10px] uppercase font-black tracking-widest leading-none">
              BELEDİYE
            </span>
            <span className="text-2xl font-black leading-none mt-0.5">
              {player.townHallLevel}
            </span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-black text-app-text tracking-wide">
                #{player.mapPosition || 1} {player.opponentName}
              </h2>
              {player.playerTag && (
                <span className="text-xs font-bold text-app-muted">
                  ({player.playerTag})
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                TH{player.townHallLevel}
              </span>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                  hasDetectedArmy
                    ? "bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                    : "bg-gray-500/10 text-app-muted border-app-border"
                )}
              >
                {currentArmyName}
              </span>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                  hasDetectedArmy
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                )}
              >
                {currentSourceLabel}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-bold text-app-muted mt-1.5">
              <span className="flex items-center gap-1.5">
                <Trophy size={14} className="text-amber-500" /> {player.trophies} Kupa
              </span>
              {player.activeSuperTroops && player.activeSuperTroops.length > 0 && (
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <Flame size={14} /> Aktif Süper Birlik:{" "}
                  {player.activeSuperTroops.join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons & Stars */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {hasDetectedArmy && (
            <>
              <div className="flex flex-col items-end">
                <div className="flex gap-1 items-center">
                  {[...Array(3)].map((_, i) => {
                    const starsCount = activeOption?.stars ?? player.stars ?? 0;
                    return (
                      <Star
                        key={i}
                        size={18}
                        fill={i < starsCount ? "#F59E0B" : "transparent"}
                        className={
                          i < starsCount
                            ? "text-amber-500"
                            : "text-gray-400 dark:text-gray-600"
                        }
                      />
                    );
                  })}
                </div>
                <div className="text-xs font-black text-app-text mt-0.5">
                  %{activeOption?.destructionPercentage ?? player.destruction ?? 0} Yıkım
                </div>
              </div>

              <a
                href={currentCopyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border-2 bg-blue-600 hover:bg-blue-700 border-blue-500 text-white shadow-md"
              >
                <ExternalLink size={15} /> Ordu Kopyala
              </a>

              <button
                type="button"
                onClick={handleCopyCode}
                className={cn(
                  "px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-2 cursor-pointer",
                  copiedCode
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-app-card hover:bg-app-cardSubtle border-app-border text-app-text"
                )}
              >
                {copiedCode ? (
                  <>
                    <Check size={14} /> Kopyalandı
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Kodu Kopyala
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 space-y-8">
        {/* Selector for up to 3 recent distinct attack armies */}
        {recentArmies.length > 1 && (
          <div className="bg-app-cardSubtle border-2 border-app-border rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-app-text">
              Son {recentArmies.length} Farklı Saldırı Ordusu (Seçilebilir):
            </span>
            <div className="flex flex-wrap gap-2">
              {recentArmies.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedArmyIdx(idx)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-black border transition-all cursor-pointer",
                    selectedArmyIdx === idx
                      ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                      : "bg-app-card text-app-text border-app-border hover:border-blue-500/40"
                  )}
                >
                  #{idx + 1} {opt.armyName} ({opt.stars}★ %{opt.destructionPercentage})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section 1: Player Profile Heroes & Equipments */}
        <div>
          <div className="flex items-center justify-between mb-4 border-b-2 border-app-border pb-2">
            <h3 className="text-xs uppercase text-app-text font-black tracking-widest flex items-center gap-2">
              <Shield size={16} className="text-blue-600 dark:text-blue-400" />{" "}
              Oyuncu Profili Kahraman & Ekipman Seviyeleri
            </h3>
            <span className="text-[11px] font-bold text-app-muted">
              Resmi `/players/{player.playerTag}` Verisi
            </span>
          </div>

          {(player.profileHeroes || player.heroes || []).length === 0 ? (
            <div className="text-xs font-bold text-app-muted">
              Bu oyuncu için kahraman bilgisi bulunamadı.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {(player.profileHeroes || player.heroes).map((hero) => (
                <div
                  key={hero.id || hero.name}
                  className="bg-app-cardSubtle border-2 border-app-border rounded-xl p-4 flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-extrabold text-sm text-app-text">
                        {hero.name}
                      </div>
                      {hero.level !== undefined && (
                        <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-xs font-black">
                          Lv.{hero.level}
                        </span>
                      )}
                    </div>

                    {hero.pet && (
                      <div className="mb-3 p-2 rounded-lg bg-app-card border border-app-border flex items-center justify-between text-xs font-bold text-app-text">
                        <span className="text-app-muted flex items-center gap-1.5">
                          <Sparkles size={13} className="text-cyan-500" />{" "}
                          {hero.pet.name}
                        </span>
                        {hero.pet.level !== undefined && (
                          <span className="text-[11px] font-extrabold text-cyan-600 dark:text-cyan-400">
                            Lv.{hero.pet.level}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-app-border">
                    <div className="text-[10px] font-extrabold text-app-muted uppercase tracking-wider">
                      Ekipmanlar:
                    </div>
                    {(hero.equipments || []).length === 0 ? (
                      <div className="text-[11px] font-semibold text-app-muted">
                        Kuşanılmış ekipman yok
                      </div>
                    ) : (
                      (hero.equipments || []).map((eq, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded bg-app-card border border-app-border font-bold text-app-text"
                        >
                          <span className="truncate pr-2">{eq.name}</span>
                          {eq.level !== undefined && (
                            <span
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded font-black",
                                eq.isEpic || eq.rarity === "Epic"
                                  ? "bg-purple-600/20 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                                  : "bg-app-cardSubtle text-app-muted"
                              )}
                            >
                              Lv.{eq.level}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Decoded Attack Army OR Specific Failure Reason */}
        {!hasDetectedArmy ? (
          <div className="bg-app-cardSubtle border-2 border-app-border rounded-xl p-5 flex items-center gap-3 text-sm font-black text-app-muted">
            <AlertCircle size={20} className="text-amber-500 shrink-0" />
            <div>
              <div className="text-app-text font-black text-sm">
                {currentSourceLabel}
              </div>
              <div className="text-xs font-semibold text-app-muted mt-0.5">
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
              <div>
                <div className="flex items-center justify-between mb-3 border-b-2 border-app-border pb-2">
                  <h3 className="text-xs uppercase text-app-text font-black tracking-widest flex items-center gap-2">
                    <Sparkles size={15} className="text-amber-500" /> Saldırıda Kullanılan Kahraman, Pet ve Ekipman Dizilimi (`armyShareCode`)
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {activeOption.heroes.map((h) => (
                    <div
                      key={h.id}
                      className="bg-app-cardSubtle border-2 border-app-border rounded-xl p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-black text-app-text">
                        <span>{h.name}</span>
                        {h.pet && (
                          <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                            Pet: {h.pet.name}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {h.equipment.map((eq) => (
                          <div
                            key={eq.id}
                            className="text-xs font-bold px-2 py-1 rounded bg-app-card border border-app-border text-app-text"
                          >
                            {eq.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deployed Troops Grid */}
            <div>
              <div className="flex items-center justify-between mb-4 border-b-2 border-app-border pb-2">
                <h3 className="text-xs uppercase text-app-text font-black tracking-widest flex items-center gap-2">
                  <Swords size={16} className="text-red-500" /> Tespit Edilen Saldırı Ordusu Birlikleri ({currentArmyName})
                </h3>
                <span className="text-[11px] font-bold text-app-muted">
                  Kaynak: {currentSourceLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-3">
                <h4 className="text-xs uppercase text-app-text font-black tracking-widest flex items-center gap-2 border-b-2 border-app-border pb-2">
                  <Zap size={15} className="text-purple-500" /> Büyüler
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

              <div className="space-y-3">
                <h4 className="text-xs uppercase text-app-text font-black tracking-widest flex items-center gap-2 border-b-2 border-app-border pb-2">
                  <Shield size={15} className="text-amber-500" /> Kuşatma Makinesi
                </h4>
                {displayedSiege ? (
                  <UnitCard unit={displayedSiege} type="siege" />
                ) : (
                  <div className="text-xs font-bold text-app-muted">Yok</div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-xs uppercase text-app-text font-black tracking-widest flex items-center gap-2 border-b-2 border-app-border pb-2">
                  <ScrollText size={15} className="text-emerald-500" /> Klan Kalesi
                </h4>
                <div className="space-y-2">
                  {displayedCc.length === 0 ? (
                    <div className="text-xs font-bold text-app-muted">Yok</div>
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
          <div className="pt-4 border-t-2 border-app-border">
            <div className="bg-app-cardSubtle border-2 border-app-border rounded-xl p-4 space-y-3">
              <h4 className="text-xs uppercase text-app-text font-black tracking-widest flex items-center gap-2">
                <Trophy size={15} className="text-amber-500" /> CWL / Savaş Saldırıları ({player.warAttacks.length})
              </h4>
              <div className="space-y-2">
                {player.warAttacks.map((atk, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-app-card border border-app-border flex items-center justify-between text-xs font-bold text-app-text"
                  >
                    <div>
                      Hedef: #{atk.defenderMapPosition || "?"}{" "}
                      {atk.defenderName || atk.defenderTag}
                      {atk.defenderTownHall ? ` (TH${atk.defenderTownHall})` : ""}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500 font-black">
                        {atk.stars}★
                      </span>
                      <span className="text-app-muted">
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
        <div className="pt-4 border-t-2 border-app-border space-y-3">
          <div className="bg-app-cardSubtle border-2 border-app-border rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-app-border pb-2.5">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-rose-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-app-text">
                  Savunma Analizi — 3 Yıldız Yediği Ordular ({player.threeStarDefenseCount || 0})
                </h4>
              </div>
              <span className="text-[11px] font-bold text-app-muted">
                Toplam {player.totalRankedDefenses || 0} Ranked Savunma
              </span>
            </div>

            {!player.threeStarDefenses || player.threeStarDefenses.length === 0 ? (
              <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-lg flex items-center gap-2">
                <Check size={14} />
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
                    className="p-3.5 rounded-xl bg-app-card border-2 border-app-border space-y-2.5 text-xs shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app-border pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-black text-[10px] border border-rose-500/30">
                          100% (3★)
                        </span>
                        <span className="font-black text-sm text-app-text">
                          {def.armyName}
                        </span>
                        <span className="text-[11px] font-bold text-app-muted">
                          (Saldıran: <strong className="text-app-text">{def.opponentName}</strong> • TH{def.opponentTownHallLevel || "?"})
                        </span>
                      </div>
                      {def.armyLink && (
                        <a
                          href={def.armyLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Copy size={11} /> Orduyu Kopyala
                        </a>
                      )}
                    </div>
                    {/* Unit details */}
                    {def.troops && def.troops.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-black uppercase text-app-muted tracking-wider">
                          Kullanılan Birlikler & Büyüler:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {def.troops.map((u, uIdx) => (
                            <span
                              key={`tu-${uIdx}`}
                              className="px-2 py-0.5 rounded-md bg-app-cardSubtle border border-app-border text-[10px] font-bold text-app-text"
                            >
                              {u.count}x {u.name}
                            </span>
                          ))}
                          {def.spells &&
                            def.spells.map((s, sIdx) => (
                              <span
                                key={`ts-${sIdx}`}
                                className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/25 text-[10px] font-bold text-purple-400"
                              >
                                {s.count}x {s.name}
                              </span>
                            ))}
                          {def.siegeMachines &&
                            def.siegeMachines.map((sg, sgIdx) => (
                              <span
                                key={`tsg-${sgIdx}`}
                                className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-[10px] font-bold text-amber-400"
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
    <div className="w-full max-w-6xl mx-auto space-y-6 font-sans">
      {/* Top CWL Clan Tag Search & Roster Control Bar */}
      <div className="bg-app-card rounded-2xl border-2 border-app-border p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1">
            <Search
              size={18}
              className="text-amber-600 dark:text-amber-400 shrink-0"
            />
            <input
              type="text"
              value={clanTagInput}
              onChange={(e) => setClanTagInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && handleScoutClan(clanTagInput, false)
              }
              placeholder="CWL Klan Etiketi Girin (Örn: #2PP)"
              className="w-full px-4 py-2.5 rounded-xl bg-app-cardSubtle border-2 border-app-border text-sm font-bold text-app-text focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleScoutClan(clanTagInput, false)}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider border-2 border-amber-500 shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Swords size={15} />
              {loading ? "Taranıyor..." : "CWL Rakip Kadrosunu Çek"}
            </button>

            <button
              onClick={() => handleScoutClan(clanTagInput, true)}
              disabled={loading}
              title="Önbelleği Atla ve Canlı Yenile"
              className="p-2.5 rounded-xl bg-app-cardSubtle hover:bg-app-card border-2 border-app-border text-app-text cursor-pointer"
            >
              <RefreshCw size={15} className={cn(loading && "animate-spin")} />
            </button>

            {/* View Toggle: Single Player vs All Roster Cards */}
            <div className="flex items-center bg-app-cardSubtle p-1 rounded-xl border-2 border-app-border">
              <button
                onClick={() => setViewMode("single")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer",
                  viewMode === "single"
                    ? "bg-blue-600 text-white"
                    : "text-app-muted hover:text-app-text"
                )}
              >
                <User size={13} /> Seçili Oyuncu
              </button>
              <button
                onClick={() => setViewMode("all")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer",
                  viewMode === "all"
                    ? "bg-blue-600 text-white"
                    : "text-app-muted hover:text-app-text"
                )}
              >
                <LayoutGrid size={13} /> Tüm Kadro ({sortedOpponents.length})
              </button>
            </div>
          </div>
        </div>

        {/* Round / Battle Day Switcher Bar */}
        {report && report.roundsSummary && report.roundsSummary.length > 0 && (
          <div className="pt-3 border-t-2 border-app-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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
                      "px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 border-2 transition-all cursor-pointer",
                      isSelected
                        ? "bg-blue-600 border-blue-500 text-white shadow-md scale-[1.02]"
                        : inWarRound
                        ? "bg-app-cardSubtle border-app-border text-app-text hover:border-blue-500/50"
                        : "opacity-40 cursor-not-allowed bg-app-cardSubtle border-app-border text-app-muted"
                    )}
                  >
                    <Swords size={14} className={isSelected ? "text-amber-300" : "text-blue-500"} />
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
                      "px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 border-2 transition-all cursor-pointer",
                      isSelected
                        ? "bg-amber-600 border-amber-500 text-white shadow-md scale-[1.02]"
                        : prepRound
                        ? "bg-app-cardSubtle border-app-border text-app-text hover:border-amber-500/50"
                        : "opacity-50 cursor-not-allowed bg-app-cardSubtle border-app-border text-app-muted"
                    )}
                  >
                    <Shield size={14} className={isSelected ? "text-amber-200" : "text-amber-500"} />
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
            <div className="flex items-center gap-2 self-end md:self-auto">
              <span className="text-[11px] font-black uppercase text-app-muted tracking-wider">
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
                className="px-3 py-1.5 rounded-xl bg-app-cardSubtle border-2 border-app-border text-xs font-black text-app-text cursor-pointer focus:outline-none focus:border-blue-500"
              >
                {report.roundsSummary.map((r) => (
                  <option
                    key={r.roundNumber}
                    value={r.roundNumber}
                    disabled={r.state === "unrevealed"}
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
          <div className="p-3.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center gap-3 text-xs font-bold text-amber-500">
            <Shield size={18} className="shrink-0" />
            <span>
              <strong>Hazırlık Günü</strong> — Bu tur için savaş henüz başlamadı. Savaş içi saldırı sonuçları oluşmadığından yalnızca rakip kadro, Belediye Seviyesi ve ranked Battle Log analizleri gösterilmektedir.
            </span>
          </div>
        )}

        {statusMsg && (
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2">
            {statusMsg}
          </div>
        )}

        {/* Opponent Roster List & Table */}
        {((report && sortedOpponents.length > 0) || loading) && (
          <div className="pt-3 border-t-2 border-app-border space-y-4">
            {/* Filter Buttons & Clan Info Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFilterChange("cwl")}
                  disabled={loading}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border-2",
                    rosterFilter === "cwl"
                      ? "bg-amber-600 text-white border-amber-500 shadow-sm"
                      : "bg-app-cardSubtle text-app-muted hover:text-app-text border-app-border"
                  )}
                >
                  <Swords size={13} /> CWL Kadrosu ({cwlCount})
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange("all")}
                  disabled={loading}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border-2",
                    rosterFilter === "all"
                      ? "bg-amber-600 text-white border-amber-500 shadow-sm"
                      : "bg-app-cardSubtle text-app-muted hover:text-app-text border-app-border"
                  )}
                >
                  <Users size={13} /> Tüm Klan Üyeleri ({allCount})
                </button>
              </div>

              {report && (
                <div className="text-xs font-bold text-app-muted">
                  İncelenen Klan:{" "}
                  <strong className="text-app-text">
                    {report.opponentClan?.name || report.clanName || clanTagInput} (
                    {report.opponentClan?.tag || report.clanTag || clanTagInput})
                  </strong>{" "}
                  • Tur {report.roundNumber || 1} • Durum:{" "}
                  <span className="uppercase text-blue-600 dark:text-blue-400 font-black">
                    {report.warState || "preparation"}
                  </span>
                </div>
              )}
            </div>

            {/* Compact Roster & Real Battlelog Army Table */}
            <div className="overflow-x-auto rounded-xl border border-app-border shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-app-cardSubtle border-b-2 border-app-border font-black uppercase tracking-wider text-app-text">
                    <th className="py-2.5 px-3 w-12">#</th>
                    <th className="py-2.5 px-3 min-w-[160px]">Rakip Oyuncu</th>
                    <th className="py-2.5 px-3 w-16">TH</th>
                    <th className="py-2.5 px-3 min-w-[240px]">Tespit Edilen Saldırı Ordusu</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Ana Birlikler</th>
                    <th className="py-2.5 px-3 min-w-[150px]">Savunma (3★)</th>
                    <th className="py-2.5 px-3 text-right min-w-[160px]">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-app-border font-bold text-app-text">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, sIdx) => (
                      <tr
                        key={`skeleton-${sIdx}`}
                        className="animate-pulse border-b border-app-border"
                      >
                        <td className="py-3 px-3">
                          <div className="h-4 w-6 bg-app-border rounded" />
                        </td>
                        <td className="py-3 px-3">
                          <div className="h-4 w-28 bg-app-border rounded mb-1" />
                          <div className="h-3 w-16 bg-app-border/60 rounded" />
                        </td>
                        <td className="py-3 px-3">
                          <div className="h-5 w-12 bg-app-border rounded" />
                        </td>
                        <td className="py-3 px-3">
                          <div className="h-4 w-36 bg-app-border rounded mb-1" />
                          <div className="h-3 w-24 bg-app-border/60 rounded" />
                        </td>
                        <td className="py-3 px-3">
                          <div className="h-5 w-32 bg-app-border rounded" />
                        </td>
                        <td className="py-3 px-3">
                          <div className="h-5 w-24 bg-app-border rounded" />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="h-6 w-24 bg-app-border rounded ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : sortedOpponents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-xs font-bold text-app-muted"
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
                              "cursor-pointer transition-colors hover:bg-app-cardSubtle/70",
                              idx === selectedIndex && "bg-blue-600/5",
                              hasNoAttacks && "opacity-60"
                            )}
                          >
                            <td className="py-2.5 px-3 text-app-muted font-bold">
                              #{opp.mapPosition || idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-app-text">
                                  {opp.opponentName}
                                </span>
                                {opp.isCwl && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black">
                                    <Swords size={10} /> CWL
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-app-muted font-bold">
                                {opp.playerTag}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-red-600/10 text-red-600 dark:text-red-400 border border-red-500/30 font-black text-xs">
                                TH{opp.townHallLevel}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {detected ? (
                                <div className="space-y-1">
                                  <div className="font-black text-blue-600 dark:text-blue-400">
                                    {opp.armyName ||
                                      opp.inferredArchetype ||
                                      "Bilinmeyen Ordu"}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                    {opp.sourceBadge === "Ranked" ||
                                    opp.armySource === "ranked" ? (
                                      <span className="px-1.5 py-0.5 rounded bg-blue-600/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 font-black">
                                        Ranked
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-600/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-black">
                                        Ganimet (ranked yok)
                                      </span>
                                    )}
                                    {opp.warning && (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                                        {opp.warning}
                                      </span>
                                    )}
                                    {opp.armySummary ? (
                                      <span className="text-app-muted font-bold">
                                        {opp.armySummary}
                                      </span>
                                    ) : opp.armySourceLabel ? (
                                      <span className="text-app-muted font-bold">
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
                                      className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-app-cardSubtle hover:bg-app-border border border-app-border text-[10px] font-extrabold text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
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
                                  <div className="font-bold text-app-muted">
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
                                      className="px-1.5 py-0.5 rounded bg-app-cardSubtle border border-app-border text-[10px] font-bold text-app-text"
                                    >
                                      {t.name} x{t.count}
                                    </span>
                                  ))}
                                  {opp.troops.length > 4 && (
                                    <span className="px-1 py-0.5 text-[10px] text-app-muted font-bold">
                                      +{opp.troops.length - 4}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-app-muted font-bold">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {opp.threeStarDefenseCount && opp.threeStarDefenseCount > 0 ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30 w-fit">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    {opp.threeStarDefenseCount}x 3★ Yedi
                                  </span>
                                  {opp.primaryDefenseArmy && (
                                    <span
                                      className="text-[10px] font-bold text-app-muted truncate max-w-[150px]"
                                      title={opp.primaryDefenseArmy}
                                    >
                                      {opp.primaryDefenseArmy}
                                    </span>
                                  )}
                                </div>
                              ) : opp.totalRankedDefenses && opp.totalRankedDefenses > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 w-fit">
                                  <Shield size={10} /> 3★ Yok ({opp.totalRankedDefenses} Savunma)
                                </span>
                              ) : (
                                <span className="text-[11px] text-app-muted font-bold">—</span>
                              )}
                            </td>
                            <td
                              className="py-2.5 px-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {detected && rowCopyUrl ? (
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  <a
                                    href={rowCopyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-sm"
                                    title="Clash of Clans oyununda aç"
                                  >
                                    <ExternalLink size={11} /> Ordu Kopyala
                                  </a>
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleCopyRowCode(e, rowCode, idx)
                                    }
                                    className="px-2 py-1 rounded-lg bg-app-cardSubtle hover:bg-app-card border border-app-border text-app-text text-[10px] font-black inline-flex items-center gap-1 cursor-pointer"
                                    title="Ordu kodunu kopyala"
                                  >
                                    {copiedRowIdx === idx ? (
                                      <Check
                                        size={11}
                                        className="text-emerald-500"
                                      />
                                    ) : (
                                      <Copy size={11} />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-app-muted font-bold">
                                  -
                                </span>
                              )}
                            </td>
                          </tr>

                          {/* Accordion Row for Other Detected Armies */}
                          {isRowExpanded && hasMultipleArmies && (
                            <tr className="bg-app-cardSubtle/40 border-b-2 border-app-border">
                              <td colSpan={7} className="p-3 pl-6 sm:pl-10">
                                <div className="bg-app-card rounded-xl border-2 border-app-border p-3.5 space-y-3 shadow-sm">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app-border pb-2 text-xs font-black text-app-text">
                                    <span className="flex items-center gap-1.5">
                                      <Sparkles
                                        size={13}
                                        className="text-amber-500"
                                      />
                                      {opp.opponentName} için Diğer Tespit Edilen Ordular ({recentArmies.length - 1})
                                    </span>
                                    <span className="text-[10px] text-app-muted font-bold">
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
                                          className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2.5 rounded-lg bg-app-cardSubtle border border-app-border"
                                        >
                                          <div className="space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="text-xs font-black text-app-text">
                                                {altArmy.armyName ||
                                                  `Alternatif Ordu #${altIdx + 2}`}
                                              </span>
                                              {altArmy.sourceBadge === "Ranked" ? (
                                                <span className="px-1.5 py-0.5 rounded bg-blue-600/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 text-[10px] font-black">
                                                  Ranked
                                                </span>
                                              ) : (
                                                <span className="px-1.5 py-0.5 rounded bg-amber-600/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black">
                                                  Ganimet (ranked yok)
                                                </span>
                                              )}
                                              {altArmy.summary && (
                                                <span className="text-[11px] font-bold text-app-muted">
                                                  {altArmy.summary}
                                                </span>
                                              )}
                                              {altArmy.avgDestruction !== undefined &&
                                                altArmy.avgDestruction > 0 && (
                                                  <span className="text-[10px] text-app-muted font-bold">
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
                                                        className="px-1.5 py-0.5 rounded bg-app-card border border-app-border text-[10px] font-bold text-app-text"
                                                      >
                                                        {t.name} x{t.count}
                                                      </span>
                                                    ))}
                                                  {altArmy.troops.length > 5 && (
                                                    <span className="px-1 py-0.5 text-[10px] text-app-muted font-bold">
                                                      +{altArmy.troops.length - 5}
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                          </div>

                                          {altLink && (
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <a
                                                href={altLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-sm"
                                              >
                                                <ExternalLink size={11} /> Ordu Kopyala
                                              </a>
                                              <button
                                                type="button"
                                                onClick={(e) =>
                                                  handleCopyCustomCode(
                                                    e,
                                                    altCode
                                                  )
                                                }
                                                className="px-2 py-1 rounded-lg bg-app-card hover:bg-app-cardSubtle border border-app-border text-app-text text-[10px] font-black inline-flex items-center gap-1 cursor-pointer"
                                              >
                                                {isCopied ? (
                                                  <Check
                                                    size={11}
                                                    className="text-emerald-500"
                                                  />
                                                ) : (
                                                  <Copy size={11} />
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
              <div className="px-4 py-2.5 text-[11px] font-medium text-app-muted bg-app-cardSubtle/60 border-t-2 border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span>
                  Son battle log kayıtlarına göre. Ranked saldırısı olmayan oyuncularda ganimet saldırıları gösterilir.
                </span>
                <span>
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
