"use client";

import { useState } from "react";

// แก้รายการคำห้ามส่ง (1 คำต่อบรรทัด) + จำนวนครั้งที่ฝ่าฝืนแล้วแจ้งทีมงาน
export function RulesForm({ words, strikeLimit, edited }: { words: string[]; strikeLimit: number; edited: { at: string; by: string } | null }) {
  const [text, setText] = useState(words.join("\n"));
  const [limit, setLimit] = useState(String(strikeLimit));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/chats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ words: text, strikeLimit: Number(limit) }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (d?.ok) { setText(d.rules.words.join("\n")); setMsg(`บันทึกแล้ว · ${d.rules.words.length} คำ (มีผลภายใน 1 นาที)`); } else setMsg(d?.error || "บันทึกไม่สำเร็จ");
  };
  return (
    <section className="rounded-2xl border border-ink-600 p-4 flex flex-col gap-3 text-[13px] lg:sticky lg:top-4">
      <b className="text-[15px]">คำห้ามส่งในแชท</b>
      <p className="text-ink-300 leading-relaxed">1 คำต่อบรรทัด · ระบบตัดช่องว่าง/จุด/ขีด และไม่สนตัวพิมพ์ก่อนเทียบ (เช่น “ไ ล น์” ก็ถูกกัน) · เบอร์โทร อีเมล ลิงก์ และ @ไอดี ถูกกันอัตโนมัติอยู่แล้ว</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} className="rounded-xl border border-ink-600 bg-[#130e0e] p-3 text-[13px] text-[#f6efe4] outline-none font-mono" aria-label="คำห้ามส่ง" />
      <label className="flex items-center gap-2">แจ้งทีมงานเมื่อฝ่าฝืนครบ<input type="number" min={1} max={20} value={limit} onChange={(e) => setLimit(e.target.value)} className="h-9 w-20 rounded-lg border border-ink-600 bg-[#130e0e] px-2.5 text-[#f6efe4]" />ครั้งต่อนัด</label>
      <button type="button" onClick={save} disabled={busy} className="self-start btn-red-lux h-10 px-5 rounded-full text-white font-semibold disabled:opacity-40">{busy ? "กำลังบันทึก…" : "บันทึกคำห้าม"}</button>
      {msg && <p role="status" className="text-[#eed58a]">{msg}</p>}
      {edited && <span className="text-[11.5px] text-[#9a8a85]">แก้ล่าสุด {new Date(edited.at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} โดย {edited.by}</span>}
    </section>
  );
}
