"use client";

import React, { useState } from "react";
import { Shield } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ClanBadgeProps {
  url?: string;
  name?: string;
  size?: number;
  className?: string;
}

/**
 * Shared ClanBadge component
 * Displays clan badge image with referrerPolicy="no-referrer", lazy loading, and placeholder fallback.
 */
export default function ClanBadge({
  url,
  name = "Klan",
  size = 48,
  className,
}: ClanBadgeProps) {
  const [hasError, setHasError] = useState(false);

  if (!url || hasError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-gradient-to-b from-[#4A3A2C] to-[#2B2117] border-2 border-[#6E553F] text-amber-400 shadow-md shrink-0 select-none",
          className
        )}
        style={{ width: size, height: size }}
        title={name}
      >
        <Shield size={Math.round(size * 0.6)} />
      </div>
    );
  }

  return (
    <div
      className={cn("relative flex items-center justify-center shrink-0 select-none", className)}
      style={{ width: size, height: size }}
    >
      <img
        src={url}
        alt={name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
      />
    </div>
  );
}

