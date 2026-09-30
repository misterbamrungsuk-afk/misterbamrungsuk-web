"use client";

import { useRouter } from "next/navigation";
import { useI18n, type Lang } from "@/i18n/provider";
import { TopBar } from "@/components/shell";

export default function LanguagePage() {
  const { lang, setLang } = useI18n();
  const router = useRouter();
  const th = lang === "th";
  const opts: { k: Lang | "zh"; code: string; name: string; sub: string }[] = [
    { k: "th", code: "TH", name: "ภาษาไทย", sub: "Thai" },
    { k: "en", code: "EN", name: "English", sub: "อังกฤษ" },
    { k: "zh", code: "中", name: "中文", sub: th ? "เร็วๆ นี้" : "Coming soon" },
  ];
  return (
    <>
      <TopBar back="/profile" title={th ? "ภาษา" : "Language"} right={<span />} />
      <main className="px-4 pt-6 pb-28 flex flex-col gap-3">
        <h2 className="font-display text-2xl font-semibold">{th ? "เลือกภาษา" : "Choose your language"}</h2>
        <p className="text-sm text-ink-300 -mt-2 mb-2">{th ? "Choose your language" : "เลือกภาษา"}</p>
        <div role="radiogroup" className="flex flex-col gap-3">
          {opts.map((o) => {
            const on = o.k === lang, disabled = o.k === "zh";
            return (
              <button key={o.k} role="radio" aria-checked={on} disabled={disabled} onClick={() => { if (o.k !== "zh") setLang(o.k); }}
                className={`glass rounded-3xl flex items-center gap-3.5 p-4 text-left transition ${on ? "border-gold-500 bg-gold-500/5" : ""} ${disabled ? "opacity-50" : ""}`}>
                <span className="w-11 h-11 rounded-xl bg-ink-700 font-display font-semibold grid place-items-center shrink-0">{o.code}</span>
                <span className="flex-1 min-w-0"><b className="block font-medium">{o.name}</b><span className="text-xs text-ink-300">{o.sub}</span></span>
                <span className={`w-6 h-6 rounded-full border grid place-items-center shrink-0 ${on ? "border-gold-500" : "border-ink-600"}`}>{on && <span className="w-3 h-3 rounded-full bg-gold-500" />}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-ink-300 text-center mt-2">{th ? "เปลี่ยนได้ภายหลังที่ บัญชี › ภาษา" : "Change anytime in Account › Language"}</p>
        <button onClick={() => router.push("/profile")} className="btn-crimson h-14 rounded-full font-display font-semibold text-lg mt-2">{th ? "เสร็จสิ้น" : "Done"}</button>
      </main>
    </>
  );
}
