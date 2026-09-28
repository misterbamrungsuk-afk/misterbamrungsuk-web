"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import th from "./th";
import en from "./en";

export type Lang = "th" | "en";
const dicts = { th, en };
export type Dict = typeof th;

const I18nCtx = createContext<{ lang: Lang; t: Dict; setLang: (l: Lang) => void }>({
  lang: "th",
  t: th,
  setLang: () => {},
});

export function I18nProvider({ children, initial = "th" }: { children: React.ReactNode; initial?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initial);

  useEffect(() => {
    const saved = document.cookie
      .split("; ")
      .find((c) => c.startsWith("hamoo_lang="))
      ?.split("=")[1] as Lang | undefined;
    if (saved === "th" || saved === "en") setLangState(saved);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.cookie = `hamoo_lang=${l}; path=/; max-age=31536000`;
  }, []);

  return <I18nCtx.Provider value={{ lang, t: dicts[lang], setLang }}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "th" ? "en" : "th")}
      className={`btn-ghost rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${className}`}
      aria-label="switch language"
    >
      <span className={lang === "th" ? "text-crimson-300" : "text-ink-300"}>ไทย</span>
      <span className="text-ink-400 mx-1">/</span>
      <span className={lang === "en" ? "text-crimson-300" : "text-ink-300"}>EN</span>
    </button>
  );
}
