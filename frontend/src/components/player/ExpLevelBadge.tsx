"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
 * In-game Clash of Clans experience level badge (blue star badge with level and progress bar underneath).
 * Measured directly from in-game profile screenshot (profil.png).
 */
export default function ExpLevelBadge({
  level,
  className,
  size = "md",
}: ExpLevelBadgeProps) {
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-12 h-12 sm:w-14 sm:h-14",
    lg: "w-16 h-16",
  }[size];

  const fontSizeClasses = {
    sm: "text-xs",
    md: "text-sm sm:text-base",
    lg: "text-lg",
  }[size];

  return (
    <div className={cn("flex flex-col items-center shrink-0 select-none", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center filter drop-shadow-md",
          sizeClasses
        )}
      >
        {/* Star Badge Icon SVG */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
        >
          <defs>
            <linearGradient id="expStarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(56, 189, 248)" />
              <stop offset="40%" stopColor="rgb(2, 132, 199)" />
              <stop offset="100%" stopColor="rgb(3, 105, 161)" />
            </linearGradient>
            <linearGradient id="expBorderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(224, 242, 254)" />
              <stop offset="100%" stopColor="rgb(12, 74, 110)" />
            </linearGradient>
          </defs>

          {/* Star Shape Background */}
          <polygon
            points="50,2 62,28 92,20 78,48 98,72 68,76 58,100 42,100 32,76 2,72 22,48 8,20 38,28"
            fill="url(#expStarGrad)"
            stroke="url(#expBorderGrad)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Inner Highlight */}
          <polygon
            points="50,10 59,32 82,26 71,48 87,68 63,71 50,78 37,71 13,68 29,48 18,26 41,32"
            fill="none"
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>

        {/* Level Number */}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center font-black text-white game-text-stroke leading-none tracking-tight",
            fontSizeClasses
          )}
        >
          {level}
        </span>
      </div>

      {/* Mini Blue Progress Bar (in-game level progress indicator) */}
      <div className="w-10 sm:w-12 h-1.5 bg-black/60 rounded-full overflow-hidden border border-sky-950/80 -mt-1 shadow-inner">
        <div className="w-3/5 h-full bg-gradient-to-r from-sky-400 to-cyan-300 rounded-full" />
      </div>
    </div>
  );
}
