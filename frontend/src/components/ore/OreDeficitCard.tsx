"use client";

import React from "react";
import { CalendarCheck, CheckCircle2, ShieldAlert } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ProgressBarWood, { type OreKind } from "./ProgressBarWood";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface OreProgressRowItem {
  key: OreKind;
  label: string;
  days: number;
  netNeeded: number;
  icon: React.ReactNode;
}

export interface NetNeedCardItem {
  key: OreKind;
  label: string;
  dailyRateText: string;
  netAmount: number;
  totalAmount: number;
  icon: React.ReactNode;
}

interface ScenarioSummary {
  daysToComplete: number;
  targetDateStr: string;
}

interface OreDeficitCardProps {
  thLevel: number;
  projectionTitle: string;
  isCompletedToday: boolean;
  completedTodayLabel: string;
  completedTodayMessage: string;
  completionSummaryText: string;
  bottleneckPrefix: string;
  bottleneckLabel: string;
  bottleneckBadgeLabel: string;
  bottleneckOreType: OreKind;
  estimated: ScenarioSummary;
  minScenario: ScenarioSummary;
  maxScenario: ScenarioSummary;
  daysUnit: string;
  targetDateLabel: string;
  smithCapLabel: string;
  includeFutureEpics: boolean;
  futureEpicsBadgeText: string;
  progressTitle: string;
  progressHint: string;
  maxBottleneckDays: number;
  oreProgressRows: OreProgressRowItem[];
  scenarioTitle: string;
  scenarioBestLabel: string;
  scenarioEstimatedLabel: string;
  scenarioWorstLabel: string;
  netNeedTitle: string;
  netRemainingDesc: string;
  netNeedCards: NetNeedCardItem[];
  fmtNum: (n: number) => string;
}

const ORE_TEXT_CLASS: Record<OreKind, string> = {
  shiny: "text-sky-400",
  glowy: "text-orange-400",
  starry: "text-amber-400",
};

