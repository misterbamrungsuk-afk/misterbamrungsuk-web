"use client";

import { useEffect, useState } from "react";
import { CallScreen } from "./call-screen";
import { externalHref, getJ, inLine, qs, type CallAuth } from "./engine";

// ปุ่มโทรผ่านแอป (ไม่เห็นเบอร์กัน) — ถามสิทธิ์จากเซิร์ฟเวอร์ · กดไม่ได้ = บอกเหตุผลใต้ปุ่ม
// <CallButton bookingId={b.id} who="customer" peerName={b.pt.nick} />
// <CallButton bookingId={b.id} who="pt" mb={mb} t={t} peerName={b.customer_name ?? "ลูกค้า"} />
export function CallButton({ bookingId, who, mb, t, peerName, label, className = "" }: {
  bookingId: string; who: "customer" | "pt"; mb?: string; t?: string; peerName?: string; label?: string; className?: string;
}) {
  const auth: CallAuth = { as: who, mb, t };
  const [st, setSt] = useState<{ can: boolean; reason: string | null } | null>(null);
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState(false);
  const peer = peerName || (who === "customer" ? "เพื่อน" : "ลูกค้า");

  useEffect(() => {
    let alive = true;
    const load = () => getJ(`/api/calls?booking_id=${encodeURIComponent(bookingId)}&${qs(auth)}`).then((j) => { if (alive && j) setSt({ can: !!j.can, reason: j.reason ?? (j.can ? null : "ยังโทรไม่ได้") }); });
    load();
    const iv = setInterval(() => { if (document.visibilityState === "visible" && !open) load(); }, 60_000);
    return () => { alive = false; clearInterval(iv); };
  }, [bookingId, mb, t, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const press = () => {
    if (inLine()) { setLine(true); return; }
    setOpen(true);
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <button type="button" onClick={press} disabled={!st?.can}
        className="min-h-11 rounded-full flex items-center justify-center gap-2 font-semibold text-[15px] disabled:opacity-45 disabled:cursor-not-allowed"
        style={{ padding: "0 18px", background: st?.can ? "#e8c472" : "#2c2420", color: st?.can ? "#1b130b" : "#d9c9b4" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
        {label ?? `โทรหา${peer}`}
      </button>
      {st && !st.can && st.reason && <span className="text-[12px] font-light text-[#d9c9b4]">{st.reason}</span>}
      {st?.can && !line && <span className="text-[12px] font-light text-[#d9c9b4]">โทรผ่านแอป · ไม่เห็นเบอร์กัน · สายละไม่เกิน 10 นาที</span>}
      {line && (
        <span className="text-[13px] font-light text-[#d9c9b4]">
          เปิดใน Chrome/Safari เพื่อโทร · <a href={externalHref()} target="_blank" rel="noopener" className="underline" style={{ color: "#e8c472" }}>เปิดนอก LINE</a>
        </span>
      )}
      {open && <CallScreen role="caller" bookingId={bookingId} auth={auth} peerName={peer} onClose={() => setOpen(false)} />}
    </div>
  );
}
