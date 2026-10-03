"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Toast } from "@/components/ui";

export default function StrikesPage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useState("");

  const submit = () => {
    setSent(true);
    setToast(th ? "ส่งคำอุทธรณ์แล้ว · ทีมงานตอบภายใน 48 ชม." : "Appeal sent · reply within 48h");
    setTimeout(() => setToast(""), 2400);
  };

  return (
    <>
      <TopBar back="/provider" title={th ? "ใบเตือน" : "Strikes"} />
      <div className="px-4 py-4 space-y-4 pb-8">
        <div className="glass rounded-3xl p-5 text-center">
          <p className="font-display text-4xl font-bold"><span className="text-crimson-400">1</span><span className="text-ink-500">/3</span></p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[0, 1, 2].map((i) => <div key={i} className={`h-2 rounded-full ${i < 1 ? "bg-crimson-500" : "bg-ink-700"}`} />)}
          </div>
          <p className="text-xs text-ink-400 mt-3">{th ? "ครบ 3 ครั้ง บัญชีจะถูกระงับ 30 วัน · ใบเตือนหมดอายุใน 90 วัน" : "3 strikes = 30-day suspension · strikes expire after 90 days"}</p>
        </div>

        <div className="glass rounded-3xl p-4 border-crimson-500/30">
          <div className="flex items-center justify-between gap-2">
            <span className="chip chip-red">{th ? "มาสาย" : "Late arrival"}</span>
            <span className="text-[11px] text-ink-400">22/09/2026</span>
          </div>
          <p className="text-sm mt-2">{th ? "ถึงสถานที่ช้ากว่านัด 35 นาที (ออเดอร์ O-1182)" : "Arrived 35 min late (order O-1182)"}</p>
          <p className="text-xs text-ink-400 mt-1">{th ? "หมดอายุ 21/12/2026" : "Expires 21/12/2026"}</p>
        </div>

        {sent ? (
          <div className="glass rounded-3xl p-5 text-center">
            <p className="text-3xl">📨</p>
            <p className="font-semibold mt-2">{th ? "อยู่ระหว่างพิจารณา" : "Under review"}</p>
            <p className="text-xs text-ink-400 mt-1">{th ? "เราจะแจ้งผลทางแชท" : "We will notify you in chat"}</p>
          </div>
        ) : (
          <div className="glass rounded-3xl p-4 space-y-3">
            <p className="font-semibold text-sm">{th ? "ยื่นอุทธรณ์" : "Appeal"}</p>
            <textarea value={text} onChange={(e) => setText(e.target.value)} className="input-dark h-28 resize-none w-full"
              placeholder={th ? "อธิบายเหตุผล เช่น รถติดจากอุบัติเหตุ แจ้งลูกค้าแล้ว" : "Explain what happened"} aria-label={th ? "เหตุผล" : "Reason"} />
            <label className="flex items-center gap-3 rounded-2xl border border-dashed border-ink-600 p-3 cursor-pointer">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="w-14 h-14 rounded-xl object-cover" />
              ) : <span className="w-14 h-14 rounded-xl grid place-items-center bg-[#3a1208]/[.04] text-2xl">📷</span>}
              <span className="text-sm text-ink-300">{photo ? (th ? "เปลี่ยนรูป" : "Change photo") : th ? "แนบหลักฐาน (ไม่บังคับ)" : "Attach evidence (optional)"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhoto(URL.createObjectURL(f)); }} />
            </label>
            <button onClick={submit} disabled={text.trim().length < 5} className="btn-crimson w-full h-12 font-semibold">
              {text.trim().length < 5 ? (th ? "กรอกเหตุผลก่อน" : "Enter a reason") : th ? "ส่งอุทธรณ์" : "Submit appeal"}
            </button>
          </div>
        )}
      </div>
      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
