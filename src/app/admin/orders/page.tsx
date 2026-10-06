"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Toast, baht } from "@/components/ui";
import { ADMIN_ORDERS, STATUS_LABEL, type OrderStatus } from "@/lib/admin-data";
import { Card, PageHead, Pill } from "../admin-nav";

const FILTERS: [string, OrderStatus | ""][] = [["ทั้งหมด", ""], ["เงินถูกกัน", "held"], ["กำลังนวด", "in_progress"], ["รอปล่อยเงิน", "awaiting_release"], ["ข้อพิพาท", "disputed"]];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState(ADMIN_ORDERS);
  const [filter, setFilter] = useState<OrderStatus | "">("");
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState(ADMIN_ORDERS[0].id);
  const [toast, setToast] = useState("");

  const list = useMemo(() => orders.filter((o) => (!filter || o.status === filter) && (!q || (o.id + o.customer + o.therapist).toLowerCase().includes(q.toLowerCase()))), [orders, filter, q]);
  const sel = orders.find((o) => o.id === selId);
  const setStatus = (status: OrderStatus, msg: string) => {
    setOrders(orders.map((o) => (o.id === selId ? { ...o, status } : o)));
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };
  const open = sel && !["released", "cancelled"].includes(sel.status);

  return (
    <>
      <PageHead title="ตรวจงาน" sub="ออเดอร์ทั้งหมดพร้อม GP" right={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา #ออเดอร์ / ชื่อ" aria-label="ค้นหาออเดอร์" className="input-dark h-11 w-64 max-w-full" />} />
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">
        {FILTERS.map(([l, v]) => (
          <button key={l} onClick={() => setFilter(v)} className={`chip whitespace-nowrap h-9 px-3.5 ${filter === v ? "chip-red" : ""}`}>{l}</button>
        ))}
      </div>
      <div className="grid lg:grid-cols-[1fr_340px] gap-3">
        <Card className="!p-2 flex flex-col gap-1">
          {list.length === 0 && <p className="text-center text-ink-300 py-10">ไม่พบออเดอร์</p>}
          {list.map((o) => {
            const st = STATUS_LABEL[o.status];
            return (
              <button key={o.id} onClick={() => setSelId(o.id)} className={`flex items-center gap-3 p-3 rounded-xl text-left ${o.id === selId ? "bg-ink-700 ring-1 ring-gold-500" : "hover:bg-ink-700/50"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{o.id} · {o.service}</span>
                  <span className="block text-xs text-ink-300 truncate">{o.customer} → {o.therapist} · {o.when}</span>
                </span>
                <span className="text-right shrink-0">
                  <span className="block font-display font-semibold">{baht(o.amount)}</span>
                  <Pill tone={st.tone}>{st.th}</Pill>
                </span>
              </button>
            );
          })}
        </Card>
        {sel && (
          <Card className="flex flex-col gap-3 h-fit">
            <div className="flex justify-between items-center"><b className="font-display font-semibold text-lg">{sel.id}</b><Pill tone={STATUS_LABEL[sel.status].tone}>{STATUS_LABEL[sel.status].th}</Pill></div>
            <p className="text-sm text-ink-300">{sel.customer} → {sel.therapist} · {sel.place} · {sel.when}</p>
            <div className="rounded-xl bg-ink-700 p-3 text-sm flex flex-col gap-1.5">
              <div className="flex justify-between"><span className="text-ink-300">ยอดรวม</span><span>{baht(sel.amount)}</span></div>
              <div className="flex justify-between"><span className="text-ink-300">ผู้ให้บริการได้ (80%)</span><span>{baht(sel.amount * 0.8)}</span></div>
              <div className="flex justify-between text-gold-300"><span>GP 20%</span><span>{baht(sel.amount * 0.2)}</span></div>
            </div>
            <p className="font-display font-medium">ไทม์ไลน์เงิน</p>
            <ol className="text-sm flex flex-col gap-2 border-l border-ink-600 pl-4">
              <li>สร้างออเดอร์ · ลูกค้าโอนเข้าระบบกลาง</li>
              <li>ตรวจสลิปผ่าน · เงินถูกกัน</li>
              <li className={sel.status === "released" ? "" : "text-ink-300"}>{sel.status === "cancelled" ? "ยกเลิก · คืนเงินลูกค้า" : "ปล่อยเงินให้ผู้ให้บริการ (หรืออัตโนมัติใน 24 ชม.)"}</li>
            </ol>
            <Link href="/escrow/o1" className="text-sm text-gold-600 min-h-9 inline-flex items-center">ดูหน้าระบบกลางเงินของออเดอร์ →</Link>
            <div className="flex gap-2">
              <button onClick={() => setStatus("cancelled", `ยกเลิก ${sel.id} และคืนเงินลูกค้าแล้ว`)} disabled={!open} className="flex-1 h-11 rounded-xl border border-crimson-500 text-crimson-200 disabled:opacity-40">ยกเลิก + คืนเงิน</button>
              <button onClick={() => setStatus("released", `ปิดงาน ${sel.id} · ปล่อยเงินให้ผู้ให้บริการแล้ว`)} disabled={!open} className="flex-1 h-11 rounded-xl bg-crimson-500 text-white font-semibold disabled:opacity-40">ปิดงาน</button>
            </div>
          </Card>
        )}
      </div>
      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
