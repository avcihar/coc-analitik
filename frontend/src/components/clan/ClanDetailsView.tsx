"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Swords, Hammer, Shield, AlertCircle, RefreshCw, Landmark } from "lucide-react";
import GameWindow from "@/components/game/GameWindow";
import GraySegmented, { type GraySegmentedItem } from "@/components/game/GraySegmented";
import SkeletonBlock from "@/components/game/SkeletonBlock";
import GameButton from "@/components/game/GameButton";
import { safeFetchJson } from "@/lib/apiClient";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
import ClanHeaderCard from "./ClanHeaderCard";
import ClanMemberList from "./ClanMemberList";
import ClanWarLogModal from "./ClanWarLogModal";
import type { ClanDetails, ClanDetailsViewProps, ClanVillageTab, ClanMember } from "./types";
import "./clan.css";

export type { ClanDetailsViewProps };

const VILLAGE_TABS: GraySegmentedItem<ClanVillageTab>[] = [
  { id: "home", label: "Asıl Köy", icon: <Swords className="w-4 h-4 mr-1.5" /> },
  { id: "builderBase", label: "İnşaatçı Üssü", icon: <Hammer className="w-4 h-4 mr-1.5" /> },
  { id: "capital", label: "Klan Başkenti", icon: <Shield className="w-4 h-4 mr-1.5" /> },
];

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
  const [villageTab, setVillageTab] = useState<ClanVillageTab>("home");
  const [fetchedClan, setFetchedClan] = useState<ClanDetails | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isWarLogOpen, setIsWarLogOpen] = useState<boolean>(false);

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
  const loadClanData = useCallback(async (tag: string) => {
    if (propClan) return;
    setIsFetching(true);
    setFetchError(null);
    try {
      const data = await safeFetchJson<ClanDetails>(`/api/v1/clans/${encodeURIComponent(tag)}`);
      setFetchedClan(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Klan bilgileri yüklenirken bir hata oluştu.";
      setFetchError(msg);
    } finally {
      setIsFetching(false);
    }
  }, [propClan]);

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
      <div className="w-full space-y-0 overflow-x-hidden">
        {/* 1. Üst Alt-Düğme Şeridi: Asıl Köy, İnşaatçı Üssü, Klan Başkenti - Flush at top */}
        <div className="w-full flex items-end justify-between gap-3 pl-2 sm:pl-4 overflow-x-auto scrollbar-none flex-nowrap border-b-2 border-[#5A5552]/50">
          <div className="flex-1 min-w-0">
            <GraySegmented
              items={VILLAGE_TABS}
              activeId={villageTab}
              onChange={(id) => setVillageTab(id)}
              className="w-full sm:w-auto"
            />
          </div>

          {/* Yenileme Düğmesi */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/10 hover:bg-black/20 text-gray-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0 mb-1 mr-2 sm:mr-4"
            title="Klan verilerini yenile"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            <span>Yenile</span>
          </button>
        </div>

        {/* 2. Yükleme Durumu */}
        {isLoading && !currentClan && (
          <div className="space-y-4 mt-3">
            <SkeletonBlock height="240px" className="rounded-2xl rounded-tl-none" />
            <SkeletonBlock height="48px" className="rounded-xl" />
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <SkeletonBlock key={i} height="60px" className="rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* 3. Hata Durumu */}
        {errorMessage && !isLoading && (
          <div className="p-5 rounded-2xl bg-rose-900/15 border-2 border-rose-500/40 text-center space-y-3 mt-3">
            <div className="flex items-center justify-center gap-2 text-rose-700 font-bold">
              <AlertCircle className="w-5 h-5" />
              <span className="text-base font-black">Klan Bilgisi Yüklenemedi</span>
            </div>
            <p className="text-xs text-rose-800 font-medium max-w-lg mx-auto">
              {errorMessage}
            </p>
            <GameButton variant="green" size="sm" onClick={handleManualRefresh}>
              Tekrar Dene
            </GameButton>
          </div>
        )}

        {/* 4. Başarılı Durum: Klan İçeriği */}
        {currentClan && !isLoading && (
          <div className="space-y-4 sm:space-y-5 pt-4 sm:pt-6">
            {/* Üst Bilgi Bloğu (Mavi-Gri / Harita zeminli panel) */}
            <ClanHeaderCard
              clan={currentClan}
              onScoutClanInCwl={onScoutClanInCwl}
              onOpenWarLog={handleOpenWarLog}
              className={villageTab === "home" ? "rounded-tl-none mt-0" : "mt-0"}
            />

            {/* Klan Başkenti Görünümü */}
            {villageTab === "capital" ? (
              <div className="clan-header-panel p-5 sm:p-6 text-white space-y-4">
                <div className="flex items-center gap-2.5 border-b border-white/20 pb-3">
                  <Landmark className="w-6 h-6 text-amber-300" />
                  <h3 className="game-text-stroke text-lg sm:text-xl font-black">
                    Klan Başkenti Durumu
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-black/25 p-4 border border-white/10 space-y-1">
                    <span className="text-xs text-gray-300 font-semibold block">Başkent Ligi</span>
                    <span className="text-lg font-black text-amber-300 block">
                      {currentClan.capitalLeague?.name || "Lige Yerleşmemiş"}
                    </span>
                  </div>
                  <div className="rounded-xl bg-black/25 p-4 border border-white/10 space-y-1">
                    <span className="text-xs text-gray-300 font-semibold block">Başkent Puanı</span>
                    <span className="text-lg font-black text-white block">
                      {currentClan.clanCapitalPoints?.toLocaleString() || "0"}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-200 font-medium">
                  Haftalık Başkent Baskınları tamamlandığında kazanılan Başkent Madalyaları ve klan ilerlemesi burada listelenir.
                </p>
              </div>
            ) : (
              /* Üye Listesi (klanim-uyeler.png) */
              <ClanMemberList
                members={activeMembers}
                maxMembers={50}
                highlightPlayerTag={highlightPlayerTag}
                onSelectPlayer={onSelectPlayer}
                villageTab={villageTab}
              />
            )}

            {/* Savaş Günlüğü Modalı (Yalnızca herkese açık ise açılabilir) */}
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
