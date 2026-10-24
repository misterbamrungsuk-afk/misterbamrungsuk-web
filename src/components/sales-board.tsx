"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// แดชบอร์ด Recruit (ใช้ทั้ง Part-Time และ Recruit ภายนอก) — โค้ด/ลิงก์ · อัตราค่าคอม · คนที่ชวน · ค่าคอม
type Ref = { id: string; who: string; tier: "gold" | "black"; status: string; commission: number; mode: "cash" | "boost" | null; at: string };
type Payout = { id: string; amount_satang: number; status: string; created_at: string; note: string | null };
type Recruit = { id: string; mb: string; who: string; pack: string; status: string; commission: number; credited: boolean; at: string; jobs?: number; free?: boolean; wait?: string };
type Summary = { rep: { code: string; kind: string; name: string; active: boolean }; referrals: Ref[]; recruits?: Recruit[]; earned: number; available: number; boostCredit: number; withdrawing: number; payouts: Payout[] };
const GOLD = "#e8c472";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH");
const bahtN = (n: number) => "฿" + n.toLocaleString("th-TH");
const dt = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit", timeZone: "Asia/Bangkok" });
const PST: Record<string, string> = { requested: "รอ CEO อนุมัติ", approved: "อนุมัติแล้ว · รอโอน", paid: "โอนแล้ว", failed: "ไม่สำเร็จ · คืนยอดแล้ว" };

