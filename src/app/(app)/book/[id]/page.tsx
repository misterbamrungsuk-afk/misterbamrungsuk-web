"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { baht } from "@/components/ui";
import { DEMO_POSTS } from "@/lib/demo-data";
import { ADDRESSES, PACKAGES, nextDays, packagePrice, timeSlots, type PackageMin } from "@/lib/booking";

// ขั้นที่ 1/3: เลือกแพ็กเกจ วัน เวลา และสถานที่
export default function BookSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useI18n();
  const th = lang === "th";
  const router = useRouter();
  const post = DEMO_POSTS.find((p) => p.id === id);
  const days = useMemo(() => nextDays(5), []);

  const [pkg, setPkg] = useState<PackageMin>(90);
  const [date, setDate] = useState(days[0].iso);
  const [time, setTime] = useState("");
  const [addr, setAddr] = useState<string>(ADDRESSES[0].id);
  const [note, setNote] = useState("");

  if (!post) {
    return (
      <>
        <TopBar back="/home" title={th ? "จองล่วงหน้า" : "Book"} />
        <p className="text-center text-ink-300 py-20">{th ? "ไม่พบหมอนวดคนนี้" : "Therapist not found"}</p>
      </>
    );
  }

  const slots = timeSlots(post, date);
  const price = packagePrice(post, pkg);
  const next = () => {
    const q = new URLSearchParams({ pkg: String(pkg), date, time, addr, note });
    router.push(`/book/${post.id}/checkout?${q}`);
  };

  return (
    <>
      <TopBar back={`/post/${post.id}`} title={th ? "จองล่วงหน้า · 1/3" : "Book · 1/3"} />
      <div className="px-4 pt-4 pb-28 flex flex-col gap-6">
        <Link href={`/post/${post.id}`} className="glass rounded-2xl p-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.member.avatar} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold truncate">{post.member.name}</p>
            <p className="text-xs text-ink-300 truncate">{post.serviceArea}</p>
          </div>
          {post.rating != null && <span className="text-xs font-semibold text-gold-500 shrink-0">★ {post.rating.toFixed(1)}</span>}
        </Link>

        <section>
          <h2 className="section-title mb-3">{th ? "แพ็กเกจ" : "Package"}</h2>
          <div className="grid grid-cols-3 gap-2">
            {PACKAGES.map((m) => (
              <button key={m} onClick={() => setPkg(m)} aria-pressed={pkg === m}
                className={`rounded-2xl border py-3 flex flex-col items-center gap-0.5 transition ${pkg === m ? "border-gold-500 bg-gold-500/10" : "border-ink-600 bg-ink-800"}`}>
                <span className={`text-[13px] ${pkg === m ? "text-gold-300" : "text-ink-300"}`}>{m} {th ? "นาที" : "min"}</span>
                <span className={`font-display font-semibold text-lg ${pkg === m ? "text-gold-300" : ""}`}>{baht(packagePrice(post, m))}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="section-title mb-3">{th ? "วันที่" : "Date"}</h2>
          <div className="grid grid-cols-5 gap-2">
            {days.map((d) => (
              <button key={d.iso} onClick={() => { setDate(d.iso); setTime(""); }} aria-pressed={date === d.iso}
                className={`h-[68px] rounded-2xl border flex flex-col items-center justify-center transition ${date === d.iso ? "bg-crimson-500 border-crimson-500 text-white" : "bg-ink-800 border-ink-600 text-ink-300"}`}>
                <span className="text-xs">{d.dow}</span>
                <span className={`font-display font-semibold text-xl ${date === d.iso ? "text-[#1a1206]" : "text-ink-100"}`}>{d.day}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="section-title">{th ? "เวลาที่หมอว่าง" : "Available times"}</h2>
            <span className="text-xs text-ink-300">{post.workingHours}</span>
          </div>
          {slots.every((s) => s.taken) ? (
            <p className="text-sm text-ink-300">{th ? "วันนี้เต็มแล้ว ลองเลือกวันอื่น" : "Fully booked — try another day"}</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((s) => (
                <button key={s.time} disabled={s.taken} onClick={() => setTime(s.time)} aria-pressed={time === s.time}
                  className={`h-11 rounded-xl border text-sm transition ${s.taken ? "border-ink-700 text-ink-500 line-through" : time === s.time ? "border-crimson-500 bg-crimson-500/15 text-crimson-200" : "border-ink-600 bg-ink-800"}`}>
                  {s.time}
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="section-title">{th ? "สถานที่" : "Location"}</h2>
            <Link href="/profile/edit" className="text-xs text-gold-500 min-h-9 inline-flex items-center">{th ? "+ จัดการที่อยู่" : "+ Manage"}</Link>
          </div>
          <div className="flex flex-col gap-2">
            {ADDRESSES.map((a) => (
              <label key={a.id} className={`flex items-center gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${addr === a.id ? "border-gold-500 bg-gold-500/5" : "border-ink-600 bg-ink-800"}`}>
                <input type="radio" name="addr" value={a.id} checked={addr === a.id} onChange={() => setAddr(a.id)} className="accent-[#e0a400] w-5 h-5" />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium">{th ? a.th : a.en}</span>
                  <span className="block text-xs text-ink-300 truncate">{a.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <label className="block">
          <span className="text-xs text-ink-300 mb-1.5 block">{th ? "หมายเหตุถึงหมอ" : "Note to therapist"}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="input-dark h-12" placeholder={th ? "เช่น ปวดไหล่ขวา มีที่จอดรถ" : "e.g. right shoulder pain, parking available"} />
        </label>
      </div>

      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 px-4" style={{ bottom: "calc(16px + env(safe-area-inset-bottom))" }}>
        <div className="rounded-2xl border border-ink-600 bg-ink-900/95 backdrop-blur-xl p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink-300 truncate">{pkg} {th ? "นาที" : "min"}{time ? ` · ${time}` : ""}</p>
            <p className="font-display font-semibold text-xl text-gold-300">{baht(price)}</p>
          </div>
          <button onClick={next} disabled={!time} className="btn-crimson h-12 px-6 rounded-xl font-display font-semibold">
            {time ? (th ? "ถัดไป" : "Next") : (th ? "เลือกเวลาก่อน" : "Pick a time")}
          </button>
        </div>
      </div>
    </>
  );
}
