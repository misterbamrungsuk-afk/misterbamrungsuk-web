"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Stars, VerifiedBadge, baht, Modal, Field, Sheet } from "@/components/ui";
import { catBySlug } from "@/lib/categories";
import { DEMO_POSTS, DEMO_REVIEWS } from "@/lib/demo-data";
import { isDemo } from "@/lib/data";

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

  if (!post) {
    return (
      <>
        <TopBar back="/home" />
        <div className="text-center py-24 text-ink-400">🌙 {t.empty}</div>
      </>
    );
  }
  void isDemo;

  return (
    <>
      <TopBar back="/home" title={post.member.name} />

      {/* gallery (แนว Spafy: รูปโค้งในกรอบ) */}
      <div className="px-4 pt-2">
        <div className="relative rounded-3xl overflow-hidden bg-ink-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.images[imgIdx]} alt={post.member.name} className="w-full aspect-[4/3] object-cover" />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {post.images.map((_, i) => (
              <button key={i} onClick={() => setImgIdx(i)} aria-label={`image ${i + 1}`} className="h-9 min-w-9 px-1.5 grid place-items-center">
                <span className={`block h-1.5 rounded-full transition-all ${i === imgIdx ? "w-5 bg-gold-500" : "w-1.5 bg-white/60"}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* head: ชื่อ + ราคา */}
        <section className="animate-rise">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold">{post.member.name}, {post.member.age}</h1>
                {post.member.kycVerified && <VerifiedBadge label={t.verified} />}
              </div>
              <p className="text-xs text-ink-300 mt-1">🕓 {post.workingHours} · 📍 {post.province}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display font-semibold text-lg text-gold-600">{baht(post.pricePerHour)}<span className="text-xs text-ink-300 font-normal">{t.perHour}</span></p>
              <p className="text-xs text-ink-300 flex items-center justify-end gap-1"><span className="text-amber-500">★</span> {(post.rating ?? 0).toFixed(1)} ({post.reviewCount} {lang === "th" ? "รีวิว" : "reviews"})</p>
            </div>
          </div>

          {/* แถบไอคอน 4 ช่อง */}
          <div className="glass rounded-2xl grid grid-cols-4 mt-4 py-3">
            {[
              ["M12 8v4l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", lang === "th" ? "ขั้นต่ำ" : "Min", `${post.minHours} ${t.hoursUnit}`],
              ["M4 7h16M4 12h16M4 17h10", lang === "th" ? "ผ้า/น้ำมัน" : "Kit", lang === "th" ? "เตรียมให้" : "Included"],
              ["M3 10h18M7 3v4M17 3v4M5 6h14v14H5z", lang === "th" ? "วันทำงาน" : "Days", lang === "th" ? "ทุกวัน" : "Daily"],
              ["M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z", lang === "th" ? "มัดจำ" : "Deposit", baht(post.deposit)],
            ].map(([d, k, v]) => (
              <div key={k} className="flex flex-col items-center gap-1 text-center px-1 min-w-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gold-600"><path d={d} /></svg>
                <span className="text-[11px] text-ink-300">{k}</span>
                <span className="text-xs font-medium truncate max-w-full">{v}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.categories.map((c) => {
              const cat = catBySlug(c);
              return <span key={c} className="chip">{lang === "th" ? cat?.th : cat?.en}</span>;
            })}
          </div>
        </section>

        <div className="gold-line" />

        {/* key info grid */}
        <section className="grid grid-cols-2 gap-3 animate-rise">
          {[
            [t.jobPlace, `📍 ${post.province}`],
            [t.serviceArea, post.serviceArea],
            [t.workingHours, `🕓 ${post.workingHours}`],
            [t.languages, post.languages.join(", ")],
            [t.acceptGender, post.acceptGender === "any" ? (lang === "th" ? "ไม่จำกัดเพศ" : "Any gender") : post.acceptGender === "male" ? (lang === "th" ? "รับชาย" : "Male only") : (lang === "th" ? "รับหญิง" : "Female only")],
            [t.minHours, `${post.minHours} ${t.hoursUnit}`],
            [t.deposit, baht(post.deposit)],
            ["✅ " + t.publicMeet, lang === "th" ? "นัดพบที่สาธารณะเท่านั้น" : "Public places only"],
          ].map(([k, v]) => (
            <div key={k} className="glass rounded-xl px-3.5 py-3">
              <p className="text-[10px] text-ink-400 uppercase tracking-wide">{k}</p>
              <p className="text-sm text-ink-100 mt-1 font-medium">{v}</p>
            </div>
          ))}
        </section>

        {/* about */}
        <section className="animate-rise">
          <h2 className="section-title mb-2">{lang === "th" ? "รายละเอียด" : "Details"}</h2>
          <div className="glass rounded-2xl p-4 text-sm text-ink-200 space-y-2">
            <p>😊 {lang === "th" ? "นิสัย" : "Personality"}: {post.personality}</p>
            <p>🌟 {lang === "th" ? "ความสนใจ" : "Interests"}: {post.interests}</p>
            <p>ℹ️ {lang === "th" ? "ข้อมูลเพิ่มเติม" : "More info"}: {post.extraInfo}</p>
          </div>
        </section>

        {/* rules */}
        <section className="animate-rise">
          <h2 className="section-title mb-2">📋 {t.rules}</h2>
          <ul className="glass rounded-2xl p-4 text-sm text-ink-200 space-y-2">
            {post.rules.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-crimson-400">{r.startsWith("ไม่") || r.includes("ห้าม") || r.includes("สาย") ? "❌" : "✅"}</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="flex gap-2 animate-rise">
          <Link href={`/chat/room1`} className="btn-ghost h-12 px-6 grid place-items-center font-semibold">{t.chat}</Link>
          <Link href={`/book/${post.id}`} className="btn-crimson flex-1 h-12 grid place-items-center font-display font-semibold text-base">{lang === "th" ? "จองเลย" : "Book now"}</Link>
        </section>

        <button onClick={() => setReportOpen(true)} className="text-xs text-ink-400 hover:text-crimson-300 underline underline-offset-4">
          🚩 {t.report}
        </button>

        {/* reviews */}
        <section className="animate-rise">
          <h2 className="section-title mb-3">⭐ {t.reviews} ({reviews.length})</h2>
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
