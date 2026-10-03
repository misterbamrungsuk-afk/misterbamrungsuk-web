"use client";

import { useState } from "react";
import { Toast } from "@/components/ui";
import { REPORTS } from "@/lib/admin-data";
import { Card, PageHead, Pill } from "../admin-nav";

const SEV = { high: { th: "สูง", tone: "red" }, mid: { th: "กลาง", tone: "gold" }, low: { th: "ต่ำ", tone: "muted" } } as const;

export default function AdminReportsPage() {
  const [items, setItems] = useState(REPORTS);
  const [toast, setToast] = useState("");
  const resolve = (id: string, msg: string) => {
    setItems(items.filter((r) => r.id !== id));
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  return (
    <>
      <PageHead title="รีพอร์ท" sub={`${items.length} เรื่องรอพิจารณา`} />
      {items.length === 0 ? <Card className="text-center py-16 text-ink-300">ไม่มีรีพอร์ทค้าง</Card> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map((r) => (
            <Card key={r.id} className={`flex flex-col gap-3 ${r.severity === "high" ? "border-crimson-500" : ""}`}>
              <div className="flex justify-between gap-2"><Pill tone={SEV[r.severity].tone}>{r.reason} · {SEV[r.severity].th}</Pill><span className="text-xs text-ink-300 shrink-0">{r.at}</span></div>
              <div className="flex items-center gap-3">
                {r.avatar
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={r.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                  : <span className="w-12 h-12 rounded-full border border-gold-500 text-gold-300 grid place-items-center font-display">{r.target.slice(-2, -1)}</span>}
                <div className="min-w-0"><p className="font-medium truncate">ถูกรีพอร์ท: {r.target}</p><p className="text-xs text-ink-300">โดย {r.by}{r.ref ? ` · ${r.ref}` : ""}</p></div>
              </div>
              <p className="text-sm text-ink-300 rounded-xl bg-ink-700 p-3">[ข้อความรีพอร์ทจากผู้ใช้]</p>
              <div className="flex gap-2 mt-auto">
                <button onClick={() => resolve(r.id, "ยกฟ้องแล้ว")} className="flex-1 h-11 rounded-xl border border-ink-600">ยกฟ้อง</button>
                {r.severity === "mid"
                  ? <button onClick={() => resolve(r.id, "ซ่อนโพสต์และแจ้งให้แก้ไขแล้ว")} className="flex-1 h-11 rounded-xl bg-gold-500 text-[#1a1206] font-semibold">ซ่อนโพสต์</button>
                  : <button onClick={() => resolve(r.id, `ให้ strike ${r.target} แล้ว`)} className="flex-1 h-11 rounded-xl bg-crimson-500 text-white font-semibold">ให้ strike</button>}
              </div>
            </Card>
          ))}
        </div>
      )}
      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
