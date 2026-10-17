"use client";
/* eslint-disable @next/next/no-img-element */

// บอร์ด C-Complete "จบนัด ให้คะแนน" — ดาว + แท็ก + ทิป (หักจากกระเป๋า) → ยืนยันจบนัด และโอนให้เพื่อน
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US");
// ทิปสูงสุด = TIP_MAX ใน lib/bookings/day.ts (เซิร์ฟเวอร์ตรวจซ้ำ)
const TIP_MAX = 5000;
const TAGS =["ตรงเวลา", "คุยสนุก", "สุภาพ", "ดูแลดี", "ถ่ายรูปสวย"];
const LBL = ["", "ไม่ประทับใจ", "พอใช้", "โอเค", "ดีมาก", "ประทับใจสุด ๆ"];
type B = { id: string; status: string; starts_at: string; hours: number; total_satang: number; pt: { pid: string; nick: string; img: string } };

export default function CompletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [b, setB] = useState<B | null>(null);
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<string[]>(["ตรงเวลา"]);
  const [tip, setTip] = useState(0);
  const [custom, setCustom] = useState("");
  const [again, setAgain] = useState("yes");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { fetch(`/api/bookings/${id}`, { cache: "no-store" }).then((r) => r.json()).then((d) => (d?.ok ? setB(d.booking) : setErr(d?.error || "ไม่พบการจอง"))).catch(() => setErr("โหลดไม่สำเร็จ")); }, [id]);
  const submit = async () => {
    setBusy(true); setErr("");
    const r = await fetch(`/api/bookings/${id}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, tags, again, body: text, tip }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (d?.ok) return router.push(`/order/${id}`);
    setErr(d?.error || "ยืนยันไม่สำเร็จ");
  };
  if (!b) return <p className="text-center" style={{ padding: "80px 24px", color: err ? "#ff8a9a" : "#b5a596" }}>{err || "กำลังโหลด…"}</p>;
  const s = new Date(b.starts_at), e = new Date(s.getTime() + b.hours * 3600_000);
  const hm = (d: Date) => d.toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
  const can = ["accepted", "checked_in"].includes(b.status);
  // ตรงกับเซิร์ฟเวอร์: กดจบนัดได้ตั้งแต่เวลาเริ่มนัด
  const early = Date.parse(b.starts_at) > Date.now();
  const tipBad = tip < 0 || tip > TIP_MAX || !Number.isInteger(tip);

  return (
    <div className="min-h-dvh pb-[190px]" style={{ background: "#171211" }}>
      <div className="flex flex-col items-center text-center" style={{ padding: "30px 20px 0" }}>
        <img src={b.pt.img} alt="" className="w-[84px] h-[84px] rounded-full object-cover" style={{ border: `2px solid ${GOLD}` }} />
        <h1 className="m-0 mt-3 font-semibold text-[24px]">จบนัดกับ{b.pt.nick}แล้ว</h1>
        <div className="text-[13px] font-light text-[#d9c9b4]">{b.hours} ชม. · {hm(s)}–{hm(e)}</div>
      </div>
      {!can ? <p className="text-center text-[14px] text-[#d9c9b4]" style={{ padding: 24 }}>นัดนี้ยืนยันจบไปแล้ว หรืออยู่ระหว่างทีมงานพิจารณา · <Link href={`/order/${id}`} style={{ color: GOLD }}>ดูสถานะ</Link></p> : <>
        <div className="flex flex-col items-center gap-2" style={{ margin: "18px 16px 0" }}>
          <div className="text-[14px]">วันนี้กับ{b.pt.nick}เป็นอย่างไรบ้าง</div>
          <div className="flex gap-2">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} ดาว`} style={{ color: n <= rating ? GOLD : LN }}><svg viewBox="0 0 24 24" width="38" height="38" aria-hidden="true"><path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" fill="currentColor" /></svg></button>)}</div>
          <div className="text-[12px] font-light" style={{ color: GOLD }}>{rating} ดาว · {LBL[rating]}</div>
          <div className="flex flex-wrap gap-1.5 justify-center mt-1">{TAGS.map((t) => { const on = tags.includes(t); return <button key={t} type="button" aria-pressed={on} onClick={() => setTags(on ? tags.filter((x) => x !== t) : [...tags, t])} className="h-8 px-3 rounded-full text-[12px]" style={{ border: `1px solid ${on ? "#f3ead9" : LN}`, background: on ? "#f3ead9" : "transparent", color: on ? "#171211" : "#f3ead9" }}>{t}</button>; })}</div>
        </div>
        <div className="flex flex-col gap-2" style={{ margin: "18px 16px 0" }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="เล่าสั้น ๆ ให้คนอื่นได้รู้ (ไม่บังคับ)" className="h-[76px] rounded-[14px] bg-[#251d1b] p-3 text-[16px] text-[#f3ead9] outline-none resize-none placeholder:text-[#b5a596]" style={{ border: `1px solid ${LN}` }} />
          <div className="flex gap-1.5" role="radiogroup" aria-label="นัดซ้ำไหม">{[["yes", "นัดอีกแน่นอน"], ["maybe", "อาจจะ"], ["no", "ไม่นัดซ้ำ"]].map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={again === k} onClick={() => setAgain(k)} className="flex-1 h-9 rounded-xl text-[12px]" style={{ border: `1px solid ${again === k ? GOLD : LN}`, color: again === k ? GOLD : "#f3ead9" }}>{l}</button>)}</div>
        </div>
        <div style={{ margin: "20px 16px 0" }}>
          <div className="text-[14px] mb-2">ให้ทิป{b.pt.nick} <span className="text-[12px] font-light text-[#d9c9b4]">· หักจากกระเป๋าเงิน</span></div>
          <div className="flex gap-2" role="radiogroup">{[0, 100, 200, 300].map((v) => { const on = !custom && tip === v; return <button key={v} type="button" role="radio" aria-checked={on} onClick={() => { setTip(v); setCustom(""); }} className="flex-1 h-[46px] rounded-xl text-[15px]" style={{ border: `1px solid ${on ? GOLD : LN}`, color: on ? GOLD : "#f3ead9", background: on ? "rgba(232,196,114,0.16)" : "transparent" }}>{v ? `฿${v}` : "ไม่ให้"}</button>; })}</div>
          {/* ทิปจำนวนอื่น (บาทเต็ม) */}
          <label className="flex items-center gap-2 mt-2 h-12 rounded-xl bg-[#251d1b] px-[14px]" style={{ border: `1px solid ${custom ? GOLD : LN}` }}>
            <span className="text-[14px] text-[#d9c9b4] shrink-0">ระบุเอง ฿</span>
            <input value={custom} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 5); setCustom(v); setTip(v ? Number(v) : 0); }} inputMode="numeric" placeholder="เช่น 150" aria-label="ทิประบุจำนวนเอง (บาท)" className="flex-1 min-w-0 bg-transparent text-[16px] text-[#f3ead9] outline-none placeholder:text-[#b5a596]" />
          </label>
          {tipBad && <p role="alert" className="m-0 mt-1 text-[12px] text-[#ff8a9a]">ทิปได้ 0–{TIP_MAX.toLocaleString()} บาท</p>}
        </div>
        <div className="flex justify-between items-center rounded-2xl" style={{ margin: "18px 16px 0", padding: 14, border: `1px solid ${GOLD}`, background: "rgba(212,175,55,.05)" }}>
          <span className="text-[14px]">ยอดที่พักไว้กับเรา</span>
          <span className="text-right"><b className="font-semibold text-[22px]" style={{ color: GOLD }}>{baht(b.total_satang)}</b><span className="block text-[12px] font-light text-[#d9c9b4]">{tip ? `+ ทิป ฿${tip} จากกระเป๋า` : "ไม่รวมทิป"}</span></span>
        </div>
        {err && <p role="alert" className="text-[13px] text-[#ff8a9a]" style={{ margin: "12px 16px 0" }}>{err}</p>}
        <div className="fixed left-0 right-0 bottom-0 mx-auto max-w-[480px] flex flex-col gap-[10px]" style={{ padding: "12px 16px calc(24px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg, rgba(23,18,17,0), #171211 25%)" }}>
          <button type="button" disabled={busy || early || tipBad} onClick={submit} className="h-14 rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[17px] disabled:opacity-50">{busy ? "กำลังยืนยัน…" : `ยืนยันจบนัด และโอนให้${b.pt.nick}`}</button>
          {early && <p className="m-0 text-center text-[12.5px] text-[#d9c9b4]">ยังไม่ถึงเวลานัด · กดจบนัดได้ตั้งแต่ {hm(s)} น.</p>}
          <div className="flex justify-between text-[13px] font-light"><Link href={`/order/${id}/dispute`} className="text-[#d9c9b4]">มีปัญหา? แจ้งเราได้</Link><Link href={`/book/${b.pt.pid}`} style={{ color: GOLD }}>จอง{b.pt.nick}อีกครั้ง</Link></div>
        </div>
      </>}
    </div>
  );
}
