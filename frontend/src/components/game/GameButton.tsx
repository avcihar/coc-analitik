"use client";

import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface GameButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "green" | "blue" | "red" | "gold";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  href?: string;
  target?: string;
  rel?: string;
}

export default function GameButton({
  variant = "green",
  size = "md",
  icon,
  children,
  className,
  disabled,
  href,
  target,
  rel,
  ...rest
}: GameButtonProps) {
  const variantClasses = {
    green: "game-btn-green",
    blue: "game-btn-blue",
    red: "game-btn-red",
    gold: "game-btn-gold",
  }[variant];

  const sizeClasses = {
    sm: "game-btn-sm",
    md: "game-btn-md",
    lg: "game-btn-lg",
  }[size];

  const baseClasses = cn(
    "game-btn",
    variantClasses,
    sizeClasses,
    className
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        target={target}
        rel={rel || (target === "_blank" ? "noopener noreferrer" : undefined)}
        className={baseClasses}
        role="button"
        title={rest.title}
        aria-label={rest["aria-label"]}
      >
        {icon && <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>}
        {children && <span className="select-none font-extrabold drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.6)]">{children}</span>}
      </a>
    );
  }

  return (
    <button
      type={rest.type || "button"}
      disabled={disabled}
      className={baseClasses}
      {...rest}
    >
      {icon && <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>}
      {children && <span className="select-none font-extrabold drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.6)]">{children}</span>}
    </button>
  );
}

