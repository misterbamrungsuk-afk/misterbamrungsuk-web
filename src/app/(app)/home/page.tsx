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
import { DEMO_POSTS } from "@/lib/demo-data";

function HomeInner({ posts }: { posts: Post[] }) {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);
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

      <div className="px-4 pt-4">
        <p className="text-[13px] font-semibold tracking-[0.1em] text-gold-500">MALE MASSAGE · BANGKOK</p>
        <h1 className="text-[28px] leading-tight font-bold mt-1">{t.brandTagline}</h1>

        {/* search */}
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px] absolute left-4 top-1/2 -translate-y-1/2 text-ink-300">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} className="input-dark h-[50px] pl-11" />
          </div>
          <button onClick={() => setFilterOpen(true)} className={`btn-ghost rounded-2xl w-[50px] h-[50px] grid place-items-center relative bg-ink-800 ${activeFilters ? "border-gold-500 text-gold-300" : "text-gold-500"}`}aria-label={t.filters}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-[22px] h-[22px]"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>
            {activeFilters > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-crimson-500 text-[10px] grid place-items-center font-bold text-white">{activeFilters}</span>}
          </button>
        </div>

        {/* categories */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-4 -mx-4 px-4">
          <button onClick={() => setCat("")} className={`chip whitespace-nowrap h-9 px-4 text-[13px] ${!cat ? "chip-red" : ""}`}>{t.allCategories}</button>
          {CATEGORIES.filter((c) => c.slug !== "other").map((c) => (
            <button key={c.slug} onClick={() => setCat(cat === c.slug ? "" : c.slug)} className={`chip whitespace-nowrap h-9 px-4 text-[13px] ${cat === c.slug ? "chip-red" : ""}`}>
              {lang === "th" ? c.th : c.en}
            </button>
          ))}
        </div>

        {/* quick call banner */}
        <Link href="/matching" className="flex items-center gap-3 rounded-[18px] bg-crimson-500 text-white px-4 py-3.5">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-[26px] h-[26px] shrink-0"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>
          <span className="flex-1">
            <span className="block font-display font-semibold">{t.quickMatch}</span>
            <span className="block text-xs opacity-90">{t.quickMatchDesc}</span>
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="m9 18 6-6-6-6"/></svg>
        </Link>

        <div className="flex items-baseline justify-between mt-5 mb-3">
          <h2 className="text-[19px] font-semibold">{lang === "th" ? "แนะนำสำหรับคุณ" : "Recommended"}</h2>
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
