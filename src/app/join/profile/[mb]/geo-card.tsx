"use client";

import { useState } from "react";
import { PinPicker } from "@/components/pin-picker";
import type { LatLng } from "@/lib/geo";

// "ฉันอยู่แถวไหน" — ย่านที่แสดงบนแผนที่ให้ลูกค้าเห็น (ไม่ใช่ตำแหน่งจริง: ระบบปัดเป็นช่อง ~1 กม.) · เปลี่ยนได้ตลอด
type Geo = { lat: number; lng: number; label: string; src: string; at: string } | null;
const GOLD = "#e8c472", LN = "rgba(243,234,217,.12)";

export function PtGeoCard({ mb, t, init, fallback }: { mb: string; t: string | null; init: Geo; fallback: string }) {
  const [geo, setGeo] = useState<Geo>(init);
  const [pin, setPin] = useState<{ p: LatLng; acc?: number } | null>(null);
  const [edit, setEdit] = useState(!init);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const send = async (fill: Record<string, string>) => {
    const fd = new FormData(); fd.set("mb", mb); if (t) fd.set("t", t); fd.set("step", "geo");
    for (const [k, v] of Object.entries(fill)) fd.set(k, v);
    setBusy(true); setMsg(null);
    const r = await fetch("/api/join/profile", { method: "POST", body: fd }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (d?.ok) { setGeo(d.geo); setEdit(false); setPin(null); setMsg({ ok: true, t: d.geo ? `บันทึกแล้ว · ลูกค้าจะเห็นคุณ "แถว${d.geo.label}"` : `กลับไปใช้ย่านตอนสมัคร (${fallback})` }); }
    else setMsg({ ok: false, t: d?.error || "บันทึกไม่สำเร็จ" });
  };
  return (
    <section className="rounded-[20px] bg-[#211a18] flex flex-col gap-2.5" style={{ padding: 16, border: `1px solid ${LN}` }}>
      <b className="text-[16px] font-semibold">ฉันอยู่แถวไหน (แสดงบนแผนที่)</b>
      <p className="m-0 text-[13px] font-light text-[#d9c9b4]">ลูกค้าเห็นแค่ย่านโดยประมาณ (ระบบปัดเป็นช่องประมาณ 1 กม.) ไม่เห็นตำแหน่งจริงของคุณ · ตำแหน่งจริงจะเห็นเฉพาะตอนคุณกด &quot;เริ่มเดินทาง&quot; ไปหาลูกค้าที่จ่ายเงินแล้ว</p>
      <p className="m-0 text-[14px]">ตอนนี้: <b style={{ color: GOLD }}>{geo ? `แถว${geo.label}` : fallback}</b>{geo && <span className="text-[12px] font-light text-[#b5a596]"> · ตั้งเมื่อ {new Date(geo.at).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span>}</p>
      {edit ? (
        <>
          <PinPicker value={geo ? { lat: geo.lat, lng: geo.lng } : null} onChange={(p, acc) => setPin({ p, acc })} height={210} zoom={14} hint="กด 'ใช้ตำแหน่งฉัน' หรือเลื่อนแผนที่ให้หมุดอยู่แถวที่คุณรับงาน" />
          <div className="flex gap-2">
            <button type="button" disabled={busy || !pin} onClick={() => pin && send({ lat: String(pin.p.lat), lng: String(pin.p.lng), src: pin.acc != null ? "gps" : "pin", ...(pin.acc != null ? { accuracy: String(Math.round(pin.acc)) } : {}) })} className="flex-1 h-11 rounded-xl bg-[#e8c472] text-[#1b130b] font-semibold disabled:opacity-40">{busy ? "กำลังบันทึก…" : "บันทึกย่านนี้"}</button>
            {geo && <button type="button" onClick={() => { setEdit(false); setPin(null); }} className="h-11 px-4 rounded-xl text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}>ยกเลิก</button>}
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={() => setEdit(true)} className="flex-1 h-11 rounded-xl font-semibold" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>เปลี่ยนย่าน</button>
          {geo && <button type="button" disabled={busy} onClick={() => send({ clear: "1" })} className="h-11 px-3 rounded-xl text-[13px] text-[#d9c9b4]" style={{ border: `1px solid ${LN}` }}>ใช้ย่านตอนสมัคร</button>}
        </div>
      )}
      {msg && <p role="status" className="m-0 text-[13px]" style={{ color: msg.ok ? "#7fd6a3" : "#ff8a9a" }}>{msg.t}</p>}
    </section>
  );
}
