"use client";

import React, { useState, useEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getIconPath } from "@/lib/iconManifest";
import { useLanguage } from "@/lib/i18n";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate stable deterministic warm Clash palette from unit name
function getDeterministicHue(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hues = [
    "from-sky-700/35 to-sky-950/60 text-sky-300 border-sky-500/35",
    "from-amber-700/35 to-amber-950/60 text-amber-300 border-amber-500/35",
    "from-emerald-700/35 to-emerald-950/60 text-emerald-300 border-emerald-500/35",
    "from-orange-700/35 to-orange-950/60 text-orange-300 border-orange-500/35",
    "from-teal-700/35 to-teal-950/60 text-teal-300 border-teal-500/35",
    "from-yellow-700/35 to-stone-900/60 text-yellow-300 border-yellow-500/35",
    "from-stone-600/40 to-stone-900/65 text-amber-200 border-amber-600/30",
  ];
  const idx = Math.abs(hash) % hues.length;
  return hues[idx];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toLocaleUpperCase("en-US");
  }
  return (parts[0][0] + parts[1][0]).toLocaleUpperCase("en-US");
}

export interface UnitIconProps {
  name: string;
  village?: string;
  level?: number;
  maxLevel?: number;
  count?: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  iconUrl?: string | null;
  isSuper?: boolean;
  isEpic?: boolean;
  className?: string;
  showNameBelow?: boolean;
}

export default function UnitIcon({
  name,
  village,
  level,
  maxLevel,
  count,
  size = "md",
  iconUrl,
  isSuper,
  isEpic,
  className,
  showNameBelow = false,
}: UnitIconProps) {
  const { isTr } = useLanguage();
  const [imgError, setImgError] = useState(false);

  const resolvedIcon = iconUrl || getIconPath(name, village);

  useEffect(() => {
    setImgError(false);
  }, [resolvedIcon]);

  const displayIcon = !imgError && resolvedIcon ? resolvedIcon : null;
  const isMax =
    level !== undefined && maxLevel !== undefined && level >= maxLevel && maxLevel > 0;
  const initials = getInitials(name);
  const colorClasses = getDeterministicHue(name);

  const sizeClasses = {
    xs: "w-8 h-8 text-[10px]",
    sm: "w-10 h-10 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-16 h-16 text-lg",
  }[size];

  const pixelDimensions = {
    xs: 32,
    sm: 40,
    md: 48,
    lg: 56,
    xl: 64,
  }[size];

  const tooltipText = [
    name,
    level !== undefined ? (maxLevel ? `Lv.${level}/${maxLevel}` : `Lv.${level}`) : null,
    isMax ? (isTr ? "(Maksimum Seviye)" : "(Max Level)") : null,
    count ? (isTr ? `Adet: ${count}` : `Qty: ${count}`) : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div
      className={cn("flex flex-col items-center group relative select-none", className)}
      title={tooltipText}
    >
      <div
        className={cn(
          "relative rounded-xl border-2 flex items-center justify-center font-extrabold overflow-hidden shadow-sm transition-transform group-hover:scale-105 bg-[#261A12]/85",
          sizeClasses,
          colorClasses,
          isEpic && "ring-1 ring-amber-400/80 border-amber-400/75",
          isSuper && "ring-1 ring-orange-400/80 border-orange-400/75"
        )}
      >
        {displayIcon ? (
          <img
            src={displayIcon}
            alt={name}
            width={pixelDimensions}
            height={pixelDimensions}
            loading="lazy"
            className="w-full h-full object-contain p-0.5 drop-shadow-sm"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="tracking-tight font-extrabold">{initials}</span>
        )}

        {/* Quantity Badge (Top-Left) */}
        {count !== undefined && count > 0 && (
          <span className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded-md bg-[#120B07]/90 text-white text-[10px] font-extrabold leading-none border border-white/20 z-10 shadow-sm tabular-nums">
            x{count}
          </span>
        )}

        {/* Corner Level Badge (Bottom-Right) */}
        {level !== undefined && (
          <span
            className={cn(
              "absolute bottom-0 right-0 px-1 py-0.5 rounded-tl-md text-[10px] font-extrabold leading-none shadow-sm z-10 tabular-nums",
              isMax
                ? "bg-amber-400 text-[#261501] border-t border-l border-amber-200"
                : "bg-[#1B120C]/92 text-amber-50 border-t border-l border-[#4A3628]"
            )}
          >
            {isMax ? "MAX" : `L${level}`}
          </span>
        )}
      </div>

      {showNameBelow && (
        <span className="mt-1 text-[11px] font-bold text-app-muted group-hover:text-app-text truncate max-w-[70px] text-center leading-tight">
          {name}
        </span>
      )}
    </div>
  );
}
