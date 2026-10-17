"use client";

// ส่วนที่กดได้ของหน้า ข้อความตอบกลับเร็ว (บอร์ด P-QuickReplies) และ โพสต์ของฉัน (บอร์ด P-Posts)
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CONTACT_MSG, hasContact } from "@/lib/join/contact-guard";
import { AUTO_REPLY_DEFAULT, QUICK_DEFAULT } from "@/lib/join/pt-ui";
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
  const [auto, setAuto] = useState(init?.auto_reply || AUTO_REPLY_DEFAULT);
  const [list, setList] = useState<string[]>(init?.quick_replies?.length ? init.quick_replies : QUICK_DEFAULT);
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
  const [saved, setSaved] = useState<PtListing | null>(init);
  const router = useRouter();
  const bad = hasContact(title) || hasContact(rules);
  const save = async () => {
    if (!title.trim()) { setSt("กรอกหัวข้อโพสต์"); return; }
    if (bad) { setSt(CONTACT_MSG); return; }
    setSt("busy");
    const err = await post(mb, t, "listing", (fd) => { fd.set("title", title); fd.set("rules", rules); fd.set("hidden", String(hidden)); });
    setSt(err ?? "ok");
    // บันทึกแล้วแสดงโพสต์ที่บันทึกทันที + รีเฟรชสถานะด้านบนของหน้า (ไม่ต้องโหลดหน้าใหม่เอง)
    if (!err) { setSaved({ title: title.trim(), rules: rules.trim(), hidden, updated_at: new Date().toISOString() }); router.refresh(); }
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
      {saved && (
        <div className="rounded-[18px] bg-[#211a18] flex flex-col gap-1.5" style={{ padding: 14, border: "1px solid rgba(232,196,114,0.35)" }}>
          <div className="flex justify-between items-center gap-2"><span className="text-[12px] font-light text-[#b5a596]">โพสต์ที่บันทึกไว้</span><span className="text-[12px]" style={{ color: saved.hidden ? "#b5a596" : GOLD }}>{saved.hidden ? "ซ่อนอยู่" : "แสดงอยู่"} · {new Date(saved.updated_at).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" })}</span></div>
          <b className="font-semibold text-[16px] break-words">{saved.title}</b>
          <p className="m-0 text-[13px] font-light text-[#d9c9b4] whitespace-pre-line break-words">{saved.rules}</p>
        </div>
      )}
    </div>
  );
}

