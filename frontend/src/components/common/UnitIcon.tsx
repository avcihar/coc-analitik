"use client";

import React, { useState, useEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getIconPath } from "@/lib/iconManifest";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate stable deterministic colors from unit name for visual variety
function getDeterministicHue(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hues = [
    "from-blue-600/30 to-indigo-900/40 text-blue-400 border-blue-500/30",
    "from-purple-600/30 to-violet-900/40 text-purple-400 border-purple-500/30",
    "from-amber-600/30 to-yellow-900/40 text-amber-400 border-amber-500/30",
    "from-emerald-600/30 to-teal-900/40 text-emerald-400 border-emerald-500/30",
    "from-rose-600/30 to-pink-900/40 text-rose-400 border-rose-500/30",
    "from-cyan-600/30 to-sky-900/40 text-cyan-400 border-cyan-500/30",
    "from-orange-600/30 to-red-900/40 text-orange-400 border-orange-500/30",
  ];
  const idx = Math.abs(hash) % hues.length;
  return hues[idx];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
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
    isMax ? "(Maksimum Seviye)" : null,
    count ? `Adet: ${count}` : null,
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
          "relative rounded-xl border-2 flex items-center justify-center font-black overflow-hidden shadow-sm transition-transform group-hover:scale-105 bg-slate-900/60",
          sizeClasses,
          colorClasses,
          isEpic && "ring-1 ring-purple-500/50",
          isSuper && "ring-1 ring-rose-500/50"
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
          <span className="tracking-tighter font-extrabold">{initials}</span>
        )}

        {/* Quantity Badge (Top-Left) */}
        {count !== undefined && count > 0 && (
          <span className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded-md bg-black/85 text-white text-[9px] font-black leading-tight border border-white/20 z-10 shadow-sm">
            x{count}
          </span>
        )}

        {/* Corner Level Badge (Bottom-Right) */}
        {level !== undefined && (
          <span
            className={cn(
              "absolute bottom-0 right-0 px-1 py-0.2 rounded-tl-md text-[9px] font-black leading-tight shadow-sm z-10",
              isMax
                ? "bg-amber-400 text-slate-950 font-black border-t border-l border-amber-300"
                : "bg-slate-900/90 text-slate-200 border-t border-l border-slate-700"
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
