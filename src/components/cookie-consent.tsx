"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { readConsent, saveConsent } from "@/lib/consent";
import { useI18n } from "@/i18n/provider";

// หน้าทีมงาน (/admin*, /admin-login, /ceo) ไม่ขอความยินยอม — ไม่ใช่หน้าลูกค้า และแบนเนอร์บังปุ่มด้านล่าง
const isStaff = (p: string | null) => !!p && (p === "/admin" || p.startsWith("/admin/") || p.startsWith("/admin-login") || p === "/ceo");

// แบนเนอร์ขอความยินยอมคุกกี้ (PDPA) — analytics/pixel โหลดได้หลัง hasConsent() เท่านั้น
export function CookieConsent() {
  const path = usePathname();
  if (isStaff(path)) return null;
  return <ConsentBanner />;
}

function ConsentBanner() {
  const K = useI18n().s.cookie;
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const c = readConsent();
    if (!c) setOpen(true);
    else { setAnalytics(c.analytics); setMarketing(c.marketing); }
    const reopen = () => { setOpen(true); setSettings(true); };
    window.addEventListener("mb-consent-open", reopen);
    return () => window.removeEventListener("mb-consent-open", reopen);
  }, []);

  if (!open) return null;
  const done = (a: boolean, m: boolean) => { saveConsent({ analytics: a, marketing: m }); setAnalytics(a); setMarketing(m); setOpen(false); setSettings(false); };

  const Toggle = ({ label, desc, on, set, locked }: { label: string; desc: string; on: boolean; set?: (v: boolean) => void; locked?: boolean }) => (
    <label className="flex items-start gap-3 py-2 border-t border-[#d4a72c]/20">
      <span className="flex-1"><b className="block text-[13px] text-[#f3e3b5]">{label}</b><span className="text-[12px] text-[#b9ab8a]">{desc}</span></span>
      <input type="checkbox" checked={on} disabled={locked} onChange={(e) => set?.(e.target.checked)} className="mt-1 w-5 h-5 accent-[#d4a72c]" />
    </label>
  );

  return (
    <div role="dialog" aria-label={K.aria} className="fixed inset-x-0 bottom-0 z-[90] p-3 pb-[max(12px,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-[480px] rounded-2xl border border-[#d4a72c]/60 bg-[#14110b]/95 backdrop-blur text-[#e9dfc7] shadow-[0_12px_40px_rgba(0,0,0,.5)] p-4">
        <p className="text-[13px] leading-relaxed">
          {K.text}
          {" "}<a href="/privacy" className="underline text-[#e8c25a]">{K.privacy}</a> · <a href="/page/terms" className="underline text-[#e8c25a]">{K.terms}</a>
        </p>
        {settings && (
          <div className="mt-2">
            <Toggle label={K.need[0]} desc={K.need[1]} on locked />
            <Toggle label={K.stats[0]} desc={K.stats[1]} on={analytics} set={setAnalytics} />
            <Toggle label={K.mkt[0]} desc={K.mkt[1]} on={marketing} set={setMarketing} />
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={() => done(true, true)} className="flex-1 min-w-[120px] h-10 rounded-full bg-gradient-to-b from-[#e8c25a] to-[#b8860b] text-[#1a1206] font-semibold text-[13px]">{K.all}</button>
          <button onClick={() => done(false, false)} className="flex-1 min-w-[120px] h-10 rounded-full border border-[#d4a72c]/70 text-[#f3e3b5] text-[13px]">{K.needOnly}</button>
          {settings
            ? <button onClick={() => done(analytics, marketing)} className="w-full h-10 rounded-full border border-[#d4a72c]/40 text-[#e8c25a] text-[13px]">{K.save}</button>
            : <button onClick={() => setSettings(true)} className="w-full h-9 text-[12.5px] text-[#e8c25a] underline">{K.settings}</button>}
        </div>
      </div>
    </div>
  );
}
