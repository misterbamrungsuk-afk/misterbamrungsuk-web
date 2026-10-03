"use client";

import { useState } from "react";
import { Toast } from "@/components/ui";
import { KYC_QUEUE } from "@/lib/admin-data";
import { Card, PageHead, Pill } from "../admin-nav";

const CHECKS = ["ใบหน้าตรงกับบัตร", "บัตรยังไม่หมดอายุ · อายุ 18+", "ใบรับรองนวดตรวจสอบกับสถาบันแล้ว", "รูปโปรไฟล์เหมาะสม ไม่ชี้นำ"];
const REASONS = ["รูปไม่ชัด อ่านบัตรไม่ได้", "ใบหน้าไม่ตรงกับบัตร", "ใบรับรองไม่ถูกต้อง", "รูปโปรไฟล์ไม่เหมาะสม"];

export default function AdminKycPage() {
  const [queue, setQueue] = useState(KYC_QUEUE);
  const [selId, setSelId] = useState(KYC_QUEUE[0]?.id);
  const [checks, setChecks] = useState<boolean[]>([true, true, false, true]);
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState("");
  const sel = queue.find((k) => k.id === selId);

  const done = (msg: string) => {
    const rest = queue.filter((k) => k.id !== selId);
    setQueue(rest);
    setSelId(rest[0]?.id);
    setChecks([false, false, false, false]);
    setReason("");
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  return (
    <>
      <PageHead title="คิว KYC" sub={`${queue.length} รายการรอตรวจ`} />
      {queue.length === 0 ? (
        <Card className="text-center py-16 text-ink-300">ตรวจครบทุกรายการแล้ว</Card>
      ) : (
        <div className="grid lg:grid-cols-[300px_1fr] gap-3">
          <Card className="!p-2 flex lg:flex-col gap-1 overflow-x-auto no-scrollbar">
            {queue.map((k) => (
              <button key={k.id} onClick={() => setSelId(k.id)}
                className={`flex items-center gap-3 p-2.5 rounded-xl text-left shrink-0 min-w-[220px] lg:min-w-0 ${k.id === selId ? "bg-ink-700 ring-1 ring-gold-500" : "hover:bg-ink-700/50"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={k.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
                <span className="flex-1 min-w-0"><span className="block font-medium truncate">{k.name}</span><span className="block text-xs text-ink-300 truncate">{k.skills} · {k.submitted}</span></span>
                {k.resubmit && <Pill tone="red">ส่งใหม่</Pill>}
              </button>
            ))}
          </Card>

          {sel && (
            <Card className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sel.avatar} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-gold-500" />
                <div className="flex-1 min-w-0"><h2 className="font-display font-semibold text-xl">{sel.name}</h2><p className="text-sm text-ink-300">{sel.skills} · ส่งเมื่อ {sel.submitted}</p></div>
                <Pill tone="gold">รอตรวจ</Pill>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {sel.docs.map((d) => (
                  <div key={d} className="rounded-xl border border-ink-600 overflow-hidden">
                    <div className="h-36 bg-ink-700 grid place-items-center text-xs text-ink-300">[ภาพ{d}]</div>
                    <p className="px-3 py-2 text-sm">{d}</p>
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <p className="font-display font-medium">เช็กลิสต์</p>
                  {CHECKS.map((c, i) => (
                    <label key={c} className="flex items-center gap-2.5 text-sm min-h-9">
                      <input type="checkbox" checked={!!checks[i]} onChange={(e) => setChecks(checks.map((v, j) => (j === i ? e.target.checked : v)))} className="w-5 h-5 accent-[#e0a400]" />{c}
                    </label>
                  ))}
                </div>
                <label className="flex flex-col gap-2">
                  <span className="font-display font-medium">เหตุผล (ถ้าปฏิเสธ)</span>
                  <select value={reason} onChange={(e) => setReason(e.target.value)} className="input-dark h-11">
                    <option value="">เลือกเหตุผล</option>
                    {REASONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button onClick={() => done(`ขอเอกสารเพิ่มจาก ${sel.name} แล้ว`)} className="btn-ghost h-11 px-4 rounded-xl">ขอเอกสารเพิ่ม</button>
                <button onClick={() => done(`ปฏิเสธ ${sel.name}: ${reason}`)} disabled={!reason} className="h-11 px-4 rounded-xl border border-crimson-500 text-crimson-200 disabled:opacity-40">ปฏิเสธ</button>
                <button onClick={() => done(`อนุมัติ ${sel.name} · มอบตรา ✓ แล้ว`)} disabled={!checks.every(Boolean)} className="h-11 px-5 rounded-xl bg-gold-500 text-[#3a1208] font-semibold disabled:opacity-40">อนุมัติ · มอบตรา ✓</button>
              </div>
              {!checks.every(Boolean) && <p className="text-xs text-ink-300 text-right -mt-2">ติ๊กเช็กลิสต์ให้ครบก่อนอนุมัติ</p>}
            </Card>
          )}
        </div>
      )}
      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
