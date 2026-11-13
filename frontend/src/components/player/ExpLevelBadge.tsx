"use client";

import React, { useId } from "react";
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
  const uid = useId().replace(/:/g, "");
  const fillGradId = `exp-shield-fill-${uid}`;
  const rimGradId = `exp-shield-rim-${uid}`;

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
        {/* XP Star-Shield Crest SVG */}
        <svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id={fillGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="45%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#075985" />
            </linearGradient>
            <linearGradient id={rimGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="50%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>
          </defs>

          {/* Outer Crest Shape */}
          <polygon
            points="50,2 62,28 92,20 78,48 98,72 68,76 58,98 42,98 32,76 2,72 22,48 8,20 38,28"
            fill={`url(#${fillGradId})`}
            stroke={`url(#${rimGradId})`}
            strokeWidth="4"
            strokeLinejoin="round"
          />

          {/* Inner Bevel Highlight */}
          <polygon
            points="50,11 59,32 82,26 71,48 87,68 63,71 50,82 37,71 13,68 29,48 18,26 41,32"
            fill="none"
            stroke="rgba(255, 255, 255, 0.42)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>

        {/* Level Number */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 flex items-center justify-center font-black tabular-nums text-white game-text-stroke leading-none tracking-tight pt-0.5",
            fontSizeClasses
          )}
        >
          {fmtNum(level)}
        </span>
      </div>
    </div>
  );
}
