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
  bodyClassName?: string;
  insetWell?: boolean;
}

export default function GamePanel({
  variant = "wood",
  title,
  headerRight,
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
        <div className="game-panel-header">
          {typeof title === "string" ? (
            <h3 className="game-text-stroke-sm text-sm sm:text-base tracking-wide select-none">
              {title}
            </h3>
          ) : (
            <div>{title}</div>
          )}
          {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </div>
      )}

      <div className={cn("p-3 sm:p-4 md:p-5", insetWell && "game-slot-well", bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
