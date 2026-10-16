"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui";
import { baht } from "@/lib/partner/config";
import { BOOKING_LABEL, BOOKING_STATUSES, split, type BookingStatus, type PartnerBooking } from "@/lib/partner/portal-types";

const when = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const TONE: Record<BookingStatus, string> = {
  pending: "text-gold-300 border-gold-500/50", confirmed: "text-emerald-300 border-emerald-500/50", full: "text-crimson-300 border-crimson-500/50",
  done: "text-ink-300 border-ink-500", cancelled: "text-[#9a8a85] border-ink-600",
};

export function BookingsClient({ initial, rooms, partnerPct }: { initial: PartnerBooking[]; rooms: string[]; partnerPct: number | null }) {
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<BookingStatus>("pending");
  const [openId, setOpenId] = useState<string | null>(null);
  const [room, setRoom] = useState(rooms[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const shown = rows.filter((b) => b.status === tab);
  const sel = rows.find((b) => b.id === openId) ?? null;
  const pct = sel ? sel.platform_pct ?? partnerPct : null;
  const sp = sel ? split(sel.amount, pct) : null;

  const open = (b: PartnerBooking) => {
    setOpenId(b.id);
    setRoom(b.room && rooms.includes(b.room) ? b.room : rooms[0]);
    setErr("");
  };
  const act = async (action: "confirm" | "full") => {
    if (!sel) return;
    setBusy(true);
    setErr("");
    const res = await fetch(`/api/partner/bookings/${sel.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, room }) }).catch(() => null);
    const out = (await res?.json().catch(() => ({}))) as { ok?: boolean; row?: PartnerBooking; error?: string } | undefined;
    setBusy(false);
    if (!out?.ok || !out.row) return setErr(out?.error ?? "ทำรายการไม่สำเร็จ");
    setRows((rs) => rs.map((x) => (x.id === out.row!.id ? out.row! : x)));
    setOpenId(null);
  };

  return (
    <>
      <div className="flex gap-2 overflow-x-auto no-scrollbar mt-4 pb-1" role="tablist">
        {BOOKING_STATUSES.map((s) => (
          <button key={s} role="tab" aria-selected={tab === s} onClick={() => setTab(s)} className={`chip whitespace-nowrap h-9 px-3.5 ${tab === s ? "chip-red" : ""}`}>
            {BOOKING_LABEL[s]} · {rows.filter((b) => b.status === s).length}
          </button>
        ))}
      </div>

      {shown.length === 0 ? <p className="text-sm text-[#9a8a85] mt-8 text-center">ไม่มีรายการในหมวดนี้</p> : (
        <ul className="mt-4 space-y-2">
          {shown.map((b) => (
            <li key={b.id}>
              <button onClick={() => open(b)} className="w-full text-left rounded-2xl border border-ink-600 bg-ink-800/60 px-4 py-3 hover:border-gold-500 flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{b.parttime_name}</p>
                  <p className="text-xs text-ink-300 truncate">ลูกค้า {b.customer_name} · {b.hours} ชม.{b.room ? ` · ${b.room}` : ""}</p>
                  <p className="text-xs text-[#9a8a85] mt-0.5">{when(b.start_time)} · {b.booking_ref}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-gold-300">฿{baht(b.amount)}</p>
                  <span className={`inline-block mt-1 text-[11px] border rounded-full px-2 py-0.5 ${TONE[b.status]}`}>{BOOKING_LABEL[b.status]}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!sel} onClose={() => setOpenId(null)} title={sel ? `การจอง ${sel.booking_ref}` : ""}>
        {sel && (
          <div className="text-sm">
            <div className="flex justify-between gap-3">
              <div><p className="font-semibold text-base">{sel.parttime_name}</p><p className="text-ink-300">ลูกค้า {sel.customer_name} · {sel.hours} ชม.</p></div>
              <span className={`h-fit text-[11px] border rounded-full px-2 py-0.5 ${TONE[sel.status]}`}>{BOOKING_LABEL[sel.status]}</span>
            </div>
            <dl className="grid grid-cols-[90px_1fr] gap-y-1.5 mt-4">
              <dt className="text-ink-300">วัน-เวลา</dt><dd>{when(sel.start_time)}</dd>
              <dt className="text-ink-300">บริการเสริม</dt><dd>{sel.addon || "—"}</dd>
              {sel.room && <><dt className="text-ink-300">ห้อง</dt><dd>{sel.room}</dd></>}
            </dl>

            {(sel.status === "pending" || sel.status === "confirmed") && (
              <>
                <p className="text-ink-300 mt-5 mb-2">จัดห้อง</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="เลือกห้อง">
                  {rooms.map((r) => (
                    <button key={r} role="radio" aria-checked={room === r} onClick={() => setRoom(r)} className={`chip h-9 px-3.5 ${room === r ? "chip-gold" : ""}`}>{r}</button>
                  ))}
                </div>
              </>
            )}

            <div className="mt-5 rounded-2xl bg-ink-900/60 px-4 py-3 space-y-1.5">
              <div className="flex justify-between"><span className="text-ink-300">ยอดค่าห้อง/บริการ</span><span className="font-display">฿{baht(sel.amount)}</span></div>
              <div className="flex justify-between"><span className="text-ink-300">หักแพลตฟอร์ม {pct == null ? "[รอกำหนด]" : `${pct}`}%</span><span className="font-display">{sp ? `-฿${baht(sp.fee)}` : "[รอกำหนด]"}</span></div>
              <div className="flex justify-between border-t border-ink-600 pt-1.5"><span>ร้านได้รับ</span><span className="font-display text-gold-300">{sp ? `฿${baht(sp.net)}` : "คำนวณเมื่อกำหนด %"}</span></div>
            </div>

            {err && <p role="alert" className="text-crimson-300 mt-3">{err}</p>}
            {(sel.status === "pending" || sel.status === "confirmed") ? (
              <div className="grid grid-cols-2 gap-2 mt-5">
                <button disabled={busy} onClick={() => act("full")} className="btn-ghost min-h-12 rounded-full">แจ้งห้องเต็ม</button>
                <button disabled={busy} onClick={() => act("confirm")} className="btn-crimson min-h-12 rounded-full font-semibold">ยืนยัน · {room}</button>
              </div>
            ) : (
              <button onClick={() => setOpenId(null)} className="btn-ghost w-full min-h-12 rounded-full mt-5">ปิด</button>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
