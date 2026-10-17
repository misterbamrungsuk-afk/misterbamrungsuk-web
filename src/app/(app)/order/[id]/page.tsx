"use client";
/* eslint-disable @next/next/no-img-element */

// รายละเอียดการจอง (บอร์ด C-OrderDetail + C-Escrow "เงินของคุณอยู่ตรงไหน") — สถานะ · เงิน · แชท · ยกเลิก · แจ้งผิดนัด
// แถบล่าง = ปุ่มหลัก 1 ปุ่ม + "เพิ่มเติม" (เมนูแผ่นล่าง) — เดิมซ้อน 4–5 ปุ่ม (~250px) ทับปุ่มยืนยันยกเลิก/การ์ดเงินบนจอ 375–390px
// ยืนยันยกเลิก / แจ้งผิดนัด เปิดเป็นแผ่นล่างเหนือแถบเสมอ → ปุ่มยืนยันไม่โดนทับ
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LiveTrack } from "@/components/live-track";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US");
type Res = { refund_pct?: number; refund_satang?: number; decided?: string; cancelled?: boolean; note?: string; noshow?: { by: "customer" | "provider" } } | null;
type B = { id: string; code: string; status: string; starts_at: string; hours: number; price_satang: number; room_fee_satang: number; total_satang: number; note: string | null; place: { label: string; detail: string }; decline_reason: string | null; expires_at: string | null; created_at: string; checked_in_at?: string | null; cancel_refund_pct?: number | null; cancel_rule?: string; resolution?: Res; pt: { pid: string; nick: string; img: string } };
type NS = { can: boolean; reason: string; at: string | null; counter: boolean; claim: { status: string; mine: boolean; other: boolean } | null };
const MONEY: Record<string, [string, string]> = {
  requested: ["กันไว้ในกระเป๋าของคุณ", "รอเพื่อนตอบรับ · ไม่ตอบใน 30 นาทีคืนอัตโนมัติ"],
  accepted: ["พักไว้กับ Mister Bamrungsuk", "โอนให้เพื่อนหลังจบนัด · มีปัญหาแจ้งเราได้ก่อนเงินถูกปล่อย"],
  checked_in: ["พักไว้กับ Mister Bamrungsuk", "ระหว่างนัด · โอนให้เพื่อนหลังจบนัด"],
  cancel_requested: ["พักไว้กับ Mister Bamrungsuk", "ทีมงานกำลังพิจารณาคำขอยกเลิกตามกติกา"],
  disputed: ["พักไว้กับ Mister Bamrungsuk", "ทีมงานกำลังตรวจสอบเรื่องที่แจ้ง"],
  completed: ["โอนให้เพื่อนแล้ว", "นัดเสร็จสิ้น"],
  declined: ["คืนเข้ากระเป๋าแล้ว", "เพื่อนไม่สะดวกนัดนี้"], expired: ["คืนเข้ากระเป๋าแล้ว", "เพื่อนไม่ได้ตอบรับภายในเวลา"], cancelled: ["คืนเข้ากระเป๋าแล้ว", "ยกเลิกก่อนเพื่อนตอบรับ"], refunded: ["คืนเข้ากระเป๋าแล้ว", "ทีมงานคืนเงินให้แล้ว"],
};
const fmt = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** การ์ดเงิน: ผลตัดสิน (ยกเลิก/ผิดนัด) แสดงชัดว่าเกิดอะไรขึ้น — ยกเลิกช้าคืน 0% ต้องไม่ขึ้นว่า "นัดเสร็จสิ้น" */
function moneyOf(b: B): [string, string] {
  const r = b.resolution;
  if (r?.decided === "noshow:provider_no_show") return [`คืน ${baht(r.refund_satang ?? b.total_satang)} เข้ากระเป๋าแล้ว`, "ทีมงานตัดสิน: เพื่อนไม่มาตามนัด · คืนเต็มจำนวน"];
  if (r?.decided === "noshow:customer_no_show") return ["ไม่คืนเงินตามกติกา", "ทีมงานตัดสิน: ลูกค้าไม่มาตามนัด"];
  if (b.status === "disputed" && r?.noshow) return ["พักไว้กับ Mister Bamrungsuk", "ทีมงานกำลังตรวจหลักฐานผิดนัดของทั้งสองฝ่าย (ภายใน 24 ชม.)"];
  if (r?.decided === "refund") {
    const pct = r.refund_pct ?? 0;
    const cancelled = r.cancelled || /ยกเลิก/.test(r.note ?? "");
    if (cancelled && pct === 0) return ["ยกเลิก · ไม่คืนเงินตามกติกา", "ยกเลิกช้ากว่ากำหนด · ยอดนี้โอนให้เพื่อนตามกติกาการยกเลิก"];
    if (pct < 100) return [`คืน ${baht(r.refund_satang ?? 0)} เข้ากระเป๋าแล้ว`, `${cancelled ? "ยกเลิกตามกติกา" : "ผลพิจารณา"} · คืน ${pct}% ส่วนที่เหลือโอนให้เพื่อน`];
  }
  return (MONEY[b.status] ?? ["—", ""]) as [string, string];
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="ปิด" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-[480px] rounded-t-[24px] bg-[#211a18] flex flex-col gap-3 max-h-[88dvh] overflow-y-auto" style={{ padding: "16px 16px calc(18px + env(safe-area-inset-bottom))", borderTop: `1px solid ${LN}` }}>
        <div className="flex items-center justify-between gap-3"><b className="font-semibold text-[16px]">{title}</b><button type="button" onClick={onClose} aria-label="ปิด" className="w-10 h-10 rounded-full grid place-items-center text-[#d9c9b4]">✕</button></div>
        {children}
      </div>
    </div>
  );
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [b, setB] = useState<B | null>(null);
  const [err, setErr] = useState("");
  const [sheet, setSheet] = useState<null | "more" | "cancel" | "noshow">(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ns, setNs] = useState<NS | null>(null);
  const [nsNote, setNsNote] = useState("");
  const [nsPhoto, setNsPhoto] = useState<File | null>(null);
  const [nsGps, setNsGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [nsErr, setNsErr] = useState("");
  const load = useCallback(() => {
    fetch(`/api/bookings/${id}`, { cache: "no-store" }).then((r) => r.json()).then((d) => (d?.ok ? setB(d.booking) : setErr(d?.error || "ไม่พบการจอง"))).catch(() => setErr("โหลดไม่สำเร็จ"));
    fetch(`/api/noshow?booking=${id}`, { cache: "no-store" }).then((r) => r.json()).then((d) => d?.ok && setNs(d)).catch(() => {});
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const close = useCallback(() => setSheet(null), []);
  const doCancel = async () => {
    setBusy(true);
    const r = await fetch(`/api/bookings/${id}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false); setSheet(null);
    setMsg(d?.ok ? (["cancelled", "refunded", "completed"].includes(d.status) ? "ยกเลิกแล้ว · คืนเงินตามกติกาเข้ากระเป๋าแล้ว" : "ส่งคำขอยกเลิกแล้ว · ทีมงานจะพิจารณาตามกติกา") : d?.error || "ยกเลิกไม่สำเร็จ");
    load();
  };
  const getGps = () => navigator.geolocation?.getCurrentPosition((p) => setNsGps({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }), () => setNsErr("ไม่ได้รับอนุญาตตำแหน่ง · ส่งได้โดยไม่มี GPS"), { enableHighAccuracy: true, timeout: 8000 });
  const sendNoShow = async () => {
    setBusy(true); setNsErr("");
    const fd = new FormData();
    fd.set("booking", id); fd.set("note", nsNote);
    if (nsGps) { fd.set("lat", String(nsGps.lat)); fd.set("lng", String(nsGps.lng)); fd.set("accuracy", String(nsGps.accuracy)); } else fd.set("gps_error", "ผู้ใช้ไม่ได้แชร์ตำแหน่ง");
    if (nsPhoto) fd.set("photo", nsPhoto);
    const r = await fetch("/api/noshow", { method: "POST", body: fd }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (!d?.ok) return setNsErr(d?.error || "ส่งไม่สำเร็จ");
    setSheet(null); setMsg("ส่งเรื่องผิดนัดแล้ว · เงินพักไว้จนทีมงานตัดสิน (ภายใน 24 ชม.)"); load();
  };

  const head = (
    <div className="flex items-center gap-3 h-16 px-4" style={{ background: "#251d1b" }}>
      <Link href="/orders" aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full bg-[#211a18] grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
      <h1 className="m-0 font-semibold text-[18px]">รายละเอียดการจอง</h1>
    </div>
  );
  if (err) return <div>{head}<p className="text-center text-[#ff8a9a]" style={{ padding: 40 }}>{err}</p></div>;
  if (!b) return <div>{head}<p className="text-center text-[#b5a596]" style={{ padding: 40 }}>กำลังโหลด…</p></div>;
  const money = moneyOf(b);
  const started = Date.parse(b.starts_at) <= Date.now();
  const chatOpen = ["requested", "accepted", "checked_in", "cancel_requested"].includes(b.status);
  const canCancel = b.status === "requested" || b.status === "accepted";
  const canComplete = b.status === "checked_in" || (b.status === "accepted" && started);
  const canSession = b.status === "checked_in" || (b.status === "accepted" && Date.parse(b.starts_at) - Date.now() < 2 * 3600_000);
  // แจ้งปัญหาหลังเริ่มนัด/เช็กอินเท่านั้น (ก่อนนั้นใช้ยกเลิกตามกติกา) — ตรงกับ dispute() ฝั่งเซิร์ฟเวอร์
  const canDispute = b.status === "checked_in" || (b.status === "accepted" && started);
  const pct = b.cancel_refund_pct;

  // ปุ่มหลัก 1 ปุ่ม (สำคัญสุดตามสถานะ) · ที่เหลืออยู่ในเมนู "เพิ่มเติม"
  type Act = { key: string; label: string; href?: string; on?: () => void; tone?: "gold" | "red" | "plain" };
  const acts: Act[] = [];
  if (ns?.can) acts.push({ key: "noshow", label: ns.counter ? "ส่งหลักฐานผิดนัดฝั่งคุณ" : "เพื่อนไม่มาตามนัด? แจ้งเรา", on: () => setSheet("noshow"), tone: "red" });
  if (canComplete) acts.push({ key: "complete", label: "ยืนยันจบนัดและให้คะแนน", href: `/order/${b.id}/complete`, tone: "gold" });
  if (chatOpen) acts.push({ key: "chat", label: `แชทกับ${b.pt.nick}`, href: `/chat/${b.id}`, tone: "gold" });
  if (canSession) acts.push({ key: "session", label: "หน้าระหว่างนัด (เวลา · SOS)", href: `/order/${b.id}/session` });
  if (canDispute) acts.push({ key: "dispute", label: "มีปัญหา? แจ้งเรา", href: `/order/${b.id}/dispute` });
  if (canCancel) acts.push({ key: "cancel", label: b.status === "requested" ? "ยกเลิกคำขอ" : "ยกเลิก / เปลี่ยนเวลา", on: () => setSheet("cancel"), tone: "red" });
  if (!chatOpen && !canCancel) acts.push({ key: "again", label: "จองอีกครั้ง", href: `/book/${b.pt.pid}`, tone: "gold" });
  const primary = acts.find((a) => a.key === "noshow" && !ns?.counter) ?? acts.find((a) => a.tone === "gold") ?? acts[0];
  const rest = acts.filter((a) => a !== primary);
  const btn = (a: Act, big = false) => {
    const cls = `${big ? "h-[52px] text-[15px]" : "h-12 text-[14px]"} w-full rounded-[14px] grid place-items-center font-semibold px-3 text-center`;
    const style = a.tone === "gold" && big ? { background: GOLD, color: "#1b130b" } : a.tone === "red" ? { background: "rgba(201,40,61,.16)", color: "#ff8a9a" } : { border: `1px solid ${LN}`, color: "#f3ead9" };
    return a.href ? <Link key={a.key} href={a.href} className={`${cls} hover:opacity-90`} style={style}>{a.label}</Link>
      : <button key={a.key} type="button" onClick={a.on} className={cls} style={style}>{a.label}</button>;
  };

  return (
    // เว้นล่างให้พ้นแถบปุ่ม (12 + 52 + 18 + safe-area ≈ 82px) + ระยะหายใจ
    <div className="min-h-dvh" style={{ background: "#171211", paddingBottom: "calc(112px + env(safe-area-inset-bottom))" }}>
      {head}
      <main className="flex flex-col gap-4" style={{ padding: "16px 16px 0" }}>
        {msg && <p role="status" className="m-0 rounded-xl text-[13px]" style={{ padding: "10px 14px", background: "rgba(232,196,114,0.14)", color: GOLD }}>{msg}</p>}
        <div className="flex gap-3 items-center rounded-[20px] bg-[#211a18]" style={{ padding: 14, border: `1px solid ${LN}` }}>
          <img src={b.pt.img} alt="" className="w-14 h-14 rounded-full object-cover" />
          <div className="flex-1 min-w-0"><b className="font-medium text-[17px]">{b.pt.nick}</b><div className="text-[12px] font-light text-[#d9c9b4]">#{b.code} · จองเมื่อ {fmt(b.created_at)}</div></div>
          <Link href={`/p/${b.pt.pid}`} className="tap px-1 text-[13px] font-light" style={{ color: GOLD }}>โปรไฟล์</Link>
        </div>
        {(b.status === "accepted" || b.status === "checked_in") && <LiveTrack id={b.id} nick={b.pt.nick} img={b.pt.img} startsAt={b.starts_at} />}
        {ns?.can && (
          <div className="rounded-[20px] flex flex-col gap-2" style={{ padding: 14, border: "1px solid rgba(255,138,154,.4)", background: "rgba(201,40,61,.08)" }}>
            <b className="font-semibold text-[15px]">{ns.counter ? "เพื่อนแจ้งว่าคุณไม่มาตามนัด" : `${b.pt.nick}ยังไม่ถึงจุดนัด`}</b>
            <span className="text-[13px] font-light text-[#d9c9b4]">{ns.counter ? "ส่งหลักฐานฝั่งคุณ (ตำแหน่ง รูป) ให้ทีมงานพิจารณา · เงินพักไว้จนตัดสิน" : "รอเกิน 15 นาทีแล้ว · แจ้งเรื่องผิดนัดให้ทีมงานตรวจ ถ้าเพื่อนไม่มาจริงคืนเงิน 100%"}</span>
          </div>
        )}
        {!ns?.can && ns?.claim && ns.reason && <p className="m-0 rounded-xl text-[13px] text-[#d9c9b4]" style={{ padding: "10px 14px", border: `1px solid ${LN}` }}>{ns.reason}</p>}
        <div className="rounded-[20px] bg-[#211a18] text-[14px]" style={{ padding: "4px 16px", border: `1px solid ${LN}` }}>
          {[["วันเวลา", `${fmt(b.starts_at)} (${b.hours} ชม.)`], ["สถานที่", `${b.place.label} ${b.place.detail}`], ...(b.note ? [["ฝากบอก", b.note]] : []), ["ค่าบริการ", baht(b.price_satang)], ...(b.room_fee_satang ? [["ค่าห้อง", baht(b.room_fee_satang)]] : [])].map(([k, v], i, a) => (
            <div key={k} className="flex justify-between gap-3 py-[10px]" style={{ borderBottom: i < a.length - 1 ? `1px solid ${LN}` : "none" }}><span className="text-[#d9c9b4] shrink-0">{k}</span><span className="text-right">{v}</span></div>
          ))}
        </div>
        <div className="rounded-[20px] flex gap-3 items-start" style={{ padding: 14, border: "1px solid rgba(212,175,55,.4)", background: "rgba(212,175,55,.06)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" aria-hidden="true" className="shrink-0 mt-0.5"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          <div className="flex-1"><div className="text-[13px] font-light text-[#d9c9b4]">เงินของคุณ {baht(b.total_satang)}</div><b className="font-semibold" style={{ color: GOLD }}>{money[0]}</b><div className="text-[12.5px] font-light text-[#d9c9b4]">{money[1]}{b.decline_reason && (b.status === "declined") ? ` · ${b.decline_reason}` : ""}</div></div>
        </div>
        <div className="flex justify-between gap-3 text-[13px] font-light">
          {["accepted", "checked_in", "completed", "refunded", "cancel_requested", "disputed"].includes(b.status) ? <Link href={`/order/${b.id}/receipt`} className="tap min-h-11 flex items-center" style={{ color: GOLD }}>ใบเสร็จ / ใบกำกับภาษี ›</Link> : <span />}
          <Link href={`/report?booking=${b.id}`} className="tap min-h-11 flex items-center text-[#d9c9b4] hover:text-[#f3ead9]">รายงานผู้ใช้</Link>
        </div>
      </main>

      {primary && (
        <div className="fixed left-0 right-0 bottom-0 mx-auto max-w-[480px] z-40" style={{ padding: "12px 16px calc(18px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg, rgba(23,18,17,0), #171211 30%)" }}>
          <div className={rest.length ? "grid grid-cols-[1fr_auto] gap-2" : ""}>
            {btn(primary, true)}
            {rest.length > 0 && <button type="button" onClick={() => setSheet("more")} aria-haspopup="dialog" className="h-[52px] px-4 rounded-[14px] text-[14px] text-[#f3ead9] whitespace-nowrap" style={{ border: `1px solid ${LN}`, background: "#211a18" }}>เพิ่มเติม ⋯</button>}
          </div>
        </div>
      )}

      {sheet === "more" && <Sheet title="ตัวเลือกเพิ่มเติม" onClose={close}><div className="flex flex-col gap-2" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) close(); }}>{rest.map((a) => btn(a))}</div></Sheet>}

      {sheet === "cancel" && (
        <Sheet title={b.status === "requested" ? "ยกเลิกคำขอนี้?" : "ขอยกเลิกนัดที่ยืนยันแล้ว?"} onClose={close}>
          {/* ยอดคืนจริงตามกติกาก่อนกดยืนยัน */}
          <div className="rounded-2xl text-[14px]" style={{ padding: 14, border: `1px solid ${LN}`, background: "#251d1b" }}>
            {b.status === "requested" ? <>เพื่อนยังไม่ตอบรับ · คืน <b style={{ color: GOLD }}>{baht(b.total_satang)}</b> เข้ากระเป๋าทันที</>
              : pct != null ? <>ตามกติกา คืน <b style={{ color: GOLD }}>{pct}% = {baht(Math.round(b.total_satang * pct / 100))}</b> เข้ากระเป๋าทันที{pct < 100 ? <span className="block text-[12.5px] font-light text-[#d9c9b4] mt-1">ส่วนที่ไม่คืน {baht(b.total_satang - Math.round(b.total_satang * pct / 100))} โอนให้เพื่อนตามกติกายกเลิกช้า</span> : null}</>
              : <>ทีมงานพิจารณาตามกติกาและแจ้งยอดคืน<span className="block text-[12.5px] font-light text-[#d9c9b4] mt-1">{b.cancel_rule || "ยกเลิกได้ฟรีก่อนเพื่อนตอบรับ · หลังยืนยันแล้ว ทีมงานพิจารณาตามกรณี"}</span></>}
          </div>
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="เหตุผล (ไม่บังคับ)" aria-label="เหตุผลที่ยกเลิก" className="h-12 rounded-xl bg-[#251d1b] px-[14px] text-[16px] text-[#f3ead9] outline-none placeholder:text-[#b5a596]" />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={close} className="h-12 rounded-[14px] text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}>ไม่ยกเลิก</button>
            <button type="button" disabled={busy} onClick={doCancel} className="h-12 rounded-[14px] font-semibold text-[#ff8a9a] disabled:opacity-50" style={{ background: "rgba(201,40,61,.16)" }}>{busy ? "กำลังยกเลิก…" : "ยืนยันยกเลิก"}</button>
          </div>
        </Sheet>
      )}

      {sheet === "noshow" && ns && (
        <Sheet title={ns.counter ? "ส่งหลักฐานฝั่งคุณ" : "แจ้งเพื่อนไม่มาตามนัด"} onClose={close}>
          <p className="m-0 text-[13px] font-light text-[#d9c9b4]">ทีมงานเทียบหลักฐานสองฝ่าย (GPS ตอนเพื่อนมาถึง · แชทในแอป · รูป) ภายใน 24 ชม. · ถ้าเพื่อนไม่มาจริง คืนเงิน 100% · ระหว่างนี้เงินพักไว้</p>
          <textarea value={nsNote} onChange={(e) => setNsNote(e.target.value)} maxLength={500} rows={3} placeholder="เล่าสั้น ๆ เช่น รอที่หน้าร้านตั้งแต่ 19:00 ทักแชทแล้วไม่ตอบ" aria-label="รายละเอียด" className="rounded-xl bg-[#251d1b] p-[14px] text-[16px] text-[#f3ead9] outline-none resize-none placeholder:text-[#b5a596]" />
          <button type="button" onClick={getGps} className="min-h-12 rounded-xl text-[14px] text-left px-[14px]" style={{ border: `1px solid ${nsGps ? GOLD : LN}`, color: nsGps ? GOLD : "#f3ead9" }}>{nsGps ? `✓ แนบตำแหน่งแล้ว (±${Math.round(nsGps.accuracy)} ม.)` : "📍 แนบตำแหน่งของฉันตอนนี้"}</button>
          <label className="min-h-12 rounded-xl text-[14px] px-[14px] flex items-center gap-2 cursor-pointer" style={{ border: `1px solid ${nsPhoto ? GOLD : LN}`, color: nsPhoto ? GOLD : "#f3ead9" }}>
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(e) => setNsPhoto(e.target.files?.[0] ?? null)} />
            {nsPhoto ? `✓ แนบรูปแล้ว · ${nsPhoto.name.slice(0, 24)}` : "📷 แนบรูปจุดนัด (ไม่บังคับ)"}
          </label>
          {nsErr && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{nsErr}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={close} className="h-12 rounded-[14px] text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}>ยกเลิก</button>
            <button type="button" disabled={busy} onClick={sendNoShow} className="h-12 rounded-[14px] font-semibold text-[#1b130b] disabled:opacity-50" style={{ background: GOLD }}>{busy ? "กำลังส่ง…" : "ส่งเรื่อง"}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
