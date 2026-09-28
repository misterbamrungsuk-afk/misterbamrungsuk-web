"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Stars, VerifiedBadge, baht } from "./ui";
import { catBySlug } from "@/lib/categories";
import type { Post } from "@/lib/types";

export default function PostCard({ post }: { post: Post }) {
  const { t, lang } = useI18n();
  const [fav, setFav] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const images = post.images.length ? post.images : [];

  return (
    <article className="glass glass-hover rounded-2xl overflow-hidden animate-rise">
      <div className="relative">
        <Link href={`/post/${post.id}`} className="block aspect-[4/3] bg-ink-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[imgIdx]} alt={post.member.name} className="w-full h-full object-cover" />
        </Link>
        {post.member.kycVerified && (
          <div className="absolute top-3 left-3"><VerifiedBadge label={t.verified} /></div>
        )}
        <button
          onClick={() => setFav(!fav)}
          aria-label="favorite"
          className={`absolute top-3 right-3 w-9 h-9 grid place-items-center rounded-full backdrop-blur transition
            ${fav ? "bg-crimson-600/90 text-white scale-110" : "bg-black/50 text-white/80 hover:text-crimson-300"}`}
        >
          <svg viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M12 21s-7.5-4.8-9.8-9.1C.7 8.9 2.4 5 6.1 5c2.2 0 3.6 1.2 4.4 2.4h3c.8-1.2 2.2-2.4 4.4-2.4 3.7 0 5.4 3.9 3.9 6.9C19.5 16.2 12 21 12 21z"/>
          </svg>
        </button>
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={() => setImgIdx(i)} aria-label={`image ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === imgIdx ? "w-4 bg-crimson-400" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
        )}
      </div>

      <Link href={`/post/${post.id}`} className="block p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-ink-100 truncate">
            {post.member.name}, {post.member.age}
          </p>
          <Stars value={post.rating} />
        </div>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-ink-300">
          <span className="chip">{post.member.gender === "male" ? (lang === "th" ? "ชาย" : "Male") : post.member.gender === "female" ? (lang === "th" ? "หญิง" : "Female") : "—"}</span>
          <span className="truncate">📍 {post.province}</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-2.5">
          {post.categories.slice(0, 3).map((c) => {
            const cat = catBySlug(c);
            return <span key={c} className="chip">{cat?.emoji} {lang === "th" ? cat?.th : cat?.en}</span>;
          })}
          {post.categories.length > 3 && <span className="chip chip-red">+{post.categories.length - 3}</span>}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <span className="text-gold-400 font-bold">{baht(post.pricePerHour)}<span className="text-ink-400 text-xs font-normal">{t.perHour}</span></span>
          <span className="text-crimson-400 text-sm font-semibold flex items-center gap-1">{t.chat} →</span>
        </div>
      </Link>
    </article>
  );
}
