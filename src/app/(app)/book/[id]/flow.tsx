"use client";
/* eslint-disable @next/next/no-img-element */

// นัดเพื่อน 3 ขั้น — บอร์ด C-Booking (ระยะเวลา + สถานที่) → C-Schedule (วันเวลา + ฝากบอก) → C-Checkout (ยืนยัน + ชำระ)
// ชำระจากกระเป๋าเงิน · ยอดไม่พอ → สแกน QR เติมเฉพาะส่วนที่ขาด + แนบสลิป (Slip2Go ผ่าน = จองต่อทันที)
import { useEffect, useMemo, useState } from "react";
import { PinPicker } from "@/components/pin-picker";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { BANK } from "@/lib/join/config";
import { promptPayPayload } from "@/lib/join/promptpay";
import { clearPlace, readPlace } from "@/lib/market/place-pick";
import { CONTACT_MSG, hasContact } from "@/lib/join/contact-guard";

// จำรายละเอียดนัดไว้ (เครื่องนี้ · 24 ชม.) — เติมเงินรอตรวจสลิปแล้วกลับมาจองต่อได้ไม่ต้องกรอกใหม่
type Draft = { h: 3 | 5; place: PlaceType; detail: string; pin: { lat: number; lng: number } | null; spa: string; svc: string; date: string; slot: number | null; note: string; at: number; topup?: boolean };
const draftKey = (pid: string) => `mb_book_draft:${pid}`;
const readDraft = (pid: string): Draft | null => { try { const d = JSON.parse(localStorage.getItem(draftKey(pid)) ?? "null") as Draft | null; return d && Date.now() - d.at < 24 * 3600_000 ? d : null; } catch { return null; } };
const writeDraft = (pid: string, d: Draft) => { try { localStorage.setItem(draftKey(pid), JSON.stringify(d)); } catch {} };
const dropDraft = (pid: string) => { try { localStorage.removeItem(draftKey(pid)); } catch {} };

export type Avail = Record<number, [number, number]>;
type P = { id: string; nick: string; img: string; pos: string | null; area: string; rating: string };
type Spa = { id: string; name: string; area: string; label?: string; img?: string | null; logo?: { src: string; pos: string; zoom: number } | null; sample?: boolean; services: { id: string; name: string; minutes: number; price: number }[] };
type PlaceType = "out" | "outdoor" | "mall" | "cafe" | "condo" | "hotel" | "spa";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const LN2 = "rgba(232,196,114,0.14)";
const baht = (n: number) => "฿" + n.toLocaleString("en-US");
const PL: [PlaceType, string, string, string][] = [
  ["out", "นอกสถานที่", "ทริป · ไปด้วยกัน", "จุดนัดรับ เช่น BTS ทองหล่อ"], ["outdoor", "กลางแจ้ง", "สวน · ริมน้ำ", "เช่น สวนเบญจกิติ ประตู 1"],
  ["mall", "ห้าง", "ห้างสรรพสินค้า", "เช่น EmQuartier ชั้น G"], ["cafe", "คาเฟ่ / ร้านอาหาร", "ร้านที่คุณเลือก", "ชื่อร้าน / สาขา"],
  ["condo", "คอนโด", "ที่พักของฉัน", "ชื่ออาคาร / เลขห้อง"], ["hotel", "โรงแรม", "ห้องพัก / ล็อบบี้", "ชื่อโรงแรม / เลขห้อง"], ["spa", "สปา", "สถานที่พาร์ทเนอร์", ""],
];
const WD = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const MONTH = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const pad = (h: number) => String(h % 24).padStart(2, "0") + ":00";
const Back = ({ onClick, href }: { onClick?: () => void; href?: string }) => {
  const cls = "w-11 h-11 shrink-0 rounded-full grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]";
  const ic = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>;
  return href ? <Link href={href} aria-label="ย้อนกลับ" className={cls} style={{ border: `1px solid ${LN}` }}>{ic}</Link> : <button type="button" onClick={onClick} aria-label="ย้อนกลับ" className={cls} style={{ border: `1px solid ${LN}` }}>{ic}</button>;
};

