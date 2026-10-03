"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";

export default function KycRejectedPage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const items = [
    { ok: true, label: th ? "ข้อมูลพื้นฐาน" : "Basic info" },
    { ok: true, label: th ? "บัตรประชาชน" : "ID card" },
    { ok: false, label: th ? "เซลฟี่คู่บัตร" : "Selfie with ID", note: th ? "ภาพเบลอ มองไม่เห็นหน้าชัด กรุณาถ่ายใหม่ในที่แสงพอ" : "Blurry, face not visible — retake in good light" },
    { ok: true, label: th ? "บัญชีรับเงิน" : "Payout account" },
  ];

  return (
    <>
      <TopBar back="/provider/settings" title={th ? "ผลตรวจ KYC" : "KYC result"} />
      <div className="px-4 py-4 space-y-4 pb-8">
        <div className="glass rounded-3xl p-5 text-center border-crimson-500/30">
          <p className="text-4xl">⚠️</p>
          <p className="font-display text-xl font-semibold mt-2">{th ? "ต้องส่งเอกสารเพิ่ม" : "Resubmission needed"}</p>
          <p className="text-sm text-ink-300 mt-1">{th ? "เกือบเสร็จแล้ว เหลือแก้ไขอีก 1 รายการ" : "Almost there — 1 item to fix"}</p>
        </div>

        <div className="glass rounded-3xl divide-y divide-white/5 overflow-hidden">
          {items.map((it) => (
            <div key={it.label} className="flex items-start gap-3 px-4 py-3">
              <span className={`w-7 h-7 rounded-full grid place-items-center text-sm shrink-0 ${it.ok ? "bg-gold-500/20 text-gold-600" : "bg-crimson-600/20 text-crimson-400"}`}>{it.ok ? "✓" : "!"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{it.label}</p>
                {it.note && <p className="text-xs text-crimson-300 mt-0.5">{it.note}</p>}
              </div>
              <span className={`chip shrink-0 ${it.ok ? "chip-gold" : "chip-red"}`}>{it.ok ? (th ? "ผ่าน" : "OK") : th ? "แก้ไข" : "Fix"}</span>
            </div>
          ))}
        </div>

        <Link href="/provider/apply?step=2" className="btn-crimson h-12 grid place-items-center font-semibold">{th ? "ส่งเอกสารใหม่" : "Resubmit document"}</Link>
        <Link href="/chat" className="min-h-10 flex items-center justify-center text-sm text-ink-300">{th ? "มีคำถาม? คุยกับทีมงาน" : "Questions? Chat with support"}</Link>
      </div>
    </>
  );
}
