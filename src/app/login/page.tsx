"use client";

// บอร์ด C-Login — รูปเต็มบน · โลโก้ (กดกลับหน้าแรก) · หัวข้อ · อีเมล + รหัสผ่าน (ไม่มี Google ตามที่สั่งตัดออก) · การ์ดสมัคร Part-Time
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const GOLD = "#e8c472";
const field = "h-12 w-full rounded-[14px] border border-[rgba(243,234,217,0.07)] bg-[#211a18] px-[14px] text-[14px] text-[#f3ead9] outline-none focus:border-[#e8c472] placeholder:text-[#b5a596]";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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

  return (
    <main className="mb-v7 relative min-h-dvh overflow-hidden md:grid md:grid-cols-2 md:items-center" style={{ background: "#171211", color: "#f3ead9", lineHeight: "normal" }}>
      {/* ภาพแบรนด์ (Mister Bamrungsuk by Madame Gor) บนพื้นดำ — มือถือ: บนสุดกลางจอ · จอคอม: ครึ่งซ้ายเต็มความสูง */}
      <Link href="/" aria-label="Mister Bamrungsuk · หน้าแรก" className="relative flex items-center justify-center md:min-h-dvh hover:text-inherit"
        style={{ background: "radial-gradient(60% 50% at 50% 45%, rgba(176,24,44,.28) 0%, rgba(232,196,114,.08) 40%, rgba(8,6,6,0) 72%), #080606", padding: "calc(28px + env(safe-area-inset-top)) 24px 18px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="Mister Bamrungsuk by Madame Gor" className="w-[min(68vw,280px)] md:w-[min(34vw,520px)] h-auto object-contain" style={{ filter: "drop-shadow(0 18px 40px rgba(0,0,0,.6))" }} />
        <span className="absolute inset-x-0 bottom-0 h-6 md:hidden" style={{ background: "linear-gradient(180deg, rgba(8,6,6,0), #171211)" }} aria-hidden="true" />
      </Link>

      <div className="relative z-10 flex flex-col md:justify-center mx-auto w-full max-w-[480px] md:py-10">
        <div className="hidden" style={{ padding: "16px 20px" }}>
          <Link href="/" aria-label="Mister Bamrungsuk · หน้าแรก" className="flex items-center gap-[10px] hover:text-inherit">
            <img src="/brand/logo.png" alt="" width={46} height={46} className="w-[46px] h-[46px] object-contain" />
            <span className="font-brand text-[16px] text-[#e8c472]">Mister Bamrungsuk</span>
          </Link>
        </div>

        <section className="flex flex-col gap-[14px]" style={{ padding: "8px 20px calc(26px + env(safe-area-inset-bottom))" }}>
          <h1 className="m-0 font-bold text-[32px] leading-[1.3]" style={{ textWrap: "balance" }}>เพื่อนกิน เพื่อนเที่ยว<span className="block mt-1 text-[#e8c472]">ในแบบของคุณ</span></h1>
          <form onSubmit={emailLogin} className="flex flex-col gap-[10px]">
            <label className="flex flex-col gap-[5px] text-[12px] text-[#d9c9b4] font-light">อีเมล
              <input type="email" required autoComplete="email" inputMode="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={field} /></label>
            <label className="flex flex-col gap-[5px] text-[12px] text-[#d9c9b4] font-light">รหัสผ่าน
              <input type="password" required autoComplete="current-password" placeholder="อย่างน้อย 8 ตัวอักษร" value={password} onChange={(e) => setPassword(e.target.value)} className={field} /></label>
            <Link href="/auth/forgot" className="self-end tap px-1 text-[13px] text-[#e8c472] font-light">ลืมรหัสผ่าน?</Link>
            {error && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{error}</p>}
            <button type="submit" disabled={!ok || busy} className="h-[54px] rounded-full bg-[#e8c472] text-[#1b130b] font-semibold text-[15px] disabled:opacity-45" style={{ border: `1.5px solid ${GOLD}` }}>{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
            <Link href="/auth/register" className="self-center min-h-10 flex items-center text-[13px] text-[#d9c9b4] font-light">ยังไม่มีบัญชี?&nbsp;<span className="text-[#e8c472]">สมัครสมาชิก</span></Link>
          </form>

          <Link href="/join" className="flex items-center gap-3 rounded-[18px] bg-[#211a18] text-inherit hover:text-inherit" style={{ padding: "12px 14px", border: "1px solid rgba(212,175,55,.4)" }}>
            <img src="/brand/logo.png" alt="" width={44} height={44} className="w-11 h-11 object-contain" />
            <span className="flex-1"><span className="block font-semibold text-[14px]">สมัครเป็น Part-Time</span><span className="block text-[12px] text-[#d9c9b4] font-light">เปิดรับ 20 ต.ค. – 10 พ.ย. · กลุ่ม 1 รับ 25 ท่าน</span></span>
            <span className="text-[#e8c472]" aria-hidden="true">→</span>
          </Link>
          <div className="text-[12px] text-[#b5a596] text-center font-light">สำหรับผู้มีอายุ 20 ปีขึ้นไป · ไม่มีบริการทางเพศ</div>
        </section>
      </div>
    </main>
  );
}
