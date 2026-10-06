"use client";

import { site } from "@/lib/site";
import { use, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { Toast, baht } from "@/components/ui";
import { DEMO_ME } from "@/lib/demo-data";
import { UpsellCard } from "../../../_components/upsell-card";

const TAGS = { th: ["สุภาพ", "ตรงเวลา", "สถานที่สะอาด", "สื่อสารดี", "ทิปใจดี"], en: ["Polite", "On time", "Clean place", "Clear communication", "Generous"] };

export default function JobDonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useI18n();
  const th = lang === "th";
  const fee = 1200;
  const gp = Math.round((fee * site.commissionPercent) / 100);
  const tip = 80;
  const net = fee - gp + tip;
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<number[]>([]);
  const [rated, setRated] = useState(false);
  const [toast, setToast] = useState("");

  const submit = () => {
    setRated(true);
    setToast(th ? "ส่งคะแนนลูกค้าแล้ว" : "Customer rating sent");
    setTimeout(() => setToast(""), 1800);
  };

  return (
    <main className="px-4 pt-8 pb-6 flex flex-col gap-5 min-h-dvh">
      <div className="text-center">
        <p className="text-5xl">🎉</p>
        <h1 className="font-display text-2xl font-semibold mt-2">{th ? "จบงานเรียบร้อย" : "Job complete"}</h1>
        <p className="text-sm text-ink-300">{id.toUpperCase()} · คุณแนท</p>
      </div>

      <section className="glass rounded-3xl border-gold-500/40 p-4 text-sm flex flex-col gap-1.5">
        <div className="flex justify-between"><span className="text-ink-300">{th ? "ค่าบริการ" : "Service fee"}</span><span>{baht(fee)}</span></div>
        <div className="flex justify-between"><span className="text-ink-300">{th ? `ค่าธรรมเนียมแพลตฟอร์ม ${site.commissionPercent}%` : `Platform fee ${site.commissionPercent}%`}</span><span className="text-crimson-400">-{baht(gp)}</span></div>
        <div className="flex justify-between"><span className="text-ink-300">{th ? "ทิปจากลูกค้า" : "Customer tip"}</span><span className="text-gold-300">+{baht(tip)}</span></div>
        <div className="flex justify-between border-t border-gold-500/40 pt-2 mt-1"><b className="font-medium">{th ? "รายได้สุทธิ" : "Net earnings"}</b><b className="font-display font-semibold text-xl text-gold-300">{baht(net)}</b></div>
        <p className="text-[11px] text-ink-400">{th ? "โอนเข้ายอดถอนได้เมื่อลูกค้ายืนยัน (หรืออัตโนมัติใน 24 ชม.)" : "Added to withdrawable balance once confirmed (auto in 24h)"}</p>
      </section>

      <section className="glass rounded-3xl p-4 flex flex-col items-center gap-2">
        <p className="text-sm">{th ? "ให้คะแนนลูกค้า" : "Rate the customer"}</p>
        <div className="flex gap-1" role="radiogroup" aria-label={th ? "คะแนน" : "Rating"}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => !rated && setStars(n)} role="radio" aria-checked={stars === n} aria-label={`${n}`}
              className={`w-11 h-11 grid place-items-center text-3xl ${n <= stars ? "text-amber-500" : "text-ink-600"}`}>★</button>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {TAGS[th ? "th" : "en"].map((t, i) => (
            <button key={t} onClick={() => !rated && setTags(tags.includes(i) ? tags.filter((x) => x !== i) : [...tags, i])} aria-pressed={tags.includes(i)}
              className={`chip h-9 px-3.5 ${tags.includes(i) ? "chip-red" : ""}`}>{t}</button>
          ))}
        </div>
        <button onClick={submit} disabled={!stars || rated} className="btn-crimson w-full h-11 mt-2 text-sm font-semibold">
          {rated ? (th ? "ส่งแล้ว ✓" : "Sent ✓") : stars ? (th ? "ส่งคะแนน" : "Send rating") : th ? "เลือกดาวก่อน" : "Pick stars first"}
        </button>
      </section>

      <UpsellCard providerId={DEMO_ME.id} th={th} />

      <div className="mt-auto grid grid-cols-2 gap-2">
        <Link href="/provider" className="btn-ghost h-12 rounded-full grid place-items-center text-sm">{th ? "กลับแดชบอร์ด" : "Dashboard"}</Link>
        <Link href="/provider/earnings" className="btn-crimson h-12 grid place-items-center text-sm font-semibold">{th ? "ดูรายได้" : "Earnings"}</Link>
      </div>
      <Toast show={!!toast}>{toast}</Toast>
    </main>
  );
}
