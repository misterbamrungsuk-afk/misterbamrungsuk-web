"use client";

import { useEffect, useRef, useState } from "react";
import { CallScreen } from "./call-screen";
import { authBody, callBusy, getJ, inLine, postJ, qs, type CallAuth } from "./engine";
import { primeRingtone, ringMuted, setRingMuted, startRing, stopRing } from "./ringtone";

// รอสายเรียกเข้า: ถาม /api/calls/incoming ทุก 4 วิ เฉพาะตอนเปิดหน้าอยู่ → แสดงแผ่น "สายเรียกเข้า" (รับ / ไม่รับ)
// ลูกค้า: <IncomingCallWatcher /> · Part-Time: <IncomingCallWatcher who="pt" mb={mb} t={t} />
type In = { id: string; booking_id: string; caller_name: string; code: string | null; ring_ends_at: string };

export function IncomingCallWatcher({ who = "customer", mb, t }: { who?: "customer" | "pt"; mb?: string; t?: string }) {
  const auth: CallAuth = { as: who, mb, t };
  const [ring, setRing] = useState<In | null>(null);
  const [active, setActive] = useState<In | null>(null);
  const seen = useRef(new Set<string>());
  const [muted, setMuted] = useState(false);
  // เสียงเรียกเข้าปลดล็อกเมื่อแตะหน้าครั้งแรก · ค่าปิดเสียงจำในเครื่อง
  useEffect(() => { primeRingtone(); setMuted(ringMuted()); }, []);
  const toggleMute = () => { const m = !muted; setMuted(m); setRingMuted(m); };

  useEffect(() => {
    let alive = true, busy = false;
    const load = async () => {
      if (busy || document.visibilityState !== "visible" || callBusy.on) return;
      busy = true;
      const j = await getJ(`/api/calls/incoming?${qs(auth)}`);
      busy = false;
      if (!alive || !j?.ok) return;
      if (j.guest) { clearInterval(iv); return; } // ยังไม่ได้ล็อกอิน = ไม่มีสายเข้า · หยุดถาม
      const list = ((j.calls ?? []) as In[]).filter((c) => !seen.current.has(c.id) && Date.parse(c.ring_ends_at) > Date.now());
      setRing((cur) => (cur && list.some((c) => c.id === cur.id) ? cur : list[0] ?? null));
    };
    void load();
    const iv = setInterval(load, 4000);
    const vis = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", vis);
    return () => { alive = false; clearInterval(iv); document.removeEventListener("visibilitychange", vis); };
  }, [who, mb, t]); // eslint-disable-line react-hooks/exhaustive-deps

  // เสียงเรียกเข้า + สั่นเตือน + ปิดแผ่นเองเมื่อหมดเวลาเรียก · หยุดเสียงเมื่อรับ/ไม่รับ/หมดเวลา (ring = null)
  useEffect(() => {
    if (!ring) return;
    startRing();
    try { navigator.vibrate?.([400, 200, 400, 200, 400]); } catch {}
    const left = Date.parse(ring.ring_ends_at) - Date.now();
    const tm = setTimeout(() => { seen.current.add(ring.id); setRing(null); }, Math.max(0, left));
    return () => { clearTimeout(tm); stopRing(); try { navigator.vibrate?.(0); } catch {} };
  }, [ring]);

  const take = () => { if (!ring) return; seen.current.add(ring.id); setActive(ring); setRing(null); };
  const reject = () => { if (!ring) return; seen.current.add(ring.id); void postJ(`/api/calls/${ring.id}`, { action: "decline", ...authBody(auth) }); setRing(null); };

  if (active) return <CallScreen role="callee" bookingId={active.booking_id} callId={active.id} auth={auth} peerName={active.caller_name} onClose={() => setActive(null)} />;
  if (!ring) return null;
  const line = inLine();
  return (
    <div role="alertdialog" aria-live="assertive" aria-label={`สายเรียกเข้าจาก${ring.caller_name}`} className="fixed inset-x-0 bottom-0 z-[999] flex justify-center" style={{ padding: "0 16px max(16px, env(safe-area-inset-bottom))" }}>
      <div className="w-full max-w-md rounded-[24px] flex flex-col gap-3 text-[#f3ead9] shadow-2xl" style={{ background: "#211a18", border: "1px solid #e8c472", padding: 16 }}>
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-full grid place-items-center text-[20px] font-semibold animate-pulse" style={{ background: "#2c1a1f", color: "#e8c472" }} aria-hidden="true">{ring.caller_name.trim().charAt(0) || "?"}</span>
          <span className="flex-1 min-w-0 flex flex-col">
            <b className="text-[16px] font-medium truncate">สายเรียกเข้าจาก{ring.caller_name}</b>
            <span className="text-[13px] font-light text-[#d9c9b4]">{ring.code ? `นัด ${ring.code} · ` : ""}โทรผ่านแอป</span>
          </span>
          <button type="button" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? "เปิดเสียงเรียกเข้า" : "ปิดเสียงเรียกเข้า"} className="shrink-0 min-h-10 px-3 rounded-full text-[12.5px] text-[#d9c9b4]" style={{ border: "1px solid rgba(243,234,217,.18)" }}>{muted ? "🔕 เสียงปิด" : "🔔 ปิดเสียง"}</button>
        </div>
        {line && <span className="text-[13px] font-light text-[#d9c9b4]">เปิดใน Chrome/Safari เพื่อรับสาย</span>}
        <div className="flex gap-3">
          <button type="button" onClick={reject} className="flex-1 h-12 rounded-full font-semibold text-white" style={{ background: "#c9283d" }}>ไม่รับ</button>
          <button type="button" onClick={take} disabled={line} className="flex-1 h-12 rounded-full font-semibold text-[#1b130b] disabled:opacity-45" style={{ background: "#e8c472" }}>รับสาย</button>
        </div>
      </div>
    </div>
  );
}
