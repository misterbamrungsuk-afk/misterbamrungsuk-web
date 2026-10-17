"use client";

import { useState } from "react";
import { FlashMsg, useConfirm, useFlash } from "../confirm";

// แก้รายการคำห้ามส่ง (1 คำต่อบรรทัด) + จำนวนครั้งที่ฝ่าฝืนแล้วแจ้งทีมงาน
const MIN = 1, MAX = 20; // ตรงกับที่เซิร์ฟเวอร์บีบค่า (saveChatRules)
const countWords = (t: string) => t.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean).length;

export function RulesForm({ words, strikeLimit, edited }: { words: string[]; strikeLimit: number; edited: { at: string; by: string } | null }) {
  const [text, setText] = useState(words.join("\n"));
  const [limit, setLimit] = useState(String(strikeLimit));
  const { msg, flash, fromRes } = useFlash(6000);
  const [confirmUi, ask] = useConfirm();
  const [busy, setBusy] = useState(false);
  const n = Number(limit);
  const limitErr = !/^\d+$/.test(limit.trim()) || n < MIN || n > MAX ? `ใส่ตัวเลข ${MIN}–${MAX} ครั้ง` : "";
  const save = async () => {
    if (limitErr) { flash(`จำนวนครั้ง: ${limitErr}`, { ok: false }); return; }
    const now = countWords(text);
    // ลิสต์ว่าง = ปิดตัวกันคำห้ามทั้งหมด (เหลือแค่กันเบอร์/ลิงก์อัตโนมัติ) · ลดลงมาก = อาจลบพลาด → ยืนยันก่อน
    if (now === 0 && !(await ask({ title: "บันทึกรายการคำห้ามว่าง?", body: "จะไม่มีคำห้ามส่งเหลือเลย — แชทกันได้เฉพาะเบอร์โทร อีเมล ลิงก์ และ @ไอดีอัตโนมัติ\nแน่ใจว่าต้องการลบคำห้ามทั้งหมด?", ok: "บันทึกรายการว่าง", danger: true }))) return;
    if (now > 0 && now < words.length / 2 && !(await ask({ title: "คำห้ามลดลงมาก", body: `จาก ${words.length} เหลือ ${now} คำ — ตรวจว่าไม่ได้ลบพลาด`, ok: "บันทึก" }))) return;
    setBusy(true);
    const r = await fetch("/api/admin/chats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ words: text, strikeLimit: n }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (d?.ok) { setText(d.rules.words.join("\n")); setLimit(String(d.rules.strikeLimit)); flash(`บันทึกแล้ว · ${d.rules.words.length} คำ · แจ้งเมื่อครบ ${d.rules.strikeLimit} ครั้ง (มีผลภายใน 1 นาที)`, { ok: true }); }
    else fromRes(r, d?.error || "บันทึกไม่สำเร็จ", false);
  };
  return (
    <section className="rounded-2xl border border-ink-600 p-4 flex flex-col gap-3 text-[13px] lg:sticky lg:top-4">
      <b className="text-[15px]">คำห้ามส่งในแชท</b>
      <p className="text-ink-300 leading-relaxed">1 คำต่อบรรทัด · ระบบตัดช่องว่าง/จุด/ขีด และไม่สนตัวพิมพ์ก่อนเทียบ (เช่น “ไ ล น์” ก็ถูกกัน) · เบอร์โทร อีเมล ลิงก์ และ @ไอดี ถูกกันอัตโนมัติอยู่แล้ว</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} className="rounded-xl border border-ink-600 bg-[#130e0e] p-3 text-[13px] text-[#f6efe4] outline-none font-mono" aria-label="คำห้ามส่ง" />
      <span className="text-[11.5px] text-[#9a8a85]">{countWords(text)} คำ{countWords(text) === 0 ? " · ⚠ รายการว่าง" : ""}</span>
      <label className="flex flex-wrap items-center gap-2">แจ้งทีมงานเมื่อฝ่าฝืนครบ<input type="number" inputMode="numeric" min={MIN} max={MAX} value={limit} onChange={(e) => setLimit(e.target.value)} onBlur={() => { if (/^\d+$/.test(limit.trim())) setLimit(String(Math.min(MAX, Math.max(MIN, Number(limit))))); }} aria-invalid={!!limitErr} className="h-9 w-20 rounded-lg border bg-[#130e0e] px-2.5 text-[#f6efe4]" style={{ borderColor: limitErr ? "#fca5a5" : undefined }} />ครั้งต่อนัด</label>
      {limitErr && <span role="alert" className="text-[12px] text-[#fca5a5]">{limitErr}</span>}
      <button type="button" onClick={save} disabled={busy || !!limitErr} className="self-start btn-red-lux h-10 px-5 rounded-full text-white font-semibold disabled:opacity-40">{busy ? "กำลังบันทึก…" : "บันทึกคำห้าม"}</button>
      <FlashMsg msg={msg} />
      {edited && <span className="text-[11.5px] text-[#9a8a85]">แก้ล่าสุด {new Date(edited.at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} โดย {edited.by}</span>}
      {confirmUi}
    </section>
  );
}
