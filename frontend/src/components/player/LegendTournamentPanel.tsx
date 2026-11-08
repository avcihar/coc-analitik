"use client";

import React from "react";
import { Trophy, Award } from "lucide-react";
import type { LegendStatistics } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface LegendTournamentPanelProps {
  stats?: LegendStatistics | null;
  className?: string;
}

const MONTH_NAMES_TR: Record<string, string> = {
  "01": "Ocak",
  "02": "Şubat",
  "03": "Mart",
  "04": "Nisan",
  "05": "Mayıs",
  "06": "Haziran",
  "07": "Temmuz",
  "08": "Ağustos",
  "09": "Eylül",
  "10": "Ekim",
  "11": "Kasım",
  "12": "Aralık",
};

function formatSeasonId(seasonId?: string): string {
  if (!seasonId) return "";
  const parts = seasonId.split("-");
  if (parts.length === 2 && MONTH_NAMES_TR[parts[1]]) {
    return `${MONTH_NAMES_TR[parts[1]]} ${parts[0]}`;
  }
  return seasonId;
}

/**
 * LegendTournamentPanel
 * Renders the purple tournament panel (.game-tournament-panel) strictly when legendStatistics is present.
 * Shows En iyi, Önceki, and Efsane Kupalar.
 * Measured directly from referans/oyun-ici/profil.png.
 */
export default function LegendTournamentPanel({
  stats,
  className,
}: LegendTournamentPanelProps) {
  // STRICT RULE: If legendStatistics is missing, hide the panel completely.
  if (!stats) return null;

  const { bestSeason, previousSeason, legendTrophies } = stats;

  return (
    <div
      className={cn(
        "game-tournament-panel p-3 sm:p-4 text-white space-y-3",
        className
      )}
    >
      {/* Panel Header */}
      <div className="text-center border-b border-purple-300/20 pb-2">
        <h3 className="game-title-stroke text-sm sm:text-base font-bold tracking-wide uppercase">
          Efsane Lig Turnuvası
        </h3>
      </div>

      {/* 3 Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-center">
        {/* 1. En iyi Sezon */}
        <div className="bg-black/25 rounded-xl p-2.5 border border-purple-300/15 flex flex-col items-center justify-center space-y-1">
          <div className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">
            En iyi: {formatSeasonId(bestSeason?.id)}
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <Award className="text-amber-400 shrink-0" size={24} />
            <div className="text-left">
              {bestSeason?.rank !== undefined && (
                <div className="game-text-stroke-sm text-xs sm:text-sm font-bold text-white">
                  {bestSeason.rank.toLocaleString("tr-TR")}. Sıra
                </div>
              )}
              {bestSeason?.trophies !== undefined && (
                <div className="flex items-center gap-1 text-xs font-black text-amber-300">
                  <Trophy size={12} className="fill-amber-400 text-amber-400" />
                  <span>{bestSeason.trophies}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Önceki Sezon */}
        <div className="bg-black/25 rounded-xl p-2.5 border border-purple-300/15 flex flex-col items-center justify-center space-y-1">
          <div className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">
            Önceki: {formatSeasonId(previousSeason?.id)}
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <Award className="text-purple-300 shrink-0" size={24} />
            <div className="text-left">
              {previousSeason?.rank !== undefined && (
                <div className="game-text-stroke-sm text-xs sm:text-sm font-bold text-white">
                  {previousSeason.rank.toLocaleString("tr-TR")}. Sıra
                </div>
              )}
              {previousSeason?.trophies !== undefined && (
                <div className="flex items-center gap-1 text-xs font-black text-amber-300">
                  <Trophy size={12} className="fill-amber-400 text-amber-400" />
                  <span>{previousSeason.trophies}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Efsane Kupalar */}
        <div className="bg-black/25 rounded-xl p-2.5 border border-purple-300/15 flex flex-col items-center justify-center space-y-1">
          <div className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">
            Efsane Kupalar
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <div className="w-8 h-8 rounded-lg bg-purple-900/60 border border-purple-400/40 flex items-center justify-center text-purple-200 shadow-inner">
              <Trophy size={18} className="fill-purple-300 text-purple-300" />
            </div>

            <div className="px-3 py-1 rounded-lg bg-black/40 border border-purple-300/20 font-black text-base sm:text-lg text-amber-300 font-mono shadow-inner">
              {(legendTrophies ?? 0).toLocaleString("tr-TR")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
