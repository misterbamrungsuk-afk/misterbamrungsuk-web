"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import PostCard from "@/components/post-card";
import { HeroSlider } from "@/components/hero-slider";
import { ACTIVITIES } from "@/lib/categories";
import { DEFAULT_FILTER, FilterButton, FriendFilterSheet, activeFilterCount, applyFriendFilter, type FriendFilter } from "@/components/friend-filter";
import type { Post } from "@/lib/types";
import { isDemo } from "@/lib/data";
import { DEMO_POSTS } from "@/lib/demo-data";
import { isPremiumUnlocked, recommendedSort, isNewProvider, MEMBERSHIP } from "@/lib/membership";
import { DEMO_ME } from "@/lib/demo-data";

type SortKey = "" | "near" | "rating" | "now" | "new";
import { baht } from "@/components/ui";


function HomeInner({ posts }: { posts: Post[] }) {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>(""); // activity slug
  const [sortKey, setSortKey] = useState<SortKey>("");
  const [seg, setSeg] = useState<"near" | "premium">("near");
  const [filterOpen, setFilterOpen] = useState(false);
  const [ff, setFf] = useState<FriendFilter>(DEFAULT_FILTER);
  const [premiumOpen, setPremiumOpen] = useState(false);
  useEffect(() => { setPremiumOpen(isPremiumUnlocked()); }, []);
  const premiumPosts = useMemo(() => posts.filter((p) => p.premium).sort(recommendedSort), [posts]);

  const filtered = useMemo(() => {
    // เพื่อนพรีเมียมแสดงในฟีดหลักเฉพาะเมื่อปลดล็อกแล้ว
    let list = posts.filter((p) => premiumOpen || !p.premium);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((p) =>
        p.member.name.toLowerCase().includes(s) ||
        (p.personality + p.interests + p.extraInfo + p.serviceArea + p.activities.join(" ")).toLowerCase().includes(s)
      );
    }
    if (cat) list = list.filter((p) => p.activities.includes(cat));
    if (sortKey === "now") list = list.filter((p) => (p.nextFreeMin ?? 0) <= 0);
    if (sortKey === "new") list = list.filter((p) => isNewProvider(p));
    list = applyFriendFilter(list, ff);
    // ค่าเริ่มต้น: รายการจัดอันดับ "แนะนำ" ไม่บังคับกรอง
    if (sortKey === "near") return list.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
    if (sortKey === "rating") return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount);
    return list.sort(recommendedSort);
  }, [posts, premiumOpen, q, cat, sortKey, ff]);
  const onlineCount = useMemo(() => posts.filter((p) => (premiumOpen || !p.premium) && (p.nextFreeMin ?? 0) <= 0).length, [posts, premiumOpen]);

  const activeFilters = activeFilterCount(ff);
  const countFor = (f: FriendFilter) => applyFriendFilter(posts.filter((p) => premiumOpen || !p.premium), f).length;
  // เพื่อนแนะนำ: ยืนยันตัวตนแล้ว เรียงตามคะแนน (ไม่รวมพรีเมียมถ้ายังไม่ปลดล็อก)
  const featured = useMemo(() => posts.filter((p) => p.member.kycVerified && (premiumOpen || !p.premium)).sort((x, y) => (y.rating ?? 0) - (x.rating ?? 0)).slice(0, 5), [posts, premiumOpen]);

  return (
    <>
      <TopBar />

      {/* ── ทักทาย + แท็บ ── */}
      <section className="px-4 pt-3">
        <p className="text-[13px] text-ink-300">{lang === "th" ? `สวัสดีค่ะ คุณ${DEMO_ME.name}` : `Hello, ${DEMO_ME.name}`}</p>
        <h1 className="font-display font-bold text-[28px] leading-tight tracking-tight text-gold-500 mt-0.5">{lang === "th" ? <>วันนี้อยากไปไหน <span className="whitespace-nowrap">กับใคร?</span></> : "Where to today, and with whom?"}</h1>
        <div className="mt-4 grid grid-cols-2 p-1 rounded-2xl border border-ink-600 bg-ink-800" role="tablist">
          {([["near", lang === "th" ? "ใกล้คุณ" : "Near you"], ["premium", lang === "th" ? "♛ พรีเมียม" : "♛ Premium"]] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={seg === k}
              onClick={() => { setSeg(k); document.getElementById(k === "near" ? "find" : "premium")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              className={`h-10 rounded-xl text-[14px] font-semibold transition ${seg === k ? "bg-crimson-500 text-white" : "text-ink-300"}`}>{l}</button>
          ))}
        </div>
      </section>

      {/* ── สไลด์เพื่อนแนะนำ ── */}
      <HeroSlider posts={featured} lang={lang} />

      {/* ── รับสมัคร Part-Time (sale funnel /join) ── */}
      <section className="px-4 pt-4">
        <Link href="/join" className="flex items-center gap-3 rounded-2xl border border-gold-500/40 bg-[linear-gradient(120deg,rgba(224,164,0,.12),rgba(224,36,60,.08))] px-4 py-3.5">
          <span className="w-11 h-11 rounded-xl bg-gold-500 text-[#1a1206] grid place-items-center font-display font-bold shrink-0">MB</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-semibold">{lang === "th" ? "เปิดรับสมัคร Part-Time เพื่อนกินเที่ยว" : "Now recruiting Part-Time companions"}</span>
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

      {/* ── เพื่อนพรีเมียม (ล็อกจนกว่าจะเป็นสมาชิก/รับของขวัญ) ── */}
      {premiumPosts.length > 0 && (
        <section id="premium" className="px-4 pt-8 scroll-mt-16">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display font-bold text-[22px] leading-tight tracking-tight flex items-center gap-2">
              Premium <span className="chip chip-gold text-[11px]">♛ {lang === "th" ? "สมาชิกเท่านั้น" : "Members only"}</span>
            </h2>
            {!premiumOpen && <Link href="/membership" className="text-[13px] text-gold-500 min-h-9 inline-flex items-center">{lang === "th" ? "ปลดล็อก" : "Unlock"}</Link>}
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
                  <p className="text-sm font-semibold mt-1">{lang === "th" ? `เพื่อนพรีเมียม ${premiumPosts.length} คน` : `${premiumPosts.length} premium companions`}</p>
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

      {/* ── ใกล้คุณ ── */}
      <section id="find" className="px-4 pt-8 scroll-mt-16">
        <div className="flex items-end justify-between gap-2">
          <h2 className="font-display font-bold text-[24px] leading-tight tracking-tight text-gold-500">{lang === "th" ? "ใกล้คุณ" : "Near you"}</h2>
          <span className="text-[12px] text-ink-300 inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />{lang === "th" ? `ออนไลน์ ${onlineCount} คน` : `${onlineCount} online`}</span>
        </div>

        <div className="mt-3 flex gap-2">
        <div className="relative flex-1 min-w-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px] absolute left-4 top-1/2 -translate-y-1/2 text-ink-300">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} className="input-dark h-12 pl-11" />
        </div>
          <FilterButton count={activeFilters} onClick={() => setFilterOpen(true)} th={lang === "th"} />
        </div>

        {/* กิจกรรม: ไอคอนเส้น */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pt-4 pb-2 -mx-4 px-4">
          {ACTIVITIES.map((a) => {
            const on = cat === a.slug;
            return (
              <button key={a.slug} onClick={() => setCat(on ? "" : a.slug)} aria-pressed={on}
                className={`shrink-0 w-[76px] py-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition ${on ? "border-gold-500 bg-gold-500/10 text-gold-300" : "border-ink-600 bg-ink-800 text-ink-200"}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d={a.icon} /></svg>
                <span className="text-[11px] leading-tight text-center whitespace-nowrap">{lang === "th" ? a.th : a.en}</span>
              </button>
            );
          })}
        </div>

        {/* เรียง / ด่วน */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-2">
          {([["near", "ใกล้ที่สุด", "Nearest"], ["rating", "คะแนนสูงสุด", "Top rated"], ["now", "ว่างตอนนี้", "Free now"], ["new", "หน้าใหม่", "New"]] as const).map(([k, thL, enL]) => (
            <button key={k} onClick={() => setSortKey(sortKey === k ? "" : k)} aria-pressed={sortKey === k}
              className={`shrink-0 h-9 px-4 rounded-full border text-[13px] whitespace-nowrap transition ${sortKey === k ? "bg-crimson-500 border-crimson-500 text-white font-semibold" : "border-ink-600 text-ink-200"}`}>
              {lang === "th" ? thL : enL}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-3 mb-3">
          <span className="text-[12px] font-semibold rounded-full bg-ink-800 border border-ink-600 px-3 py-1">{lang === "th" ? `พบ ${filtered.length} คน` : `${filtered.length} found`}</span>
          {(activeFilters > 0 || cat || q || sortKey) && (
            <button onClick={() => { setCat(""); setQ(""); setSortKey(""); setFf(DEFAULT_FILTER); }}
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
          <div className="text-center py-20 text-ink-300">{lang === "th" ? "ยังไม่เจอเพื่อนที่ตรงใจ ลองเลือกกิจกรรมให้น้อยลงดูนะคะ" : "No match yet — try fewer activities"}</div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filtered.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        )}
      </div>

      {/* ตัวกรองเต็ม (S03) */}
      <FriendFilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} value={ff} onApply={setFf} count={countFor} th={lang === "th"} />
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
