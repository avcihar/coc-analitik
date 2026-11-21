"use client";

import React from "react";
import { Shield, Swords, Users } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import {
  cleanClanDisplayName,
  cn,
  localizeWarState,
  type CwlScoutReport,
  type ScoutData,
} from "./CwlRosterCard";

export interface ScoutedSummaryBarProps {
  report: CwlScoutReport | null;
  clanTagInput: string;
  opponents: ScoutData[];
  rosterFilter: "cwl" | "all";
  cwlCount: number;
  allCount: number;
  loading: boolean;
  onFilterChange: (filter: "cwl" | "all") => void;
}

export function ScoutedSummaryBar({
  report,
  clanTagInput,
  opponents,
  rosterFilter,
  cwlCount,
  allCount,
  loading,
  onFilterChange,
}: ScoutedSummaryBarProps) {
  const { isTr, t, fmtNum, fmtPct, fmtTemplate } = useLanguage();

  if (!report && !loading) {
    return null;
  }

  const clanDisplayName = report
    ? cleanClanDisplayName(
        report.opponentClan?.name || report.clanName || clanTagInput,
        isTr
      )
    : clanTagInput;

  const clanDisplayTag = (
    report?.opponentClan?.tag ||
    report?.clanTag ||
    clanTagInput
  )
    .trim()
    .replace(/^#/, "");

  const warStateLabel = report
    ? localizeWarState(report.warState, t, isTr)
    : "-";

  const detectedCount = opponents.filter(
    (o) => o.armyDetected && (o.armyShareCode || "").trim().length > 0
  ).length;

  const clanStars = report?.opponentClan?.stars;
  const hasClanStars = typeof clanStars === "number";
  const clanDestruction = report?.opponentClan?.destructionPercentage;
  const hasClanDestruction = typeof clanDestruction === "number";

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-[var(--ui-panel-border)] min-w-0">
      {/* Left: Clan Identity + Live Status Badges */}
      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-[var(--game-dark-box-dark)] border border-[var(--ui-panel-border)] flex items-center justify-center shrink-0">
          <Shield size={16} className="text-[var(--ui-text-gold)]" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="text-sm sm:text-base font-extrabold text-[var(--ui-text-main)] truncate">
              {clanDisplayName}
            </span>
            {clanDisplayTag && (
              <span className="text-xs font-bold text-[var(--ui-text-muted)] tabular-nums">
                #{clanDisplayTag}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-[var(--game-dark-box-dark)] border border-[var(--ui-text-green)]/40 text-[11px] font-bold text-[var(--ui-text-green)]">
              {warStateLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--ui-text-muted)] tabular-nums mt-0.5">
            <span>
              {isTr ? "Ordu Tespit:" : "Armies:"}{" "}
              <strong className="text-[var(--ui-text-gold)] font-extrabold">
                {fmtNum(detectedCount)} / {fmtNum(opponents.length)}
              </strong>
            </span>
            {report?.opponentClan?.clanLevel ? (
              <span>
                · Lv. {fmtNum(report.opponentClan.clanLevel)}
              </span>
            ) : null}
            {hasClanStars && (
              <span>
                · <strong className="text-[var(--ui-text-gold)]">{fmtNum(clanStars)}★</strong>
                {hasClanDestruction ? ` (${fmtPct(clanDestruction, 1)})` : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Canonical Wood Roster Filter Toggle */}
      <div
        className="ui-info p-1 rounded-xl grid grid-cols-2 sm:inline-flex items-center gap-1 w-full lg:w-auto shrink-0"
        role="group"
        aria-label={isTr ? "Kadro Filtresi" : "Roster Filter"}
      >
        <button
          type="button"
          onClick={() => onFilterChange("cwl")}
          disabled={loading}
          className={cn(
            "min-h-[44px] px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer tabular-nums border-2 whitespace-nowrap",
            rosterFilter === "cwl"
              ? "bg-[var(--ui-tab-active-bg)] text-[var(--ui-text-main)] border-[var(--ui-tab-active-border)] shadow-sm"
              : "bg-transparent hover:bg-[var(--game-dark-box-mid)]/60 text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)] border-transparent"
          )}
        >
          <Swords size={13} className="hidden sm:block shrink-0" />
          <span className="truncate">
            {fmtTemplate(t.cwl.rosterTabCwl, {
              count: fmtNum(cwlCount),
            })}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("all")}
          disabled={loading}
          className={cn(
            "min-h-[44px] px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer tabular-nums border-2 whitespace-nowrap",
            rosterFilter === "all"
              ? "bg-[var(--ui-tab-active-bg)] text-[var(--ui-text-main)] border-[var(--ui-tab-active-border)] shadow-sm"
              : "bg-transparent hover:bg-[var(--game-dark-box-mid)]/60 text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)] border-transparent"
          )}
        >
          <Users size={13} className="hidden sm:block shrink-0" />
          <span className="truncate">
            {isTr
              ? `Tüm Üyeler (${fmtNum(allCount)})`
              : `All Members (${fmtNum(allCount)})`}
          </span>
        </button>
      </div>
    </div>
  );
}
