"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface GameWindowProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "cream" | "bare";
  children: React.ReactNode;
}

/**
 * Shared GameWindow component
 * - variant="cream": In-game dialog window with cream background, outer stone rim, and beveled edges.
 * - variant="bare": Clean transparent wrapper for Meta & Duvar pages that maintain their own internal window frame.
 */
export default function GameWindow({
  variant = "cream",
  children,
  className,
  ...rest
}: GameWindowProps) {
  if (variant === "bare") {
    return (
      <div className={cn("w-full max-w-7xl mx-auto", className)} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "game-window-cream w-full max-w-7xl mx-auto p-3 sm:p-6 my-2 sm:my-4 transition-all",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

