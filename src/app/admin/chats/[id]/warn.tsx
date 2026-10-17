"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlashMsg, useConfirm, useFlash } from "../../confirm";

// ทีมงานส่งคำเตือนเข้าห้องแชท (ข้อความระบบ ทั้งสองฝ่ายเห็น) + แจ้งเตือนฝ่ายที่ถูกเตือน
const PRESETS = ["ห้ามแลกเบอร์โทร / LINE / ช่องทางติดต่อนอกแอป", "กรุณาใช้ถ้อยคำสุภาพ", "ห้ามนัดรับเงินนอกแอป · ชำระผ่านแอปเท่านั้น"];

export function WarnBox({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [to, setTo] = useState<"customer" | "parttime" | "both">("both");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const { msg, flash, fromRes } = useFlash();
  const [confirmUi, ask] = useConfirm();
  const label = { customer: "ลูกค้า", parttime: "Part-Time", both: "ทั้งสองฝ่าย" }[to];
  const send = async () => {
    const t = text.trim();
    if (t.length < 5) { flash("พิมพ์ข้อความเตือนอย่างน้อย 5 ตัวอักษร", { ok: false }); return; }
    if (!(await ask({ title: `ส่งคำเตือนถึง${label}?`, body: `ข้อความนี้จะขึ้นในห้องแชท (ทั้งสองฝ่ายเห็น) และแจ้งเตือน${label}:\n“${t}”`, ok: "ส่งคำเตือน" }))) return;
    setBusy(true);
    const r = await fetch("/api/admin/chats/warn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ booking_id: bookingId, to, text: t }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (d?.ok) { setText(""); flash("ส่งคำเตือนแล้ว", { ok: true }); router.refresh(); } else fromRes(r, d?.error || "ส่งคำเตือนไม่สำเร็จ", false);
  };
  return (
    <section className="rounded-2xl border border-[rgba(240,200,90,.38)] bg-[#1c1414] p-3.5 flex flex-col gap-2 text-[13px]">
      <b className="text-[14.5px] text-[#ffd76a]">เตือนผู้ใช้ในแชทนี้</b>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="เตือนใคร">
        {(["both", "customer", "parttime"] as const).map((k) => <button key={k} type="button" role="radio" aria-checked={to === k} onClick={() => setTo(k)} className={`chip h-9 px-3.5 ${to === k ? "chip-red" : ""}`}>{{ customer: "ลูกค้า", parttime: "Part-Time", both: "ทั้งสองฝ่าย" }[k]}</button>)}
      </div>
      <div className="flex flex-wrap gap-1">{PRESETS.map((p) => <button key={p} type="button" onClick={() => setText(p)} className="h-7 px-2.5 rounded-full border border-[rgba(240,200,90,.3)] text-[11.5px] text-[#cdbfb3]">{p}</button>)}</div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={500} placeholder="ข้อความเตือน" aria-label="ข้อความเตือน" className="rounded-xl border border-ink-600 bg-[#130e0e] p-2.5 text-[13px] text-[#f6efe4] outline-none focus:border-[#f0c75a]" />
      <button type="button" onClick={send} disabled={busy || text.trim().length < 5} className="self-start btn-red-lux h-10 px-5 rounded-full text-white font-semibold disabled:opacity-40">{busy ? "กำลังส่ง…" : "ส่งคำเตือน"}</button>
      <FlashMsg msg={msg} />
      {confirmUi}
    </section>
  );
}
