"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Sheet, baht } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { DEMO_POSTS } from "@/lib/demo-data";
import { recommendedSort, isNewProvider, queueLabel } from "@/lib/membership";
import { CATEGORIES, catBySlug } from "@/lib/categories";

// จุดอ้างอิงผู้ใช้ (demo): อโศก
const ME = { lat: 13.7373, lng: 100.5603 };
function km(lat?: number, lng?: number) {
  if (lat == null || lng == null) return 99;
  const r = Math.PI / 180, dLat = (lat - ME.lat) * r, dLng = (lng - ME.lng) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(ME.lat * r) * Math.cos(lat * r) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

type Sort = "rec" | "near" | "rating" | "priceAsc" | "priceDesc";
interface Filters { cats: string[]; maxPrice: number; minRating: number; maxKm: number }
const DEFAULT: Filters = { cats: [], maxPrice: 1000, minRating: 0, maxKm: 20 };
const SORTS: { k: Sort; th: string; en: string }[] = [
  { k: "rec", th: "แนะนำ", en: "Recommended" }, { k: "near", th: "ใกล้สุด", en: "Nearest" }, { k: "rating", th: "คะแนนสูง", en: "Top rated" },
  { k: "priceAsc", th: "ราคาต่ำ", en: "Price ↑" }, { k: "priceDesc", th: "ราคาสูง", en: "Price ↓" },
];

export default function SearchPage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const [q, setQ] = useState("");
  const [f, setF] = useState<Filters>(DEFAULT);
  const [draft, setDraft] = useState<Filters>(DEFAULT);
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<Sort>("rec");

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return DEMO_POSTS.filter((p) => !p.isHidden)
      .map((p) => ({ p, d: km(p.lat, p.lng) }))
      .filter(({ p, d }) => {
        if (s) {
          const hay = [p.member.name, p.serviceArea, p.interests, p.province, ...p.categories.flatMap((c) => { const k = catBySlug(c); return k ? [k.th, k.en] : [c]; })].join(" ").toLowerCase();
          if (!hay.includes(s)) return false;
        }
        if (f.cats.length && !f.cats.some((c) => p.categories.includes(c))) return false;
        if (p.pricePerHour > f.maxPrice) return false;
        if ((p.rating ?? 0) < f.minRating) return false;
        return d <= f.maxKm;
      })
      .sort((a, b) => sort === "rec" ? recommendedSort(a.p, b.p) : sort === "near" ? a.d - b.d : sort === "rating" ? (b.p.rating ?? 0) - (a.p.rating ?? 0) : sort === "priceAsc" ? a.p.pricePerHour - b.p.pricePerHour : b.p.pricePerHour - a.p.pricePerHour);
  }, [q, f, sort]);

  const activeCount = f.cats.length + (f.maxPrice < DEFAULT.maxPrice ? 1 : 0) + (f.minRating ? 1 : 0) + (f.maxKm < DEFAULT.maxKm ? 1 : 0);
  const cur = SORTS.find((s) => s.k === sort)!;
  const openSheet = () => { setDraft(f); setOpen(true); };
  const toggleCat = (c: string) => setDraft({ ...draft, cats: draft.cats.includes(c) ? draft.cats.filter((x) => x !== c) : [...draft.cats, c] });

  return (
    <>
      <TopBar back="/home" title={th ? "ค้นหาหมอนวด" : "Search therapists"} right={<span />} />
      <div className="px-4 pt-4 pb-28">
        <div className="flex gap-2">
          <label className="flex-1 min-w-0 flex items-center gap-2 input-dark h-12 rounded-2xl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 shrink-0 text-ink-300"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" strokeLinecap="round" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={th ? "ชื่อ บริการ หรือย่าน" : "Name, service or area"} aria-label={th ? "ค้นหา" : "Search"} className="flex-1 min-w-0 bg-transparent outline-none text-sm" />
            {q && <button onClick={() => setQ("")} aria-label="clear" className="w-9 h-9 grid place-items-center text-ink-300 shrink-0">✕</button>}
          </label>
          <button onClick={openSheet} aria-label={th ? "ฟิลเตอร์" : "Filters"} className="relative shrink-0 w-12 h-12 rounded-2xl btn-ghost grid place-items-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" /></svg>
            {activeCount > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-gold-500 text-[#1a1206] text-[11px] font-bold grid place-items-center">{activeCount}</span>}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
          {SORTS.map((s) => (
            <button key={s.k} onClick={() => setSort(s.k)} aria-pressed={sort === s.k} className={`chip h-9 px-3.5 shrink-0 ${sort === s.k ? "chip-gold" : ""}`}>{th ? s.th : s.en}</button>
          ))}
        </div>

        <p className="text-xs text-ink-300 mt-3">{results.length} {th ? "ผลลัพธ์ · เรียงตาม" : "results · sorted by"} <span className="text-gold-300">{th ? cur.th : cur.en}</span></p>

        {results.length === 0 ? (
          <EmptyState icon="🔍" title={th ? "ไม่พบหมอนวดที่ตรงเงื่อนไข" : "No therapists match"} body={th ? "ลองขยายรัศมี ปรับช่วงราคา หรือเปลี่ยนคำค้น" : "Try a wider radius, another price range or different keywords"}
            ctaLabel={th ? "ล้างฟิลเตอร์" : "Reset filters"} onCta={() => { setF(DEFAULT); setQ(""); }} />
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {results.map(({ p, d }) => (
              <li key={p.id}>
                <Link href={`/post/${p.id}`} className="glass rounded-3xl p-3 flex gap-3 transition">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.images[0]} alt="" className="w-[84px] h-[104px] rounded-2xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <p className="font-semibold truncate">{p.member.name}{p.member.age ? `, ${p.member.age}` : ""} {p.member.kycVerified && <span className="text-gold-600">✓</span>} {isNewProvider(p) && <span className="text-[10.5px] h-5 px-1.5 rounded-full bg-crimson-500 text-white font-semibold inline-flex items-center align-middle">{th ? "หน้าใหม่" : "New"}</span>}</p>
                    <p className={`text-[11.5px] font-medium flex items-center gap-1 ${(p.nextFreeMin ?? 0) <= 0 ? "text-emerald-600" : "text-ink-300"}`}><span className={`w-1.5 h-1.5 rounded-full ${(p.nextFreeMin ?? 0) <= 0 ? "bg-emerald-500" : "bg-gold-500"}`} />{queueLabel(p, th)}</p>
                    <p className="text-xs text-ink-300 truncate"><span className="font-semibold text-ink-100"><span className="text-amber-500">★</span> {p.rating?.toFixed(1) ?? "–"}</span> · {d < 1 ? `${Math.round(d * 1000)} ${th ? "ม." : "m"}` : `${d.toFixed(1)} ${th ? "กม." : "km"}`} · {p.serviceArea}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {p.categories.slice(0, 2).map((c) => <span key={c} className="text-[11px] h-6 px-2 rounded-full border border-ink-600 text-ink-300 inline-flex items-center">{th ? catBySlug(c)?.th : catBySlug(c)?.en}</span>)}
                    </div>
                    <p className="mt-auto font-display font-semibold text-gold-300">{baht(p.pricePerHour)} <span className="text-xs text-ink-300 font-normal">/{th ? "ชม." : "hr"}</span></p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={th ? "ฟิลเตอร์" : "Filters"}>
        <p className="font-display font-medium mb-2">{th ? "บริการ" : "Service"}</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {CATEGORIES.filter((c) => c.slug !== "other").map((c) => (
            <button key={c.slug} onClick={() => toggleCat(c.slug)} aria-pressed={draft.cats.includes(c.slug)} className={`chip h-9 px-3.5 ${draft.cats.includes(c.slug) ? "chip-gold" : ""}`}>{th ? c.th : c.en}</button>
          ))}
        </div>
        <div className="flex justify-between mb-1"><p className="font-display font-medium">{th ? "ราคาต่อชั่วโมง" : "Price per hour"}</p><span className="text-sm text-gold-300">≤ {baht(draft.maxPrice)}</span></div>
        <input type="range" min={300} max={1000} step={50} value={draft.maxPrice} onChange={(e) => setDraft({ ...draft, maxPrice: +e.target.value })} className="w-full accent-[#e0a400] h-9 mb-4" aria-label="price" />
        <div className="flex justify-between mb-1"><p className="font-display font-medium">{th ? "ระยะทาง" : "Distance"}</p><span className="text-sm text-gold-300">≤ {draft.maxKm} {th ? "กม." : "km"}</span></div>
        <input type="range" min={1} max={20} value={draft.maxKm} onChange={(e) => setDraft({ ...draft, maxKm: +e.target.value })} className="w-full accent-[#e0a400] h-9 mb-4" aria-label="distance" />
        <p className="font-display font-medium mb-2">{th ? "คะแนนขั้นต่ำ" : "Minimum rating"}</p>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[0, 4, 4.5, 4.8].map((r) => (
            <button key={r} onClick={() => setDraft({ ...draft, minRating: r })} aria-pressed={draft.minRating === r} className={`h-11 rounded-xl border text-sm ${draft.minRating === r ? "border-gold-500 bg-gold-500/10 text-gold-300" : "border-ink-600"}`}>{r ? `★${r}+` : th ? "ทั้งหมด" : "Any"}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setDraft(DEFAULT)} className="btn-ghost h-12 rounded-full px-5">{th ? "ล้าง" : "Reset"}</button>
          <button onClick={() => { setF(draft); setOpen(false); }} className="btn-crimson h-12 rounded-full flex-1 font-display font-semibold">{th ? "แสดงผลลัพธ์" : "Show results"}</button>
        </div>
      </Sheet>
    </>
  );
}
