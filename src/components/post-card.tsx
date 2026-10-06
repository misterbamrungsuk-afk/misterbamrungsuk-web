"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { baht } from "./ui";
import { activityBySlug } from "@/lib/categories";
import type { Post } from "@/lib/types";
import { isNewProvider, queueLabel } from "@/lib/membership";
import { blockPrice } from "@/lib/booking";

const pill = "h-[22px] px-2 rounded-full bg-black/60 backdrop-blur border border-gold-500/40 text-ink-100 text-[11px] font-semibold flex items-center gap-1";

// การ์ดรูปเต็ม (photo-first) ธีมดำ-แดง-ทอง — ใช้ในกริด 2 คอลัมน์
export default function PostCard({ post }: { post: Post }) {
  const { t, lang } = useI18n();
  const th = lang === "th";
  const [fav, setFav] = useState(false);
  const cover = post.images[0] ?? post.member.avatar;
  const free = (post.nextFreeMin ?? 0) <= 0;
  const skills = post.activities.slice(0, 2).map((s) => { const a = activityBySlug(s); return a ? (th ? a.th : a.en) : s; });
  if (post.skills.includes("massage")) skills.push(th ? "นวดผ่อนคลาย" : "Massage");

  return (
    <article className="rounded-[20px] overflow-hidden bg-ink-800 border border-gold-500/20 animate-rise">
      <div className="relative h-[200px]">
        <Link href={`/post/${post.id}`} className="absolute inset-0" aria-label={post.member.name}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt={post.member.name} className="w-full h-full object-cover" />
        </Link>
        <div className="absolute top-2 left-2 right-11 flex flex-wrap gap-1 pointer-events-none">
          {isNewProvider(post) && <span className="h-[22px] px-2 rounded-full bg-crimson-500 text-white text-[11px] font-semibold flex items-center">{th ? "หน้าใหม่" : "New"}</span>}
          {post.premium && <span className="h-[22px] px-2 rounded-full bg-gold-500 text-[#1a1206] text-[11px] font-semibold flex items-center">♛ Premium</span>}
          {post.member.kycVerified && <span className={pill}><span className="text-emerald-400">✓</span> {t.verified}</span>}
        </div>
        <button
          onClick={() => setFav(!fav)}
          aria-label="favorite"
          aria-pressed={fav}
          className={`absolute top-1 right-1 w-9 h-9 grid place-items-center rounded-full transition
            ${fav ? "bg-crimson-500 text-white" : "bg-black/60 backdrop-blur border border-gold-500/40 text-ink-100 hover:text-crimson-400"}`}
        >
          <svg viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-[17px] h-[17px]">
            <path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9z" />
          </svg>
        </button>
        <span className={`${pill} absolute bottom-2 left-2`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${free ? "bg-emerald-500" : "bg-gold-500"}`} />{queueLabel(post, th)}
        </span>
      </div>

      <Link href={`/post/${post.id}`} className="block px-3 pt-2.5 pb-3">
        <p className="font-display font-semibold text-[16px] truncate text-ink-100">{post.member.name}, {post.member.age}</p>
        <p className="text-[11.5px] text-ink-300 flex items-center gap-1 truncate">
          {post.rating != null && <><span className="text-gold-500">★</span><span className="text-ink-100 font-semibold">{post.rating.toFixed(1)}</span><span>({post.reviewCount})</span><span>·</span></>}
          <span>{post.distanceKm != null ? `${post.distanceKm} ${th ? "กม." : "km"}` : post.province}</span>
        </p>
        <p className="text-[11px] text-ink-300 truncate mt-0.5">{skills.join(" · ")}</p>
        <p className="font-display font-semibold text-[15px] text-gold-300 mt-1">
          {baht(blockPrice(post, 3))}<span className="text-[11px] text-ink-300 font-normal font-sans"> / 3 {th ? "ชม." : "h"}</span>
        </p>
      </Link>
    </article>
  );
}
