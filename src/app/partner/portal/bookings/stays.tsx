"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui";
import { STAY_LABEL, bahtTxt, staySplit, thDate, thTime, type StayBooking, type StayStatus } from "@/lib/hotels/types";

// การจองห้องพักของโรงแรม (พอร์ทัลพาร์ทเนอร์) — รอยืนยัน → ยืนยัน / ปฏิเสธ (คืนเงินลูกค้าเต็ม)
const TABS: { key: string; label: string; has: StayStatus[] }[] = [
  { key: "pending", label: "รอยืนยัน", has: ["pending"] },
  { key: "confirmed", label: "ยืนยันแล้ว", has: ["confirmed"] },
  { key: "done", label: "เข้าพักแล้ว", has: ["completed"] },
  { key: "closed", label: "ยกเลิก/คืนเงิน", has: ["declined", "expired", "cancelled", "refunded"] },
];
const TONE: Partial<Record<StayStatus, string>> = { pending: "text-gold-300 border-gold-500/50", confirmed: "text-emerald-300 border-emerald-500/50", completed: "text-ink-300 border-ink-500" };

export function StaysClient({ initial }: { initial: StayBooking[] }) {
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState("pending");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [askDecline, setAskDecline] = useState(false);
  const [reason, setReason] = useState("ห้องเต็มในวันที่เลือก");

  const cur = TABS.find((t) => t.key === tab)!;
  const shown = rows.filter((b) => cur.has.includes(b.status));
  const sel = rows.find((b) => b.id === openId) ?? null;
  const sp = sel ? staySplit(sel.total_satang, sel.platform_pct) : null;

  const act = async (action: "confirm" | "decline") => {
    if (!sel) return;
    setBusy(true); setErr("");
    const res = await fetch(`/api/partner/stays/${sel.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }) }).catch(() => null);
    const out = (await res?.json().catch(() => ({}))) as { ok?: boolean; row?: StayBooking; error?: string } | undefined;
    setBusy(false);
    if (!out?.ok || !out.row) return setErr(out?.error ?? "ทำรายการไม่สำเร็จ");
    setRows((rs) => rs.map((x) => (x.id === out.row!.id ? out.row! : x)));
    setAskDecline(false); setOpenId(null);
  };

  return (
    <section aria-label="การจองห้องพัก" className="mt-4">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`chip whitespace-nowrap h-9 px-3.5 ${tab === t.key ? "chip-red" : ""}`}>
            {t.label} · {rows.filter((b) => t.has.includes(b.status)).length}
          </button>
        ))}
      </div>
      {shown.length === 0 ? <p className="text-sm text-[#9a8a85] mt-6 text-center">ไม่มีรายการในหมวดนี้</p> : (
        <ul className="mt-3 space-y-2">
          {shown.map((b) => (
            <li key={b.id}>
              <button onClick={() => { setOpenId(b.id); setErr(""); setAskDecline(false); }} className="w-full text-left rounded-2xl border border-ink-600 bg-ink-800/60 px-4 py-3 hover:border-gold-500 flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{b.room_name} × {b.rooms}</p>
                  <p className="text-xs text-ink-300 truncate">คุณ{b.guest_name} · {b.guests} คน · {b.nights} คืน</p>
                  <p className="text-xs text-[#9a8a85] mt-0.5">{thDate(b.check_in, { day: "numeric", month: "short" })} – {thDate(b.check_out, { day: "numeric", month: "short", year: "numeric" })} · {b.code}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-gold-300">{bahtTxt(b.total_satang)}</p>
                  <span className={`inline-block mt-1 text-[11px] border rounded-full px-2 py-0.5 ${TONE[b.status] ?? "text-[#9a8a85] border-ink-600"}`}>{STAY_LABEL[b.status]}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!sel} onClose={() => setOpenId(null)} title={sel ? `การจองห้อง ${sel.code}` : ""}>
        {sel && sp && (
          <div className="text-sm">
            <dl className="grid grid-cols-[100px_1fr] gap-y-1.5">
              <dt className="text-ink-300">ผู้เข้าพัก</dt><dd>คุณ{sel.guest_name} · {sel.guests} คน</dd>
              <dt className="text-ink-300">ห้อง</dt><dd>{sel.room_name} × {sel.rooms} ห้อง</dd>
              <dt className="text-ink-300">เช็กอิน</dt><dd>{thDate(sel.check_in)} · 14:00</dd>
              <dt className="text-ink-300">เช็กเอาต์</dt><dd>{thDate(sel.check_out)} · 12:00</dd>
              <dt className="text-ink-300">ฝากบอก</dt><dd className="whitespace-pre-wrap [overflow-wrap:anywhere]">{sel.note || "—"}</dd>
              <dt className="text-ink-300">สถานะ</dt><dd>{STAY_LABEL[sel.status]}</dd>
              {sel.status === "pending" && <><dt className="text-ink-300">ตอบภายใน</dt><dd className="text-gold-300">{thTime(sel.expires_at)}</dd></>}
            </dl>
            <div className="mt-4 rounded-2xl bg-ink-900/60 px-4 py-3 space-y-1.5">
              <div className="flex justify-between"><span className="text-ink-300">{bahtTxt(sel.price_satang)} × {sel.nights} คืน × {sel.rooms} ห้อง</span><span className="font-display">{bahtTxt(sel.total_satang)}</span></div>
              <div className="flex justify-between"><span className="text-ink-300">หักแพลตฟอร์ม {sel.platform_pct}%</span><span className="font-display">-{bahtTxt(sp.fee)}</span></div>
              <div className="flex justify-between border-t border-ink-600 pt-1.5"><span>ร้านได้รับ (หลังเช็กเอาต์)</span><span className="font-display text-gold-300">{bahtTxt(sp.net)}</span></div>
            </div>
            {err && <p role="alert" className="text-crimson-300 mt-3">{err}</p>}
            {sel.status === "pending" ? (
              askDecline ? (
                <div role="alertdialog" aria-label="ยืนยันปฏิเสธการจอง" className="mt-4 rounded-2xl border border-crimson-500/60 bg-crimson-500/10 p-3">
                  <p className="text-sm">ปฏิเสธการจอง {sel.code}? ลูกค้าจะได้เงินคืนเต็มจำนวนทันที</p>
                  <label className="block text-xs text-ink-300 mt-2 mb-1" htmlFor="dr">เหตุผล (ลูกค้าเห็น)</label>
                  <input id="dr" className="input-dark w-full" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button disabled={busy} onClick={() => setAskDecline(false)} className="btn-ghost min-h-12 rounded-full">ไม่ใช่ กลับ</button>
                    <button disabled={busy} onClick={() => act("decline")} className="btn-crimson min-h-12 rounded-full font-semibold">{busy ? "กำลังทำรายการ…" : "ยืนยัน ปฏิเสธ"}</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button disabled={busy} onClick={() => setAskDecline(true)} className="btn-ghost min-h-12 rounded-full">ปฏิเสธ</button>
                  <button disabled={busy} onClick={() => act("confirm")} className="btn-crimson min-h-12 rounded-full font-semibold">{busy ? "กำลังยืนยัน…" : "ยืนยันการจอง"}</button>
                </div>
              )
            ) : (
              <button onClick={() => setOpenId(null)} className="btn-ghost w-full min-h-12 rounded-full mt-4">ปิด</button>
            )}
          </div>
        )}
      </Sheet>
    </section>
  );
}
