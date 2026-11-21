"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Swords,
  Shield,
  RefreshCw,
  AlertCircle,
  Search,
  Calendar,
  Flag,
} from "lucide-react";
import { safeFetchJson } from "@/lib/apiClient";
import { useLanguage } from "@/lib/i18n";
import { GameButton, GameInput } from "@/components/game";
import {
  CwlRosterCard,
  PlayerScoutInspector,
  cleanClanDisplayName,
  cn,
  localizeWarState,
  type CwlRoundSummary,
  type CwlScoutReport,
  type ScoutData,
  type ThreeStarDefenseEntry,
} from "./CwlRosterCard";
import { ScoutedSummaryBar } from "./ScoutedSummaryBar";
import "../clan/clan.css";

export type { ThreeStarDefenseEntry, CwlRoundSummary, ScoutData };

function getOpponentKey(opp: ScoutData, idx: number): string {
  return opp.playerTag || `${opp.opponentName}-${idx}`;
}

export default function ScoutedArmyCard({
  initialClanTag,
}: {
  initialClanTag?: string;
}) {
  const { isTr, t, fmtNum, fmtTemplate, getApiErrorMessage } = useLanguage();

  const [clanTagInput, setClanTagInput] = useState(initialClanTag || "#2PP");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [report, setReport] = useState<CwlScoutReport | null>(null);
  const [rosterFilter, setRosterFilter] = useState<"cwl" | "all">("cwl");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Round / Battle Day Switcher State & Ref Cache
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const cacheRef = useRef<Record<string, CwlScoutReport>>({});

  const updateUrl = (tag: string, round?: number | null) => {
    if (typeof window === "undefined") return;
    const clean = tag.trim().replace(/^#/, "");
    if (!clean || !window.location.hash.startsWith("#/cwl")) return;
    const base = `#/cwl?clan=${encodeURIComponent(clean)}`;
    const finalHash = round ? `${base}&round=${round}` : base;
    if (window.location.hash !== finalHash) {
      window.history.replaceState(null, "", finalHash);
    }
  };

  const pickDefaultKey = (list: ScoutData[]): string | null => {
    if (!list || list.length === 0) return null;
    const sorted = [...list].sort((a, b) => {
      const aCwl = Boolean(a.isCwl);
      const bCwl = Boolean(b.isCwl);
      if (aCwl !== bCwl) return aCwl ? -1 : 1;
      return (a.mapPosition ?? 999) - (b.mapPosition ?? 999);
    });
    const firstWithArmyIdx = sorted.findIndex(
      (o) => Boolean(o.armyDetected && (o.armyShareCode || "").trim())
    );
    const chosenIdx = firstWithArmyIdx >= 0 ? firstWithArmyIdx : 0;
    return getOpponentKey(sorted[chosenIdx], chosenIdx);
  };

  const handleScoutClan = useCallback(
    async (
      tagToFetch: string,
      forceRefresh = false,
      filterOverride?: "cwl" | "all",
      roundOverride?: number | null
    ) => {
      const clean = tagToFetch.trim().replace(/^#/, "");
      if (!clean) return;
      const targetFilter =
        filterOverride !== undefined ? filterOverride : rosterFilter;
      const targetRound =
        roundOverride !== undefined ? roundOverride : selectedRound;

      const cacheKey = `${clean}_r${targetRound || "def"}_${targetFilter}`;
      if (!forceRefresh && cacheRef.current[cacheKey]) {
        const cached = cacheRef.current[cacheKey];
        setReport(cached);
        setSelectedRound(cached.roundNumber || targetRound || null);
        updateUrl(clean, cached.roundNumber || targetRound);
        setSelectedKey(pickDefaultKey(cached.opponents || []));
        setStatusMsg(null);
        return;
      }

      setLoading(true);
      setStatusMsg(null);
      try {
        let path = `/api/v1/cwl/scout/${encodeURIComponent(
          clean
        )}?force_refresh=${forceRefresh}&roster_filter=${targetFilter}`;
        if (targetRound) {
          path += `&round=${targetRound}`;
        }
        const body = await safeFetchJson<CwlScoutReport>(path);
        setReport(body);
        cacheRef.current[cacheKey] = body;
        const activeR = body.roundNumber || targetRound || null;
        setSelectedRound(activeR);
        updateUrl(clean, activeR);
        setSelectedKey(pickDefaultKey(body.opponents || []));

        if (!body.opponents || body.opponents.length === 0) {
          if (body.status === "unrevealed") {
            setStatusMsg(
              isTr
                ? "Sonraki tur rakibi henüz belli değil."
                : "Next round opponent has not been revealed yet."
            );
          } else {
            setStatusMsg(fmtTemplate(t.cwl.noRosterFound, { tag: clean }));
          }
        }
      } catch (err: unknown) {
        setStatusMsg(getApiErrorMessage(err));
        setReport(null);
        setSelectedKey(null);
      } finally {
        setLoading(false);
      }
    },
    [rosterFilter, selectedRound, isTr, t, fmtTemplate, getApiErrorMessage]
  );

  useEffect(() => {
    let initialTag = initialClanTag || "#2PP";
    let initialRound: number | null = null;
    if (
      typeof window !== "undefined" &&
      window.location.hash.includes("#/cwl")
    ) {
      const parts = window.location.hash.split("?");
      if (parts[1]) {
        const params = new URLSearchParams(parts[1]);
        const clanParam = params.get("clan");
        const roundParam = params.get("round");
        if (clanParam)
          initialTag = clanParam.startsWith("#") ? clanParam : `#${clanParam}`;
        if (roundParam) {
          const parsed = parseInt(roundParam, 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 7) {
            initialRound = parsed;
          }
        }
      }
    }
    setClanTagInput(initialTag);
    setSelectedRound(initialRound);
    handleScoutClan(initialTag, false, "cwl", initialRound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClanTag]);

  const handleFilterChange = (newFilter: "cwl" | "all") => {
    if (newFilter === rosterFilter) return;
    setRosterFilter(newFilter);
    handleScoutClan(clanTagInput, false, newFilter, selectedRound);
  };

  const handleSelectOpponent = (key: string) => {
    const isDesktop =
      typeof window !== "undefined" && window.innerWidth >= 1024;
    if (isDesktop) {
      setSelectedKey(key);
    } else {
      setSelectedKey((prev) => (prev === key ? null : key));
    }
  };

  const opponents = report?.opponents || [];

  const sortedOpponents = useMemo(() => {
    return [...opponents].sort((a, b) => {
      const aCwl = Boolean(a.isCwl);
      const bCwl = Boolean(b.isCwl);
      if (aCwl !== bCwl) {
        return aCwl ? -1 : 1;
      }
      const aPos = a.mapPosition ?? 999;
      const bPos = b.mapPosition ?? 999;
      return aPos - bPos;
    });
  }, [opponents]);

  const selectedEntry = useMemo(() => {
    if (sortedOpponents.length === 0) return null;
    if (selectedKey) {
      const idx = sortedOpponents.findIndex(
        (o, i) => getOpponentKey(o, i) === selectedKey
      );
      if (idx >= 0) return { player: sortedOpponents[idx], rank: idx };
    }
    return { player: sortedOpponents[0], rank: 0 };
  }, [sortedOpponents, selectedKey]);

  const cwlCount =
    report?.cwlCount ??
    (opponents.some((o) => o.isCwl !== undefined)
      ? opponents.filter((o) => o.isCwl).length
      : 15);
  const allCount = report?.allCount ?? opponents.length;

  const inWarRound = report?.roundsSummary?.find(
    (r) => r.state.toLowerCase() === "inwar"
  );
  const prepRound = report?.roundsSummary?.find(
    (r) => r.state.toLowerCase() === "preparation"
  );
  const activeRoundNumber = report?.roundNumber || 1;

  return (
    <div className="w-full min-w-0 font-sans text-[var(--ui-text-main)] space-y-4">
      {/* 1. Compact Top Command & Clan Summary Panel */}
      <div className="ui-panel overflow-hidden min-w-0">
        <div className="ui-panel-header px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Search
              size={16}
              className="text-[var(--ui-text-gold)] shrink-0"
            />
            <h1 className="font-game text-sm sm:text-base font-extrabold text-[var(--ui-text-main)] truncate">
              {isTr ? "CWL Keşif" : "CWL Scout"}
            </h1>
          </div>

          {report && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--game-dark-box-dark)] border border-[var(--ui-text-gold)]/60 text-xs font-extrabold text-[var(--ui-text-gold)] tabular-nums shrink-0">
              <Flag size={11} className="shrink-0" />
              <span>
                {fmtTemplate(t.cwl.roundLabel, {
                  round: activeRoundNumber,
                })}
              </span>
            </span>
          )}
        </div>

        <div className="p-3.5 sm:p-4 space-y-3">
          {/* Search Input + Scan/Refresh Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <GameInput
              prefixTag="#"
              value={clanTagInput.replace(/^#/, "")}
              onChange={(e) =>
                setClanTagInput(`#${e.target.value.replace(/^#/, "")}`)
              }
              onKeyDown={(e) =>
                e.key === "Enter" && handleScoutClan(clanTagInput, false)
              }
              placeholder={t.cwl.searchPlaceholder}
              aria-label={t.cwl.searchPlaceholder}
              containerClassName="flex-1 min-w-0"
              className="text-base"
            />

            <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
              <GameButton
                variant="green"
                size="md"
                onClick={() => handleScoutClan(clanTagInput, false)}
                disabled={loading}
                icon={<Search size={15} />}
                className="min-h-[44px] px-4 text-xs sm:text-sm whitespace-nowrap"
              >
                {loading
                  ? t.cwl.scanning
                  : isTr
                  ? "Tara"
                  : "Scan"}
              </GameButton>

              <GameButton
                variant="blue"
                size="md"
                onClick={() => handleScoutClan(clanTagInput, true)}
                disabled={loading}
                icon={
                  <RefreshCw
                    size={15}
                    className={cn(loading && "animate-spin")}
                  />
                }
                className="min-h-[44px] px-4 text-xs sm:text-sm whitespace-nowrap"
                title={isTr ? "Yenile" : "Refresh"}
                aria-label={isTr ? "Yenile" : "Refresh"}
              >
                {isTr ? "Yenile" : "Refresh"}
              </GameButton>
            </div>
          </div>

          {/* CWL Rounds Strip (only when CWL group exists) */}
          {report && report.roundsSummary && report.roundsSummary.length > 0 && (
            <div className="pt-3 border-t border-[var(--ui-panel-border)] flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[var(--ui-text-muted)] mr-1">
                  <Calendar
                    size={14}
                    className="text-[var(--ui-text-gold)] shrink-0"
                  />
                  <span>{isTr ? "Tur:" : "Round:"}</span>
                </span>
                {report.roundsSummary.map((r) => {
                  const isSelected = activeRoundNumber === r.roundNumber;
                  const isUnrevealed = r.state === "unrevealed";
                  const isInWar = r.state.toLowerCase() === "inwar";
                  const isPrep = r.state.toLowerCase() === "preparation";
                  const oppLabel = r.opponentClan?.name
                    ? `vs ${cleanClanDisplayName(r.opponentClan.name, isTr)} (${localizeWarState(r.state, t, isTr)})`
                    : localizeWarState(r.state, t, isTr);

                  return (
                    <button
                      key={r.roundNumber}
                      type="button"
                      disabled={isUnrevealed || loading}
                      title={oppLabel}
                      onClick={() =>
                        handleScoutClan(
                          clanTagInput,
                          false,
                          rosterFilter,
                          r.roundNumber
                        )
                      }
                      className={cn(
                        "min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-1 border-2 transition-colors tabular-nums",
                        isSelected
                          ? "bg-[var(--ui-tab-active-bg)] text-[var(--ui-text-main)] border-[var(--ui-text-gold)] shadow-sm"
                          : isUnrevealed
                          ? "bg-[var(--ui-tab-inactive-bg)] border-[var(--ui-panel-border)] text-[var(--ui-text-muted)] opacity-50 cursor-not-allowed"
                          : "bg-[var(--game-dark-box-dark)] hover:bg-[var(--game-dark-box-light)] border-[var(--ui-panel-border)] text-[var(--ui-text-main)] cursor-pointer"
                      )}
                    >
                      <span>{isTr ? `T${r.roundNumber}` : `R${r.roundNumber}`}</span>
                      {(isInWar || isPrep) && (
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            isInWar
                              ? "bg-[var(--ui-text-green)]"
                              : "bg-[var(--ui-text-blue)]"
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={!inWarRound || loading}
                  onClick={() => {
                    if (inWarRound) {
                      handleScoutClan(
                        clanTagInput,
                        false,
                        rosterFilter,
                        inWarRound.roundNumber
                      );
                    }
                  }}
                  className={cn(
                    "min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors border",
                    inWarRound && activeRoundNumber === inWarRound.roundNumber
                      ? "game-btn game-btn-green"
                      : inWarRound
                      ? "bg-[var(--game-dark-box-dark)] hover:bg-[var(--game-dark-box-light)] border-[var(--ui-panel-border)] text-[var(--ui-text-main)] cursor-pointer"
                      : "bg-[var(--ui-tab-inactive-bg)] border-[var(--ui-panel-border)] text-[var(--ui-text-muted)] opacity-55 cursor-not-allowed"
                  )}
                >
                  <Swords size={13} className="shrink-0" />
                  <span>{isTr ? "Savaş Günü" : "War Day"}</span>
                </button>

                <button
                  type="button"
                  disabled={!prepRound || loading}
                  onClick={() => {
                    if (prepRound) {
                      handleScoutClan(
                        clanTagInput,
                        false,
                        rosterFilter,
                        prepRound.roundNumber
                      );
                    }
                  }}
                  className={cn(
                    "min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors border",
                    prepRound && activeRoundNumber === prepRound.roundNumber
                      ? "game-btn game-btn-blue"
                      : prepRound
                      ? "bg-[var(--game-dark-box-dark)] hover:bg-[var(--game-dark-box-light)] border-[var(--ui-panel-border)] text-[var(--ui-text-main)] cursor-pointer"
                      : "bg-[var(--ui-tab-inactive-bg)] border-[var(--ui-panel-border)] text-[var(--ui-text-muted)] opacity-55 cursor-not-allowed"
                  )}
                >
                  <Shield size={13} className="shrink-0" />
                  <span>{isTr ? "Hazırlık Günü" : "Prep Day"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Opponent Clan Info + CWL/All Toggle */}
          <ScoutedSummaryBar
            report={report}
            clanTagInput={clanTagInput}
            opponents={sortedOpponents}
            rosterFilter={rosterFilter}
            cwlCount={cwlCount}
            allCount={allCount}
            loading={loading}
            onFilterChange={handleFilterChange}
          />
        </div>
      </div>

      {/* Preparation Day / Status Messages */}
      {report?.isPreparationDay && (
        <div className="ui-info p-3 border-[var(--ui-text-gold)]/50 flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-[var(--ui-text-gold)]">
          <Shield size={18} className="shrink-0" />
          <span>{t.cwl.prepNotice}</span>
        </div>
      )}

      {statusMsg && (
        <div className="ui-info p-3 border-[var(--ui-text-red)]/60 text-xs sm:text-sm font-semibold text-[var(--ui-text-red)] flex items-center gap-2.5">
          <AlertCircle size={17} className="shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* 2. Simplified Master-Detail Scout Workspace */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 ui-panel p-4 space-y-2.5">
            {Array.from({ length: 5 }).map((_, sIdx) => (
              <div
                key={`skel-${sIdx}`}
                className="animate-pulse ui-info p-3 h-[64px] rounded-2xl"
              />
            ))}
          </div>
          <div className="hidden lg:block lg:col-span-7 ui-panel p-4 h-[420px] animate-pulse" />
        </div>
      ) : sortedOpponents.length === 0 ? (
        <div className="ui-panel p-6 text-center text-xs sm:text-sm font-bold text-[var(--ui-text-muted)]">
          {isTr
            ? "Kadroda gösterilecek oyuncu bulunamadı."
            : "No players found in roster."}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* LEFT: Clean Selectable Opponent List (5 cols) */}
          <div className="lg:col-span-5 ui-panel overflow-hidden min-w-0">
            <div className="ui-panel-header px-4 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Swords
                  size={15}
                  className="text-[var(--ui-text-gold)] shrink-0"
                />
                <h2 className="font-game text-xs sm:text-sm font-extrabold text-[var(--ui-text-main)] truncate">
                  {isTr ? "Rakip Oyuncular" : "Opponent Lineup"}
                </h2>
              </div>
              <span className="text-xs font-bold text-[var(--ui-text-muted)] tabular-nums shrink-0">
                {fmtNum(sortedOpponents.length)} {isTr ? "oyuncu" : "players"}
              </span>
            </div>

            <div className="p-2.5 sm:p-3 space-y-2 lg:max-h-[760px] lg:overflow-y-auto">
              {sortedOpponents.map((opp, idx) => {
                const oppKey = getOpponentKey(opp, idx);
                const isSelected = selectedKey === oppKey;
                return (
                  <CwlRosterCard
                    key={oppKey}
                    opponent={opp}
                    index={idx}
                    isExpanded={isSelected}
                    onToggleExpand={() => handleSelectOpponent(oppKey)}
                  />
                );
              })}
            </div>

            <div className="px-3.5 py-2 text-[11px] font-semibold text-[var(--ui-text-muted)] bg-[var(--game-dark-box-dark)] border-t border-[var(--ui-panel-border)]">
              {t.cwl.footnote}
            </div>
          </div>

          {/* RIGHT (Desktop >= lg): Dedicated Selected Player & Army Inspector (7 cols) */}
          <div className="hidden lg:block lg:col-span-7 lg:sticky lg:top-4 min-w-0">
            {selectedEntry && (
              <PlayerScoutInspector
                player={selectedEntry.player}
                rank={selectedEntry.rank}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
