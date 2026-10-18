"use client";
/* eslint-disable @next/next/no-img-element */

// กระเป๋าเงินลูกค้า — ยอดใช้ได้ / กันไว้ระหว่างรอตอบรับ · เติมเงิน QR พร้อมเพย์ + แนบสลิป (Slip2Go) · ประวัติรายการ
// ไม่มีบอร์ดเฉพาะ → ใช้องค์ประกอบบอร์ด C-Checkout (QR + สลิป) และ C-Escrow (เงินอยู่ตรงไหน)
// ถอนเงินเข้าบัญชี: ยอดถอนได้ = ยอดใช้ได้ − เครดิตโบนัส/โค้ด · ยืนยันในแผ่นล่างก่อนส่ง → ทีมงานอนุมัติแล้วโอน
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { TopBar } from "@/components/shell";
import { BANK } from "@/lib/join/config";
import { promptPayPayload } from "@/lib/join/promptpay";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });
const KIND: Record<string, string> = { payout: "ถอนเงินเข้าบัญชี", topup: "เติมเงิน", hold: "กันเงินรอเพื่อนตอบรับ", confirm: "ชำระค่านัด", release: "คืนเงินที่กันไว้", refund: "คืนเงิน", adjust: "ปรับยอดโดยทีมงาน", reversal: "รายการกลับ", split: "สรุปยอดหลังจบนัด", promo: "รับเครดิตจากโค้ด", gift: "ซื้อบัตรของขวัญ", member: "เปิดเมมเบอร์ (รวมเครดิตโบนัส)" };
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
    const label = k === "split" ? (avail > 0 ? "คืนเงินตามผลพิจารณา" : avail < 0 ? "ทิปให้เพื่อน" : "สรุปยอดหลังจบนัด")
      : k === "payout" ? (avail < 0 ? "ขอถอนเงินเข้าบัญชี" : "คืนยอดถอนเข้ากระเป๋า") : k === "market_sale" ? (avail < 0 ? "ซื้อสินค้า Marketplace" : "ขายสินค้า") : KIND[k] ?? "รายการอื่น";
    return { ...legs[0], label, amount: avail, held };
  }).filter((r) => r.amount !== 0 || r.held !== 0);
}
const CHIPS = [500, 1000, 3000, 5000];
type Bank = { bank: string; account: string; name: string };
type WReq = { id: string; amount_satang: number; status: "requested" | "approved" | "paid" | "failed" | "rejected"; note: string | null; created_at: string; paid_at: string | null; bank: Bank };
type WD = { withdrawing: number; withdrawable: number; locked: number; min: number; requests: WReq[]; lastBank: Bank | null } | null;
type W = { available: number; held: number; withdrawing?: number; withdraw?: WD; history: { tx_id: number; kind: string; note: string | null; bucket: string; amount: number; created_at: string }[]; topups: { id: string; amount_satang: number; status: string; reason: string | null; created_at: string }[] };
const WST: Record<WReq["status"], [string, string]> = { requested: ["รอทีมงานอนุมัติ", GOLD], approved: ["อนุมัติแล้ว · กำลังโอน", GOLD], paid: ["โอนแล้ว", "#7fd6a3"], failed: ["โอนไม่สำเร็จ · คืนเข้ากระเป๋าแล้ว", "#ff8a9a"], rejected: ["ไม่อนุมัติ · คืนเข้ากระเป๋าแล้ว", "#ff8a9a"] };
const BANKS = ["กสิกรไทย", "ไทยพาณิชย์", "กรุงเทพ", "กรุงไทย", "กรุงศรีอยุธยา", "ทหารไทยธนชาต", "ออมสิน", "ธ.ก.ส.", "ยูโอบี", "ซีไอเอ็มบี ไทย", "เกียรตินาคินภัทร", "แลนด์ แอนด์ เฮ้าส์"];
const IN = "h-12 rounded-xl bg-[#251d1b] px-[14px] text-[16px] text-[#f3ead9] outline-none placeholder:text-[#b5a596]";

