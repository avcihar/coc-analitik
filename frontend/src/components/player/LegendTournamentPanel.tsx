"use client";

import React from "react";
import { Trophy, Award } from "lucide-react";
import type { LegendStatistics } from "./types";
import { useLanguage } from "@/lib/i18n";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface LegendTournamentPanelProps {
  stats?: LegendStatistics | null;
  className?: string;
}

function formatSeasonId(seasonId: string | undefined, months: readonly string[]): string {
  if (!seasonId) return "";
  const parts = seasonId.split("-");
  if (parts.length >= 2) {
    const monthIdx = Number(parts[1]) - 1;
    if (Number.isInteger(monthIdx) && monthIdx >= 0 && monthIdx < months.length) {
      return `${months[monthIdx]} ${parts[0]}`;
    }
  }
  return seasonId;
}

interface SeasonCardProps {
  label: string;
  seasonId?: string;
  rank?: number;
  trophies?: number;
  accent?: "gold" | "bronze";
  months: readonly string[];
  rankSuffix: string;
  noDataText: string;
  fmtNum: (n: number | null | undefined) => string;
}

function SeasonCard({
  label,
  seasonId,
  rank,
  trophies,
  accent = "gold",
  months,
  rankSuffix,
  noDataText,
  fmtNum,
}: SeasonCardProps) {
  const formattedSeason = formatSeasonId(seasonId, months);
  const hasStats = rank !== undefined || trophies !== undefined;
  const rankDisplay =
    rank !== undefined ? (rankSuffix ? `${fmtNum(rank)}${rankSuffix}` : `#${fmtNum(rank)}`) : null;

  return (
    <div className="bg-[#2B1F16]/80 rounded-xl p-3 border border-amber-400/25 flex flex-col items-center justify-center space-y-1.5 shadow-inner min-h-[88px]">
      <div className="text-xs font-bold text-amber-200 uppercase tracking-wider">
        {formattedSeason ? `${label}: ${formattedSeason}` : label}
      </div>

      {hasStats ? (
        <div className="flex items-center gap-2.5 pt-0.5">
          <Award
            className={cn(
              "shrink-0",
              accent === "gold" ? "text-amber-400" : "text-amber-300/85"
            )}
            size={24}
            aria-hidden="true"
          />
          <div className="text-left">
            {rankDisplay && (
              <div className="game-text-stroke-sm text-xs sm:text-sm font-bold text-white tabular-nums">
                {rankDisplay}
              </div>
            )}
            {trophies !== undefined && (
              <div className="flex items-center gap-1 text-xs font-black text-amber-300 tabular-nums">
                <Trophy size={13} className="fill-amber-400 text-amber-400 shrink-0" aria-hidden="true" />
                <span>{fmtNum(trophies)}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-xs font-semibold text-amber-100/70 pt-1">{noDataText}</div>
      )}
    </div>
  );
}

/**
 * LegendTournamentPanel
 * Renders the Championship Gold-Bronze tournament panel (.game-tournament-panel)
 * strictly when legendStatistics is present.
 */
export default function LegendTournamentPanel({
  stats,
  className,
}: LegendTournamentPanelProps) {
  const { t, fmtNum } = useLanguage();

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
      <div className="text-center border-b border-amber-300/25 pb-2">
        <h3 className="game-title-stroke text-sm sm:text-base font-bold tracking-wide uppercase">
          {t.player.legendPanelTitle}
        </h3>
      </div>

      {/* 3 Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch text-center">
        <SeasonCard
          label={t.player.bestSeason}
          seasonId={bestSeason?.id}
          rank={bestSeason?.rank}
          trophies={bestSeason?.trophies}
          accent="gold"
          months={t.player.months}
          rankSuffix={t.player.rankSuffix}
          noDataText={t.common.noData}
          fmtNum={fmtNum}
        />

        <SeasonCard
          label={t.player.previousSeason}
          seasonId={previousSeason?.id}
          rank={previousSeason?.rank}
          trophies={previousSeason?.trophies}
          accent="bronze"
          months={t.player.months}
          rankSuffix={t.player.rankSuffix}
          noDataText={t.common.noData}
          fmtNum={fmtNum}
        />

        {/* Legend Trophies */}
        <div className="bg-[#2B1F16]/80 rounded-xl p-3 border border-amber-400/25 flex flex-col items-center justify-center space-y-1.5 shadow-inner min-h-[88px]">
          <div className="text-xs font-bold text-amber-200 uppercase tracking-wider">
            {t.player.legendTrophies}
          </div>

          <div className="flex items-center gap-2.5 pt-0.5">
            <div className="w-8 h-8 rounded-lg bg-[#3E2B1E] border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
              <Trophy size={18} className="fill-amber-400 text-amber-400" aria-hidden="true" />
            </div>

            <div className="px-3 py-1 rounded-lg bg-[#1D140E]/85 border border-amber-400/30 font-black text-base sm:text-lg text-amber-300 tabular-nums shadow-inner">
              {fmtNum(legendTrophies ?? 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
