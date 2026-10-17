"use client";
/* eslint-disable @next/next/no-img-element */

// บอร์ด C-QuickCall: ฟอร์มเรียก → หน้ารอ (วงนับถอยหลัง + รูปเพื่อนที่เห็นคำขอ + แผ่นรายละเอียด/ยกเลิก) → เพื่อนรับแล้วไปหน้านัด
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const PLACES: [string, string][] = [["cafe", "คาเฟ่ / ร้านอาหาร"], ["mall", "ห้าง"], ["outdoor", "กลางแจ้ง"], ["out", "นอกสถานที่"], ["condo", "คอนโด"], ["hotel", "โรงแรม"]];
type Q = { id: string; code: string; activity: string; hours: number; place: { label: string; detail: string }; hold_satang: number; invited: number; faces: string[]; status: string; booking_id: string | null; expires_at: string; created_at: string };
const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US");

export function QuickCall({ loggedIn, free, est, activities }: { loggedIn: boolean; free: { 3: number; 5: number }; est: { 3: number; 5: number }; activities: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState<Q | null>(null);
  const [seconds, setSeconds] = useState(180);
  const [f, setF] = useState({ activity: activities[0], hours: 3 as 3 | 5, type: "cafe", detail: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ text: string; short?: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  // ตำแหน่งปัจจุบัน (ไม่บังคับ) — ส่งต่อเป็นหมุดจุดนัดให้เพื่อนนำทาง/คิดเวลาถึง
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locMsg, setLocMsg] = useState("");
  const useHere = () => {
    if (!navigator.geolocation) return setLocMsg("เครื่องนี้ไม่รองรับตำแหน่ง");
    setLocMsg("กำลังหาตำแหน่ง…");
    navigator.geolocation.getCurrentPosition((p) => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocMsg(""); }, () => setLocMsg("ไม่ได้รับอนุญาตตำแหน่ง · กรอกจุดนัดพบแทนได้"), { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 });
  };

  const load = useCallback(async (id?: string) => {
    const r = await fetch(id ? `/api/quick/${id}` : "/api/quick", { cache: "no-store" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (d?.ok) { setQ(d.quick); if (d.seconds) setSeconds(d.seconds); }
  }, []);
  useEffect(() => { if (loggedIn) load(); }, [loggedIn, load]);
  // หน้ารอ: ดึงสถานะทุก 2 วิ · เพื่อนรับแล้ว → ไปหน้านัด
  useEffect(() => {
    if (q?.status !== "open") return;
    const t = setInterval(() => { setNow(Date.now()); load(q.id); }, 2000);
    return () => clearInterval(t);
  }, [q?.status, q?.id, load]);
  useEffect(() => { if (q?.status === "matched" && q.booking_id) { const t = setTimeout(() => router.push(`/order/${q.booking_id}`), 1800); return () => clearTimeout(t); } }, [q?.status, q?.booking_id, router]);

  const submit = async () => {
    setErr(null);
    if (!f.detail.trim()) return setErr({ text: "กรอกจุดนัดพบ / ย่าน" });
    setBusy(true);
    const r = await fetch("/api/quick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activity: f.activity, hours: f.hours, place: { type: f.type, detail: f.detail, ...(loc ?? {}) }, note: f.note }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (!d?.ok) return setErr({ text: d?.error || "ส่งคำขอไม่สำเร็จ", short: d?.short });
    setNow(Date.now()); setQ(d.quick);
  };
  const cancel = async () => {
    if (!q) return;
    setBusy(true);
    const r = await fetch(`/api/quick/${q.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (d?.ok) setQ(d.quick); else load(q.id);
  };

  // ── หน้ารอเพื่อนรับ (ตามบอร์ด) ──
  if (q && (q.status === "open" || q.status === "matched")) {
    const total = Math.max(1, (Date.parse(q.expires_at) - Date.parse(q.created_at)) / 1000);
    const left = Math.max(0, Math.round((Date.parse(q.expires_at) - now) / 1000));
    const matched = q.status === "matched";
    const shown = left >= 60 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : String(left);
    const POS: React.CSSProperties[] = [{ left: 4, top: 60 }, { right: 14, top: 20 }, { right: 0, bottom: 70 }, { left: 30, bottom: 14 }];
    return (
      <div className="pb-[440px]">
        <div className="text-center" style={{ padding: "0 24px" }}>
          <div className="font-semibold text-[22px]">{matched ? "เพื่อนรับนัดแล้ว" : "กำลังหาเพื่อนให้คุณ"}</div>
          <div className="text-[14px] text-[#d9c9b4] mt-1">{matched ? "กำลังพาไปหน้านัดของคุณ…" : `เพื่อนคนแรกที่รับนัดภายใน ${Math.round(total / 60)} นาที จะมาเจอคุณ`}</div>
        </div>
        <div className="relative mx-auto" style={{ width: 290, height: 290, marginTop: 24, maxWidth: "100%" }}>
          <div className="absolute inset-0 rounded-full" style={{ border: "1px solid rgba(212,175,55,.15)" }} />
          <div className="absolute rounded-full" style={{ inset: 36, border: "1px solid rgba(232,196,114,0.6)" }} />
          <svg viewBox="0 0 200 200" className="absolute" style={{ inset: 60, width: 170, height: 170, transform: "rotate(-90deg)" }} aria-hidden="true">
            <circle cx="100" cy="100" r="90" stroke="rgba(232,196,114,0.14)" strokeWidth="8" fill="none" />
            <circle cx="100" cy="100" r="90" stroke={GOLD} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="565" strokeDashoffset={matched ? 0 : 565 * (1 - left / total)} style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <div className="absolute flex flex-col items-center justify-center" style={{ inset: 60 }}>
            {matched ? <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
              : <><div className="font-bold leading-none" style={{ fontSize: left >= 60 ? 52 : 68 }} aria-live="polite">{shown}</div><div className="text-[13px] text-[#d9c9b4] font-light">{left >= 60 ? "นาที" : "วินาที"}</div></>}
          </div>
          {q.faces.map((src, i) => <div key={src} className="absolute w-[46px] h-[46px] rounded-full overflow-hidden" style={{ ...POS[i], border: "2px solid #171211", boxShadow: `0 0 0 2px ${GOLD}` }}><img src={src} alt="" className="w-full h-full object-cover" /></div>)}
        </div>
        <div className="text-center text-[14px] text-[#d9c9b4]"><b style={{ color: GOLD }}>เพื่อน {q.invited} คน</b> ที่ว่างและไม่มีนัดชนเวลา เห็นคำขอของคุณแล้ว</div>
        {matched && q.booking_id && <Link href={`/order/${q.booking_id}`} className="block text-center mt-2.5 text-[13px] font-light" style={{ color: GOLD }}>ดูนัดของคุณ →</Link>}
        {/* แผ่นรายละเอียดลอยเหนือแถบเมนูล่าง (สูง 66px + safe-area) — ไม่งั้นปุ่มยกเลิกโดนเมนูทับกดไม่ได้ */}
        <section className="fixed left-0 right-0 mx-auto max-w-[480px] bg-[#211a18] rounded-t-[28px] z-[45]" style={{ bottom: "calc(66px + max(14px, env(safe-area-inset-bottom)))", borderTop: `1px solid ${LN}`, padding: "16px 20px 14px", boxShadow: "0 -12px 30px rgba(0,0,0,.35)" }}>
          {[["กิจกรรม", `${q.activity} · ${q.hours} ชม.`], ["สถานที่", `${q.place.label} · ${q.place.detail}`]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-3 text-[14px]" style={{ borderBottom: `1px solid ${LN}` }}><span className="text-[#d9c9b4] shrink-0">{k}</span><b className="font-medium text-right">{v}</b></div>
          ))}
          <div className="flex justify-between py-3 text-[14px]"><span className="text-[#d9c9b4]">กันเงินไว้ (สูงสุด)</span><b className="font-semibold text-[18px]" style={{ color: GOLD }}>{baht(q.hold_satang)}</b></div>
          <p className="m-0 text-[12px] font-light text-[#b5a596]">จ่ายจริงตามราคาของเพื่อนที่รับ · ส่วนต่างคืนเข้ากระเป๋า · ไม่มีใครรับในเวลา = คืนเต็ม</p>
          {!matched && <button type="button" onClick={cancel} disabled={busy} className="w-full h-[54px] rounded-2xl text-[15px] font-semibold text-[#f3ead9] mt-2 disabled:opacity-50" style={{ border: `1px solid ${LN}` }}>{busy ? "กำลังยกเลิก…" : "ยกเลิกการเรียก"}</button>}
        </section>
      </div>
    );
  }

  // ── ฟอร์มเรียกด่วน ──
  const chip = (on: boolean) => ({ border: `1px solid ${on ? GOLD : LN}`, background: on ? "rgba(232,196,114,.14)" : "#211a18", color: on ? GOLD : "#f3ead9" });
  return (
    <div className="flex flex-col gap-4" style={{ padding: "0 16px" }}>
      {q && (q.status === "expired" || q.status === "cancelled") && (
        <p role="status" className="m-0 rounded-xl text-[13px]" style={{ padding: "10px 14px", background: "rgba(232,196,114,0.12)", color: GOLD }}>{q.status === "expired" ? "รอบที่แล้วยังไม่มีเพื่อนรับ · คืนเงินเข้ากระเป๋าแล้ว ลองเรียกใหม่ได้" : "ยกเลิกแล้ว · คืนเงินเข้ากระเป๋าแล้ว"}</p>
      )}
      <div className="rounded-[20px] bg-[#211a18] flex flex-col gap-3" style={{ padding: 16, border: `1px solid ${LN}` }}>
        <div className="text-[13px] text-[#d9c9b4]">กิจกรรม</div>
        <div className="flex flex-wrap gap-2">{activities.map((a) => <button key={a} type="button" onClick={() => setF({ ...f, activity: a })} className="h-10 px-3.5 rounded-full text-[13.5px]" style={chip(f.activity === a)}>{a}</button>)}</div>
        <div className="text-[13px] text-[#d9c9b4]">ระยะเวลา</div>
        <div className="grid grid-cols-2 gap-2">{([3, 5] as const).map((h) => <button key={h} type="button" onClick={() => setF({ ...f, hours: h })} className="h-12 rounded-[14px] text-[14px]" style={chip(f.hours === h)}>{h} ชม.</button>)}</div>
        <div className="text-[13px] text-[#d9c9b4]">สถานที่</div>
        <div className="flex flex-wrap gap-2">{PLACES.map(([k, l]) => <button key={k} type="button" onClick={() => setF({ ...f, type: k })} className="h-10 px-3.5 rounded-full text-[13.5px]" style={chip(f.type === k)}>{l}</button>)}</div>
        <input value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} maxLength={200} placeholder="จุดนัดพบ / ย่าน เช่น อโศก, Terminal 21" aria-label="จุดนัดพบ" className="h-12 rounded-xl bg-[#251d1b] px-[14px] text-[16px] text-[#f3ead9] outline-none placeholder:text-[#b5a596]" />
        <button type="button" onClick={useHere} className="min-h-11 rounded-xl text-[13.5px] text-left px-[14px]" style={chip(!!loc)}>{loc ? "✓ ใช้ตำแหน่งปัจจุบันเป็นจุดนัด (แตะเพื่ออัปเดต)" : "📍 ใช้ตำแหน่งปัจจุบันเป็นจุดนัด (ไม่บังคับ)"}</button>
        {locMsg && <span className="text-[12px] text-[#b5a596]">{locMsg}</span>}
        <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={300} placeholder="ฝากบอกเพื่อน (ไม่บังคับ)" aria-label="ฝากบอกเพื่อน" className="h-12 rounded-xl bg-[#251d1b] px-[14px] text-[16px] text-[#f3ead9] outline-none placeholder:text-[#b5a596]" />
        <div className="flex justify-between text-[14px] pt-1"><span className="text-[#d9c9b4]">เพื่อน {free[f.hours]} คนจะเห็นคำขอ · เริ่มราว 1 ชม. หลังเพื่อนรับ</span><b className="shrink-0" style={{ color: GOLD }}>{est[f.hours] ? `กันไว้ ${baht(est[f.hours])}` : "—"}</b></div>
      </div>
      {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err.text}{err.short ? <> · ขาดอีก {baht(err.short)} <Link href="/wallet" style={{ color: GOLD }}>เติมเงิน ›</Link></> : null}</p>}
      {loggedIn
        ? <button type="button" onClick={submit} disabled={busy || !free[f.hours]} className="h-[56px] rounded-2xl bg-[#e8c472] text-[#1b130b] text-[16px] font-semibold disabled:opacity-45">{busy ? "กำลังเรียก…" : free[f.hours] ? "เรียกด่วนเลย" : "ยังไม่มีเพื่อนว่างวันนี้"}</button>
        : <Link href="/login?next=/quick" className="h-[56px] rounded-2xl bg-[#e8c472] text-[#1b130b] text-[16px] font-semibold grid place-items-center hover:text-[#1b130b]">เข้าสู่ระบบเพื่อเรียกด่วน</Link>}
      <p className="m-0 text-[12px] font-light text-[#b5a596] text-center">ระบบกันยอดสูงสุดไว้ก่อน · จ่ายจริงตามราคาเพื่อนที่รับ ส่วนต่างคืนทันที · ไม่มีใครรับ = คืนเต็ม</p>
    </div>
  );
}
