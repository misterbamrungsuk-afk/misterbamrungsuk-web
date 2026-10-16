"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";

type Coords = { lat: number; lng: number } | null;

export default function SOSPage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const router = useRouter();
  const [coords, setCoords] = useState<Coords>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  async function send() {
    setStatus("sending");
    try {
      const r = await fetch("/api/sos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: coords?.lat, lng: coords?.lng, at: new Date().toISOString() }),
      });
      setStatus(r.ok ? "sent" : "error");
    } catch { setStatus("error"); }
  }

  function start() {
    if (status === "sent" || status === "sending" || countdown != null) return;
    let n = 3;
    setCountdown(n);
    timer.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        setCountdown(null);
        send();
      } else setCountdown(n);
    }, 1000);
  }

  function cancel() {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    if (countdown != null) { setCountdown(null); return; }
    if (window.history.length > 1) router.back(); else router.push("/home");
  }

  function share() {
    if (!coords) { setMsg(th ? "ยังไม่ได้ตำแหน่ง GPS" : "No GPS location yet"); return; }
    const text = `SOS Mister Bamrungsuk — ${th ? "ตำแหน่งของฉัน" : "my location"}: https://maps.google.com/?q=${coords.lat},${coords.lng}`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else navigator.clipboard?.writeText(text).then(() => setMsg(th ? "คัดลอกลิงก์ตำแหน่งแล้ว" : "Location link copied"));
  }

  const label = status === "sent" ? (th ? "ส่งแล้ว" : "Sent") : status === "sending" ? "…" : countdown != null ? String(countdown) : "SOS";

  return (
    <main className="mb-v7 min-h-dvh mx-auto max-w-[480px] px-5 py-6 flex flex-col overflow-x-hidden" style={{ background: "#171211", color: "#f3ead9" }}>
      <p className="text-xs font-semibold tracking-[0.18em] text-[#ff8a9a] text-center">EMERGENCY</p>
      <h1 className="font-display text-2xl font-bold text-center mt-1">
        {status === "sent" ? (th ? "แจ้งทีมงานแล้ว" : "Team alerted") : countdown != null ? (th ? "กำลังส่ง SOS" : "Sending SOS") : (th ? "ขอความช่วยเหลือฉุกเฉิน" : "Emergency help")}
      </h1>
      <p className="text-sm text-[#9a8a85] text-center mt-1">
        {status === "sent" ? (th ? "ทีมงาน Mister Bamrungsuk จะติดต่อกลับทันที" : "The Mister Bamrungsuk team will contact you right away")
          : countdown != null ? (th ? "แตะยกเลิกได้ภายในเวลาที่เหลือ" : "Tap cancel before time runs out")
          : (th ? "แตะปุ่มเพื่อส่ง SOS (ยกเลิกได้ใน 3 วินาที)" : "Tap to send SOS (3s to cancel)")}
      </p>

      <div className="flex justify-center my-8">
        <button
          onClick={start}
          disabled={status === "sending" || status === "sent"}
          aria-label="Send SOS"
          className="w-52 h-52 max-w-[70vw] max-h-[70vw] rounded-full grid place-items-center font-display font-black text-white text-5xl transition-transform active:scale-95"
          style={{
            background: status === "sent" ? "radial-gradient(circle at 30% 30%, #34d399, #047857)" : "radial-gradient(circle at 30% 30%, #ff5c6e, #b3243a)",
            boxShadow: "0 0 0 10px rgba(229,72,77,.18), 0 0 60px rgba(229,72,77,.6)",
            animation: status === "sent" ? undefined : "pulseRed 2.4s ease-in-out infinite",
          }}
        >
          {label}
        </button>
      </div>
      {status === "error" && (
        <p className="text-center text-crimson-300 text-sm mb-3">
          {th ? "ส่งไม่สำเร็จ — โปรดโทร 191 ทันที" : "Failed to send — please call 191 now"}
          <button onClick={send} className="underline ml-2 h-9">{th ? "ลองใหม่" : "Retry"}</button>
        </p>
      )}

      <div className="glass rounded-3xl p-4 text-sm">
        <div className="flex items-center justify-between gap-2 py-2 border-b border-ink-600">
          <span>📍 {th ? "ตำแหน่งสดให้แอดมิน" : "Live location to admin"}</span>
          <span className={coords ? "text-[#4ade80]" : "text-[#d9a95a]"}>{coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : th ? "ยังไม่ได้ตำแหน่ง · อนุญาต GPS" : "No GPS yet · allow location"}</span>
        </div>
        <div className="flex items-center justify-between gap-2 py-2">
          <span>🛡️ {th ? "บันทึกเหตุการณ์เข้าระบบ" : "Event logged"}</span>
          <span className="text-[#4ade80]">{th ? "พร้อม" : "Ready"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <a href="tel:191" className="btn-crimson rounded-full h-12 grid place-items-center font-semibold">📞 191 {th ? "ตำรวจ" : "Police"}</a>
        <a href="tel:1669" className="btn-ghost rounded-full h-12 grid place-items-center font-semibold">🏥 1669 {th ? "แพทย์" : "Medical"}</a>
      </div>
      <button onClick={share} className="btn-ghost rounded-full h-12 font-semibold mt-3">📤 {th ? "แชร์ตำแหน่งของฉัน" : "Share my location"}</button>
      {msg && <p className="text-center text-xs text-gold-300 mt-2">{msg}</p>}
      <button onClick={cancel} className="mt-auto pt-6 text-ink-300 h-12 font-semibold">
        {countdown != null ? (th ? "ยกเลิก SOS" : "Cancel SOS") : th ? "← กลับ" : "← Back"}
      </button>
    </main>
  );
}
