"use client";

// บอร์ด C-Addresses "ที่อยู่ของฉัน" — บันทึกจุดนัดที่ใช้บ่อย (หลัก 1 แห่ง) → เลือกได้ในหน้าจอง
// ต่างจากบอร์ด: ไม่มีแผนที่ลากหมุด (ยังไม่เก็บพิกัด) · ใช้ชื่อสถานที่ + รายละเอียด + หมายเหตุ
import { useEffect, useState } from "react";
import Link from "next/link";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
type A = { id: string; label: string; detail: string; note: string; primary: boolean };
const blank = { label: "", detail: "", note: "" };

export default function AddressesPage() {
  const [list, setList] = useState<A[] | null>(null);
  const [f, setF] = useState(blank);
  const [edit, setEdit] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [auth, setAuth] = useState(true);
  useEffect(() => { fetch("/api/me", { cache: "no-store" }).then((r) => { if (r.status === 401) setAuth(false); return r.json(); }).then((d) => d?.ok && setList(d.profile.addresses ?? [])).catch(() => setList([])); }, []);
  const save = async (next: A[], okText: string) => {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ addresses: next }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (d?.ok) { setList(d.profile.addresses); setMsg({ ok: true, text: okText }); setF(blank); setEdit(null); } else setMsg({ ok: false, text: d?.error || "บันทึกไม่สำเร็จ" });
  };
  const submit = () => {
    if (!list || !f.label.trim() || !f.detail.trim()) return setMsg({ ok: false, text: "กรอกชื่อสถานที่และรายละเอียด" });
    if (edit) save(list.map((a) => (a.id === edit ? { ...a, ...f } : a)), "แก้ไขที่อยู่แล้ว");
    else if (list.length >= 10) setMsg({ ok: false, text: "บันทึกได้สูงสุด 10 ที่อยู่" });
    else save([...list, { id: crypto.randomUUID(), ...f, primary: !list.length }], "บันทึกที่อยู่ใหม่แล้ว");
  };
  if (!auth) return <div className="text-center" style={{ padding: "80px 24px" }}><p className="text-[#d9c9b4]">เข้าสู่ระบบเพื่อบันทึกที่อยู่</p><Link href="/login?next=/profile/addresses" style={{ color: GOLD }}>เข้าสู่ระบบ</Link></div>;
  const inp = "h-[46px] rounded-xl bg-[#251d1b] px-3 text-[16px] text-[#f3ead9] outline-none placeholder:text-[#b5a596]";
  return (
    <div className="min-h-dvh pb-[110px]" style={{ background: "#171211" }}>
      <div className="flex items-center gap-[10px]" style={{ padding: 16 }}>
        <Link href="/profile" aria-label="ย้อนกลับ" className="w-[42px] h-[42px] rounded-full bg-[#211a18] grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
        <h1 className="m-0 font-medium text-[17px]">ที่อยู่ของฉัน</h1>
      </div>
      <div className="flex flex-col gap-2.5" style={{ padding: "0 16px" }}>
        {list === null && <p className="text-[#b5a596] text-[14px]">กำลังโหลด…</p>}
        {list?.map((a) => (
          <div key={a.id} className="flex gap-3 items-center rounded-2xl bg-[#211a18]" style={{ padding: 14, border: `1px solid ${a.primary ? GOLD : LN}` }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a.primary ? GOLD : "#d9c9b4"} strokeWidth="1.8" aria-hidden="true" className="shrink-0"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /></svg>
            <div className="flex-1 min-w-0"><b className="font-medium">{a.label}{a.primary && <span className="text-[12px] font-light" style={{ color: GOLD }}> · หลัก</span>}</b><div className="text-[12px] font-light text-[#d9c9b4] truncate">{a.detail}{a.note ? ` · ${a.note}` : ""}</div></div>
            <div className="flex flex-col items-end gap-1 text-[12.5px] font-light shrink-0">
              <button type="button" onClick={() => { setEdit(a.id); setF({ label: a.label, detail: a.detail, note: a.note }); }} className="text-[#d9c9b4]">แก้ไข</button>
              {!a.primary && <button type="button" disabled={busy} onClick={() => save(list.map((x) => ({ ...x, primary: x.id === a.id })), "ตั้งเป็นที่อยู่หลักแล้ว")} style={{ color: GOLD }}>ตั้งเป็นหลัก</button>}
              <button type="button" disabled={busy} onClick={() => save(list.filter((x) => x.id !== a.id), "ลบที่อยู่แล้ว")} className="text-[#ff8a9a]">ลบ</button>
            </div>
          </div>
        ))}
        {list && !list.length && <p className="m-0 text-[13px] font-light text-[#b5a596]">ยังไม่มีที่อยู่ · บันทึกไว้แล้วเลือกได้ทันทีในหน้าจอง</p>}
        <div className="flex flex-col gap-2 pt-2">
          <b className="font-medium text-[15px]">{edit ? "แก้ไขที่อยู่" : "เพิ่มที่อยู่ใหม่"}</b>
          <input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} maxLength={40} placeholder="ชื่อสถานที่ เช่น คอนโด, ออฟฟิศ" aria-label="ชื่อสถานที่" className={inp} />
          <input value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} maxLength={200} placeholder="รายละเอียด เช่น สุขุมวิท 21 อโศก" aria-label="รายละเอียดที่อยู่" className={inp} />
          <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={120} placeholder="หมายเหตุ เช่น ตึก B กดกริ่ง 12" aria-label="หมายเหตุ" className={inp} />
          {edit && <button type="button" onClick={() => { setEdit(null); setF(blank); }} className="self-start text-[13px] text-[#d9c9b4]">ยกเลิกการแก้ไข</button>}
          {msg && <p role="status" className="m-0 text-[13px]" style={{ color: msg.ok ? "#5fd08f" : "#ff8a9a" }}>{msg.text}</p>}
        </div>
      </div>
      <button type="button" onClick={submit} disabled={busy || !f.label.trim() || !f.detail.trim()} className="fixed left-4 right-4 mx-auto max-w-[448px] h-[54px] rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[16px] disabled:opacity-45 z-40" style={{ bottom: "calc(24px + env(safe-area-inset-bottom))" }}>{busy ? "กำลังบันทึก…" : edit ? "บันทึกการแก้ไข" : "บันทึกที่อยู่ใหม่"}</button>
    </div>
  );
}
