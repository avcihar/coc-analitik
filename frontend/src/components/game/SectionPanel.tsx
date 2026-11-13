"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface SectionPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: React.ReactNode;
  rightBadge?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shared SectionPanel component
 * Blue-gray in-game section container measured directly from player profile & army views.
 */
export default function SectionPanel({
  title,
  icon,
  rightBadge,
  children,
  className,
  ...rest
}: SectionPanelProps) {
  return (
    <div
      className={cn("game-section-panel p-3 sm:p-4 text-white", className)}
      {...rest}
    >
      {(title || icon || rightBadge) && (
        <div className="flex items-center justify-between gap-2 mb-3 border-b border-[#261810]/65 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            {icon && <span className="inline-flex shrink-0">{icon}</span>}
            {title && (
              <h3 className="font-game text-sm sm:text-base font-extrabold tracking-tight text-[#FFF8EE] drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] truncate">
                {title}
              </h3>
            )}
          </div>
          {rightBadge && <div className="shrink-0">{rightBadge}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

