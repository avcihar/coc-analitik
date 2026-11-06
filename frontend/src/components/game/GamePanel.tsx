"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface GamePanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: "wood" | "blue" | "dark" | "cream";
  title?: React.ReactNode;
  headerRight?: React.ReactNode;
  headerClassName?: string;
  onHeaderClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  bodyClassName?: string;
  insetWell?: boolean;
}

export default function GamePanel({
  variant = "wood",
  title,
  headerRight,
  headerClassName,
  onHeaderClick,
  children,
  className,
  bodyClassName,
  insetWell = false,
  ...rest
}: GamePanelProps) {
  const variantClass = {
    wood: "game-panel-wood",
    blue: "game-panel-blue",
    dark: "game-panel-dark",
    cream: "game-panel-cream",
  }[variant];

  const hasHeader = Boolean(title || headerRight);

  return (
    <div className={cn("game-panel", variantClass, className)} {...rest}>
      {hasHeader && (
        <div
          className={cn(
            "game-panel-header",
            onHeaderClick && "cursor-pointer select-none hover:brightness-105 transition-all",
            headerClassName
          )}
          onClick={onHeaderClick}
        >
          {typeof title === "string" ? (
            <h3 className="game-text-stroke-sm text-sm sm:text-base tracking-wide select-none">
              {title}
            </h3>
          ) : (
            <div className="flex-1 min-w-0">{title}</div>
          )}
          {headerRight && (
            <div
              className="flex items-center gap-2 shrink-0 ml-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {headerRight}
            </div>
          )}
        </div>
      )}

      {children && (
        <div className={cn("p-3 sm:p-4 md:p-5", insetWell && "game-slot-well", bodyClassName)}>
          {children}
        </div>
      )}
    </div>
  );
}
