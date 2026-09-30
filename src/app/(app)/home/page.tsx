"use client";

import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import PostCard from "@/components/post-card";
import { Sheet, Field } from "@/components/ui";
import { CATEGORIES, PROVINCES } from "@/lib/categories";
import type { Post } from "@/lib/types";
import { isDemo } from "@/lib/data";
import { DEMO_ME, DEMO_POSTS } from "@/lib/demo-data";
import { HERO_SLIDES, SPA_PACKAGES } from "@/lib/packages";

function greet(lang: string) {
  const h = new Date().getHours();
  if (lang === "th") return h < 12 ? "ตอนเช้า" : h < 17 ? "ตอนบ่าย" : "ตอนเย็น";
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

function HomeInner({ posts }: { posts: Post[] }) {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [province, setProvince] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [rateMin, setRateMin] = useState("");
  const [rateMax, setRateMax] = useState("");

  const filtered = useMemo(() => {
    let list = [...posts];
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((p) =>
        p.member.name.toLowerCase().includes(s) ||
        (p.personality + p.interests + p.extraInfo + p.categories.join(" ")).toLowerCase().includes(s)
      );
    }
    if (cat) list = list.filter((p) => p.categories.includes(cat));
    if (province) list = list.filter((p) => p.province === province);
    if (ageMin) list = list.filter((p) => (p.member.age ?? 0) >= +ageMin);
    if (ageMax) list = list.filter((p) => (p.member.age ?? 999) <= +ageMax);
    if (rateMin) list = list.filter((p) => p.pricePerHour >= +rateMin);
    if (rateMax) list = list.filter((p) => p.pricePerHour <= +rateMax);
    return list;
  }, [posts, q, cat, province, ageMin, ageMax, rateMin, rateMax]);

  const activeFilters = [province, ageMin, ageMax, rateMin, rateMax].filter(Boolean).length;

  return (
    <>
      <TopBar />

      <div className="px-4 pt-3">
        {/* 1 · ทักทาย */}
        <p className="text-sm text-ink-300">{lang === "th" ? "สวัสดี" + greet(lang) : "Good " + greet(lang)}, {DEMO_ME.name}</p>
        <h1 className="text-[22px] leading-snug font-semibold mt-0.5">{lang === "th" ? "วันนี้อยากผ่อนคลายแบบไหน?" : "How would you like to relax today?"}</h1>

        {/* 2 · ค้นหาแคปซูล */}
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1 min-w-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px] absolute left-4 top-1/2 -translate-y-1/2 text-ink-300">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} className="input-dark h-12 pl-11 !rounded-full" />
          </div>
          <button onClick={() => setFilterOpen(true)} className={`btn-ghost w-12 h-12 grid place-items-center relative bg-ink-800 ${activeFilters ? "border-gold-500 text-gold-300" : "text-gold-500"}`} aria-label={t.filters}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-[22px] h-[22px]"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>
            {activeFilters > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-crimson-500 text-[10px] grid place-items-center font-bold text-white">{activeFilters}</span>}
          </button>
        </div>
      </div>

      {/* 3 · แบนเนอร์สไลด์ */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 pt-4" onScroll={(e) => { const el = e.currentTarget; setSlide(Math.round(el.scrollLeft / (el.clientWidth - 32))); }}>
        {HERO_SLIDES.map((h) => (
          <Link key={h.key} href={h.href} className="relative snap-center shrink-0 w-[calc(100%-8px)] h-[160px] rounded-3xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={h.photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-900/70 to-transparent" />
            <span className="relative flex flex-col h-full p-4 max-w-[70%]">
              <span className="font-display font-semibold text-lg leading-tight">{lang === "th" ? h.th : h.en}</span>
              <span className="text-xs text-ink-200 mt-1">{lang === "th" ? h.subTh : h.subEn}</span>
              <span className="btn-crimson mt-auto self-start px-4 h-9 inline-flex items-center text-sm font-semibold">{lang === "th" ? "จองเลย" : "Book now"}</span>
            </span>
            <span className="absolute top-3 right-3 w-14 h-14 rounded-full border-2 border-gold-400 text-gold-300 grid place-items-center text-center leading-none font-display font-bold text-sm bg-ink-950/40">{h.badge}</span>
          </Link>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 mt-2.5" aria-hidden>
        {HERO_SLIDES.map((h, i) => <span key={h.key} className={`h-1.5 rounded-full transition-all ${slide === i ? "w-5 bg-gold-500" : "w-1.5 bg-ink-500"}`} />)}
      </div>

      <div className="px-4">
        {/* หมวด */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-4 -mx-4 px-4">
          <button onClick={() => setCat("")} className={`chip whitespace-nowrap h-9 px-4 text-[13px] ${!cat ? "chip-red" : ""}`}>{t.allCategories}</button>
          {CATEGORIES.filter((c) => c.slug !== "other").map((c) => (
            <button key={c.slug} onClick={() => setCat(cat === c.slug ? "" : c.slug)} className={`chip whitespace-nowrap h-9 px-4 text-[13px] ${cat === c.slug ? "chip-red" : ""}`}>
              {lang === "th" ? c.th : c.en}
            </button>
          ))}
        </div>

        {/* 4 · แพ็กเกจยอดนิยม */}
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[19px] font-semibold">{lang === "th" ? "แพ็กเกจยอดนิยม" : "Popular packages"}</h2>
          <Link href="/matching" className="text-[13px] font-semibold text-gold-500">{lang === "th" ? "ดูทั้งหมด" : "See all"}</Link>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x px-4 pb-2">
        {SPA_PACKAGES.filter((p) => !cat || p.cat === cat).map((p) => (
          <div key={p.id} className="glass snap-start shrink-0 w-[236px] rounded-3xl p-2.5 flex flex-col">
            <div className="relative h-[130px] rounded-2xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photo} alt="" className="w-full h-full object-cover" />
            </div>
            <p className="font-semibold mt-2.5 px-1">{lang === "th" ? p.th : p.en}</p>
            <p className="text-xs text-ink-300 px-1 mt-0.5 line-clamp-2 min-h-8">{lang === "th" ? p.descTh : p.descEn}</p>
            <div className="flex flex-wrap gap-1.5 px-1 mt-2">
              <span className="chip h-6 px-2 text-[11px] inline-flex items-center">{p.minutes} {lang === "th" ? "นาที" : "min"}</span>
              <span className="chip h-6 px-2 text-[11px] inline-flex items-center">1 {lang === "th" ? "คน" : "person"}</span>
              <span className="chip-gold chip h-6 px-2 text-[11px] inline-flex items-center font-semibold">฿{p.price.toLocaleString()}</span>
            </div>
            <Link href={`/matching?cat=${p.cat}&min=${p.minutes}`} className="btn-crimson mt-3 h-10 grid place-items-center text-sm font-semibold">{lang === "th" ? "จองเลย" : "Book now"}</Link>
          </div>
        ))}
      </div>

      <div className="px-4">
        {/* 5 · หมอใกล้คุณ */}
        <div className="flex items-baseline justify-between mt-5 mb-3">
          <h2 className="text-[19px] font-semibold">{lang === "th" ? "หมอใกล้คุณ" : "Therapists near you"}</h2>
          <Link href="/map" className="text-[13px] font-semibold text-gold-500">{lang === "th" ? "ดูบนแผนที่" : "View on map"}</Link>
        </div>
      </div>

      {/* feed: กริด 2 คอลัมน์แบบรูปเต็ม */}
      <div className="px-4 pb-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-ink-300">{t.empty}</div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filtered.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        )}
      </div>

      {/* filter sheet */}
      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title={t.filters}>
        <Field label={t.province}>
          <select value={province} onChange={(e) => setProvince(e.target.value)} className="input-dark">
            <option value="">{t.anyGender === "Any" ? "All provinces" : "ทุกจังหวัด"}</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label={t.ageRange}>
          <div className="flex gap-2 items-center">
            <input type="number" min={0} max={90} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} placeholder="18" className="input-dark" />
            <span className="text-ink-400">–</span>
            <input type="number" min={0} max={90} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} placeholder="60" className="input-dark" />
          </div>
        </Field>
        <Field label={t.rateRange}>
          <div className="flex gap-2 items-center">
            <input type="number" min={0} value={rateMin} onChange={(e) => setRateMin(e.target.value)} placeholder="100" className="input-dark" />
            <span className="text-ink-400">–</span>
            <input type="number" min={0} value={rateMax} onChange={(e) => setRateMax(e.target.value)} placeholder="999" className="input-dark" />
          </div>
        </Field>
        <div className="flex gap-2 mt-2">
          <button onClick={() => { setProvince(""); setAgeMin(""); setAgeMax(""); setRateMin(""); setRateMax(""); }} className="btn-ghost rounded-xl flex-1 py-2.5 text-sm">{t.reset}</button>
          <button onClick={() => setFilterOpen(false)} className="btn-crimson rounded-xl flex-1 py-2.5 text-sm font-semibold">{t.apply}</button>
        </div>
      </Sheet>
    </>
  );
}

export default function HomePage() {
  // server ส่งข้อมูลมาไม่ได้ใน client component — ใช้ demo โดยตรง (โหมด live จะเปลี่ยนเป็น fetch API)
  const posts = isDemo ? DEMO_POSTS : [];
  return (
    <Suspense>
      <HomeInner posts={posts} />
    </Suspense>
  );
}
