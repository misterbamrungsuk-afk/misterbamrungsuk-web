"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { EmptyState, Modal, baht } from "@/components/ui";
import { DEMO_POSTS } from "@/lib/demo-data";
import { activityLabel, placeBySlug, skillBySlug } from "@/lib/categories";
import { site } from "@/lib/site";

export default function MyPostPage() {
  const { t, lang } = useI18n();
  // demo: บัญชีนี้ยังไม่มีโพสต์ (จำกัด 1 โพสต์/บัญชี — สร้างต้องผ่าน KYC)
  const [post, setPost] = useState(DEMO_POSTS.find((p) => p.id === "p7") ?? null); // ทดลองให้เป็นเจ้าของโพสต์ Smart เพื่อโชว์หน้าจัดการ
  const [expired, setExpired] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [days, setDays] = useState(12);

  return (
    <>
      <TopBar back="/profile" title={`📝 ${t.myPost}`} />
      <div className="px-4 py-4">
        {!post ? (
          <div className="text-center py-16">
            <EmptyState icon="📝" title={t.noPost} sub={t.postLimitNote} />
            <Link href="/post/create" className="btn-crimson rounded-xl px-6 py-3 font-semibold mt-2 inline-block">＋ {t.createPost}</Link>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden animate-rise">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.images[0]} alt="" className="w-full aspect-[16/9] object-cover" />
              {hidden && <div className="absolute inset-0 bg-black/70 grid place-items-center font-semibold">🚫 {t.hidePost}</div>}
              <div className="absolute top-3 left-3 flex gap-2">
                <span className={`chip ${expired ? "chip-red" : "chip-gold"}`}>
                  {expired ? "⏳ " + (lang === "th" ? "หมดอายุ" : "Expired") : `📅 ${days} ${lang === "th" ? "วัน" : "days"}`}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">{post.member.name}</p>
                  <p className="text-gold-600 font-semibold">3 {lang === "th" ? "ชม." : "h"} {baht(post.price3h)} · 5 {lang === "th" ? "ชม." : "h"} {baht(post.price5h)}</p>
                  <p className="text-[11px] text-ink-300">{lang === "th" ? `หักค่าธรรมเนียม ${site.commissionPercent}% คุณได้ ${100 - site.commissionPercent}%` : `${site.commissionPercent}% fee · you get ${100 - site.commissionPercent}%`}</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex flex-wrap gap-1">{post.activities.map((c) => <span key={c} className="chip">{activityLabel(c, lang === "th")}</span>)}</div>
                {post.skills.length > 0 && <div className="flex flex-wrap gap-1">{post.skills.map((k) => <span key={k} className="chip chip-gold">{lang === "th" ? skillBySlug(k)?.th : skillBySlug(k)?.en}</span>)}</div>}
                <p className="text-ink-300">📍 {post.places.map((k) => (lang === "th" ? placeBySlug(k)?.th : placeBySlug(k)?.en) ?? k).join(" · ")}</p>
              </div>
              <div className="gold-line" />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setDays(30); setExpired(false); }} className="btn-ghost rounded-xl py-2.5 text-sm">
                  ♻️ {t.extendPost}
                </button>
                <button onClick={() => setHidden(!hidden)} className="btn-ghost rounded-xl py-2.5 text-sm">
                  {hidden ? "👁 " + t.showPost : "🚫 " + t.hidePost}
                </button>
                <Link href="/post/create?id=p7" className="btn-ghost rounded-xl py-2.5 text-sm text-center">✏️ {t.editPost}</Link>
                <Link href="/jobs/interested" className="btn-ghost rounded-xl py-2.5 text-sm text-center">❤️ {t.interestedCount}</Link>
                <button onClick={() => setDeleteOpen(true)} className="btn-ghost rounded-xl py-2.5 text-sm text-crimson-300">🗑 {t.delete}</button>
              </div>
              <p className="text-[11px] text-ink-500 text-center">{t.postLimitNote}</p>
            </div>
          </div>
        )}
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title={`🗑 ${t.delete}`}>
        <p className="text-sm text-ink-300 mb-4">{lang === "th" ? "ลบโพสต์นี้ถาวร?" : "Delete this post permanently?"}</p>
        <div className="flex gap-2">
          <button onClick={() => setDeleteOpen(false)} className="btn-ghost rounded-xl flex-1 py-2.5 text-sm">{t.cancel}</button>
          <button onClick={() => { setPost(null); setDeleteOpen(false); }} className="btn-crimson rounded-xl flex-1 py-2.5 text-sm font-semibold">{t.delete}</button>
        </div>
      </Modal>
    </>
  );
}
