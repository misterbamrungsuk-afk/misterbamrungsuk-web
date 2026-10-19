"use client";

// ขอลิงก์เข้าโปรไฟล์ทางอีเมล — ใส่เบอร์ที่สมัคร หรือรหัส MB → ระบบส่งลิงก์ไปอีเมลที่ใช้สมัคร (ตอบข้อความเดียวกันเสมอ)
import { useState } from "react";
import { Turnstile } from "@/components/turnstile";

export function LinkRequestForm() {
  const [q, setQ] = useState("");
  const [ts, setTs] = useState("");
  const [tsKey, setTsKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return setMsg({ ok: false, text: "ใส่เบอร์โทรที่สมัคร หรือรหัส MB" });
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/join/link-request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q: v, turnstile: ts }) });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      setMsg(d.ok ? { ok: true, text: d.message ?? "" } : { ok: false, text: d.error || "ส่งคำขอไม่สำเร็จ ลองใหม่อีกครั้ง" });
    } catch { setMsg({ ok: false, text: "ส่งคำขอไม่สำเร็จ ลองใหม่อีกครั้ง" }); }
    finally { setBusy(false); setTs(""); setTsKey((n) => n + 1); }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl bg-[#251d1b] text-left" style={{ padding: 18 }} aria-labelledby="lr-h">
      <h2 id="lr-h" className="m-0 font-semibold text-[17px] text-[#e8c472]">ลืมรหัสผ่าน? ส่งลิงก์ไปอีเมล</h2>
      <p className="m-0 text-[13.5px] leading-[1.6] text-[#d9c9b4]">ใส่เบอร์โทรที่ใช้สมัคร หรือรหัส MB เราจะส่งลิงก์เข้าโปรไฟล์ไปที่อีเมลที่ใช้สมัคร · เปิดลิงก์แล้วตั้งรหัสผ่านใหม่ในหน้าตั้งค่าได้ภายใน 30 นาที</p>
      <input value={q} onChange={(e) => { setQ(e.target.value.slice(0, 20)); setMsg(null); }} inputMode="text" autoComplete="tel" placeholder="เบอร์โทรที่สมัคร หรือรหัส MB" aria-label="เบอร์โทรที่สมัคร หรือรหัส MB" className="w-full min-h-12 rounded-xl bg-[#211a18] text-[#f3ead9] px-[14px] text-[15px] placeholder:text-[#b5a596] outline-none border border-transparent focus:border-[#e8c472]" />
      <Turnstile key={tsKey} onToken={setTs} />
      <button type="submit" disabled={busy} aria-busy={busy} className="h-[52px] rounded-full grid place-items-center font-semibold bg-[#e8c472] text-[#1b130b] disabled:opacity-60">{busy ? "กำลังส่ง…" : "ส่งลิงก์ไปอีเมลของฉัน"}</button>
      {msg && <p role="status" className="m-0 text-[13.5px] leading-[1.6]" style={{ color: msg.ok ? "#7fd6a3" : "#ff8a9a" }}>{msg.text}</p>}
    </form>
  );
}
