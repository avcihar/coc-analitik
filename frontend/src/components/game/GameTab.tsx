"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface GameTabBarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GameTabBar({ children, className, ...rest }: GameTabBarProps) {
  return (
    <div className={cn("game-tab-bar", className)} role="tablist" {...rest}>
      {children}
    </div>
  );
}

export interface GameTabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: React.ReactNode;
}

export function GameTab({
  active = false,
  icon,
  children,
  className,
  ...rest
}: GameTabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "game-tab",
        active ? "game-tab-active" : "game-tab-inactive",
        className
      )}
      {...rest}
    >
      {icon && <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>}
      <span className={active ? "game-text-stroke-sm" : "drop-shadow-sm"}>{children}</span>
    </button>
  );
}

