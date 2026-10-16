"use client";

// บอร์ด C-EditProfile "แก้ไขโปรไฟล์" — ชื่อที่แสดง · เบอร์ (แสดงอย่างเดียว · เพื่อนไม่เห็น) · อีเมล · ผู้ติดต่อฉุกเฉิน
import { useEffect, useState } from "react";
import Link from "next/link";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const inp = "h-12 w-full rounded-[14px] bg-[#211a18] px-[14px] text-[16px] text-[#f3ead9] outline-none placeholder:text-[#b5a596]";
const REL = ["พ่อ", "แม่", "พี่", "น้อง", "แฟน", "เพื่อน", "อื่น ๆ"];

export default function EditProfilePage() {
  const [f, setF] = useState({ name: "", phone: "", email: "", ecName: "", ecTel: "", ecRel: "เพื่อน" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  useEffect(() => {
    fetch("/api/me", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      if (!d?.ok) return;
      const p = d.profile;
      setF({ name: p.name ?? "", phone: p.phone ?? "", email: p.email ?? "", ecName: p.emergency?.name ?? "", ecTel: p.emergency?.tel ?? "", ecRel: p.emergency?.relation || "เพื่อน" });
    }).catch(() => {});
  }, []);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF({ ...f, [k]: e.target.value }); setMsg(null); };
  const save = async () => {
    setBusy(true);
    const body: Record<string, unknown> = { name: f.name };
    if (f.ecName || f.ecTel) body.emergency = { name: f.ecName, tel: f.ecTel, relation: f.ecRel };
    const r = await fetch("/api/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    setMsg(d?.ok ? { ok: true, t: "บันทึกแล้ว" } : { ok: false, t: d?.error || "บันทึกไม่สำเร็จ" });
  };
  return (
    <div className="min-h-dvh pb-[110px]">
      <div className="flex items-center gap-[10px]" style={{ padding: 16 }}>
        <Link href="/profile" aria-label="ย้อนกลับ" className="w-[42px] h-[42px] rounded-full grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
        <h1 className="m-0 font-semibold text-[19px]">แก้ไขโปรไฟล์</h1>
      </div>
      <div className="flex flex-col gap-[14px]" style={{ padding: "0 16px" }}>
        <div className="flex items-center gap-[14px]"><div className="w-[68px] h-[68px] rounded-full grid place-items-center text-[28px]" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>{(f.name || f.email || "?").slice(0, 1)}</div></div>
        <label className="flex flex-col gap-1.5"><span className="text-[13px] text-[#d9c9b4]">ชื่อที่แสดง</span><input value={f.name} onChange={set("name")} maxLength={60} className={inp} style={{ border: `1px solid ${LN}` }} /></label>
        <label className="flex flex-col gap-1.5"><span className="text-[13px] text-[#d9c9b4]">เบอร์โทร (เพื่อนจะไม่เห็นเบอร์คุณ)</span><input value={f.phone} readOnly className={`${inp} opacity-70`} style={{ border: `1px solid ${LN}` }} /></label>
        <label className="flex flex-col gap-1.5"><span className="text-[13px] text-[#d9c9b4]">อีเมล</span><input value={f.email} readOnly className={`${inp} opacity-70`} style={{ border: `1px solid ${LN}` }} /></label>
        <div className="flex flex-col gap-[10px] rounded-[18px]" style={{ marginTop: 6, padding: 16, border: "1px solid #c9283d", background: "rgba(224,36,60,.05)" }}>
          <div className="flex gap-2 items-center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF8A97" strokeWidth="1.8" aria-hidden="true"><path d="M12 3 2 20h20zM12 10v4M12 17h0" /></svg><b className="font-medium">ผู้ติดต่อฉุกเฉิน</b></div>
          <div className="text-[12px] font-light text-[#d9c9b4]">เมื่อคุณกด SOS ทีมงานจะติดต่อคนนี้พร้อมตำแหน่งของคุณ</div>
          <input value={f.ecName} onChange={set("ecName")} maxLength={60} placeholder="ชื่อผู้ติดต่อฉุกเฉิน" className={inp} style={{ border: `1px solid ${LN}`, background: "#251d1b" }} />
          <div className="flex gap-2">
            <input value={f.ecTel} onChange={set("ecTel")} inputMode="tel" maxLength={12} placeholder="เบอร์ผู้ติดต่อ" className={inp} style={{ border: `1px solid ${LN}`, background: "#251d1b", flex: 1.4 }} />
            <select value={f.ecRel} onChange={set("ecRel")} aria-label="ความสัมพันธ์" className={inp} style={{ border: `1px solid ${LN}`, background: "#251d1b", flex: 1 }}>{REL.map((r) => <option key={r}>{r}</option>)}</select>
          </div>
        </div>
        {msg && <p role="status" className="m-0 text-[13px]" style={{ color: msg.ok ? "#7fd6a3" : "#ff8a9a" }}>{msg.t}</p>}
      </div>
      <div className="fixed left-0 right-0 bottom-0 mx-auto max-w-[480px] z-40" style={{ padding: "12px 16px calc(96px + env(safe-area-inset-bottom))" }}>
        <button type="button" disabled={busy} onClick={save} className="w-full h-14 rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[17px] disabled:opacity-50">{busy ? "กำลังบันทึก…" : "บันทึก"}</button>
      </div>
    </div>
  );
}
