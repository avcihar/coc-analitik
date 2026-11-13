"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface SkeletonBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  height?: string | number;
  width?: string | number;
}

/**
 * Shared SkeletonBlock component
 * Game-themed loading placeholder with subtle shimmer animation.
 */
export default function SkeletonBlock({
  height = "2rem",
  width = "100%",
  className,
  style,
  ...rest
}: SkeletonBlockProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-gradient-to-r from-[#4E3B2E]/65 via-[#675040]/80 to-[#4E3B2E]/65 animate-pulse border border-[#2C1E14]/50",
        className
      )}
      style={{
        height,
        width,
        ...style,
      }}
      {...rest}
    />
  );
}

