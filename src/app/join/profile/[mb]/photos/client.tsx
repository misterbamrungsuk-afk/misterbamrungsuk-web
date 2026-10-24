"use client";
/* eslint-disable @next/next/no-img-element */

// รูปโปรไฟล์ — ถอดตามบอร์ด ProviderPhotos: 9 ช่อง 3:4 · รูปแรก = รูปหลัก · แตะรูปเพื่อตั้งเป็นรูปหลัก · × ลบ · + เพิ่ม
// บันทึกทันทีทุกครั้งที่เพิ่ม/ลบ/ตั้งรูปหลัก (/api/join/photos)
import { useState } from "react";
import Link from "next/link";
import { resizeImage, dataUrlToFile } from "@/lib/join/form";

type Box = { x: number; y: number; r: number };
const DEF: Box = { x: 50, y: 28, r: 24 };
/** วงเบลอบนรูป (พรีวิว) — ตำแหน่ง % · ry = 1.2r ของความกว้าง (ตรงกับที่เซิร์ฟเวอร์เบลอ) · ratio = กว้าง/สูงของกรอบ */
const BlurSpot = ({ b, ratio }: { b: Box; ratio: number }) => (
  <span aria-hidden="true" className="absolute pointer-events-none rounded-[50%]" style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.r * 2}%`, height: `${b.r * 2.4 * ratio}%`, transform: "translate(-50%, -50%)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", boxShadow: "0 0 0 2px rgba(232,196,114,.85)" }} />
);

export function PhotosClient({ mb, t, initial, disclose: disclose0 = null, boxes: boxes0 = {} }: { mb: string; t: string; initial: string[]; disclose?: "yes" | "no" | null; boxes?: Record<string, Box> }) {
  const [photos, setPhotos] = useState<string[]>(initial);
  const [disclose, setDisclose] = useState(disclose0);
  const [boxes, setBoxes] = useState<Record<string, Box>>(boxes0);
  const [askNo, setAskNo] = useState(false);
  const [ack, setAck] = useState(false);
  const [edit, setEdit] = useState<{ i: number; b: Box; ratio: number } | null>(null);
  const blur = disclose === "no";
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  const url = (p: string) => `/api/join/file?mb=${mb}&path=${encodeURIComponent(p)}${t ? `&t=${encodeURIComponent(t)}` : ""}`;

  const call = async (body: FormData | { action: string; index: number }) => {
    setBusy(true); setErr(""); setSaved(false);
    const res = await fetch("/api/join/photos", body instanceof FormData ? { method: "POST", body } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t, ...body }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { ok?: boolean; photos?: string[]; error?: string } | null;
    setBusy(false);
    if (res?.ok && data?.photos) { setPhotos(data.photos); setSaved(true); } else setErr(data?.error ?? "บันทึกไม่สำเร็จ กรุณาลองใหม่");
  };
  const setDisc = async (value: "yes" | "no") => {
    setBusy(true); setErr(""); setSaved(false);
    const res = await fetch("/api/join/photos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t, action: "disclose", value, ack: value === "no" && ack }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    setBusy(false);
    if (data?.ok) { setDisclose(value); setAskNo(false); setSaved(true); } else setErr(data?.error ?? "บันทึกไม่สำเร็จ");
  };
  const saveBox = async () => {
    if (!edit) return;
    setBusy(true); setErr(""); setSaved(false);
    const res = await fetch("/api/join/photos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t, action: "blur", index: edit.i, box: edit.b }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { ok?: boolean; error?: string; face_blur?: Record<string, Box> } | null;
    setBusy(false);
    if (data?.ok && data.face_blur) { setBoxes(data.face_blur); setEdit(null); setSaved(true); } else setErr(data?.error ?? "บันทึกไม่สำเร็จ");
  };
  const moveTo = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!edit) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10, y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
    setEdit({ ...edit, b: { ...edit.b, x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) } });
  };
  const add = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErr("รับเฉพาะไฟล์รูปภาพ");
    const fd = new FormData();
    fd.set("mb", mb); if (t) fd.set("t", t);
    try { fd.set("file", await dataUrlToFile(await resizeImage(f, 1400, 0.85), "profile.jpg")); } catch (e) { return setErr((e instanceof Error ? e.message : "ไฟล์นี้เปิดเป็นรูปไม่ได้ · เลือกรูป JPG/PNG อีกครั้ง")); }
    await call(fd);
  };

  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9", lineHeight: 1.7 }}>
      <div className="mx-auto w-full max-w-[720px] pb-10">
        <div className="flex items-center gap-2" style={{ padding: "12px 14px 0" }}>
          <Link href={`/join/profile/${mb}${q}`} aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full bg-[#251d1b] text-[#e8c472] grid place-items-center hover:text-[#e8c472]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <div className="flex-1 font-semibold text-[17px] text-[#e8c472]">รูปโปรไฟล์</div>
          <span className="text-[14px] text-[#e8c472]">{photos.length}/9</span>
        </div>
        <div className="flex flex-col" style={{ padding: "16px 16px 0", gap: 18 }}>
          <p className="m-0 text-[15px]">ใส่ได้สูงสุด 9 รูป · รูปแรกคือรูปหลักที่ลูกค้าเห็นก่อน · แตะรูปเพื่อตั้งเป็นรูปหลัก</p>
          <div className="grid grid-cols-3 gap-2" aria-busy={busy}>
            {Array.from({ length: 9 }, (_, i) => {
              const p = photos[i];
              return (
                <div key={i} className="relative rounded-[14px] overflow-hidden bg-[#251d1b]" style={{ aspectRatio: "3 / 4" }}>
                  {p ? (
                    <>
                      <button type="button" onClick={() => i > 0 && call({ action: "main", index: i })} aria-label={i === 0 ? "รูปหลัก" : `ตั้งรูปที่ ${i + 1} เป็นรูปหลัก`} className="absolute inset-0 p-0 bg-transparent"><img src={url(p)} alt="" className="w-full h-full object-cover block" /></button>
                      {blur && <BlurSpot b={boxes[p] ?? DEF} ratio={3 / 4} />}
                      {blur && <button type="button" data-edit-blur={i} onClick={() => setEdit({ i, b: boxes[p] ?? DEF, ratio: 3 / 4 })} aria-label={`ปรับจุดเบลอรูปที่ ${i + 1}`} className="absolute left-1 bottom-1 h-9 px-2.5 rounded-full text-[12px] font-semibold text-[#1b130b]" style={{ background: "#e8c472" }}>ปรับเบลอ</button>}
                      <span className="absolute left-1.5 top-1.5 min-w-[22px] h-[22px] px-[7px] rounded-full text-[12px] font-bold grid place-items-center" style={{ background: i === 0 ? "#e8c472" : "rgba(23,18,17,0.8)", color: i === 0 ? "#1b130b" : "#f3ead9" }}>{i === 0 ? "รูปหลัก" : i + 1}</span>
                      <button type="button" onClick={() => call({ action: "remove", index: i })} aria-label="ลบรูป" className="absolute right-1 bottom-1 w-10 h-10 rounded-full text-[#f3ead9] text-[18px] leading-none grid place-items-center" style={{ background: "rgba(23,18,17,0.85)" }}>×</button>
                    </>
                  ) : (
                    <label aria-label="เพิ่มรูป" className="absolute inset-0 grid place-items-center cursor-pointer" style={{ opacity: i === photos.length ? 1 : 0.5 }}>
                      <span className="w-9 h-9 rounded-full bg-[#e8c472] text-[#1b130b] text-[24px] font-semibold grid place-items-center leading-none">+</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e) => add(e.target.files?.[0])} />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          {/* การเปิดเผยใบหน้า (บอสสั่ง 24 ต.ค. 2569) */}
          <div data-disclose-panel className="flex flex-col gap-2 rounded-2xl bg-[#211a18]" style={{ padding: 14 }}>
            <span className="font-semibold text-[15px]">การเปิดเผยใบหน้า</span>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} aria-pressed={disclose !== "no"} onClick={() => disclose === "no" && setDisc("yes")} className="min-h-11 rounded-xl text-[14px] font-semibold" style={{ background: disclose !== "no" ? "#e8c472" : "#251d1b", color: disclose !== "no" ? "#1b130b" : "#f3ead9" }}>ยอมรับเปิดเผยข้อมูล</button>
              <button type="button" disabled={busy} aria-pressed={blur} onClick={() => !blur && setAskNo(true)} className="min-h-11 rounded-xl text-[14px] font-semibold" style={{ background: blur ? "#e8c472" : "#251d1b", color: blur ? "#1b130b" : "#f3ead9" }}>ไม่สามารถเปิดเผย (เบลอหน้า)</button>
            </div>
            {askNo && !blur && <div className="flex flex-col gap-2">
              <p className="m-0 text-[13.5px] leading-[1.6] text-[#f6c38e]">การเบลอใบหน้าจะมีผลต่อจำนวนงานที่จะเข้ามา เพราะลูกค้ามักเลือกจากรูปที่เห็นหน้าชัด</p>
              <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 w-5 h-5 shrink-0 accent-[#e8c472]" /><span className="text-[14px]">รับทราบว่าการเบลอหน้าจะมีผลต่อจำนวนงานที่จะเข้ามา</span></label>
              <button type="button" disabled={busy || !ack} onClick={() => setDisc("no")} className="min-h-11 rounded-xl font-semibold text-[#1b130b] bg-[#e8c472] disabled:opacity-40">ยืนยันเบลอหน้า</button>
            </div>}
            {blur && <span className="text-[13px] text-[#d9c9b4]">ลูกค้าเห็นรูปที่เบลอวงกลมตามกรอบ · กด &quot;ปรับเบลอ&quot; ที่รูปเพื่อเลื่อนวงให้ตรงใบหน้า</span>}
          </div>
          {edit && photos[edit.i] && (
            <div role="dialog" aria-label="ปรับจุดเบลอ" data-blur-editor className="flex flex-col gap-2 rounded-2xl bg-[#211a18]" style={{ padding: 14, border: "1.5px solid #e8c472" }}>
              <span className="font-semibold text-[15px]">ปรับจุดเบลอ · รูปที่ {edit.i + 1}</span>
              <span className="text-[13px] text-[#d9c9b4]">แตะหรือลากบนรูปเพื่อย้ายวงเบลอไปที่ใบหน้า · เลื่อนแถบเพื่อปรับขนาด</span>
              <div className="relative w-full select-none touch-none" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); moveTo(e); }} onPointerMove={(e) => e.buttons && moveTo(e)}>
                <img src={url(photos[edit.i])} alt="" draggable={false} className="w-full h-auto block rounded-xl" onLoad={(e) => { const im = e.currentTarget; if (im.naturalHeight) setEdit((v) => (v ? { ...v, ratio: im.naturalWidth / im.naturalHeight } : v)); }} />
                <BlurSpot b={edit.b} ratio={edit.ratio} />
              </div>
              <label className="flex items-center gap-3 text-[13px]">ขนาด<input type="range" min={8} max={60} value={edit.b.r} onChange={(e) => setEdit({ ...edit, b: { ...edit.b, r: Number(e.target.value) } })} className="flex-1 accent-[#e8c472]" /></label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEdit(null)} className="min-h-11 rounded-xl text-[14px] text-[#e8c472]" style={{ border: "1px solid rgba(232,196,114,.5)" }}>ยกเลิก</button>
                <button type="button" data-save-blur disabled={busy} onClick={saveBox} className="min-h-11 rounded-xl font-semibold text-[#1b130b] bg-[#e8c472] disabled:opacity-40">บันทึกจุดเบลอ</button>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5 rounded-2xl text-[14px] bg-[#2c1a1f]" style={{ padding: 14 }}>
            <span className="font-semibold text-[15px]">เคล็ดลับให้ Profile โดดเด่น</span>
            <span>• รูปแรกเห็นหน้าชัด ยิ้ม แสงธรรมชาติ</span>
            <span>• มีรูปเต็มตัวอย่างน้อย 1 รูป</span>
            <span>• รูปทำกิจกรรมที่รับ เช่น คาเฟ่ ท่องเที่ยว</span>
          </div>
          {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}</p>}
          {/* ทุกการเพิ่ม/ลบ/ตั้งรูปหลักบันทึกทันทีอยู่แล้ว → ไม่มีปุ่ม "บันทึก" หลอก แค่บอกสถานะ + ปุ่มกลับ */}
          <p role="status" className="m-0 text-[13px] font-light text-center" style={{ color: busy ? "#e8c472" : saved ? "#7fd6a3" : "#b5a596" }}>{busy ? "กำลังอัปโหลด…" : saved ? "✓ บันทึกแล้ว · ทีมงานจะตรวจรูปให้" : "บันทึกอัตโนมัติทุกครั้งที่เพิ่ม ลบ หรือตั้งรูปหลัก"}</p>
          <Link href={`/join/profile/${mb}${q}`} className="h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold grid place-items-center hover:text-[#1b130b]">เสร็จแล้ว · กลับไปโปรไฟล์</Link>
        </div>
      </div>
    </div>
  );
}
