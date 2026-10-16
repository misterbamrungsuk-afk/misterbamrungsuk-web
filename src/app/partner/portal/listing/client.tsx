"use client";

import { useState } from "react";
import { dataUrlToFile, resizeImage } from "@/lib/join/form";
import { PARTNER_TYPES, baht } from "@/lib/partner/config";
import { AMENITIES, DAYS, DEFAULT_HOURS, fileUrl, type DayHours, type Listing, type ServiceItem } from "@/lib/partner/portal-types";

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

export function ListingClient({ initial, name, canPublish }: { initial: Listing; name: string; canPublish: boolean }) {
  const [l, setL] = useState<Listing>({ ...initial, hours: initial.hours?.length === 7 ? initial.hours : DEFAULT_HOURS });
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const [msg, setMsg] = useState("");
  const set = <K extends keyof Listing>(k: K, v: Listing[K]) => { setL((x) => ({ ...x, [k]: v })); setMsg(""); };
  const setDay = (i: number, patch: Partial<DayHours>) => set("hours", l.hours.map((h, j) => (j === i ? { ...h, ...patch } : h)));

  const onFiles = async (files: FileList | null, target: "cover" | "gallery") => {
    if (!files?.length) return;
    setUp(true);
    setMsg("");
    try {
      if (target === "cover") set("cover", await upload(files[0]));
      else {
        const paths: string[] = [];
        for (const f of Array.from(files).slice(0, 12 - l.gallery.length)) paths.push(await upload(f));
        setL((x) => ({ ...x, gallery: [...x.gallery, ...paths] }));
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setUp(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/partner/listing", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(l) }).catch(() => null);
    const out = (await res?.json().catch(() => ({}))) as { ok?: boolean; row?: Listing; error?: string; publishBlocked?: boolean } | undefined;
    setBusy(false);
    if (!out?.ok || !out.row) return setMsg(out?.error ?? "บันทึกไม่สำเร็จ");
    setL(out.row);
    setMsg(out.publishBlocked ? "บันทึกแล้ว · เปิดแสดงได้หลังทีมงานอนุมัติบัญชี" : "บันทึกแล้ว ✓");
  };

  const services: ServiceItem[] = l.services ?? [];
  const setSvc = (i: number, patch: Partial<ServiceItem>) => set("services", services.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const openDays = l.hours.filter((h) => h.open);
  const lab = "block text-sm text-ink-300 mb-1.5";

  return (
    <>
      {/* ตัวอย่างการ์ด (อัปเดตสด) */}
      <p className="text-xs text-[#9a8a85] mt-3">ลูกค้าจะเห็นการ์ดนี้ตอนเลือกสถานที่ให้บริการ</p>
      <div className="mt-2 rounded-3xl border border-gold-500/40 bg-ink-800 overflow-hidden">
        <div className="relative aspect-[16/9] bg-ink-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {l.cover ? <img src={fileUrl(l.cover)} alt="ภาพปก" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-[#9a8a85] text-sm">ยังไม่มีภาพปก</div>}
          <span className="absolute top-3 left-3 text-[11px] rounded-full bg-black/60 text-gold-300 px-2.5 py-1 border border-gold-500/50">พาร์ทเนอร์แนะนำ</span>
        </div>
        <div className="p-4">
          <p className="font-display text-lg font-semibold">{name}</p>
          <p className="text-xs text-ink-300 mt-0.5">{l.type ?? "—"} · {l.area || "—"} · {l.rooms} ห้อง</p>
          {l.amenities.length > 0 && <p className="text-xs text-[#9a8a85] mt-1 truncate">{l.amenities.join(" · ")}</p>}
          <p className="text-xs text-gold-400 mt-2">{openDays.length ? `เปิด ${openDays.length} วัน/สัปดาห์ · ${openDays[0].from}–${openDays[0].to}` : "ยังไม่ได้ตั้งเวลาเปิด"}</p>
        </div>
      </div>

      <div className="flex flex-col gap-5 mt-6">
        <div>
          <span className={lab}>ภาพปก</span>
          <label className="btn-ghost min-h-11 rounded-full inline-flex items-center px-5 cursor-pointer text-sm">
            {up ? "กำลังอัปโหลด…" : l.cover ? "เปลี่ยนภาพปก" : "เลือกภาพปก"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={up} onChange={(e) => onFiles(e.target.files, "cover")} />
          </label>
        </div>

        <div>
          <span className={lab}>แกลเลอรี ({l.gallery.length}/12)</span>
          <div className="grid grid-cols-4 gap-2">
            {l.gallery.map((g) => (
              <div key={g} className="relative aspect-square rounded-xl overflow-hidden bg-ink-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(g)} alt="" className="w-full h-full object-cover" />
                <button type="button" aria-label="ลบรูป" onClick={() => set("gallery", l.gallery.filter((x) => x !== g))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-xs">✕</button>
              </div>
            ))}
            {l.gallery.length < 12 && (
              <label className="aspect-square rounded-xl border border-dashed border-ink-500 grid place-items-center text-2xl text-[#9a8a85] cursor-pointer hover:border-gold-500">
                +
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={up} onChange={(e) => onFiles(e.target.files, "gallery")} />
              </label>
            )}
          </div>
        </div>

        <div>
          <span className={lab}>ประเภทธุรกิจ</span>
          <div className="flex flex-wrap gap-2">
            {PARTNER_TYPES.map((t) => <button key={t} type="button" onClick={() => set("type", t)} className={`chip h-9 px-3.5 ${l.type === t ? "chip-gold" : ""}`}>{t}</button>)}
          </div>
        </div>

        <div><label className={lab} htmlFor="area">ย่าน / ที่ตั้ง</label><input id="area" className="input-dark w-full" value={l.area ?? ""} onChange={(e) => set("area", e.target.value)} /></div>
        <div><label className={lab} htmlFor="desc">คำอธิบายร้าน</label><textarea id="desc" rows={4} className="input-dark w-full" value={l.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>

        <div id="hours" className="scroll-mt-20">
          <span className={lab}>เวลาเปิด-ปิด</span>
          <div className="space-y-2">
            {l.hours.map((h, i) => (
              <div key={h.day} className="flex items-center gap-2 text-sm">
                <label className="flex items-center gap-2 w-16 shrink-0"><input type="checkbox" checked={h.open} onChange={(e) => setDay(i, { open: e.target.checked })} className="accent-[#d4af37] w-4 h-4" />{DAYS[h.day]}</label>
                {h.open ? (
                  <>
                    <input type="time" className="input-dark !py-1.5 flex-1 min-w-0" value={h.from} onChange={(e) => setDay(i, { from: e.target.value })} aria-label={`${DAYS[h.day]} เปิด`} />
                    <span className="text-[#9a8a85]">–</span>
                    <input type="time" className="input-dark !py-1.5 flex-1 min-w-0" value={h.to} onChange={(e) => setDay(i, { to: e.target.value })} aria-label={`${DAYS[h.day]} ปิด`} />
                  </>
                ) : <span className="text-[#9a8a85]">ปิด</span>}
              </div>
            ))}
          </div>
        </div>

        <div>
          <span className={lab}>จำนวนห้องบริการ</span>
          <div className="flex items-center gap-4">
            <button type="button" aria-label="ลดห้อง" onClick={() => set("rooms", Math.max(0, l.rooms - 1))} className="w-10 h-10 rounded-full border border-ink-600 text-xl">−</button>
            <span className="font-display text-2xl w-8 text-center">{l.rooms}</span>
            <button type="button" aria-label="เพิ่มห้อง" onClick={() => set("rooms", Math.min(200, l.rooms + 1))} className="w-10 h-10 rounded-full border border-ink-600 text-xl">+</button>
          </div>
        </div>

        <div>
          <span className={lab}>รายการบริการ · ราคาสปา → ราคาบนแพลตฟอร์ม</span>
          <p className="text-xs text-[#9a8a85] mb-2">กรอกชื่อบริการ เวลา และราคาฐานของสปา · ราคาขายบนแพลตฟอร์ม (mark up) ทีมงานเป็นผู้กำหนด — ตอนนี้ [รอกำหนด]</p>
          <div className="space-y-2">
            {services.map((x, i) => (
              <div key={i} className="rounded-2xl border border-ink-600 p-3 space-y-2">
                <div className="flex gap-2">
                  <input className="input-dark flex-1 min-w-0" placeholder="ชื่อบริการ เช่น นวดไทย" value={x.name} onChange={(e) => setSvc(i, { name: e.target.value })} aria-label="ชื่อบริการ" />
                  <button type="button" aria-label="ลบบริการ" onClick={() => set("services", services.filter((_, j) => j !== i))} className="w-10 shrink-0 rounded-full border border-ink-600">✕</button>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <input className="input-dark w-20" inputMode="numeric" value={x.minutes || ""} placeholder="นาที" onChange={(e) => setSvc(i, { minutes: +e.target.value.replace(/D/g, "") || 0 })} aria-label="เวลา (นาที)" />
                  <span className="text-[#9a8a85]">นาที · ฿</span>
                  <input className="input-dark w-24" inputMode="numeric" value={x.base_price || ""} placeholder="ราคาสปา" onChange={(e) => setSvc(i, { base_price: +e.target.value.replace(/D/g, "") || 0 })} aria-label="ราคาฐานของสปา" />
                  <span className="text-[#9a8a85]">→</span>
                  <span className="text-gold-300 whitespace-nowrap">{x.platform_price != null ? `฿${baht(x.platform_price)}` : "[รอกำหนด]"}</span>
                </div>
              </div>
            ))}
            {services.length < 30 && (
              <button type="button" onClick={() => set("services", [...services, { name: "", minutes: 60, base_price: 0, platform_price: null }])} className="btn-ghost min-h-10 rounded-full px-4 text-sm">+ เพิ่มบริการ</button>
            )}
          </div>
        </div>

        <div>
          <span className={lab}>สิ่งอำนวยความสะดวก</span>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => {
              const on = l.amenities.includes(a);
              return <button key={a} type="button" aria-pressed={on} onClick={() => set("amenities", on ? l.amenities.filter((x) => x !== a) : [...l.amenities, a])} className={`chip h-9 px-3.5 ${on ? "chip-gold" : ""}`}>{on ? "✓ " : ""}{a}</button>;
            })}
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-2xl border border-ink-600 px-4 py-3">
          <span><span className="block text-sm">เปิดแสดงหน้าร้าน</span><span className="text-xs text-[#9a8a85]">{canPublish ? "ลูกค้าจะเห็นร้านของคุณ" : "เปิดได้หลังทีมงานอนุมัติบัญชี"}</span></span>
          <input type="checkbox" checked={l.published} disabled={!canPublish} onChange={(e) => set("published", e.target.checked)} className="accent-[#d4af37] w-5 h-5" />
        </label>

        {msg && <p role="status" className="text-sm text-gold-300">{msg}</p>}
        <button onClick={save} disabled={busy || up} className="btn-crimson min-h-12 rounded-full font-display font-semibold text-lg">{busy ? "กำลังบันทึก…" : "บันทึกหน้าร้าน"}</button>
      </div>
    </>
  );
}
