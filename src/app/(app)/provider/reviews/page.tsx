"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Stars, Toast } from "@/components/ui";

const DIST = [42, 6, 2, 0, 0];
const INIT = [
  { id: "r1", name: "คุณแนท", stars: 5, date: "29/09", text: "แรงกำลังดี ตรงเวลา อธิบายจุดปวดชัดเจนมากค่ะ", photo: true, reply: "ขอบคุณมากครับ ไว้เจอกันใหม่ครับ" },
  { id: "r2", name: "คุณบอม", stars: 4, date: "26/09", text: "นวดดี แต่มาช้านิดหน่อย", photo: false, reply: "" },
  { id: "r3", name: "คุณปุ๊ก", stars: 5, date: "20/09", text: "ออฟฟิศซินโดรมหายเกลี้ยง", photo: true, reply: "" },
];
type Filter = "all" | "5" | "4" | "photo";

export default function ProviderReviewsPage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const [list, setList] = useState(INIT);
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState("");
  const total = DIST.reduce((a, b) => a + b, 0);

  const shown = list.filter((r) => filter === "all" || (filter === "photo" ? r.photo : String(r.stars) === filter));
  const send = (id: string) => {
    setList(list.map((r) => (r.id === id ? { ...r, reply: draft.trim() } : r)));
    setEditing(null);
    setDraft("");
    setToast(th ? "ตอบกลับแล้ว" : "Reply posted");
    setTimeout(() => setToast(""), 1800);
  };

  return (
    <>
      <TopBar back="/provider" title={th ? "รีวิวของฉัน" : "My reviews"} />
      <div className="px-4 py-4 space-y-4 pb-8">
        <div className="glass rounded-3xl p-5 flex gap-4 items-center">
          <div className="text-center shrink-0">
            <p className="font-display text-4xl font-bold text-gold-400">4.9</p>
            <Stars value={4.9} />
            <p className="text-[10px] text-ink-400 mt-1">{total} {th ? "รีวิว" : "reviews"}</p>
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            {DIST.map((n, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] text-ink-400">
                <span className="w-3">{5 - i}</span>
                <div className="flex-1 h-1.5 rounded-full bg-ink-700 overflow-hidden"><div className="h-full bg-gold-500" style={{ width: `${(n / total) * 100}%` }} /></div>
                <span className="w-5 text-right">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "5", "4", "photo"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`chip h-9 px-4 ${filter === f ? "chip-red" : ""}`}>
              {f === "all" ? (th ? "ทั้งหมด" : "All") : f === "photo" ? (th ? "มีรูป" : "With photo") : `${f}★`}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {shown.map((r) => (
            <div key={r.id} className="glass rounded-3xl p-4">
              <div className="flex justify-between items-center gap-2">
                <p className="font-semibold text-sm">{r.name}</p>
                <span className="text-[11px] text-ink-400">{r.date}</span>
              </div>
              <Stars value={r.stars} />
              <p className="text-sm mt-2">{r.text}</p>
              {r.reply ? (
                <div className="mt-3 rounded-2xl bg-ink-850 p-3 text-sm">
                  <p className="text-[11px] text-gold-400 mb-1">{th ? "คำตอบของคุณ" : "Your reply"}</p>
                  {r.reply}
                </div>
              ) : editing === r.id ? (
                <div className="mt-3 flex gap-2">
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} className="input-dark flex-1 min-w-0 h-10" placeholder={th ? "พิมพ์คำตอบ..." : "Write a reply..."} autoFocus aria-label={th ? "คำตอบ" : "Reply"} />
                  <button onClick={() => send(r.id)} disabled={!draft.trim()} className="btn-crimson h-10 px-4 text-sm shrink-0">{th ? "ส่ง" : "Send"}</button>
                </div>
              ) : (
                <button onClick={() => { setEditing(r.id); setDraft(""); }} className="mt-2 min-h-9 text-sm text-gold-400">{th ? "ตอบกลับ" : "Reply"}</button>
              )}
            </div>
          ))}
          {!shown.length && <p className="text-center text-sm text-ink-400 py-8">{th ? "ไม่มีรีวิวในตัวกรองนี้" : "No reviews for this filter"}</p>}
        </div>
      </div>
      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