export default function OreDeficitCard({
  thLevel,
  projectionTitle,
  isCompletedToday,
  completedTodayLabel,
  completedTodayMessage,
  completionSummaryText,
  bottleneckPrefix,
  bottleneckLabel,
  bottleneckBadgeLabel,
  bottleneckOreType,
  estimated,
  minScenario,
  maxScenario,
  daysUnit,
  targetDateLabel,
  smithCapLabel,
  includeFutureEpics,
  futureEpicsBadgeText,
  progressTitle,
  progressHint,
  maxBottleneckDays,
  oreProgressRows,
  scenarioTitle,
  scenarioBestLabel,
  scenarioEstimatedLabel,
  scenarioWorstLabel,
  netNeedTitle,
  netRemainingDesc,
  netNeedCards,
  fmtNum,
}: OreDeficitCardProps) {
  return (
    <section className="ui-panel overflow-hidden">
      {/* Panel Header */}
      <div className="ui-panel-header px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-game font-extrabold text-sm sm:text-base text-[var(--ui-text-main)] truncate">
            TH{thLevel} — {projectionTitle}
          </h2>
        </div>

        <div
          className={cn(
            "ui-pill inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold shrink-0",
            isCompletedToday
              ? "text-[var(--ui-text-green)]"
              : ORE_TEXT_CLASS[bottleneckOreType]
          )}
        >
          {isCompletedToday ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />}
          <span>
            {isCompletedToday ? (
              completedTodayLabel
            ) : (
              <>
                {bottleneckPrefix}{" "}
                <strong className="font-extrabold">{bottleneckLabel}</strong>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-[var(--ui-panel-border)]">
        {/* (a) Hero Completion Projection */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="ui-well p-4 sm:p-5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ui-text-muted)]">
                {projectionTitle}
              </span>
              <span className="ui-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-[var(--ui-text-green)] tabular-nums">
                <CalendarCheck size={13} className="shrink-0" />
                <span>
                  {targetDateLabel}: {estimated.targetDateStr}
                </span>
              </span>
            </div>

            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="font-game font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[var(--ui-text-gold)] tracking-tight tabular-nums">
                {isCompletedToday
                  ? completedTodayLabel
                  : `${fmtNum(estimated.daysToComplete)} ${daysUnit}`}
              </span>
            </div>

            <p className="text-xs sm:text-sm font-medium text-[var(--ui-text-muted)] leading-relaxed">
              {isCompletedToday ? (
                <span className="text-[var(--ui-text-green)] font-semibold inline-flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{completedTodayMessage}</span>
                </span>
              ) : (
                completionSummaryText
              )}
            </p>

            <div className="pt-1 flex items-center gap-2 flex-wrap">
              <span className="ui-pill px-2.5 py-1 text-xs font-semibold text-[var(--ui-text-muted)] tabular-nums">
                {smithCapLabel}
              </span>
              {includeFutureEpics && (
                <span className="ui-pill px-2.5 py-1 text-xs font-semibold text-orange-400 tabular-nums">
                  {futureEpicsBadgeText}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* (b) Ore Progress Bars (Shiny / Glowy / Starry) */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-xs font-bold text-[var(--ui-text-main)] uppercase tracking-wider">
              {progressTitle}
            </h3>
            <span className="text-xs font-medium text-[var(--ui-text-muted)]">
              {progressHint}
            </span>
          </div>

          <div className="space-y-2.5">
            {oreProgressRows.map((row) => {
              const pct =
                isCompletedToday || row.days === 0
                  ? 0
                  : Math.max(
                      4,
                      Math.min(100, Math.round((row.days / maxBottleneckDays) * 100))
                    );
              const isBottleneck = !isCompletedToday && bottleneckOreType === row.key;

              return (
                <ProgressBarWood
                  key={row.key}
                  label={row.label}
                  oreKind={row.key}
                  valueLabel={fmtNum(row.netNeeded)}
                  subLabel={`• ${fmtNum(row.days)} ${daysUnit}`}
                  percentage={pct}
                  isBottleneck={isBottleneck}
                  bottleneckLabel={bottleneckBadgeLabel}
                  icon={row.icon}
                />
              );
            })}
          </div>
        </div>

        {/* (c) Scenario Comparison (En İyi / Tahmini / En Kötü) */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[var(--ui-text-main)] uppercase tracking-wider">
              {scenarioTitle}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Best */}
              <div className="ui-well p-3.5 flex flex-col justify-between gap-1">
                <div className="text-xs font-bold text-[var(--ui-text-green)]">
                  {scenarioBestLabel}
                </div>
                <div className="font-game font-extrabold text-xl sm:text-2xl text-[var(--ui-text-main)] tabular-nums">
                  {fmtNum(minScenario.daysToComplete)} {daysUnit}
                </div>
                <div className="text-xs font-semibold text-[var(--ui-text-muted)] tabular-nums">
                  {minScenario.targetDateStr}
                </div>
              </div>

              {/* Estimated */}
              <div className="ui-info p-3.5 border-[var(--ui-text-gold)] flex flex-col justify-between gap-1">
                <div className="text-xs font-bold text-[var(--ui-text-gold)]">
                  {scenarioEstimatedLabel}
                </div>
                <div className="font-game font-extrabold text-xl sm:text-2xl text-[var(--ui-text-gold)] tabular-nums">
                  {fmtNum(estimated.daysToComplete)} {daysUnit}
                </div>
                <div className="text-xs font-semibold text-[var(--ui-text-muted)] tabular-nums">
                  {estimated.targetDateStr}
                </div>
              </div>

              {/* Worst */}
              <div className="ui-well p-3.5 flex flex-col justify-between gap-1">
                <div className="text-xs font-bold text-orange-400">
                  {scenarioWorstLabel}
                </div>
                <div className="font-game font-extrabold text-xl sm:text-2xl text-[var(--ui-text-main)] tabular-nums">
                  {fmtNum(maxScenario.daysToComplete)} {daysUnit}
                </div>
                <div className="text-xs font-semibold text-[var(--ui-text-muted)] tabular-nums">
                  {maxScenario.targetDateStr}
                </div>
              </div>
            </div>
          </div>

          {/* (d) Net Needed Ore Cards */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[var(--ui-text-main)] uppercase tracking-wider">
              {netNeedTitle}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {netNeedCards.map((item) => {
                const futureExtra = item.totalAmount - item.netAmount;

                return (
                  <div
                    key={item.key}
                    className="ui-well p-3.5 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={cn(
                          "flex items-center gap-1.5 text-xs font-bold",
                          ORE_TEXT_CLASS[item.key]
                        )}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      <span
                        className={cn(
                          "ui-pill px-2 py-0.5 text-[11px] font-bold tabular-nums",
                          ORE_TEXT_CLASS[item.key]
                        )}
                      >
                        {item.dailyRateText}
                      </span>
                    </div>

                    <div className="font-game font-extrabold text-2xl text-[var(--ui-text-main)] tabular-nums">
                      {fmtNum(item.netAmount)}
                    </div>

                    <div className="text-xs font-medium text-[var(--ui-text-muted)] tabular-nums">
                      {futureExtra > 0
                        ? `${netRemainingDesc} (+${fmtNum(futureExtra)})`
                        : netRemainingDesc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
