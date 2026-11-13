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
 * Measured from in-game profile and clan headers.
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
        "game-segmented-bar w-full max-w-full overflow-x-auto scrollbar-none flex-nowrap",
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
              "game-segmented-item shrink-0 whitespace-nowrap",
              isActive && "game-segmented-item-active",
              item.disabled && "opacity-45 cursor-not-allowed hover:brightness-100"
            )}
          >
            {item.icon && <span className="inline-flex shrink-0">{item.icon}</span>}
            <span
              className={cn(
                "whitespace-nowrap select-none",
                isActive ? "text-[#2D251E] font-extrabold" : "text-[#EAE4DA] font-bold"
              )}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

