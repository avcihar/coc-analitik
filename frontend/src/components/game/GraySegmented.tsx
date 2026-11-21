"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface GraySegmentedItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  tooltip?: string;
}

export interface GraySegmentedProps<T extends string = string> {
  items: GraySegmentedItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
}

/**
 * Shared GraySegmented component
 * Sub-tab segmented bar ("Asıl Köy" | "İnşaatçı Üssü" | "Klan Başkenti")
 * Styled identically to the unified wood segmented control across Search & Meta panels.
 */
export default function GraySegmented<T extends string = string>({
  items,
  activeId,
  onChange,
  className,
}: GraySegmentedProps<T>) {
  return (
    <div
      className={cn(
        "ui-info p-1.5 rounded-xl inline-flex items-center gap-1.5 max-w-full overflow-x-auto scrollbar-none flex-nowrap shadow-inner",
        className
      )}
      role="tablist"
    >
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={item.disabled}
            title={item.tooltip}
            onClick={() => {
              if (!item.disabled) onChange(item.id);
            }}
            className={cn(
              "min-h-[44px] px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-game font-extrabold inline-flex items-center justify-center gap-2 transition-all shrink-0 whitespace-nowrap",
              isActive
                ? "bg-[var(--ui-tab-active-bg)] text-[var(--ui-text-main)] border-2 border-[var(--ui-tab-active-border)] shadow-sm"
                : "bg-transparent text-[var(--ui-text-muted)] border-2 border-transparent hover:text-[var(--ui-text-main)] hover:bg-[var(--game-slot-bg-light)]",
              item.disabled
                ? "opacity-45 cursor-not-allowed hover:bg-transparent hover:text-[var(--ui-text-muted)]"
                : "cursor-pointer"
            )}
          >
            {item.icon && <span className="inline-flex shrink-0">{item.icon}</span>}
            <span className="whitespace-nowrap select-none">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

