"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// กระเป๋าเงิน Recruit: สรุปผลงาน (ชวนใคร · รายได้) · เบิกได้ · กดเบิกเอง · ประวัติเงินเข้า-ออก (บอสสั่ง 24 ต.ค. 2569)
type Payout = { id: string; amount_satang: number; status: string; created_at: string; note: string | null };
type Row = { id: number; note: string; amount: number; at: string };
export type WalletData = {
  recruits: number; recruitsPaid: number; members: number;
  earned: number; available: number; withdrawing: number; paidOut: number;
  payouts: Payout[]; history: Row[]; hasBank: boolean;
};
const GOLD = "#e8c472";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 });
const dt = (iso: string) => new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
const PST: Record<string, [string, string]> = { requested: ["รอ CEO อนุมัติ", GOLD], approved: ["อนุมัติแล้ว · รอโอน", GOLD], paid: ["โอนแล้ว", "#7fd6a3"], failed: ["ไม่สำเร็จ · คืนยอดแล้ว", "#ff8a9a"] };

export function SalesWallet({ d, hideMember = false }: { d: WalletData; hideMember?: boolean }) {
  const router = useRouter();
  const [amt, setAmt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const maxBaht = Math.floor(d.available / 100);
  const open = d.payouts.some((p) => p.status === "requested" || p.status === "approved");
  const withdraw = async (baht0: number) => {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/sales/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: baht0 }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setBusy(false);
    setMsg(j?.ok ? { ok: true, text: "ส่งคำขอเบิกแล้ว · รอ CEO อนุมัติ แล้วทีมงานโอนเข้าบัญชี" } : { ok: false, text: j?.error || "เบิกไม่สำเร็จ" });
    if (j?.ok) { setAmt(""); router.refresh(); }
  };
  const tile = "rounded-2xl bg-[#171211] flex flex-col";
  return (
    <>
      <section data-sales-summary className="rounded-[18px] bg-[#211a18] flex flex-col gap-2.5" style={{ padding: 16, border: "1px solid rgba(232,196,114,.3)" }}>
        <b className="text-[16px]">สรุปผลงาน</b>
        <div className={`grid ${hideMember ? "grid-cols-2" : "grid-cols-3"} gap-2 text-center`}>
          {([["แนะนำ Part-time", `${d.recruits} คน`, d.recruits ? `ได้งานแล้ว ${d.recruitsPaid}` : "ยังไม่มี"], ...(hideMember ? [] : [["ลูกค้าเปิดเมม", `${d.members} คน`, ""] as const]), ["รายได้ทั้งหมด", baht(d.earned), ""]] as const).map(([k, v, s]) => (
            <div key={k} className={tile} style={{ padding: "10px 6px" }}><span className="text-[12px] text-[#b5a596]">{k}</span><b className="text-[17px] tabular-nums">{v}</b>{s && <span className="text-[11.5px] text-[#b5a596]">{s}</span>}</div>
          ))}
        </div>
      </section>

      <section data-sales-wallet className="rounded-[18px] flex flex-col gap-3" style={{ padding: 16, background: "linear-gradient(150deg, #3a2a17 0%, #251d1b 70%)", boxShadow: "0 10px 24px rgba(0,0,0,0.35)" }}>
        <b className="text-[16px]" style={{ color: GOLD }}>กระเป๋าเงิน</b>
        <div><div className="text-[13px] text-[#d9c9b4]">เบิกได้</div><div className="font-semibold text-[34px] leading-[1.15] tabular-nums">{baht(d.available)}</div>
          <div className="text-[13px] text-[#d9c9b4]">กำลังโอน {baht(d.withdrawing)} · โอนแล้วทั้งหมด {baht(d.paidOut)}</div></div>
        {!d.hasBank
          ? <p className="m-0 text-[13.5px] text-[#ff8a9a]">ยังไม่มีบัญชีรับเงิน · ติดต่อทีมงานเพื่อเพิ่มบัญชีก่อนเบิก</p>
          : open
            ? <p className="m-0 text-[13.5px] text-[#f6c38e]">มีคำขอเบิกที่รอดำเนินการอยู่ · เบิกใหม่ได้เมื่อรายการเดิมเสร็จ</p>
            : <>
                <button type="button" data-withdraw-all disabled={busy || maxBaht < 100} onClick={() => withdraw(maxBaht)} className="h-12 rounded-xl font-semibold text-[#1b130b] bg-[#e8c472] disabled:opacity-40">{maxBaht >= 100 ? `เบิกทั้งหมด ${baht(maxBaht * 100)}` : "เบิกได้เมื่อมียอดตั้งแต่ ฿100"}</button>
                <div className="flex gap-2"><input inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, "").slice(0, 7))} placeholder="หรือระบุจำนวน (บาท)" aria-label="จำนวนเงินที่จะเบิก" className="flex-1 min-w-0 h-11 rounded-xl px-3 bg-[#171211] text-[16px] text-[#f3ead9] outline-none" style={{ border: "1px solid rgba(243,234,217,.12)" }} />
                  <button type="button" disabled={busy || !Number(amt) || Number(amt) > maxBaht} onClick={() => withdraw(Number(amt))} className="h-11 px-4 rounded-xl font-semibold disabled:opacity-40" style={{ background: "rgba(232,196,114,.18)", color: GOLD }}>เบิก</button></div>
              </>}
        <span className="text-[12px] text-[#b5a596]">ขั้นต่ำ ฿100 · CEO อนุมัติแล้วทีมงานโอนเข้าบัญชีที่ลงทะเบียนไว้</span>
        {msg && <p role="status" className="m-0 text-[13.5px]" style={{ color: msg.ok ? "#7fd6a3" : "#ff8a9a" }}>{msg.text}</p>}
        {!!d.payouts.length && <div className="flex flex-col gap-1.5">
          <b className="text-[14px]">คำขอเบิก</b>
          {d.payouts.map((p) => <div key={p.id} className="flex justify-between gap-2 text-[13px] border-t border-[rgba(243,234,217,.08)] pt-1.5"><span>{dt(p.created_at)} · {baht(p.amount_satang)}</span><span style={{ color: (PST[p.status] ?? [p.status, GOLD])[1] }}>{(PST[p.status] ?? [p.status])[0]}</span></div>)}
        </div>}
      </section>

      <section data-sales-history className="rounded-[18px] bg-[#211a18] flex flex-col gap-1.5" style={{ padding: 14 }}>
        <b className="text-[15px]">ความเคลื่อนไหว</b>
        {!d.history.length && <span className="text-[13.5px] text-[#b5a596]">ยังไม่มีรายการ</span>}
        {d.history.map((h) => (
          <div key={`${h.id}${h.amount}`} className="flex justify-between gap-2 text-[13px] border-t border-[rgba(243,234,217,.07)] pt-1.5">
            <span className="min-w-0">{h.note}<span className="block text-[11.5px] text-[#b5a596]">{dt(h.at)}</span></span>
            <b className="shrink-0 tabular-nums" style={{ color: h.amount > 0 ? "#7fd6a3" : "#f3ead9" }}>{h.amount > 0 ? "+" : "−"}{baht(Math.abs(h.amount))}</b>
          </div>
        ))}
      </section>
    </>
  );
}
