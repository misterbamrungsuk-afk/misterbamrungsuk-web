"use client";

// ส่วนที่กดได้ของหน้า ข้อความตอบกลับเร็ว (บอร์ด P-QuickReplies) และ โพสต์ของฉัน (บอร์ด P-Posts)
import Link from "next/link";
import { useState } from "react";
import { CONTACT_MSG, hasContact } from "@/lib/join/contact-guard";
import type { PtListing, PtSettings } from "@/lib/join/store";

const GOLD = "#e8c472";

async function post(mb: string, t: string, step: string, fill: (fd: FormData) => void) {
  const fd = new FormData();
  fd.set("mb", mb); if (t) fd.set("t", t); fd.set("step", step);
  fill(fd);
  const res = await fetch("/api/join/profile", { method: "POST", body: fd }).catch(() => null);
  const d = (await res?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  return d?.ok ? null : d?.error ?? "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง";
}

/** บอร์ด P-QuickReplies — ตอบอัตโนมัติเมื่อไม่ว่าง (สวิตช์ + ข้อความ) · ข้อความที่บันทึกไว้ สูงสุด 10 (แก้ / ลบ / เพิ่ม) */
export function QuickReplies({ mb, t, init }: { mb: string; t: string; init: PtSettings | null }) {
  const [on, setOn] = useState(init?.auto_reply_on ?? false);
  const [auto, setAuto] = useState(init?.auto_reply || "ขอบคุณที่ทักมานะครับ ตอนนี้ยังไม่สะดวก จะรีบตอบภายใน 1 ชม.");
  const [list, setList] = useState<string[]>(init?.quick_replies?.length ? init.quick_replies : ["ถึงจุดนัดแล้วครับ รออยู่หน้าล็อบบี้", "กำลังเดินทาง อีกประมาณ 10 นาที", "ขอบคุณที่จองนะครับ เจอกันวันนัด"]);
  const [edit, setEdit] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [st, setSt] = useState("");
  const save = async (next: { on?: boolean; auto?: string; list?: string[] }) => {
    const o = next.on ?? on, a = next.auto ?? auto, l = next.list ?? list;
    if ([a, ...l].some(hasContact)) { setSt(CONTACT_MSG); return false; }
    setSt("busy");
    const err = await post(mb, t, "settings", (fd) => { fd.set("auto_reply_on", String(o)); fd.set("auto_reply", a); l.forEach((q) => fd.append("quick_replies", q)); });
    setSt(err ?? "ok");
    return !err;
  };
  const commit = async () => {
    const v = draft.trim();
    if (!v) return;
    const l = edit === -1 ? [...list, v] : list.map((x, i) => (i === edit ? v : x));
    if (await save({ list: l })) { setList(l); setEdit(null); setDraft(""); }
  };
  const card = "rounded-2xl bg-[#211a18]";
  return (
    <div className="flex flex-col gap-4">
      <button type="button" role="switch" aria-checked={on} onClick={async () => { const n = !on; setOn(n); await save({ on: n }); }} className={`${card} flex justify-between items-center gap-3 text-left text-[#f3ead9]`} style={{ padding: 16 }}>
        <span><b className="font-semibold">ตอบอัตโนมัติเมื่อไม่ว่าง</b><span className="block text-[12px] font-light text-[#b5a596]">ส่งทันทีเมื่อลูกค้าทักนอกเวลาทำงาน</span></span>
        <span className="w-11 h-[26px] rounded-full relative shrink-0" style={{ background: on ? GOLD : "rgba(243,234,217,0.18)" }}><span className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all" style={{ left: on ? 21 : 3 }} /></span>
      </button>
      <label className={`${card} flex flex-col gap-2`} style={{ padding: 16 }}>
        <span className="text-[12px] font-light text-[#b5a596]">ข้อความตอบอัตโนมัติ (แตะเพื่อแก้)</span>
        <textarea value={auto} maxLength={300} rows={2} onChange={(e) => { setAuto(e.target.value); setSt(""); }} onBlur={() => save({})} className="bg-transparent text-[13px] font-light leading-[1.6] text-[#f3ead9] outline-none resize-none" />
      </label>
      <div className="flex justify-between items-center"><span className="font-semibold">ข้อความที่บันทึกไว้</span><span className="text-[12px] font-light text-[#b5a596]">{list.length} / 10</span></div>
      {list.map((m, i) => edit === i ? null : (
        <div key={m} className={`${card} flex justify-between items-center gap-3`} style={{ padding: "8px 8px 8px 16px" }}>
          <span className="text-[13px] font-light leading-[1.6]">{m}</span>
          <span className="flex shrink-0">
            <button type="button" onClick={() => { setEdit(i); setDraft(m); setSt(""); }} className="min-h-11 px-2 text-[14px] text-[#e8c472]" aria-label={`แก้ ${m}`}>แก้</button>
            <button type="button" onClick={async () => { const l = list.filter((_, j) => j !== i); if (await save({ list: l })) setList(l); }} className="min-h-11 px-2 text-[14px] text-[#b5a596]" aria-label={`ลบ ${m}`}>ลบ</button>
          </span>
        </div>
      ))}
      {edit !== null ? (
        <div className={`${card} flex flex-col gap-2`} style={{ padding: 12 }}>
          <input autoFocus value={draft} maxLength={80} onChange={(e) => { setDraft(e.target.value); setSt(""); }} onKeyDown={(e) => { if (e.key === "Enter") commit(); }} placeholder="พิมพ์ข้อความ" aria-label="ข้อความตอบกลับเร็ว" className="h-12 rounded-xl bg-[#251d1b] text-[15px] text-[#f3ead9] outline-none px-3.5 border border-transparent focus:border-[#e8c472]" />
          {hasContact(draft) && <span className="text-[12.5px] text-[#ff8a9a]">{CONTACT_MSG}</span>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setEdit(null); setDraft(""); }} className="h-11 rounded-xl text-[14px] font-semibold" style={{ background: "rgba(243,234,217,0.1)" }}>ยกเลิก</button>
            <button type="button" onClick={commit} disabled={!draft.trim() || hasContact(draft) || st === "busy"} className="h-11 rounded-xl bg-[#e8c472] text-[#1b130b] text-[14px] font-semibold disabled:opacity-45">บันทึก</button>
          </div>
        </div>
      ) : list.length < 10 && (
        <button type="button" onClick={() => { setEdit(-1); setDraft(""); setSt(""); }} className="min-h-12 rounded-[14px] text-[#e8c472] font-semibold text-[14px] flex items-center justify-center gap-2" style={{ background: "rgba(232,196,114,0.14)" }}>+ เพิ่มข้อความ</button>
      )}
      {st === "ok" && <p role="status" className="m-0 text-[12.5px] text-[#7fd6a3] text-center">✓ บันทึกแล้ว</p>}
      {st && st !== "ok" && st !== "busy" && <p role="alert" className="m-0 text-[12.5px] text-[#ff8a9a] text-center">{st}</p>}
      <div className="text-[12px] font-light text-[#b5a596] text-center">ห้ามใส่เบอร์โทร / LINE / ช่องทางนอกแอป · ระบบซ่อนอัตโนมัติ</div>
    </div>
  );
}

