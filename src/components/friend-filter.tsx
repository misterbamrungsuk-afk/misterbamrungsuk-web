"use client";

import { useState } from "react";
import { Sheet, baht } from "./ui";
import { ACTIVITIES, MASSAGE_NOTE, PLACES, PROVINCES, SKILLS } from "@/lib/categories";
import type { Post } from "@/lib/types";

// ตัวกรองเพื่อน (ตามดีไซน์ S03-Filter): กิจกรรม · สกิลพิเศษ · สถานที่นัด · ราคาต่อ 3 ชม. · อายุ · จังหวัด · ตัวเลือก
export interface FriendFilter {
  acts: string[];
  skills: string[];
  places: string[];
  priceMin: number;
  priceMax: number;
  ageMin: number;
  ageMax: number;
  province: string;
  verified: boolean;
  freeToday: boolean;
  topRated: boolean;
}

export const PRICE_RANGE = { min: 1000, max: 5000, step: 100 } as const;
export const AGE_RANGE = { min: 20, max: 50 } as const;

export const DEFAULT_FILTER: FriendFilter = {
  acts: [], skills: [], places: [],
  priceMin: PRICE_RANGE.min, priceMax: PRICE_RANGE.max,
  ageMin: AGE_RANGE.min, ageMax: AGE_RANGE.max,
  province: "", verified: false, freeToday: false, topRated: false,
};

export function activeFilterCount(f: FriendFilter) {
  return (
    f.acts.length + f.skills.length + f.places.length +
    (f.priceMin > PRICE_RANGE.min || f.priceMax < PRICE_RANGE.max ? 1 : 0) +
    (f.ageMin > AGE_RANGE.min || f.ageMax < AGE_RANGE.max ? 1 : 0) +
    (f.province ? 1 : 0) + (f.verified ? 1 : 0) + (f.freeToday ? 1 : 0) + (f.topRated ? 1 : 0)
  );
}

export function applyFriendFilter(list: Post[], f: FriendFilter) {
  return list.filter((p) => {
    if (f.acts.length && !f.acts.every((a) => p.activities.includes(a))) return false;
    if (f.skills.length && !f.skills.every((s) => p.skills.includes(s))) return false;
    if (f.places.length && !f.places.some((s) => p.places.includes(s))) return false;
    if (p.price3h < f.priceMin || (f.priceMax < PRICE_RANGE.max && p.price3h > f.priceMax)) return false;
    const age = p.member.age ?? 0;
    if (age && (age < f.ageMin || (f.ageMax < AGE_RANGE.max && age > f.ageMax))) return false;
    if (f.province && p.province !== f.province) return false;
    if (f.verified && !p.member.kycVerified) return false;
    if (f.freeToday && (p.nextFreeMin ?? 0) > 12 * 60) return false;
    if (f.topRated && (p.rating ?? 0) < 4.5) return false;
    return true;
  });
}

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`h-[38px] px-3.5 rounded-full border text-[13px] font-medium transition ${on ? "border-gold-500 bg-gold-500/10 text-gold-300" : "border-ink-600 bg-ink-800 text-ink-100"}`}>
      {children}
    </button>
  );
}

