"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Swords, Hammer, Shield, AlertCircle, RefreshCw, Info } from "lucide-react";
import {
  GraySegmented,
  SkeletonBlock,
  SectionPanel,
  GameButton,
  type GraySegmentedItem,
} from "@/components/game";
import PlayerHeaderSection from "./PlayerHeaderSection";
import LegendTournamentPanel from "./LegendTournamentPanel";
import PlayerArmySection from "./PlayerArmySection";
import BuilderBaseSection from "./BuilderBaseSection";
import PlayerBattleLogSection from "./PlayerBattleLogSection";
import type {
  PlayerProfileViewData,
  BattleLogEntry,
  ImportedPlayerForOre,
  UnitItem,
} from "./types";
import { safeFetchJson } from "@/lib/apiClient";
import {
  matchLeagueTo37Tiers,
  getLeagueTierById,
} from "@/lib/gemIncomeConfig";
import { useLanguage } from "@/lib/i18n";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type VillageTab = "home" | "builderBase" | "clanCapital";

export interface PlayerProfileViewProps {
  tag?: string;
  player?: PlayerProfileViewData | null;
  battleLog?: BattleLogEntry[];
  onImportPlayerToOre?: (player: ImportedPlayerForOre) => void;
  onViewClan?: (clanTag: string) => void;
  className?: string;
}

const KNOWN_PET_NAMES = new Set([
  "L.A.S.S.I",
  "LASSI",
  "Electro Owl",
  "Mighty Yak",
  "Unicorn",
  "Frosty",
  "Diggy",
  "Poison Lizard",
  "Phoenix",
  "Spirit Fox",
  "Angry Jelly",
  "Snoop",
  "Sneezy",
  "Walrus",
  "Greedy Raven",
]);

/**
 * PlayerProfileView
 * Master Player Profile View:
 * 1. Upper GraySegmented control: Home Village | Builder Base | Clan Capital (+ inline API note)
 * 2. Home Village header (PlayerHeaderSection)
 * 3. Legend Tournament Panel (LegendTournamentPanel, strictly when legendStatistics is present)
 * 4. Army & Troops / Town Hall layout (PlayerArmySection)
 * 5. Recent Battle Log (PlayerBattleLogSection)
 * 6. Builder Base view when Builder Base tab is selected
 */
