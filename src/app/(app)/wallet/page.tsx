"use client";
/* eslint-disable @next/next/no-img-element */

// กระเป๋าเงินลูกค้า — ยอดใช้ได้ / กันไว้ระหว่างรอตอบรับ · เติมเงิน QR พร้อมเพย์ + แนบสลิป (Slip2Go) · ประวัติรายการ
// ไม่มีบอร์ดเฉพาะ → ใช้องค์ประกอบบอร์ด C-Checkout (QR + สลิป) และ C-Escrow (เงินอยู่ตรงไหน)
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { TopBar } from "@/components/shell";
import { BANK } from "@/lib/join/config";
import { promptPayPayload } from "@/lib/join/promptpay";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });
const KIND: Record<string, string> = { topup: "เติมเงิน", hold: "กันเงินรอเพื่อนตอบรับ", confirm: "ชำระค่านัด", release: "คืนเงินที่กันไว้", refund: "คืนเงิน", adjust: "ปรับยอดโดยทีมงาน", reversal: "รายการกลับ", split: "สรุปยอดหลังจบนัด", promo: "รับเครดิตจากโค้ด", gift: "ซื้อบัตรของขวัญ", member: "เปิดเมมเบอร์ (รวมเครดิตโบนัส)" };
// หมายเหตุที่ลูกค้าเห็น: ตัดข้อมูลภายใน (ส่วนแบ่ง % ของเพื่อน ฯลฯ) เหลือรหัสนัด
const custNote = (k: string, n: string | null) => (n && (k === "split" || k === "refund") ? /BK-[A-Z0-9]+/.exec(n)?.[0] ?? null : n);
type H = { tx_id: number; kind: string; note: string | null; bucket: string; amount: number; created_at: string };
/** รวมขาของรายการบัญชีคู่ให้เหลือ 1 แถวต่อธุรกรรม — ลูกค้าเห็นเฉพาะยอดที่ใช้ได้เปลี่ยนเท่าไร (เงินกันไว้แสดงเป็นหมายเหตุ) */
function rowsOf(history: H[]) {
  const by = new Map<number, H[]>();
  for (const h of history) by.set(h.tx_id, [...(by.get(h.tx_id) ?? []), h]);
  return [...by.values()].map((legs) => {
    const avail = legs.filter((l) => l.bucket === "available").reduce((t, l) => t + l.amount, 0);
    const held = legs.filter((l) => l.bucket === "held").reduce((t, l) => t + l.amount, 0);
    const k = legs[0].kind;
    const label = k === "split" ? (avail > 0 ? "คืนเงินตามผลพิจารณา" : avail < 0 ? "ทิปให้เพื่อน" : "สรุปยอดหลังจบนัด") : KIND[k] ?? "รายการอื่น";
    return { ...legs[0], label, amount: avail, held };
  }).filter((r) => r.amount !== 0 || r.held !== 0);
}
const CHIPS = [500, 1000, 3000, 5000];
type W = { available: number; held: number; history: { tx_id: number; kind: string; note: string | null; bucket: string; amount: number; created_at: string }[]; topups: { id: string; amount_satang: number; status: string; reason: string | null; created_at: string }[] };

