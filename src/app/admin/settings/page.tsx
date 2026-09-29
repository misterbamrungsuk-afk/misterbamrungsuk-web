"use client";

import { useState } from "react";
import { Toast } from "@/components/ui";
import { site } from "@/lib/site";
import { CATEGORIES } from "@/lib/categories";
import { Card, PageHead } from "../admin-nav";

// ค่าระบบ — โหมดเดโมเก็บใน state; โหมดจริงบันทึกลงตาราง settings + บันทึก Audit log
const FIELDS = [
  { group: "การเงิน", key: "gp", label: "ค่าธรรมเนียม GP (%)", value: site.commissionPercent },
  { group: "การเงิน", key: "deposit", label: "มัดจำเริ่มต้น (บาท)", value: site.depositDefault },
  { group: "การเงิน", key: "autoRelease", label: "ปล่อยเงินอัตโนมัติหลัง (ชม.)", value: 24 },
  { group: "การเงิน", key: "freeCancel", label: "ยกเลิกฟรีก่อนนัด (ชม.)", value: 3 },
  { group: "กติกาและความปลอดภัย", key: "strike", label: "Strike ก่อนระงับอัตโนมัติ", value: site.strikeLimit },
  { group: "กติกาและความปลอดภัย", key: "strikeExpire", label: "Strike หมดอายุหลัง (วัน)", value: 90 },
  { group: "กติกาและความปลอดภัย", key: "wait", label: "รอลูกค้าสูงสุด (นาที)", value: 15 },
  { group: "กติกาและความปลอดภัย", key: "accept", label: "เวลากดรับงานด่วน (วินาที)", value: site.matchAcceptSeconds },
  { group: "โพสต์และค้นหา", key: "postExpire", label: "โพสต์หมดอายุหลัง (วัน)", value: site.postExpiryDays },
  { group: "โพสต์และค้นหา", key: "radius", label: "รัศมีงานด่วนเริ่มต้น (กม.)", value: 5 },
] as const;

export default function AdminSettingsPage() {
  const [vals, setVals] = useState<Record<string, number>>(Object.fromEntries(FIELDS.map((f) => [f.key, f.value])));
  const [cats, setCats] = useState(CATEGORIES.filter((c) => c.slug !== "other").map((c) => c.th));
  const [newCat, setNewCat] = useState("");
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState("");
  const groups = [...new Set(FIELDS.map((f) => f.group))];
  const bad = vals.gp < 0 || vals.gp > 50 || vals.strike < 1;

  return (
    <>
      <PageHead title="ตั้งค่าระบบ" sub="เฉพาะ Super admin · ทุกการแก้ไขถูกบันทึกใน Audit log"
        right={<button onClick={() => { setDirty(false); setToast("บันทึกการตั้งค่าแล้ว"); setTimeout(() => setToast(""), 2200); }} disabled={!dirty || bad} className="btn-crimson h-11 px-5 rounded-xl font-semibold">บันทึกการเปลี่ยนแปลง</button>} />
      {bad && <p className="text-sm text-crimson-200 mb-3">GP ต้องอยู่ระหว่าง 0–50% และ strike อย่างน้อย 1</p>}
      <div className="grid md:grid-cols-2 gap-3">
        {groups.map((g) => (
          <Card key={g} className="flex flex-col">
            <h2 className="font-display font-medium text-lg mb-2">{g}</h2>
            {FIELDS.filter((f) => f.group === g).map((f) => (
              <label key={f.key} className="flex items-center gap-3 py-2.5 border-b border-ink-600 last:border-0 text-sm">
                <span className="flex-1">{f.label}</span>
                <input type="number" min={0} value={vals[f.key]} onChange={(e) => { setVals({ ...vals, [f.key]: Number(e.target.value) }); setDirty(true); }} className="input-dark h-10 w-24 text-center font-display text-gold-300" />
              </label>
            ))}
          </Card>
        ))}
        <Card className="flex flex-col gap-3">
          <h2 className="font-display font-medium text-lg">หมวดบริการ</h2>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <span key={c} className="chip h-9 px-3 inline-flex items-center gap-1.5">{c}
                <button onClick={() => { setCats(cats.filter((x) => x !== c)); setDirty(true); }} aria-label={`ลบ ${c}`} className="w-9 h-9 -mr-2.5 grid place-items-center text-lg text-ink-300 hover:text-crimson-300">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="เพิ่มหมวด เช่น นวดหน้า" aria-label="หมวดใหม่" className="input-dark h-11" />
            <button onClick={() => { const v = newCat.trim(); if (v && !cats.includes(v)) { setCats([...cats, v]); setNewCat(""); setDirty(true); } }} disabled={!newCat.trim()} className="h-11 px-4 rounded-xl border border-gold-500 text-gold-300 shrink-0 disabled:opacity-40">เพิ่ม</button>
          </div>
        </Card>
      </div>
      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
