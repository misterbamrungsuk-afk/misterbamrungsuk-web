"use client";

// ส่วนที่กดได้ของหน้า Part-Time (ตัวจำลองรายได้ · ตั้งค่าข้อความตอบกลับ · ประกาศวันนี้ว่าง · ออกจากระบบ/ลบบัญชี)
import { useState } from "react";
import { useRouter } from "next/navigation";
import { pctFor, type Tier } from "@/lib/join/earnings-shared";
import type { PtPost, PtSettings } from "@/lib/join/store";

const GOLD = "#e8c472";
const baht = (n: number) => "฿" + Math.round(n).toLocaleString("en-US");
const card = "rounded-[18px] bg-[#211a18] flex flex-col gap-3";
const inp = "w-full rounded-xl bg-[#251d1b] text-[#f3ead9] text-[15px] font-light outline-none border border-transparent focus:border-[#e8c472] placeholder:text-[#8d7f72]";

async function post(mb: string, t: string, step: string, fill: (fd: FormData) => void) {
  const fd = new FormData();
  fd.set("mb", mb); if (t) fd.set("t", t); fd.set("step", step);
  fill(fd);
  const res = await fetch("/api/join/profile", { method: "POST", body: fd }).catch(() => null);
  const d = (await res?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  return d?.ok ? null : d?.error ?? "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง";
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} className="w-11 h-[26px] rounded-full relative shrink-0" style={{ background: on ? GOLD : "rgba(243,234,217,0.18)" }}>
      <span className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all" style={{ left: on ? 21 : 3 }} />
    </button>
  );
}

/** บอร์ด MyEarnings — ตัวจำลอง "ถ้ารับ N นัด/เดือน" ด้วยราคาและขั้นส่วนแบ่งจริงจากแอดมิน */
export function EarnSim({ price, tiers }: { price: number; tiers: Tier[] }) {
  const [n, setN] = useState(10);
  const pct = pctFor(tiers, n);
  const step = (d: number) => setN((v) => Math.min(60, Math.max(0, v + d)));
  const btn = "w-11 h-11 rounded-full bg-[#251d1b] text-[#e8c472] text-[22px] grid place-items-center";
  return (
    <div className={card} style={{ padding: 16 }}>
      <div className="flex justify-between items-center gap-3">
        <span className="text-[15px] font-semibold">ลองคำนวณ · ถ้ารับงานเดือนละ</span>
      </div>
      <div className="flex items-center justify-center gap-5">
        <button type="button" className={btn} aria-label="ลดจำนวนนัด" onClick={() => step(-1)}>−</button>
        <span className="text-center"><span className="block font-semibold text-[34px] tabular-nums leading-none">{n}</span><span className="text-[13px] text-[#b5a596] font-light">นัด / เดือน</span></span>
        <button type="button" className={btn} aria-label="เพิ่มจำนวนนัด" onClick={() => step(1)}>+</button>
      </div>
      <div className="rounded-xl bg-[#251d1b] flex justify-between items-end gap-3" style={{ padding: "12px 14px" }}>
        <span className="text-[13px] text-[#d9c9b4] font-light">{n} × {baht(price)} × {pct}%</span>
        <span className="font-semibold text-[26px] text-[#e8c472] tabular-nums">{baht(n * price * pct / 100)}</span>
      </div>
      <span className="text-[12px] text-[#b5a596] font-light">ประมาณการต่อเดือน · ไม่รวมทิป · ราคาต่อนัด 3 ชม. ตามระดับของคุณ</span>
    </div>
  );
}

