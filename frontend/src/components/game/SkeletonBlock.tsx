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
        "rounded-xl bg-gradient-to-r from-[#2F3845]/70 via-[#404D5E]/80 to-[#2F3845]/70 animate-pulse border border-[#1E2530]/60",
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

