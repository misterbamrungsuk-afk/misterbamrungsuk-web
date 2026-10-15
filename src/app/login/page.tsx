"use client";

// บอร์ด C-Login — รูปเต็มบน · โลโก้ (กดกลับหน้าแรก) · หัวข้อ · Google · อีเมล (กดเปิดฟอร์ม) · การ์ดสมัคร Part-Time
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { hasSupabase } from "@/lib/supabase";
import { isDemo } from "@/lib/data";
import { lineAddUrl } from "@/lib/join/config";

const GOLD = "#e8c472";
const field = "h-12 w-full rounded-[14px] border border-[rgba(243,234,217,0.07)] bg-[#211a18] px-[14px] text-[14px] text-[#f3ead9] outline-none focus:border-[#e8c472] placeholder:text-[#b5a596]";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [forgot, setForgot] = useState(false);
  const nextUrl = () => {
    const n = new URLSearchParams(window.location.search).get("next") || "/home";
    return n.startsWith("/") && !n.startsWith("//") ? n : "/home";
  };

  async function emailLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const out = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!out.ok) throw new Error(out.error || "เข้าสู่ระบบไม่สำเร็จ");
      router.push(nextUrl());
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
      setBusy(false);
    }
  }

  async function google() {
    if (isDemo || !hasSupabase) {
      // โหมดสาธิต — ตั้ง session cookie แล้วเข้าชมระบบด้วยบัญชีตัวอย่าง
      setLoading(true);
      document.cookie = "hamoo_session=demo; path=/; max-age=604800";
      setTimeout(() => router.push(nextUrl()), 600);
      return;
    }
    setLoading(true);
    const { supabaseBrowser } = await import("@/lib/supabase");
    const supabase = supabaseBrowser();
    if (!supabase) { setLoading(false); return; }
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback?next=/home` } });
  }

  const ok = !!email.trim() && password.length > 0;

  return (
    <main className="mb-v7 relative min-h-dvh overflow-hidden md:grid md:grid-cols-2" style={{ background: "#171211", color: "#f3ead9", lineHeight: "normal" }}>
      {/* รูปบน (มือถือ) / ครึ่งซ้าย (จอคอม) */}
      <div className="absolute inset-x-0 top-0 h-[470px] md:relative md:h-auto md:min-h-dvh" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/home/login-hero.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 md:hidden" style={{ background: "linear-gradient(180deg, rgba(23,18,17,.15) 0%, rgba(23,18,17,.5) 45%, #171211 100%)" }} />
        <div className="absolute inset-0 hidden md:block" style={{ background: "linear-gradient(90deg, rgba(23,18,17,0) 55%, #171211 100%)" }} />
      </div>

      <div className="relative z-10 flex flex-col min-h-dvh md:min-h-0 md:justify-center mx-auto w-full max-w-[480px]">
        <div className="flex items-center md:absolute md:top-0 md:left-0" style={{ padding: "16px 20px" }}>
          <Link href="/" aria-label="Mister Bamrungsuk · หน้าแรก" className="flex items-center gap-[10px] hover:text-inherit">
            <img src="/brand/logo.png" alt="" width={46} height={46} className="w-[46px] h-[46px] object-contain" />
            <span className="font-brand text-[16px] text-[#e8c472]">Mister Bamrungsuk</span>
          </Link>
        </div>

        <div className="flex-1 md:flex-none" />
        <section className="flex flex-col gap-[14px]" style={{ padding: "24px 20px calc(26px + env(safe-area-inset-bottom))" }}>
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[#e8c472]" style={{ letterSpacing: 3 }}><span className="w-[22px] h-px bg-[#e8c472]" />MISTER BAMRUNGSUK</div>
          <h1 className="m-0 font-bold text-[32px] leading-[1.15]" style={{ textWrap: "balance" }}>เพื่อนกิน เพื่อนเที่ยว<span className="block mt-[37px] text-[#e8c472]">ในแบบของคุณ</span></h1>
          <p className="m-0 text-[14px] text-[#d9c9b4] leading-[1.6]" style={{ textShadow: "0 1px 8px rgba(0,0,0,.6)" }}>เพื่อนทุกคนผ่านการยืนยันตัวตน จ่ายปลอดภัย เงินพักไว้กับเราจนจบนัด</p>

          <button type="button" onClick={google} disabled={loading} className="h-[54px] rounded-full bg-[#e8c472] text-[#1b130b] font-semibold text-[15px] flex items-center justify-center gap-[10px] disabled:opacity-60" style={{ border: `1.5px solid ${GOLD}` }}>
            <span className="w-[30px] h-[30px] rounded-full bg-white grid place-items-center" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
            </span>
            {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบด้วย Google"}
          </button>

          <div className="flex items-center gap-[10px] text-[12px] text-[#b5a596] font-light"><span className="flex-1 h-px" style={{ background: "rgba(232,196,114,0.14)" }} />หรือ<span className="flex-1 h-px" style={{ background: "rgba(232,196,114,0.14)" }} /></div>

          {form ? (
            <form onSubmit={emailLogin} className="flex flex-col gap-[10px]">
              <label className="flex flex-col gap-[5px] text-[12px] text-[#d9c9b4] font-light">อีเมล
                <input type="email" required autoFocus autoComplete="email" inputMode="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={field} /></label>
              <label className="flex flex-col gap-[5px] text-[12px] text-[#d9c9b4] font-light">รหัสผ่าน
                <input type="password" required autoComplete="current-password" placeholder="อย่างน้อย 8 ตัวอักษร" value={password} onChange={(e) => setPassword(e.target.value)} className={field} /></label>
              <button type="button" onClick={() => setForgot(!forgot)} aria-expanded={forgot} className="self-end min-h-8 text-[13px] text-[#e8c472] font-light">ลืมรหัสผ่าน?</button>
              {forgot && <p className="m-0 rounded-[14px] bg-[#211a18] text-[13px] font-light text-[#d9c9b4]" style={{ padding: "10px 14px" }}>ติดต่อแอดมินทาง <a href={lineAddUrl()} target="_blank" rel="noopener noreferrer" className="text-[#e8c472]">LINE</a> เพื่อตั้งรหัสผ่านใหม่</p>}
              {error && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{error}</p>}
              <button type="submit" disabled={!ok || busy} className="h-[50px] rounded-full font-semibold text-[#e8c472] disabled:opacity-45" style={{ border: `1px solid ${GOLD}` }}>{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
              <Link href="/auth/register" className="self-center min-h-10 flex items-center text-[13px] text-[#d9c9b4] font-light">ยังไม่มีบัญชี?&nbsp;<span className="text-[#e8c472]">สมัครสมาชิก</span></Link>
            </form>
          ) : (
            <button type="button" onClick={() => setForm(true)} className="h-[50px] rounded-full bg-transparent text-[#f3ead9] font-semibold" style={{ border: "1px solid rgba(243,234,217,0.07)" }}>เข้าสู่ระบบด้วยอีเมล</button>
          )}

          <Link href="/join" className="flex items-center gap-3 rounded-[18px] bg-[#211a18] text-inherit hover:text-inherit" style={{ padding: "12px 14px", border: "1px solid rgba(212,175,55,.4)" }}>
            <img src="/brand/logo.png" alt="" width={44} height={44} className="w-11 h-11 object-contain" />
            <span className="flex-1"><span className="block font-semibold text-[14px]">สมัครเป็น Part-Time</span><span className="block text-[12px] text-[#d9c9b4] font-light">เปิดรับ 20 ต.ค. – 10 พ.ย. · จำกัด 50 ท่าน</span></span>
            <span className="text-[#e8c472]" aria-hidden="true">→</span>
          </Link>
          {(isDemo || !hasSupabase) && <p className="m-0 text-[11.5px] text-[#b5a596] text-center font-light">โหมดสาธิต — ข้อมูลจำลอง</p>}
          <div className="text-[12px] text-[#b5a596] text-center font-light">สำหรับผู้มีอายุ 20 ปีขึ้นไป · ไม่มีบริการทางเพศ</div>
        </section>
      </div>
    </main>
  );
}
