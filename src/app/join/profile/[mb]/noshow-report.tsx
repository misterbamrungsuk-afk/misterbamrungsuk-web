"use client";

// ปุ่ม "ลูกค้าไม่มา" ในรายการงานของ Part-Time — แจ้งได้หลังกด "ถึงจุดนัด" และรอครบ 15 นาที (กติกาใน lib/noshow-rules)
// GPS ตอนมาถึงดึงจากที่บันทึกบนเซิร์ฟเวอร์ (ไม่เชื่อค่าจากเครื่อง) · แนบรูปจุดนัด + ข้อความได้ · ลูกค้าส่งหลักฐานโต้แย้งได้
import { useCallback, useEffect, useState } from "react";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
type NS = { can: boolean; reason: string; at: string | null; counter: boolean; claim: { status: string; mine: boolean; other: boolean } | null };

export function NoShowReport({ mb, t, id, onDone }: { mb: string; t: string; id: string; onDone?: () => void }) {
  const [ns, setNs] = useState<NS | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const load = useCallback(() => {
    fetch(`/api/noshow?booking=${id}&mb=${encodeURIComponent(mb)}${t ? `&t=${encodeURIComponent(t)}` : ""}`, { cache: "no-store" })
      .then((r) => r.json()).then((d) => d?.ok && setNs(d)).catch(() => {});
  }, [id, mb, t]);
  // เช็กซ้ำทุกนาที — ปุ่มเปิดเองเมื่อครบเวลารอ
  useEffect(() => { load(); const i = setInterval(load, 60_000); return () => clearInterval(i); }, [load]);
  if (!ns || (!ns.can && !ns.at && !ns.claim)) return null;

  const send = async () => {
    setBusy(true); setMsg("");
    const fd = new FormData();
    fd.set("booking", id); fd.set("mb", mb); if (t) fd.set("t", t); fd.set("note", note);
    if (photo) fd.set("photo", photo);
    const r = await fetch("/api/noshow", { method: "POST", body: fd }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (!d?.ok) return setMsg(d?.error || "ส่งไม่สำเร็จ");
    setOpen(false); setMsg("ส่งเรื่องแล้ว · ทีมงานตัดสินภายใน 24 ชม. (เงินพักไว้)"); load(); onDone?.();
  };

  if (!ns.can) return <p className="m-0 text-[12.5px] font-light text-[#b5a596]">{msg || ns.reason}</p>;
  return (
    <div className="flex flex-col gap-2">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="h-11 rounded-xl text-[13px] font-semibold" style={{ background: "rgba(201,40,61,.16)", color: "#ff8a9a" }}>{ns.counter ? "ลูกค้าแจ้งว่าคุณไม่มา · ส่งหลักฐาน" : "ลูกค้าไม่มาตามนัด · แจ้งทีมงาน"}</button>
      ) : (
        <div role="dialog" aria-label="แจ้งลูกค้าไม่มาตามนัด" className="rounded-[14px] flex flex-col gap-2" style={{ padding: 12, background: "#251d1b", border: "1px solid rgba(255,138,154,.4)" }}>
          <span className="text-[13px] font-light text-[#d9c9b4] leading-[1.55]">ทีมงานใช้ GPS ตอนคุณกด “ถึงจุดนัด” + แชทในแอปเป็นหลักฐาน · ถ้ายืนยันว่าลูกค้าไม่มา คุณได้ส่วนแบ่งตามกติกา</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="เช่น รอหน้าร้าน 20 นาที ทักแชทแล้วไม่ตอบ" aria-label="รายละเอียด" className="rounded-xl bg-[#211a18] p-3 text-[15px] text-[#f3ead9] outline-none resize-none placeholder:text-[#b5a596]" />
          <label className="min-h-11 rounded-xl text-[13px] px-3 flex items-center cursor-pointer" style={{ border: `1px solid ${photo ? GOLD : LN}`, color: photo ? GOLD : "#f3ead9" }}>
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            {photo ? "✓ แนบรูปแล้ว" : "📷 ถ่ายรูปจุดนัด (แนะนำ)"}
          </label>
          {msg && <p role="alert" className="m-0 text-[12.5px] text-[#ff8a9a]">{msg}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-xl text-[13px]" style={{ border: `1px solid ${LN}` }}>กลับ</button>
            <button type="button" disabled={busy} onClick={send} className="h-11 rounded-xl text-[13px] font-semibold text-white disabled:opacity-50" style={{ background: "#a3283c" }}>{busy ? "กำลังส่ง…" : "ส่งเรื่อง"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
