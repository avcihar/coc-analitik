"use client";

import React from "react";
import { Award, Shield } from "lucide-react";
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
  noDataText,
  fmtNum,
}: SeasonCardProps) {
  const formattedSeason = formatSeasonId(seasonId, months);
  const hasStats = rank !== undefined || trophies !== undefined;
  const rankDisplay = rank !== undefined ? `#${fmtNum(rank)}` : null;

  return (
    <div className="bg-[var(--game-dark-box-mid)] rounded-xl px-3 py-2 border border-[var(--ui-info-border)] flex items-center justify-between gap-2.5 shadow-inner min-w-0">
      <div className="min-w-0">
        <div className="text-[11px] font-bold text-[var(--ui-text-muted)] leading-tight">
          {label}
        </div>
        {formattedSeason && (
          <div className="text-[10px] font-medium text-[var(--ui-text-muted)]/80 truncate">
            {formattedSeason}
          </div>
        )}
      </div>

      {hasStats ? (
        <div className="flex items-center gap-2 shrink-0 text-right">
          <Award
            className={cn(
              "shrink-0 hidden sm:block",
              accent === "gold"
                ? "text-[var(--ui-text-gold)]"
                : "text-[var(--ui-text-muted)]"
            )}
            size={16}
            aria-hidden="true"
          />
          <div className="tabular-nums">
            {rankDisplay && (
              <div
                className={cn(
                  "text-xs sm:text-sm font-black leading-tight",
                  accent === "gold"
                    ? "text-[var(--ui-text-gold)]"
                    : "text-[var(--ui-text-green)]"
                )}
              >
                {rankDisplay}
              </div>
            )}
            {trophies !== undefined && (
              <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-[var(--ui-text-muted)]">
                <img
                  src="/icons/ui/trophy.png"
                  alt=""
                  aria-hidden="true"
                  className="w-3 h-3 object-contain shrink-0 select-none"
                />
                <span>{fmtNum(trophies)}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-xs font-semibold text-[var(--ui-text-muted)]/75 shrink-0">
          {noDataText}
        </div>
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
  const { t, isTr, fmtNum } = useLanguage();

  // STRICT RULE: If legendStatistics is missing, hide the panel completely.
  if (!stats) return null;

  const { bestSeason, previousSeason, legendTrophies } = stats;

  return (
    <div
      className={cn(
        "game-tournament-panel p-3 sm:px-4 sm:py-3 text-[var(--ui-text-main)]",
        className
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Left: Title + Legend Trophies Pill */}
        <div className="flex items-center justify-between lg:justify-start gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[var(--game-dark-box-dark)] border border-[var(--ui-text-gold)]/50 flex items-center justify-center shrink-0">
              <Shield
                size={16}
                className="text-[var(--ui-text-gold)]"
                aria-hidden="true"
              />
            </div>
            <h3 className="font-game game-title-stroke text-sm sm:text-base font-bold tracking-wide truncate">
              {t.player.legendPanelTitle}
            </h3>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--game-dark-box-dark)] border border-[var(--ui-text-gold)]/35 font-black text-xs sm:text-sm text-[var(--ui-text-gold)] tabular-nums shrink-0 shadow-inner">
            <img
              src="/icons/ui/trophy.png"
              alt=""
              aria-hidden="true"
              className="w-3.5 h-3.5 object-contain shrink-0 select-none"
            />
            <span>
              {fmtNum(legendTrophies ?? 0)} {isTr ? "Kupa" : "Trophies"}
            </span>
          </div>
        </div>

        {/* Right: Previous Season & Best Season */}
        <div className="grid grid-cols-2 gap-2.5 lg:min-w-[420px]">
          <SeasonCard
            label={t.player.previousSeason}
            seasonId={previousSeason?.id}
            rank={previousSeason?.rank}
            trophies={previousSeason?.trophies}
            accent="bronze"
            months={t.player.months}
            noDataText={t.common.noData}
            fmtNum={fmtNum}
          />

          <SeasonCard
            label={t.player.bestSeason}
            seasonId={bestSeason?.id}
            rank={bestSeason?.rank}
            trophies={bestSeason?.trophies}
            accent="gold"
            months={t.player.months}
            noDataText={t.common.noData}
            fmtNum={fmtNum}
          />
        </div>
      </div>
    </div>
  );
}
