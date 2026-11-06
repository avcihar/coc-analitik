"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getIconPath } from "@/lib/iconManifest";
import LevelBadge from "./LevelBadge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export interface IconFrameProps {
  name: string;
  village?: string;
  count?: number;
  level?: number;
  maxLevel?: number;
  isMax?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  rarity?: "common" | "rare" | "epic" | "legendary";
  iconUrl?: string | null;
  className?: string;
  showTooltip?: boolean;
}

export default function IconFrame({
  name,
  village,
  count,
  level,
  maxLevel,
  isMax,
  size = "md",
  rarity = "common",
  iconUrl,
  className,
  showTooltip = true,
}: IconFrameProps) {
  const [imgError, setImgError] = useState(false);

  const resolvedIcon = iconUrl || getIconPath(name, village);

  useEffect(() => {
    setImgError(false);
  }, [resolvedIcon]);

  const displayIcon = !imgError && resolvedIcon ? resolvedIcon : null;
  const determinedIsMax =
    isMax !== undefined
      ? isMax
      : level !== undefined && maxLevel !== undefined && level >= maxLevel && maxLevel > 0;

  const sizeDimensions = {
    xs: { px: 32, class: "w-8 h-8" },
    sm: { px: 40, class: "w-10 h-10" },
    md: { px: 48, class: "w-12 h-12" },
    lg: { px: 58, class: "w-[58px] h-[58px]" },
  }[size];

  const rarityClass = {
    common: "game-icon-frame-common",
    rare: "game-icon-frame-rare",
    epic: "game-icon-frame-epic",
    legendary: "game-icon-frame-legendary",
  }[rarity];

  const tooltipText = [
    name,
    count ? `Adet: ${count}` : null,
    level !== undefined ? (determinedIsMax ? `Lv.${level} (MAX)` : `Lv.${level}`) : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div
      className={cn(
        "game-icon-frame",
        sizeDimensions.class,
        rarityClass,
        className
      )}
      title={showTooltip ? tooltipText : undefined}
    >
      {/* 1. Unit Image or Fallback */}
      {displayIcon ? (
        <img
          src={displayIcon}
          alt={name}
          width={sizeDimensions.px}
          height={sizeDimensions.px}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover select-none pointer-events-none"
        />
      ) : (
        <span className="game-text-stroke-sm text-[10px] sm:text-xs font-bold text-amber-300">
          {getInitials(name)}
        </span>
      )}

      {/* 2. Top-Left Count Badge (e.g. "x2", "x6") */}
      {count !== undefined && count > 1 && (
        <span className="game-count-badge">x{count}</span>
      )}

      {/* 3. Bottom-Right Level Badge (e.g. "14", "MAX") */}
      {level !== undefined && (
        <LevelBadge level={level} isMax={determinedIsMax} />
      )}
    </div>
  );
}