/** แผ่นตัวกรองเต็มรูปแบบ — count(draft) ใช้แสดง "แสดงผล N คน" */
export function FriendFilterSheet({ open, onClose, value, onApply, count, th }: {
  open: boolean; onClose: () => void; value: FriendFilter; onApply: (f: FriendFilter) => void; count: (f: FriendFilter) => number; th: boolean;
}) {
  const [d, setD] = useState<FriendFilter>(value);
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) { setLastOpen(open); if (open) setD(value); }
  const set = (patch: Partial<FriendFilter>) => setD({ ...d, ...patch });
  const lbl = "font-display text-base font-medium mb-2.5";

  return (
    <Sheet open={open} onClose={onClose} title={th ? "ตัวกรอง" : "Filters"}>
      <div className="flex flex-col gap-6">
        <section>
          <p className={lbl}>{th ? "กิจกรรม" : "Activities"}</p>
          <div className="flex flex-wrap gap-2">
            {ACTIVITIES.map((a) => <Chip key={a.slug} on={d.acts.includes(a.slug)} onClick={() => set({ acts: toggle(d.acts, a.slug) })}>{th ? a.th : a.en}</Chip>)}
          </div>
        </section>

        <section>
          <p className={lbl}>{th ? "สกิลพิเศษ" : "Special skills"}</p>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map((s) => <Chip key={s.slug} on={d.skills.includes(s.slug)} onClick={() => set({ skills: toggle(d.skills, s.slug) })}>{th ? s.th : s.en}</Chip>)}
          </div>
          <p className="text-xs text-ink-300 mt-2">{th ? `นวดผ่อนคลาย: ${MASSAGE_NOTE.th}` : `Relaxing massage: ${MASSAGE_NOTE.en}`}</p>
        </section>

        <section>
          <p className={lbl}>{th ? "สถานที่นัด" : "Meeting place"}</p>
          <div className="flex flex-wrap gap-2">
            {PLACES.map((s) => <Chip key={s.slug} on={d.places.includes(s.slug)} onClick={() => set({ places: toggle(d.places, s.slug) })}>{th ? s.th : s.en}</Chip>)}
          </div>
        </section>

        <section>
          <div className="flex justify-between items-baseline mb-1">
            <p className={lbl}>{th ? "ราคาต่อ 3 ชม." : "Price per 3 h"}</p>
            <span className="text-sm text-gold-300">{baht(d.priceMin)} – {baht(d.priceMax)}{d.priceMax >= PRICE_RANGE.max ? "+" : ""}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="range" min={PRICE_RANGE.min} max={PRICE_RANGE.max} step={PRICE_RANGE.step} value={d.priceMin}
              onChange={(e) => set({ priceMin: Math.min(+e.target.value, d.priceMax) })} className="w-full accent-[#d4af37] h-9" aria-label={th ? "ราคาต่ำสุด" : "Min price"} />
            <input type="range" min={PRICE_RANGE.min} max={PRICE_RANGE.max} step={PRICE_RANGE.step} value={d.priceMax}
              onChange={(e) => set({ priceMax: Math.max(+e.target.value, d.priceMin) })} className="w-full accent-[#d4af37] h-9" aria-label={th ? "ราคาสูงสุด" : "Max price"} />
          </div>
        </section>

        <section>
          <div className="flex justify-between items-baseline mb-1">
            <p className={lbl}>{th ? "อายุ" : "Age"}</p>
            <span className="text-sm text-gold-300">{d.ageMin} – {d.ageMax}{d.ageMax >= AGE_RANGE.max ? "+" : ""} {th ? "ปี" : "yrs"}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="range" min={AGE_RANGE.min} max={AGE_RANGE.max} value={d.ageMin} onChange={(e) => set({ ageMin: Math.min(+e.target.value, d.ageMax) })} className="w-full accent-[#d4af37] h-9" aria-label={th ? "อายุต่ำสุด" : "Min age"} />
            <input type="range" min={AGE_RANGE.min} max={AGE_RANGE.max} value={d.ageMax} onChange={(e) => set({ ageMax: Math.max(+e.target.value, d.ageMin) })} className="w-full accent-[#d4af37] h-9" aria-label={th ? "อายุสูงสุด" : "Max age"} />
          </div>
        </section>

        <section>
          <p className={lbl}>{th ? "จังหวัด" : "Province"}</p>
          <select value={d.province} onChange={(e) => set({ province: e.target.value })} className="input-dark h-12">
            <option value="">{th ? "ทุกจังหวัด" : "All provinces"}</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </section>

        <section>
          <p className={lbl}>{th ? "ตัวเลือก" : "Options"}</p>
          <div className="flex flex-wrap gap-2">
            <Chip on={d.verified} onClick={() => set({ verified: !d.verified })}>{th ? "ยืนยันตัวตนแล้ว" : "Verified"}</Chip>
            <Chip on={d.freeToday} onClick={() => set({ freeToday: !d.freeToday })}>{th ? "ว่างวันนี้" : "Free today"}</Chip>
            <Chip on={d.topRated} onClick={() => set({ topRated: !d.topRated })}>★ 4.5+</Chip>
          </div>
        </section>

        <div className="flex gap-2 sticky bottom-0 pt-2 pb-1 bg-ink-900/90 backdrop-blur">
          <button type="button" onClick={() => setD(DEFAULT_FILTER)} className="btn-ghost h-12 rounded-xl px-5">{th ? "ล้าง" : "Clear"}</button>
          <button type="button" onClick={() => { onApply(d); onClose(); }} className="btn-crimson h-12 rounded-xl flex-1 font-display font-semibold">
            {th ? `แสดงผล ${count(d)} คน` : `Show ${count(d)}`}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/** ปุ่มตัวกรองข้างช่องค้นหา + badge จำนวนตัวกรองที่ใช้อยู่ */
export function FilterButton({ count, onClick, th }: { count: number; onClick: () => void; th: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={th ? "ตัวกรอง" : "Filters"}
      className="relative shrink-0 w-12 h-12 rounded-[14px] border border-ink-600 bg-ink-800 text-gold-300 grid place-items-center">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
      {count > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-crimson-500 text-white text-[11px] font-bold grid place-items-center">{count}</span>}
    </button>
  );
}
