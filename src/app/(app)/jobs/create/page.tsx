"use client";

// บอร์ด C-JobPost "โพสต์หาเพื่อน" — อยากทำอะไร · วันเวลา · ระยะเวลา · สถานที่ · รายละเอียด → โพสต์ 24 ชม.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const A = ["กิน & เที่ยว", "คาเฟ่", "ดูหนัง", "ช่างภาพ", "ออกกำลัง", "นวดผ่อนคลาย"];
const lbl = "block text-[13px] font-light text-[#d9c9b4] mb-1.5";
const inp = "min-h-12 w-full rounded-xl bg-[#251d1b] px-[14px] text-[16px] text-[#f3ead9] outline-none placeholder:text-[#b5a596]";
const chip = (on: boolean) => ({ background: on ? "rgba(232,196,114,0.14)" : "#251d1b", color: on ? "#e8c472" : "#f3ead9", fontWeight: on ? 600 : 300 });

export default function JobPostPage() {
  const router = useRouter();
  const [act, setAct] = useState(0);
  const [hrs, setHrs] = useState<3 | 5>(3);
  const def = useMemo(() => { const d = new Date(Date.now() + 3 * 3600_000); d.setMinutes(0, 0, 0); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`; }, []);
  const [when, setWhen] = useState(def);
  const [area, setArea] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async () => {
    setBusy(true); setErr("");
    const r = await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activity: A[act], starts_at: new Date(when).toISOString(), hours: hrs, area, note }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (d?.ok) return router.push(`/jobs/interested?id=${d.id}`);
    setErr(d?.error || "โพสต์ไม่สำเร็จ");
  };
  return (
    <div className="min-h-dvh pb-[150px]">
      <header className="flex items-center gap-3 h-[68px] px-4" style={{ background: "#251d1b" }}>
        <Link href="/jobs" aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full bg-[#211a18] grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
        <h1 className="m-0 flex-1 font-semibold text-[18px]">โพสต์หาเพื่อน</h1>
      </header>
      <main className="flex flex-col gap-4" style={{ padding: "20px 16px 0" }}>
        <p className="m-0 text-[13px] font-light text-[#d9c9b4]">บอกสิ่งที่อยากทำ เพื่อนที่ว่างจะกดสนใจ แล้วคุณเลือกคนที่ชอบได้</p>
        <div><span className={lbl}>อยากทำอะไร</span><div className="flex flex-wrap gap-2">{A.map((t, i) => <button key={t} type="button" aria-pressed={act === i} onClick={() => setAct(i)} className="min-h-10 px-[14px] rounded-full text-[13px]" style={chip(act === i)}>{t}</button>)}</div></div>
        <label><span className={lbl}>วัน · เวลา</span><input type="datetime-local" value={when} min={def.slice(0, 16)} onChange={(e) => setWhen(e.target.value)} className={inp} style={{ colorScheme: "dark" }} /></label>
        <div><span className={lbl}>ระยะเวลา</span><div className="grid grid-cols-2 gap-2">{([3, 5] as const).map((h) => <button key={h} type="button" onClick={() => setHrs(h)} aria-pressed={hrs === h} className="min-h-10 rounded-full text-[13px]" style={chip(hrs === h)}>{h} ชม.</button>)}</div></div>
        <label><span className={lbl}>สถานที่</span><input value={area} onChange={(e) => setArea(e.target.value)} maxLength={80} placeholder="เช่น ทองหล่อ · กรุงเทพฯ" className={inp} /></label>
        <label><span className={lbl}>รายละเอียดเพิ่ม (ไม่บังคับ)</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="เช่น อยากได้คนคุยเก่ง ชอบคาเฟ่" className={inp} /></label>
        <div className="rounded-2xl bg-[#211a18] text-[13px] font-light text-[#d9c9b4]" style={{ padding: 16 }}>โพสต์อยู่ 24 ชม. · ราคาตามระดับของเพื่อนที่คุณเลือก · ยังไม่ต้องจ่ายจนกว่าจะเลือกเพื่อน</div>
        {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}</p>}
      </main>
      <div className="fixed left-0 right-0 bottom-0 mx-auto max-w-[480px] z-40" style={{ padding: "12px 16px calc(96px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg, rgba(23,18,17,0), #171211 30%)" }}>
        <button type="button" disabled={busy || area.trim().length < 2} onClick={submit} className="w-full min-h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold text-[15px] disabled:opacity-45">{busy ? "กำลังโพสต์…" : "โพสต์"}</button>
      </div>
    </div>
  );
}
