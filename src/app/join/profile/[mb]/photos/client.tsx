"use client";
/* eslint-disable @next/next/no-img-element */

// รูปโปรไฟล์ — ถอดตามบอร์ด ProviderPhotos: 9 ช่อง 3:4 · รูปแรก = รูปหลัก · แตะรูปเพื่อตั้งเป็นรูปหลัก · × ลบ · + เพิ่ม
// บันทึกทันทีทุกครั้งที่เพิ่ม/ลบ/ตั้งรูปหลัก (/api/join/photos)
import { useState } from "react";
import Link from "next/link";
import { resizeImage, dataUrlToFile } from "@/lib/join/form";

export function PhotosClient({ mb, t, initial }: { mb: string; t: string; initial: string[] }) {
  const [photos, setPhotos] = useState<string[]>(initial);
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
    if (res?.ok && data?.photos) setPhotos(data.photos); else setErr(data?.error ?? "บันทึกไม่สำเร็จ กรุณาลองใหม่");
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
                      <span className="absolute left-1.5 top-1.5 min-w-[22px] h-[22px] px-[7px] rounded-full text-[12px] font-bold grid place-items-center" style={{ background: i === 0 ? "#e8c472" : "rgba(23,18,17,0.8)", color: i === 0 ? "#1b130b" : "#f3ead9" }}>{i === 0 ? "รูปหลัก" : i + 1}</span>
                      <button type="button" onClick={() => call({ action: "remove", index: i })} aria-label="ลบรูป" className="absolute right-1 bottom-1 w-8 h-8 rounded-full text-[#f3ead9] text-[18px] leading-none grid place-items-center" style={{ background: "rgba(23,18,17,0.85)" }}>×</button>
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
          <div className="flex flex-col gap-1.5 rounded-2xl text-[14px] bg-[#2c1a1f]" style={{ padding: 14 }}>
            <span className="font-semibold text-[15px]">เคล็ดลับให้ Profile โดดเด่น</span>
            <span>• รูปแรกเห็นหน้าชัด ยิ้ม แสงธรรมชาติ</span>
            <span>• มีรูปเต็มตัวอย่างน้อย 1 รูป</span>
            <span>• รูปทำกิจกรรมที่รับ เช่น คาเฟ่ ท่องเที่ยว</span>
          </div>
          {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}</p>}
          <button type="button" onClick={() => setSaved(true)} disabled={busy || !photos.length} className="h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold w-full" style={{ opacity: busy || !photos.length ? 0.45 : 1 }}>{busy ? "กำลังอัปโหลด…" : saved ? "บันทึกแล้ว · ทีมงานจะตรวจรูปให้" : "บันทึกรูป"}</button>
          <Link href={`/join/profile/${mb}${q}`} className="h-12 rounded-[14px] text-[#e8c472] text-[14px] font-semibold grid place-items-center hover:text-[#e8c472]" style={{ background: "rgba(232,196,114,0.16)" }}>กลับไปโปรไฟล์</Link>
        </div>
      </div>
    </div>
  );
}
