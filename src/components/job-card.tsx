"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { baht } from "./ui";
import type { JobBoard } from "@/lib/types";

export default function JobCard({ job, onInterested }: { job: JobBoard; onInterested?: (id: string, val: boolean) => void }) {
  const { t, lang } = useI18n();
  const [interested, setInterested] = useState(job.isInterested);
  const [count, setCount] = useState(job.interestedCount);

  function toggle() {
    const v = !interested;
    setInterested(v);
    setCount((c) => c + (v ? 1 : -1));
    onInterested?.(job.id, v);
    fetch("/api/interest", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id }),
    }).catch(() => {});
  }

  const dateLabel = (() => {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const d = job.scheduleDate.slice(0, 10);
    if (d === today) return t.today;
    if (d === tomorrow) return t.tomorrow;
    return new Date(job.scheduleDate).toLocaleDateString(lang === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  })();

  return (
    <article className="glass glass-hover rounded-2xl p-4 animate-rise">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={job.owner.avatar} alt={job.owner.name} className="w-11 h-11 rounded-full bg-ink-700 object-cover" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{job.owner.name}</p>
          <p className="text-xs text-ink-400">
            {job.owner.gender === "male" ? (lang === "th" ? "ชาย" : "Male") : (lang === "th" ? "หญิง" : "Female")}, {job.owner.age} · {job.createdAt}
          </p>
        </div>
        <span className={`chip ${job.role === "hirer" ? "chip-gold" : "chip-red"}`}>
          {job.role === "hirer" ? t.roleHirer : t.roleProvider}
        </span>
      </div>

      <h3 className="font-semibold mt-3 leading-snug">{job.title} <span className="text-gold-400">({job.durationHours}{t.hoursUnit})</span></h3>

      <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-ink-300">
        <span>📍 {job.placeName}</span>
        <span>🗺️ {job.province}</span>
        <span>📅 {dateLabel}</span>
        <span>🕒 {job.startTime} – {job.endTime}</span>
      </div>

      {job.images.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
          {job.images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={img} alt="" className="h-20 rounded-xl object-cover border border-white/10" />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <div>
          <p className="text-[10px] text-ink-400">{t.jobBudget}</p>
          <p className="text-gold-400 font-bold">{baht(job.budget)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-400">❤️ {count} {lang === "th" ? "สนใจ" : ""}</span>
          {job.role === "hirer" ? (
            <>
              <button onClick={toggle} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${interested ? "btn-ghost text-gold-300" : "btn-crimson"}`}>
                {interested ? "✓ " + t.interested : t.interested}
              </button>
              <Link href="/chat/room2" className="btn-ghost rounded-xl px-4 py-2 text-sm">{t.chat}</Link>
            </>
          ) : (
            <Link href="/chat/room1" className="btn-crimson rounded-xl px-4 py-2 text-sm font-semibold">{t.chat}</Link>
          )}
        </div>
      </div>
    </article>
  );
}
