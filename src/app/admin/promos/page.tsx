"use client";

import { useState } from "react";
import { Toast, baht } from "@/components/ui";
import { DEMO_PROMOS } from "@/lib/demo-data";
import type { PromoCode } from "@/lib/types";
import { Card, PageHead, Pill } from "../admin-nav";

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<PromoCode[]>(DEMO_PROMOS);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("fixed");
  const [value, setValue] = useState("100");
  const [quota, setQuota] = useState("300");
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  const c = code.trim().toUpperCase();
  const dup = promos.some((p) => p.code === c);
  const valid = /^[A-Z0-9]{4,16}$/.test(c) && !dup && Number(value) > 0 && Number(quota) > 0 && (type === "fixed" || Number(value) <= 90);

  const create = () => {
    setPromos([{ code: c, type, value: Number(value), active: true, usedCount: 0, quota: Number(quota) }, ...promos]);
    setCode("");
    flash(`สร้างโค้ด ${c} แล้ว`);
  };

  return (
    <>
      <PageHead title="โปรโมชัน" sub="ส่วนลดหักจาก GP ของแพลตฟอร์ม ไม่กระทบรายได้หมอ" />
      <div className="grid lg:grid-cols-[1fr_340px] gap-3">
        <div className="grid sm:grid-cols-2 gap-3 content-start">
          {promos.map((p) => {
            const full = p.usedCount >= p.quota;
            return (
              <Card key={p.code} className={`flex flex-col gap-2 ${p.active && !full ? "border-gold-500" : "opacity-70"}`}>
                <div className="flex justify-between items-center gap-2">
                  <span className="font-display font-semibold text-xl tracking-wider text-gold-300">{p.code}</span>
                  <Pill tone={full ? "muted" : p.active ? "green" : "muted"}>{full ? "สิทธิ์เต็ม" : p.active ? "ใช้งานอยู่" : "ปิดอยู่"}</Pill>
                </div>
                <p className="text-sm text-ink-300">{p.type === "percent" ? `ลด ${p.value}%` : `ลด ${baht(p.value)}`}</p>
                <div className="h-1.5 rounded-full bg-ink-600 overflow-hidden"><div className="h-full bg-gold-500" style={{ width: `${Math.min(100, (p.usedCount / p.quota) * 100)}%` }} /></div>
                <div className="flex justify-between items-center text-xs text-ink-300">
                  <span>ใช้แล้ว {p.usedCount} / {p.quota}</span>
                  <button onClick={() => { setPromos(promos.map((x) => (x.code === p.code ? { ...x, active: !x.active } : x))); flash(`${p.active ? "ปิด" : "เปิด"}โค้ด ${p.code} แล้ว`); }} disabled={full} className="min-h-9 px-3 rounded-lg border border-ink-600 text-ink-100 disabled:opacity-40">{p.active ? "ปิดโค้ด" : "เปิดโค้ด"}</button>
                </div>
              </Card>
            );
          })}
        </div>
        <Card className="flex flex-col gap-3 h-fit">
          <h2 className="font-display font-medium text-lg">สร้างโค้ดใหม่</h2>
          <label className="text-xs text-ink-300 flex flex-col gap-1.5">โค้ด (A–Z, 0–9, 4–16 ตัว)<input value={code} onChange={(e) => setCode(e.target.value)} className="input-dark h-11 uppercase tracking-wider" placeholder="WELCOME200" /></label>
          {dup && <p className="text-xs text-crimson-200 -mt-2">มีโค้ดนี้แล้ว</p>}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-ink-300 flex flex-col gap-1.5">ประเภท<select value={type} onChange={(e) => setType(e.target.value as "percent" | "fixed")} className="input-dark h-11"><option value="fixed">ลดเป็นบาท</option><option value="percent">ลดเป็น %</option></select></label>
            <label className="text-xs text-ink-300 flex flex-col gap-1.5">มูลค่า<input type="number" min={1} value={value} onChange={(e) => setValue(e.target.value)} className="input-dark h-11" /></label>
          </div>
          <label className="text-xs text-ink-300 flex flex-col gap-1.5">จำนวนสิทธิ์<input type="number" min={1} value={quota} onChange={(e) => setQuota(e.target.value)} className="input-dark h-11" /></label>
          <button onClick={create} disabled={!valid} className="btn-crimson h-12 rounded-xl font-display font-semibold">สร้างโค้ด</button>
        </Card>
      </div>
      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
