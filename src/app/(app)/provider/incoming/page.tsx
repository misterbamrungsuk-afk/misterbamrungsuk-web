"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Stars, VerifiedBadge, baht, EmptyState } from "@/components/ui";
import { DEMO_INCOMING, type IncomingJob } from "@/lib/demo-data";

export default function IncomingJobsPage() {
  const { t, lang } = useI18n();
  const [jobs, setJobs] = useState<IncomingJob[]>(DEMO_INCOMING);
  const [seconds, setSeconds] = useState<Record<string, number>>({});

  // countdown 15 วิ ต่องาน — หมดเวลา = ส่งต่อคนอื่น (ตัวจริงตรวจฝั่ง server ที่ expiresAt)
  useEffect(() => {
    const iv = setInterval(() => {
      setSeconds((s) => {
        const next = { ...s };
        for (const j of jobs) {
          if (next[j.id] === undefined) next[j.id] = j.acceptSeconds;
          else if (next[j.id] > 0) next[j.id] -= 1;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [jobs]);

  function decide(job: IncomingJob, accept: boolean) {
    setJobs((js) => js.filter((j) => j.id !== job.id));
    if (accept) window.location.href = "/provider/job/" + job.id;
  }

  return (
    <>
      <TopBar back="/provider" title={`📡 ${lang === "th" ? "งานเข้า" : "Incoming jobs"}`} />
      <div className="px-4 py-4 grid gap-3">
        {jobs.length === 0 && (
          <EmptyState
            icon="📡"
            title={lang === "th" ? "ยังไม่มีงานเข้า" : "No incoming jobs"}
            sub={lang === "th" ? "เปิดรับงานไว้ ระบบจะบรอดแคสต์งานในพื้นที่มาหาคุณเอง" : "Stay online — nearby jobs will be broadcast to you"}
          />
        )}
        {jobs.map((job) => {
          const left = seconds[job.id] ?? job.acceptSeconds;
          const pct = (left / job.acceptSeconds) * 100;
          const expired = left <= 0;
          return (
            <div key={job.id} className={`glass rounded-2xl p-4 animate-rise border-crimson-500/40 ${expired ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={job.hirer.avatar} alt="" className="w-12 h-12 rounded-full bg-ink-700 object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{job.hirer.name}</p>
                    {job.hirer.kycVerified && <VerifiedBadge label={t.verified} />}
                  </div>
                  <p className="text-xs text-ink-400">📍 {job.place} · ~{job.distanceKm} {lang === "th" ? "กม." : "km"}</p>
                </div>
                <div className={`w-12 h-12 rounded-full grid place-items-center font-black text-sm ${left <= 5 ? "text-crimson-300" : "text-gold-300"}`}
                  style={{ border: `3px solid conic-gradient(#e5484d ${pct}%, #2a2a34 0)` }}>
                  {left}
                </div>
              </div>

              <p className="font-semibold mt-3">{job.title} <span className="text-gold-400">({job.hours}{t.hoursUnit})</span></p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-gold-400 font-bold">{baht(job.budget)}<span className="text-ink-400 text-xs font-normal"> ({lang === "th" ? "เหมา" : "lump"})</span></span>
                <Stars value={4.8} />
              </div>

              <div className="flex gap-2 mt-3">
                <button onClick={() => decide(job, false)} className="btn-ghost rounded-xl flex-1 py-2.5 text-sm">{t.dismiss}</button>
                <button onClick={() => decide(job, true)} disabled={expired} className="btn-crimson rounded-xl flex-1 py-2.5 text-sm font-bold">
                  ✓ {t.acceptJob}
                </button>
              </div>
              {expired && <p className="text-[10px] text-crimson-300 text-center mt-2">{lang === "th" ? "หมดเวลา — ส่งต่อให้หมอคนอื่นแล้ว" : "Timed out — passed to others"}</p>}
            </div>
          );
        })}
        <p className="text-[10px] text-ink-500 text-center">{lang === "th" ? "งานถูกส่งตรงถึงคุณตามหมวดและพื้นที่ของโพสต์" : "Jobs are matched to your post's categories and area"}</p>
      </div>
    </>
  );
}
