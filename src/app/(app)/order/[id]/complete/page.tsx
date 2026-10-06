"use client";

import { Suspense, use, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { Toast, baht } from "@/components/ui";
import { DEMO_MY_ORDERS, DEMO_POSTS } from "@/lib/demo-data";

// จบนัด: ให้คะแนน + ทิป + ปล่อยเงินให้เพื่อน
const TAGS = { th: ["ตรงเวลา", "แรงกำลังดี", "สุภาพ", "สะอาด", "อธิบายดี"], en: ["On time", "Good pressure", "Polite", "Clean", "Explains well"] };
const TIPS = [0, 40, 80, 100];

function CompleteInner({ id }: { id: string }) {
  const { lang } = useI18n();
  const th = lang === "th";
  const router = useRouter();
  const sp = useSearchParams();
  const order = DEMO_MY_ORDERS.find((o) => o.id === id) ?? DEMO_MY_ORDERS[0];
  const post = DEMO_POSTS.find((p) => p.member.id === order.provider.id);
  const extra = Number(sp.get("extra") ?? 0);
  const extendCost = Math.round((((post?.price3h ?? 1800) / 3) * 30) / 60 / 10) * 10;

  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<number[]>([]);
  const [tip, setTip] = useState(80);
  const [text, setText] = useState("");
  const [toast, setToast] = useState("");
  const release = order.totalAmount - order.discount + (extra / 30) * extendCost + tip;

  const confirm = () => {
    setToast(th ? `ปล่อยเงิน ${baht(release)} ให้ ${order.provider.name} แล้ว · ขอบคุณสำหรับรีวิว` : `Released ${baht(release)} · thanks for your review`);
    setTimeout(() => router.push("/orders"), 1400);
  };

  return (
    <main className="px-4 pt-8 pb-6 flex flex-col gap-5 min-h-dvh">
      <div className="flex flex-col items-center text-center gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={order.provider.avatar} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-gold-500" />
        <h1 className="text-2xl font-semibold mt-2">{th ? `นัดกับ${order.provider.name}จบแล้ว` : `Session with ${order.provider.name} done`}</h1>
        <p className="text-sm text-ink-300">{order.id.toUpperCase()}</p>
      </div>

      <section className="flex flex-col items-center gap-2">
        <p className="text-sm">{th ? "ให้คะแนนเพื่อน" : "Rate your companion"}</p>
        <div className="flex gap-1" role="radiogroup" aria-label={th ? "คะแนน" : "Rating"}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setStars(n)} role="radio" aria-checked={stars === n} aria-label={`${n} ${th ? "ดาว" : "stars"}`}
              className={`w-11 h-11 grid place-items-center text-3xl transition ${n <= stars ? "text-amber-500" : "text-ink-600"}`}>★</button>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {TAGS[th ? "th" : "en"].map((t, i) => (
            <button key={t} onClick={() => setTags(tags.includes(i) ? tags.filter((x) => x !== i) : [...tags, i])} aria-pressed={tags.includes(i)}
              className={`chip h-9 px-3.5 ${tags.includes(i) ? "chip-red" : ""}`}>{t}</button>
          ))}
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={th ? "เล่าประสบการณ์ให้คนอื่นรู้ (ไม่บังคับ)" : "Tell others about it (optional)"} aria-label={th ? "รีวิว" : "Review"}
          className="input-dark h-20 resize-none mt-1" />
      </section>

      <section>
        <p className="text-sm mb-2">{th ? "ทิปให้เพื่อน" : "Tip"} <span className="text-xs text-ink-300">· {th ? "เพื่อนได้เต็ม 100%" : "100% goes to your companion"}</span></p>
        <div className="grid grid-cols-4 gap-2">
          {TIPS.map((v) => (
            <button key={v} onClick={() => setTip(v)} aria-pressed={tip === v}
              className={`h-12 rounded-xl border font-display ${tip === v ? "border-gold-500 bg-gold-500/10 text-gold-300" : "border-ink-600"}`}>{v ? baht(v) : th ? "ไม่ให้" : "None"}</button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gold-500 bg-gold-500/5 p-4 text-sm flex flex-col gap-1.5">
        <div className="flex justify-between"><span className="text-ink-300">{th ? "ค่าบริการ" : "Service"}</span><span>{baht(order.totalAmount - order.discount)}</span></div>
        {extra > 0 && <div className="flex justify-between"><span className="text-ink-300">{th ? `ต่อเวลา ${extra} นาที` : `Extended ${extra} min`}</span><span>{baht((extra / 30) * extendCost)}</span></div>}
        {tip > 0 && <div className="flex justify-between"><span className="text-ink-300">{th ? "ทิป" : "Tip"}</span><span className="text-gold-300">+{baht(tip)}</span></div>}
        <div className="flex justify-between border-t border-gold-500/40 pt-2 mt-1"><b className="font-medium">{th ? "ปล่อยเงินให้เพื่อน" : "Release to companion"}</b><b className="font-display font-semibold text-xl text-gold-300">{baht(release)}</b></div>
      </section>

      <div className="mt-auto flex flex-col gap-2">
        <button onClick={confirm} disabled={!stars} className="btn-crimson h-14 rounded-2xl font-display font-semibold text-lg">
          {stars ? (th ? "ยืนยันและปล่อยเงิน" : "Confirm & release") : th ? "ให้ดาวก่อน" : "Rate first"}
        </button>
        <div className="flex justify-between text-sm">
          <Link href={`/order/${id}/dispute`} className="min-h-10 inline-flex items-center text-ink-300">{th ? "มีปัญหา? เปิดข้อพิพาท" : "Problem? Open a dispute"}</Link>
          {post && <Link href={`/book/${post.id}`} className="min-h-10 inline-flex items-center text-gold-600">{th ? "จองคนนี้อีกครั้ง" : "Book again"}</Link>}
        </div>
        <p className="text-xs text-ink-300 text-center">{th ? "ถ้าไม่ยืนยันภายใน 24 ชม. ระบบจะปล่อยเงินอัตโนมัติ" : "Auto-released after 24h if not confirmed"}</p>
      </div>
      <Toast show={!!toast}>{toast}</Toast>
    </main>
  );
}

export default function CompletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Suspense><CompleteInner id={id} /></Suspense>;
}
