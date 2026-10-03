"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import Link from "next/link";
import { Sheet, Toast } from "./ui";

// ── ปุ่มฉุกเฉิน SOS ── โทรเหตุฉุกเฉิน / แชร์ตำแหน่งสด / แจ้งทีมงานทันที
export default function SOSButton() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sent, setSent] = useState(false);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2200); }

  function locate() {
    if (!navigator.geolocation) { flash(lang === "th" ? "อุปกรณ์ไม่รองรับ GPS" : "No GPS"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); flash(lang === "th" ? "ระบุตำแหน่งแล้ว" : "Located"); },
      () => flash(lang === "th" ? "ไม่ได้รับอนุญาตตำแหน่ง" : "Location denied"),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }

  function alertTeam() {
    fetch("/api/sos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: coords?.lat, lng: coords?.lng, at: new Date().toISOString() }),
    }).catch(() => {});
    setSent(true);
    flash(lang === "th" ? "🚨 แจ้งทีมงาน Mister Bamrungsuk แล้ว — เราจะติดต่อกลับทันที" : "🚨 Mister Bamrungsuk team alerted");
  }

  function shareLocation() {
    if (!coords) { locate(); return; }
    const text = `SOS Mister Bamrungsuk — ตำแหน่งของฉัน: https://maps.google.com/?q=${coords.lat},${coords.lng}`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else navigator.clipboard?.writeText(text).then(() => flash(lang === "th" ? "คัดลอกลิงก์ตำแหน่งแล้ว" : "Link copied"));
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="SOS emergency"
        className="fixed right-4 bottom-[104px] z-40 w-14 h-14 rounded-full grid place-items-center font-black text-white text-sm tracking-wider transition-transform active:scale-95"
        style={{
          background: "radial-gradient(circle at 30% 30%, #ff5c6e, #b3243a)",
          boxShadow: "0 0 0 4px rgba(229,72,77,.25), 0 0 24px rgba(229,72,77,.6)",
          animation: "pulseRed 2.4s ease-in-out infinite",
        }}
      >
        SOS
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={`🚨 ${lang === "th" ? "ฉุกเฉิน" : "Emergency"}`}>
        <p className="text-xs text-ink-400 mb-4">{lang === "th" ? "กดปุ่มด้านล่างตามสถานการณ์ — ทีมงานเห็นการแจ้งเตือนทันที" : "Tap below per situation — our team sees alerts instantly"}</p>

        <div className="grid gap-2">
          <a href="tel:191" className="btn-crimson rounded-xl py-3.5 font-semibold text-center">📞 {lang === "th" ? "โทร 191 (ตำรวจ/ฉุกเฉิน)" : "Call 191 (Police)"}</a>
          <a href="tel:1669" className="btn-ghost rounded-xl py-3.5 font-semibold text-center">🏥 {lang === "th" ? "โทร 1669 (การแพทย์ฉุกเฉิน)" : "Call 1669 (Medical)"}</a>
          <button onClick={shareLocation} className="btn-ghost rounded-xl py-3.5 font-semibold">
            📍 {coords
              ? `${lang === "th" ? "แชร์ตำแหน่งของฉัน" : "Share my location"} (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
              : lang === "th" ? "ขอตำแหน่ง GPS แล้วแชร์" : "Get GPS & share"}
          </button>
          <button onClick={alertTeam} disabled={sent} className={`rounded-xl py-3.5 font-semibold ${sent ? "btn-ghost text-emerald-400" : "btn-crimson animate-[pulseRed_2s_ease-in-out_infinite]"}`}>
            {sent ? `✓ ${lang === "th" ? "แจ้งทีมงานแล้ว" : "Team alerted"}` : `🛡️ ${lang === "th" ? "แจ้งทีมงาน Mister Bamrungsuk (พร้อมตำแหน่ง)" : "Alert Mister Bamrungsuk team (with location)"}`}
          </button>
        </div>

        <Link href="/sos" onClick={() => setOpen(false)} className="block text-center text-sm text-crimson-300 underline underline-offset-4 mt-3 py-2">
          {lang === "th" ? "เปิดหน้า SOS เต็มจอ →" : "Open full-screen SOS →"}
        </Link>

        <p className="text-[10px] text-ink-500 mt-4 text-center">
          {lang === "th" ? "ประวัติ SOS ทั้งหมดถูกบันทึกเข้าระบบเพื่อความปลอดภัยของคุณ" : "All SOS events are logged for your safety"}
        </p>
      </Sheet>

      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
