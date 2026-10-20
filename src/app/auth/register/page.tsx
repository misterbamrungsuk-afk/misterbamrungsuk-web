"use client";

// บอร์ด C-Register + C-OTP "สมัครสมาชิก" — แถบ 3 ขั้น: บัญชี → ยืนยัน OTP → เสร็จสิ้น
// ต่างจากบอร์ด: เพิ่มช่องเบอร์มือถือ (การจองต้องติดต่อได้ · OTP ส่งทาง SMS ตามบอร์ด C-OTP) · ไม่มีระบบ SMS = ยืนยันเบอร์โดยไม่ใช้รหัส
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TURNSTILE_SITE_KEY, Turnstile } from "@/components/turnstile";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const lbl = "block text-[12px] text-[#d9c9b4] mb-1.5 font-light";
const inCls = "h-12 w-full rounded-xl bg-[#251d1b] text-[#f3ead9] px-[14px] text-[16px] outline-none border focus:border-[#e8c472] placeholder:text-[#b5a596]";
const cta = "h-[52px] w-full rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold grid place-items-center disabled:opacity-45";
const Eye = ({ off }: { off: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{off && <path d="M3 3l18 18" />}</svg>
);

function strength(p: string): [string, string] {
  if (!p) return ["", ""];
  let s = 0;
  if (p.length >= 8) s++; if (/[0-9]/.test(p)) s++; if (/[A-Za-z]/.test(p) && /[^A-Za-z0-9]/.test(p) || /[A-Z]/.test(p)) s++;
  if (p.length < 8) return [`สั้นไป · ต้องอย่างน้อย 8 ตัวอักษร (ตอนนี้ ${p.length})`, "#ff8a97"];
  return s >= 3 ? [`รหัสผ่านแข็งแรงดี · ${p.length} ตัวอักษร`, "#7fd6a3"] : [`พอใช้ · ${p.length} ตัวอักษร ลองเพิ่มตัวเลขหรือตัวพิมพ์ใหญ่`, "#e3a35c"];
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp" | "done">("form");
  const [f, setF] = useState({ name: "", phone: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [smsOff, setSmsOff] = useState(true); // เริ่มแบบไม่มี OTP (ค่าปัจจุบัน) · เซิร์ฟเวอร์ตอบ required=true ค่อยแสดงขั้น OTP
  const [ts, setTs] = useState("");
  const [tsKey, setTsKey] = useState(0);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [cool, setCool] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setError(""); };
  const phone = f.phone.replace(/\D/g, "");
  const [pwMsg, pwColor] = strength(f.password);
  // ปิด OTP (smsOff) = แถบ 2 ขั้น บัญชี → เสร็จสิ้น · เปิด = 3 ขั้นตามบอร์ด C-Register/C-OTP
  const steps = smsOff ? ["บัญชี", "เสร็จสิ้น"] : ["บัญชี", "ยืนยัน OTP", "เสร็จสิ้น"];
  const idx = smsOff ? (step === "done" ? 1 : 0) : { form: 0, otp: 1, done: 2 }[step];

  useEffect(() => {
    fetch("/api/otp/verify", { cache: "no-store" }).then((r) => r.json()).then((d: { required?: boolean }) => setSmsOff(d.required === false)).catch(() => {});
  }, []);
  useEffect(() => {
    if (cool <= 0) return;
    const t = setTimeout(() => setCool((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cool]);

  const post = async (url: string, body: unknown) => {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    return { status: r?.status ?? 0, d: ((await r?.json().catch(() => ({}))) ?? {}) as { ok?: boolean; error?: string; devCode?: string; retryAfter?: number } };
  };

  const register = async () => {
    const { d } = await post("/api/auth/register", { name: f.name.trim(), phone, email: f.email.trim(), password: f.password, accept_terms: true });
    if (!d.ok) { setError(d.error || "สมัครไม่สำเร็จ"); setBusy(false); if (/อีเมล/.test(d.error ?? "")) setStep("form"); return; }
    setBusy(false); setStep("done");
  };

  const sendOtp = async () => {
    setError("");
    if (!f.name.trim()) return setError("กรอกชื่อที่แสดง");
    if (!/^0[689]\d{8}$/.test(phone)) return setError("เบอร์มือถือไม่ถูกต้อง (เช่น 08x-xxx-xxxx)");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setError("อีเมลไม่ถูกต้อง");
    if (f.password.length < 8) return setError("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
    if (!agree) return setError("กรุณายืนยันอายุและยอมรับเงื่อนไข");
    setBusy(true);
    if (smsOff) {
      const { d } = await post("/api/otp/verify", { phone, skip: true });
      if (!d.ok) { setError(d.error || "บันทึกเบอร์ไม่สำเร็จ"); setBusy(false); return; }
      return register();
    }
    const { d } = await post("/api/otp/send", { phone, turnstile: ts });
    setTs(""); setTsKey((k) => k + 1);
    setBusy(false);
    if (!d.ok) { setError(d.error || "ส่งรหัสไม่สำเร็จ"); if (d.retryAfter) setCool(d.retryAfter); return; }
    setDevCode(d.devCode ?? ""); setCode(""); setCool(60); setStep("otp");
    setTimeout(() => codeRef.current?.focus(), 50);
  };

  const resend = async () => {
    if (cool > 0) return;
    setError(""); setBusy(true);
    const { d } = await post("/api/otp/send", { phone, turnstile: ts });
    setTs(""); setTsKey((k) => k + 1); setBusy(false);
    if (!d.ok) { setError(d.error || "ส่งรหัสไม่สำเร็จ"); if (d.retryAfter) setCool(d.retryAfter); return; }
    setDevCode(d.devCode ?? ""); setCool(60); setCode("");
  };

  const verify = async (c = code) => {
    if (c.length !== 6) return;
    setBusy(true); setError("");
    const { d } = await post("/api/otp/verify", { phone, code: c });
    if (!d.ok) { setError(d.error || "รหัสไม่ถูกต้อง"); setBusy(false); return; }
    return register();
  };

  const mmss = `0:${String(cool).padStart(2, "0")}`;
  const masked = phone.length === 10 ? `${phone.slice(0, 2)}x-xxx-${phone.slice(6)}` : phone;

  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9" }}>
      <main className="mx-auto w-full max-w-[480px] md:max-w-[520px] md:pt-8 pb-8">
        <div className="flex items-center gap-2" style={{ padding: "12px 14px 0" }}>
          <Link href={step === "otp" ? "#" : "/login"} onClick={(e) => { if (step === "otp") { e.preventDefault(); setStep("form"); setError(""); } }} aria-label="ย้อนกลับ"
            className="w-11 h-11 rounded-full grid place-items-center bg-[#211a18] text-[#e8c472] hover:text-[#e8c472]" style={{ border: `1px solid ${LN}` }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
          </Link>
          <div className="font-semibold text-[17px]" style={{ color: GOLD }}>{step === "otp" ? "ยืนยันเบอร์โทร" : "สมัครสมาชิก"}</div>
        </div>

        <div className="flex flex-col gap-4" style={{ padding: "14px 18px 0" }}>
          <div className={`grid ${steps.length === 2 ? "grid-cols-2" : "grid-cols-3"} gap-1.5`} aria-label={`ขั้นที่ ${idx + 1} จาก ${steps.length}`}>
            {steps.map((l, i) => (
              <div key={l} className="flex flex-col gap-1.5"><div className="h-1 rounded-full" style={{ background: i <= idx ? GOLD : "rgba(232,196,114,0.14)" }} /><span className="text-[12px] font-light" style={{ color: i <= idx ? GOLD : "#b5a596" }}>{l}</span></div>
            ))}
          </div>

          {step === "form" && (
            <form onSubmit={(e) => { e.preventDefault(); sendOtp(); }} className="flex flex-col gap-[14px]" noValidate>
              <div><h1 className="m-0 font-semibold text-[24px]" style={{ color: GOLD }}>สร้างบัญชีลูกค้า</h1><p className="mt-1 mb-0 text-[13px] font-light text-[#d9c9b4]">เริ่มต้นนัดเพื่อนพรีเมียมกับ Mister Bamrungsuk</p></div>
              <label><span className={lbl}>ชื่อที่แสดง</span><input required autoComplete="name" placeholder="เช่น คุณกฤษดา ส." value={f.name} onChange={set("name")} className={inCls} style={{ borderColor: LN }} maxLength={100} /></label>
              <label><span className={lbl}>เบอร์มือถือ</span><input type="tel" inputMode="tel" required autoComplete="tel" placeholder="08x-xxx-xxxx" value={f.phone} onChange={set("phone")} className={inCls} style={{ borderColor: LN }} maxLength={12} /></label>
              <label><span className={lbl}>อีเมล</span><input type="email" required autoComplete="email" placeholder="you@email.com" value={f.email} onChange={set("email")} className={inCls} style={{ borderColor: LN }} maxLength={200} /></label>
              <div>
                <label htmlFor="pw" className={lbl}>รหัสผ่าน</label>
                <div className="relative">
                  <input id="pw" type={show ? "text" : "password"} required minLength={8} autoComplete="new-password" placeholder="อย่างน้อย 8 ตัวอักษร" value={f.password} onChange={set("password")} className={`${inCls} pr-12`} style={{ borderColor: LN }} />
                  <button type="button" onClick={() => setShow(!show)} aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} className="absolute right-1 top-0 w-11 h-12 grid place-items-center text-[#d9c9b4]"><Eye off={!show} /></button>
                </div>
                {pwMsg && <p className="mt-1.5 mb-0 text-[12px] font-light" style={{ color: pwColor }}>{pwMsg}</p>}
              </div>
              <div className="flex gap-[10px] items-center min-h-11 text-left text-[13px] font-light text-[#f3ead9]">
                <button type="button" onClick={() => setAgree(!agree)} aria-pressed={agree} aria-label="ฉันอายุ 20 ปีขึ้นไป และยอมรับเงื่อนไขการใช้งานกับนโยบายความเป็นส่วนตัว" className="w-11 h-11 -m-[11px] grid place-items-center shrink-0"><span className="w-[22px] h-[22px] rounded-md grid place-items-center" style={{ border: `1.5px solid ${GOLD}`, background: agree ? GOLD : "transparent" }}>
                  {agree && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1b130b" strokeWidth="3" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>}
                </span></button>
                <span><span onClick={() => setAgree(!agree)} className="cursor-pointer">ฉันอายุ 20 ปีขึ้นไป และยอมรับ</span><Link href="/page/terms" className="text-[#e8c472]">เงื่อนไขการใช้งาน</Link>กับ<Link href="/privacy" className="text-[#e8c472]">ประกาศความเป็นส่วนตัว</Link> และให้ความยินยอมตาม<Link href="/privacy/consent" className="text-[#e8c472]">หนังสือให้ความยินยอม</Link></span>
              </div>
              {!smsOff && <Turnstile key={tsKey} onToken={setTs} />}
              {error && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{error}</p>}
              <button type="submit" disabled={busy || !agree || cool > 0} className={cta}>{busy ? "กำลังดำเนินการ…" : smsOff ? "สมัครสมาชิก" : cool > 0 ? `ส่งรหัสใหม่ได้ใน ${mmss}` : "ส่งรหัส OTP"}</button>
              <Link href="/auth/forgot" className="min-h-11 grid place-items-center text-[13px] font-light text-[#e8c472]">ลืมรหัสผ่าน?</Link>
              <div className="text-center text-[13px] font-light text-[#d9c9b4]">มีบัญชีแล้ว? <Link href="/login" className="tap px-1 text-[#e8c472]">เข้าสู่ระบบ</Link></div>
            </form>
          )}

          {step === "otp" && (
            <div className="flex flex-col gap-4">
              <div><h2 className="m-0 font-semibold text-[24px]">กรอกรหัส 6 หลัก</h2><p className="mt-1.5 mb-0 text-[13px] font-light text-[#d9c9b4]">ส่งรหัสทาง SMS ไปที่ {masked} แล้ว · <button type="button" onClick={() => { setStep("form"); setError(""); }} className="text-[#e8c472]">เปลี่ยนเบอร์</button></p></div>
              <label className="relative block" aria-label="รหัส OTP">
                <input ref={codeRef} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setCode(v); setError(""); if (v.length === 6) verify(v); }}
                  className="absolute inset-0 w-full h-full opacity-0" />
                <span className="grid grid-cols-6 gap-2 pointer-events-none" aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="h-14 rounded-xl bg-[#251d1b] grid place-items-center text-[24px] font-semibold"
                      style={{ boxShadow: `inset 0 0 0 1.5px ${error ? "#ff8a9a" : i === code.length ? GOLD : "transparent"}` }}>{code[i] ?? ""}</span>
                  ))}
                </span>
              </label>
              {error && <div role="alert" className="text-[13px] font-semibold rounded-xl" style={{ background: "rgba(201,40,61,.16)", color: "#ff8a9a", padding: "8px 12px" }}>{error}</div>}
              <div className="flex justify-between items-center gap-3">
                <span className="text-[13px] font-light text-[#d9c9b4]">ไม่ได้รับรหัส?</span>
                <button type="button" onClick={resend} disabled={cool > 0 || busy || (!!TURNSTILE_SITE_KEY && !ts)} className="min-h-11 text-[14px] font-semibold text-[#e8c472] disabled:opacity-60">{cool > 0 ? `ส่งใหม่ใน ${mmss}` : "ส่งรหัสใหม่"}</button>
              </div>
              {cool <= 0 && <Turnstile key={tsKey} onToken={setTs} />}
              <div className="rounded-2xl bg-[#211a18] text-[13px] font-light text-[#d9c9b4]" style={{ padding: 16 }}>รหัสหมดอายุใน 5 นาที · ลองผิดได้ 5 ครั้ง แล้วต้องขอรหัสใหม่</div>
              {devCode && <p className="m-0 text-[12px] text-[#e8c472]">โหมดทดสอบ: รหัสคือ <b>{devCode}</b></p>}
              <button type="button" onClick={() => verify()} disabled={code.length !== 6 || busy} className={cta}>{busy ? "กำลังยืนยัน…" : "ยืนยัน"}</button>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col gap-[14px] items-center text-center" style={{ paddingTop: 30 }}>
              <div className="w-[88px] h-[88px] rounded-full grid place-items-center" style={{ border: `2px solid ${GOLD}`, color: GOLD }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
              </div>
              <h1 className="m-0 font-semibold text-[24px]" style={{ color: GOLD }}>สมัครสำเร็จ</h1>
              <p className="m-0 text-[14px] text-[#d9c9b4]">ยินดีต้อนรับค่ะ คุณ{f.name.trim()} บัญชีพร้อมแล้ว เลือกเพื่อนและนัดได้เลย</p>
              <button type="button" onClick={() => { router.push("/notifications/permission"); router.refresh(); }} className={cta}>เริ่มใช้งาน</button>
              <Link href="/" className="h-12 w-full rounded-[14px] bg-[#211a18] text-[#e8c472] text-[14px] font-semibold grid place-items-center hover:text-[#e8c472]" style={{ border: `1px solid ${LN}` }}>ดูเพื่อนในระบบ</Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
