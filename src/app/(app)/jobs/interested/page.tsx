"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Stars, VerifiedBadge, baht, EmptyState } from "@/components/ui";
import { DEMO_JOBS, DEMO_MEMBERS } from "@/lib/demo-data";

export default function InterestedListPage() {
  const { t, lang } = useI18n();
  const myJobs = DEMO_JOBS.filter((j) => j.owner.id === "me" || j.role === "provider");
  const [activeJob, setActiveJob] = useState(myJobs[0]?.id ?? "");
  const job = myJobs.find((j) => j.id === activeJob);

  // จำลองรายชื่อผู้สนใจ (โหมดจริง: JobInterest ต่อ job)
  const interestedPeople = [
    { member: DEMO_MEMBERS[0], at: "12:04", msg: lang === "th" ? "สนใจครับ ไปได้เลย" : "Interested!" },
    { member: DEMO_MEMBERS[3], at: "12:31", msg: lang === "th" ? "ว่างตรงเวลานี้ค่ะ 🙌" : "Free at that time 🙌" },
    { member: DEMO_MEMBERS[7], at: "13:15", msg: lang === "th" ? "พร้อมเสมอครับ" : "Always ready" },
  ];

  return (
    <>
      <TopBar back="/jobs" title={`❤️ ${t.interestedCount}`} />
      <div className="px-4 pt-4 flex gap-2 overflow-x-auto no-scrollbar">
        {myJobs.map((j) => (
          <button key={j.id} onClick={() => setActiveJob(j.id)} className={`chip whitespace-nowrap ${activeJob === j.id ? "chip-red" : ""}`}>
            {j.title.slice(0, 18)}…
          </button>
        ))}
      </div>

      {job && (
        <div className="px-4 py-3">
          <div className="glass rounded-2xl p-4">
            <p className="font-semibold">{job.title} <span className="text-gold-600">({job.durationHours}{t.hoursUnit})</span></p>
            <p className="text-xs text-ink-400 mt-1">📍 {job.placeName} · 📅 {job.scheduleDate.slice(0, 10)} · {job.startTime}–{job.endTime} · {baht(job.budget)}</p>
          </div>
        </div>
      )}

      <div className="px-4 grid gap-2 pb-4">
        {interestedPeople.length === 0 && <EmptyState icon="❤️" title={t.empty} />}
        {interestedPeople.map(({ member, at, msg }) => (
          <div key={member.id} className="glass glass-hover rounded-2xl p-4 flex items-center gap-3 animate-rise">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={member.avatar} alt="" className="w-12 h-12 rounded-full bg-ink-700 object-cover" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">{member.name}</p>
                {member.kycVerified && <VerifiedBadge label={t.verified} />}
              </div>
              <Stars value={4.8} />
              <p className="text-xs text-ink-400 truncate mt-0.5">💬 {msg} · {at}</p>
            </div>
            <Link href="/chat/room1" className="btn-crimson rounded-xl px-4 py-2 text-sm font-semibold">{t.chat}</Link>
          </div>
        ))}
      </div>
    </>
  );
}
