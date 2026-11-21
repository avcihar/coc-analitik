"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ToolLauncherCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  footerText?: string | null;
  footerIcon?: React.ReactNode;
  onClick: () => void;
}

export default function ToolLauncherCard({
  title,
  description,
  icon,
  footerText,
  footerIcon,
  onClick,
}: ToolLauncherCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${title} — ${description}`}
      className={cn(
        "group ui-panel w-full text-left rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer select-none min-h-[44px]",
        "flex flex-col justify-between gap-3 transition-all duration-150",
        "hover:brightness-105 hover:-translate-y-0.5",
        "active:scale-[0.985] active:translate-y-0.5 active:brightness-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-text-gold)]"
      )}
    >
      <div className="w-full min-w-0 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl ui-info flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            {icon}
          </div>

          <span
            className="w-8 h-8 rounded-lg ui-info flex items-center justify-center shrink-0 text-[var(--ui-text-muted)] group-hover:text-[var(--ui-text-gold)] group-hover:translate-x-0.5 transition-all"
            aria-hidden="true"
          >
            <ChevronRight size={16} />
          </span>
        </div>

        <div className="min-w-0">
          <h2 className="font-game font-extrabold game-title-stroke text-sm sm:text-base leading-snug text-[var(--ui-text-main)] break-words">
            {title}
          </h2>
          <p className="text-xs sm:text-[13px] text-[var(--ui-text-muted)] font-normal leading-snug mt-1 break-words">
            {description}
          </p>
        </div>
      </div>

      {footerText ? (
        <div className="ui-well w-full py-2 px-2.5 sm:px-3 flex items-center gap-2 min-h-[38px]">
          {footerIcon && (
            <span className="shrink-0 flex items-center justify-center" aria-hidden="true">
              {footerIcon}
            </span>
          )}
          <span className="text-[11px] sm:text-xs font-semibold text-[var(--ui-text-gold)] leading-snug break-words tabular-nums">
            {footerText}
          </span>
        </div>
      ) : null}
    </button>
  );
}
