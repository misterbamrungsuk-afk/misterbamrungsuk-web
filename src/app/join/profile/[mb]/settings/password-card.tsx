"use client";

// ตั้ง / เปลี่ยนรหัสผ่าน Part-Time (เข้าสู่ระบบที่ /join/me) — สมัครก่อนมีระบบรหัสผ่าน = "ตั้งรหัสผ่าน" (ไม่มีอีเมล = ใส่อีเมลด้วย)
// เพิ่งเปิดลิงก์จากอีเมล (≤ 30 นาที) = ตั้งใหม่ได้โดยไม่ต้องใส่รหัสเดิม (ลืมรหัสผ่าน)
import { useEffect, useState } from "react";

const inCls = "w-full min-h-12 rounded-xl bg-[#211a18] text-[#f3ead9] px-[14px] text-[15px] placeholder:text-[#b5a596] outline-none border border-transparent focus:border-[#e8c472]";

export function PasswordCard({ mb, t }: { mb: string; t: string }) {
  const [st, setSt] = useState<{ has: boolean; fresh: boolean; email: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ email: "", current: "", a: "", b: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/join/password?mb=${encodeURIComponent(mb)}${t ? `&t=${encodeURIComponent(t)}` : ""}`, { cache: "no-store" })
      .then((r) => r.json()).then((d: { ok?: boolean; has?: boolean; fresh?: boolean; email?: string }) => { if (d.ok) { setSt({ has: !!d.has, fresh: !!d.fresh, email: d.email ?? "" }); if (!d.has) setOpen(true); } })
      .catch(() => {});
  }, [mb, t]);
  if (!st) return null;
  const needCurrent = st.has && !st.fresh;
  const set = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v })); setMsg(null); };

  const save = async () => {
    if (!st.email && !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(f.email.trim())) return setMsg({ ok: false, text: "กรอกอีเมลให้ถูกต้อง เช่น name@gmail.com" });
    if (needCurrent && !f.current) return setMsg({ ok: false, text: "ใส่รหัสผ่านเดิม" });
    if (f.a.length < 8) return setMsg({ ok: false, text: "รหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร" });
    if (f.a !== f.b) return setMsg({ ok: false, text: "ยืนยันรหัสผ่านไม่ตรงกัน" });
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/join/password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mb, t, current: f.current, password: f.a, email: f.email.trim().toLowerCase() }) });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; email?: string; error?: string };
      if (d.ok) { setSt({ has: true, fresh: st.fresh, email: d.email || st.email }); setF({ email: "", current: "", a: "", b: "" }); setOpen(false); setMsg({ ok: true, text: `บันทึกรหัสผ่านแล้ว · เข้าสู่ระบบด้วย ${d.email || st.email} และรหัสนี้` }); }
      else setMsg({ ok: false, text: d.error || "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" });
    } catch { setMsg({ ok: false, text: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" }); }
    finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="pw-h" className="rounded-[20px] bg-[#211a18] flex flex-col gap-2.5" style={{ padding: 16 }}>
      <div className="flex items-center gap-2">
        <h2 id="pw-h" className="m-0 text-[17px] font-medium">{st.has ? "รหัสผ่าน" : "ตั้งรหัสผ่าน"}</h2>
        {st.has && !open && <button type="button" onClick={() => setOpen(true)} className="ml-auto min-h-10 px-3 rounded-full text-[13px] text-[#e8c472]" style={{ background: "rgba(232,196,114,0.16)" }}>เปลี่ยนรหัสผ่าน</button>}
      </div>
      <p className="m-0 text-[13px] font-light text-[#d9c9b4]">{st.has ? `เข้าสู่ระบบ Part-Time ด้วย ${st.email || "อีเมลที่สมัคร"} และรหัสผ่าน` : "ตั้งรหัสผ่านไว้ เข้าสู่ระบบ Part-Time จากเครื่องไหนก็ได้ ไม่ต้องขอลิงก์จากทีมงาน"}</p>
      {open && <>
        {!st.email && <input className={inCls} type="email" inputMode="email" autoComplete="email" autoCapitalize="off" placeholder="อีเมลของคุณ (ใช้เข้าสู่ระบบ)" aria-label="อีเมลสำหรับเข้าสู่ระบบ" value={f.email} onChange={(e) => set("email", e.target.value.replace(/\s/g, ""))} />}
        {needCurrent && <input className={inCls} type={show ? "text" : "password"} autoComplete="current-password" placeholder="รหัสผ่านเดิม" aria-label="รหัสผ่านเดิม" value={f.current} onChange={(e) => set("current", e.target.value)} />}
        <input className={inCls} type={show ? "text" : "password"} autoComplete="new-password" placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)" aria-label="รหัสผ่านใหม่" value={f.a} onChange={(e) => set("a", e.target.value)} />
        <input className={inCls} type={show ? "text" : "password"} autoComplete="new-password" placeholder="ยืนยันรหัสผ่านใหม่" aria-label="ยืนยันรหัสผ่านใหม่" value={f.b} onChange={(e) => set("b", e.target.value)} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} className="self-start min-h-10 text-[13px] text-[#e8c472]">{show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}</button>
        {needCurrent && <p className="m-0 text-[12px] text-[#b5a596]">ลืมรหัสเดิม? ออกจากระบบ แล้วกด &quot;ลืมรหัสผ่าน? ส่งลิงก์ไปอีเมล&quot; ที่หน้าเข้าสู่ระบบ · เปิดลิงก์แล้วตั้งใหม่ได้ภายใน 30 นาที</p>}
        <div className="grid grid-cols-2 gap-2">
          {st.has && <button type="button" onClick={() => { setOpen(false); setMsg(null); }} className="h-11 rounded-xl text-[14px] font-semibold" style={{ background: "rgba(243,234,217,0.1)" }}>ยกเลิก</button>}
          <button type="button" onClick={save} disabled={busy} aria-busy={busy} className={"h-11 rounded-xl text-[14px] font-semibold bg-[#e8c472] text-[#1b130b] disabled:opacity-50" + (st.has ? "" : " col-span-2")}>{busy ? "กำลังบันทึก…" : "บันทึกรหัสผ่าน"}</button>
        </div>
      </>}
      {msg && <p role="status" className="m-0 text-[13px]" style={{ color: msg.ok ? "#7fd6a3" : "#ff8a9a" }}>{msg.text}</p>}
    </section>
  );
}
