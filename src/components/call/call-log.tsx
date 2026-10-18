"use client";

import { useEffect, useState } from "react";

// หลังบ้าน: ประวัติการโทรของนัด (เวลา · ผู้โทร · ความยาว · ผลสาย) — <CallLog bookingId={b.id} />
type Row = { id: string; caller_type: "customer" | "parttime"; caller_name: string | null; status: string; end_reason: string | null; created_at: string; answered_at: string | null; duration_s: number | null };
const RESULT: Record<string, string> = { ringing: "กำลังเรียก", active: "กำลังคุย", ended: "คุยแล้ว", missed: "ไม่ได้รับ", declined: "ปฏิเสธ" };
const REASON: Record<string, string> = { timeout: "ไม่มีผู้รับใน 45 วิ", cancelled: "ผู้โทรยกเลิก", max: "ครบ 10 นาที", failed: "ต่อไม่สำเร็จ", caller: "ผู้โทรวาง", callee: "ผู้รับวาง", declined: "" };
const when = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const dur = (s: number | null) => (s == null ? "–" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

export function CallLog({ bookingId }: { bookingId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/calls/admin?booking_id=${encodeURIComponent(bookingId)}`, { cache: "no-store" })
      .then((r) => r.json()).then((j) => (j?.ok ? setRows(j.calls) : setErr("โหลดประวัติการโทรไม่ได้"))).catch(() => setErr("โหลดประวัติการโทรไม่ได้"));
  }, [bookingId]);
  return (
    <section className="flex flex-col gap-2">
      <b className="text-[14px] font-medium">ประวัติการโทร</b>
      {err ? <span className="text-[13px] text-[#c9283d]">{err}</span>
        : !rows ? <span className="text-[13px] font-light opacity-70">กำลังโหลด…</span>
        : !rows.length ? <span className="text-[13px] font-light opacity-70">ยังไม่มีการโทรในนัดนี้</span>
        : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead><tr className="text-left opacity-70"><th className="py-1 pr-3 font-normal">เวลา</th><th className="py-1 pr-3 font-normal">ผู้โทร</th><th className="py-1 pr-3 font-normal">ความยาว</th><th className="py-1 font-normal">ผลสาย</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-current/10">
                    <td className="py-1.5 pr-3 whitespace-nowrap">{when(r.created_at)}</td>
                    <td className="py-1.5 pr-3">{r.caller_type === "customer" ? "ลูกค้า" : "Part-Time"}{r.caller_name ? ` · ${r.caller_name}` : ""}</td>
                    <td className="py-1.5 pr-3" style={{ fontVariantNumeric: "tabular-nums" }}>{dur(r.duration_s)}</td>
                    <td className="py-1.5">{RESULT[r.status] ?? r.status}{r.end_reason && REASON[r.end_reason] ? ` · ${REASON[r.end_reason]}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </section>
  );
}
