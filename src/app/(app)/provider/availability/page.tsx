"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Toast } from "@/components/ui";
import { Toggle } from "../_components/toggle";

const DAYS = { th: ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"], en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] };


export default function AvailabilityPage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const [days, setDays] = useState(DAYS.en.map((_, i) => ({ on: i !== 2, start: i >= 5 ? "10:00" : "17:00", end: i >= 5 ? "22:00" : "23:00" })));
  const [radius, setRadius] = useState(8);
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState("");

  const upd = (i: number, patch: Partial<{ on: boolean; start: string; end: string }>) => setDays(days.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const save = () => {
    setToast(th ? "บันทึกเวลาว่างแล้ว" : "Availability saved");
    setTimeout(() => setToast(""), 2000);
  };

  return (
    <>
      <TopBar back="/provider" title={th ? "เวลาว่าง & พื้นที่" : "Availability"} />
      <div className="px-4 py-4 space-y-4 pb-8">
        <div className="glass rounded-3xl p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{th ? "พักรับงานชั่วคราว" : "Pause new jobs"}</p>
            <p className="text-xs text-ink-400">{paused ? (th ? "ลูกค้าจะไม่เห็นคุณ" : "Hidden from customers") : th ? "กำลังเปิดรับงาน" : "Accepting jobs"}</p>
          </div>
          <Toggle on={paused} onChange={setPaused} label={th ? "พักรับงาน" : "Pause"} />
        </div>

        <div className={`glass rounded-3xl divide-y divide-white/5 ${paused ? "opacity-50" : ""}`}>
          {days.map((d, i) => (
            <div key={i} className="p-4 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="flex-1 text-sm">{DAYS[th ? "th" : "en"][i]}</span>
                <Toggle on={d.on} onChange={(v) => upd(i, { on: v })} label={DAYS[th ? "th" : "en"][i]} />
              </div>
              {d.on && (
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <input type="time" value={d.start} onChange={(e) => upd(i, { start: e.target.value })} className="input-dark min-w-0 h-10" aria-label={th ? "เริ่ม" : "Start"} />
                  <span className="text-ink-400 text-xs">–</span>
                  <input type="time" value={d.end} onChange={(e) => upd(i, { end: e.target.value })} className="input-dark min-w-0 h-10" aria-label={th ? "สิ้นสุด" : "End"} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="glass rounded-3xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span>{th ? "รัศมีรับงาน" : "Service radius"}</span>
            <b className="text-gold-600">{radius} km</b>
          </div>
          <input type="range" min={2} max={20} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full h-9 accent-[#e5484d]" aria-label={th ? "รัศมี" : "Radius"} />
          <div className="flex justify-between text-[10px] text-ink-400"><span>2 km</span><span>20 km</span></div>
        </div>

        <button onClick={save} className="btn-crimson w-full h-12 font-semibold">{th ? "บันทึก" : "Save"}</button>
      </div>
      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
