"use client";

import { useState } from "react";

// เช็กลิสต์ทรัพย์สินลูกค้าก่อนจบงาน — ป้องกันข้อกล่าวหาของหาย (ความปลอดภัยของผู้ให้บริการ)
// ยังไม่มี API ฝั่งเซิร์ฟเวอร์ → บันทึกเวลายืนยันไว้ในเครื่อง (localStorage) key: mb_belongings_<jobId>
const ITEMS = [
  { k: "phone", th: "มือถือ", en: "Phone" },
  { k: "necklace", th: "สร้อย", en: "Necklace" },
  { k: "watch", th: "นาฬิกา", en: "Watch" },
  { k: "ring", th: "แหวน", en: "Ring" },
  { k: "wallet", th: "กระเป๋าเงิน", en: "Wallet" },
  { k: "other", th: "อื่นๆ", en: "Other" },
] as const;

export type BelongingsRecord = { jobId: string; items: string[]; note: string; confirmedAt: string };

export function BelongingsChecklist({ jobId, th, onConfirm, onCancel }: { jobId: string; th: boolean; onConfirm: (r: BelongingsRecord) => void; onCancel: () => void }) {
  const [checked, setChecked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const all = checked.length === ITEMS.length;

  const confirm = () => {
    const rec: BelongingsRecord = { jobId, items: checked, note: note.trim(), confirmedAt: new Date().toISOString() };
    try { localStorage.setItem(`mb_belongings_${jobId}`, JSON.stringify(rec)); } catch {}
    onConfirm(rec);
  };

  return (
    <div className="glass rounded-2xl p-5 animate-rise border-gold-500/40">
      <p className="font-semibold">🧾 {th ? "เช็กทรัพย์สินลูกค้าก่อนจบงาน" : "Check customer's belongings"}</p>
      <p className="text-xs text-ink-400 mt-1">{th ? "ยืนยันร่วมกับลูกค้าว่าของทุกชิ้นอยู่ครบ ติ๊กให้ครบทุกข้อจึงจบงานได้" : "Confirm with the customer that everything is in place. Tick all to finish."}</p>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {ITEMS.map((it) => {
          const on = checked.includes(it.k);
          return (
            <button key={it.k} type="button" aria-pressed={on} onClick={() => setChecked(on ? checked.filter((x) => x !== it.k) : [...checked, it.k])}
              className={`chip h-11 justify-start px-3.5 ${on ? "chip-gold" : ""}`}>
              {on ? "✓" : "○"} {th ? it.th : it.en}
            </button>
          );
        })}
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="input-dark h-20 resize-none w-full mt-3 text-sm"
        placeholder={th ? "อื่นๆ (ระบุ) เช่น แว่นตา กุญแจรถ — ไม่บังคับ" : "Other (note) e.g. glasses, car keys — optional"} aria-label={th ? "หมายเหตุ" : "Note"} />
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} className="btn-ghost rounded-xl flex-1 py-3 text-sm">{th ? "กลับ" : "Back"}</button>
        <button onClick={confirm} disabled={!all} className="btn-crimson rounded-xl flex-1 py-3 text-sm font-bold">
          {all ? `🏁 ${th ? "ยืนยัน · จบงาน" : "Confirm · Finish"}` : th ? `ติ๊กให้ครบ (${checked.length}/${ITEMS.length})` : `Tick all (${checked.length}/${ITEMS.length})`}
        </button>
      </div>
    </div>
  );
}
