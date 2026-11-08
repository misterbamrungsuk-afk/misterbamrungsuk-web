"use client";

import { useEffect, useRef, useState } from "react";

// ส่งออกส่วนของหน้า /finance เป็นรูปสำหรับใส่สไลด์ — แนวนอน 16:9 (1920×1080) หรือแนวตั้ง 9:16 (1080×1920)
// วิธี: โคลนส่วนที่เลือก → แปลงช่องกรอกเป็นตัวหนังสือ · ซ่อนปุ่มแก้ไข ([data-noexport]) · กางตารางที่เลื่อนข้าง
// → วางในกรอบแบรนด์ (หัว MB + ชื่อส่วน + เดือน · ท้าย) แล้วย่อ/ขยายให้พอดี → html-to-image → ดาวน์โหลด PNG
export type Orient = "landscape" | "portrait";
const SIZE: Record<Orient, [number, number]> = { landscape: [1920, 1080], portrait: [1080, 1920] };

export async function exportSection(node: HTMLElement, o: { orient: Orient; title: string; sub: string; footer: string; file: string }) {
  const [W, H] = SIZE[o.orient];
  const PAD = o.orient === "landscape" ? 64 : 56;
  const frame = document.createElement("div");
  frame.className = "fin-root fin-export";
  Object.assign(frame.style, { position: "fixed", left: "-30000px", top: "0", width: `${W}px`, height: `${H}px`, display: "flex", flexDirection: "column", padding: `${PAD}px`, boxSizing: "border-box", gap: "28px", background: "linear-gradient(160deg,#faf8ff 0%,#f1ecfb 55%,#ece6fa 100%)", overflow: "hidden" });

  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  const head = document.createElement("div");
  head.innerHTML = `<div style="display:flex;align-items:center;gap:22px">
      <span style="width:72px;height:72px;border-radius:22px;display:grid;place-items:center;font-weight:800;font-size:28px;color:#6d3fd1;background:#efe8fd;flex-shrink:0">MB</span>
      <div style="flex:1;min-width:0;line-height:1.3">
        <div style="font-size:18px;letter-spacing:.14em;font-weight:600;color:#7a7091">MISTER BAMRUNGSUK</div>
        <div style="font-size:${o.orient === "landscape" ? 44 : 46}px;font-weight:800;color:#231a3d;line-height:1.3">${esc(o.title)}</div>
        <div style="font-size:21px;color:#7a7091;margin-top:2px">${esc(o.sub)}</div>
      </div>
    </div>`;
  const body = document.createElement("div");
  Object.assign(body.style, { flex: "1", minHeight: "0", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" });
  const foot = document.createElement("div");
  foot.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;font-size:17px;color:#7a7091;border-top:1px solid #ddd5ee;padding-top:16px">
      <span>${esc(o.footer)}</span><span style="font-weight:700;color:#6d3fd1">misterbamrungsuk.com</span></div>`;
  frame.append(head, body, foot);

  // ─── โคลน + ทำให้อ่านง่ายในรูป ───
  const extra = Math.max(0, ...Array.from(node.querySelectorAll<HTMLElement>(".overflow-x-auto")).map((e) => e.scrollWidth - e.clientWidth));
  const clone = node.cloneNode(true) as HTMLElement;
  const srcFields = node.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input,select");
  clone.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input,select").forEach((el, i) => {
    const src = srcFields[i];
    const span = document.createElement("span");
    if (src instanceof HTMLSelectElement) span.textContent = src.selectedOptions[0]?.textContent ?? "";
    else if (src?.type === "checkbox") span.textContent = src.checked ? "☑" : "☐";
    else span.textContent = src?.value || src?.placeholder || "";
    span.style.cssText = "font:inherit;font-variant-numeric:tabular-nums;white-space:nowrap;font-weight:600";
    el.replaceWith(span);
  });
  clone.querySelectorAll("[data-noexport], .fin-add, .fin-btn, .fin-x, a[href]").forEach((e) => e.remove());
  // เอฟเฟกต์เลื่อนแล้วค่อยโผล่ (ScrollReveal) ทำให้ส่วนที่อยู่นอกจอโปร่งใส — ปิดในรูป
  [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("[data-rv]"))].forEach((e) => { e.removeAttribute("data-rv"); e.style.opacity = ""; e.style.transform = ""; });
  clone.querySelectorAll<HTMLElement>(".overflow-x-auto").forEach((e) => { e.style.overflow = "visible"; });
  clone.querySelectorAll<HTMLElement>(".sticky").forEach((e) => { e.style.position = "static"; });
  Object.assign(clone.style, { width: `${node.offsetWidth + extra}px`, margin: "0", flexShrink: "0" });
  const wrap = document.createElement("div");
  wrap.append(clone);
  body.append(wrap);
  document.body.append(frame);

  try {
    await document.fonts?.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const cw = clone.offsetWidth, ch = clone.offsetHeight;
    const bw = body.clientWidth, bh = body.clientHeight;
    const scale = Math.min(bw / cw, bh / ch, 1.8);
    Object.assign(wrap.style, { width: `${cw * scale}px`, height: `${ch * scale}px` });
    Object.assign(clone.style, { transform: `scale(${scale})`, transformOrigin: "top left" });
    await new Promise((r) => requestAnimationFrame(r));
    const { toPng } = await import("html-to-image");
    const url = await toPng(frame, { width: W, height: H, pixelRatio: 1, cacheBust: true, style: { left: "0", position: "static" } });
    const a = document.createElement("a");
    a.href = url;
    a.download = o.file;
    document.body.append(a);
    a.click();
    a.remove();
  } finally {
    frame.remove();
  }
}

/** ปุ่ม "รูป" — หาส่วนที่ใกล้ที่สุดที่มี data-export แล้วส่งออก */
export function ExportBtn({ lang, meta, label, target }: { lang: "th" | "en"; meta: (title: string) => { title: string; sub: string; footer: string; file: string }; label?: string; target?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const t = (th: string, en: string) => (lang === "en" ? en : th);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const go = async (orient: Orient) => {
    const node = target ? document.querySelector<HTMLElement>(target) : ref.current?.closest<HTMLElement>("[data-export]");
    if (!node) return;
    setOpen(false); setBusy(true);
    try { await exportSection(node, { orient, ...meta(node.dataset.export ?? "") }); }
    catch { window.alert(t("ส่งออกรูปไม่สำเร็จ ลองใหม่อีกครั้ง", "Could not export the image — please try again")); }
    finally { setBusy(false); }
  };
  return (
    <span ref={ref} data-noexport className="relative inline-flex">
      <button type="button" className="fin-exp" onClick={() => setOpen(!open)} aria-expanded={open} disabled={busy} title={t("ส่งออกเป็นรูปสำหรับสไลด์", "Export as a slide image")}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
        {busy ? t("กำลังสร้าง…", "Exporting…") : label ?? t("รูป", "Image")}
      </button>
      {open && (
        <span className="fin-exp-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => go("landscape")}><i className="fin-ratio l" />{t("แนวนอน 16:9", "Landscape 16:9")}<small>1920×1080</small></button>
          <button type="button" role="menuitem" onClick={() => go("portrait")}><i className="fin-ratio p" />{t("แนวตั้ง 9:16", "Portrait 9:16")}<small>1080×1920</small></button>
        </span>
      )}
    </span>
  );
}
