"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Swords, Hammer, Shield, AlertCircle, RefreshCw, Landmark } from "lucide-react";
import GraySegmented, { type GraySegmentedItem } from "@/components/game/GraySegmented";
import SkeletonBlock from "@/components/game/SkeletonBlock";
import GameButton from "@/components/game/GameButton";
import { safeFetchJson } from "@/lib/apiClient";
import { useLanguage } from "@/lib/i18n";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ClanHeaderCard from "./ClanHeaderCard";
import ClanMemberList from "./ClanMemberList";
import ClanWarLogModal from "./ClanWarLogModal";
import type { ClanDetails, ClanDetailsViewProps, ClanVillageTab, ClanMember } from "./types";
import "./clan.css";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type { ClanDetailsViewProps };

const DEFAULT_FALLBACK_TAG = "UUJL8CYP";

function cleanTag(tag: string): string {
  return tag.replace(/^#/, "").toUpperCase();
}

export default function ClanDetailsView({
  clan: propClan,
  clanTag: propClanTag,
  isLoading: propLoading,
  errorMessage: propError,
  highlightPlayerTag,
  onSelectPlayer,
  onScoutClanInCwl,
  onOpenWarLog,
  onRefresh,
  className,
}: ClanDetailsViewProps) {
  const { isTr, t, fmtNum, getApiErrorMessage } = useLanguage();

  const [villageTab, setVillageTab] = useState<ClanVillageTab>("home");
  const [fetchedClan, setFetchedClan] = useState<ClanDetails | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isWarLogOpen, setIsWarLogOpen] = useState<boolean>(false);

  const villageTabs = useMemo<GraySegmentedItem<ClanVillageTab>[]>(
    () => [
      { id: "home", label: t.clan.tabHome, icon: <Swords className="w-4 h-4 shrink-0" /> },
      { id: "builderBase", label: t.clan.tabBuilder, icon: <Hammer className="w-4 h-4 shrink-0" /> },
      { id: "capital", label: t.clan.tabCapital, icon: <Shield className="w-4 h-4 shrink-0" /> },
    ],
    [t]
  );

  // Determine current active clan tag from prop or URL hash (e.g. #/klan/UUJL8CYP?vurgula=...)
  const targetClanTag = useMemo(() => {
    if (propClan?.tag) return cleanTag(propClan.tag);
    if (propClanTag) return cleanTag(propClanTag);

    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const match = hash.match(/^#\/klan\/([A-Za-z0-9]+)/);
      if (match && match[1]) {
        return cleanTag(match[1]);
      }
    }
    return DEFAULT_FALLBACK_TAG;
  }, [propClan?.tag, propClanTag]);

  // Fetch clan if not provided in props
  const loadClanData = useCallback(
    async (tag: string) => {
      if (propClan) return;
      setIsFetching(true);
      setFetchError(null);
      try {
        const data = await safeFetchJson<ClanDetails>(`/api/v1/clans/${encodeURIComponent(tag)}`);
        setFetchedClan(data);
      } catch (err: unknown) {
        setFetchError(getApiErrorMessage(err));
      } finally {
        setIsFetching(false);
      }
    },
    [propClan, getApiErrorMessage]
  );

  useEffect(() => {
    if (!propClan && targetClanTag) {
      loadClanData(targetClanTag);
    }
  }, [propClan, targetClanTag, loadClanData]);

  // Listen for hash changes if route changes to another clan
  useEffect(() => {
    const handleHashChange = () => {
      if (propClan) return;
      const hash = window.location.hash;
      const match = hash.match(/^#\/klan\/([A-Za-z0-9]+)/);
      if (match && match[1]) {
        const nextTag = cleanTag(match[1]);
        if (nextTag !== targetClanTag) {
          loadClanData(nextTag);
        }
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [propClan, targetClanTag, loadClanData]);

  const currentClan = propClan || fetchedClan;
  const isLoading = propLoading !== undefined ? propLoading : isFetching;
  const errorMessage = propError !== undefined ? propError : fetchError;

  const handleManualRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else if (targetClanTag) {
      loadClanData(targetClanTag);
    }
  };

  const handleOpenWarLog = (tag: string) => {
    if (onOpenWarLog) {
      onOpenWarLog(tag);
    } else {
      setIsWarLogOpen(true);
    }
  };

  // Build member list according to active village sub-tab
  const activeMembers: ClanMember[] = useMemo(() => {
    if (!currentClan?.memberList) return [];
    if (villageTab === "builderBase") {
      return currentClan.memberList.map((m) => ({
        ...m,
        trophies: m.builderBaseTrophies || 0,
      }));
    }
    return currentClan.memberList;
  }, [currentClan?.memberList, villageTab]);

  return (
    <div className={cn("w-full -mt-3 sm:-mt-6 flex flex-col", className)}>
      <div className="w-full space-y-0">
        {/* 1. Top Segmented Bar + Always-Visible Refresh Button */}
        <div className="w-full flex flex-col-reverse sm:flex-row sm:items-end justify-between gap-1.5 sm:gap-2 pl-1.5 sm:pl-4 pr-1 sm:pr-3 border-b-2 border-[#5A5552]/50">
          <div className="w-full sm:flex-1 min-w-0">
            <GraySegmented<ClanVillageTab>
              items={villageTabs}
              activeId={villageTab}
              onChange={(id) => setVillageTab(id)}
              className="w-full sm:w-auto"
            />
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isLoading}
            aria-label={t.common.refresh}
            title={t.common.refresh}
            className="self-end inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-3 sm:px-3.5 py-2 rounded-xl bg-[#D8CFC0]/90 hover:bg-[#C9BEAB] border border-[#9E907C] text-[#2D251E] text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shrink-0 mb-1 shadow-sm"
          >
            <RefreshCw className={cn("w-4 h-4 shrink-0", isLoading && "animate-spin")} />
            <span className="whitespace-nowrap">
              {isLoading ? t.common.refreshing : t.common.refresh}
            </span>
          </button>
        </div>

        {/* 2. Loading State */}
        {isLoading && !currentClan && (
          <div className="space-y-4 pt-4 sm:pt-6">
            <SkeletonBlock height="240px" className="rounded-2xl" />
            <SkeletonBlock height="48px" className="rounded-xl" />
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <SkeletonBlock key={i} height="60px" className="rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* 3. Error State */}
        {errorMessage && !isLoading && (
          <div
            role="alert"
            className="p-5 rounded-2xl bg-red-100 border-2 border-red-400 text-center space-y-3 mt-4"
          >
            <div className="flex items-center justify-center gap-2 text-red-900 font-bold">
              <AlertCircle className="w-5 h-5 text-red-700" />
              <span className="text-base font-black">
                {isTr ? "Klan Bilgisi Yüklenemedi" : "Unable to Load Clan Data"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-red-900 font-medium max-w-lg mx-auto">
              {errorMessage}
            </p>
            <GameButton variant="green" size="sm" onClick={handleManualRefresh} className="min-h-[44px]">
              {t.common.retry}
            </GameButton>
          </div>
        )}

        {/* 4. Loaded State */}
        {currentClan && !isLoading && (
          <div className="space-y-4 sm:space-y-5 pt-4 sm:pt-6">
            <ClanHeaderCard
              clan={currentClan}
              onScoutClanInCwl={onScoutClanInCwl}
              onOpenWarLog={handleOpenWarLog}
              className="mt-0"
            />

            {villageTab === "capital" ? (
              <div className="clan-header-panel p-5 sm:p-6 text-[#FFF8EE] space-y-4">
                <div className="flex items-center gap-2.5 border-b border-white/15 pb-3">
                  <Landmark className="w-6 h-6 text-amber-300 shrink-0" />
                  <h3 className="game-text-stroke text-lg sm:text-xl font-black">
                    {t.clan.tabCapital}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-[#281C14]/[0.92] p-4 border border-[#5B402D] space-y-1">
                    <span className="text-xs sm:text-[13px] text-[#E7D9C8] font-semibold block">
                      {isTr ? "Başkent Ligi" : "Capital League"}
                    </span>
                    <span className="text-lg font-black text-amber-300 block">
                      {currentClan.capitalLeague?.name &&
                      currentClan.capitalLeague.name.toLowerCase() !== "unranked"
                        ? currentClan.capitalLeague.name
                        : t.common.unranked}
                    </span>
                  </div>
                  <div className="rounded-xl bg-[#281C14]/[0.92] p-4 border border-[#5B402D] space-y-1">
                    <span className="text-xs sm:text-[13px] text-[#E7D9C8] font-semibold block">
                      {t.clan.capitalPoints}
                    </span>
                    <span className="text-lg font-black text-[#FFF8EE] block tabular-nums">
                      {fmtNum(currentClan.clanCapitalPoints ?? 0)}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#F5EFE6]/90 font-medium leading-relaxed">
                  {isTr
                    ? "Haftalık Başkent Baskınları tamamlandığında kazanılan Başkent Kupası ve lig ilerlemesi resmi klan profilinden derlenir."
                    : "Clan Capital league tier and capital trophy points are pulled directly from official clan data."}
                </p>
              </div>
            ) : (
              <ClanMemberList
                members={activeMembers}
                maxMembers={50}
                highlightPlayerTag={highlightPlayerTag}
                onSelectPlayer={onSelectPlayer}
                villageTab={villageTab}
              />
            )}

            {Boolean(currentClan.isWarLogPublic) && (
              <ClanWarLogModal
                clan={currentClan}
                isOpen={isWarLogOpen}
                onClose={() => setIsWarLogOpen(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
