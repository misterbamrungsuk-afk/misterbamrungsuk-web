"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { DEMO_ROOMS } from "@/lib/demo-data";

type Phase = "ringing" | "active" | "ended";

// โทรในแอปซ่อนเบอร์ (WebRTC audio) — signaling ผ่าน Supabase Realtime channel `call:{roomId}`
// โหมด demo: จำลองสาย สามารถเสียบ getUserMedia จริงเมื่อผูก Supabase
export default function CallPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { t, lang } = useI18n();
  const room = DEMO_ROOMS.find((r) => r.id === roomId);
  const [phase, setPhase] = useState<Phase>("ringing");
  const [secs, setSecs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (phase !== "active") return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  async function accept() {
    try {
      // ขอไมค์จริง (ถ้าผู้ใช้อนุญาต) — จำลอง loopback ในโหมด demo
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = s;
    } catch { /* demo: ทำงานได้แม้ไม่อนุญาต */ }
    setPhase("active");
  }

  function hangup() {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    setPhase("ended");
  }

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <main className="app-frame h-dvh flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute -top-20 w-96 h-96 rounded-full bg-crimson-500/15 blur-[120px]" />
      <div className="absolute -bottom-20 w-96 h-96 rounded-full bg-gold-500/10 blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center">
        <div className={`w-32 h-32 rounded-full grid place-items-center bg-gradient-to-br from-ink-700 to-ink-800 border-2 ${phase === "active" ? "border-emerald-500/60" : "border-crimson-500/60"} ${phase === "ringing" ? "animate-[pulseRed_1.6s_ease-in-out_infinite]" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={room?.partner.avatar} alt="" className="w-28 h-28 rounded-full object-cover" />
        </div>
        <h1 className="text-xl font-bold mt-6">{room?.partner.name ?? "Unknown"}</h1>
        <p className="text-sm text-ink-400 mt-1">
          {phase === "ringing" && (lang === "th" ? "กำลังเรียก… (ซ่อนเบอร์ทั้งสองฝ่าย)" : "Ringing… (both numbers hidden)")}
          {phase === "active" && <span className="text-emerald-400">● {mm}:{ss}</span>}
          {phase === "ended" && (lang === "th" ? "จบการสาย" : "Call ended")}
        </p>
        <p className="chip chip-gold mt-3">🔒 WebRTC · {lang === "th" ? "ไม่เปิดเผยเบอร์โทร" : "No phone numbers revealed"}</p>
      </div>

      <div className="absolute bottom-16 z-10 flex gap-5">
        {phase === "ringing" && (
          <>
            <Link href={`/chat/${roomId}`} className="w-14 h-14 rounded-full grid place-items-center bg-ink-600 hover:bg-ink-500 transition text-xl" aria-label="decline">📵</Link>
            <button onClick={accept} className="w-16 h-16 rounded-full grid place-items-center btn-crimson text-2xl animate-[pulseRed_1.6s_ease-in-out_infinite]" aria-label="accept">📞</button>
          </>
        )}
        {phase === "active" && (
          <>
            <button onClick={() => setMuted(!muted)} className={`w-14 h-14 rounded-full grid place-items-center text-xl transition ${muted ? "bg-crimson-600" : "bg-ink-600 hover:bg-ink-500"}`} aria-label="mute">{muted ? "🔇" : "🎙️"}</button>
            <button onClick={hangup} className="w-16 h-16 rounded-full grid place-items-center btn-crimson text-2xl" aria-label="hangup">📵</button>
            <button onClick={() => setSpeaker(!speaker)} className={`w-14 h-14 rounded-full grid place-items-center text-xl transition ${speaker ? "bg-ink-600" : "bg-crimson-600"}`} aria-label="speaker">🔊</button>
          </>
        )}
        {phase === "ended" && (
          <Link href={`/chat/${roomId}`} className="btn-ghost rounded-xl px-6 py-3 text-sm">{t.chat}</Link>
        )}
      </div>
    </main>
  );
}
