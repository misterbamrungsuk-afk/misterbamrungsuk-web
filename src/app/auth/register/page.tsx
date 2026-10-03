"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LangToggle } from "@/i18n/provider";
import { Logo } from "@/components/ui";

const inputCls = "h-12 w-full rounded-2xl border border-gold-500/45 bg-white px-4 text-[15px] outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20";

// สมัครสมาชิกลูกค้าด้วยอีเมล+รหัสผ่าน (อยู่ใต้ /auth เพื่อให้เป็นหน้าสาธารณะ)
export default function RegisterPage() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" });
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (f.password.length < 8) return setError("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
    if (f.password !== f.confirm) return setError("ยืนยันรหัสผ่านไม่ตรงกัน");
    if (!accept) return setError("กรุณายอมรับเงื่อนไขการใช้งาน");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: f.name, email: f.email, password: f.password, accept_terms: true }),
      });
      const out = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!out.ok) throw new Error(out.error || "สมัครไม่สำเร็จ");
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "สมัครไม่สำเร็จ");
      setBusy(false);
    }
  }

  return (
    <main className="app-frame relative overflow-hidden bg-ink-950">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="https://images.unsplash.com/photo-1615269143162-592b3882fcbe?auto=format&fit=crop&w=900&q=70" alt="" className="absolute inset-x-0 top-0 h-[40dvh] w-full object-cover" />
      <div className="absolute inset-x-0 top-0 h-[40dvh] bg-gradient-to-b from-transparent via-ink-950/55 to-ink-950" />

      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <Logo size={30} />
        <LangToggle />
      </div>

      <section className="relative z-10 px-6 pt-[18dvh] pb-9 flex flex-col gap-4 animate-rise">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.2em] text-[#8f5e00] flex items-center gap-2"><span className="w-6 h-px bg-[#b8860b]" />VVIP MEMBER</p>
          <h1 className="font-display text-[28px] leading-tight font-bold mt-1.5">สมัคร<span className="bg-gradient-to-r from-[#b8860b] via-[#e0a400] to-[#9a6b00] bg-clip-text text-transparent">สมาชิก</span></h1>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-2.5">
          <input required autoComplete="name" placeholder="ชื่อ" value={f.name} onChange={set("name")} className={inputCls} />
          <input type="email" required autoComplete="email" placeholder="อีเมล" value={f.email} onChange={set("email")} className={inputCls} />
          <input type="password" required minLength={8} autoComplete="new-password" placeholder="รหัสผ่าน (อย่างน้อย 8 ตัว)" value={f.password} onChange={set("password")} className={inputCls} />
          <input type="password" required minLength={8} autoComplete="new-password" placeholder="ยืนยันรหัสผ่าน" value={f.confirm} onChange={set("confirm")} className={inputCls} />
          <label className="flex items-start gap-2 text-[13px] text-ink-200 py-1">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 accent-[#b8860b]" />
            <span>ฉันอายุ 18 ปีขึ้นไป และยอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว</span>
          </label>
          {error && <p className="text-[12.5px] text-[#b3122a]" role="alert">{error}</p>}
          <button type="submit" disabled={busy} className="h-14 w-full rounded-full text-white font-semibold bg-[linear-gradient(180deg,#c8142a,#8f0d1d)] border border-gold-500/70 shadow-[0_10px_24px_rgba(143,13,29,.32),inset_0_1px_0_rgba(255,220,140,.35)] transition active:scale-[.98] disabled:opacity-60">
            {busy ? "…" : "สมัครสมาชิก"}
          </button>
        </form>
        <a href="/login" className="text-[13px] text-ink-200 self-center">มีบัญชีแล้ว? <span className="font-semibold text-[#8f5e00]">เข้าสู่ระบบ</span></a>
        <p className="text-ink-400 text-xs">© 2026 Mister Bamrungsuk · สำหรับผู้มีอายุ 18 ปีขึ้นไป · นวดเพื่อสุขภาพเท่านั้น</p>
      </section>
    </main>
  );
}
