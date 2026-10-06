"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Field, Modal } from "@/components/ui";
import { PROVINCES } from "@/lib/categories";

export default function CreateJobPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [role, setRole] = useState<"hirer" | "provider">("hirer");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("2");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState("15:00");
  const [end, setEnd] = useState("17:00");
  const [place, setPlace] = useState("");
  const [province, setProvince] = useState("กรุงเทพมหานคร");
  const [budget, setBudget] = useState("1000");
  const [needVerify, setNeedVerify] = useState(false);

  const valid = title.trim() && place.trim() && +duration > 0;

  function submit() {
    if (!valid) return;
    // demo: บัญชียังไม่ยืนยันตัวตน → เด้ง popup ยืนยัน (ทรง Hafriend)
    setNeedVerify(true);
  }

  return (
    <>
      <TopBar back="/jobs" title={t.createJob} />
      <div className="px-4 py-4 space-y-1">
        <Field label={lang === "th" ? "ฉันเป็น" : "I am"}>
          <div className="flex gap-2">
            <button onClick={() => setRole("hirer")} className={`chip flex-1 py-2.5 text-center ${role === "hirer" ? "chip-gold" : ""}`}>👑 {t.roleHirer}</button>
            <button onClick={() => setRole("provider")} className={`chip flex-1 py-2.5 text-center ${role === "provider" ? "chip-red" : ""}`}>🌟 {t.roleProvider}</button>
          </div>
        </Field>
        <Field label={lang === "th" ? "หัวข้อประกาศ" : "Title"}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-dark" placeholder={role === "hirer" ? (lang === "th" ? "หาเพื่อนกินเที่ยว 3 ชม. แถวสยาม…" : "Looking for a companion for 3h…") : (lang === "th" ? "ว่างวันนี้ ชวนได้…" : "Free today…")} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={lang === "th" ? "จำนวนชม." : "Hours"}>
            <input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} className="input-dark" />
          </Field>
          <Field label={lang === "th" ? "วันที่" : "Date"}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-dark" />
          </Field>
          <div className="col-span-2"><Field label={lang === "th" ? "เวลา" : "Time"}>
            <div className="flex gap-2 items-center">
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="input-dark !px-2" />
              <span className="text-ink-400 text-xs">–</span>
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="input-dark !px-2" />
            </div>
          </Field></div>
        </div>
        <Field label={t.jobPlace}>
          <input value={place} onChange={(e) => setPlace(e.target.value)} className="input-dark" placeholder={lang === "th" ? "เช่น สยามสแควร์วัน / BTS อ่อนนุช" : "e.g. Siam Square One"} />
        </Field>
        <Field label={t.province}>
          <select value={province} onChange={(e) => setProvince(e.target.value)} className="input-dark">
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label={t.jobBudget}>
          <input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} className="input-dark" />
        </Field>

        <button onClick={submit} disabled={!valid} className="btn-crimson w-full rounded-xl py-3.5 font-semibold mt-2">
          {t.send}
        </button>
      </div>

      <Modal open={needVerify} onClose={() => setNeedVerify(false)} title="🔒">
        <div className="text-center py-2">
          <p className="text-4xl mb-3">🛡️</p>
          <p className="font-semibold">{lang === "th" ? "เพื่อความปลอดภัยของทุกท่าน" : "For everyone's safety"}</p>
          <p className="text-sm text-ink-300 mt-1">{t.needVerify}</p>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setNeedVerify(false)} className="btn-ghost rounded-xl flex-1 py-2.5 text-sm">{t.cancel}</button>
            <button onClick={() => router.push("/profile/verify")} className="btn-crimson rounded-xl flex-1 py-2.5 text-sm font-semibold">{t.verifyNow}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
