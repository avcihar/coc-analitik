"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { TRANSLATIONS, type Locale, type TranslationDict } from "./translations";
import type { ApiError } from "@/lib/apiClient";

const STORAGE_KEY = "coc-lang";

interface LanguageContextValue {
  locale: Locale;
  isTr: boolean;
  setLocale: (loc: Locale) => void;
  toggleLocale: () => void;
  t: TranslationDict;
  fmtNum: (n: number | null | undefined) => string;
  fmtDec: (n: number, maxDigits?: number) => string;
  fmtPct: (n: number, digits?: number) => string;
  fmtDate: (d: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  fmtTime: (d: Date | string) => string;
  fmtTemplate: (tpl: string, vars: Record<string, string | number>) => string;
  getApiErrorMessage: (err: unknown, fallback?: string) => string;
}

const defaultFmtNum = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? "0" : n.toLocaleString("tr-TR");

const LanguageContext = createContext<LanguageContextValue>({
  locale: "tr",
  isTr: true,
  setLocale: () => {},
  toggleLocale: () => {},
  t: TRANSLATIONS.tr,
  fmtNum: defaultFmtNum,
  fmtDec: (n, d = 1) => n.toLocaleString("tr-TR", { maximumFractionDigits: d }),
  fmtPct: (n, d = 1) => `%${n.toLocaleString("tr-TR", { maximumFractionDigits: d, minimumFractionDigits: d })}`,
  fmtDate: (d) => new Date(d).toLocaleDateString("tr-TR"),
  fmtTime: (d) => new Date(d).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
  fmtTemplate: (tpl, vars) =>
    Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), tpl),
  getApiErrorMessage: () => TRANSLATIONS.tr.errors.generic,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("tr");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "tr") {
        setLocaleState(saved);
        document.documentElement.lang = saved;
        document.title = TRANSLATIONS[saved].metaTitle;
        return;
      }
    } catch {
      // ignore storage access issues
    }
    document.documentElement.lang = "tr";
    document.title = TRANSLATIONS.tr.metaTitle;
  }, []);

  const setLocale = useCallback((loc: Locale) => {
    setLocaleState(loc);
    try {
      localStorage.setItem(STORAGE_KEY, loc);
    } catch {
      // ignore storage errors
    }
    document.documentElement.lang = loc;
    document.title = TRANSLATIONS[loc].metaTitle;
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "tr" ? "en" : "tr");
  }, [locale, setLocale]);

  const intlTag = locale === "tr" ? "tr-TR" : "en-US";
  const dict = (TRANSLATIONS[locale] as unknown) as TranslationDict;

  const fmtNum = useCallback(
    (n: number | null | undefined) => {
      if (n === null || n === undefined || Number.isNaN(n)) return "0";
      return n.toLocaleString(intlTag);
    },
    [intlTag]
  );

  const fmtDec = useCallback(
    (n: number, maxDigits = 1) =>
      n.toLocaleString(intlTag, { maximumFractionDigits: maxDigits }),
    [intlTag]
  );

  const fmtPct = useCallback(
    (n: number, digits = 1) => {
      const num = n.toLocaleString(intlTag, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
      return locale === "tr" ? `%${num}` : `${num}%`;
    },
    [intlTag, locale]
  );

  const fmtDate = useCallback(
    (d: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const dt = typeof d === "string" ? new Date(d) : d;
      return dt.toLocaleDateString(
        intlTag,
        options ?? { day: "numeric", month: "long", year: "numeric" }
      );
    },
    [intlTag]
  );

  const fmtTime = useCallback(
    (d: Date | string) => {
      const dt = typeof d === "string" ? new Date(d) : d;
      return dt.toLocaleTimeString(intlTag, { hour: "2-digit", minute: "2-digit" });
    },
    [intlTag]
  );

  const fmtTemplate = useCallback(
    (tpl: string, vars: Record<string, string | number>) =>
      Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), tpl),
    []
  );

  const getApiErrorMessage = useCallback(
    (err: unknown, fallback?: string) => {
      const e = err as (Partial<ApiError> & { code?: string }) | null;
      const errMap = dict.errors;
      if (e?.code) {
        if (e.code === "NETWORK") return errMap.network;
        if (e.code === "NOT_FOUND_ROUTE") return errMap.notFoundRoute;
        if (e.code === "GATEWAY") return errMap.gateway;
        if (e.code === "SERVER_ERROR") return errMap.serverError;
        if (e.code === "UNEXPECTED_RESPONSE") return errMap.unexpectedResponse;
        if (e.code === "INVALID_JSON") return errMap.invalidJson;
        if (e.code === "FORBIDDEN") return errMap.forbidden;
        if (e.code === "NOT_FOUND") return errMap.notFound;
        if (e.code === "RATE_LIMIT") return errMap.rateLimit;
        if (e.code === "MAINTENANCE") return errMap.maintenance;
      }
      if (e?.status === 404) return errMap.notFound;
      if (e?.status === 429) return errMap.rateLimit;
      if (e?.status === 503) return errMap.maintenance;
      if (e?.status === 403) return errMap.forbidden;
      if (e?.message && locale === "tr") return e.message;
      return fallback || errMap.generic;
    },
    [dict, locale]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      isTr: locale === "tr",
      setLocale,
      toggleLocale,
      t: dict,
      fmtNum,
      fmtDec,
      fmtPct,
      fmtDate,
      fmtTime,
      fmtTemplate,
      getApiErrorMessage,
    }),
    [locale, setLocale, toggleLocale, dict, fmtNum, fmtDec, fmtPct, fmtDate, fmtTime, fmtTemplate, getApiErrorMessage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