export default function WalletPage() {
  const [w, setW] = useState<W | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(1000);
  const [qr, setQr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/wallet", { cache: "no-store" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (d?.ok) setW(d); else setErr(d?.error || "โหลดไม่สำเร็จ");
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!open || amount < 100) return setQr("");
    const p = promptPayPayload(BANK.promptPayId, amount);
    if (p) QRCode.toDataURL(p, { margin: 1, width: 480, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(""));
  }, [open, amount]);

  const pick = (f?: File) => {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 5 * 1024 * 1024) return setMsg({ ok: false, t: "สลิปต้องเป็นรูป JPG/PNG/WEBP ไม่เกิน 5MB" });
    setMsg(null); setFile(f); setUrl((o) => { if (o) URL.revokeObjectURL(o); return URL.createObjectURL(f); });
  };
  const submit = async () => {
    if (!file) return setMsg({ ok: false, t: "กรุณาแนบสลิป" });
    setBusy(true); setMsg(null);
    const fd = new FormData(); fd.set("amount", String(amount)); fd.set("slip", file);
    const r = await fetch("/api/wallet/topup", { method: "POST", body: fd }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (!d?.ok) return setMsg({ ok: false, t: d?.error || "ส่งไม่สำเร็จ กรุณาลองใหม่" });
    setMsg({ ok: true, t: d.status === "credited" ? `เติมเงิน ${baht(amount * 100)} เข้ากระเป๋าแล้ว` : "ส่งสลิปแล้ว · ทีมงานตรวจภายใน 2 ชม. (09:00–22:00)" });
    setFile(null); setUrl(""); setOpen(false); load();
  };

  return (
    <div className="pb-6">
      <TopBar back="/profile" title="กระเป๋าเงิน" />
      <main className="flex flex-col gap-4" style={{ padding: "16px 16px 0" }}>
        {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}</p>}
        <section className="rounded-2xl flex flex-col gap-2" style={{ padding: 18, background: "linear-gradient(160deg, #3a2a15, #211a18 70%)", border: "1px solid rgba(232,196,114,.35)" }}>
          <span className="text-[13px] font-light text-[#d9c9b4]">ยอดใช้ได้</span>
          <span className="font-semibold text-[34px] leading-none tabular-nums" style={{ color: GOLD }}>{w ? baht(w.available) : "—"}</span>
          {w && w.held > 0 && <span className="text-[13px] font-light text-[#d9c9b4]">กันไว้ระหว่างรอเพื่อนตอบรับ {baht(w.held)}</span>}
          <button type="button" onClick={() => { setOpen(!open); setMsg(null); }} aria-expanded={open} className="mt-2 h-12 rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold">{open ? "ปิด" : "เติมเงิน"}</button>
        </section>
        {msg && <p role="status" className="m-0 rounded-xl text-[13px]" style={{ padding: "10px 14px", background: msg.ok ? "rgba(60,170,110,.14)" : "rgba(201,40,61,.16)", color: msg.ok ? "#7fd6a3" : "#ff8a9a" }}>{msg.t}</p>}

        {open && (
          <section className="flex flex-col gap-3 rounded-2xl bg-[#211a18]" style={{ padding: 16, border: `1px solid ${LN}` }}>
            <span className="text-[13px] font-light text-[#d9c9b4]">จำนวนเงิน</span>
            <div className="grid grid-cols-4 gap-2">
              {CHIPS.map((c) => <button key={c} type="button" onClick={() => setAmount(c)} aria-pressed={amount === c} className="min-h-10 rounded-full text-[13px] font-semibold" style={{ background: amount === c ? "rgba(232,196,114,0.14)" : "#251d1b", color: amount === c ? GOLD : "#f3ead9" }}>฿{c.toLocaleString()}</button>)}
            </div>
            <label className="flex items-center gap-2 h-12 rounded-xl bg-[#251d1b] px-[14px]">
              <span className="text-[#b5a596]">฿</span>
              <input inputMode="numeric" value={amount || ""} onChange={(e) => setAmount(Math.min(100000, Number(e.target.value.replace(/\D/g, "")) || 0))} aria-label="จำนวนเงิน (บาท)" className="flex-1 min-w-0 bg-transparent outline-none text-[16px] text-[#f3ead9]" />
            </label>
            {amount > 0 && amount < 100 && <span className="text-[12px] text-[#ff8a9a]">เติมขั้นต่ำ ฿100</span>}
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-[#251d1b]" style={{ padding: 16 }}>
              <div className="flex justify-between w-full text-[14px]"><span className="font-semibold" style={{ color: GOLD }}>PromptPay</span><span>ยอด <b style={{ color: GOLD }}>{baht(amount * 100)}</b></span></div>
              <div className="rounded-xl bg-white p-2">{qr ? <img src={qr} alt={`QR พร้อมเพย์ ยอด ${baht(amount * 100)}`} width={175} height={175} className="w-[175px] h-[175px] block" /> : <div className="w-[175px] h-[175px]" />}</div>
              <span className="text-[13px] font-light text-[#d9c9b4]">ชื่อบัญชี {BANK.accountName}</span>
            </div>
            <label className="rounded-2xl bg-[#251d1b] flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden text-center" style={{ padding: url ? 0 : 20, minHeight: 120 }}>
              {url ? <img src={url} alt="สลิปที่แนบ" className="w-full max-h-[360px] object-contain" /> : <><span className="text-[15px] font-semibold">แตะเพื่อแนบสลิป</span><span className="text-[13px] font-light text-[#d9c9b4]">โอนตามยอดแล้วแนบสลิป · ระบบตรวจอัตโนมัติ</span></>}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            <button type="button" onClick={submit} disabled={busy || amount < 100 || !file} className="h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold disabled:opacity-45">{busy ? "กำลังตรวจสลิป…" : "ส่งสลิปเติมเงิน"}</button>
          </section>
        )}

        {!!w?.topups.filter((t) => t.status !== "credited").length && (
          <section className="flex flex-col gap-2">
            <h2 className="m-0 text-[15px] font-semibold">คำขอเติมเงิน</h2>
            {w.topups.filter((t) => t.status !== "credited").map((t) => (
              <div key={t.id} className="flex justify-between items-center gap-3 rounded-2xl bg-[#211a18] text-[14px]" style={{ padding: "12px 14px" }}>
                <span className="flex flex-col"><span>{baht(t.amount_satang)}</span>{t.reason && <span className="text-[12px] font-light text-[#ff8a9a]">{t.reason}</span>}</span>
                <span className="text-[12px] font-semibold rounded-full" style={{ padding: "3px 10px", background: t.status === "pending" ? "rgba(232,196,114,0.14)" : "rgba(201,40,61,.16)", color: t.status === "pending" ? GOLD : "#ff8a9a" }}>{t.status === "pending" ? "รอตรวจ" : "ไม่ผ่าน"}</span>
              </div>
            ))}
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-[15px] font-semibold">ประวัติรายการ</h2>
          {!w ? <p className="m-0 text-[13px] font-light text-[#b5a596]">กำลังโหลด…</p> : !w.history.length ? (
            <div className="rounded-2xl bg-[#211a18] text-center text-[13px] font-light text-[#d9c9b4]" style={{ padding: 24 }}>ยังไม่มีรายการ · เติมเงินเพื่อเริ่มนัดเพื่อนได้เลย</div>
          ) : rowsOf(w.history).map((h) => (
            <div key={h.tx_id} className="flex justify-between items-center gap-3 rounded-2xl bg-[#211a18]" style={{ padding: "12px 14px" }}>
              <span className="flex flex-col min-w-0"><span className="text-[14px]">{h.label}</span><span className="text-[12px] font-light text-[#b5a596]">{new Date(h.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}{custNote(h.kind, h.note) ? ` · ${custNote(h.kind, h.note)}` : ""}</span></span>
              {h.amount !== 0
                ? <span className="shrink-0 font-semibold tabular-nums" style={{ color: h.amount > 0 ? "#7fd6a3" : "#f3ead9" }}>{h.amount > 0 ? "+" : "−"}{baht(Math.abs(h.amount))}</span>
                : <span className="shrink-0 flex flex-col items-end tabular-nums"><span className="font-semibold text-[#d9c9b4]">{baht(Math.abs(h.held))}</span><span className="text-[11.5px] font-light text-[#b5a596]">{h.held > 0 ? "กันไว้" : "จากยอดที่กันไว้"}</span></span>}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
