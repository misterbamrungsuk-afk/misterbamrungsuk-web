"use client";

import { useEffect, useState } from "react";

// กระเป๋าเงินของพาร์ทเนอร์ / ร้านค้า — ยอดถอนได้ · ขอถอนเข้าบัญชี (CEO อนุมัติ → ทีมงานโอน) · ประวัติ
type Bank = { bank: string; account: string; name: string };
type Req = { id: string; amount_satang: number; bank: Bank; status: string; note: string | null; created_at: string; paid_at: string | null };
type Hist = { amount: number; bucket: string; note: string | null; created_at: string };
type W = { available: number; withdrawing: number; history: Hist[]; requests: Req[]; lastBank: Bank | null; min: number };

const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 });
const day = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit" });
const ST: Record<string, [string, string]> = {
  requested: ["รอ CEO อนุมัติ", "text-ink-300"], approved: ["อนุมัติแล้ว · รอโอน", "text-gold-300"], paid: ["โอนแล้ว", "text-emerald-300"],
  failed: ["โอนไม่สำเร็จ · คืนยอดแล้ว", "text-red-300"], rejected: ["ไม่อนุมัติ · คืนยอดแล้ว", "text-red-300"],
};
const BANKS = ["กสิกรไทย", "ไทยพาณิชย์", "กรุงเทพ", "กรุงไทย", "กรุงศรีอยุธยา", "ทหารไทยธนชาต", "ออมสิน", "อื่น ๆ"];
const field = "w-full h-11 rounded-xl border border-ink-600 bg-ink-800 px-3 text-[15px] text-ink-100";

export function OwnerWallet({ api, source }: { api: string; source: string }) {
  const [w, setW] = useState<W | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState<Bank>({ bank: BANKS[0], account: "", name: "" });
  const load = () => fetch(api, { cache: "no-store" }).then((r) => r.json()).then((d) => {
    if (!d?.ok) { setErr("โหลดกระเป๋าไม่สำเร็จ"); return; }
    setW(d); if (d.lastBank) setBank(d.lastBank);
  }).catch(() => setErr("โหลดกระเป๋าไม่สำเร็จ"));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const open = w?.requests.find((r) => r.status === "requested" || r.status === "approved");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg("");
    const r = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount), bank }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (d.ok) { setMsg("ส่งคำขอถอนแล้ว · รอ CEO อนุมัติ แล้วทีมงานจะโอนเข้าบัญชี"); setAmount(""); load(); } else setMsg(d.error ?? "ส่งคำขอไม่สำเร็จ");
  };

  if (err) return <p className="text-sm text-red-300">{err}</p>;
  if (!w) return <p className="text-sm text-ink-300">กำลังโหลด…</p>;
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-gold-500/50 p-4" style={{ background: "linear-gradient(135deg, #2a1418, #1d1712)" }}>
        <p className="text-xs tracking-[.2em] text-gold-400 font-semibold">ยอดถอนได้</p>
        <p className="text-[32px] font-bold text-gold-300 leading-tight tabular-nums">{baht(w.available)}</p>
        <p className="text-xs text-ink-300 mt-1">{source}{w.withdrawing > 0 && <> · กำลังถอน <b className="text-ink-100">{baht(w.withdrawing)}</b></>}</p>
      </section>

      <section className="rounded-2xl border border-ink-600 p-4 flex flex-col gap-3">
        <b className="text-[16px]">ขอถอนเข้าบัญชี</b>
        {open ? (
          <p className="text-sm text-ink-200">มีคำขอถอน {baht(open.amount_satang)} ที่ <span className={ST[open.status][1]}>{ST[open.status][0]}</span> · ส่งคำขอใหม่ได้เมื่อรายการนี้เสร็จ</p>
        ) : w.available < w.min ? (
          <p className="text-sm text-ink-300">ถอนได้เมื่อมียอดตั้งแต่ {baht(w.min)}</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-2.5">
            <label className="text-xs text-ink-300">จำนวนเงิน (บาท)
              <div className="flex gap-2 mt-1">
                <input className={field} inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder={`สูงสุด ${(w.available / 100).toLocaleString("th-TH")}`} />
                <button type="button" onClick={() => setAmount(String(w.available / 100))} className="shrink-0 h-11 px-3 rounded-xl border border-gold-500/60 text-gold-300 text-sm">ทั้งหมด</button>
              </div>
            </label>
            <label className="text-xs text-ink-300">ธนาคาร
              <select className={`${field} mt-1`} value={bank.bank} onChange={(e) => setBank({ ...bank, bank: e.target.value })}>
                {[...new Set([...BANKS, bank.bank])].map((b) => <option key={b}>{b}</option>)}
              </select>
            </label>
            <label className="text-xs text-ink-300">เลขบัญชี
              <input className={`${field} mt-1`} inputMode="numeric" required value={bank.account} onChange={(e) => setBank({ ...bank, account: e.target.value.replace(/[^\d-]/g, "") })} placeholder="xxx-x-xxxxx-x" />
            </label>
            <label className="text-xs text-ink-300">ชื่อบัญชี (ตรงกับชื่อธุรกิจ/เจ้าของ)
              <input className={`${field} mt-1`} required value={bank.name} onChange={(e) => setBank({ ...bank, name: e.target.value })} />
            </label>
            <button disabled={busy} className="h-12 rounded-xl bg-gold-500 text-ink-900 font-semibold disabled:opacity-60">{busy ? "กำลังส่ง…" : "ส่งคำขอถอน"}</button>
            <p className="text-xs text-ink-300">CEO อนุมัติ แล้วทีมงานโอนเข้าบัญชีนี้ · แจ้งผลในหน้านี้</p>
          </form>
        )}
        {msg && <p className="text-sm text-gold-300" role="status">{msg}</p>}
      </section>

      {w.requests.length > 0 && (
        <section className="rounded-2xl border border-ink-600 p-4">
          <b className="text-[16px]">คำขอถอน</b>
          <ul className="mt-2 flex flex-col divide-y divide-ink-700">
            {w.requests.map((r) => (
              <li key={r.id} className="py-2.5 flex justify-between gap-3 text-sm">
                <span><span className="tabular-nums">{baht(r.amount_satang)}</span><span className="block text-xs text-ink-300">{day(r.created_at)} · {r.bank.bank} {r.bank.account.slice(-4).padStart(r.bank.account.length, "•")}{r.note ? ` · ${r.note}` : ""}</span></span>
                <span className={`shrink-0 text-xs ${ST[r.status]?.[1] ?? ""}`}>{ST[r.status]?.[0] ?? r.status}{r.paid_at ? ` ${day(r.paid_at)}` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-ink-600 p-4">
        <b className="text-[16px]">เงินเข้า-ออก</b>
        {w.history.filter((h) => h.bucket === "available").length === 0 ? <p className="text-sm text-ink-300 mt-2">ยังไม่มีรายการ</p> : (
          <ul className="mt-2 flex flex-col divide-y divide-ink-700">
            {w.history.filter((h) => h.bucket === "available").map((h, i) => (
              <li key={i} className="py-2.5 flex justify-between gap-3 text-sm">
                <span className="min-w-0">{h.note ?? "-"}<span className="block text-xs text-ink-300">{day(h.created_at)}</span></span>
                <span className={`shrink-0 tabular-nums ${h.amount > 0 ? "text-emerald-300" : "text-ink-200"}`}>{h.amount > 0 ? "+" : "−"}{baht(Math.abs(h.amount))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
