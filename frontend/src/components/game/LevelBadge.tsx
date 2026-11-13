"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface LevelBadgeProps {
  level: number | string;
  isMax?: boolean;
  compact?: boolean;
  className?: string;
}

export default function LevelBadge({
  level,
  isMax = false,
  compact = false,
  className,
}: LevelBadgeProps) {
  const { isTr } = useLanguage();
  const titleText = isMax
    ? isTr
      ? `Maksimum Seviye (Sv.${level})`
      : `Max Level (Lv.${level})`
    : isTr
    ? `Seviye ${level}`
    : `Level ${level}`;

  return (
    <div
      className={cn(
        "game-level-badge tabular-nums",
        isMax && "game-level-badge-max",
        compact && "!h-[11px] !min-w-[13px] !px-[2.5px] !text-[9px]",
        className
      )}
      title={titleText}
    >
      <span>{isMax ? "MAX" : level}</span>
    </div>
  );
}

