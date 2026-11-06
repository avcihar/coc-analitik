"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface StatPillProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  label?: string;
  value: React.ReactNode;
  variant?: "default" | "blue" | "purple" | "amber" | "green";
}

export default function StatPill({
  icon,
  label,
  value,
  variant = "default",
  className,
  ...rest
}: StatPillProps) {
  const variantStyles = {
    default: "",
    blue: "text-sky-300 border-sky-900/60",
    purple: "text-purple-300 border-purple-900/60",
    amber: "text-amber-300 border-amber-900/60",
    green: "text-emerald-300 border-emerald-900/60",
  }[variant];

  return (
    <div className={cn("game-stat-pill", variantStyles, className)} {...rest}>
      {icon && <span className="inline-flex shrink-0 items-center justify-center opacity-90">{icon}</span>}
      {label && <span className="text-[10px] text-amber-200/80 mr-0.5">{label}</span>}
      <span className="font-black tracking-tight">{value}</span>
    </div>
  );
}

