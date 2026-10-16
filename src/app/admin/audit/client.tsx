"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Notice } from "@/lib/bookings";
import { PushButton } from "@/components/push-button";

const KIND: Record<string, [string, string]> = {
  sos: ["SOS", "#ef4444"], recon_alert: ["ยอดเงินไม่ตรง", "#f59e0b"], spa_full: ["สปาห้องเต็ม", "#e8c472"], customer_delete: ["ขอลบบัญชี", "#a78bfa"],
  topup_pending: ["เติมเงินรอตรวจ", "#60a5fa"], tax_invoice: ["ขอใบกำกับภาษี", "#93c5fd"], report: ["รายงานผู้ใช้", "#f472b6"], withdraw_req: ["คำขอถอน", "#34d399"], dispute: ["แจ้งปัญหา", "#fb923c"], cancel_req: ["ขอยกเลิก", "#fb923c"], chat_violation: ["แชทฝ่าฝืน", "#f472b6"],
};
const linkify = (s: string) => s.split(/(https:\/\/maps\.google\.com\/\?q=[0-9.,-]+)/).map((p, i) => (p.startsWith("https://maps.google.com") ? <a key={i} href={p} target="_blank" rel="noreferrer" className="text-[#e8c472] underline">แผนที่</a> : p));

export function AlertsClient({ initial }: { initial: Notice[] }) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<"open" | "all">("open");
  // ดึงใหม่ทุก 20 วินาที (เปิดหน้านี้ค้างไว้ = เห็น SOS ใหม่)
  useEffect(() => {
    const t = setInterval(() => fetch("/api/admin/alerts", { cache: "no-store" }).then((r) => r.json()).then((j) => j?.ok && setItems(j.items)).catch(() => {}), 20_000);
    return () => clearInterval(t);
  }, []);
  const ack = async (id: number | "all") => {
    await fetch("/api/admin/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setItems((xs) => xs.map((x) => (id === "all" || x.id === id ? { ...x, read_at: x.read_at ?? new Date().toISOString() } : x)));
  };
  const open = items.filter((x) => !x.read_at);
  const list = filter === "open" ? open : items;
  return (
    <div className="flex flex-col gap-4 max-w-[900px]">
      <PushButton admin label="แจ้งเตือนบนเครื่องนี้ (แอดมิน)" hint="เปิดบนมือถือแอดมินที่รับเรื่อง — SOS และยอดเงินไม่ตรงจะเด้งทันที" />
      <div className="flex gap-2 items-center flex-wrap">
        {(["open", "all"] as const).map((f) => <button key={f} type="button" onClick={() => setFilter(f)} className={`chip h-9 px-3.5 ${filter === f ? "chip-red" : ""}`}>{f === "open" ? `ยังไม่รับเรื่อง (${open.length})` : `ทั้งหมด (${items.length})`}</button>)}
        {open.length > 1 && <button type="button" onClick={() => ack("all")} className="ml-auto text-[13px] text-[#cdbfb3] underline">รับเรื่องทั้งหมด</button>}
      </div>
      {!list.length && <p className="rounded-2xl border border-ink-600 p-6 text-center text-ink-300">{filter === "open" ? "ไม่มีเรื่องค้าง ✓" : "ยังไม่มีแจ้งเตือน"}</p>}
      {list.map((n) => {
        const [label, color] = KIND[n.kind] ?? [n.kind, "#cdbfb3"];
        return (
          <div key={n.id} className="rounded-2xl border p-4 flex gap-3 items-start" style={{ borderColor: n.read_at ? "rgba(240,200,90,.2)" : color, background: n.read_at ? "transparent" : "rgba(255,255,255,.03)" }}>
            <span className="shrink-0 rounded-full px-2.5 h-6 grid place-items-center text-[11px] font-semibold text-black" style={{ background: color }}>{label}</span>
            <div className="flex-1 min-w-0 text-[13.5px]">
              <div className="font-semibold">{n.title}</div>
              {n.body && <div className="text-[#cdbfb3] break-words">{linkify(n.body)}</div>}
              <div className="text-[11.5px] text-[#7d6d6a] mt-1">{new Date(n.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}{n.read_at ? " · รับเรื่องแล้ว" : ""}{n.url ? <> · <Link href={n.url} className="text-[#e8c472]">เปิดที่เกี่ยวข้อง</Link></> : null}</div>
            </div>
            {!n.read_at && <button type="button" onClick={() => ack(n.id)} className="shrink-0 h-9 px-3 rounded-full border border-[rgba(240,200,90,.5)] text-[12.5px] text-[#f0c75a]">รับเรื่องแล้ว</button>}
          </div>
        );
      })}
    </div>
  );
}
