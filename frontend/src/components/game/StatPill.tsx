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
  variant?: "default" | "blue" | "copper" | "purple" | "amber" | "green";
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
    blue: "text-sky-200 border-sky-900/60",
    copper: "text-orange-200 border-orange-900/60",
    purple: "text-orange-200 border-orange-900/60",
    amber: "text-amber-200 border-amber-900/60",
    green: "text-emerald-200 border-emerald-900/60",
  }[variant];

  return (
    <div className={cn("game-stat-pill tabular-nums", variantStyles, className)} {...rest}>
      {icon && <span className="inline-flex shrink-0 items-center justify-center opacity-90">{icon}</span>}
      {label && <span className="text-[11px] font-semibold text-amber-200/90 mr-0.5">{label}</span>}
      <span className="font-extrabold tracking-tight tabular-nums">{value}</span>
    </div>
  );
}

