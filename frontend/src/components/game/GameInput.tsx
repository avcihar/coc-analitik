"use client";

import React, { forwardRef } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface GameInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixTag?: string;
  containerClassName?: string;
}

/**
 * Shared GameInput component
 * In-game styled input box with a fixed "#" prefix or custom symbol.
 * Mobile font size is strictly >= 16px to prevent unwanted iOS Safari zooming.
 */
const GameInput = forwardRef<HTMLInputElement, GameInputProps>(
  ({ prefixTag = "#", containerClassName, className, ...rest }, ref) => {
    return (
      <div className={cn("game-input-container focus-within:ring-2 focus-within:ring-amber-400", containerClassName)}>
        {prefixTag && (
          <span className="game-input-tag-prefix">{prefixTag}</span>
        )}
        <input
          ref={ref}
          className={cn("game-input-field", className)}
          {...rest}
        />
      </div>
    );
  }
);

GameInput.displayName = "GameInput";

export default GameInput;

