"use client";

import React, { useEffect } from "react";
import { X, Swords, Flame, CheckCircle2, Lock } from "lucide-react";
import GameButton from "@/components/game/GameButton";
import { useLanguage } from "@/lib/i18n";
import type { ClanDetails } from "./types";

export interface ClanWarLogModalProps {
  clan: ClanDetails;
  isOpen: boolean;
  onClose: () => void;
}

export default function ClanWarLogModal({
  clan,
  isOpen,
  onClose,
}: ClanWarLogModalProps) {
  const { isTr, t, fmtNum, fmtPct, fmtDate } = useLanguage();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatWarFrequency = (freq?: string): string => {
    if (!freq) return isTr ? "Bilinmiyor" : "Unknown";
    const lower = freq.toLowerCase();
    if (lower === "always") return t.search.warFreqLabels.always;
    if (lower === "morethanonceperweek") return t.search.warFreqLabels.moreThanOncePerWeek;
    if (lower === "onceperweek") return t.search.warFreqLabels.oncePerWeek;
    if (lower === "lessthanonceperweek") return t.search.warFreqLabels.lessThanOncePerWeek;
    if (lower === "never") return t.search.warFreqLabels.never;
    if (lower === "unknown") return isTr ? "Bilinmiyor" : "Unknown";
    return freq;
  };

  const wins = clan.warWins ?? 0;
  const losses = clan.warLosses ?? 0;
  const ties = clan.warTies ?? 0;
  const totalWars = wins + losses + ties;
  const winRatePct = totalWars > 0 ? (wins / totalWars) * 100 : 0;

  return (
    <div
      className="clan-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="warlog-modal-title"
    >
      <div
        className="clan-modal-card bg-[#F6F1E7] border-4 border-[#4A3A2C] rounded-2xl p-4 sm:p-6 text-[#2D251E] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header & Accessible Close Button (>=44x44) */}
        <div className="flex items-center justify-between gap-3 border-b-2 border-[#C2B39C] pb-3.5 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Swords className="w-6 h-6 text-[#8B4E08] shrink-0" />
            <div className="min-w-0">
              <h3
                id="warlog-modal-title"
                className="text-lg sm:text-xl font-black text-[#2D251E] leading-tight truncate"
              >
                {t.clan.warLogTitle}
              </h3>
              <p className="text-xs sm:text-[13px] text-[#5A4A3E] font-bold truncate tabular-nums">
                {clan.name} ({clan.tag})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-[#C61318] hover:bg-[#A60E12] border-2 border-[#4A0507] text-white flex items-center justify-center shadow-sm transition-colors cursor-pointer shrink-0"
            aria-label={t.common.close}
            title={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary KPI Tiles (Warm Espresso #3E2B1E with High-Contrast #FFF8EE Ink) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {/* War Wins */}
          <div className="rounded-xl bg-[#3E2B1E] border-2 border-[#261810] p-3 text-center shadow-sm">
            <span className="text-xs font-bold text-[#E7D9C8] block">
              {t.clan.warWins}
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-300 block mt-1 tabular-nums">
              {fmtNum(wins)}
            </span>
          </div>

          {/* War Losses */}
          <div className="rounded-xl bg-[#3E2B1E] border-2 border-[#261810] p-3 text-center shadow-sm">
            <span className="text-xs font-bold text-[#E7D9C8] block">
              {t.clan.warLosses}
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-300 block mt-1 tabular-nums">
              {fmtNum(losses)}
            </span>
          </div>

          {/* Win Streak */}
          <div className="rounded-xl bg-[#3E2B1E] border-2 border-[#261810] p-3 text-center shadow-sm">
            <span className="text-xs font-bold text-[#E7D9C8] flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0" />
              <span>{t.clan.winStreak}</span>
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-300 block mt-1 tabular-nums">
              {fmtNum(clan.warWinStreak ?? 0)}
            </span>
          </div>

          {/* Win Rate */}
          <div className="rounded-xl bg-[#3E2B1E] border-2 border-[#261810] p-3 text-center shadow-sm">
            <span className="text-xs font-bold text-[#E7D9C8] block">
              {t.clan.winRate}
            </span>
            <span className="text-lg sm:text-xl font-black text-sky-300 block mt-1 tabular-nums">
              {fmtPct(winRatePct, 1)}
            </span>
          </div>

          {/* War Ties */}
          <div className="rounded-xl bg-[#3E2B1E] border-2 border-[#261810] p-3 text-center shadow-sm">
            <span className="text-xs font-bold text-[#E7D9C8] block">
              {t.clan.warTies}
            </span>
            <span className="text-lg sm:text-xl font-black text-[#FFF8EE] block mt-1 tabular-nums">
              {fmtNum(ties)}
            </span>
          </div>

          {/* Total Wars */}
          <div className="rounded-xl bg-[#3E2B1E] border-2 border-[#261810] p-3 text-center shadow-sm">
            <span className="text-xs font-bold text-[#E7D9C8] block">
              {t.clan.totalWars}
            </span>
            <span className="text-lg sm:text-xl font-black text-amber-200 block mt-1 tabular-nums">
              {fmtNum(totalWars)}
            </span>
          </div>
        </div>

        {/* Details List */}
        <div className="rounded-xl bg-[#EFE8DA] border-2 border-[#C2B39C] p-3.5 space-y-2 mb-5 text-xs sm:text-[13px] text-[#2D251E]">
          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#DDD2C0]">
            <span className="font-bold text-[#5A4A3E]">{t.clan.warLeague}</span>
            <span className="font-black text-[#7C4408] text-right">
              {clan.warLeague?.name && clan.warLeague.name.toLowerCase() !== "unranked"
                ? clan.warLeague.name
                : t.common.unranked}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#DDD2C0]">
            <span className="font-bold text-[#5A4A3E]">{t.clan.warFrequency}</span>
            <span className="font-bold text-[#2D251E] text-right">
              {formatWarFrequency(clan.warFrequency)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 py-1 border-b border-[#DDD2C0]">
            <span className="font-bold text-[#5A4A3E]">
              {isTr ? "Günlük Durumu" : "War Log Status"}
            </span>
            {clan.isWarLogPublic ? (
              <span className="font-bold text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{isTr ? "Herkese Açık" : "Public"}</span>
              </span>
            ) : (
              <span className="font-bold text-rose-800 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>{t.clan.warLogPrivate}</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 py-1">
            <span className="font-bold text-[#5A4A3E]">
              {isTr ? "Görüntüleme Tarihi" : "Viewed On"}
            </span>
            <span className="font-bold text-[#2D251E] tabular-nums">
              {fmtDate(new Date())}
            </span>
          </div>
        </div>

        {/* Footer Close Button */}
        <div className="flex justify-end">
          <GameButton
            variant="green"
            size="md"
            onClick={onClose}
            className="min-h-[44px] w-full sm:w-auto"
          >
            {t.common.close}
          </GameButton>
        </div>
      </div>
    </div>
  );
}
