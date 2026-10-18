"use client";

import { useMemo, useState } from "react";
import { FlashMsg, useConfirm, useFlash } from "../confirm";
import { STAY_LABEL, bahtTxt, thDate, thTime, type StayBooking, type StayStatus } from "@/lib/hotels/types";

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

  return (
    <div className="flex flex-col gap-3">
      {confirmUi}
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
