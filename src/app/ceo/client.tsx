"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const INK = "#2a1d1a", MUTED = "#8a7b75";
const inp = "h-12 w-full rounded-xl border bg-white px-4 text-[16px] outline-none focus:border-[#c9a24a]";

async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  return ((await r?.json().catch(() => null)) ?? { ok: false, error: "เชื่อมต่อไม่ได้" }) as { ok?: boolean; error?: string };
}

/** หน้าเข้า: login = ใส่รหัส CEO · setup = แอดมิน CEO ตั้งรหัสครั้งแรก · unset = ยังไม่ได้ตั้งรหัส */
export function CeoGate({ mode }: { mode: "login" | "setup" | "unset" }) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "setup" && pw !== pw2) { setErr("รหัสทั้งสองช่องไม่ตรงกัน"); return; }
    setBusy(true); setErr("");
    const j = await post(mode === "setup" ? "/api/ceo/password" : "/api/ceo/login", { password: pw });
    setBusy(false);
    if (j.ok) router.refresh(); else setErr(j.error || "ไม่สำเร็จ");
  };
  return (
    <div className="min-h-[80dvh] grid place-items-center" style={{ color: INK }}>
      <form data-ceo-gate={mode} onSubmit={submit} className="w-full max-w-[400px] rounded-[24px] bg-white p-6 flex flex-col gap-3.5 shadow-[0_10px_40px_rgba(90,60,20,.1)]">
        <div className="w-14 h-14 rounded-2xl grid place-items-center text-[22px] font-bold" style={{ background: "#2a1d1a", color: "#e8c472" }}>MB</div>
        <h1 className="m-0 font-lux text-[28px] font-bold leading-tight">ห้อง CEO</h1>
        {mode === "unset" ? (
          <p className="m-0 text-[15px] leading-relaxed" style={{ color: MUTED }}>ยังไม่ได้ตั้งรหัส CEO · ให้ CEO ล็อกอินหลังบ้านด้วยบัญชีแอดมิน CEO ก่อน แล้วเปิดลิงก์นี้อีกครั้งเพื่อตั้งรหัส</p>
        ) : (
          <>
            <p className="m-0 text-[14.5px]" style={{ color: MUTED }}>{mode === "setup" ? "ตั้งรหัส CEO ครั้งแรก (แยกจากรหัสแอดมิน · 8 ตัวขึ้นไป) · ใช้รหัสนี้เข้าห้อง CEO ทุกครั้ง" : "ใส่รหัส CEO เพื่ออนุมัติเงินเข้ากระเป๋าและคำขอถอน"}</p>
            <input data-ceo-password type="password" autoComplete={mode === "setup" ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="รหัส CEO" aria-label="รหัส CEO" className={inp} style={{ borderColor: "#e7ddcf", color: INK }} autoFocus />
            {mode === "setup" && <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="ใส่รหัส CEO อีกครั้ง" aria-label="ยืนยันรหัส CEO" className={inp} style={{ borderColor: "#e7ddcf", color: INK }} />}
            {err && <p role="alert" className="m-0 text-[14px]" style={{ color: "#b42335" }}>{err}</p>}
            <button type="submit" disabled={busy || pw.length < (mode === "setup" ? 8 : 1)} className="h-12 rounded-xl font-semibold text-white disabled:opacity-40" style={{ background: INK }}>{busy ? "กำลังตรวจ…" : mode === "setup" ? "ตั้งรหัสและเข้าห้อง CEO" : "เข้าห้อง CEO"}</button>
            <p className="m-0 text-[12.5px]" style={{ color: MUTED }}>ลืมรหัส CEO → ติดต่อทีมโปรแกรมเมอร์เพื่อรีเซ็ต</p>
          </>
        )}
      </form>
    </div>
  );
}

/** แถบบนในห้อง CEO: เปลี่ยนรหัส + ออก */
export function CeoBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const change = async () => {
    const j = await post("/api/ceo/password", { current: cur, password: pw });
    setMsg(j.ok ? { ok: true, t: "เปลี่ยนรหัส CEO แล้ว · เครื่องอื่นต้องใส่รหัสใหม่" } : { ok: false, t: j.error || "ไม่สำเร็จ" });
    if (j.ok) { setCur(""); setPw(""); setOpen(false); }
  };
  const logout = async () => { await post("/api/ceo/logout", {}); router.refresh(); };
  return (
    <div data-ceo-bar className="flex flex-wrap items-center gap-2 mb-4 text-[13.5px]" style={{ color: INK }}>
      <span className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full font-semibold" style={{ background: "#2a1d1a", color: "#e8c472" }}>● ห้อง CEO · ลิงก์แยก</span>
      <button type="button" onClick={() => setOpen((v) => !v)} className="h-9 px-3.5 rounded-full border bg-white" style={{ borderColor: "#e7ddcf" }}>เปลี่ยนรหัส CEO</button>
      <button type="button" data-ceo-logout onClick={logout} className="h-9 px-3.5 rounded-full border bg-white" style={{ borderColor: "#e7ddcf" }}>ออกจากห้อง CEO</button>
      {msg && <span role="status" style={{ color: msg.ok ? "#2f7a46" : "#b42335" }}>{msg.t}</span>}
      {open && (
        <div className="w-full flex flex-wrap gap-2 items-center rounded-2xl bg-white p-3">
          <input type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="รหัส CEO เดิม" className="h-10 rounded-lg border px-3 text-[14px]" style={{ borderColor: "#e7ddcf" }} />
          <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="รหัสใหม่ (8 ตัวขึ้นไป)" className="h-10 rounded-lg border px-3 text-[14px]" style={{ borderColor: "#e7ddcf" }} />
          <button type="button" disabled={!cur || pw.length < 8} onClick={change} className="h-10 px-4 rounded-lg font-semibold text-white disabled:opacity-40" style={{ background: INK }}>บันทึก</button>
        </div>
      )}
    </div>
  );
}
