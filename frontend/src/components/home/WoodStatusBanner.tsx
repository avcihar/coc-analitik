"use client";

import React, { useState } from "react";
import { Megaphone, Search } from "lucide-react";
import GameButton from "@/components/game/GameButton";

export interface WoodStatusBannerProps {
  title: string;
  placeholder: string;
  buttonLabel: string;
  onQuickSearch: (query: string) => void;
}

export default function WoodStatusBanner({
  title,
  placeholder,
  buttonLabel,
  onQuickSearch,
}: WoodStatusBannerProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onQuickSearch(query);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="ui-panel-header w-full rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border-2 border-[var(--ui-panel-header-border)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-xl ui-info flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <Megaphone size={18} className="text-[var(--ui-text-gold)]" />
        </div>
        <p className="font-game font-extrabold game-title-stroke text-sm sm:text-base leading-snug text-[var(--ui-text-main)]">
          {title}
        </p>
      </div>

      <div className="flex items-center gap-2 w-full lg:w-auto lg:min-w-[400px] min-w-0">
        <div className="ui-input flex items-center flex-1 min-w-0 min-h-[44px] px-3 gap-2 focus-within:ring-2 focus-within:ring-[var(--ui-text-gold)]">
          <span
            className="font-game font-extrabold text-base text-[var(--ui-text-gold)] select-none shrink-0"
            aria-hidden="true"
          >
            #
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="w-full min-w-0 bg-transparent border-0 outline-none text-base font-semibold text-[var(--ui-input-text)] placeholder:text-[var(--ui-text-muted)] placeholder:opacity-70 tabular-nums"
          />
        </div>

        <GameButton
          type="submit"
          variant="green"
          size="md"
          icon={<Search size={16} aria-hidden="true" />}
          className="min-h-[44px] shrink-0 px-3.5 sm:px-4 text-xs sm:text-sm whitespace-nowrap"
        >
          {buttonLabel}
        </GameButton>
      </div>
    </form>
  );
}
