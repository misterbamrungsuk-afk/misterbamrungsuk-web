"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MAX = 1000;

// ยื่นอุทธรณ์ใบเตือน 1 ใบ: เหตุผล (≤1000 ตัวอักษร) + รูปหลักฐาน (ไม่บังคับ) · ยืนยันในหน้าก่อนส่ง · ส่งแล้วแก้ไม่ได้
export function AppealForm({ mb, t, strikeId }: { mb: string; t: string; strikeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const text = reason.trim();

  const send = async () => {
    setBusy(true); setErr("");
    const fd = new FormData();
    fd.set("mb", mb); fd.set("t", t); fd.set("strike_id", strikeId); fd.set("reason", text);
    if (photo) fd.set("photo", photo);
    const r = await fetch("/api/pt/appeals", { method: "POST", body: fd }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setBusy(false); setSure(false);
    if (j?.ok) { setOpen(false); router.refresh(); } else setErr(r?.status === 403 ? "ลิงก์หมดอายุ · เข้าโปรไฟล์ใหม่อีกครั้ง" : j?.error || "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง");
  };

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="self-start mt-1 min-h-10 rounded-full text-[14px] font-semibold text-[#e8c472]" style={{ padding: "0 16px", border: "1px solid rgba(232,196,114,.6)" }}>ยื่นอุทธรณ์</button>;
  return (
    <div className="flex flex-col gap-2 mt-1.5">
      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-[#d9c9b4]">เหตุผลที่ขออุทธรณ์</span>
        <textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, MAX))} rows={4} maxLength={MAX} placeholder="เล่าสิ่งที่เกิดขึ้น เช่น ถึงจุดนัดตรงเวลา ทักแชทแล้วลูกค้าไม่ตอบ" className="rounded-[14px] bg-[#171211] text-[14px] p-3 text-[#f3ead9]" style={{ border: "1px solid rgba(243,234,217,0.14)" }} />
        <span className="text-[12px] font-light text-[#b5a596] self-end">{reason.length}/{MAX}</span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-[#d9c9b4]">รูปหลักฐาน (ไม่บังคับ · JPG/PNG/WebP ไม่เกิน 8 MB)</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="text-[13px] text-[#d9c9b4]" />
      </label>
      {err && <p role="status" className="m-0 text-[13px] text-[#FF8A97]">{err}</p>}
      {sure ? (
        <div className="rounded-[14px] flex flex-col gap-2" style={{ padding: 12, border: "1px solid rgba(232,196,114,.6)" }}>
          <span className="text-[13.5px]">ส่งอุทธรณ์ใบนี้? ส่งได้ครั้งเดียว แก้ไขภายหลังไม่ได้</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setSure(false)} disabled={busy} className="min-h-11 rounded-full text-[14px] text-[#d9c9b4]" style={{ border: "1px solid rgba(243,234,217,0.14)" }}>กลับไปแก้</button>
            <button type="button" onClick={send} disabled={busy} className="min-h-11 rounded-full bg-[#e8c472] text-[#1b130b] text-[14px] font-semibold disabled:opacity-50">{busy ? "กำลังส่ง…" : "ยืนยันส่ง"}</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-full text-[14px] text-[#d9c9b4]" style={{ padding: "0 16px", border: "1px solid rgba(243,234,217,0.14)" }}>ยกเลิก</button>
          <button type="button" onClick={() => setSure(true)} disabled={!text} className="flex-1 min-h-11 rounded-full bg-[#e8c472] text-[#1b130b] text-[14px] font-semibold disabled:opacity-40">ส่งอุทธรณ์</button>
        </div>
      )}
    </div>
  );
}
