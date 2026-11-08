"use client";

import React, { useState } from "react";
import Image from "next/image";
import { getTownHallImageUrl } from "@/lib/townHallsManifest";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface TownHallImageProps {
  level: number;
  weaponLevel?: number;
  className?: string;
  size?: number;
}

/**
 * Shared TownHallImage component
 * Displays Town Hall graphic from the local manifest (docs/Town Halls).
 * Falls back to an in-game stylized level badge if missing (e.g. TH11) or error.
 */
export default function TownHallImage({
  level,
  weaponLevel,
  className,
  size = 120,
}: TownHallImageProps) {
  const [loadError, setLoadError] = useState(false);
  const src = getTownHallImageUrl(level, weaponLevel);

  if (!src || loadError) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl bg-gradient-to-b from-[#3B445B] to-[#252C3D] border-2 border-[#5A688A] shadow-md p-2 text-center select-none",
          className
        )}
        style={{ width: size, height: size }}
        title={`Belediye Binası ${level}`}
      >
        <span className="text-[10px] text-amber-300 font-bold uppercase">BB</span>
        <span className="game-text-stroke text-2xl font-black text-white">{level}</span>
      </div>
    );
  }

  return (
    <div
      className={cn("relative flex items-center justify-center shrink-0 select-none", className)}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={`Belediye Binası ${level}`}
        loading="lazy"
        onError={() => setLoadError(true)}
        className="w-full h-full object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]"
      />
    </div>
  );
}

