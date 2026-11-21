"use client";

import React, { useState, useEffect } from "react";
import { getBuilderHallImageUrl } from "@/lib/builderBaseManifest";
import { useLanguage } from "@/lib/i18n";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BuilderHallImageProps {
  level: number;
  className?: string;
  size?: number;
}

/**
 * Shared BuilderHallImage component
 * Displays Builder Hall graphic from the local manifest (public/builder-halls/).
 * Falls back to an in-game stylized level badge if missing or failed to load.
 */
export default function BuilderHallImage({
  level,
  className,
  size = 120,
}: BuilderHallImageProps) {
  const { isTr } = useLanguage();
  const [loadError, setLoadError] = useState(false);
  const src = getBuilderHallImageUrl(level);
  const label = isTr ? `İnşaatçı Salonu ${level}` : `Builder Hall ${level}`;
  const abbr = isTr ? "İB" : "BH";

  useEffect(() => {
    setLoadError(false);
  }, [src]);

  if (!src || loadError) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl bg-gradient-to-b from-[#5A4332] to-[#362519] border-2 border-[#8C6848] shadow-md p-2 text-center select-none",
          className
        )}
        style={{ width: size, height: size }}
        title={label}
      >
        <span className="text-[10px] text-amber-300 font-bold">{abbr}</span>
        <span className="font-game text-2xl font-extrabold text-white tabular-nums">{level}</span>
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
        alt={label}
        loading="lazy"
        onError={() => setLoadError(true)}
        className="w-full h-full object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]"
      />
    </div>
  );
}
