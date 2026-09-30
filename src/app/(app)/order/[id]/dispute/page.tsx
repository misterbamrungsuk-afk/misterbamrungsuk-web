"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { baht } from "@/components/ui";
import { DEMO_MY_ORDERS } from "@/lib/demo-data";

const REASONS = {
  th: ["หมอไม่มาตามนัด", "ระยะเวลาไม่ครบตามแพ็กเกจ", "พฤติกรรมไม่เหมาะสม", "บริการไม่ตรงที่ตกลง", "อื่นๆ"],
  en: ["Therapist no-show", "Session shorter than package", "Inappropriate behavior", "Service not as agreed", "Other"],
};

export default function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useI18n();
  const th = lang === "th";
  const order = DEMO_MY_ORDERS.find((o) => o.id === id) ?? DEMO_MY_ORDERS[0];
  const held = order.totalAmount - order.discount;
  const [reason, setReason] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<{ url: string; name: string }[]>([]);
  const [ticket, setTicket] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const urls = useRef<string[]>([]);
  urls.current = photos.map((p) => p.url);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files).slice(0, 4 - photos.length).map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
    setPhotos((p) => [...p, ...next]);
  };
  const submit = () => setTicket(`DS-${Math.floor(10000 + Math.random() * 90000)}`);

  if (ticket) {
    return (
      <>
        <TopBar back={`/order/${id}/complete`} title={th ? "ส่งเรื่องแล้ว" : "Dispute sent"} right={<span />} />
        <main className="px-4 pt-10 pb-28 flex flex-col items-center text-center gap-3">
          <div className="w-28 h-28 rounded-full border border-gold-500/40 bg-gold-500/10 grid place-items-center text-5xl text-gold-300">✓</div>
          <h2 className="font-display text-2xl font-semibold mt-2">{th ? "เราได้รับเรื่องแล้ว" : "We've got your report"}</h2>
          <p className="text-sm text-ink-300">{th ? "เลขที่เรื่อง" : "Ticket number"}</p>
          <p className="font-display text-2xl text-gold-300 tracking-wider">#{ticket}</p>
          <p className="text-sm text-ink-300 max-w-[300px]">{th ? `เงิน ${baht(held)} ถูกพักไว้ในระบบกลาง แอดมินจะตอบกลับภายใน 24 ชม.` : `${baht(held)} stays in escrow. An admin will reply within 24h.`}</p>
          <div className="w-full flex flex-col gap-2 mt-6">
            <Link href="/chat" className="btn-crimson h-14 rounded-full font-display font-semibold inline-flex items-center justify-center">{th ? "คุยกับแอดมิน" : "Chat with admin"}</Link>
            <Link href="/orders" className="btn-ghost h-12 rounded-full inline-flex items-center justify-center">{th ? "กลับไปที่ออเดอร์" : "Back to orders"}</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar back={`/order/${id}/complete`} title={<div className="min-w-0"><h1 className="font-semibold truncate">{th ? "เปิดข้อพิพาท" : "Open a dispute"}</h1><p className="text-xs text-ink-300 truncate">#{order.id.toUpperCase()}</p></div>} right={<span />} />
      <main className="px-4 pt-5 pb-28 flex flex-col gap-5">
        <div className="rounded-3xl border border-gold-500/50 bg-gold-500/5 p-4 flex gap-3 items-start text-sm">
          <span className="text-xl">🔒</span>
          <p className="min-w-0">{th ? <>เงิน <b className="text-gold-300">{baht(held)}</b> จะถูกพักไว้จนกว่าแอดมินตัดสิน</> : <><b className="text-gold-300">{baht(held)}</b> is held in escrow until an admin decides</>}</p>
        </div>

        <section>
          <p className="font-display font-medium mb-2">{th ? "เกิดอะไรขึ้น" : "What happened?"}</p>
          <div className="flex flex-wrap gap-2">
            {REASONS[th ? "th" : "en"].map((r, i) => (
              <button key={r} onClick={() => setReason(i)} aria-pressed={reason === i} className={`chip h-10 px-4 ${reason === i ? "chip-red" : ""}`}>{r}</button>
            ))}
          </div>
        </section>

        <section>
          <p className="font-display font-medium mb-2">{th ? "รายละเอียด" : "Details"}</p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} aria-label={th ? "รายละเอียด" : "Details"}
            placeholder={th ? "เช่น นวดได้ประมาณ 60 นาที แต่จ่ายแพ็กเกจ 90 นาที" : "e.g. Only ~60 min of a 90-min package"} className="input-dark w-full h-28 resize-none" />
          <p className="text-right text-xs text-ink-300 mt-1">{text.length}/500</p>
        </section>

        <section>
          <p className="font-display font-medium mb-2">{th ? "หลักฐาน" : "Evidence"} <span className="text-xs text-ink-300 font-normal">· {th ? "สูงสุด 4 รูป" : "up to 4 photos"}</span></p>
          <div className="grid grid-cols-4 gap-2">
            {photos.map((p, i) => (
              <div key={p.url} className="relative aspect-square rounded-2xl overflow-hidden border border-ink-600">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))} aria-label={th ? "ลบรูป" : "Remove photo"} className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-xs">✕</button>
              </div>
            ))}
            {photos.length < 4 && (
              <button onClick={() => fileRef.current?.click()} className="aspect-square rounded-2xl border border-dashed border-ink-500 grid place-items-center text-ink-300 text-2xl" aria-label={th ? "เพิ่มรูป" : "Add photo"}>+</button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </section>

        <button onClick={submit} disabled={reason === null || !text.trim()} className="btn-crimson h-14 rounded-full font-display font-semibold text-lg">
          {reason === null ? (th ? "เลือกเหตุผลก่อน" : "Pick a reason") : !text.trim() ? (th ? "เพิ่มรายละเอียด" : "Add details") : th ? "ส่งเรื่องให้แอดมิน" : "Submit to admin"}
        </button>
      </main>
    </>
  );
}
