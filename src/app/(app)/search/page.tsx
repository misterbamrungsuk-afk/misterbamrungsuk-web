"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { baht } from "@/components/ui";
import { DEFAULT_FILTER, FilterButton, FriendFilterSheet, activeFilterCount, applyFriendFilter, type FriendFilter } from "@/components/friend-filter";
import { EmptyState } from "@/components/empty-state";
import { DEMO_POSTS } from "@/lib/demo-data";
import { recommendedSort, isNewProvider, queueLabel } from "@/lib/membership";
import { activityLabel, skillBySlug } from "@/lib/categories";

// จุดอ้างอิงผู้ใช้ (demo): อโศก
const ME = { lat: 13.7373, lng: 100.5603 };
function km(lat?: number, lng?: number) {
  if (lat == null || lng == null) return 99;
  const r = Math.PI / 180, dLat = (lat - ME.lat) * r, dLng = (lng - ME.lng) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(ME.lat * r) * Math.cos(lat * r) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

type Sort = "rec" | "near" | "rating" | "priceAsc" | "priceDesc";
const SORTS: { k: Sort; th: string; en: string }[] = [
  { k: "rec", th: "แนะนำ", en: "Recommended" }, { k: "near", th: "ใกล้สุด", en: "Nearest" }, { k: "rating", th: "คะแนนสูง", en: "Top rated" },
  { k: "priceAsc", th: "ราคาต่ำ", en: "Price ↑" }, { k: "priceDesc", th: "ราคาสูง", en: "Price ↓" },
];

export default function SearchPage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const [q, setQ] = useState("");
  const [f, setF] = useState<FriendFilter>(DEFAULT_FILTER);
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<Sort>("rec");

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return applyFriendFilter(DEMO_POSTS.filter((p) => !p.isHidden), f)
      .map((p) => ({ p, d: km(p.lat, p.lng) }))
      .filter(({ p, d }) => {
        if (s) {
          const hay = [p.member.name, p.serviceArea, p.interests, p.province, ...p.activities.flatMap((c) => [activityLabel(c, true), activityLabel(c, false)]), ...p.skills.flatMap((k) => [skillBySlug(k)?.th ?? "", skillBySlug(k)?.en ?? ""])].join(" ").toLowerCase();
          if (!hay.includes(s)) return false;
        }
        return d < 999;
      })
      .sort((a, b) => sort === "rec" ? recommendedSort(a.p, b.p) : sort === "near" ? a.d - b.d : sort === "rating" ? (b.p.rating ?? 0) - (a.p.rating ?? 0) : sort === "priceAsc" ? a.p.price3h - b.p.price3h : b.p.price3h - a.p.price3h);
  }, [q, f, sort]);

  const activeCount = activeFilterCount(f);
  const cur = SORTS.find((s) => s.k === sort)!;
  const countFor = (x: FriendFilter) => applyFriendFilter(DEMO_POSTS.filter((p) => !p.isHidden), x).length;

  return (
    <>
      <TopBar back="/home" title={th ? "ผลค้นหา" : "Results"} right={<span />} />
      <div className="px-4 pt-4 pb-28">
        <div className="flex gap-2">
          <label className="flex-1 min-w-0 flex items-center gap-2 input-dark h-12 rounded-2xl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 shrink-0 text-ink-300"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" strokeLinecap="round" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={th ? "ชื่อ กิจกรรม หรือย่าน" : "Name, activity or area"} aria-label={th ? "ค้นหา" : "Search"} className="flex-1 min-w-0 bg-transparent outline-none text-sm" />
            {q && <button onClick={() => setQ("")} aria-label="clear" className="w-9 h-9 grid place-items-center text-ink-300 shrink-0">✕</button>}
          </label>
          <FilterButton count={activeCount} onClick={() => setOpen(true)} th={th} />
        </div>

        <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
          {SORTS.map((s) => (
            <button key={s.k} onClick={() => setSort(s.k)} aria-pressed={sort === s.k} className={`chip h-9 px-3.5 shrink-0 ${sort === s.k ? "chip-gold" : ""}`}>{th ? s.th : s.en}</button>
          ))}
        </div>

        <p className="text-xs text-ink-300 mt-3">{results.length} {th ? "ผลลัพธ์ · เรียงตาม" : "results · sorted by"} <span className="text-gold-300">{th ? cur.th : cur.en}</span></p>

        {results.length === 0 ? (
          <EmptyState icon="🔍" title={th ? "ยังไม่เจอเพื่อนที่ตรงใจ" : "No companion matches yet"} body={th ? "ลองเลือกกิจกรรมให้น้อยลง หรือปรับช่วงราคาดูนะคะ" : "Try fewer activities or another price range"}
            ctaLabel={th ? "ล้างฟิลเตอร์" : "Reset filters"} onCta={() => { setF(DEFAULT_FILTER); setQ(""); }} />
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {results.map(({ p, d }) => (
              <li key={p.id}>
                <Link href={`/post/${p.id}`} className="glass rounded-3xl p-3 flex gap-3 transition">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.images[0]} alt="" className="w-[84px] h-[104px] rounded-2xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <p className="font-semibold truncate">{p.member.name}{p.member.age ? `, ${p.member.age}` : ""} {p.member.kycVerified && <span className="text-gold-500">✓</span>} {isNewProvider(p) && <span className="text-[10.5px] h-5 px-1.5 rounded-full bg-crimson-500 text-white font-semibold inline-flex items-center align-middle">{th ? "หน้าใหม่" : "New"}</span>}</p>
                    <p className={`text-[11.5px] font-medium flex items-center gap-1 ${(p.nextFreeMin ?? 0) <= 0 ? "text-emerald-600" : "text-ink-300"}`}><span className={`w-1.5 h-1.5 rounded-full ${(p.nextFreeMin ?? 0) <= 0 ? "bg-emerald-500" : "bg-gold-500"}`} />{queueLabel(p, th)}</p>
                    <p className="text-xs text-ink-300 truncate"><span className="font-semibold text-ink-100"><span className="text-amber-500">★</span> {p.rating?.toFixed(1) ?? "–"}</span> · {d < 1 ? `${Math.round(d * 1000)} ${th ? "ม." : "m"}` : `${d.toFixed(1)} ${th ? "กม." : "km"}`} · {p.serviceArea}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {p.activities.slice(0, 2).map((c) => <span key={c} className="text-[11px] h-6 px-2 rounded-full border border-ink-600 text-ink-300 inline-flex items-center">{activityLabel(c, th)}</span>)}
                      {p.skills.includes("massage") && <span className="text-[11px] h-6 px-2 rounded-full border border-ink-600 text-ink-300 inline-flex items-center">{th ? "นวดผ่อนคลาย" : "Massage"}</span>}
                    </div>
                    <p className="mt-auto font-display font-semibold text-gold-300">{baht(p.price3h)} <span className="text-xs text-ink-300 font-normal">/{th ? "3 ชม." : "3h"}</span></p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <FriendFilterSheet open={open} onClose={() => setOpen(false)} value={f} onApply={setF} count={countFor} th={th} />
    </>
  );
}
