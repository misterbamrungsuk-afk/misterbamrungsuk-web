"use client";

import { useState } from "react";
import { Toast } from "@/components/ui";
import { TICKETS, type Ticket } from "@/lib/admin-data";
import { Card, PageHead, Pill } from "../admin-nav";

const COLS: [Ticket["status"], string][] = [["new", "ใหม่"], ["doing", "กำลังดำเนินการ"], ["closed", "ปิดแล้ว"]];

export default function AdminCsPage() {
  const [tickets, setTickets] = useState(TICKETS);
  const [selId, setSelId] = useState(TICKETS[0].id);
  const [msgs, setMsgs] = useState<Record<string, string[]>>({ c1: ["จอง 3 ชม. แต่ Part-Time อยู่ด้วยแค่ราว 2 ชม."] });
  const [reply, setReply] = useState("");
  const [toast, setToast] = useState("");
  const sel = tickets.find((t) => t.id === selId);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  const move = (status: Ticket["status"], m: string) => { setTickets(tickets.map((t) => (t.id === selId ? { ...t, status, owner: "คุณ" } : t))); flash(m); };
  const send = () => {
    if (!reply.trim() || !sel) return;
    setMsgs({ ...msgs, [sel.id]: [...(msgs[sel.id] ?? []), `แอดมิน: ${reply.trim()}`] });
    setReply("");
    if (sel.status === "new") move("doing", "รับเรื่องและตอบลูกค้าแล้ว");
  };

  return (
    <>
      <PageHead title="CS tickets" sub="ตอบเฉลี่ย 11 นาที" />
      <div className="grid xl:grid-cols-[1fr_1fr_1fr_1.3fr] md:grid-cols-3 gap-3">
        {COLS.map(([st, label]) => {
          const list = tickets.filter((t) => t.status === st);
          return (
            <Card key={st} className="!p-3 flex flex-col gap-2">
              <div className="flex justify-between text-sm px-1"><b className="font-medium">{label}</b><span className="text-ink-300">{list.length}</span></div>
              {list.map((t) => (
                <button key={t.id} onClick={() => setSelId(t.id)} className={`text-left rounded-xl bg-ink-700 p-3 flex flex-col gap-1 ${t.id === selId ? "ring-1 ring-gold-500" : ""} ${st === "closed" ? "opacity-60" : ""}`}>
                  <Pill tone={t.cat === "ข้อพิพาท" ? "red" : "muted"}>{t.cat}</Pill>
                  <span className="text-sm font-medium">{t.topic}</span>
                  <span className="text-xs text-ink-300">{t.by} · {t.owner ?? t.at}</span>
                </button>
              ))}
              {list.length === 0 && <p className="text-xs text-ink-300 px-1 py-2">ไม่มี</p>}
            </Card>
          );
        })}
        {sel && (
          <Card className="md:col-span-3 xl:col-span-1 flex flex-col gap-3">
            <div className="flex justify-between gap-2"><b className="font-display font-medium text-lg">{sel.topic}</b><Pill tone={sel.status === "closed" ? "green" : "gold"}>{COLS.find((c) => c[0] === sel.status)?.[1]}</Pill></div>
            <p className="text-xs text-ink-300">{sel.by}{sel.ref ? ` · ${sel.ref}` : ""}</p>
            <div className="flex flex-col gap-2 min-h-[120px]">
              {(msgs[sel.id] ?? ["[ข้อความจากผู้ใช้]"]).map((m, i) => (
                <p key={i} className={`text-sm rounded-2xl px-3 py-2 max-w-[90%] ${m.startsWith("แอดมิน:") ? "self-end bg-crimson-500 text-white" : "self-start bg-ink-700"}`}>{m.replace(/^แอดมิน: /, "")}</p>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="พิมพ์ตอบผู้ใช้" aria-label="ตอบผู้ใช้" className="input-dark h-11" disabled={sel.status === "closed"} />
              <button onClick={send} disabled={!reply.trim()} className="btn-crimson h-11 px-4 rounded-xl shrink-0">ส่ง</button>
            </div>
            <div className="flex gap-2">
              {sel.cat === "ข้อพิพาท" && <button onClick={() => flash("คืนเงินบางส่วน ฿267 แล้ว")} disabled={sel.status === "closed"} className="flex-1 h-11 rounded-xl border border-ink-600 text-sm disabled:opacity-40">คืนเงินบางส่วน</button>}
              <button onClick={() => move("closed", "ปิดเรื่องแล้ว")} disabled={sel.status === "closed"} className="flex-1 h-11 rounded-xl bg-crimson-500 text-white font-semibold text-sm disabled:opacity-40">ปิดเรื่อง</button>
            </div>
          </Card>
        )}
      </div>
      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
