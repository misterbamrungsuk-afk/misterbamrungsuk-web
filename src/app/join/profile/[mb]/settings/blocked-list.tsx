"use client";

// ลูกค้าที่บล็อกไว้ (หน้าตั้งค่า Part-Time) — เลิกบล็อกได้ (ยืนยันในหน้า) · บล็อกเพิ่มได้จากเมนูหัวแชทของนัด
import { useState } from "react";

type Row = { h: string; name: string; code: string; at: string };
const LN = "rgba(243,234,217,0.07)";
const fmt = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit" });

export function BlockedCustomers({ mb, t, init }: { mb: string; t: string; init: Row[] }) {
  const [rows, setRows] = useState(init);
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async (h: string) => {
    setBusy(true); setErr("");
    const r = await fetch("/api/pt/bookings/blocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t, action: "unblock", h }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false); setAsk("");
    if (!d?.ok && r?.status !== 404) return setErr(d?.error || "บันทึกไม่สำเร็จ");
    setRows((x) => x.filter((y) => y.h !== h));
  };
  return (
    <div className="rounded-[20px] bg-[#211a18] flex flex-col gap-2" style={{ padding: 16 }}>
      <div className="text-[17px] font-medium">ลูกค้าที่บล็อก</div>
      <div className="text-[13px] font-light text-[#b5a596] leading-[1.55]">ลูกค้าที่บล็อกจองหรือเรียกด่วนคุณไม่ได้ · แชทและโทรหากันไม่ได้ · บล็อกได้จากหัวแชทของนัด</div>
      {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}</p>}
      {!rows.length ? <div className="text-[14px] font-light text-[#d9c9b4]">ยังไม่ได้บล็อกใคร</div> : rows.map((r) => (
        <div key={r.h} className="flex flex-col gap-2 py-2" style={{ borderTop: `1px solid ${LN}` }}>
          <div className="flex items-center gap-3">
            <span className="flex-1 min-w-0 flex flex-col"><b className="font-medium truncate">{r.name}</b><span className="text-[12px] font-light text-[#b5a596]">นัด {r.code} · บล็อกเมื่อ {fmt(r.at)}</span></span>
            {ask !== r.h && <button type="button" onClick={() => setAsk(r.h)} className="min-h-10 px-3 rounded-full text-[13px] text-[#e8c472]" style={{ border: "1px solid rgba(232,196,114,.4)" }}>เลิกบล็อก</button>}
          </div>
          {ask === r.h && (
            <div role="dialog" aria-label="ยืนยันเลิกบล็อก" className="rounded-[14px] flex flex-col gap-2" style={{ padding: 12, background: "rgba(232,196,114,0.08)", border: "1px solid rgba(232,196,114,.4)" }}>
              <span className="text-[13px] font-light text-[#d9c9b4]">เลิกบล็อก {r.name}? ลูกค้าจองและแชทหาคุณได้อีกครั้ง</span>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setAsk("")} className="h-11 rounded-xl text-[13px]" style={{ border: `1px solid ${LN}` }}>กลับไปก่อน</button>
                <button type="button" disabled={busy} onClick={() => go(r.h)} className="h-11 rounded-xl bg-[#e8c472] text-[#1b130b] text-[13px] font-semibold disabled:opacity-50">{busy ? "กำลังบันทึก…" : "ยืนยันเลิกบล็อก"}</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
