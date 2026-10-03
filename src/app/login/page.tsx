"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, LangToggle } from "@/i18n/provider";
import { Logo } from "@/components/ui";
import { hasSupabase } from "@/lib/supabase";
import { isDemo } from "@/lib/data";

const inputCls = "h-12 w-full rounded-2xl border border-gold-500/45 bg-white px-4 text-[15px] outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function emailLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const out = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!out.ok) throw new Error(out.error || "เข้าสู่ระบบไม่สำเร็จ");
      const next = new URLSearchParams(window.location.search).get("next") || "/home";
      router.push(next.startsWith("/") && !next.startsWith("//") ? next : "/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
      setBusy(false);
    }
  }

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
    <main className="app-frame relative overflow-hidden bg-ink-950">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="https://images.unsplash.com/photo-1615269143162-592b3882fcbe?auto=format&fit=crop&w=900&q=70" alt="" className="absolute inset-x-0 top-0 h-[66dvh] w-full object-cover" />
      <div className="absolute inset-x-0 top-0 h-[66dvh] bg-gradient-to-b from-transparent via-ink-950/55 to-ink-950" />

      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <Logo size={30} />
        <LangToggle />
      </div>

      <section className="relative z-10 px-6 pb-9 pt-[34dvh] flex flex-col gap-5 animate-rise">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.2em] text-[#8f5e00] flex items-center gap-2"><span className="w-6 h-px bg-[#b8860b]" />VVIP MALE MASSAGE</p>
          <h1 className="font-display text-[30px] leading-tight font-bold mt-1.5"><span className="whitespace-nowrap">ผ่อนคลายแบบมืออาชีพ</span><br /><span className="bg-gradient-to-r from-[#b8860b] via-[#e0a400] to-[#9a6b00] bg-clip-text text-transparent">ถึงที่ของคุณ</span></h1>
          <p className="text-ink-200 text-[15px] mt-2.5 leading-relaxed">{t.brandSub}</p>
        </div>

        <button
          onClick={login}
          disabled={loading}
          className="h-14 w-full rounded-full text-white font-semibold flex items-center justify-center gap-3 bg-[linear-gradient(180deg,#c8142a,#8f0d1d)] border border-gold-500/70 shadow-[0_10px_24px_rgba(143,13,29,.32),inset_0_1px_0_rgba(255,220,140,.35)] transition active:scale-[.98] disabled:opacity-60"
        >
          {!loading && (
            <span className="w-8 h-8 rounded-full bg-white grid place-items-center"><svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg></span>
          )}
          {loading ? "…" : t.loginWithGoogle}
        </button>

        <div className="flex items-center gap-3 text-[12px] text-ink-400"><span className="flex-1 h-px bg-gold-500/35" />หรือ<span className="flex-1 h-px bg-gold-500/35" /></div>

        <form onSubmit={emailLogin} className="flex flex-col gap-2.5">
          <input type="email" required autoComplete="email" placeholder="อีเมล" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          <input type="password" required autoComplete="current-password" placeholder="รหัสผ่าน" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          {error && <p className="text-[12.5px] text-[#b3122a]" role="alert">{error}</p>}
          <button type="submit" disabled={busy} className="h-12 w-full rounded-full font-semibold border border-gold-500/70 bg-[linear-gradient(180deg,#fffdf6,#fff)] text-[#3a2a06] shadow-[0_6px_18px_rgba(120,80,0,.08)] transition active:scale-[.98] disabled:opacity-60">
            {busy ? "…" : "เข้าสู่ระบบด้วยอีเมล"}
          </button>
          <a href="/auth/register" className="text-[13px] text-ink-200 self-center">ยังไม่มีบัญชี? <span className="font-semibold text-[#8f5e00]">สมัครสมาชิก</span></a>
        </form>

        <p className="flex items-center gap-2 text-[13px] text-ink-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-gold-600 shrink-0"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>
          {t.loginHint}
        </p>

        {(isDemo || !hasSupabase) && (
          <p className="self-start text-[11.5px] text-ink-400">{t.demoBadge} — ข้อมูลจำลอง ไม่ต้องตั้งค่า</p>
        )}
        <a href="/join" className="flex items-center gap-3 rounded-2xl border border-gold-500/45 bg-[linear-gradient(180deg,#fffdf6,#fff)] shadow-[0_6px_18px_rgba(120,80,0,.08)] px-4 py-3">
          <span className="w-10 h-10 rounded-xl bg-gold-500 text-[#1a1206] grid place-items-center font-display font-bold shrink-0">MB</span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold">สมัครเป็นหมอนวด / เพื่อนเที่ยวพรีเมียม</span>
            <span className="block text-xs text-ink-300">รับจำกัด 50 ท่าน · อบรม 2 วัน</span>
          </span>
          <span className="w-8 h-8 rounded-full bg-[#141210] text-[#f3d27a] grid place-items-center text-sm" aria-hidden>→</span>
        </a>
        <a href="/welcome" className="text-ink-200 text-sm font-medium self-start py-2">รู้จักเราก่อน / About us →</a>
        <p className="text-ink-400 text-xs">© 2026 Mister Bamrungsuk · สำหรับผู้มีอายุ 18 ปีขึ้นไป · นวดเพื่อสุขภาพเท่านั้น</p>
      </section>
    </main>
  );
}
