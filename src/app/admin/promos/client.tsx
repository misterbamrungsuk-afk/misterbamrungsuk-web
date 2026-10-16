"use client";

import { useState } from "react";
import type { PromoCode } from "@/lib/codes";

const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH");
const inp = "h-10 rounded-lg border border-ink-600 bg-[#130e0e] px-2.5 text-[13px] text-[#f6efe4] outline-none";

export function PromosClient({ initial }: { initial: PromoCode[] }) {
  const [codes, setCodes] = useState(initial);
  const [f, setF] = useState({ code: "", amount: "500", max_uses: "100", expires_at: "", note: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const reload = () => fetch("/api/admin/promos", { cache: "no-store" }).then((r) => r.json()).then((d) => d?.ok && setCodes(d.codes)).catch(() => {});
  const create = async () => {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/promos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", ...f, amount: Number(f.amount), max_uses: Number(f.max_uses), expires_at: f.expires_at || null }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (d?.ok) { setMsg(`สร้างโค้ด ${d.code.code} แล้ว`); setF({ ...f, code: "", note: "" }); reload(); } else setMsg(d?.error || "สร้างไม่สำเร็จ");
  };
  const toggle = async (c: PromoCode) => {
    await fetch("/api/admin/promos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle", code: c.code, active: !c.active }) });
    reload();
  };
  const promos = codes.filter((c) => c.kind === "promo"), gifts = codes.filter((c) => c.kind === "gift");
  return (
    <div className="flex flex-col gap-5 text-[13px]">
      <section className="rounded-2xl border border-ink-600 p-4 flex flex-col gap-3">
        <b className="text-[15px]">สร้างโค้ดโปรโมชัน</b>
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1"><span className="text-ink-300 text-[12px]">โค้ด (เว้นว่าง = สุ่ม)</span><input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} maxLength={24} placeholder="MBGIFT2026" className={inp} /></label>
          <label className="flex flex-col gap-1"><span className="text-ink-300 text-[12px]">เครดิต (บาท)</span><input type="number" min={1} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className={inp} /></label>
          <label className="flex flex-col gap-1"><span className="text-ink-300 text-[12px]">จำนวนสิทธิ์ (คน)</span><input type="number" min={1} value={f.max_uses} onChange={(e) => setF({ ...f, max_uses: e.target.value })} className={inp} /></label>
          <label className="flex flex-col gap-1"><span className="text-ink-300 text-[12px]">หมดอายุ (ไม่บังคับ)</span><input type="date" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} className={inp} /></label>
          <label className="flex flex-col gap-1"><span className="text-ink-300 text-[12px]">หมายเหตุ</span><input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={200} placeholder="แคมเปญเปิดตัว" className={inp} /></label>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={create} disabled={busy} className="btn-red-lux h-10 px-5 rounded-full text-white font-semibold disabled:opacity-40">สร้างโค้ด</button>
          {msg && <span role="status" className="text-[#eed58a]">{msg}</span>}
          <span className="ml-auto text-ink-300">ต้นทุนรวมสูงสุด {baht(Math.round(Number(f.amount) * 100) * (Number(f.max_uses) || 0))}</span>
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <b className="text-[15px]">โค้ดโปรโมชัน ({promos.length})</b>
        {!promos.length && <p className="text-ink-300">ยังไม่มีโค้ด</p>}
        {promos.map((c) => (
          <div key={c.code} className={`rounded-xl border border-ink-600 p-3 flex flex-wrap gap-3 items-center ${c.active ? "" : "opacity-50"}`}>
            <b className="tracking-[1.5px] text-[#f0c75a]">{c.code}</b>
            <span>{baht(c.amount_satang)} · ใช้แล้ว {c.used}/{c.max_uses}</span>
            <span className="text-ink-300">{c.expires_at ? `หมดอายุ ${new Date(c.expires_at).toLocaleDateString("th-TH")}` : "ไม่หมดอายุ"}{c.note ? ` · ${c.note}` : ""}</span>
            <button type="button" onClick={() => toggle(c)} className="ml-auto chip h-8 px-3">{c.active ? "ปิดโค้ด" : "เปิดโค้ด"}</button>
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <b className="text-[15px]">บัตรของขวัญที่ลูกค้าซื้อ ({gifts.length})</b>
        {gifts.map((c) => (
          <div key={c.code} className="rounded-xl border border-ink-600 p-3 flex flex-wrap gap-3 items-center">
            <b className="tracking-[1.5px] text-[#f0c75a]">{c.code}</b><span>{baht(c.amount_satang)}</span>
            <span className="text-ink-300">{c.used >= c.max_uses ? "ใช้แล้ว" : "ยังไม่ใช้"} · จาก {c.from_customer}{c.to_name ? ` ถึง ${c.to_name}` : ""} · {new Date(c.created_at).toLocaleDateString("th-TH")}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
