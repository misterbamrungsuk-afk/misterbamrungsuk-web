"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CTA, GHOST } from "../ui";

const IN = "h-12 rounded-xl border border-[rgba(240,200,90,.38)] bg-[#21191a] text-[#f6efe4] px-3.5 text-sm w-full outline-none focus-visible:outline-2 focus-visible:outline-[#f0c75a]";
const LBL = "block text-xs text-[#cdbfb3] mb-1.5";

/** ล็อกอินพาร์ทเนอร์ (บอร์ด PartnerLogin) — สำเร็จแล้ว refresh ให้หน้า server เลือกพอร์ทัล / หน้ารออนุมัติ */
export function PartnerLoginForm({ forgotHref }: { forgotHref: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/partner/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pw }) }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { ok?: boolean; error?: string } | undefined;
    if (data?.ok) return router.refresh();
    setErr(data?.error ?? "ระบบขัดข้อง กรุณาลองใหม่");
    setBusy(false);
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <div><label className={LBL} htmlFor="em">อีเมลธุรกิจ</label><input id="em" type="email" autoComplete="email" className={IN} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div>
        <label className={LBL} htmlFor="pw">รหัสผ่าน</label>
        <div className="relative">
          <input id="pw" type={show ? "text" : "password"} autoComplete="current-password" className={`${IN} pr-12`} value={pw} onChange={(e) => setPw(e.target.value)} />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={show}
            className="absolute right-0.5 top-0.5 w-11 h-11 grid place-items-center text-[#cdbfb3]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{show && <path d="M4 4l16 16" />}</svg>
          </button>
        </div>
      </div>
      {err && <p role="alert" className="m-0 text-xs text-[#ef6b7b]">{err}</p>}
      <button disabled={busy} className={CTA}>{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
      <div className="flex justify-between text-[13px]">
        <button type="button" onClick={() => setForgot((v) => !v)} aria-expanded={forgot} className="min-h-11 flex items-center text-[#cdbfb3]">ลืมรหัสผ่าน / ยังไม่ได้ตั้งรหัส?</button>
        <Link href="/partner#apply" className="min-h-11 flex items-center">สมัครพาร์ทเนอร์</Link>
      </div>
      {forgot && (
        <div role="region" aria-label="วิธีตั้งรหัสผ่านใหม่" className="rounded-2xl bg-[#241717] border border-[rgba(240,200,90,.38)] p-3.5 flex flex-col gap-2 text-[13px] text-[#cdbfb3]">
          <b className="text-[#f0c75a]">ตั้งรหัสผ่านใหม่ / ตั้งครั้งแรก</b>
          <span>1) ยังไม่เคยตั้งรหัส: เปิดลิงก์ "ตั้งรหัสผ่าน / เข้าสู่ระบบพอร์ทัล" ในหน้าสมัครสำเร็จ (ลิงก์ที่ได้หลังส่งใบสมัคร)</span>
          <span>2) ลืมรหัสผ่าน หรือลิงก์หมดอายุ: ติดต่อทีมพาร์ทเนอร์ทาง LINE แจ้งชื่อธุรกิจ + อีเมลที่สมัคร ทีมงานจะส่ง "ลิงก์ตั้งรหัสผ่านใหม่" ให้ (ใช้ได้ 7 วัน ครั้งเดียว)</span>
          <a href={forgotHref} target="_blank" rel="noopener noreferrer" className="min-h-12 rounded-[14px] bg-[#06c755] !text-white font-semibold grid place-items-center no-underline">ขอลิงก์ตั้งรหัสผ่านทาง LINE</a>
        </div>
      )}
    </form>
  );
}

export function LogoutBtn() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className={GHOST} disabled={busy} onClick={async () => {
      setBusy(true);
      await fetch("/api/partner/auth/logout", { method: "POST" }).catch(() => null);
      router.refresh();
      setBusy(false);
    }}>ออกจากระบบ</button>
  );
}
