"use client";

// เข้าสู่ระบบ / สมัคร — เลือกประเภทบัญชีก่อน (บอส 11 พ.ย. 2569): ลูกค้า · Part-Time
// ลูกค้า: แท็บ เข้าสู่ระบบ | สมัครสมาชิก (/auth/register) · Part-Time: แท็บ เข้าสู่ระบบ | สมัคร Part-Time (/join)
// มาจากปุ่มจอง (?next=...) → ข้ามหน้าเลือก ไปบัญชีลูกค้าเลย · ?as=pt → เปิดบัญชี Part-Time
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PtLoginForm } from "../join/me/login-form";

const GOLD = "#e8c472";
const field = "h-[52px] w-full rounded-[14px] border border-[rgba(243,234,217,0.14)] bg-[#1d1716] px-[14px] text-[15px] text-[#f3ead9] outline-none focus:border-[#e8c472] placeholder:text-[#7d6f66]";
type View = "choose" | "customer" | "pt";

const Brand = () => (
  <Link href="/" aria-label="Mister Bamrungsuk · หน้าแรก" className="flex flex-col items-center gap-1 text-[#f3ead9] hover:text-[#f3ead9]">
    <span className="text-[13px] tracking-[.32em]">MISTER</span>
    <span className="text-[22px] tracking-[.24em] font-medium">BAMRUNGSUK</span>
    <span className="mt-3 w-10 h-[2px] rounded-full" style={{ background: GOLD }} aria-hidden="true" />
  </Link>
);
const Chevron = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>;

