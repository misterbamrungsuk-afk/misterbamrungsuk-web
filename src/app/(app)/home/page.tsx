"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import PostCard from "@/components/post-card";
import { HeroSlider } from "@/components/hero-slider";
import { Sheet, Field } from "@/components/ui";
import { CATEGORIES, PROVINCES } from "@/lib/categories";
import type { Post } from "@/lib/types";
import { isDemo } from "@/lib/data";
import { DEMO_POSTS } from "@/lib/demo-data";
import { isPremiumUnlocked, recommendedSort, MEMBERSHIP } from "@/lib/membership";
import { baht } from "@/components/ui";


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
  const [premiumOpen, setPremiumOpen] = useState(false);
  useEffect(() => { setPremiumOpen(isPremiumUnlocked()); }, []);
  const premiumPosts = useMemo(() => posts.filter((p) => p.premium).sort(recommendedSort), [posts]);

  const filtered = useMemo(() => {
    // หมอพรีเมียมแสดงในฟีดหลักเฉพาะเมื่อปลดล็อกแล้ว
    let list = posts.filter((p) => premiumOpen || !p.premium);
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
    // เรียงแบบ "แนะนำ": ดันหมอหน้าใหม่ (เข้าร่วม ≤30 วัน) ขึ้นก่อน
    return list.sort(recommendedSort);
  }, [posts, premiumOpen, q, cat, province, ageMin, ageMax, rateMin, rateMax]);

  const activeFilters = [province, ageMin, ageMax, rateMin, rateMax].filter(Boolean).length;
  // หมอแนะนำ: ยืนยันตัวตนแล้ว เรียงตามคะแนน (ไม่รวมพรีเมียมถ้ายังไม่ปลดล็อก)
  const featured = useMemo(() => posts.filter((p) => p.member.kycVerified && (premiumOpen || !p.premium)).sort((x, y) => (y.rating ?? 0) - (x.rating ?? 0)).slice(0, 5), [posts, premiumOpen]);

  return (
    <>
      <TopBar />

      {/* ── สไลด์หมอแนะนำ ── */}
      <HeroSlider posts={featured} lang={lang} />

      {/* ── รับสมัครหมอ (sale funnel /join) ── */}
      <section className="px-4 pt-4">
        <Link href="/join" className="flex items-center gap-3 rounded-2xl border border-gold-500/40 bg-[linear-gradient(120deg,rgba(224,164,0,.12),rgba(224,36,60,.08))] px-4 py-3.5">
          <span className="w-11 h-11 rounded-xl bg-gold-500 text-[#1a1206] grid place-items-center font-display font-bold shrink-0">MB</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-semibold">{lang === "th" ? "เปิดรับสมัครหมอนวด & เพื่อนเที่ยว" : "Now recruiting therapists & companions"}</span>
            <span className="block text-xs text-ink-300">{lang === "th" ? "รับจำกัด 50 ท่าน · อบรม 2 วัน · รายได้ระดับพรีเมียม" : "50 seats · 2-day training · premium income"}</span>
          </span>
          <span className="text-gold-300 text-lg" aria-hidden>→</span>
        </Link>
      </section>

      {/* ── สมาชิก ── */}
      <section className="px-4 pt-3">
        <Link href="/membership" className="glass rounded-2xl flex items-center gap-3 px-4 py-3.5">
          <span className="w-11 h-11 rounded-xl bg-crimson-500 text-white grid place-items-center text-lg shrink-0">♛</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-semibold">{lang === "th" ? "สมาชิก & แพ็กเกจ 5/10 ครั้ง" : "Membership & 5/10-session packs"}</span>
            <span className="block text-xs text-ink-300">{lang === "th" ? `เริ่ม ${baht(MEMBERSHIP.monthlyFee)}/เดือน · ซื้อเป็นของขวัญได้` : `From ${baht(MEMBERSHIP.monthlyFee)}/mo · giftable`}</span>
          </span>
          <span className="text-ink-400 text-lg" aria-hidden>→</span>
        </Link>
      </section>

      {/* ── หมอพรีเมียม (ล็อกจนกว่าจะเป็นสมาชิก/รับของขวัญ) ── */}
      {premiumPosts.length > 0 && (
        <section id="premium" className="px-4 pt-8 scroll-mt-16">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display font-bold text-[22px] leading-tight tracking-tight flex items-center gap-2">
              Premium <span className="chip chip-gold text-[11px]">♛ {lang === "th" ? "สมาชิกเท่านั้น" : "Members only"}</span>
            </h2>
            {!premiumOpen && <Link href="/membership" className="text-[13px] text-gold-600 min-h-9 inline-flex items-center">{lang === "th" ? "ปลดล็อก" : "Unlock"}</Link>}
          </div>
          {premiumOpen ? (
            <div className="grid grid-cols-2 gap-2.5 mt-3">
              {premiumPosts.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          ) : (
            <div className="relative mt-3 rounded-[20px] overflow-hidden">
              <div className="grid grid-cols-3 gap-2 blur-md pointer-events-none select-none" aria-hidden>
                {premiumPosts.slice(0, 3).map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={p.images[0] ?? p.member.avatar} alt="" className="w-full h-36 object-cover rounded-xl" />
                ))}
              </div>
              <div className="absolute inset-0 grid place-items-center bg-ink-900/40 text-center px-4">
                <div>
                  <p className="text-2xl">🔒</p>
                  <p className="text-sm font-semibold mt-1">{lang === "th" ? `หมอพรีเมียม ${premiumPosts.length} คน` : `${premiumPosts.length} Premium therapists`}</p>
                  <div className="flex gap-2 justify-center mt-2">
                    <Link href="/membership" className="btn-crimson rounded-xl h-10 px-4 grid place-items-center text-[13px] font-semibold">{lang === "th" ? "สมัครสมาชิก" : "Join"}</Link>
                    <Link href="/membership/redeem" className="btn-ghost rounded-xl h-10 px-4 grid place-items-center text-[13px]">{lang === "th" ? "ใช้โค้ดของขวัญ" : "Redeem gift"}</Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── หาความผ่อนคลายในแบบคุณ ── */}
      <section id="find" className="px-4 pt-8 scroll-mt-16">
        <h2 className="font-display font-bold text-[26px] leading-tight tracking-tight">{lang === "th" ? "หาความผ่อนคลายในแบบคุณ" : "Find your kind of calm"}</h2>
        <p className="text-[13px] text-ink-300 mt-1">{lang === "th" ? "เลือกเทคนิค แล้วพบหมอนวดของคุณ" : "Choose a technique. Meet your therapist."}</p>

        <div className="relative mt-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px] absolute left-4 top-1/2 -translate-y-1/2 text-ink-300">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} className="input-dark h-12 pl-11" />
        </div>

        {/* หมวด: ปุ่มกล่อง */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-4 -mx-4 px-4">
          <button onClick={() => setCat("")} className={`shrink-0 h-11 px-5 rounded-xl border text-[14px] transition ${!cat ? "bg-crimson-500 text-white border-ink-100 font-semibold" : "border-ink-600 text-ink-200"}`}>{t.allCategories}</button>
          {CATEGORIES.filter((c) => c.slug !== "other").map((c) => (
            <button key={c.slug} onClick={() => setCat(cat === c.slug ? "" : c.slug)}
              className={`shrink-0 h-11 px-5 rounded-xl border text-[14px] whitespace-nowrap transition ${cat === c.slug ? "bg-crimson-500 text-white border-ink-100 font-semibold" : "border-ink-600 text-ink-200"}`}>
              {lang === "th" ? c.th : c.en}
            </button>
          ))}
        </div>

        {/* ตัวกรอง */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          {[
            { k: "age", th: "อายุ", en: "Age", on: !!(ageMin || ageMax), icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" },
            { k: "rate", th: "ราคา", en: "Rate", on: !!(rateMin || rateMax), icon: "M12 3v18M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6" },
            { k: "area", th: "พื้นที่", en: "Area", on: !!province, icon: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" },
          ].map((x) => (
            <button key={x.k} onClick={() => setFilterOpen(true)}
              className={`shrink-0 h-10 pl-3 pr-3.5 rounded-xl border text-[13px] inline-flex items-center gap-1.5 ${x.on ? "border-gold-500 text-gold-300" : "border-ink-600 text-ink-200"}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d={x.icon} /></svg>
              {lang === "th" ? x.th : x.en}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 opacity-60"><path d="m6 9 6 6 6-6" /></svg>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-3 mb-3">
          <span className="text-[12px] font-semibold rounded-full bg-ink-800 border border-ink-600 px-3 py-1">{lang === "th" ? `พบ ${filtered.length} คน` : `${filtered.length} found`}</span>
          {(activeFilters > 0 || cat || q) && (
            <button onClick={() => { setCat(""); setQ(""); setProvince(""); setAgeMin(""); setAgeMax(""); setRateMin(""); setRateMax(""); }}
              className="text-[13px] text-ink-200 inline-flex items-center gap-1.5 min-h-9 px-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></svg>
              {lang === "th" ? "รีเซ็ตตัวกรอง" : "Reset filters"}
            </button>
          )}
        </div>
      </section>

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
