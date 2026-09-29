"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import JobCard from "@/components/job-card";
import { Sheet, Field, EmptyState } from "@/components/ui";
import { PROVINCES } from "@/lib/categories";
import { DEMO_JOBS } from "@/lib/demo-data";

export default function JobsPage() {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<"all" | "interested">("all");
  const [role, setRole] = useState("");
  const [province, setProvince] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  const jobs = useMemo(() => {
    let list = [...DEMO_JOBS];
    if (role) list = list.filter((j) => j.role === role);
    if (province) list = list.filter((j) => j.province === province);
    if (tab === "interested") list = list.filter((j) => j.isInterested);
    return list;
  }, [role, province, tab]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // จำลอง reverse-geocode: กรุงเทพ (โหมดจริงต่อ API /api/location)
        setProvince("กรุงเทพมหานคร");
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 5000 }
    );
  }

  return (
    <>
      <TopBar
        title={
          <div>
            <p className="text-[11px] text-gold-400 tracking-widest font-semibold uppercase">{lang === "th" ? "หาหมอนวด / หางาน" : "Find therapists"}</p>
            <h1 className="font-semibold -mt-0.5">{t.jobsTitle}</h1>
          </div>
        }
        right={<Link href="/jobs/create" className="btn-crimson rounded-full px-3.5 py-1.5 text-xs font-bold">＋ {t.createJob}</Link>}
      />

      <div className="px-4 pt-4 space-y-3">
        <div className="flex gap-2">
          <button onClick={() => setFilterOpen(true)} className="btn-ghost rounded-xl px-4 text-sm flex-1 text-left">
            📍 {province || t.bkkMetro} ▾
          </button>
          <button onClick={useMyLocation} className="btn-ghost rounded-xl px-4 text-sm" disabled={locating}>
            {locating ? "…" : "🧭"}
          </button>
        </div>

        <div className="flex gap-2">
          {[{ v: "", l: lang === "th" ? "ทุกบทบาท" : "All" }, { v: "hirer", l: t.roleHirer }, { v: "provider", l: t.roleProvider }].map((r) => (
            <button key={r.v} onClick={() => setRole(r.v)} className={`chip flex-1 text-center ${role === r.v ? "chip-red" : ""}`}>{r.l}</button>
          ))}
        </div>

        <div className="glass rounded-xl p-1 flex">
          {(["all", "interested"] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === k ? "btn-crimson" : "text-ink-300"}`}>
              {k === "all" ? t.allJobs : `❤️ ${t.interestedJobs}`}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 grid gap-4 py-4">
        {jobs.length === 0 ? (
          <EmptyState icon="💼" title={t.empty} sub={lang === "th" ? "ลองเปลี่ยนตัวกรองดู" : "Try changing filters"} />
        ) : (
          jobs.map((j) => <JobCard key={j.id} job={j} />)
        )}
      </div>

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title={t.province}>
        <Field label={t.province}>
          <select value={province} onChange={(e) => setProvince(e.target.value)} className="input-dark">
            <option value="">{t.bkkMetro}</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <button onClick={() => { setProvince(""); setFilterOpen(false); }} className="btn-ghost rounded-xl w-full py-2.5 text-sm">{t.reset}</button>
      </Sheet>
    </>
  );
}
