"use client";

import React, { useState, useId } from "react";
import { ChevronDown } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface AccordionSectionProps {
  title: string;
  icon?: React.ReactNode;
  rightBadge?: React.ReactNode;
  defaultOpenMobile?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * AccordionSection
 * Matches SectionPanel (.ui-panel) styling.
 * Collapsible accordion on mobile (< lg) with a >=44px touch target toggle,
 * and always expanded on desktop (>= lg).
 */
export default function AccordionSection({
  title,
  icon,
  rightBadge,
  defaultOpenMobile = false,
  children,
  className,
}: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpenMobile);
  const contentId = useId().replace(/:/g, "");

  return (
    <section
      className={cn(
        "ui-panel p-3 sm:p-4 text-[var(--ui-text-main)]",
        className
      )}
    >
      {/* Mobile (< lg) Interactive Accordion Header */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "lg:hidden w-full min-h-[44px] flex items-center justify-between gap-2 text-left rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-text-gold)]",
          open ? "mb-3 border-b border-[var(--ui-panel-border)] pb-2" : "mb-0 pb-0"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="inline-flex shrink-0">{icon}</span>}
          <h3 className="font-game text-sm sm:text-base font-extrabold tracking-tight text-[var(--ui-text-main)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] truncate">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rightBadge}
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={cn(
              "text-[var(--ui-text-muted)] transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Desktop (>= lg) Static Header */}
      <div className="hidden lg:flex items-center justify-between gap-2 mb-3 border-b border-[var(--ui-panel-border)] pb-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="inline-flex shrink-0">{icon}</span>}
          <h3 className="font-game text-sm sm:text-base font-extrabold tracking-tight text-[var(--ui-text-main)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] truncate">
            {title}
          </h3>
        </div>
        {rightBadge && <div className="shrink-0">{rightBadge}</div>}
      </div>

      {/* Body: toggled on mobile, always visible on desktop */}
      <div id={contentId} className={cn(open ? "block" : "hidden lg:block")}>
        {children}
      </div>
    </section>
  );
}
