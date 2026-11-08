"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Swords, Hammer, Shield, AlertCircle, RefreshCw } from "lucide-react";
import { GraySegmented, SkeletonBlock, SectionPanel, type GraySegmentedItem } from "@/components/game";
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
 * Master Player Profile View compliant with UI_REDESIGN.md and in-game screenshots.
 * 
 * Includes:
 * 1. Upper GraySegmented control: "Asıl Köy" | "İnşaatçı Üssü" | "Klan Başkenti"
 * 2. Asıl Köy Upper Block (PlayerHeaderSection)
 * 3. Efsane Lig Turnuva Paneli (LegendTournamentPanel, rendered only when legendStatistics is present)
 * 4. Birlikler & Belediye Binası Düzeni (PlayerArmySection)
 * 5. Ranked Savaş Geçmişi (PlayerBattleLogSection)
 * 6. Builder Base view when "İnşaatçı Üssü" tab is selected
 */
export default function PlayerProfileView({
  tag,
  player: propPlayer,
  battleLog: propBattleLog,
  onImportPlayerToOre,
  onViewClan,
  className,
}: PlayerProfileViewProps) {
  const [activeVillageTab, setActiveVillageTab] = useState<VillageTab>("home");
  const [loading, setLoading] = useState<boolean>(!propPlayer && Boolean(tag));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fetchedPlayer, setFetchedPlayer] = useState<PlayerProfileViewData | null>(null);
  const [fetchedBattleLog, setFetchedBattleLog] = useState<BattleLogEntry[]>([]);

  const activePlayer = propPlayer || fetchedPlayer;
  const activeBattleLog = propBattleLog || fetchedBattleLog;

  const loadPlayerData = useCallback(
    async (playerTag: string) => {
      const cleanTag = playerTag.replace(/^#/, "").trim();
      if (!cleanTag) return;

      setLoading(true);
      setErrorMessage(null);

      try {
        const [data, battleData] = await Promise.all([
          safeFetchJson<any>(`/api/v1/players/${encodeURIComponent(cleanTag)}`),
          safeFetchJson<any>(`/api/v1/players/${encodeURIComponent(cleanTag)}/battlelog`).catch(() => null),
        ]);

        const th = data.townHallLevel || 1;
        const rawHeroList = Array.isArray(data.heroes) ? data.heroes : [];

        // Match multiplayer league / leagueTier to the 37 tiers table
        let matchedTier: ReturnType<typeof getLeagueTierById> | null = null;
        if (data.leagueTier?.id && data.leagueTier.id >= 105000001 && data.leagueTier.id <= 105000036) {
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

        const parsedPlayer: PlayerProfileViewData = {
          tag: data.tag || `#${cleanTag}`,
          name: data.name || "Bilinmeyen Oyuncu",
          townHallLevel: th,
          townHallWeaponLevel: data.townHallWeaponLevel,
          expLevel: data.expLevel || 1,
          leagueTierId: matchedTier.id,
          leagueName: matchedTier.nameTr,
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
          league: data.league,
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
        const msg = err instanceof Error ? err.message : "Oyuncu profili yüklenirken bir hata oluştu.";
        setErrorMessage(msg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

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

  // GraySegmented Sub-Tab Items
  const segmentedItems = useMemo<GraySegmentedItem<VillageTab>[]>(() => {
    return [
      {
        id: "home",
        label: "Asıl Köy",
        icon: <Swords size={16} />,
      },
      {
        id: "builderBase",
        label: "İnşaatçı Üssü",
        icon: <Hammer size={16} />,
        disabled: !hasBuilderBase,
        tooltip: hasBuilderBase ? undefined : "Bu oyuncuda İnşaatçı Üssü verisi yok",
      },
      {
        id: "clanCapital",
        label: "Klan Başkenti",
        icon: <Shield size={16} />,
        disabled: true,
        tooltip: "Bu veri API'de yok",
      },
    ];
  }, [hasBuilderBase]);

  // Loading skeleton state
  if (loading && !activePlayer) {
    return (
      <div className={cn("space-y-4 font-sans", className)}>
        {/* Sub-tab segmented bar skeleton */}
        <div className="flex gap-2">
          <SkeletonBlock height="44px" className="flex-1 rounded-xl" />
          <SkeletonBlock height="44px" className="flex-1 rounded-xl" />
          <SkeletonBlock height="44px" className="flex-1 rounded-xl" />
        </div>

        {/* Header section skeleton */}
        <SectionPanel className="p-4 space-y-4">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
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

  // Error state
  if (errorMessage && !activePlayer) {
    return (
      <div className={cn("p-4 space-y-4 font-sans", className)}>
        <div className="bg-red-500/15 border-2 border-red-500/35 rounded-2xl p-5 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-red-300 font-bold text-sm">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
          {tag && (
            <button
              onClick={() => loadPlayerData(tag)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Yeniden Dene</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!activePlayer) {
    return (
      <div className={cn("p-6 text-center text-stone-300 text-xs font-medium", className)}>
        Görüntülenecek oyuncu profili bulunamadı. Lütfen bir oyuncu etiketi aratın.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4 font-sans", className)}>
      {/* 1. Üst Segmented Kontrol (Asıl Köy | İnşaatçı Üssü | Klan Başkenti) */}
      <GraySegmented<VillageTab>
        items={segmentedItems}
        activeId={activeVillageTab}
        onChange={(id) => setActiveVillageTab(id)}
      />

      {/* 2. Asıl Köy Sekmesi Görünümü */}
      {activeVillageTab === "home" && (
        <div className="space-y-4">
          {/* Asıl Köy Üst Blok */}
          <PlayerHeaderSection
            player={activePlayer}
            onViewClan={onViewClan}
          />

          {/* Efsane Lig Turnuvası Paneli (YALNIZCA cevapta legendStatistics varsa gösterilir) */}
          {activePlayer.legendStatistics && (
            <LegendTournamentPanel stats={activePlayer.legendStatistics} />
          )}

          {/* Birlikler & Belediye Binası Düzeni */}
          <PlayerArmySection
            player={activePlayer}
            onImportPlayerToOre={onImportPlayerToOre}
          />

          {/* Savaş Geçmişi (Ranked Battle Log) */}
          <PlayerBattleLogSection
            battleLog={activeBattleLog}
            loading={loading}
          />
        </div>
      )}

      {/* 3. İnşaatçı Üssü Sekmesi Görünümü */}
      {activeVillageTab === "builderBase" && (
        <BuilderBaseSection player={activePlayer} />
      )}
    </div>
  );
}