export default function PlayerProfileView({
  tag,
  player: propPlayer,
  battleLog: propBattleLog,
  onImportPlayerToOre,
  onViewClan,
  className,
}: PlayerProfileViewProps) {
  const { t, locale, getApiErrorMessage } = useLanguage();
  const [activeVillageTab, setActiveVillageTab] = useState<VillageTab>("home");
  const [loading, setLoading] = useState<boolean>(!propPlayer && Boolean(tag));
  const [fetchError, setFetchError] = useState<unknown | null>(null);
  const [fetchedPlayer, setFetchedPlayer] = useState<PlayerProfileViewData | null>(null);
  const [fetchedBattleLog, setFetchedBattleLog] = useState<BattleLogEntry[]>([]);

  const activePlayer = propPlayer || fetchedPlayer;
  const activeBattleLog = propBattleLog || fetchedBattleLog;

  const loadPlayerData = useCallback(async (playerTag: string) => {
    const cleanTag = playerTag.replace(/^#/, "").trim();
    if (!cleanTag) return;

    setLoading(true);
    setFetchError(null);

    try {
      const [data, battleData] = await Promise.all([
        safeFetchJson<any>(`/api/v1/players/${encodeURIComponent(cleanTag)}`),
        safeFetchJson<any>(`/api/v1/players/${encodeURIComponent(cleanTag)}/battlelog`).catch(
          () => null
        ),
      ]);

      const th = data.townHallLevel || 1;
      const rawHeroList = Array.isArray(data.heroes) ? data.heroes : [];

      // Match multiplayer league / leagueTier to the 37 tiers table
      let matchedTier: ReturnType<typeof getLeagueTierById> | null = null;
      if (
        data.leagueTier?.id &&
        data.leagueTier.id >= 105000001 &&
        data.leagueTier.id <= 105000036
      ) {
        matchedTier = getLeagueTierById(data.leagueTier.id);
      } else if (data.leagueTier?.name && data.leagueTier.name.toLowerCase() !== "unranked") {
        const byName = matchLeagueTo37Tiers(data.leagueTier.name, data.leagueTier.id);
        if (!byName.isUnknown) matchedTier = byName;
      }
      if (!matchedTier && (data.league?.id || data.league?.name)) {
        const fromLeague = matchLeagueTo37Tiers(data.league.name, data.league.id);
        if (!fromLeague.isUnknown) matchedTier = fromLeague;
      }
      if (!matchedTier) {
        matchedTier = getLeagueTierById(data.leagueTier?.id || 105000000);
      }

      // Extract troops & pets cleanly
      const rawTroops: UnitItem[] = Array.isArray(data.troops) ? data.troops : [];
      const rawSpells: UnitItem[] = Array.isArray(data.spells) ? data.spells : [];
      const explicitPets: UnitItem[] = Array.isArray(data.pets) ? data.pets : [];

      const detectedPets: UnitItem[] = [...explicitPets];
      const standardTroops: UnitItem[] = [];

      for (const tr of rawTroops) {
        if (KNOWN_PET_NAMES.has(tr.name)) {
          if (!detectedPets.some((p) => p.name === tr.name)) {
            detectedPets.push(tr);
          }
        } else {
          standardTroops.push(tr);
        }
      }

      const resolvedLeague =
        data.league ||
        (data.leagueTier
          ? {
              id: data.leagueTier.id,
              name: data.leagueTier.name,
              iconUrls:
                data.leagueTier.iconUrls ||
                (matchedTier.iconSmall
                  ? { small: matchedTier.iconSmall, medium: matchedTier.iconSmall }
                  : undefined),
            }
          : matchedTier.iconSmall
          ? {
              id: matchedTier.id,
              name: matchedTier.name,
              iconUrls: { small: matchedTier.iconSmall, medium: matchedTier.iconSmall },
            }
          : undefined);

      const parsedPlayer: PlayerProfileViewData = {
        tag: data.tag || `#${cleanTag}`,
        name: data.name || data.tag || `#${cleanTag}`,
        townHallLevel: th,
        townHallWeaponLevel: data.townHallWeaponLevel,
        expLevel: data.expLevel || 1,
        leagueTierId: matchedTier.id,
        leagueName: locale === "tr" ? matchedTier.nameTr : matchedTier.name,
        originalLeagueName: data.leagueTier?.name || data.league?.name || "Unranked",
        trophies: data.trophies || 0,
        bestTrophies: data.bestTrophies || 0,
        warStars: data.warStars || 0,
        attackWins: data.attackWins,
        defenseWins: data.defenseWins,
        donations: data.donations,
        donationsReceived: data.donationsReceived,
        role: data.role,
        warPreference: data.warPreference,
        clanCapitalContributions: data.clanCapitalContributions,
        builderHallLevel: data.builderHallLevel,
        builderBaseTrophies: data.builderBaseTrophies,
        bestBuilderBaseTrophies: data.bestBuilderBaseTrophies,
        builderBaseLeague: data.builderBaseLeague,
        clan: data.clan,
        league: resolvedLeague,
        labels: data.labels,
        legendStatistics: data.legendStatistics,
        heroes: rawHeroList,
        builderHeroes: data.builderHeroes,
        heroEquipment: data.heroEquipment || [],
        pets: detectedPets,
        troops: standardTroops,
        spells: rawSpells,
      };

      setFetchedPlayer(parsedPlayer);

      // Battlelog extraction (strictly ranked attacks/defenses)
      if (battleData && Array.isArray(battleData.items)) {
        const rawItems: BattleLogEntry[] = battleData.items;
        const rankedOnly = rawItems.filter((item) => item && item.battleType === "ranked");
        setFetchedBattleLog(rankedOnly);
      } else {
        setFetchedBattleLog([]);
      }
    } catch (err: unknown) {
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    if (!propPlayer && tag) {
      loadPlayerData(tag);
    }
  }, [propPlayer, tag, loadPlayerData]);

  // Determine whether Builder Base data exists in the API response
  const hasBuilderBase = useMemo(() => {
    if (!activePlayer) return false;
    return Boolean(
      (activePlayer.builderHallLevel && activePlayer.builderHallLevel > 0) ||
        (activePlayer.builderBaseTrophies && activePlayer.builderBaseTrophies > 0) ||
        (activePlayer.builderHeroes && activePlayer.builderHeroes.length > 0)
    );
  }, [activePlayer]);

  // Return to Home tab if switched to a player without Builder Base data
  useEffect(() => {
    if (activeVillageTab === "builderBase" && !hasBuilderBase) {
      setActiveVillageTab("home");
    }
  }, [activeVillageTab, hasBuilderBase]);

  // GraySegmented Sub-Tab Items
  const segmentedItems = useMemo<GraySegmentedItem<VillageTab>[]>(() => {
    return [
      {
        id: "home",
        label: t.player.tabHome,
        icon: <Swords size={16} />,
      },
      {
        id: "builderBase",
        label: t.player.tabBuilder,
        icon: <Hammer size={16} />,
        disabled: !hasBuilderBase,
        tooltip: hasBuilderBase ? undefined : t.player.builderNotUnlocked,
      },
      {
        id: "clanCapital",
        label: t.player.tabCapital,
        icon: <Shield size={16} />,
        disabled: true,
        tooltip: t.player.tabCapitalUnavailable,
      },
    ];
  }, [
    hasBuilderBase,
    t.player.tabHome,
    t.player.tabBuilder,
    t.player.tabCapital,
    t.player.builderNotUnlocked,
    t.player.tabCapitalUnavailable,
  ]);

  // Loading skeleton state
  if (loading && !activePlayer) {
    return (
      <div className={cn("w-full mt-0 p-0 font-sans flex flex-col", className)}>
        {/* Sub-tab segmented bar skeleton */}
        <div className="flex gap-1.5 items-end overflow-x-auto scrollbar-none flex-nowrap">
          <SkeletonBlock height="42px" className="w-28 rounded-t-xl rounded-b-none" />
          <SkeletonBlock height="38px" className="w-32 rounded-t-xl rounded-b-none" />
          <SkeletonBlock height="38px" className="w-32 rounded-t-xl rounded-b-none" />
        </div>

        {/* Header section skeleton */}
        <SectionPanel className="p-4 space-y-4 mt-0 rounded-tl-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <SkeletonBlock width="52px" height="52px" className="rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock height="22px" width="60%" />
                <SkeletonBlock height="14px" width="40%" />
              </div>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2">
              <SkeletonBlock width="48px" height="48px" className="rounded-full" />
              <SkeletonBlock height="16px" width="120px" />
            </div>
            <div className="space-y-2">
              <SkeletonBlock height="16px" width="80px" />
              <SkeletonBlock height="24px" width="100px" />
            </div>
          </div>
          <SkeletonBlock height="40px" className="w-full rounded-xl" />
        </SectionPanel>

        {/* Army skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
          <div className="lg:col-span-5 space-y-4">
            <SkeletonBlock height="220px" className="rounded-2xl" />
            <SkeletonBlock height="180px" className="rounded-2xl" />
          </div>
          <div className="lg:col-span-7 space-y-4">
            <SkeletonBlock height="180px" className="rounded-2xl" />
            <SkeletonBlock height="160px" className="rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state (high-contrast alert on light cream GameWindow)
  if (fetchError !== null && !activePlayer) {
    const resolvedError = getApiErrorMessage(fetchError, t.player.playerNotFoundError);
    return (
      <div className={cn("p-2 sm:p-4 space-y-4 font-sans", className)}>
        <div
          role="alert"
          className="bg-[#FDF2F2] border-2 border-[#C53030] rounded-2xl p-5 text-center space-y-3 shadow-sm"
        >
          <div className="flex items-center justify-center gap-2 text-[#8F1D18] font-bold text-sm">
            <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
            <span>{resolvedError}</span>
          </div>
          {tag && (
            <div className="pt-1">
              <GameButton
                variant="red"
                size="sm"
                onClick={() => loadPlayerData(tag)}
                icon={<RefreshCw size={14} />}
                className="min-h-[44px] px-5"
              >
                {t.common.retry}
              </GameButton>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Empty state (high-contrast dark stone ink on light cream GameWindow)
  if (!activePlayer) {
    return (
      <div className={cn("p-4 font-sans", className)}>
        <div className="bg-[#F6F1E7] border border-[#C9B99F] rounded-2xl p-6 text-center text-[#2B1F16] text-sm font-semibold shadow-sm">
          <p className="text-[#4A3E35]">{t.player.playerNotFoundError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full -mt-3 sm:-mt-6 font-sans flex flex-col", className)}>
      {/* 1. Top Segmented Control + Inline Capital Availability Note */}
      <div className="w-full flex items-end pl-2 sm:pl-4 overflow-x-auto scrollbar-none flex-nowrap border-b-2 border-[#5A5552]/50">
        <GraySegmented<VillageTab>
          items={segmentedItems}
          activeId={activeVillageTab}
          onChange={(id) => setActiveVillageTab(id)}
          className="w-full sm:w-auto"
        />
      </div>
      <div className="mt-2 px-2 sm:px-4 flex items-center gap-1.5 text-xs font-medium text-[#4A3E35]">
        <Info size={14} className="text-[#7D5420] shrink-0" aria-hidden="true" />
        <span>
          {t.player.tabCapital}: {t.player.tabCapitalUnavailable}
        </span>
      </div>

      {/* 2. Home Village Tab View */}
      {activeVillageTab === "home" && (
        <div className="space-y-4 pt-4 sm:pt-5">
          <PlayerHeaderSection
            player={activePlayer}
            onViewClan={onViewClan}
            className="mt-0"
          />

          {/* Legend Tournament Panel (strictly when legendStatistics is present) */}
          {activePlayer.legendStatistics && (
            <LegendTournamentPanel stats={activePlayer.legendStatistics} />
          )}

          {/* Army & Town Hall Layout */}
          <PlayerArmySection
            player={activePlayer}
            onImportPlayerToOre={onImportPlayerToOre}
          />

          {/* Recent Battle Log (Ranked) */}
          <PlayerBattleLogSection
            battleLog={activeBattleLog}
            loading={loading}
          />
        </div>
      )}

      {/* 3. Builder Base Tab View */}
      {activeVillageTab === "builderBase" && (
        <div className="space-y-4 pt-4 sm:pt-5">
          <BuilderBaseSection player={activePlayer} className="mt-0" />
        </div>
      )}
    </div>
  );
}
