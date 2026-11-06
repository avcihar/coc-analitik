"use client";

import React, { useState, useEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getIconPath } from "@/lib/iconManifest";
import LevelBadge from "./LevelBadge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const DARK_TROOPS = new Set([
  "Minion", "Hog Rider", "Valkyrie", "Golem", "Witch", "Lava Hound",
  "Bowler", "Ice Golem", "Headhunter", "Apprentice Warden", "Druid", "Furnace"
]);

const SIEGE_MACHINES = new Set([
  "Wall Wrecker", "Battle Blimp", "Stone Slammer", "Siege Barracks",
  "Log Launcher", "Flame Flinger", "Battle Drill", "Sky Wagon"
]);

const HEROES = new Set([
  "Barbarian King", "Archer Queen", "Grand Warden", "Royal Champion", "Minion Prince", "Dragon Duke"
]);

const PETS = new Set([
  "L.A.S.S.I", "LASSI", "Electro Owl", "Mighty Yak", "Unicorn", "Frosty", "Diggy", "Poison Lizard", "Phoenix",
  "Spirit Fox", "Angry Jelly", "Walrus", "Greedy Raven", "Sneezy"
]);

export interface IconFrameProps {
  name?: string;
  village?: string;
  count?: number;
  level?: number;
  maxLevel?: number;
  isMax?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "unit" | "hero" | "equipment" | "pet";
  tileType?: "elixir" | "dark-elixir" | "spell" | "siege" | "super" | "hero" | "equipment" | "pet";
  rarity?: "common" | "rare" | "epic" | "legendary";
  iconUrl?: string | null;
  className?: string;
  showTooltip?: boolean;
}

export default function IconFrame({
  name = "",
  village,
  count,
  level,
  maxLevel,
  isMax,
  size = "unit",
  tileType,
  rarity,
  iconUrl,
  className,
  showTooltip = true,
}: IconFrameProps) {
  const [imgError, setImgError] = useState(false);

  const safeName = name || "";
  const resolvedIcon = iconUrl || (safeName ? getIconPath(safeName, village) : null);

  useEffect(() => {
    setImgError(false);
  }, [resolvedIcon]);

  const displayIcon = !imgError && resolvedIcon ? resolvedIcon : null;
  const determinedIsMax =
    isMax !== undefined
      ? isMax
      : level !== undefined && maxLevel !== undefined && level >= maxLevel && maxLevel > 0;

  // Auto-detect tile type if not explicitly passed
  let resolvedType = tileType;
  if (!resolvedType) {
    if (safeName.startsWith("Super ") || safeName === "Ice Golem" && count === undefined) {
      resolvedType = safeName.startsWith("Super ") ? "super" : "dark-elixir";
    } else if (SIEGE_MACHINES.has(safeName)) {
      resolvedType = "siege";
    } else if (DARK_TROOPS.has(safeName)) {
      resolvedType = "dark-elixir";
    } else if (HEROES.has(safeName)) {
      resolvedType = "hero";
    } else if (PETS.has(safeName)) {
      resolvedType = "pet";
    } else if (safeName.toLowerCase().includes("spell")) {
      resolvedType = "spell";
    } else {
      resolvedType = "elixir";
    }
  }

  const typeClass = {
    elixir: "game-tile-elixir",
    "dark-elixir": "game-tile-dark-elixir",
    spell: "game-tile-spell",
    siege: "game-tile-siege",
    super: "game-tile-super",
    hero: "game-tile-hero",
    equipment: "game-tile-equipment",
    pet: "game-tile-pet",
  }[resolvedType] || "game-tile-elixir";

  const sizeClass = {
    xs: "w-7 h-7",
    sm: "w-9 h-9",
    md: "w-11 h-11",
    lg: "w-14 h-14",
    unit: "w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] md:w-[56px] md:h-[56px] lg:w-[58px] lg:h-[58px]",
    hero: "w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] md:w-[56px] md:h-[56px] lg:w-[58px] lg:h-[58px]",
    equipment: "w-[20px] h-[20px] sm:w-[23px] sm:h-[23px] md:w-[26px] md:h-[26px] lg:w-[27px] lg:h-[27px]",
    pet: "w-[44px] h-[20px] sm:w-[50px] sm:h-[23px] md:w-[56px] md:h-[26px] lg:w-[58px] lg:h-[27px]",
  }[size];

  const rarityClass = rarity
    ? {
        common: "game-icon-frame-common",
        rare: "game-icon-frame-rare",
        epic: "game-icon-frame-epic",
        legendary: "game-icon-frame-legendary",
      }[rarity]
    : resolvedType === "equipment"
    ? "game-icon-frame-epic"
    : resolvedType === "super"
    ? "game-icon-frame-legendary"
    : undefined;

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
        sizeClass,
        typeClass,
        rarityClass,
        className
      )}
      title={showTooltip ? tooltipText : undefined}
    >
      {/* 1. Unit Image or Fallback Initials */}
      {displayIcon ? (
        <img
          src={displayIcon}
          alt={name}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover select-none pointer-events-none"
        />
      ) : (
        <span className="text-[10px] sm:text-xs font-black text-amber-200 uppercase select-none">
          {getInitials(name)}
        </span>
      )}

      {/* 2. Top-Left Count Badge (e.g. "x2", "x6") */}
      {count !== undefined && count > 1 && (
        <span className="game-count-badge">x{count}</span>
      )}

      {/* 3. Bottom-Left Level Badge (e.g. "14", "MAX") */}
      {level !== undefined && (
        <LevelBadge level={level} isMax={determinedIsMax} />
      )}
    </div>
  );
}
