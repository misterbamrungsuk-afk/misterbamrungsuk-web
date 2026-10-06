"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Toast } from "@/components/ui";
import { BANKS, CATEGORIES } from "@/lib/categories";

function UploadTile({ label, src, onFile }: { label: string; src: string | null; onFile: (url: string) => void }) {
  return (
    <label className="glass rounded-3xl p-3 flex flex-col items-center gap-2 cursor-pointer min-w-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="w-full aspect-[4/3] rounded-2xl object-cover" />
      ) : (
        <span className="w-full aspect-[4/3] rounded-2xl border border-dashed border-ink-600 grid place-items-center text-3xl">📷</span>
      )}
      <span className="text-xs text-center">{label}</span>
      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(URL.createObjectURL(f)); }} />
    </label>
  );
}

function ApplyInner() {
  const { lang } = useI18n();
  const th = lang === "th";
  const sp = useSearchParams();
  const init = Math.min(3, Math.max(1, Number(sp.get("step") ?? 1) || 1));
  const [step, setStep] = useState(init);
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [years, setYears] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [idCard, setIdCard] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [bank, setBank] = useState(BANKS[0].code);
  const [acct, setAcct] = useState("");
  const [acctName, setAcctName] = useState("");
  const [toast, setToast] = useState("");

  const ok = step === 1 ? name.trim() && phone.trim() && skills.length > 0 : step === 2 ? idCard && selfie : acct.trim().length >= 10 && acctName.trim();
  const next = () => {
    if (!ok) {
      setToast(th ? "กรอกข้อมูลให้ครบก่อน" : "Please complete this step");
      setTimeout(() => setToast(""), 1800);
      return;
    }
    if (step < 3) setStep(step + 1);
    else setDone(true);
  };

  if (done) {
    return (
      <>
        <TopBar back="/provider" title={th ? "สมัคร Part-Time" : "Become a Part-Time"} />
        <div className="px-4 py-10 flex flex-col items-center text-center gap-3">
          <p className="text-6xl">🎉</p>
          <h1 className="font-display text-2xl font-semibold">{th ? "ส่งใบสมัครแล้ว" : "Application submitted"}</h1>
          <p className="text-sm text-ink-300">{th ? "ทีมงานจะตรวจสอบเอกสารภายใน 24–48 ชม. และแจ้งผลทางแชท" : "We review documents within 24–48h and notify you in chat"}</p>
          <div className="w-full flex flex-col gap-2 mt-4">
            <Link href="/provider" className="btn-crimson h-12 grid place-items-center font-semibold">{th ? "ไปแดชบอร์ด" : "Go to dashboard"}</Link>
            <Link href="/chat" className="btn-ghost h-12 rounded-full grid place-items-center text-sm">{th ? "ติดต่อทีมงาน" : "Contact support"}</Link>
          </div>
        </div>
      </>
    );
  }

  const titles = th ? ["ข้อมูลพื้นฐาน", "ยืนยันตัวตน", "บัญชีรับเงิน"] : ["Basic info", "Identity", "Payout"];

  return (
    <>
      <TopBar back="/provider" title={th ? "สมัคร Part-Time" : "Become a Part-Time"} />
      <div className="px-4 py-4 space-y-4 pb-8">
        <div className="grid grid-cols-3 gap-2">
          {titles.map((t, i) => (
            <button key={t} onClick={() => i + 1 < step && setStep(i + 1)} className="text-left min-w-0 min-h-9">
              <div className={`h-1.5 rounded-full ${i + 1 <= step ? "bg-crimson-500" : "bg-ink-700"}`} />
              <p className={`text-[11px] mt-1 truncate ${i + 1 === step ? "text-ink-100" : "text-ink-400"}`}>{i + 1}. {t}</p>
            </button>
          ))}
        </div>

        {step === 1 && (
          <div className="glass rounded-3xl p-4 space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-dark w-full min-w-0" placeholder={th ? "ชื่อ-นามสกุล" : "Full name"} aria-label={th ? "ชื่อ" : "Name"} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="input-dark w-full min-w-0" placeholder={th ? "เบอร์โทร" : "Phone"} aria-label={th ? "เบอร์โทร" : "Phone"} />
            <input value={years} onChange={(e) => setYears(e.target.value)} inputMode="numeric" className="input-dark w-full min-w-0" placeholder={th ? "ประสบการณ์ (ปี)" : "Experience (years)"} aria-label={th ? "ประสบการณ์" : "Experience"} />
            <p className="text-sm pt-1">{th ? "ความถนัด (เลือกได้หลายอย่าง)" : "Skills (pick any)"}</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const on = skills.includes(c.slug);
                return (
                  <button key={c.slug} onClick={() => setSkills(on ? skills.filter((s) => s !== c.slug) : [...skills, c.slug])} aria-pressed={on}
                    className={`chip h-9 px-3.5 ${on ? "chip-red" : ""}`}>{th ? c.th : c.en}</button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <UploadTile label={th ? "บัตรประชาชน (ด้านหน้า)" : "ID card (front)"} src={idCard} onFile={setIdCard} />
              <UploadTile label={th ? "เซลฟี่คู่บัตร" : "Selfie with ID"} src={selfie} onFile={setSelfie} />
            </div>
            <p className="text-xs text-ink-400">{th ? "ถ่ายให้เห็นข้อความชัด ไม่มีแสงสะท้อน · ข้อมูลใช้เพื่อยืนยันตัวตนเท่านั้น" : "Make text readable, no glare · used only for verification"}</p>
          </>
        )}

        {step === 3 && (
          <div className="glass rounded-3xl p-4 space-y-3">
            <select value={bank} onChange={(e) => setBank(e.target.value)} className="input-dark w-full min-w-0" aria-label={th ? "ธนาคาร" : "Bank"}>
              {BANKS.map((b) => <option key={b.code} value={b.code}>{th ? b.name : b.en}</option>)}
            </select>
            <input value={acct} onChange={(e) => setAcct(e.target.value.replace(/[^0-9-]/g, ""))} inputMode="numeric" className="input-dark w-full min-w-0" placeholder={th ? "เลขบัญชี" : "Account number"} aria-label={th ? "เลขบัญชี" : "Account number"} />
            <input value={acctName} onChange={(e) => setAcctName(e.target.value)} className="input-dark w-full min-w-0" placeholder={th ? "ชื่อบัญชี (ตรงกับบัตร)" : "Account name (as on ID)"} aria-label={th ? "ชื่อบัญชี" : "Account name"} />
          </div>
        )}

        <div className="flex gap-2">
          {step > 1 && <button onClick={() => setStep(step - 1)} className="btn-ghost h-12 rounded-full px-5 text-sm">{th ? "ย้อนกลับ" : "Back"}</button>}
          <button onClick={next} className={`btn-crimson flex-1 h-12 font-semibold ${ok ? "" : "opacity-60"}`}>
            {step < 3 ? (th ? "ถัดไป" : "Next") : th ? "ส่งใบสมัคร" : "Submit"}
          </button>
        </div>
      </div>
      <Toast show={!!toast} tone="red">{toast}</Toast>
    </>
  );
}

export default function ApplyPage() {
  return <Suspense><ApplyInner /></Suspense>;
}