export function BookFlow({ p, price, avail, busy: taken = [], spas, initialSpa, saved = [] }: { p: P; price: Record<3 | 5, number>; avail: Avail; busy?: { s: number; h: number }[]; spas: Spa[]; initialSpa?: string; saved?: { id: string; label: string; detail: string; note: string; primary: boolean }[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [h, setH] = useState<3 | 5>(3);
  // มาจากปุ่ม "นัดเพื่อนที่นี่" ของหน้าสปา (?spa= หรือสถานที่ที่บันทึกไว้) → เปิดมาเป็นสปานั้นเลย
  const pre = initialSpa && spas.some((s) => s.id === initialSpa) ? initialSpa : "";
  const [place, setPlace] = useState<PlaceType>(pre ? "spa" : "cafe");
  const [detail, setDetail] = useState("");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [spa, setSpa] = useState(pre || spas[0]?.id || "");
  const [svc, setSvc] = useState("");
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [safe, setSafe] = useState(false);
  const [wallet, setWallet] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qr, setQr] = useState("");
  const [slip, setSlip] = useState<File | null>(null);
  const [slipMsg, setSlipMsg] = useState("");
  // ส่งสลิปเติมเงินแล้ว รอทีมงานตรวจ — ห้ามส่งซ้ำ (กันเติมซ้ำจากสลิปเดียว) · ระหว่างรอเช็กยอดเป็นระยะ เข้ากระเป๋าแล้วจองให้อัตโนมัติ
  const [topupPending, setTopupPending] = useState(false);
  const [noteErr, setNoteErr] = useState("");

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; }), []);
  const spaObj = spas.find((s) => s.id === spa);
  // บริการ/ห้องที่เลือก — สปาที่มีบริการเดียวเลือกให้เลย · ราคาจริงคิดฝั่งเซิร์ฟเวอร์อีกครั้ง
  const svcObj = spaObj?.services.find((x) => x.id === svc) ?? (spaObj?.services.length === 1 ? spaObj.services[0] : undefined);
  const roomFee = place === "spa" ? svcObj?.price ?? 0 : 0;
  const total = price[h] + roomFee;
  const meta = PL.find((x) => x[0] === place)!;
  const d0 = days[day];
  const win = avail[d0.getDay()];
  const slots = Array.from({ length: 14 }, (_, k) => 10 + k).map((hh) => {
    const at = new Date(d0); at.setHours(hh);
    const ok = !!win && hh >= win[0] && hh + h <= Math.max(win[1], win[0] + 1) && at.getTime() > Date.now() + 60 * 60_000
      && !taken.some((b) => Math.abs(b.s - at.getTime()) < Math.max(b.h, h) * 3600_000);
    return { hh, ok };
  });
  const starts = slot != null ? (() => { const at = new Date(d0); at.setHours(slot); return at; })() : null;
  const dayLabel = `${WD[d0.getDay()]} ${d0.getDate()} ${MONTH[d0.getMonth()].slice(0, 3)}.`;
  const short = wallet != null ? Math.max(0, total * 100 - wallet) : 0;
  const shortBaht = Math.ceil(short / 100);
  // วันแรกที่เพื่อนรับงานจริง (และยังมีช่วงเวลาที่จองได้) — เปิดหน้าเลือกเวลาที่วันนั้น ไม่ใช่วันนี้เสมอ
  const firstOpenDay = () => {
    for (let i = 0; i < days.length; i++) {
      const w = avail[days[i].getDay()];
      if (!w) continue;
      for (let hh = 10; hh < 24; hh++) { const at = new Date(days[i]); at.setHours(hh); if (hh >= w[0] && hh + h <= Math.max(w[1], w[0] + 1) && at.getTime() > Date.now() + 60 * 60_000 && !taken.some((b) => Math.abs(b.s - at.getTime()) < Math.max(b.h, h) * 3600_000)) return i; }
    }
    return 0;
  };
  const goStep2 = () => { if (slot == null && !avail[days[day].getDay()]) setDay(firstOpenDay()); else if (slot == null) { const f = firstOpenDay(); if (f > day) setDay(f); } setStep(2); };
  const goStep3 = () => {
    if (note && hasContact(note)) return setNoteErr(`ข้อความฝากถึงเพื่อน${CONTACT_MSG}`);
    setNoteErr(""); setStep(3);
  };
  const step1ok = place === "spa" ? !!spaObj && (!spaObj.services.length || !!svcObj) : detail.trim().length >= 2 && !!pin;
  useEffect(() => {
    // มีนัดที่กรอกค้างไว้ (เช่น รอตรวจสลิปเติมเงิน) → เติมกลับให้ แล้วไปขั้นชำระถ้าเวลายังว่าง
    const dr = readDraft(p.id);
    if (dr && !pre) {
      setH(dr.h); setPlace(dr.place); setDetail(dr.detail); setPin(dr.pin); if (dr.spa) setSpa(dr.spa); setSvc(dr.svc); setNote(dr.note);
      const di = days.findIndex((d) => d.toISOString() === dr.date);
      if (di >= 0) { setDay(di); if (dr.slot != null) { setSlot(dr.slot); setStep(3); } }
      if (dr.topup) setTopupPending(true);
      return;
    }
    // ไม่มี ?spa= แต่เพิ่งกด "นัดเพื่อนที่นี่" (sessionStorage) → เลือกสปานั้น
    if (pre) return clearPlace();
    const pk = readPlace();
    if (pk?.kind === "spa" && spas.some((s) => s.id === pk.id)) { setPlace("spa"); setSpa(pk.id); clearPlace(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step !== 3) return;
    fetch("/api/wallet", { cache: "no-store" }).then((r) => r.json()).then((d) => setWallet(d?.ok ? d.available : 0)).catch(() => setWallet(0));
  }, [step]);
  useEffect(() => {
    if (!shortBaht || step !== 3) return setQr("");
    const pl = promptPayPayload(BANK.promptPayId, Math.max(100, shortBaht));
    if (pl) QRCode.toDataURL(pl, { margin: 1, width: 440, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(""));
  }, [shortBaht, step]);
  useEffect(() => { if (slot != null && !slots.find((s) => s.hh === slot)?.ok) setSlot(null); }, [day, h]); // eslint-disable-line react-hooks/exhaustive-deps
  // บันทึกร่างนัดทุกครั้งที่เปลี่ยน (เฉพาะเครื่องนี้)
  useEffect(() => {
    if (step === 1 && slot == null && !topupPending) return;
    writeDraft(p.id, { h, place, detail, pin, spa, svc, date: days[day].toISOString(), slot, note, at: Date.now(), topup: topupPending });
  }, [h, place, detail, pin, spa, svc, day, slot, note, step, topupPending]); // eslint-disable-line react-hooks/exhaustive-deps
  // รอตรวจสลิป: เช็กยอดกระเป๋าทุก 20 วิ — พอเงินเข้าแล้วจองให้ทันที
  useEffect(() => {
    if (!topupPending || step !== 3 || !starts) return;
    const t = setInterval(() => {
      fetch("/api/wallet", { cache: "no-store" }).then((r) => r.json()).then((d) => {
        if (!d?.ok) return;
        setWallet(d.available);
        if (d.available >= total * 100) { clearInterval(t); setTopupPending(false); setSlipMsg("เงินเข้ากระเป๋าแล้ว · กำลังจองให้…"); void book(); }
      }).catch(() => {});
    }, 20_000);
    return () => clearInterval(t);
  }, [topupPending, step, total]); // eslint-disable-line react-hooks/exhaustive-deps

  const book = async () => {
    setBusy(true); setError("");
    const r = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pid: p.id, hours: h, starts_at: starts!.toISOString(), place: { type: place, detail, spa_id: spa, service_id: svcObj?.id, ...(place !== "spa" && pin ? pin : {}) }, note }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (d?.ok) { dropDraft(p.id); return router.push(`/book/success?id=${d.id}`); }
    if (d?.code === "funds") { setWallet(d.available ?? 0); return setError("ยอดในกระเป๋าไม่พอ · เติมส่วนที่ขาดด้านล่าง"); }
    setError(d?.error || "จองไม่สำเร็จ กรุณาลองใหม่");
  };
  const topupAndBook = async () => {
    if (busy || topupPending) return;
    if (!slip) return setSlipMsg("แนบสลิปก่อนนะคะ");
    setBusy(true); setSlipMsg("");
    const fd = new FormData(); fd.set("amount", String(Math.max(100, shortBaht))); fd.set("slip", slip);
    const r = await fetch("/api/wallet/topup", { method: "POST", body: fd }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (!d?.ok) return setSlipMsg(d?.error || "ส่งสลิปไม่สำเร็จ");
    if (d.status === "credited") { setSlip(null); return book(); }
    setSlip(null);
    setTopupPending(true);
    setSlipMsg("รอทีมงานตรวจสลิป · เราจะแจ้งเมื่อจองสำเร็จ (เปิดหน้านี้ไว้ได้ ระบบจองให้อัตโนมัติเมื่อเงินเข้า · ปิดไปแล้วกลับมาหน้านี้ ข้อมูลนัดยังอยู่)");
  };

  const bar = (summary: string, cta: React.ReactNode) => (
    <div className="fixed left-0 right-0 bottom-0 z-40 mx-auto max-w-[480px] flex items-center justify-between gap-3" style={{ padding: "12px 18px calc(18px + env(safe-area-inset-bottom))", background: "rgba(23,18,17,.97)", borderTop: `1px solid ${LN}` }}>
      <div className="min-w-0"><div className="text-[12px] font-light text-[#d9c9b4] truncate">{summary}</div><div className="font-bold text-[22px]" style={{ color: GOLD }}>{baht(total)}</div></div>
      {cta}
    </div>
  );
  const ctaCls = "h-[52px] shrink-0 rounded-full bg-[#e8c472] text-[#1b130b] font-semibold disabled:opacity-40";

  return (
    <div className="min-h-dvh flex flex-col pb-[110px]" style={{ background: "#171211" }}>
      <div className="flex items-center gap-3" style={{ padding: "14px 18px 10px" }}>
        {step === 1 ? <Back href={`/p/${p.id}`} /> : <Back onClick={() => { setStep((step - 1) as 1 | 2); setError(""); }} />}
        <div className="font-semibold text-[18px]">{step === 1 ? "นัดเพื่อน" : step === 2 ? "เลือกวันเวลาและสถานที่" : "ยืนยันและชำระเงิน"}</div>
        {step === 2 && <img src={p.img} alt={p.nick} className="ml-auto w-[38px] h-[38px] rounded-full object-cover" style={{ border: `1px solid ${GOLD}`, objectPosition: p.pos ?? undefined }} />}
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center text-[12px] font-light" style={{ padding: "0 18px" }}>
        {["1 · บริการ", "2 · วันเวลา", "3 · ยืนยันและชำระ"].map((l, i) => <div key={l} className="pb-2" style={{ borderBottom: `2px solid ${i < step ? GOLD : LN}`, color: i + 1 === step ? "#f3ead9" : i < step ? GOLD : "#b5a596", fontWeight: i + 1 === step ? 600 : 300 }}>{l}</div>)}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-[14px]" style={{ padding: "16px 18px 0" }}>
          <div className="flex items-center gap-3 rounded-2xl bg-[#211a18]" style={{ padding: 10, border: `1px solid ${LN}` }}>
            <img src={p.img} alt={p.nick} className="w-[50px] h-[50px] rounded-[14px] object-cover" style={{ objectPosition: p.pos ?? undefined }} />
            <div className="flex-1"><div className="font-semibold text-[16px]">{p.nick} <span className="text-[12px] font-light" style={{ color: GOLD }}>★ {p.rating}</span></div><div className="text-[12px] font-light text-[#d9c9b4]">{p.area}</div></div>
          </div>
          <h2 className="m-0 font-semibold text-[17px]">ระยะเวลา</h2>
          <div className="grid grid-cols-2 gap-[10px]">
            {([3, 5] as const).map((x) => (
              <button key={x} type="button" onClick={() => setH(x)} aria-pressed={h === x} className="rounded-2xl text-center text-[#f3ead9]" style={{ padding: "14px 10px", border: `1.5px solid ${h === x ? GOLD : LN2}`, background: h === x ? "rgba(232,196,114,0.16)" : "#211a18" }}>
                <span className="block text-[12.5px] font-light text-[#d9c9b4]">นัด {x} ชม.</span><span className="block font-bold text-[22px]" style={{ color: h === x ? GOLD : "#f3ead9" }}>{baht(price[x])}</span>
              </button>
            ))}
          </div>
          <h2 className="m-0 mt-1 font-semibold text-[17px]">เจอกันที่ไหนดี</h2>
          <div className="grid grid-cols-2 gap-2">
            {PL.map(([id, label, sub]) => (
              <button key={id} type="button" onClick={() => setPlace(id)} aria-pressed={place === id} className="rounded-[14px] text-left text-[#f3ead9]" style={{ padding: "11px 12px", border: `1.5px solid ${place === id ? GOLD : LN2}`, background: place === id ? "rgba(232,196,114,0.14)" : "#211a18" }}>
                <span className="block font-semibold text-[13.5px]">{label}</span><span className="block text-[12px] font-light text-[#d9c9b4]">{sub}</span>
              </button>
            ))}
          </div>
          {place === "spa" ? (
            <div className="flex flex-col gap-2">
              <div className="text-[12px] font-light text-[#d9c9b4]">เลือกสปา / สถานที่พาร์ทเนอร์</div>
              {!spas.length && <p className="m-0 text-[13px] text-[#d9c9b4]">ยังไม่มีสปาพาร์ทเนอร์ที่เปิดรับจอง · เลือกสถานที่อื่นได้</p>}
              {spas.map((s) => {
                const on = spa === s.id;
                const from = s.services.length ? Math.min(...s.services.map((x) => x.price)) : 0;
                return (
                  <div key={s.id} className="rounded-2xl bg-[#211a18]" style={{ border: `1.5px solid ${on ? GOLD : LN2}` }}>
                    <button type="button" onClick={() => { setSpa(s.id); setSvc(""); }} aria-pressed={on} className="w-full flex gap-3 items-center text-left text-[#f3ead9]" style={{ padding: 10 }}>
                      {s.logo
                        ? <span className="relative w-[58px] h-[58px] shrink-0 rounded-xl overflow-hidden bg-[#251d1b]"><img src={s.logo.src} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: s.logo.pos, transform: `scale(${s.logo.zoom})`, transformOrigin: s.logo.pos }} /></span>
                        : <img src={s.img || "/brand/venue.jpg"} alt="" className="w-[58px] h-[58px] shrink-0 rounded-xl object-cover" />}
                      <span className="flex-1 min-w-0"><span className="block font-semibold text-[14px] truncate">{s.name}</span><span className="block text-[12px] font-light text-[#d9c9b4] truncate">{[s.label && s.label !== "สปา" ? s.label : "", s.area].filter(Boolean).join(" · ")}</span></span>
                      {from > 0 && <span className="text-[12px] font-light shrink-0" style={{ color: GOLD }}>เริ่ม {baht(from)}</span>}
                    </button>
                    {on && s.services.length > 0 && (
                      <div className="flex flex-col gap-1.5" style={{ padding: "0 10px 10px" }} role="radiogroup" aria-label="เลือกบริการ / ห้อง">
                        <span className="text-[12px] font-light text-[#d9c9b4]">เลือกบริการ / ห้อง (ค่าห้องจ่ายรวมในยอดนี้)</span>
                        {s.services.map((x) => {
                          const pick = svcObj?.id === x.id;
                          return (
                            <button key={x.id} type="button" role="radio" aria-checked={pick} onClick={() => setSvc(x.id)} className="min-h-11 flex items-center justify-between gap-2 rounded-xl text-left text-[13px] text-[#f3ead9]" style={{ padding: "8px 12px", border: `1px solid ${pick ? GOLD : LN}`, background: pick ? "rgba(232,196,114,0.14)" : "#171211" }}>
                              <span className="min-w-0">{x.name}{x.minutes > 0 && <span className="text-[12px] text-[#b5a596]"> · {x.minutes} นาที</span>}</span>
                              <span className="shrink-0 font-semibold" style={{ color: GOLD }}>+{baht(x.price)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {spaObj && spaObj.services.length > 1 && !svcObj && <span className="text-[12px] text-[#ff8a9a]">เลือกบริการ / ห้องของสปาก่อนไปต่อ</span>}
            </div>
          ) : (
            <><label className="flex flex-col gap-[5px] text-[12px] font-light text-[#d9c9b4]">{place === "condo" || place === "hotel" ? "ชื่ออาคาร / ห้อง" : `จุดนัดพบ (${meta[1]})`}
              <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={meta[3]} maxLength={200} className="h-[46px] rounded-[14px] bg-[#211a18] px-[14px] text-[16px] text-[#f3ead9] outline-none placeholder:text-[#b5a596]" style={{ border: `1px solid ${LN}` }} />
              {!!saved.length && (
                <span className="flex flex-wrap gap-1.5 pt-1" aria-label="ที่อยู่ที่บันทึก">
                  {saved.map((a) => { const v = [a.detail, a.note].filter(Boolean).join(" · ").slice(0, 200); return <button key={a.id} type="button" onClick={() => setDetail(v)} className="h-8 px-3 rounded-full text-[12.5px]" style={{ border: `1px solid ${detail === v ? GOLD : LN}`, color: detail === v ? GOLD : "#d9c9b4", background: "#211a18" }}>📍 {a.label}</button>; })}
                </span>
              )}
            </label>
            <div className="flex flex-col gap-[5px]">
              <span className="text-[12px] font-light text-[#d9c9b4]">ปักหมุดจุดนัด <span className="text-[#b5a596]">· ใช้บอกเวลาถึงตอนเพื่อนเดินทาง และให้เพื่อนนำทางมาถูกที่</span></span>
              <PinPicker value={pin} onChange={(v) => setPin(v)} height={200} hint={pin ? "เลื่อนแผนที่เพื่อปรับหมุดได้" : ""} />
              {!pin && <span className="text-[12px] text-[#ff8a9a]">เลื่อนแผนที่หรือกด "ใช้ตำแหน่งฉัน" เพื่อปักหมุดก่อนไปต่อ</span>}
            </div></>
          )}
          {bar(`${h} ชม. · ${place === "spa" ? [spaObj?.name ?? "สปา", svcObj?.name].filter(Boolean).join(" · ") : meta[1]}`, <button type="button" disabled={!step1ok} onClick={goStep2} className={ctaCls} style={{ padding: "0 28px" }}>ถัดไป</button>)}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5" style={{ padding: "16px 16px 0" }}>
          <div>
            <div className="flex justify-between items-baseline"><span className="text-[16px] font-medium">วันที่</span><span className="text-[13px] font-light" style={{ color: GOLD }}>{MONTH[d0.getMonth()]} {d0.getFullYear() + 543}</span></div>
            <div className="flex gap-2 mt-[10px] overflow-x-auto pb-1 no-scrollbar">
              {days.map((d, i) => {
                const on = day === i, off = !avail[d.getDay()];
                return <button key={i} type="button" onClick={() => setDay(i)} aria-pressed={on} className="shrink-0 w-14 h-[72px] rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[12px] font-light" style={{ border: `1px solid ${on ? "#f3ead9" : LN}`, background: on ? "#f3ead9" : "#211a18", color: on ? "#171211" : "#d9c9b4", opacity: off ? 0.4 : 1 }}><span>{WD[d.getDay()]}</span><b className="text-[20px] font-semibold">{d.getDate()}</b></button>;
              })}
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center"><span className="text-[16px] font-medium">เวลาที่{p.nick}ว่าง</span>
              <span className="flex gap-1 p-[3px] rounded-xl bg-[#211a18]" style={{ border: `1px solid ${LN}` }}>{([3, 5] as const).map((x) => <button key={x} type="button" onClick={() => setH(x)} className="h-[30px] px-3 rounded-[9px] text-[12.5px] font-semibold" style={{ background: h === x ? GOLD : "transparent", color: h === x ? "#171211" : "#d9c9b4" }}>{x} ชม.</button>)}</span>
            </div>
            {!win ? <p className="mt-3 mb-0 text-[13px] font-light text-[#ff8a97]">{p.nick}ไม่รับงานวันนี้ · ลองเลือกวันอื่น</p> : (
              <div className="grid grid-cols-4 gap-2 mt-[10px]">
                {slots.map(({ hh, ok }) => {
                  const on = slot === hh;
                  return <button key={hh} type="button" disabled={!ok} onClick={() => setSlot(hh)} aria-pressed={on} className="h-11 rounded-xl text-[13.5px] flex flex-col items-center justify-center leading-tight" style={{ border: `1px solid ${on ? GOLD : LN}`, background: on ? "rgba(232,196,114,.14)" : "#211a18", color: on ? GOLD : "#f3ead9", opacity: ok ? 1 : 0.35, textDecoration: ok ? "none" : "line-through" }}>{pad(hh)}</button>;
                })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-[#211a18]" style={{ padding: 14, border: `1px solid ${GOLD}` }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
            <div className="flex-1 min-w-0"><b className="font-medium">{place === "spa" ? spaObj?.name : meta[1]}</b><div className="text-[12px] font-light text-[#d9c9b4] truncate">{place === "spa" ? spaObj?.area : detail}</div></div>
            <button type="button" onClick={() => setStep(1)} className="text-[13px] font-light" style={{ color: GOLD }}>เปลี่ยน</button>
          </div>
          <label className="flex flex-col gap-1.5"><span className="text-[13px] font-light text-[#d9c9b4]">ฝากบอก{p.nick}</span>
            <input value={note} onChange={(e) => { setNote(e.target.value); if (noteErr) setNoteErr(""); }} aria-invalid={!!noteErr} maxLength={300} placeholder="เช่น มีที่จอดรถใต้ตึก อยากลองร้านญี่ปุ่น" className="h-12 rounded-[14px] bg-[#211a18] px-[14px] text-[16px] text-[#f3ead9] outline-none placeholder:text-[#b5a596]" style={{ border: `1px solid ${LN}` }} />
          </label>
          {noteErr && <p role="alert" className="m-0 -mt-3 text-[12.5px] text-[#ff8a9a]">{noteErr}</p>}
          {bar(starts ? `${dayLabel} · ${pad(slot!)}–${pad(slot! + h)} (${h} ชม.)` : `${dayLabel} · เลือกเวลาก่อน`, <button type="button" disabled={slot == null} onClick={goStep3} className={ctaCls} style={{ width: 160 }}>ไปชำระเงิน</button>)}
        </div>
      )}

      {step === 3 && starts && (
        <div className="flex flex-col gap-[14px]" style={{ padding: "16px 18px 0" }}>
          <div className="flex flex-col gap-2 rounded-2xl bg-[#211a18] text-[13.5px]" style={{ padding: 14, border: `1px solid ${LN}` }}>
            <div className="flex justify-between items-center"><span className="font-semibold text-[15px]">นัดกับ{p.nick}</span><button type="button" onClick={() => setStep(2)} className="text-[12.5px] font-light" style={{ color: GOLD }}>แก้ไข</button></div>
            <div className="flex justify-between gap-3"><span className="text-[#d9c9b4]">วันเวลา</span><span className="text-right">{dayLabel} · {pad(slot!)} ({h} ชม.)</span></div>
            <div className="flex justify-between gap-3"><span className="text-[#d9c9b4]">สถานที่</span><span className="text-right">{place === "spa" ? spaObj?.name : `${meta[1]} ${detail}`}</span></div>
            {place === "spa" && svcObj && <div className="flex justify-between gap-3"><span className="text-[#d9c9b4]">บริการที่สปา</span><span className="text-right">{svcObj.name}{svcObj.minutes > 0 ? ` · ${svcObj.minutes} นาที` : ""}</span></div>}
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-[#211a18] text-[13.5px] tabular-nums" style={{ padding: 14, border: `1px solid ${LN}` }}>
            <div className="flex justify-between"><span className="text-[#d9c9b4]">ค่าบริการ {h} ชม.</span><span>{baht(price[h])}</span></div>
            {place === "spa" && svcObj && <div className="flex justify-between gap-3"><span className="text-[#d9c9b4] min-w-0">ค่าห้อง/บริการ · {svcObj.name}</span><span className="shrink-0">{baht(roomFee)}</span></div>}
            <div className="h-px" style={{ background: LN2 }} />
            <div className="flex justify-between items-center"><span className="font-semibold">ชำระเต็มจำนวน</span><span className="font-bold text-[24px]" style={{ color: GOLD }}>{baht(total)}</span></div>
            <div className="text-[12px] font-light text-[#d9c9b4]">ไม่มีมัดจำ เงินพักไว้กับเราจนจบนัด แล้วจึงโอนให้เพื่อน · ถ้าเพื่อนไม่ตอบรับใน 30 นาที คืนเข้ากระเป๋าอัตโนมัติ</div>
          </div>
          <h2 className="m-0 font-semibold text-[17px]">วิธีชำระเงิน</h2>
          <div className="flex justify-between items-center rounded-[14px] text-[13.5px]" style={{ padding: "13px 14px", border: `1.5px solid ${GOLD}`, background: "rgba(232,196,114,0.16)" }}>
            <span className="flex items-center gap-[10px]"><span className="w-4 h-4 rounded-full" style={{ border: `2px solid ${GOLD}`, background: GOLD }} />กระเป๋าเงิน</span>
            <span className="text-[12px] font-light text-[#b5a596]">{wallet == null ? "กำลังโหลด…" : `ยอดใช้ได้ ${baht(Math.floor(wallet / 100))}`}</span>
          </div>
          {wallet != null && short > 0 && !topupPending && (
            <div className="flex flex-col items-center gap-[10px] rounded-2xl bg-[#211a18]" style={{ padding: 14, border: `1px solid ${LN}` }}>
              <span className="text-[13px] text-center">ยอดไม่พอ · สแกนพร้อมเพย์เติม <b style={{ color: GOLD }}>{baht(Math.max(100, shortBaht))}</b> แล้วแนบสลิป</span>
              <div className="w-[200px] rounded-[18px] bg-white text-[#1b130b] overflow-hidden text-center">
                <div className="text-[12px] font-semibold text-white py-[7px]" style={{ background: "#113566" }}>THAI QR PAYMENT · พร้อมเพย์</div>
                {qr ? <img src={qr} alt="QR พร้อมเพย์" className="w-[150px] h-[150px] mx-auto mt-2 block" /> : <div className="w-[150px] h-[150px] mx-auto mt-2" />}
                <div className="text-[12px] font-light">{BANK.accountName}</div>
                <div className="font-bold text-[18px] pb-[10px]">{baht(Math.max(100, shortBaht))}.00</div>
              </div>
              <label className="self-stretch h-[50px] rounded-[14px] grid place-items-center font-semibold text-[14px] cursor-pointer" style={{ border: `1px dashed ${GOLD}`, color: GOLD, background: slip ? "rgba(74,222,128,.08)" : "transparent" }}>
                {slip ? `แนบสลิปแล้ว ✓ (${slip.name.slice(0, 18)})` : "อัปโหลดสลิปการโอน"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { setSlip(e.target.files?.[0] ?? null); setSlipMsg(""); }} />
              </label>
              {slipMsg && <p role="status" className="m-0 text-[12.5px] text-center" style={{ color: /ส่งสลิปแล้ว/.test(slipMsg) ? GOLD : "#ff8a9a" }}>{slipMsg}</p>}
            </div>
          )}
          {topupPending && <p role="status" className="m-0 rounded-2xl text-[13px] text-center" style={{ padding: 14, background: "#211a18", border: `1px solid ${GOLD}`, color: GOLD }}>{slipMsg || "รอทีมงานตรวจสลิป · เราจะแจ้งเมื่อจองสำเร็จ"}</p>}
          <button type="button" onClick={() => setSafe(!safe)} aria-pressed={safe} className="flex gap-[10px] rounded-[14px] text-left text-[12px] leading-[1.55] font-light text-[#d9c9b4]" style={{ padding: 12, border: "1px solid rgba(232,196,114,0.55)", background: "rgba(232,196,114,0.14)" }}>
            <span className="shrink-0 w-5 h-5 rounded-md grid place-items-center text-[12px] font-bold text-[#1b130b]" style={{ border: `1.5px solid ${GOLD}`, background: safe ? GOLD : "transparent" }}>{safe ? "✓" : ""}</span>
            <span>ฉันรับทราบข้อตกลงความปลอดภัย: หากนัดในที่ส่วนตัว ฉันจะดูแลความปลอดภัยของตัวเองด้วย บริษัทเป็นตัวกลาง และไม่มีบริการทางเพศทุกกรณี</span>
          </button>
          {error && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{error}</p>}
          <div className="fixed left-0 right-0 bottom-0 z-40 mx-auto max-w-[480px]" style={{ padding: "12px 18px calc(18px + env(safe-area-inset-bottom))", background: "rgba(23,18,17,.97)", borderTop: `1px solid ${LN}` }}>
            {short > 0
              ? topupPending
                ? <button type="button" disabled className="w-full h-[54px] rounded-full bg-[#211a18] text-[#e8c472] font-semibold text-[14px]" style={{ border: `1px solid ${GOLD}` }}>รอทีมงานตรวจสลิป · เราจะแจ้งเมื่อจองสำเร็จ</button>
                : <button type="button" disabled={!safe || !slip || busy} onClick={topupAndBook} className="w-full h-[54px] rounded-full bg-[#e8c472] text-[#1b130b] font-semibold text-[15px] disabled:opacity-45">{busy ? "กำลังตรวจสลิป…" : !slip ? `สแกนจ่าย ${baht(Math.max(100, shortBaht))} แล้วแนบสลิป` : !safe ? "ติ๊กรับทราบเงื่อนไขก่อนนะคะ" : `ยืนยันการชำระ ${baht(total)}`}</button>
              : <button type="button" disabled={!safe || busy || wallet == null} onClick={book} className="w-full h-[54px] rounded-full bg-[#e8c472] text-[#1b130b] font-semibold text-[15px] disabled:opacity-45">{busy ? "กำลังส่งคำขอ…" : !safe ? "ติ๊กรับทราบเงื่อนไขก่อนนะคะ" : `ยืนยันการชำระ ${baht(total)}`}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
