"use client";

import { useState } from "react";
import { Toast } from "@/components/ui";
import { AUDIT, type AuditEntry } from "@/lib/admin-data";
import { Card, PageHead, Pill } from "../admin-nav";

const TYPES: (AuditEntry["type"] | "")[] = ["", "SOS", "การเงิน", "ออเดอร์", "สมาชิก", "KYC", "โปรโมชัน", "CS"];

export default function AdminAuditPage() {
  const [type, setType] = useState<AuditEntry["type"] | "">("");
  const [sosTaken, setSosTaken] = useState(false);
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  const list = AUDIT.filter((a) => !type || a.type === type);

  return (
    <>
      <PageHead title="Audit log" sub="บันทึกทุกการกระทำของแอดมินและระบบ" right={<Pill tone="red">● real-time</Pill>} />
      <div className="grid lg:grid-cols-[1fr_360px] gap-3">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {TYPES.map((t) => <button key={t || "all"} onClick={() => setType(t)} className={`chip whitespace-nowrap h-9 px-3.5 ${type === t ? "chip-red" : ""}`}>{t || "ทั้งหมด"}</button>)}
          </div>
          <Card className="!p-0 overflow-hidden">
            {list.map((a) => (
              <div key={a.id} className={`flex items-center gap-3 px-4 py-3 border-b border-ink-600 last:border-0 text-sm ${a.type === "SOS" ? "bg-crimson-500/10" : ""}`}>
                <span className="w-12 font-display text-ink-300 shrink-0">{a.at}</span>
                <span className="shrink-0"><Pill tone={a.type === "SOS" ? "red" : a.type === "การเงิน" ? "gold" : "muted"}>{a.type}</Pill></span>
                <span className="flex-1 min-w-0">{a.text}</span>
                <span className="text-xs text-ink-300 shrink-0 hidden sm:inline">{a.actor}</span>
              </div>
            ))}
          </Card>
        </div>
        <Card className="border-crimson-500 flex flex-col gap-3 h-fit">
          <div className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full bg-crimson-500 ${sosTaken ? "" : "animate-pulse"}`} /><b className="font-display font-medium text-lg flex-1">SOS · HM-24077</b><span className="text-xs text-ink-300">2 นาที</span></div>
          <p className="text-sm text-ink-300">ลูกค้า ร. · อโศก · ส่งตำแหน่งสดและแจ้งผู้ติดต่อฉุกเฉินแล้ว</p>
          {sosTaken ? <Pill tone="green">คุณรับเรื่องแล้ว</Pill> : null}
          <div className="flex flex-col gap-2">
            <button onClick={() => { setSosTaken(true); flash("รับเรื่อง SOS แล้ว · กำลังโทรหาลูกค้า"); }} disabled={sosTaken} className="h-11 rounded-xl bg-crimson-500 text-white font-semibold disabled:opacity-50">รับเรื่อง + โทรหาลูกค้า</button>
            <div className="flex gap-2">
              <a href="tel:191" className="flex-1 h-11 rounded-xl border border-ink-600 grid place-items-center text-sm">แจ้ง 191</a>
              <button onClick={() => flash("ระงับหมอชั่วคราวแล้ว")} className="flex-1 h-11 rounded-xl border border-ink-600 text-sm">ระงับหมอชั่วคราว</button>
            </div>
          </div>
        </Card>
      </div>
      <Toast show={!!toast} tone="red">{toast}</Toast>
    </>
  );
}
