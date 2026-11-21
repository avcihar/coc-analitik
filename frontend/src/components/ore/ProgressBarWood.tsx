"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type OreKind = "shiny" | "glowy" | "starry";

const BAR_FILL_CLASS: Record<OreKind, string> = {
  shiny: "bg-sky-400",
  glowy: "bg-orange-400",
  starry: "bg-amber-400",
};

const TEXT_ACCENT_CLASS: Record<OreKind, string> = {
  shiny: "text-sky-400",
  glowy: "text-orange-400",
  starry: "text-amber-400",
};

interface ProgressBarWoodProps {
  label: string;
  oreKind: OreKind;
  valueLabel: string;
  subLabel?: string;
  percentage: number;
  isBottleneck?: boolean;
  bottleneckLabel?: string;
  icon?: React.ReactNode;
}

export default function ProgressBarWood({
  label,
  oreKind,
  valueLabel,
  subLabel,
  percentage,
  isBottleneck = false,
  bottleneckLabel,
  icon,
}: ProgressBarWoodProps) {
  const clampedPct = Math.max(0, Math.min(100, percentage));

  return (
    <div className="ui-well px-3.5 py-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className={cn("font-bold truncate", TEXT_ACCENT_CLASS[oreKind])}>
            {label}
          </span>
          {isBottleneck && bottleneckLabel && (
            <span className="ui-pill px-2 py-0.5 text-[11px] font-bold text-[var(--ui-text-gold)] shrink-0">
              {bottleneckLabel}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5 shrink-0 tabular-nums">
          <span className={cn("font-bold", TEXT_ACCENT_CLASS[oreKind])}>
            {valueLabel}
          </span>
          {subLabel && (
            <span className="text-[11px] font-semibold text-[var(--ui-text-muted)]">
              {subLabel}
            </span>
          )}
        </div>
      </div>

      <div className="w-full h-2.5 rounded-full bg-[var(--game-dark-box-dark)] border border-[var(--game-dark-box-border)] overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            BAR_FILL_CLASS[oreKind]
          )}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
    </div>
  );
}
