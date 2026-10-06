"use client";

import { useState } from "react";
import { baht } from "./ui";
import { ACTIVITY_SUGGESTIONS, PLACES, SKILLS, activityLabel, activityValue } from "@/lib/categories";
import { site } from "@/lib/site";
import type { PartnerSpa } from "@/lib/booking";

// ฟิลด์ข้อเสนอของ Part-Time (ตามดีไซน์ ProviderEditProfile / P15): กิจกรรม · สกิล · สถานที่ · ราคา 3/5 ชม.

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const lbl = "text-xs text-ink-300 mb-2 block";

/** กิจกรรมแบบพิมพ์เองได้ + รายการแนะนำ; ค่าที่เก็บ = slug มาตรฐาน หรือข้อความที่พิมพ์เอง */
export function ActivityInput({ value, onChange, th }: { value: string[]; onChange: (v: string[]) => void; th: boolean }) {
  const [q, setQ] = useState("");
  const labels = value.map((v) => activityLabel(v, true));
  const term = q.trim();
  const sugg = ACTIVITY_SUGGESTIONS.filter((s) => !labels.includes(s) && (!term || s.includes(term)));
  const exact = term && ACTIVITY_SUGGESTIONS.includes(term);
  const add = (label: string) => {
    const v = activityValue(label.trim());
    if (v && !value.includes(v)) onChange([...value, v]);
    setQ("");
  };

  return (
    <div>
      <span className={lbl}>{th ? `กิจกรรมที่รับ · ${value.length}` : `Activities · ${value.length}`}</span>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5">
          {value.map((v) => (
            <span key={v} className="h-9 pl-3.5 pr-1 rounded-full border border-gold-500 bg-gold-500/10 text-gold-300 text-[13px] inline-flex items-center gap-1">
              {activityLabel(v, th)}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={th ? `ลบ ${activityLabel(v, th)}` : `Remove ${activityLabel(v, th)}`}
                className="w-7 h-7 rounded-full grid place-items-center text-gold-300 hover:text-crimson-300">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} className="input-dark h-12" placeholder={th ? "พิมพ์กิจกรรม เช่น ตีกอล์ฟ" : "Type an activity, e.g. golf"}
          onKeyDown={(e) => { if (e.key === "Enter" && term) { e.preventDefault(); add(term); } }} aria-label={th ? "เพิ่มกิจกรรม" : "Add activity"} />
        <button type="button" onClick={() => term && add(term)} disabled={!term} className="btn-ghost h-12 rounded-xl px-4 text-sm shrink-0">{th ? "+ เพิ่ม" : "+ Add"}</button>
      </div>
      {term && !exact && sugg.length === 0 && (
        <p className="text-xs text-ink-300 mt-2">{th ? `ไม่พบในรายการแนะนำ · กด "เพิ่ม" เพื่อใช้ "${term}"` : `Not in suggestions · tap Add to use "${term}"`}</p>
      )}
      <div className="flex flex-wrap gap-2 mt-2.5">
        {sugg.slice(0, term ? 8 : 16).map((s) => (
          <button key={s} type="button" onClick={() => add(s)}
            className="h-8 px-3 rounded-full border border-dashed border-ink-500 text-[12.5px] text-ink-200 hover:border-gold-500/60 hover:text-gold-300">
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Pick({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`min-h-9 px-3.5 py-1.5 rounded-full border text-[13px] transition ${on ? "border-gold-500 bg-gold-500/10 text-gold-300 font-semibold" : "border-ink-600 bg-ink-800 text-ink-200"}`}>
      {on ? "✓ " : ""}{children}
    </button>
  );
}

export function SkillsPicker({ value, onChange, th }: { value: string[]; onChange: (v: string[]) => void; th: boolean }) {
  return (
    <div>
      <span className={lbl}>{th ? "สกิลพิเศษ (เลือกได้หลายข้อ)" : "Special skills (pick any)"}</span>
      <div className="flex flex-wrap gap-2">
        {SKILLS.map((s) => (
          <Pick key={s.slug} on={value.includes(s.slug)} onClick={() => onChange(toggle(value, s.slug))}>
            {th ? s.th : s.en}{s.slug === "massage" ? (th ? " (แนบใบรับรอง)" : " (certificate)") : ""}
          </Pick>
        ))}
      </div>
      <p className="text-xs text-ink-300 mt-2">{th ? "แสดงเป็นแท็กบนโปรไฟล์ · ไม่มีค่าบริการเพิ่ม · นวดผ่อนคลายต้องแนบใบรับรอง" : "Shown as profile tags · no extra charge · massage needs a certificate"}</p>
    </div>
  );
}

export function PlacesPicker({ value, onChange, spas, spaIds, onSpaIds, th }: {
  value: string[]; onChange: (v: string[]) => void; spas: PartnerSpa[]; spaIds: string[]; onSpaIds: (v: string[]) => void; th: boolean;
}) {
  return (
    <div>
      <span className={lbl}>{th ? `สถานที่ที่รับนัด · ${value.length}` : `Meeting places · ${value.length}`}</span>
      <div className="flex flex-wrap gap-2">
        {PLACES.map((p) => <Pick key={p.slug} on={value.includes(p.slug)} onClick={() => onChange(toggle(value, p.slug))}>{th ? p.th : p.en}</Pick>)}
      </div>
      {value.includes("spa") && (
        <div className="mt-3 rounded-2xl border border-ink-600 bg-ink-800 p-3">
          <p className="text-xs text-ink-300 mb-2">{th ? "สปา / สถานที่พาร์ทเนอร์" : "Partner spas / venues"}</p>
          <div className="flex flex-col gap-1.5">
            {spas.map((s) => (
              <label key={s.id} className="flex items-center gap-3 min-h-11 cursor-pointer">
                <input type="checkbox" checked={spaIds.includes(s.id)} onChange={() => onSpaIds(toggle(spaIds, s.id))} className="w-5 h-5 accent-[#d4af37]" />
                <span className="flex-1 min-w-0"><span className="block text-sm truncate">{s.name}</span><span className="block text-xs text-ink-300">{s.area}</span></span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ label, value, onChange, step = 100 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <div className="rounded-2xl border border-ink-600 bg-ink-800 p-3">
      <p className="text-xs text-ink-300 mb-2">{label}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(0, value - step))} aria-label="−" className="w-10 h-10 rounded-xl border border-ink-600 text-lg shrink-0">−</button>
        <input type="number" min={0} step={step} value={value} onChange={(e) => onChange(Math.max(0, +e.target.value || 0))} aria-label={label}
          className="flex-1 min-w-0 h-10 bg-transparent text-center font-display font-semibold text-lg text-gold-300 outline-none" />
        <button type="button" onClick={() => onChange(value + step)} aria-label="+" className="w-10 h-10 rounded-xl border border-ink-600 text-lg shrink-0">+</button>
      </div>
    </div>
  );
}

/** ราคา 3 ชม. / 5 ชม. + แจ้งค่าธรรมเนียม (site.commissionPercent) */
export function BlockPriceInputs({ p3, p5, onP3, onP5, th }: { p3: number; p5: number; onP3: (n: number) => void; onP5: (n: number) => void; th: boolean }) {
  const fee = site.commissionPercent;
  const net = (n: number) => Math.round((n * (100 - fee)) / 100);
  return (
    <div>
      <span className={lbl}>{th ? "ราคา" : "Price"}</span>
      <div className="grid grid-cols-2 gap-2">
        <Stepper label={th ? "ราคา 3 ชม." : "3 h price"} value={p3} onChange={onP3} />
        <Stepper label={th ? "ราคา 5 ชม." : "5 h price"} value={p5} onChange={onP5} />
      </div>
      <p className="text-xs text-ink-300 mt-2">
        {th ? `หักค่าธรรมเนียม ${fee}% คุณได้ ${100 - fee}%` : `${fee}% platform fee · you receive ${100 - fee}%`}
        {" · "}{th ? "3 ชม. ได้รับ" : "3 h nets"} {baht(net(p3))} · {th ? "5 ชม. ได้รับ" : "5 h nets"} {baht(net(p5))}
      </p>
    </div>
  );
}