/** บอร์ด P-Availability — เวลาทำงานรายวัน (เปิด/ปิด + เวลาเริ่ม–เลิก) · รัศมีรับงาน 2–20 กม. · พักงานชั่วคราว */
const DAY_NAMES: [string, string][] = [["จ", "จันทร์"], ["อ", "อังคาร"], ["พ", "พุธ"], ["พฤ", "พฤหัส"], ["ศ", "ศุกร์"], ["ส", "เสาร์"], ["อา", "อาทิตย์"]];
type WorkDays = Record<string, { on: boolean; from: string; to: string }>;
const HALF_HOURS = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
const toMin = (v: string) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3, 5));
export function WorkForm({ mb, t, init }: { mb: string; t: string; init: { days: WorkDays; radius_km: number; paused: boolean } }) {
  const [days, setDays] = useState<WorkDays>(init.days);
  const [radius, setRadius] = useState(init.radius_km);
  const [paused, setPaused] = useState(init.paused);
  const [st, setSt] = useState("");
  const set = (d: string, v: Partial<WorkDays[string]>) => { setDays((x) => ({ ...x, [d]: { ...x[d], ...v } })); setSt(""); };
  const badDay = DAY_NAMES.find(([d]) => days[d].on && toMin(days[d].to) <= toMin(days[d].from));
  const save = async () => {
    if (badDay) { setSt(`วัน${badDay[1]}: เวลาเลิกต้องหลังเวลาเริ่ม`); return; }
    setSt("busy");
    const err = await post(mb, t, "work", (fd) => { fd.set("days", JSON.stringify(days)); fd.set("radius_km", String(radius)); fd.set("paused", String(paused)); });
    setSt(err ?? "ok");
  };
  const tg = (on: boolean) => <span className="w-11 h-[26px] rounded-full relative shrink-0 inline-block" style={{ background: on ? GOLD : "rgba(243,234,217,0.07)" }}><span className="absolute top-[3px] w-5 h-5 rounded-full transition-all" style={{ left: on ? 21 : 3, background: on ? "#fff" : "#d9c9b4" }} /></span>;
  const tm = "h-11 w-[76px] min-w-0 rounded-[10px] bg-[#251d1b] text-[14px] text-[#f3ead9] px-1.5 outline-none border border-transparent focus:border-[#e8c472] tabular-nums";
  // เลือกเวลาแบบ 24 ชม. ทีละ 30 นาที (input type=time บนมือถือเป็น AM/PM และล้นจอ 390px)
  const sel = (d: string, k: "from" | "to", name: string) => {
    const v = days[d][k];
    const opts = k === "from" ? HALF_HOURS : [...HALF_HOURS.slice(1), "24:00"];
    return (
      <select aria-label={`${k === "from" ? "เริ่ม" : "เลิก"} ${name}`} value={v} onChange={(e) => set(d, { [k]: e.target.value })} className={tm} style={{ colorScheme: "dark" }}>
        {!opts.includes(v) && <option value={v}>{v}</option>}
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  };
  const pct = ((radius - 2) / 18) * 100;
  return (
    <div className="flex flex-col gap-3.5">
      <div className="bg-[#211a18] rounded-[20px] overflow-hidden" style={{ border: "1px solid rgba(243,234,217,0.07)" }}>
        {DAY_NAMES.map(([d, name], i) => {
          const v = days[d];
          return (
            <div key={d} style={{ padding: "12px 14px", borderBottom: i < 6 ? "1px solid rgba(243,234,217,0.07)" : undefined, color: v.on ? "#f3ead9" : "#d9c9b4" }}>
              <div className="flex items-center gap-2 text-[14px]">
                <span className="w-[46px] shrink-0">{name}</span>
                <button type="button" role="switch" aria-checked={v.on} aria-label={`รับงานวัน${name}`} onClick={() => set(d, { on: !v.on })} className="h-11 -my-2 grid place-items-center">{tg(v.on)}</button>
                {v.on
                  ? <span className="ml-auto flex items-center gap-1">{sel(d, "from", name)}<span aria-hidden="true" className="text-[#b5a596]">–</span>{sel(d, "to", name)}</span>
                  : <span className="ml-auto text-[13px] font-light">หยุด</span>}
              </div>
              {v.on && toMin(v.to) <= toMin(v.from) && <p role="alert" className="m-0 mt-1.5 text-[12.5px] text-[#ff8a9a] text-right">เวลาเลิกต้องหลังเวลาเริ่ม</p>}
            </div>
          );
        })}
      </div>
      <div className="bg-[#211a18] rounded-[20px]" style={{ padding: 16, border: "1px solid rgba(243,234,217,0.07)" }}>
        <div className="flex justify-between"><span className="font-medium">รัศมีรับงาน</span><b className="font-medium text-[#e8c472]">{radius} กม.</b></div>
        <input type="range" min={2} max={20} step={1} value={radius} aria-label="รัศมีรับงาน (กม.)" onChange={(e) => { setRadius(Number(e.target.value)); setSt(""); }} className="w-full mt-4 accent-[#e8c472]" style={{ background: `linear-gradient(90deg, ${GOLD} ${pct}%, rgba(243,234,217,0.07) ${pct}%)` }} />
        <div className="flex justify-between text-[12px] text-[#d9c9b4] font-light"><span>2 กม.</span><span>20 กม.</span></div>
      </div>
      <button type="button" role="switch" aria-checked={paused} onClick={() => { setPaused(!paused); setSt(""); }} className="flex items-center gap-3 bg-[#211a18] rounded-2xl text-[14px] text-left text-[#f3ead9]" style={{ padding: 14, border: "1px solid rgba(243,234,217,0.07)" }}>
        <span className="flex-grow">พักงานชั่วคราว<span className="block text-[12px] text-[#d9c9b4] font-light">หยุดรับงานด่วน และซ่อนคุณจากแผนที่ไว้ก่อน</span></span>{tg(paused)}
      </button>
      <button type="button" onClick={save} disabled={st === "busy" || !!badDay} className="h-14 rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[17px] disabled:opacity-50">{st === "busy" ? "กำลังบันทึก…" : st === "ok" ? "✓ บันทึกแล้ว" : "บันทึก"}</button>
      {badDay && <p className="m-0 -mt-2 text-[12.5px] text-[#ff8a9a] text-center">{`แก้เวลาวัน${badDay[1]}ก่อน: เวลาเลิกต้องหลังเวลาเริ่ม`}</p>}
      {st && !["ok", "busy"].includes(st) && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{st}</p>}
    </div>
  );
}
