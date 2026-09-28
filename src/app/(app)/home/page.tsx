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
  const [gender, setGender] = useState("");
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
    if (gender) list = list.filter((p) => p.member.gender === gender);
    if (province) list = list.filter((p) => p.province === province);
    if (ageMin) list = list.filter((p) => (p.member.age ?? 0) >= +ageMin);
    if (ageMax) list = list.filter((p) => (p.member.age ?? 999) <= +ageMax);
    if (rateMin) list = list.filter((p) => p.pricePerHour >= +rateMin);
    if (rateMax) list = list.filter((p) => p.pricePerHour <= +rateMax);
    return list;
  }, [posts, q, cat, gender, province, ageMin, ageMax, rateMin, rateMax]);

  const activeFilters = [gender, province, ageMin, ageMax, rateMin, rateMax].filter(Boolean).length;

  return (
    <>
      <TopBar
        title={
          <div>
            <p className="text-[11px] text-gold-400 tracking-widest font-semibold uppercase">HaMoo</p>
            <h1 className="font-semibold -mt-0.5">{t.brandTagline}</h1>
          </div>
        }
        right={
          <Link href="/matching" className="btn-crimson rounded-full px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 animate-[pulseRed_2.4s_ease-in-out_infinite]">
            ⚡ {t.quickMatch}
          </Link>
        }
      />

      <div className="px-4 pt-4">
        {/* search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="input-dark pl-10" />
          </div>
          <button onClick={() => setFilterOpen(true)} className={`btn-ghost rounded-xl px-4 relative ${activeFilters ? "border-gold-500/60 text-gold-300" : ""}`} aria-label={t.filters}>
            ⚙ {t.filters}
            {activeFilters > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-crimson-600 text-[10px] grid place-items-center font-bold">{activeFilters}</span>}
          </button>
        </div>

        {/* categories */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-4 -mx-4 px-4">
          <button onClick={() => setCat("")} className={`chip whitespace-nowrap ${!cat ? "chip-red" : ""}`}>🌟 {t.allCategories}</button>
          {CATEGORIES.filter((c) => c.slug !== "other").map((c) => (
            <button key={c.slug} onClick={() => setCat(cat === c.slug ? "" : c.slug)} className={`chip whitespace-nowrap ${cat === c.slug ? "chip-red" : ""}`}>
              {c.emoji} {lang === "th" ? c.th : c.en}
            </button>
          ))}
        </div>

        {cat && (
          <button onClick={() => setCat("")} className="text-xs text-ink-300 mb-3">
            {lang === "th" ? "หมวดที่เลือก" : "Selected"}: <b className="text-crimson-300">{CATEGORIES.find((c) => c.slug === cat)?.[lang === "th" ? "th" : "en"]}</b> ✕
          </button>
        )}
      </div>

      {/* feed */}
      <div className="px-4 grid gap-4 pb-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-ink-400">🌙 {t.empty}</div>
        ) : (
          filtered.map((p) => <PostCard key={p.id} post={p} />)
        )}
      </div>

      {/* filter sheet */}
      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title={t.filters}>
        <Field label={t.gender}>
          <div className="flex gap-2">
            {[{ v: "", l: t.anyGender }, { v: "male", l: lang === "th" ? "ชาย" : "Male" }, { v: "female", l: lang === "th" ? "หญิง" : "Female" }].map((g) => (
              <button key={g.v} onClick={() => setGender(g.v)} className={`chip flex-1 text-center ${gender === g.v ? "chip-red" : ""}`}>{g.l}</button>
            ))}
          </div>
        </Field>
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
          <button onClick={() => { setGender(""); setProvince(""); setAgeMin(""); setAgeMax(""); setRateMin(""); setRateMax(""); }} className="btn-ghost rounded-xl flex-1 py-2.5 text-sm">{t.reset}</button>
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
