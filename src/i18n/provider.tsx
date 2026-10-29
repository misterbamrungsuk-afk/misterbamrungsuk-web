"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SITE, type SiteDict } from "./site";
import th from "./th";
import en from "./en";

import { LANG_COOKIE, type Lang } from "./lang";
export type { Lang } from "./lang";
// ข้อความชุดเก่า (th/en) ยังไม่มีจีน → ใช้ภาษาอังกฤษแทน · หน้าลูกค้าใช้ SITE (src/i18n/site.ts) ครบ 3 ภาษา
const dicts = { th, en, zh: en };
export type Dict = typeof th;

const I18nCtx = createContext<{ lang: Lang; t: Dict; s: SiteDict; setLang: (l: Lang) => void }>({
  lang: "th",
  t: th,
  s: SITE.th,
  setLang: () => {},
});

export function I18nProvider({ children, initial = "th" }: { children: React.ReactNode; initial?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initial);

  // ภาษาตั้งต้นมาจากเซิร์ฟเวอร์ (คุกกี้ / Accept-Language ใน layout) → ไม่ต้องอ่านคุกกี้ซ้ำ (กันหน้ากระพริบ/hydration mismatch)
  useEffect(() => { setLangState(initial); }, [initial]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l === "zh" ? "zh-Hans" : l;
  }, []);

  return <I18nCtx.Provider value={{ lang, t: dicts[lang], s: SITE[lang], setLang }}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "th" ? "en" : "th")}
      className={`btn-ghost rounded-full px-3 min-h-9 inline-flex items-center text-xs font-semibold tracking-wide ${className}`}
      aria-label="switch language"
    >
      <span className={lang === "th" ? "text-crimson-300" : "text-ink-300"}>ไทย</span>
      <span className="text-[#9a8a85] mx-1">/</span>
      <span className={lang === "en" ? "text-crimson-300" : "text-ink-300"}>EN</span>
    </button>
  );
}

/** ปุ่มสลับภาษา ไทย · EN · 中文 — ตั้งคุกกี้แล้วให้หน้า server render ใหม่ (ชื่อหน้า/ข้อมูลจากเซิร์ฟเวอร์เปลี่ยนตาม) */
export function LangSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang, s } = useI18n();
  const router = useRouter();
  const pick = (l: Lang) => { if (l === lang) return; setLang(l); router.refresh(); };
  return (
    <div role="group" aria-label={s.common.lang} data-lang-switch={lang} className={`inline-flex items-center rounded-full p-[3px] ${className}`} style={{ background: "rgba(232,196,114,0.16)" }}>
      {([["th", "ไทย"], ["en", "EN"], ["zh", "中文"]] as const).map(([k, l]) => (
        <button key={k} type="button" lang={k === "zh" ? "zh-Hans" : k} aria-pressed={lang === k} data-lang={k} onClick={() => pick(k)}
          className="min-w-11 h-9 px-2 rounded-full text-[12.5px] font-semibold tracking-normal" style={lang === k ? { background: "#e8c472", color: "#1b130b" } : { color: "#e8c472" }}>{l}</button>
      ))}
    </div>
  );
}
