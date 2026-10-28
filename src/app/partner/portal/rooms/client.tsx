"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { dataUrlToFile, resizeImage } from "@/lib/join/form";
import { fileUrl } from "@/lib/partner/portal-types";

export type RoomDraft = { id?: string; name: string; price_baht: number; capacity: number; rooms: number; photos: string[]; description: string };
const blank = (): RoomDraft => ({ name: "", price_baht: 0, capacity: 2, rooms: 1, photos: [], description: "" });
const lab = "block text-xs text-ink-300 mb-1";

async function upload(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("รับเฉพาะไฟล์รูปภาพ");
  const small = await dataUrlToFile(await resizeImage(file, 1600, 0.85), "img.jpg");
  const fd = new FormData();
  fd.append("file", small);
  const res = await fetch("/api/partner/listing/image", { method: "POST", body: fd });
  const out = (await res.json().catch(() => ({}))) as { ok?: boolean; path?: string; error?: string };
  if (!out.ok || !out.path) throw new Error(out.error ?? "อัปโหลดไม่สำเร็จ");
  return out.path;
}

export function RoomsClient({ initial }: { initial: RoomDraft[] }) {
  const [rows, setRows] = useState<RoomDraft[]>(initial.length ? initial : [blank()]);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [askDel, setAskDel] = useState<number | null>(null);

  const set = (i: number, p: Partial<RoomDraft>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const num = (v: string) => +v.replace(/[^\d]/g, "") || 0;

  const addPhotos = async (i: number, files: FileList | null) => {
    if (!files?.length) return;
    setUp(i); setMsg(null);
    try {
      const paths: string[] = [];
      for (const f of Array.from(files).slice(0, 6 - rows[i].photos.length)) paths.push(await upload(f));
      set(i, { photos: [...rows[i].photos, ...paths] });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    setUp(null);
  };

  const save = async () => {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/partner/rooms", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rooms: rows.filter((r) => r.name.trim()) }) }).catch(() => null);
    const out = (await res?.json().catch(() => ({}))) as { ok?: boolean; error?: string; rooms?: { id: string; name: string; price_satang: number; capacity: number; rooms: number; photos: string[]; description: string | null }[] } | undefined;
    setBusy(false);
    if (!out?.ok || !out.rooms) return setMsg({ ok: false, text: out?.error ?? "บันทึกไม่สำเร็จ" });
    setRows(out.rooms.length ? out.rooms.map((t) => ({ id: t.id, name: t.name, price_baht: t.price_satang / 100, capacity: t.capacity, rooms: t.rooms, photos: t.photos, description: t.description ?? "" })) : [blank()]);
    setMsg({ ok: true, text: "บันทึกแล้ว · ลูกค้าเห็นห้องในหน้าโรงแรมของคุณ" });
  };

  return (
    <div className="mt-4 flex flex-col gap-3 pb-6">
      {rows.map((r, i) => (
        <section key={r.id ?? `new-${i}`} className="rounded-2xl border border-ink-600 bg-ink-800/60 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <b className="text-sm">ประเภทห้องที่ {i + 1}</b>
            {askDel === i ? (
              <span role="alertdialog" aria-label="ยืนยันนำห้องออก" className="flex items-center gap-2 text-xs">
                ปิดขายห้องนี้?
                <button type="button" onClick={() => setAskDel(null)} className="chip h-9 px-3">ไม่</button>
                <button type="button" onClick={() => { setRows((rs) => rs.filter((_, j) => j !== i)); setAskDel(null); }} className="chip chip-red h-9 px-3">ใช่ นำออก</button>
              </span>
            ) : (
              <button type="button" onClick={() => setAskDel(i)} className="text-xs text-crimson-300 min-h-10 px-2">นำออก</button>
            )}
          </div>
          <div><label className={lab} htmlFor={`rn${i}`}>ชื่อห้อง</label><input id={`rn${i}`} className="input-dark w-full" value={r.name} maxLength={80} placeholder="เช่น ห้อง Deluxe เตียงคู่" onChange={(e) => set(i, { name: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={lab} htmlFor={`rp${i}`}>ราคา/คืน (บาท)</label><input id={`rp${i}`} inputMode="numeric" className="input-dark w-full" value={r.price_baht || ""} onChange={(e) => set(i, { price_baht: num(e.target.value) })} /></div>
            <div><label className={lab} htmlFor={`rc${i}`}>พักได้ (คน/ห้อง)</label><input id={`rc${i}`} inputMode="numeric" className="input-dark w-full" value={r.capacity || ""} onChange={(e) => set(i, { capacity: num(e.target.value) })} /></div>
            <div><label className={lab} htmlFor={`rr${i}`}>จำนวนห้อง</label><input id={`rr${i}`} inputMode="numeric" className="input-dark w-full" value={r.rooms || ""} onChange={(e) => set(i, { rooms: num(e.target.value) })} /></div>
          </div>
          <div><label className={lab} htmlFor={`rd${i}`}>รายละเอียดสั้น ๆ</label><textarea id={`rd${i}`} rows={2} maxLength={300} className="input-dark w-full" value={r.description} placeholder="เช่น 32 ตร.ม. วิวเมือง อาหารเช้า 2 ท่าน" onChange={(e) => set(i, { description: e.target.value })} /></div>
          <div>
            <span className={lab}>รูปห้อง (ไม่เกิน 6 รูป)</span>
            <div className="flex flex-wrap gap-2">
              {r.photos.map((ph, k) => (
                <div key={ph} className="relative w-20 h-16 rounded-xl overflow-hidden border border-ink-600">
                  <img src={fileUrl(ph)} alt="" className="w-full h-full object-cover" />
                  <button type="button" aria-label="ลบรูป" onClick={() => set(i, { photos: r.photos.filter((_, j) => j !== k) })} className="absolute top-0.5 right-0.5 w-6 h-6 rounded-full bg-black/70 text-xs">✕</button>
                </div>
              ))}
              {r.photos.length < 6 && (
                <label className="w-20 h-16 rounded-xl border border-dashed border-ink-500 grid place-items-center text-xs text-ink-300 cursor-pointer">
                  {up === i ? "กำลังอัป…" : "+ เพิ่มรูป"}
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={up !== null} onChange={(e) => addPhotos(i, e.target.files)} />
                </label>
              )}
            </div>
          </div>
        </section>
      ))}
      {rows.length < 20 && <button type="button" onClick={() => setRows((rs) => [...rs, blank()])} className="btn-ghost min-h-12 rounded-full">+ เพิ่มประเภทห้อง</button>}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-300" : "text-crimson-300"}`}>{msg.text}</p>}
      <button type="button" disabled={busy || up !== null} onClick={save} className="btn-crimson min-h-12 rounded-full font-semibold">{busy ? "กำลังบันทึก…" : "บันทึกห้องพัก"}</button>
      <p className="text-xs text-[#9a8a85]">ห้องที่นำออกจะปิดขาย แต่การจองเดิมยังอยู่ · เงินค่าห้องเข้ากระเป๋าร้านหลังวันเช็กเอาต์และทีมงานอนุมัติ (หัก % แพลตฟอร์มตามสัญญา)</p>
    </div>
  );
}