function Tabs({ a, b, on, onA, onB }: { a: string; b: string; on: 0 | 1; onA: () => void; onB: () => void }) {
  const cls = (x: boolean) => `h-[50px] rounded-full text-[15.5px] font-semibold ${x ? "text-[#1b130b]" : "text-[#f3ead9]"}`;
  return (
    <div role="tablist" className="grid grid-cols-2 rounded-full p-[3px]" style={{ border: "1px solid rgba(243,234,217,.18)" }}>
      <button type="button" role="tab" aria-selected={on === 0} onClick={onA} className={cls(on === 0)} style={on === 0 ? { background: GOLD } : undefined}>{a}</button>
      <button type="button" role="tab" aria-selected={on === 1} onClick={onB} className={cls(on === 1)} style={on === 1 ? { background: GOLD } : undefined}>{b}</button>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // ปลายทางหลังล็อกอิน/สมัคร (เช่น /book/xxx ตอนกดจองก่อนมีบัญชี) — ส่งต่อไปหน้าสมัครด้วย
  const [nextQ, setNextQ] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const n = q.get("next");
    if (n && n.startsWith("/") && !n.startsWith("//")) { setNextQ(`?next=${encodeURIComponent(n)}`); setView("customer"); }
    else if (q.get("as") === "pt") setView("pt");
    else if (q.get("as") === "customer") setView("customer");
  }, []);
  const nextUrl = () => {
    const n = new URLSearchParams(window.location.search).get("next") || "/";
    return n.startsWith("/") && !n.startsWith("//") ? n : "/";
  };

  async function emailLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const out = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!out.ok) throw new Error(out.error || "เข้าสู่ระบบไม่สำเร็จ");
      // refresh ให้หน้าที่ render ฝั่งเซิร์ฟเวอร์อ่านคุกกี้ใหม่ (หัวหน้า/เมนูเปลี่ยนเป็นสถานะล็อกอินทันที)
      router.replace(nextUrl());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
      setBusy(false);
    }
  }
  const ok = !!email.trim() && password.length > 0;
  const back = <button type="button" onClick={() => { setView("choose"); setError(""); }} className="self-start inline-flex items-center gap-1 min-h-10 text-[15px] text-[#e8c472]">‹ เปลี่ยนประเภทบัญชี</button>;

  return (
    <main className="mb-v7 min-h-dvh flex justify-center" style={{ background: "radial-gradient(70% 40% at 50% 0%, rgba(176,24,44,.12) 0%, rgba(8,6,6,0) 70%), #141010", color: "#f3ead9", lineHeight: "normal" }}>
      <div className="w-full max-w-[480px] flex flex-col gap-6" style={{ padding: "calc(40px + env(safe-area-inset-top)) 22px calc(28px + env(safe-area-inset-bottom))" }}>
        <Brand />

        {view === "choose" && (
          <section data-login-choose className="flex flex-col gap-5 mt-4">
            <h1 className="m-0 font-bold text-[32px] leading-[1.3]">เลือกประเภทบัญชี</h1>
            <button type="button" data-as="customer" onClick={() => setView("customer")} className="flex items-center gap-4 rounded-[22px] text-left" style={{ padding: "22px 20px", border: `1.5px solid ${GOLD}`, background: "linear-gradient(135deg, #3a2f1c 0%, #241c14 100%)" }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
              <span className="w-px self-stretch" style={{ background: "rgba(232,196,114,.35)" }} aria-hidden="true" />
              <span className="flex-1 min-w-0"><span className="block font-bold text-[26px] leading-tight">ลูกค้า</span><span className="block mt-1 text-[15px] text-[#d9c9b4]">สำหรับผู้ต้องการใช้บริการ</span></span>
              <Chevron />
            </button>
            <button type="button" data-as="pt" onClick={() => setView("pt")} className="flex items-center gap-4 rounded-[22px] text-left" style={{ padding: "22px 20px", border: "1.5px solid #a8424f", background: "linear-gradient(135deg, #3d1a1f 0%, #241315 100%)" }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18" /></svg>
              <span className="w-px self-stretch" style={{ background: "rgba(232,196,114,.35)" }} aria-hidden="true" />
              <span className="flex-1 min-w-0"><span className="block font-bold text-[26px] leading-tight">Part-Time</span><span className="block mt-1 text-[15px] text-[#d9c9b4]">สำหรับผู้สมัครรับงาน</span></span>
              <Chevron />
            </button>
          </section>
        )}

        {view === "customer" && (
          <section data-login-customer className="flex flex-col gap-5">
            {back}
            <h1 className="m-0 font-bold text-[32px] leading-[1.3] -mt-2">บัญชีลูกค้า</h1>
            <Tabs a="เข้าสู่ระบบ" b="สมัครสมาชิก" on={0} onA={() => {}} onB={() => router.push(`/auth/register${nextQ}`)} />
            <form onSubmit={emailLogin} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-[15px]">อีเมล
                <input type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} /></label>
              <label className="flex flex-col gap-2 text-[15px]">รหัสผ่าน
                <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} /></label>
              <Link href="/auth/forgot" className="self-end tap px-1 text-[14px] text-[#e8c472]">ลืมรหัสผ่าน?</Link>
              {error && <p role="alert" className="m-0 text-[13.5px] text-[#ff8a9a]">{error}</p>}
              <button type="submit" disabled={!ok || busy} className="h-[56px] mt-2 rounded-full text-[#1b130b] font-bold text-[16px] disabled:opacity-45" style={{ background: GOLD }}>{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบลูกค้า"}</button>
            </form>
          </section>
        )}

        {view === "pt" && <PtView back={back} />}

        <div className="mt-auto text-[12px] text-[#b5a596] text-center font-light">สำหรับผู้มีอายุ 20 ปีขึ้นไป · ไม่มีบริการทางเพศ</div>
      </div>
    </main>
  );
}

function PtView({ back }: { back: React.ReactNode }) {
  const [tab, setTab] = useState<0 | 1>(0);
  return (
    <section data-login-pt className="flex flex-col gap-5">
      {back}
      <h1 className="m-0 font-bold text-[32px] leading-[1.3] -mt-2">บัญชี Part-Time</h1>
      <Tabs a="เข้าสู่ระบบ" b="สมัคร Part-Time" on={tab} onA={() => setTab(0)} onB={() => setTab(1)} />
      {tab === 0 ? (
        <>
          <PtLoginForm plain />
          <Link href="/join/me" className="self-center tap px-1 text-[14px] text-[#d9c9b4]">ลืมรหัสผ่าน / ขอลิงก์เข้าโปรไฟล์ →</Link>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="m-0 text-[15px] leading-[1.7] text-[#d9c9b4]">สมัครร่วมทีม Part-Time: กรอกประวัติ อัปรูป ยืนยันตัวตน แล้วรอทีมงานตรวจ · ใช้เวลาประมาณ 10 นาที</p>
          <Link href="/join" className="h-[56px] rounded-full grid place-items-center text-[#1b130b] font-bold text-[16px] hover:text-[#1b130b]" style={{ background: GOLD }}>สมัคร Part-Time</Link>
        </div>
      )}
    </section>
  );
}