/** ถอนเงินเข้าบัญชีธนาคาร — กรอกบัญชี → แผ่นยืนยัน → ส่งคำขอ */
function Withdraw({ wd, onDone }: { wd: NonNullable<WD>; onDone: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState(0);
  const [bank, setBank] = useState<Bank>(wd.lastBank ?? { bank: "", account: "", name: "" });
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pending = wd.requests.find((r) => r.status === "requested" || r.status === "approved");
  const digits = bank.account.replace(/\D/g, "");
  const why = amt * 100 < wd.min ? `ถอนขั้นต่ำ ${baht(wd.min)}` : amt * 100 > wd.withdrawable ? `ถอนได้สูงสุด ${baht(wd.withdrawable)}` : !bank.bank.trim() ? "เลือกธนาคาร" : digits.length < 10 || digits.length > 15 ? "เลขบัญชี 10–15 หลัก" : !bank.name.trim() ? "กรอกชื่อบัญชี" : "";
  const send = async () => {
    setBusy(true); setErr("");
    const r = await fetch("/api/wallet/withdraw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: amt, bank: { ...bank, account: digits } }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false); setSure(false);
    if (!d?.ok) return setErr(d?.error || "ส่งไม่สำเร็จ กรุณาลองใหม่");
    setOpen(false); setAmt(0); onDone(`ส่งคำขอถอน ${baht(amt * 100)} แล้ว · ทีมงานอนุมัติแล้วโอนเข้าบัญชีของคุณ`);
  };
  return (
    <section className="flex flex-col gap-2">
      <div className="flex justify-between items-baseline gap-3"><h2 className="m-0 text-[15px] font-semibold">ถอนเงินเข้าบัญชี</h2><span className="text-[13px] font-light text-[#d9c9b4]">ถอนได้ <b className="font-semibold tabular-nums" style={{ color: GOLD }}>{baht(wd.withdrawable)}</b></span></div>
      <p className="m-0 text-[12.5px] font-light text-[#d9c9b4] leading-[1.6]">ถอนได้เฉพาะเงินที่คุณเติมเข้ามา · เครดิตโบนัสเปิดเมมเบอร์และเครดิตจากโค้ด/บัตรของขวัญ{wd.locked > 0 ? ` (${baht(wd.locked)})` : ""} ใช้จองได้แต่ถอนเป็นเงินสดไม่ได้ · ขั้นต่ำ {baht(wd.min)} · ทีมงานตรวจแล้วโอนภายใน 1–2 วันทำการ</p>
      {pending ? (
        <div className="rounded-2xl bg-[#211a18] text-[13.5px] flex justify-between gap-3" style={{ padding: "12px 14px", border: `1px solid ${LN}` }}>
          <span className="flex flex-col min-w-0"><span>ขอถอน {baht(pending.amount_satang)}</span><span className="text-[12px] font-light text-[#b5a596] truncate">{pending.bank.bank} · {pending.bank.account}</span></span>
          <span className="text-[12px] font-semibold shrink-0" style={{ color: WST[pending.status][1] }}>{WST[pending.status][0]}</span>
        </div>
      ) : !open ? (
        <button type="button" disabled={wd.withdrawable < wd.min} onClick={() => { setOpen(true); setAmt(Math.floor(wd.withdrawable / 100)); setErr(""); }} className="h-12 rounded-[14px] text-[14px] font-semibold disabled:opacity-45" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>{wd.withdrawable < wd.min ? `ยอดถอนได้ยังไม่ถึงขั้นต่ำ ${baht(wd.min)}` : "ถอนเงิน"}</button>
      ) : (
        <div className="flex flex-col gap-2 rounded-2xl bg-[#211a18]" style={{ padding: 14, border: `1px solid ${LN}` }}>
          <label className="flex items-center gap-2 h-12 rounded-xl bg-[#251d1b] px-[14px]"><span className="text-[#b5a596]">฿</span>
            <input inputMode="numeric" value={amt || ""} onChange={(e) => setAmt(Number(e.target.value.replace(/\D/g, "")) || 0)} aria-label="จำนวนที่ถอน (บาท)" className="flex-1 min-w-0 bg-transparent outline-none text-[16px] text-[#f3ead9]" />
            <button type="button" onClick={() => setAmt(Math.floor(wd.withdrawable / 100))} className="text-[12.5px] shrink-0" style={{ color: GOLD }}>ถอนทั้งหมด</button>
          </label>
          <select value={bank.bank} onChange={(e) => setBank({ ...bank, bank: e.target.value })} aria-label="ธนาคาร" className={IN}>
            <option value="">เลือกธนาคาร</option>{[...new Set([...(bank.bank && !BANKS.includes(bank.bank) ? [bank.bank] : []), ...BANKS])].map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <input inputMode="numeric" value={bank.account} onChange={(e) => setBank({ ...bank, account: e.target.value.replace(/[^\d-]/g, "").slice(0, 20) })} placeholder="เลขบัญชี 10–15 หลัก" aria-label="เลขบัญชี" className={IN} />
          <input value={bank.name} onChange={(e) => setBank({ ...bank, name: e.target.value.slice(0, 80) })} placeholder="ชื่อบัญชี (ตรงกับชื่อในบัญชีธนาคาร)" aria-label="ชื่อบัญชี" className={IN} />
          {why && amt > 0 && <span className="text-[12px] text-[#ff8a9a]">{why}</span>}
          {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setOpen(false)} className="h-12 rounded-[14px] text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}>ยกเลิก</button>
            <button type="button" disabled={!!why} onClick={() => setSure(true)} className="h-12 rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold disabled:opacity-45">ถอนเงิน</button>
          </div>
        </div>
      )}
      {sure && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="ยืนยันถอนเงิน">
          <button type="button" aria-label="ปิด" onClick={() => setSure(false)} className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-[480px] rounded-t-[24px] bg-[#211a18] flex flex-col gap-3" style={{ padding: "18px 16px calc(18px + env(safe-area-inset-bottom))" }}>
            <b className="font-semibold text-[16px]">ยืนยันถอน {baht(amt * 100)}?</b>
            <div className="rounded-2xl text-[14px] flex flex-col gap-1" style={{ padding: 14, background: "#251d1b" }}><span>{bank.bank} · {digits}</span><span className="text-[#d9c9b4]">{bank.name}</span></div>
            <span className="text-[12.5px] font-light text-[#d9c9b4]">ยอดนี้ย้ายไป &quot;กำลังถอน&quot; ทันที · ถ้าโอนไม่สำเร็จจะคืนเข้ากระเป๋า · ตรวจเลขบัญชีและชื่อให้ถูกต้อง</span>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSure(false)} className="h-12 rounded-[14px] text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}>กลับไปแก้</button>
              <button type="button" disabled={busy} onClick={send} className="h-12 rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold disabled:opacity-50">{busy ? "กำลังส่ง…" : "ยืนยันถอน"}</button>
            </div>
          </div>
        </div>
      )}
      {wd.requests.filter((r) => r !== pending).slice(0, 5).map((r) => (
        <div key={r.id} className="flex justify-between items-center gap-3 rounded-2xl bg-[#211a18] text-[13.5px]" style={{ padding: "10px 14px" }}>
          <span className="flex flex-col min-w-0"><span>ถอน {baht(r.amount_satang)}</span><span className="text-[12px] font-light text-[#b5a596] truncate">{new Date(r.paid_at ?? r.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}{r.note ? ` · ${r.note}` : ""}</span></span>
          <span className="text-[12px] font-semibold shrink-0 text-right" style={{ color: WST[r.status][1] }}>{WST[r.status][0]}</span>
        </div>
      ))}
    </section>
  );
}

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
          {w && (w.withdrawing ?? 0) > 0 && <span className="text-[13px] font-light text-[#d9c9b4]">กำลังถอนเข้าบัญชี {baht(w.withdrawing ?? 0)}</span>}
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

        {w?.withdraw && !open && <Withdraw wd={w.withdraw} onDone={(t) => { setMsg({ ok: true, t }); load(); }} />}

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
