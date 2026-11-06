"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface LevelBadgeProps {
  level: number | string;
  isMax?: boolean;
  className?: string;
}

export default function LevelBadge({
  level,
  isMax = false,
  className,
}: LevelBadgeProps) {
  return (
    <div
      className={cn(
        "game-level-badge",
        isMax && "game-level-badge-max",
        className
      )}
      title={isMax ? `Maksimum Seviye (Lv.${level})` : `Seviye ${level}`}
    >
      <span>{isMax ? "MAX" : level}</span>
    </div>
  );
}

