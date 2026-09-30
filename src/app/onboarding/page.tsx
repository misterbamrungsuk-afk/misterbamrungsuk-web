"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { Logo } from "@/components/ui";

export default function OnboardingPage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const router = useRouter();
  const [i, setI] = useState(0);
  const startX = useRef<number | null>(null);
  const slides = [
    { icon: "💆‍♂️", t: th ? "หมอนวดชายมืออาชีพ" : "Professional therapists", d: th ? "ทุกคนยืนยันตัวตนและใบรับรองแล้ว" : "Every therapist is verified and certified" },
    { icon: "🔒", t: th ? "จ่ายผ่านระบบกลาง" : "Secure escrow", d: th ? "เงินของคุณถูกกันไว้จนกว่างานจะเสร็จ" : "Your money is held until the job is done" },
    { icon: "📍", t: th ? "ติดตามสดและปุ่ม SOS" : "Live tracking & SOS", d: th ? "รู้ตำแหน่งหมอ และขอความช่วยเหลือได้ทันที" : "See where your therapist is and get help instantly" },
  ];
  const last = i === slides.length - 1;
  const next = () => (last ? router.push("/home") : setI(i + 1));
  const s = slides[i];

  return (
    <main
      className="min-h-dvh bg-ink-950 text-ink-100 flex flex-col mx-auto max-w-[480px] px-5 pb-8 overflow-x-hidden"
      onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (startX.current == null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        if (dx < -50 && !last) setI(i + 1);
        if (dx > 50 && i > 0) setI(i - 1);
        startX.current = null;
      }}
    >
      <div className="flex items-center justify-between h-16">
        <Logo size={26} />
        <Link href="/home" className="text-sm text-ink-300 px-3 h-10 inline-flex items-center">{th ? "ข้าม" : "Skip"}</Link>
      </div>
      <div key={i} className="flex-1 flex flex-col items-center justify-center text-center animate-rise">
        <div className="w-40 h-40 rounded-full glass grid place-items-center text-6xl">{s.icon}</div>
        <p className="text-xs font-semibold tracking-[0.18em] text-gold-500 mt-8">STEP {i + 1} / {slides.length}</p>
        <h1 className="font-display text-2xl font-bold mt-2">{s.t}</h1>
        <p className="text-ink-300 mt-2 max-w-xs">{s.d}</p>
      </div>
      <div className="flex justify-center gap-2 mb-6">
        {slides.map((_, k) => (
          <button key={k} onClick={() => setI(k)} aria-label={`slide ${k + 1}`} className="h-9 px-1 grid place-items-center">
            <span className={`block h-2 rounded-full transition-all ${k === i ? "w-6 bg-gold-500" : "w-2 bg-ink-500"}`} />
          </button>
        ))}
      </div>
      <button onClick={next} className="btn-crimson rounded-full h-14 font-semibold">
        {last ? (th ? "เริ่มใช้งาน" : "Get started") : th ? "ถัดไป" : "Next"}
      </button>
    </main>
  );
}
