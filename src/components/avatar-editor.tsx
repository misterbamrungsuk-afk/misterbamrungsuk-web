"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";

// รูปโปรไฟล์ทุกบัญชี — แสดงในกรอบวงกลม · แตะ "เปลี่ยนรูป" อัปรูปใหม่ (ย่อเหลือ ≤1024px ก่อนส่ง) · ลากในกรอบเพื่อจัดตำแหน่ง + ซูม
export type AvatarAs = "customer" | "partner" | "vendor" | "sales";
type Meta = { pos: string; zoom: number; v: number } | null;

const parse = (p?: string): [number, number] => { const m = /^(\d+)% (\d+)%$/.exec(p ?? ""); return m ? [+m[1], +m[2]] : [50, 50]; };
const clamp = (n: number) => Math.round(Math.max(0, Math.min(100, n)));

/** ย่อรูปฝั่งเครื่องก่อนอัป (มือถือถ่ายมาใหญ่มาก) → JPEG คุณภาพ 0.88 */
async function shrink(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.88));
    return blob ? new File([blob], "avatar.jpg", { type: "image/jpeg" }) : file;
  } catch { return file; }
}

/** รูปวงกลมอย่างเดียว (ใช้ในหัวโปรไฟล์ / พอร์ทัล) */
export function AvatarView({ as, letter, size = 64, ring = "#e8c472", meta: given }: { as: AvatarAs; letter: string; size?: number; ring?: string; meta?: Meta }) {
  const [meta, setMeta] = useState<Meta | undefined>(given);
  useEffect(() => { if (given === undefined) fetch(`/api/avatar?as=${as}`, { cache: "no-store" }).then((r) => r.json()).then((d) => setMeta(d?.ok ? d.avatar : null)).catch(() => setMeta(null)); }, [as, given]);
  const m = given !== undefined ? given : meta;
  return (
    <span className="relative shrink-0 rounded-full overflow-hidden grid place-items-center bg-[#251d1b] font-semibold" style={{ width: size, height: size, border: `1.5px solid ${ring}`, color: ring, fontSize: size * 0.4 }}>
      {m ? <img src={`/api/avatar?as=${as}&img=1&v=${m.v}`} alt="รูปโปรไฟล์" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: m.pos, transform: `scale(${m.zoom})`, transformOrigin: m.pos }} /> : (letter || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

/** แก้รูป: อัป + ลากจัดตำแหน่ง + ซูม แล้วบันทึก */
export function AvatarEditor({ as, letter, size = 120, onChange }: { as: AvatarAs; letter: string; size?: number; onChange?: (m: Meta) => void }) {
  const [meta, setMeta] = useState<Meta | undefined>(undefined);
  const [pos, setPos] = useState<[number, number]>([50, 50]);
  const [zoom, setZoom] = useState(1);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const apply = (m: Meta) => { setMeta(m); setPos(parse(m?.pos)); setZoom(m?.zoom ?? 1); onChange?.(m); };
  useEffect(() => { fetch(`/api/avatar?as=${as}`, { cache: "no-store" }).then((r) => r.json()).then((d) => apply(d?.ok ? d.avatar : null)).catch(() => apply(null)); }, [as]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (fd: FormData, label: string) => {
    fd.set("as", as); setBusy(label); setMsg(null);
    const r = await fetch("/api/avatar", { method: "POST", body: fd }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy("");
    if (d?.ok) { apply(d.avatar); return true; }
    setMsg({ ok: false, t: d?.error || "บันทึกไม่สำเร็จ" }); return false;
  };
  const pick = async (f: File | undefined) => {
    if (!f) return;
    const fd = new FormData(); fd.set("file", await shrink(f));
    if (await send(fd, "อัปโหลด…")) { setEditing(true); setMsg({ ok: true, t: "อัปรูปแล้ว · ลากในวงกลมเพื่อจัดตำแหน่ง แล้วกดบันทึก" }); }
    if (fileRef.current) fileRef.current.value = "";
  };
  const savePos = async () => {
    const fd = new FormData(); fd.set("pos", `${pos[0]}% ${pos[1]}%`); fd.set("zoom", String(zoom));
    if (await send(fd, "บันทึก…")) { setEditing(false); setMsg({ ok: true, t: "บันทึกตำแหน่งรูปแล้ว" }); }
  };
  const p = `${pos[0]}% ${pos[1]}%`;
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className={`relative rounded-full overflow-hidden grid place-items-center bg-[#251d1b] select-none ${editing ? "cursor-grab active:cursor-grabbing touch-none" : ""}`}
        style={{ width: size, height: size, border: `2px solid ${editing ? "#f3ead9" : "#e8c472"}`, color: "#e8c472", fontSize: size * 0.38 }}
        onPointerDown={(e) => { if (!editing) return; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, px: pos[0], py: pos[1] }; }}
        onPointerMove={(e) => { const g = drag.current; if (!g) return; const k = 160 / (size * zoom); setPos([clamp(g.px - (e.clientX - g.x) * k), clamp(g.py - (e.clientY - g.y) * k)]); }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        {meta ? <img src={`/api/avatar?as=${as}&img=1&v=${meta.v}`} alt="รูปโปรไฟล์" draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ objectPosition: p, transform: `scale(${zoom})`, transformOrigin: p }} />
          : meta === null ? (letter || "?").slice(0, 1).toUpperCase() : null}
        {editing && <span className="absolute inset-x-0 bottom-1.5 text-center text-[11px] text-white/90 pointer-events-none" style={{ textShadow: "0 1px 3px #000" }}>ลากเพื่อจัด</span>}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {editing ? (
        <div className="flex flex-col items-center gap-2 w-full max-w-[280px]">
          <label className="flex items-center gap-2 w-full text-[12.5px] text-[#d9c9b4]">ซูม
            <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(+e.target.value)} className="flex-1 accent-[#e8c472]" aria-label="ซูมรูป" />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={!!busy} onClick={savePos} className="h-10 px-4 rounded-full bg-[#e8c472] text-[#1b130b] text-[14px] font-semibold disabled:opacity-50">{busy || "บันทึกตำแหน่ง"}</button>
            <button type="button" disabled={!!busy} onClick={() => { setPos(parse(meta?.pos)); setZoom(meta?.zoom ?? 1); setEditing(false); setMsg(null); }} className="h-10 px-4 rounded-full border text-[14px] text-[#f3ead9]" style={{ borderColor: "rgba(243,234,217,.2)" }}>ยกเลิก</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" disabled={!!busy} onClick={() => fileRef.current?.click()} className="h-10 px-4 rounded-full border text-[14px] text-[#e8c472] disabled:opacity-50" style={{ borderColor: "rgba(232,196,114,.55)" }}>{busy || (meta ? "เปลี่ยนรูป" : "อัปรูปโปรไฟล์")}</button>
          {meta && <button type="button" onClick={() => { setEditing(true); setMsg(null); }} className="h-10 px-4 rounded-full border text-[14px] text-[#f3ead9]" style={{ borderColor: "rgba(243,234,217,.2)" }}>ปรับตำแหน่ง</button>}
        </div>
      )}
      {msg && <p role="status" className="m-0 text-[12.5px] text-center" style={{ color: msg.ok ? "#7fd6a3" : "#ff8a9a" }}>{msg.t}</p>}
    </div>
  );
}
