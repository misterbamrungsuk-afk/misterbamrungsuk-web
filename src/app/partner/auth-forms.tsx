"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const lab = "block text-sm text-ink-300 mb-1.5";

/** ตั้งรหัสผ่านพอร์ทัล (ใช้ token จากฟอร์มสมัคร) */
export function SetPasswordForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setErr("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
    if (pw !== pw2) return setErr("รหัสผ่านไม่ตรงกัน");
    setBusy(true);
    setErr("");
    const res = await fetch("/api/partner/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: pw }) }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { ok?: boolean; error?: string } | undefined;
    if (data?.ok) return router.replace("/partner/portal");
    setErr(data?.error ?? "ระบบขัดข้อง กรุณาลองใหม่");
    setBusy(false);
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div><label className={lab}>อีเมลเข้าสู่ระบบ</label><input className="input-dark w-full opacity-70" value={email} readOnly /></div>
      <div><label className={lab} htmlFor="pw">ตั้งรหัสผ่าน (อย่างน้อย 8 ตัว)</label><input id="pw" type="password" autoComplete="new-password" className="input-dark w-full" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      <div><label className={lab} htmlFor="pw2">ยืนยันรหัสผ่าน</label><input id="pw2" type="password" autoComplete="new-password" className="input-dark w-full" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
      {err && <p role="alert" className="text-sm text-crimson-300">{err}</p>}
      <button disabled={busy} className="btn-crimson h-13 min-h-12 rounded-full font-display font-semibold text-lg">{busy ? "กำลังบันทึก…" : "สร้างบัญชีพาร์ทเนอร์"}</button>
    </form>
  );
}
