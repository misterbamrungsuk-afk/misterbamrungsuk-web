"use client";

import { useState } from "react";

// ตั้ง/เปลี่ยนรหัสผ่าน Recruit — สมัครเองแล้วเข้าระบบอัตโนมัติ ยังไม่มีรหัส (pwSet false) → การ์ดเด่นขอให้ตั้ง · ตั้งแล้ว → พับไว้ "เปลี่ยนรหัสผ่าน"
export function SalesPassword({ pwSet, login }: { pwSet: boolean; login: string }) {
  const [open, setOpen] = useState(!pwSet);
  const [set, setSet] = useState(pwSet);
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const inp = "w-full h-12 rounded-xl px-3 bg-[#171211] text-[16px] text-[#f3ead9] outline-none border border-[rgba(243,234,217,.12)] focus:border-[#e8c472]";
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setMsg({ ok: false, t: "รหัสผ่านอย่างน้อย 8 ตัว" });
    if (pw !== pw2) return setMsg({ ok: false, t: "รหัสผ่านสองช่องไม่ตรงกัน" });
    setBusy(true); setMsg(null);
    const r = await fetch("/api/sales/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(set ? { password: pw, current: cur } : { password: pw }) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    setBusy(false);
    if (j?.ok) { setSet(true); setOpen(false); setCur(""); setPw(""); setPw2(""); setMsg({ ok: true, t: "บันทึกรหัสผ่านแล้ว · ครั้งหน้าเข้าสู่ระบบด้วยอีเมล/ID + รหัสผ่านนี้" }); return; }
    setMsg({ ok: false, t: j?.error || "ตั้งรหัสผ่านไม่สำเร็จ" });
  };
  return (
    <section data-recruit-password={set ? "set" : "unset"} className="rounded-2xl bg-[#211a18] flex flex-col gap-2" style={{ padding: 14, border: set ? "1px solid rgba(232,196,114,.25)" : "1.5px solid #e8c472" }}>
      <div className="flex items-center justify-between gap-2">
        <b className="text-[15px]">{set ? "รหัสผ่าน" : "ตั้งรหัสผ่านของคุณ"}</b>
        {set && !open && <button type="button" onClick={() => { setOpen(true); setMsg(null); }} className="h-9 px-3 rounded-full text-[13px] font-semibold text-[#e8c472]" style={{ border: "1px solid rgba(232,196,114,.45)" }}>เปลี่ยนรหัสผ่าน</button>}
      </div>
      <span className="text-[13px] text-[#d9c9b4]">เข้าสู่ระบบด้วย <b className="text-[#f3ead9]">{login}</b>{set ? "" : " · ตั้งรหัสผ่านไว้เพื่อเข้าจากเครื่องอื่นหรือหลังออกจากระบบ"}</span>
      {open && (
        <form onSubmit={submit} className="flex flex-col gap-2">
          {set && <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" placeholder="รหัสผ่านเดิม" aria-label="รหัสผ่านเดิม" className={inp} />}
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)" aria-label="รหัสผ่านใหม่" className={inp} />
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" placeholder="ยืนยันรหัสผ่านใหม่" aria-label="ยืนยันรหัสผ่าน" className={inp} />
          <button type="submit" disabled={busy || !pw || !pw2 || (set && !cur)} className="h-12 rounded-xl font-semibold text-[#1b130b] bg-[#e8c472] disabled:opacity-40">{busy ? "กำลังบันทึก…" : "บันทึกรหัสผ่าน"}</button>
        </form>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`m-0 text-[13.5px] ${msg.ok ? "text-[#8fd19e]" : "text-[#ff8a9a]"}`}>{msg.t}</p>}
    </section>
  );
}
