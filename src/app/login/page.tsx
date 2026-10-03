"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, LangToggle } from "@/i18n/provider";
import { Logo } from "@/components/ui";
import { hasSupabase } from "@/lib/supabase";
import { isDemo } from "@/lib/data";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function login() {
    if (isDemo || !hasSupabase) {
      // โหมดสาธิต — ตั้ง session cookie แล้วเข้าชมระบบด้วยบัญชีตัวอย่าง
      setLoading(true);
      document.cookie = "hamoo_session=demo; path=/; max-age=604800";
      const next = new URLSearchParams(window.location.search).get("next") || "/home";
      setTimeout(() => router.push(next), 600);
      return;
    }
    const { supabaseBrowser } = await import("@/lib/supabase");
    const supabase = supabaseBrowser();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=/home` },
    });
  }

  return (
    <main className="app-frame relative bg-white flex flex-col px-5 pt-5 pb-8">
      <div className="flex items-center justify-between">
        <Logo size={30} />
        <LangToggle />
      </div>

      {/* รูปเป็นการ์ดโค้งมน + ป้ายความน่าเชื่อถือ */}
      <div className="relative mt-5 h-[40dvh] min-h-[280px] rounded-[28px] overflow-hidden shadow-[0_18px_40px_rgba(16,16,24,.14)] animate-rise">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=75" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <span className="absolute top-3 left-3 h-8 px-3 rounded-full bg-white/95 shadow-sm text-[12px] font-semibold text-ink-100 flex items-center gap-1.5">
          <span className="text-emerald-600">✓</span> หมอยืนยันตัวตนทุกคน
        </span>
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
          <span className="h-8 px-3 rounded-full bg-white/95 shadow-sm text-[12px] font-bold text-ink-100 flex items-center gap-1"><span className="text-amber-500">★</span>4.9 · รีวิวจริง</span>
          <span className="h-8 px-3 rounded-full bg-white/95 shadow-sm text-[12px] font-semibold text-ink-100 flex items-center">ถึงที่ใน 60 นาที</span>
        </div>
      </div>

      <section className="mt-6 flex flex-col animate-rise">
        <p className="text-[11.5px] font-semibold tracking-[0.2em] text-gold-600">PREMIUM MALE MASSAGE</p>
        <h1 className="font-display text-[30px] leading-[1.2] font-bold mt-2 text-ink-100">ผ่อนคลายแบบมืออาชีพ<br />ถึงที่ของคุณ<span className="text-crimson-500">.</span></h1>
        <p className="text-ink-300 text-[14.5px] mt-2.5 leading-relaxed">{t.brandSub}</p>

        <button onClick={login} disabled={loading}
          className="btn-crimson mt-6 h-14 w-full font-semibold text-[15.5px] flex items-center justify-center gap-3">
          {!loading && <span className="w-8 h-8 rounded-full bg-white grid place-items-center"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg></span>}
          {loading ? "…" : t.loginWithGoogle}
        </button>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[["🛡️", "KYC ทุกคน"], ["💳", "จ่ายผ่านระบบ"], ["🆘", "SOS 24 ชม."]].map(([i, l]) => (
            <div key={l} className="rounded-2xl bg-ink-850 border border-ink-600 py-2.5">
              <div className="text-base leading-none">{i}</div>
              <div className="text-[11.5px] text-ink-200 mt-1.5 font-medium">{l}</div>
            </div>
          ))}
        </div>

        {(isDemo || !hasSupabase) && (
          <p className="mt-4 text-center text-[11.5px] text-ink-400">{t.demoBadge} — ข้อมูลจำลอง ไม่ต้องตั้งค่า</p>
        )}

        <a href="/join" className="mt-5 flex items-center gap-3 rounded-2xl border border-ink-600 bg-white shadow-[0_4px_16px_rgba(16,16,24,.05)] px-4 py-3.5">
          <span className="w-10 h-10 rounded-xl bg-gold-500 text-[#1a1206] grid place-items-center font-display font-bold shrink-0">MB</span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-ink-100">สมัครเป็นหมอนวด / เพื่อนเที่ยวพรีเมียม</span>
            <span className="block text-xs text-ink-300">รับจำกัด 50 ท่าน · อบรม 2 วัน</span>
          </span>
          <span className="w-8 h-8 rounded-full bg-ink-700 grid place-items-center text-ink-200" aria-hidden>→</span>
        </a>

        <div className="mt-6 flex items-center justify-between text-xs">
          <a href="/welcome" className="text-ink-200 font-medium py-2">รู้จักเราก่อน →</a>
          <span className="text-ink-400">18+ · นวดเพื่อสุขภาพเท่านั้น</span>
        </div>
      </section>
    </main>
  );
}
