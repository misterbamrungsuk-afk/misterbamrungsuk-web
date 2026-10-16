"use client";
/* eslint-disable @next/next/no-img-element */

// บอร์ด C-ResetPassword "ตั้งรหัสผ่านใหม่" — รูปจาก canvas · รหัสใหม่ + ยืนยัน · แถบความแข็งแรง 4 ช่อง → เสร็จ → เข้าสู่ระบบ
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const GOLD = "#e8c472";
const LV: [string, string, number][] = [["ยังไม่ได้กรอก", "#b5a596", 0], ["อ่อน", "#ff8a97", 1], ["ปานกลาง", "#e3a35c", 2], ["แข็งแรง", "#4ade80", 4]];
const level = (p: string) => {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++; if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
  return p.length < 8 ? 1 : s >= 3 ? 3 : 2;
};
const Eye = ({ off }: { off: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />{off ? <path d="M3 3l18 18" /> : <circle cx="12" cy="12" r="3" />}</svg>
);

function Reset() {
  const t = useSearchParams().get("t") ?? "";
  const [pw, setPw] = useState("");
  const [cf, setCf] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const lv = level(pw);
  const mismatch = cf.length > 0 && cf !== pw;
  const matched = cf.length > 0 && cf === pw;
  const ok = pw.length >= 8 && lv >= 2 && matched;

  const save = async () => {
    if (!ok) return;
    setBusy(true); setError("");
    const r = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t, password: pw }) }).catch(() => null);
    const d = (await r?.json().catch(() => ({}))) as { ok?: boolean; error?: string } | undefined;
    setBusy(false);
    if (d?.ok) setDone(true); else setError(d?.error || "ตั้งรหัสไม่สำเร็จ กรุณาลองใหม่");
  };
  const field = (label: string, v: string, set: (s: string) => void, border: string, ph: string, ac: string) => (
    <div className="flex flex-col gap-[5px] text-[12px] text-[#d9c9b4] font-light">{label}
      <div className="flex gap-2">
        <input type={show ? "text" : "password"} value={v} onChange={(e) => { set(e.target.value); setError(""); }} placeholder={ph} autoComplete={ac} aria-label={label}
          className="flex-1 min-w-0 h-12 rounded-[14px] bg-[#211a18] text-[#f3ead9] px-[14px] text-[16px] outline-none placeholder:text-[#b5a596]" style={{ border: `1px solid ${border}` }} />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} className="w-12 h-12 rounded-[14px] bg-[#211a18] text-[#d9c9b4] grid place-items-center" style={{ border: "1px solid rgba(243,234,217,0.07)" }}><Eye off={!show} /></button>
      </div>
    </div>
  );

  return (
    <div className="mb-v7 min-h-dvh relative overflow-hidden" style={{ background: "#171211", color: "#f3ead9" }}>
      <div className="mx-auto w-full max-w-[480px] md:max-w-[520px] min-h-dvh relative flex flex-col">
        <img src="/brand/home/login-hero.jpg" alt="" className="absolute inset-x-0 top-0 w-full h-[320px] object-cover" />
        <div className="absolute inset-x-0 top-0 h-[320px]" style={{ background: "linear-gradient(180deg, rgba(23,18,17,.25) 0%, rgba(23,18,17,.55) 50%, #171211 100%)" }} />
        <div className="relative flex items-center gap-3" style={{ padding: "16px 20px" }}>
          <Link href="/login" aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: "1px solid rgba(246,239,228,.3)", background: "rgba(0,0,0,.4)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <Link href="/" className="flex items-center gap-[10px] font-brand text-[16px] text-[#e8c472] hover:text-[#e8c472]"><img src="/brand/logo.png" alt="" width={46} height={46} className="w-[46px] h-[46px] object-contain" />Mister Bamrungsuk</Link>
        </div>

        <div className="relative flex flex-col gap-[14px]" style={{ padding: "190px 20px 26px" }}>
          {!done ? (
            <>
              <div className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: GOLD }}><span className="w-[22px] h-px" style={{ background: GOLD }} />ตั้งรหัสผ่านใหม่</div>
              <h1 className="m-0 font-bold text-[30px] leading-[1.15]">ตั้งรหัสผ่านใหม่</h1>
              <p className="m-0 text-[14px] text-[#d9c9b4]">ใช้อย่างน้อย 8 ตัวอักษร ผสมตัวเลขและตัวพิมพ์ใหญ่</p>
              {!t && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">ลิงก์ไม่ครบ กรุณาเปิดจากอีเมล หรือ <Link href="/auth/forgot" className="text-[#e8c472]">ขอลิงก์ใหม่</Link></p>}
              {field("รหัสผ่านใหม่", pw, setPw, lv === 3 ? "rgba(212,175,55,.6)" : "rgba(232,196,114,0.14)", "อย่างน้อย 8 ตัวอักษร", "new-password")}
              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-4 gap-1">{[1, 2, 3, 4].map((n) => <span key={n} className="h-1 rounded-sm" style={{ background: n <= LV[lv][2] ? LV[lv][1] : "rgba(232,196,114,0.14)" }} />)}</div>
                <div className="text-[12px] font-light" style={{ color: LV[lv][1] }}>ความแข็งแรง: {LV[lv][0]}</div>
              </div>
              {field("ยืนยันรหัสผ่านใหม่", cf, setCf, mismatch ? "#ff8a97" : matched ? "#4ade80" : "rgba(232,196,114,0.14)", "พิมพ์อีกครั้ง", "new-password")}
              {matched && <div className="text-[12px] font-light text-[#4ade80]">รหัสผ่านตรงกัน ✓</div>}
              {mismatch && <div className="text-[12px] font-light text-[#ff8a97]">รหัสผ่านทั้งสองช่องไม่ตรงกัน</div>}
              {error && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{error} {/หมดอายุ/.test(error) && <Link href="/auth/forgot" className="text-[#e8c472]">ขอลิงก์ใหม่</Link>}</p>}
              <button type="button" onClick={save} disabled={!ok || busy || !t} className="h-[54px] rounded-full text-[#1b130b] font-semibold text-[15px]" style={{ background: GOLD, border: `1.5px solid ${GOLD}`, opacity: ok && t ? 1 : 0.45 }}>{busy ? "กำลังบันทึก…" : "ตั้งรหัสผ่านใหม่"}</button>
              <Link href="/login" className="text-center text-[13px] font-light text-[#e8c472]">กลับไปหน้าเข้าสู่ระบบ</Link>
            </>
          ) : (
            <div className="flex flex-col items-center gap-[14px] text-center" style={{ padding: "0 4px 14px" }}>
              <div className="w-[84px] h-[84px] rounded-full grid place-items-center" style={{ border: `2px solid ${GOLD}`, color: GOLD }}><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg></div>
              <h1 className="m-0 font-bold text-[26px]">ตั้งรหัสผ่านใหม่แล้ว</h1>
              <p className="m-0 text-[14px] text-[#d9c9b4]">ลิงก์นี้ใช้ซ้ำไม่ได้แล้ว เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย</p>
              <Link href="/login" className="self-stretch h-[54px] rounded-full font-semibold grid place-items-center text-[#e8c472] hover:text-[#e8c472]" style={{ border: `1px solid ${GOLD}` }}>เข้าสู่ระบบ</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPage() {
  return <Suspense><Reset /></Suspense>;
}
