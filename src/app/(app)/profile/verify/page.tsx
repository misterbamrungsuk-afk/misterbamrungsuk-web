"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Toast } from "@/components/ui";

export default function VerifyPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [selfie, setSelfie] = useState(false);
  const [card, setCard] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState("");

  const canSubmit = selfie && card && !done;

  function upload(kind: "selfie" | "card") {
    // demo: จำลองอัปโหลดไฟล์ (โหมดจริง: Supabase Storage bucket ส่วนตัว + signed URL)
    if (kind === "selfie") setSelfie(true); else setCard(true);
    setToast(lang === "th" ? "อัปโหลดรูปแล้ว" : "Uploaded");
    setTimeout(() => setToast(""), 1500);
  }

  function submit() {
    setSubmitting(true);
    setTimeout(() => { setSubmitting(false); setDone(true); }, 900);
  }

  return (
    <>
      <TopBar back="/profile" title={`🛡️ ${t.verifyIdentity}`} />
      <div className="px-4 py-5 space-y-5">
        {/* guide */}
        <section className="glass rounded-2xl p-4 animate-rise">
          <h2 className="section-title mb-2">📷 {t.kycHowTo}</h2>
          <ul className="text-sm text-ink-200 space-y-2">
            {[t.kycRule1, t.kycRule2, t.kycRule3, t.kycRule4].map((r, i) => (
              <li key={i} className="flex gap-2"><span className="text-gold-400">{i + 1}.</span>{r}</li>
            ))}
          </ul>
          <p className="text-[11px] text-ink-500 mt-3">
            🔒 {lang === "th" ? "รูปถูกเก็บแบบส่วนตัว (private bucket) ผู้ดูแลระบบเท่านั้นที่เห็น และลบหลังตรวจสอบ" : "Stored privately, admin-only, deleted after review"}
          </p>
        </section>

        {/* uploads */}
        {done ? (
          <div className="glass rounded-2xl p-8 text-center animate-rise">
            <p className="text-5xl mb-3">⏳</p>
            <p className="font-semibold">{t.kycPending}</p>
            <p className="text-xs text-ink-400 mt-2">{lang === "th" ? "ผลการตรวจจะแจ้งผ่านการแจ้งเตือน" : "Result will be notified"}</p>
            <button onClick={() => router.push("/profile")} className="btn-ghost rounded-xl px-6 py-2.5 text-sm mt-5">{lang === "th" ? "กลับโปรไฟล์" : "Back"}</button>
          </div>
        ) : (
          <div className="grid gap-4">
            {([["selfie", t.kycSelfie, "🤳", selfie], ["card", t.kycCard, "🪪", card]] as const).map(([key, label, icon, ok]) => (
              <button key={key} onClick={() => upload(key)}
                className={`glass rounded-2xl p-8 flex flex-col items-center gap-3 transition ${ok ? "border-emerald-500/50" : "glass-hover"}`}>
                <span className="text-4xl">{icon}</span>
                <span className={`text-sm font-medium ${ok ? "text-emerald-400" : ""}`}>{ok ? "✓ " : ""}{label}</span>
                {!ok && <span className="chip">{lang === "th" ? "แตะเพื่ออัปโหลด" : "Tap to upload"}</span>}
              </button>
            ))}
            <button onClick={submit} disabled={!canSubmit || submitting} className="btn-crimson rounded-xl py-3.5 font-semibold">
              {submitting ? "…" : t.verifyIdentity}
            </button>
          </div>
        )}
      </div>
      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