export function SalesBoard({ who, mb, t, summary, link, tiers, boostMult, recruit, hideMoney = false }: { who: "parttime" | "external"; mb?: string; t?: string; summary: Summary; link: string; tiers: Record<"gold" | "black", { name: string; pay: number; commission: number }>; boostMult: number; recruit?: { link: string; code: string }; /** หน้า Recruit ภายนอกมีกระเป๋าเงินแยก (SalesWallet) → ซ่อนยอด/ขอรับในบอร์ด */ hideMoney?: boolean }) {
  const router = useRouter();
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState("");
  const [sure, setSure] = useState(""); // แปลงเป็นวงเงินโปรโมท = ถอนเป็นเงินไม่ได้อีก → ยืนยันในหน้าก่อน
  const [amt, setAmt] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const copy = async (v: string, k: string) => { try { await navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(""), 1500); } catch { setCopied(""); } };
  const toBoost = async (id: string) => {
    setBusy(id); setMsg(null);
    const r = await fetch("/api/pt/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t, action: "boost", id }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setBusy(""); setMsg(j?.ok ? { ok: true, text: `แปลงแล้ว · ได้วงเงินโปรโมท ${baht(j.credit)} ใช้ได้ที่ปุ่ม "โปรโมทโปรไฟล์"` } : { ok: false, text: j?.error || "ไม่สำเร็จ" });
    if (j?.ok) router.refresh();
  };
  const payout = async () => {
    setBusy("payout"); setMsg(null);
    const r = await fetch("/api/sales/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amt) }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setBusy(""); setMsg(j?.ok ? { ok: true, text: "ส่งคำขอแล้ว · รอ CEO อนุมัติ แล้วทีมงานโอนเข้าบัญชี" } : { ok: false, text: j?.error || "ไม่สำเร็จ" });
    if (j?.ok) { setAmt(""); router.refresh(); }
  };
  const card = "rounded-[18px] bg-[#211a18] flex flex-col gap-2";
  return (
    <>
      {/* ชวน Part-Time (หมอ) — ลิงก์สมัคร + ค่าตอบแทนต่อคน + รายชื่อที่ชวน (เห็นเฉพาะของตัวเอง) */}
      {recruit && (
        <section data-recruit className={card} style={{ padding: 16, border: "1px solid rgba(232,196,114,.35)" }}>
          <b className="text-[16px]">ชวนหมอ (Part-Time) สมัคร</b>
          <div className="flex items-center gap-2 rounded-xl bg-[#171211]" style={{ padding: "8px 10px" }}><span className="text-[12.5px] text-[#b5a596] shrink-0">เลขแนะนำของคุณ</span><b data-recruit-code className="text-[20px] tracking-[.12em] select-all" style={{ color: GOLD }}>{recruit.code}</b>
            <button type="button" onClick={() => copy(recruit.code, "rcode")} className="ml-auto h-10 px-3 rounded-lg text-[13px] font-semibold" style={{ background: "rgba(232,196,114,.18)", color: GOLD }}>{copied === "rcode" ? "คัดลอกแล้ว" : "คัดลอกเลข"}</button></div>
          <div className="flex items-center gap-2 rounded-xl bg-[#171211] text-[13px]" style={{ padding: "8px 10px" }}><span className="flex-1 min-w-0 truncate select-all text-[#d9c9b4]">{recruit.link}</span>
            <button type="button" onClick={() => copy(recruit.link, "rlink")} className="h-10 px-3 rounded-lg text-[13px] font-semibold text-[#1b130b] bg-[#e8c472]">{copied === "rlink" ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}</button></div>
          <div className="rounded-xl bg-[#171211] flex items-baseline justify-between gap-2" style={{ padding: "10px 12px" }} data-recruit-fee><span className="text-[13px] text-[#d9c9b4]">ค่าแนะนำ ทุกแผน (ชาย · ทอม)</span><b className="text-[20px]" style={{ color: GOLD }}>{bahtN(500)} / คน</b></div>
          <span className="text-[12.5px] text-[#b5a596] leading-[1.6]">หมอเปิดลิงก์นี้แล้วสมัครภายใน 30 วัน หรือกรอกเลขแนะนำของคุณตอนสมัคร · สมัครแบบจ่ายเงิน: ได้เมื่อหมอชำระค่าสมัคร · สมัครฟรี (เชิญ/ทอมหล่อ): ได้เมื่อหมอได้งานแรก</span>
          {(() => { const c = summary.recruits?.filter((r) => r.credited).length ?? 0; const got = Math.floor(c / 5); return (
            <div data-recruit-bonus className="rounded-xl flex flex-col gap-1.5" style={{ padding: "10px 12px", background: "rgba(232,196,114,.1)", border: "1px solid rgba(232,196,114,.35)" }}>
              <div className="flex items-baseline justify-between gap-2"><span className="text-[13.5px] font-semibold">โบนัสครบทุก 5 คน</span><b className="text-[16px]" style={{ color: GOLD }}>+{bahtN(1000)}</b></div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(243,234,217,.08)" }}><div className="h-full rounded-full" style={{ width: `${((c % 5) / 5) * 100}%`, background: GOLD }} /></div>
              <span className="text-[12px] text-[#b5a596]">ได้ค่าแนะนำแล้ว {c} คน · รอบนี้ {c % 5}/5{got ? ` · ได้โบนัสแล้ว ${got} ครั้ง (${bahtN(got * 1000)})` : ""}</span>
            </div>); })()}
          <b className="text-[14.5px] mt-1">หมอที่คุณชวน ({summary.recruits?.length ?? 0})</b>
          {!summary.recruits?.length && <span className="text-[13.5px] text-[#b5a596]">ยังไม่มี · ส่งลิงก์ด้านบนให้หมอที่สนใจ</span>}
          {summary.recruits?.map((r) => (
            <div key={r.id} data-recruit-row className="flex items-center gap-2 text-[13.5px] border-t border-[rgba(243,234,217,.07)] pt-2">
              <span className="flex-1 min-w-0"><b className="font-medium">{r.who}</b> <span className="text-[#e8c472]">{r.mb}</span><span className="block text-[12px] text-[#b5a596]">{r.pack} · {dt(r.at)}</span><span data-recruit-status className="inline-block mt-0.5 text-[11.5px] font-semibold rounded-full px-2 py-0.5" style={{ background: r.jobs ? "rgba(127,214,163,.15)" : "rgba(243,234,217,.07)", color: r.jobs ? "#7fd6a3" : "#d9c9b4" }}>{r.status}</span></span>
              <span className="text-right"><b style={{ color: r.credited ? "#7fd6a3" : GOLD }}>{baht(r.commission)}</b><span className="block text-[11.5px] text-[#b5a596]">{r.wait ?? (r.credited ? "ได้รับแล้ว" : "รอหมอชำระ")}</span></span>
            </div>
          ))}
        </section>
      )}

      <section className={card} style={{ padding: 16, background: "linear-gradient(135deg, #3d1922, #211a18 70%)", border: "1px solid rgba(232,196,114,.45)" }}>
        <span className="text-[12px] tracking-[.22em] font-semibold" style={{ color: GOLD }}>โค้ดแนะนำของคุณ</span>
        <div className="flex items-center gap-2"><b className="text-[30px] tracking-[.12em] select-all">{summary.rep.code}</b>
          <button type="button" onClick={() => copy(summary.rep.code, "code")} className="ml-auto h-10 px-3 rounded-xl text-[13px] font-semibold text-[#1b130b] bg-[#e8c472]">{copied === "code" ? "คัดลอกแล้ว" : "คัดลอกโค้ด"}</button></div>
        <div className="flex items-center gap-2 rounded-xl bg-[#171211] text-[13px]" style={{ padding: "8px 10px" }}><span className="flex-1 min-w-0 truncate select-all text-[#d9c9b4]">{link}</span>
          <button type="button" onClick={() => copy(link, "link")} className="h-10 px-3 rounded-lg text-[13px] font-semibold" style={{ background: "rgba(232,196,114,.18)", color: GOLD }}>{copied === "link" ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}</button></div>
        <span className="text-[13px] text-[#d9c9b4]">ส่งลิงก์ให้ลูกค้า เปิดลิงก์แล้วเปิดเมมภายใน 30 วัน ระบบใส่โค้ดคุณให้อัตโนมัติ</span>
      </section>

      <section className="grid grid-cols-2 gap-2">
        {(["gold", "black"] as const).map((k) => (
          <div key={k} className="rounded-2xl" style={{ padding: 12, background: k === "black" ? "linear-gradient(160deg, #241f1c, #120f0e)" : "linear-gradient(160deg, #4d1f2a, #2b1218)", border: "1px solid rgba(232,196,114,.35)" }}>
            <b className="text-[14px] text-[#f6dc9a]">ลูกค้าเปิดเมม {tiers[k].name} {bahtN(tiers[k].pay)}</b>
            <div className="text-[20px] font-bold" style={{ color: GOLD }}>คุณได้ {bahtN(tiers[k].commission)}</div>
            {who === "parttime" && <div className="text-[12.5px] text-[#d9c9b4]">หรือวงเงินโปรโมท ×{boostMult} = {bahtN(tiers[k].commission * boostMult)}</div>}
          </div>
        ))}
      </section>

      {!hideMoney && <section className="grid grid-cols-3 gap-2 text-center">
        {[["ค่าคอมทั้งหมด", baht(summary.earned)], [who === "parttime" ? "ถอนได้ (รวมรายได้งาน)" : "ขอรับได้", baht(summary.available)], who === "parttime" ? ["วงเงินโปรโมท", baht(summary.boostCredit)] : ["กำลังโอน", baht(summary.withdrawing)]].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-[#211a18]" style={{ padding: "10px 6px" }}><div className="text-[12px] text-[#b5a596]">{k}</div><b className="text-[16px] tabular-nums">{v}</b></div>
        ))}
      </section>}

      {who === "external" && !hideMoney && (
        <section className={card} style={{ padding: 14 }}>
          <b className="text-[15px]">ขอรับค่าคอมเข้าบัญชี</b>
          <div className="flex gap-2"><input inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, "").slice(0, 7))} placeholder="จำนวนเงิน (บาท)" className="flex-1 min-w-0 h-12 rounded-xl px-3 bg-[#171211] text-[16px] text-[#f3ead9] outline-none" style={{ border: "1px solid rgba(243,234,217,.12)" }} />
            <button type="button" disabled={busy === "payout" || !Number(amt)} onClick={payout} className="h-12 px-4 rounded-xl font-semibold text-[#1b130b] bg-[#e8c472] disabled:opacity-40">ขอรับ</button></div>
          <span className="text-[12.5px] text-[#b5a596]">CEO อนุมัติแล้วทีมงานโอนเข้าบัญชีที่ลงทะเบียนไว้</span>
          {summary.payouts.map((p) => <div key={p.id} className="flex justify-between text-[13px] border-t border-[rgba(243,234,217,.07)] pt-1.5"><span>{dt(p.created_at)} · {baht(p.amount_satang)}</span><span style={{ color: p.status === "paid" ? "#7fd6a3" : p.status === "failed" ? "#ff8a9a" : GOLD }}>{PST[p.status] ?? p.status}</span></div>)}
        </section>
      )}

      <section className={card} style={{ padding: 14 }}>
        <b className="text-[15px]">คนที่คุณชวน ({summary.referrals.length})</b>
        {!summary.referrals.length && <span className="text-[13.5px] text-[#b5a596]">ยังไม่มี · ส่งลิงก์ให้ลูกค้าเพื่อเริ่มรับค่าคอม</span>}
        {summary.referrals.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 text-[13.5px] border-t border-[rgba(243,234,217,.07)] pt-2">
            <span className="flex-1 min-w-0"><b className="font-medium">{r.who}</b><span className="block text-[12px] text-[#b5a596]">{r.tier === "black" ? "Black" : "Gold"} · {dt(r.at)} · {r.status === "credited" ? "เปิดเมมแล้ว" : r.status === "pending" ? "รอตรวจสลิป" : "ไม่ผ่าน"}</span></span>
            <b style={{ color: GOLD }}>{r.status === "credited" ? baht(r.commission) : "—"}</b>
            {who === "parttime" && r.status === "credited" && (r.mode === "boost"
              ? <span className="text-[12px] rounded-full px-2 py-0.5" style={{ background: "rgba(232,196,114,.18)", color: GOLD }}>เป็นวงเงินโปรโมทแล้ว</span>
              : sure === r.id
                ? <span className="flex flex-wrap items-center gap-1.5 text-[12px]"><span className="text-[#d9c9b4]">ได้วงเงินโปรโมท {baht(r.commission * boostMult)} · ถอนเป็นเงินไม่ได้</span>
                    <button type="button" disabled={!!busy} onClick={() => { setSure(""); toBoost(r.id); }} className="h-9 px-3 rounded-lg font-semibold text-[#1a1206] disabled:opacity-40" style={{ background: GOLD }}>{busy === r.id ? "…" : "ยืนยันแปลง"}</button>
                    <button type="button" onClick={() => setSure("")} className="h-9 px-2.5 rounded-lg text-[#d9c9b4]">ยกเลิก</button></span>
                : <button type="button" disabled={!!busy} onClick={() => setSure(r.id)} className="h-9 px-3 rounded-lg text-[12.5px] font-semibold disabled:opacity-40" style={{ background: "rgba(232,196,114,.18)", color: GOLD }}>{busy === r.id ? "…" : `แปลงเป็นโปรโมท ×${boostMult}`}</button>)}
          </div>
        ))}
      </section>
      {msg && <p role="status" className="m-0 text-[13.5px]" style={{ color: msg.ok ? "#7fd6a3" : "#ff8a9a" }}>{msg.text}</p>}
    </>
  );
}
