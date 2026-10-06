"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Stars, VerifiedBadge, baht, Modal, Field, Sheet } from "@/components/ui";
import { activityBySlug } from "@/lib/categories";
import { BLOCKS, blockPrice, massageAddonPrice } from "@/lib/booking";
import { DEMO_POSTS, DEMO_REVIEWS } from "@/lib/demo-data";
import { isDemo } from "@/lib/data";
import { isNewProvider, queueLabel } from "@/lib/membership";

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang } = useI18n();
  const post = useMemo(() => DEMO_POSTS.find((p) => p.id === id), [id]);
  const reviews = useMemo(() => DEMO_REVIEWS.filter((r) => r.postId === id), [id]);
  const [imgIdx, setImgIdx] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [loc, setLoc] = useState<"home" | "spa">("home");

  if (!post) {
    return (
      <>
        <TopBar back="/home" />
        <div className="text-center py-24 text-ink-400">🌙 {t.empty}</div>
      </>
    );
  }
  void isDemo;
  const th = lang === "th";
  const free = (post.nextFreeMin ?? 0) <= 0;

  return (
    <>
      <TopBar back="/home" title={post.member.name} />

      {/* gallery: รูปใหญ่ + thumbnails */}
      <div className="px-4 pt-2">
        <div className="relative rounded-3xl overflow-hidden bg-ink-800 border border-gold-500/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.images[imgIdx]} alt={post.member.name} className="w-full aspect-[4/5] object-cover" />
          <span className={`absolute top-3 left-3 h-7 px-3 rounded-full bg-black/60 backdrop-blur border border-gold-500/40 text-[12px] font-semibold text-ink-100 inline-flex items-center gap-1.5`}>
            <span className={`w-2 h-2 rounded-full ${free ? "bg-emerald-500" : "bg-gold-500"}`} />{free ? (th ? "ออนไลน์" : "Online") : queueLabel(post, th)}
          </span>
        </div>
        {post.images.length > 1 && (
          <div className="flex gap-2 mt-2">
            {post.images.map((src, i) => (
              <button key={i} onClick={() => setImgIdx(i)} aria-label={`image ${i + 1}`}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition ${i === imgIdx ? "border-gold-500" : "border-transparent opacity-70"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* head */}
        <section className="animate-rise">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-[26px] font-bold text-gold-500">{post.member.name}</h1>
            {post.member.kycVerified && <VerifiedBadge label={t.verified} />}
            {isNewProvider(post) && <span className="chip bg-crimson-500 text-white border-crimson-500">{th ? "หน้าใหม่" : "New"}</span>}
            {post.premium && <span className="chip chip-gold">♛ Premium</span>}
          </div>
          <p className="text-sm text-ink-300 mt-1">
            {post.member.age} {th ? "ปี" : "y"}{post.heightCm ? ` · ${post.heightCm} ${th ? "ซม." : "cm"}` : ""}{post.distanceKm != null ? ` · ${post.distanceKm} ${th ? "กม." : "km"}` : ""} · {post.province}
          </p>

          {/* stats */}
          <div className="rounded-2xl border border-gold-500/25 bg-ink-800 grid grid-cols-4 mt-4 py-3 divide-x divide-ink-600">
            {[
              [(post.rating ?? 0).toFixed(1), th ? `คะแนน (${post.reviewCount})` : `Rating (${post.reviewCount})`],
              [String(post.jobsDone ?? 0), th ? "งาน" : "Jobs"],
              [`${post.yearsExp ?? 1}`, th ? "ปีประสบการณ์" : "Yrs exp"],
              [`${post.responseRate ?? 90}%`, th ? "ตอบกลับ" : "Response"],
            ].map(([v, k]) => (
              <div key={k} className="flex flex-col items-center text-center px-1 min-w-0">
                <span className="font-display font-semibold text-lg text-gold-300">{v}</span>
                <span className="text-[10.5px] text-ink-300 leading-tight">{k}</span>
              </div>
            ))}
          </div>
        </section>

        {/* about */}
        <section className="animate-rise">
          <h2 className="section-title mb-2">{th ? "เกี่ยวกับ" : "About"}</h2>
          <p className="text-sm text-ink-200 leading-relaxed">{post.personality} · {post.interests}. {post.extraInfo}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.activities.map((s) => { const a = activityBySlug(s); return <span key={s} className="chip">{a ? (th ? a.th : a.en) : s}</span>; })}
            {post.massageSkill && <span className="chip chip-gold">{th ? "มีสกิลนวด (add-on)" : "Massage skill (add-on)"}</span>}
            {post.languages.map((l) => <span key={l} className="chip">{l}</span>)}
          </div>
        </section>

        {/* services */}
        <section className="animate-rise">
          <h2 className="section-title mb-2">{th ? "บริการ" : "Services"}</h2>
          <div className="rounded-2xl border border-gold-500/25 bg-ink-800 divide-y divide-ink-600">
            {BLOCKS.map((h) => (
              <div key={h} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{th ? `Part-Time ${h} ชั่วโมง` : `Part-Time ${h} hours`}</p>
                  <p className="text-xs text-ink-300">{th ? "เพื่อนกินเที่ยว · ทำกิจกรรมตามที่ตกลง" : "Dining & outing companion"}</p>
                </div>
                <span className="font-display font-semibold text-gold-300">{baht(blockPrice(post, h))}</span>
              </div>
            ))}
            {post.massageSkill && (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{th ? "Add-on: สกิลนวด" : "Add-on: massage"}</p>
                  <p className="text-xs text-ink-300">{th ? "เพิ่มได้ตอนจอง" : "Add when booking"}</p>
                </div>
                <span className="font-display font-semibold text-gold-300">+{baht(massageAddonPrice(post))}</span>
              </div>
            )}
          </div>
        </section>

        {/* location choice */}
        <section className="animate-rise">
          <h2 className="section-title mb-2">{th ? "เรียกไปที่ไหน" : "Where to meet"}</h2>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["home", th ? "ที่พักของฉัน" : "My place", th ? "บ้าน คอนโด โรงแรม" : "House, condo, hotel"],
              ["spa", th ? "สปาพาร์ทเนอร์" : "Partner spa", th ? "ห้องส่วนตัวพร้อมอุปกรณ์" : "Private room, fully equipped"],
            ] as const).map(([k, title, sub]) => (
              <button key={k} onClick={() => setLoc(k)} aria-pressed={loc === k}
                className={`rounded-2xl border p-3.5 text-left transition ${loc === k ? "border-gold-500 bg-gold-500/10" : "border-ink-600 bg-ink-800"}`}>
                <span className={`block text-sm font-semibold ${loc === k ? "text-gold-300" : ""}`}>{title}</span>
                <span className="block text-xs text-ink-300 mt-0.5">{sub}</span>
              </button>
            ))}
          </div>
        </section>

        {/* rules */}
        <section className="animate-rise">
          <h2 className="section-title mb-2">{t.rules}</h2>
          <ul className="glass rounded-2xl p-4 text-sm text-ink-200 space-y-2">
            {post.rules.map((r, i) => (
              <li key={i} className="flex gap-2"><span className="text-gold-500">•</span><span>{r}</span></li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="flex gap-2 animate-rise">
          <Link href={`/chat/room1`} className="btn-ghost h-12 px-6 grid place-items-center font-semibold">{t.chat}</Link>
          <Link href={`/book/${post.id}?loc=${loc}`} className="btn-crimson flex-1 h-12 grid place-items-center font-display font-semibold text-base">{th ? "จองเลย" : "Book now"}</Link>
        </section>

        <button onClick={() => setReportOpen(true)} className="text-xs text-ink-400 hover:text-crimson-300 underline underline-offset-4">
          🚩 {t.report}
        </button>

        {/* reviews */}
        <section className="animate-rise">
          <h2 className="section-title mb-3">{t.reviews} ({reviews.length})</h2>
          <div className="rounded-2xl border border-gold-500/25 bg-ink-800 p-4 flex gap-4 items-center mb-3">
            <div className="text-center shrink-0">
              <p className="font-display text-4xl font-bold text-gold-500">{(post.rating ?? 0).toFixed(1)}</p>
              <Stars value={post.rating ?? 0} size={12} />
              <p className="text-[11px] text-ink-300 mt-1">{post.reviewCount} {th ? "รีวิว" : "reviews"}</p>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((n) => {
                const c = reviews.filter((r) => Math.round(r.rating) === n).length;
                const pct = reviews.length ? (c / reviews.length) * 100 : 0;
                return (
                  <div key={n} className="flex items-center gap-2 text-[11px] text-ink-300">
                    <span className="w-3">{n}</span>
                    <span className="flex-1 h-1.5 rounded-full bg-ink-600 overflow-hidden"><span className="block h-full bg-gold-500" style={{ width: `${pct}%` }} /></span>
                    <span className="w-4 text-right">{c}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="space-y-3">
            {reviews.length === 0 && <p className="text-sm text-ink-400">— {t.empty} —</p>}
            {reviews.map((r) => (
              <div key={r.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.reviewer.avatar} alt="" className="w-7 h-7 rounded-full bg-ink-700" />
                    <span className="text-sm font-medium">{r.reviewer.name}</span>
                  </div>
                  <span className="text-xs text-ink-500">{new Date(r.createdAt).toLocaleDateString("th-TH")}</span>
                </div>
                <Stars value={r.rating} />
                <p className="text-sm text-ink-200 mt-2">{r.content}</p>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* report modal */}
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title={`🚩 ${t.report}`}>
        <Field label={t.reportReason}>
          <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} rows={3} className="input-dark" placeholder={lang === "th" ? "เล่าเหตุผลที่รายงาน…" : "Tell us why…"} />
        </Field>
        <div className="flex gap-2">
          <button onClick={() => setReportOpen(false)} className="btn-ghost rounded-xl flex-1 py-2.5 text-sm">{t.cancel}</button>
          <button
            onClick={() => {
              setReportOpen(false);
              if (reportReason.trim()) {
                fetch("/api/report", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ targetType: "post", targetId: id, reason: reportReason }),
                }).catch(() => {});
              }
            }}
            className="btn-crimson rounded-xl flex-1 py-2.5 text-sm font-semibold"
          >{t.send}</button>
        </div>
      </Modal>

      {/* review sheet */}
      <Sheet open={reviewOpen} onClose={() => setReviewOpen(false)} title={t.writeReview}>
        <div className="flex gap-2 justify-center mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} onClick={() => setRating(i)} className={`text-3xl transition ${i <= rating ? "text-amber-500" : "text-ink-600"}`}>★</button>
          ))}
        </div>
        <Field label={t.writeReview}>
          <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={4} className="input-dark" placeholder={t.reviewPlaceholder} />
        </Field>
        <div className="flex gap-2">
          <button onClick={() => setReviewOpen(false)} className="btn-ghost rounded-xl flex-1 py-2.5 text-sm">{t.cancel}</button>
          <button onClick={() => setReviewOpen(false)} className="btn-crimson rounded-xl flex-1 py-2.5 text-sm font-semibold">{t.send}</button>
        </div>
      </Sheet>
    </>
  );
}
