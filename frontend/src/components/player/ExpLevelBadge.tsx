"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useLanguage } from "@/lib/i18n";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ExpLevelBadgeProps {
  level: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * ExpLevelBadge
 * Clash of Clans experience level crest badge displaying the player's exact XP level.
 */
export default function ExpLevelBadge({
  level,
  className,
  size = "md",
}: ExpLevelBadgeProps) {
  const { t, fmtNum } = useLanguage();

  const sizeClasses = {
    sm: "w-11 h-11",
    md: "w-12 h-12 sm:w-14 sm:h-14",
    lg: "w-16 h-16",
  }[size];

  const fontSizeClasses = {
    sm: "text-xs",
    md: "text-sm sm:text-base",
    lg: "text-lg",
  }[size];

  const accessibleLabel = `${t.common.level} ${fmtNum(level)}`;

  return (
    <div
      role="img"
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className={cn("inline-flex items-center justify-center shrink-0 select-none", className)}
    >
      <div
        className={cn(
          "relative flex items-center justify-center filter drop-shadow-[0_3px_5px_rgba(0,0,0,0.55)]",
          sizeClasses
        )}
      >
        <img
          src="/icons/ui/xp.png"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-contain select-none"
        />

        {/* Level Number */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 flex items-center justify-center font-black tabular-nums text-white game-text-stroke leading-none tracking-tight",
            fontSizeClasses
          )}
        >
          {fmtNum(level)}
        </span>
      </div>
    </div>
  );
}