/** บอร์ด P-Posts — โพสต์ของฉัน (บัญชีละ 1 โพสต์): หัวข้อ · กติกา · ซ่อนชั่วคราว (รูป/กิจกรรม/สถานที่มาจากโปรไฟล์) */
const RULES_DEFAULT = "1. ไม่มีบริการทางเพศทุกรูปแบบ\n2. นัดเจอในที่สาธารณะ ที่พักของลูกค้า (คอนโด/โรงแรม) หรือสปาพาร์ทเนอร์ ตามที่ลูกค้าเลือก\n3. ยกเลิกก่อนนัด 3 ชม. คืนเงินเต็มจำนวน";
export function ListingForm({ mb, t, init, previewHref }: { mb: string; t: string; init: PtListing | null; previewHref: string }) {
  const [title, setTitle] = useState(init?.title ?? "");
  const [rules, setRules] = useState(init?.rules || RULES_DEFAULT);
  const [hidden, setHidden] = useState(init?.hidden ?? false);
  const [st, setSt] = useState("");
  const bad = hasContact(title) || hasContact(rules);
  const save = async () => {
    if (!title.trim()) { setSt("กรอกหัวข้อโพสต์"); return; }
    if (bad) { setSt(CONTACT_MSG); return; }
    setSt("busy");
    const err = await post(mb, t, "listing", (fd) => { fd.set("title", title); fd.set("rules", rules); fd.set("hidden", String(hidden)); });
    setSt(err ?? "ok");
  };
  const inp = "w-full rounded-[14px] border border-[rgba(243,234,217,0.07)] bg-[#211a18] text-[15px] text-[#f3ead9] outline-none focus:border-[#e8c472] placeholder:text-[#b5a596]";
  return (
    <div className="flex flex-col gap-[18px]">
      <label className="flex flex-col gap-1.5"><span className="text-[13px] text-[#d9c9b4]">หัวข้อ</span>
        <input value={title} maxLength={80} placeholder="เช่น เพื่อนกินเที่ยว คาเฟ่ ถ่ายรูปสวย ดูแลตลอดนัด" onChange={(e) => { setTitle(e.target.value); setSt(""); }} className={`${inp} h-12 px-3.5`} /></label>
      <label className="flex flex-col gap-1.5"><span className="text-[13px] text-[#d9c9b4]">กติกา (แก้ไขได้)</span>
        <textarea value={rules} maxLength={600} rows={5} onChange={(e) => { setRules(e.target.value); setSt(""); }} className={`${inp} leading-[1.55] resize-y`} style={{ padding: "12px 14px" }} /></label>
      {bad && <span className="text-[12.5px] text-[#ff8a9a]">{CONTACT_MSG}</span>}
      <button type="button" role="switch" aria-checked={hidden} onClick={() => { setHidden(!hidden); setSt(""); }} className="flex items-center justify-between bg-[#211a18] rounded-[14px] text-[14px] text-[#f3ead9]" style={{ padding: "12px 14px", border: "1px solid rgba(243,234,217,0.07)" }}>
        ซ่อนโพสต์ชั่วคราว
        <span className="w-12 h-7 rounded-[28px] relative" style={{ background: hidden ? GOLD : "rgba(243,234,217,0.07)" }}><span className="absolute top-[3px] w-[22px] h-[22px] rounded-[22px] transition-all" style={{ left: hidden ? 23 : 3, background: hidden ? "#1b130b" : "#d9c9b4" }} /></span>
      </button>
      <div className="flex gap-2.5">
        <Link href={previewHref} className="h-[54px] rounded-2xl grid place-items-center font-medium text-[#f3ead9] hover:text-[#f3ead9]" style={{ padding: "0 18px", border: "1px solid rgba(243,234,217,0.07)" }}>ดูตัวอย่าง</Link>
        <button type="button" onClick={save} disabled={st === "busy"} className="flex-grow h-[54px] rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[16px]">{st === "busy" ? "กำลังบันทึก…" : st === "ok" ? "✓ บันทึกแล้ว" : "บันทึกโพสต์"}</button>
      </div>
      {st && !["ok", "busy"].includes(st) && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{st}</p>}
    </div>
  );
}