/** บอร์ด ProviderSettings — ข้อความตอบกลับอัตโนมัติ + ข้อความสำเร็จรูป */
const QUICK_DEFAULT = ["สวัสดีค่ะ ยินดีที่ได้รู้จัก", "ขอเช็คตารางก่อนนะคะ", "ถึงจุดนัดแล้วค่ะ", "ขอบคุณที่ใช้บริการค่ะ"];
export function SettingsForm({ mb, t, init }: { mb: string; t: string; init: PtSettings | null }) {
  const [on, setOn] = useState(init?.auto_reply_on ?? false);
  const [text, setText] = useState(init?.auto_reply ?? "ขอบคุณที่ทักมานะคะ ตอนนี้ติดงานอยู่ จะตอบกลับภายใน 30 นาทีค่ะ");
  const [quick, setQuick] = useState<string[]>(init?.quick_replies?.length ? init.quick_replies : QUICK_DEFAULT);
  const [add, setAdd] = useState("");
  const [st, setSt] = useState<"" | "busy" | "ok" | string>("");
  const dirty = () => setSt("");
  const save = async () => {
    setSt("busy");
    const err = await post(mb, t, "settings", (fd) => { fd.set("auto_reply_on", String(on)); fd.set("auto_reply", text); quick.forEach((q) => fd.append("quick_replies", q)); });
    setSt(err ?? "ok");
  };
  return (
    <div className={card} style={{ padding: 16 }}>
      <div className="flex justify-between items-center gap-3">
        <span className="flex flex-col"><span className="text-[15px] font-semibold">ตอบกลับอัตโนมัติ</span><span className="text-[12.5px] text-[#b5a596] font-light">ส่งให้ลูกค้าเมื่อคุณยังไม่ว่างตอบ</span></span>
        <Switch on={on} label="ตอบกลับอัตโนมัติ" onClick={() => { setOn(!on); dirty(); }} />
      </div>
      <textarea aria-label="ข้อความตอบกลับอัตโนมัติ" rows={3} maxLength={300} value={text} disabled={!on} onChange={(e) => { setText(e.target.value); dirty(); }} className={inp} style={{ padding: 12, opacity: on ? 1 : 0.5, resize: "vertical" }} />
      <span className="text-[14px] font-semibold mt-1">ข้อความสำเร็จรูป</span>
      <div className="flex flex-wrap gap-2">
        {quick.map((q) => (
          <span key={q} className="inline-flex items-center gap-1 rounded-full bg-[#251d1b] text-[13px] font-light" style={{ padding: "6px 6px 6px 12px" }}>
            {q}
            <button type="button" aria-label={`ลบ ${q}`} onClick={() => { setQuick(quick.filter((x) => x !== q)); dirty(); }} className="w-6 h-6 rounded-full text-[#b5a596] grid place-items-center hover:text-[#f3ead9]">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input aria-label="เพิ่มข้อความสำเร็จรูป" value={add} maxLength={60} placeholder="พิมพ์ข้อความใหม่" onChange={(e) => setAdd(e.target.value)} className={inp} style={{ height: 44, padding: "0 12px" }} />
        <button type="button" disabled={!add.trim() || quick.length >= 12} onClick={() => { const v = add.trim(); if (!quick.includes(v)) setQuick([...quick, v]); setAdd(""); dirty(); }} className="shrink-0 h-11 px-4 rounded-xl text-[14px] font-semibold text-[#e8c472] disabled:opacity-40" style={{ background: "rgba(232,196,114,0.14)" }}>+ เพิ่ม</button>
      </div>
      <button type="button" onClick={save} disabled={st === "busy"} className="h-12 rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold">{st === "busy" ? "กำลังบันทึก…" : st === "ok" ? "✓ บันทึกแล้ว" : "บันทึกข้อความ"}</button>
      {st && st !== "busy" && st !== "ok" && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{st}</p>}
    </div>
  );
}

/** ออกจากระบบ + ขอลบบัญชี (PDPA) — ยืนยันในหน้าก่อนส่ง */
export function AccountActions({ mb, t, deleteRequested }: { mb: string; t: string; deleteRequested: string | null }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [reqAt, setReqAt] = useState(deleteRequested);
  const [err, setErr] = useState("");
  const row = "w-full min-h-[52px] flex items-center justify-between gap-3 text-left text-[15px]";
  const logout = async () => { await fetch("/api/join/logout", { method: "POST" }).catch(() => null); router.push("/work-with-us"); };
  const del = async () => {
    const e = await post(mb, t, "delete_request", () => {});
    if (e) { setErr(e); return; }
    setReqAt(new Date().toISOString()); setAsk(false);
  };
  return (
    <div className="rounded-[18px] bg-[#211a18] flex flex-col" style={{ padding: "4px 16px" }}>
      <button type="button" onClick={logout} className={row}>ออกจากระบบ<span className="text-[#b5a596]">›</span></button>
      <div className="border-t border-[rgba(243,234,217,0.07)]" />
      {reqAt
        ? <p className="m-0 py-3 text-[14px] text-[#d9c9b4] font-light">ส่งคำขอลบบัญชีแล้ว ({new Date(reqAt).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}) · ทีมงานจะติดต่อกลับภายใน 30 วัน ตาม PDPA</p>
        : ask
          ? <div className="py-3 flex flex-col gap-2">
              <p className="m-0 text-[14px] font-light text-[#d9c9b4]">ยืนยันขอลบบัญชีและข้อมูลส่วนตัว? ค่าการันตีที่ชำระแล้วจะดำเนินการตามสัญญา และทีมงานจะติดต่อยืนยันก่อนลบจริง</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setAsk(false)} className="h-11 rounded-xl text-[14px] font-semibold" style={{ background: "rgba(243,234,217,0.1)" }}>ยกเลิก</button>
                <button type="button" onClick={del} className="h-11 rounded-xl text-[14px] font-semibold text-white" style={{ background: "#a3283c" }}>ยืนยันขอลบ</button>
              </div>
              {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}</p>}
            </div>
          : <button type="button" onClick={() => setAsk(true)} className={row + " text-[#ff8a9a]"}>ขอลบบัญชีและข้อมูล (PDPA)<span className="text-[#b5a596]">›</span></button>}
    </div>
  );
}

/** บอร์ด ProviderJobboard — ประกาศ "วันนี้ว่าง" ของฉัน (สร้าง / แก้ / ปิด) */
export function JobPost({ mb, t, init, photo, nickname, openDate }: { mb: string; t: string; init: PtPost | null; photo: string; nickname: string; openDate: string }) {
  const [p, setP] = useState<PtPost | null>(init);
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ text: init?.text ?? "", time: init?.time ?? "", zone: init?.zone ?? "" });
  const [st, setSt] = useState("");
  const live = p?.open;
  const save = async () => {
    setSt("busy");
    const err = await post(mb, t, "post", (fd) => { fd.set("text", f.text); fd.set("time", f.time); fd.set("zone", f.zone); });
    if (err) { setSt(err); return; }
    setP({ ...f, open: true, created_at: new Date().toISOString() }); setEdit(false); setSt("");
  };
  const close = async () => {
    setSt("busy");
    const err = await post(mb, t, "post", (fd) => fd.set("close", "true"));
    if (err) { setSt(err); return; }
    setP(p ? { ...p, open: false } : null); setSt("");
  };
  const field = (k: "text" | "time" | "zone", label: string, ph: string) => (
    <label className="flex flex-col gap-1.5"><span className="text-[13px] text-[#d9c9b4] font-light">{label}</span>
      <input value={f[k]} maxLength={k === "text" ? 160 : 80} placeholder={ph} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} className={inp} style={{ height: 48, padding: "0 14px" }} /></label>
  );

  if (edit || !live) {
    return (
      <div className={card} style={{ padding: 16 }}>
        <span className="text-[15px] font-semibold">{live ? "แก้ไขประกาศ" : "+ สร้างประกาศใหม่ · วันนี้ว่าง"}</span>
        {field("text", "อยากทำอะไร", "เช่น ว่างไปกินข้าว ดูหนัง เดินห้าง")}
        {field("time", "ช่วงเวลา", "เช่น 18:00–22:00")}
        {field("zone", "โซน", "เช่น ทองหล่อ · เอกมัย")}
        <div className={`grid gap-2 ${live ? "grid-cols-2" : "grid-cols-1"}`}>
          {live && <button type="button" onClick={() => setEdit(false)} className="h-12 rounded-[14px] text-[15px] font-semibold" style={{ background: "rgba(243,234,217,0.1)" }}>ยกเลิก</button>}
          <button type="button" onClick={save} disabled={st === "busy"} className="h-12 rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold">{st === "busy" ? "กำลังบันทึก…" : "ลงประกาศ"}</button>
        </div>
        {st && st !== "busy" && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{st}</p>}
        <span className="text-[12px] text-[#b5a596] font-light">ลูกค้าจะเห็นประกาศเมื่อเปิดให้บริการ ({openDate})</span>
      </div>
    );
  }
  return (
    <div className={card} style={{ padding: 16 }}>
      <div className="flex justify-between items-center"><span className="text-[15px] font-semibold">ประกาศของฉัน</span><span className="rounded-full text-[12px] text-[#7fd6a3] font-light" style={{ padding: "3px 10px", background: "rgba(127,214,163,0.12)" }}>● เปิดอยู่</span></div>
      <div className="flex gap-3 items-start">
        {photo ? <img src={photo} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" /> : <span className="w-16 h-16 rounded-xl bg-[#251d1b] shrink-0" />}
        <div className="min-w-0 flex flex-col gap-0.5">
          <span className="font-semibold">{nickname} · วันนี้ว่าง</span>
          <span className="text-[14px] text-[#d9c9b4] font-light break-words">{p!.text}</span>
          <span className="text-[13px] text-[#e8c472] font-light">{p!.time} · {p!.zone}</span>
        </div>
      </div>
      <div className="rounded-xl bg-[#251d1b] text-[13px] text-[#d9c9b4] font-light" style={{ padding: "10px 12px" }}>คนที่สนใจ 0 คน · ลูกค้าจะเห็นประกาศเมื่อเปิดให้บริการ ({openDate})</div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setEdit(true)} className="h-11 rounded-xl text-[14px] font-semibold" style={{ background: "rgba(243,234,217,0.1)" }}>แก้ไข</button>
        <button type="button" onClick={close} disabled={st === "busy"} className="h-11 rounded-xl text-[14px] font-semibold text-[#ff8a9a]" style={{ background: "rgba(255,138,154,0.1)" }}>ปิดประกาศ</button>
      </div>
      {st && st !== "busy" && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{st}</p>}
    </div>
  );
}
