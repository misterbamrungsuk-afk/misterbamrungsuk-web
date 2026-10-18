"use client";

import { useMemo, useState } from "react";
import { FlashMsg, useConfirm, useFlash } from "../confirm";
import { STAY_LABEL, afterStayRefundSplit, bahtTxt, thDate, thTime, type StayBooking, type StayStatus } from "@/lib/hotels/types";

const FILTERS: { key: string; label: string; has: StayStatus[] | null }[] = [
  { key: "open", label: "เงินพักอยู่", has: ["pending", "confirmed"] },
  { key: "done", label: "เข้าพักแล้ว", has: ["completed"] },
  { key: "closed", label: "ยกเลิก/คืนเงิน", has: ["declined", "expired", "cancelled", "refunded", "void"] },
  { key: "all", label: "ทั้งหมด", has: null },
];

export function StaysAdmin({ initial, recon }: { initial: StayBooking[]; recon: { escrow: number; expected: number; ok: boolean } | null }) {
  const [rows, setRows] = useState(initial);
  const [f, setF] = useState("open");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmUi, ask] = useConfirm();
  const { msg, flash, fromRes } = useFlash();
  // คืนเงินหลังเข้าพักเสร็จ (เต็ม/บางส่วน)
  const [after, setAfter] = useState<{ b: StayBooking; amount: string; note: string } | null>(null);

  const cur = FILTERS.find((x) => x.key === f)!;
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((b) => (!cur.has || cur.has.includes(b.status)) && (!s || [b.code, b.partner_name, b.guest_name, b.customer_email ?? ""].some((v) => v.toLowerCase().includes(s))));
  }, [rows, cur, q]);

  const refund = async (b: StayBooking) => {
    let note = "";
    const ok = await ask({
      title: `คืนเงินเต็ม ${b.code}?`, danger: true, ok: "คืนเงิน",
      body: <div className="flex flex-col gap-2"><span>{bahtTxt(b.total_satang)} กลับเข้ากระเป๋าลูกค้า ({b.customer_email ?? b.customer_id}) · การจองถูกยกเลิก · โรงแรมได้รับแจ้ง</span>
        <label className="text-xs text-ink-300">เหตุผล (ลูกค้าและโรงแรมเห็น)<input className="input-dark w-full mt-1" maxLength={300} onChange={(e) => { note = e.target.value; }} /></label></div>,
    });
    if (!ok) return;
    if (!note.trim()) return flash("ต้องระบุเหตุผลการคืนเงิน", { ok: false });
    setBusy(b.id);
    const res = await fetch("/api/admin/stays", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "refund", id: b.id, note }) }).catch(() => null);
    const out = (await res?.json().catch(() => ({}))) as { ok?: boolean; row?: StayBooking; error?: string } | undefined;
    setBusy(null);
    if (!out?.ok || !out.row) return fromRes(res, out?.error ?? "คืนเงินไม่สำเร็จ", false);
    setRows((rs) => rs.map((x) => (x.id === out.row!.id ? out.row! : x)));
    flash(`คืนเงิน ${b.code} แล้ว`, { ok: true });
  };

  const refundAfter = async () => {
    if (!after) return;
    const { b } = after;
    const note = after.note.trim();
    const amt = Math.round(Number(after.amount) * 100);
    const sp = afterStayRefundSplit(b, amt);
    if (!note) return flash("ต้องระบุเหตุผลการคืนเงิน", { ok: false });
    if (!(amt > 0) || amt > sp.left) return flash(`ยอดคืนต้องอยู่ระหว่าง ฿0.01 – ${bahtTxt(sp.left)}`, { ok: false });
    const ok = await ask({
      title: `คืนเงินหลังเข้าพัก ${b.code} ${bahtTxt(amt)}?`, danger: true, ok: "คืนเงิน",
      body: <div className="flex flex-col gap-1.5">
        <span>ลูกค้า ({b.customer_email ?? b.customer_id}) ได้รับ <b>{bahtTxt(amt)}</b> เข้ากระเป๋า{sp.full ? " · คืนครบยอด" : " · คืนบางส่วน"}</span>
        <span>ดึงจากกระเป๋าโรงแรม {b.partner_name}: <b>{bahtTxt(sp.fromPartner)}</b></span>
        <span>ดึงจากรายได้แพลตฟอร์ม: <b>{bahtTxt(sp.fromPlatform)}</b></span>
        {sp.prior > 0 && <span className="text-xs">คืนไปแล้วก่อนหน้า {bahtTxt(sp.prior)} · คงเหลือคืนได้หลังรายการนี้ {bahtTxt(sp.left - amt)}</span>}
        <span className="text-xs">เหตุผล: {note} · ลูกค้าและโรงแรมได้รับแจ้ง · ยอดโรงแรมไม่พอ = ระบบไม่ทำรายการ</span>
      </div>,
    });
    if (!ok) return;
    setBusy(b.id);
    const res = await fetch("/api/admin/stays", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "refund_after", id: b.id, amount: amt / 100, note }) }).catch(() => null);
    const out = (await res?.json().catch(() => ({}))) as { ok?: boolean; row?: StayBooking; error?: string } | undefined;
    setBusy(null);
    if (!out?.ok || !out.row) return fromRes(res, out?.error ?? "คืนเงินไม่สำเร็จ", false);
    setRows((rs) => rs.map((x) => (x.id === out.row!.id ? out.row! : x)));
    setAfter(null);
    flash(`คืนเงิน ${b.code} ${bahtTxt(amt)} แล้ว`, { ok: true });
  };

  return (
    <div className="flex flex-col gap-3">
      {confirmUi}
      {after && (() => {
        const sp = afterStayRefundSplit(after.b, Math.round(Number(after.amount) * 100));
        return (
          <div className="rounded-2xl border border-crimson-500/50 bg-crimson-500/5 p-4 flex flex-col gap-2 text-sm">
            <b>คืนเงินหลังเข้าพัก {after.b.code} · {after.b.partner_name}</b>
            <span className="text-xs text-ink-300">ยอดจอง {bahtTxt(after.b.total_satang)} · โรงแรมได้ {bahtTxt(after.b.partner_net_satang ?? 0)} / แพลตฟอร์ม {bahtTxt(after.b.platform_fee_satang ?? 0)}{sp.prior > 0 ? ` · คืนไปแล้ว ${bahtTxt(sp.prior)}` : ""} · คืนได้อีก {bahtTxt(sp.left)}</span>
            <div className="flex flex-wrap gap-2 items-end">
              <label className="text-xs text-ink-300">ยอดคืน (บาท)<input className="input-dark w-36 mt-1" inputMode="decimal" value={after.amount} onChange={(e) => setAfter({ ...after, amount: e.target.value })} /></label>
              <button type="button" className="chip h-10 px-3" onClick={() => setAfter({ ...after, amount: String(sp.left / 100) })}>คืนเต็มที่เหลือ</button>
              <label className="text-xs text-ink-300 flex-1 min-w-[200px]">เหตุผล (ลูกค้าและโรงแรมเห็น)<input className="input-dark w-full mt-1" maxLength={300} value={after.note} onChange={(e) => setAfter({ ...after, note: e.target.value })} /></label>
            </div>
            {sp.amount > 0 && sp.amount <= sp.left && <span className="text-xs">ดึงจากโรงแรม {bahtTxt(sp.fromPartner)} + แพลตฟอร์ม {bahtTxt(sp.fromPlatform)} = ลูกค้าได้ {bahtTxt(sp.amount)}</span>}
            <div className="flex gap-2">
              <button type="button" className="chip h-10 px-4" onClick={() => setAfter(null)}>ปิด</button>
              <button type="button" disabled={busy === after.b.id} className="h-10 px-4 rounded-full bg-crimson-500 text-white font-semibold disabled:opacity-60" onClick={refundAfter}>{busy === after.b.id ? "กำลังคืน…" : "ตรวจยอดและคืนเงิน"}</button>
            </div>
          </div>
        );
      })()}
      {recon && (
        <p className="m-0 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: recon.ok ? "rgba(74,222,128,.4)" : "rgba(252,165,165,.6)" }}>
          เงินพักห้องพัก (hotel_escrow) {bahtTxt(recon.escrow)} · รายการที่เงินพักอยู่ {bahtTxt(recon.expected)} · {recon.ok ? "ตรงกัน" : "ไม่ตรงกัน — ตรวจสอบ"}
        </p>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        {FILTERS.map((x) => (
          <button key={x.key} type="button" onClick={() => setF(x.key)} aria-pressed={f === x.key} className={`chip h-9 px-3.5 ${f === x.key ? "chip-red" : ""}`}>
            {x.label} · {rows.filter((b) => !x.has || x.has.includes(b.status)).length}
          </button>
        ))}
        <input className="input-dark h-9 ml-auto w-full sm:w-64" placeholder="ค้นหา รหัส / โรงแรม / ผู้เข้าพัก / อีเมล" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหา" />
      </div>
      <FlashMsg msg={msg} />
      {!shown.length ? <p className="text-sm text-ink-300 py-8 text-center">ไม่มีรายการ</p> : (
        <div className="overflow-x-auto rounded-2xl border border-ink-600">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="text-left text-ink-300 text-xs"><tr className="border-b border-ink-600">
              <th className="px-3 py-2">รหัส</th><th className="px-3 py-2">โรงแรม / ห้อง</th><th className="px-3 py-2">ผู้เข้าพัก</th><th className="px-3 py-2">วันพัก</th>
              <th className="px-3 py-2 text-right">ยอด</th><th className="px-3 py-2 text-right">โรงแรม / แพลตฟอร์ม</th><th className="px-3 py-2">สถานะ</th><th className="px-3 py-2" />
            </tr></thead>
            <tbody>
              {shown.map((b) => (
                <tr key={b.id} className="border-b border-ink-700 align-top">
                  <td className="px-3 py-2 font-mono text-xs">{b.code}<div className="text-[11px] text-ink-300 font-sans">{thTime(b.created_at)}</div></td>
                  <td className="px-3 py-2">{b.partner_name}<div className="text-xs text-ink-300">{b.room_name} × {b.rooms}</div></td>
                  <td className="px-3 py-2">คุณ{b.guest_name} · {b.guests} คน<div className="text-xs text-ink-300 break-all">{b.customer_email ?? b.customer_id}</div></td>
                  <td className="px-3 py-2 whitespace-nowrap">{thDate(b.check_in, { day: "numeric", month: "short" })} – {thDate(b.check_out, { day: "numeric", month: "short", year: "2-digit" })}<div className="text-xs text-ink-300">{b.nights} คืน</div></td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{bahtTxt(b.total_satang)}{b.refund_satang != null && <div className="text-xs text-ink-300">คืน {bahtTxt(b.refund_satang)}</div>}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-xs">{b.partner_net_satang != null ? <>{bahtTxt(b.partner_net_satang)} / {bahtTxt(b.platform_fee_satang ?? 0)}</> : <span className="text-ink-300">{b.platform_pct}%</span>}</td>
                  <td className="px-3 py-2 text-xs">{STAY_LABEL[b.status]}{b.decline_reason && <div className="text-ink-300">{b.decline_reason}</div>}</td>
                  <td className="px-3 py-2 text-right">
                    {(b.status === "pending" || b.status === "confirmed") && <button type="button" disabled={busy === b.id} onClick={() => refund(b)} className="chip h-9 px-3 whitespace-nowrap">{busy === b.id ? "กำลังคืน…" : "คืนเงิน"}</button>}
                    {b.status === "completed" && (b.refund_satang ?? 0) < b.total_satang && <button type="button" disabled={busy === b.id} onClick={() => { setAfter({ b, amount: "", note: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="chip h-9 px-3 whitespace-nowrap">คืนเงินหลังเข้าพัก</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
