"use client";

import React from "react";
import { User, Shield, X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface RecentTagChipProps {
  /** Primary tag or query label (e.g., "#P89PCUPUQ" or clan name) */
  label: string;
  /** Optional player or clan name shown alongside the tag */
  subLabel?: string;
  /** Icon variant for player or clan recent item */
  icon?: "player" | "clan";
  /** Called when the user selects this recent search */
  onSelect: () => void;
  /** Called when the user removes this item from history */
  onRemove: () => void;
  /** Accessible label for the remove button */
  removeAriaLabel: string;
  /** Tooltip title for the remove button */
  removeTitle?: string;
  /** Disables interaction while a search is in flight */
  disabled?: boolean;
  className?: string;
}

/**
 * RecentTagChip component
 * Accessible recent search chip with sibling select and remove buttons (>=44px tap targets).
 * Styled strictly with --ui-* and --game-* tokens.
 */
export default function RecentTagChip({
  label,
  subLabel,
  icon = "player",
  onSelect,
  onRemove,
  removeAriaLabel,
  removeTitle,
  disabled = false,
  className,
}: RecentTagChipProps) {
  const IconComponent = icon === "clan" ? Shield : User;
  const hasSubLabel = Boolean(subLabel && subLabel.trim() && subLabel.trim() !== label.trim());

  return (
    <div
      className={cn(
        "ui-well flex items-stretch justify-between rounded-xl overflow-hidden transition-colors hover:border-[var(--game-cream-mid)] min-w-0",
        className
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        title={hasSubLabel ? `${subLabel} (${label})` : label}
        className="min-h-[44px] flex-1 min-w-0 px-3 py-2 inline-flex items-center gap-2.5 text-left cursor-pointer disabled:opacity-50 hover:bg-[var(--game-dark-box-light)]/40 transition-colors"
      >
        <span className="w-8 h-8 rounded-lg bg-[var(--game-dark-box-mid)] border border-[var(--ui-well-border)] inline-flex items-center justify-center shrink-0 text-[var(--game-cream-light)]">
          <IconComponent className="w-4 h-4" />
        </span>

        <span className="min-w-0 flex-1 flex flex-col">
          {hasSubLabel ? (
            <>
              <span className="text-sm font-bold text-[var(--ui-text-main)] truncate leading-tight">
                {subLabel}
              </span>
              <span className="text-xs font-semibold tabular-nums text-[var(--ui-text-muted)] truncate leading-tight mt-0.5">
                {label}
              </span>
            </>
          ) : (
            <span className="text-sm font-bold tabular-nums text-[var(--ui-text-main)] truncate">
              {label}
            </span>
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={removeAriaLabel}
        title={removeTitle ?? removeAriaLabel}
        className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center border-l border-[var(--ui-well-border)] text-[var(--ui-text-muted)] hover:text-[var(--ui-text-main)] hover:bg-[var(--game-dark-box-light)]/40 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
