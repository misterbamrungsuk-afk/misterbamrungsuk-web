"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { baht } from "./ui";
import { catBySlug } from "@/lib/categories";
import type { Post } from "@/lib/types";
import { isNewProvider, queueLabel } from "@/lib/membership";

// การ์ดแบบรูปเต็ม (photo-first) ตามดีไซน์ Mister Bamrungsuk v2 — ใช้ในกริด 2 คอลัมน์
export default function PostCard({ post }: { post: Post }) {
  const { t, lang } = useI18n();
  const [fav, setFav] = useState(false);
  const cover = post.images[0] ?? post.member.avatar;
  const mainCat = catBySlug(post.categories[0] ?? "");

  return (
    <article className="relative h-[250px] rounded-[20px] overflow-hidden bg-ink-700 animate-rise">
      <Link href={`/post/${post.id}`} className="absolute inset-0" aria-label={post.member.name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt={post.member.name} className="w-full h-full object-cover" />
      </Link>

      <div className="absolute top-2.5 left-2.5 right-12 flex flex-wrap gap-1 pointer-events-none">
        {post.member.kycVerified && (
          <span className="h-[22px] px-2 rounded-full bg-white/95 shadow-sm text-ink-100 text-[11px] font-semibold flex items-center gap-1">
            <span className="text-emerald-600">✓</span> {t.verified}
          </span>
        )}
        {isNewProvider(post) && <span className="h-[22px] px-2 rounded-full bg-crimson-500 text-white text-[11px] font-semibold flex items-center">{lang === "th" ? "หน้าใหม่" : "New"}</span>}
        {post.premium && <span className="h-[22px] px-2 rounded-full bg-gold-500 text-[#1a1206] text-[11px] font-semibold flex items-center">♛ Premium</span>}
      </div>
      <button
        onClick={() => setFav(!fav)}
        aria-label="favorite"
        aria-pressed={fav}
        className={`absolute top-1.5 right-1.5 w-9 h-9 grid place-items-center rounded-full transition
          ${fav ? "bg-crimson-500 text-white" : "bg-white/95 shadow-sm text-ink-200 hover:text-crimson-500"}`}
      >
        <svg viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-[17px] h-[17px]">
          <path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9z" />
        </svg>
      </button>

      <Link href={`/post/${post.id}`} className="photo-scrim absolute inset-x-0 bottom-0 pt-10 px-3 pb-3 block">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display font-semibold text-[17px] truncate">{post.member.name}, {post.member.age}</p>
          {post.rating != null && <span className="shrink-0 inline-flex items-center gap-0.5 h-[22px] px-2 rounded-full bg-white shadow-sm text-[11.5px] font-bold text-ink-100"><span className="text-amber-500">★</span>{post.rating.toFixed(1)}</span>}
        </div>
        <p className="text-[11px] font-medium text-ink-100 flex items-center gap-1 truncate">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${(post.nextFreeMin ?? 0) <= 0 ? "bg-emerald-500" : "bg-gold-500"}`} />{queueLabel(post, lang === "th")}
        </p>
        <p className="text-xs text-ink-200 truncate">
          {mainCat ? (lang === "th" ? mainCat.th : mainCat.en) : ""} · {post.province}
        </p>
        <p className="font-display font-semibold text-base text-gold-300 mt-0.5">
          {baht(post.pricePerHour)}<span className="text-[11px] text-ink-300 font-normal font-sans"> {t.perHour}</span>
        </p>
      </Link>
    </article>
  );
}
