"use client";

import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { SLIDE_SIZE, Slide, type Orient, type SlideCtx, type SlideKind } from "./slides";

// ส่งออกสไลด์สรุป (/finance) เป็น PNG — เรนเดอร์คอมโพเนนต์สไลด์นอกจอ แล้ว html-to-image
async function renderSlide(kind: SlideKind, c: SlideCtx): Promise<string> {
  const [W, H] = SLIDE_SIZE[c.orient];
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-30000px;top:0;width:${W}px;height:${H}px;overflow:hidden`;
  document.body.append(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<Slide kind={kind} c={c} />));
    await document.fonts?.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const { toPng } = await import("html-to-image");
    return await toPng(host.firstElementChild as HTMLElement, { width: W, height: H, pixelRatio: 1, cacheBust: true });
  } finally {
    root.unmount();
    host.remove();
  }
}

/** ปุ่ม "ส่งออกสไลด์" — เลือกแนวนอน 16:9 / แนวตั้ง 9:16 */
export function ExportBtn({ kind, ctx, file }: { kind: SlideKind; ctx: Omit<SlideCtx, "orient">; file: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const t = (th: string, en: string) => (ctx.lang === "en" ? en : th);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const ALL: SlideKind[] = ["overview", "costs", "target"];
  const ratioTag = (o: Orient) => (o === "landscape" ? "16x9" : "9x16");
  const download = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
  };
  // mode: one = สไลด์หน้านี้ · all = ครบ 3 สไลด์เป็น PNG 3 ไฟล์ · pdf = ครบ 3 สไลด์ใน PDF ไฟล์เดียว
  const go = async (orient: Orient, mode: "one" | "all" | "pdf" = "one") => {
    setOpen(false); setBusy(true);
    try {
      if (mode === "one") {
        download(await renderSlide(kind, { ...ctx, orient }), `${file}-${ratioTag(orient)}.png`);
      } else {
        const urls: string[] = [];
        for (const k of ALL) urls.push(await renderSlide(k, { ...ctx, orient }));
        const base = `MB-finance-${ctx.month}`;
        if (mode === "all") {
          for (let i = 0; i < urls.length; i++) {
            download(urls[i], `${base}-${i + 1}-${ALL[i]}-${ratioTag(orient)}.png`);
            await new Promise((r) => setTimeout(r, 400)); // เว้นจังหวะ ให้เบราว์เซอร์ยอมดาวน์โหลดหลายไฟล์
          }
        } else {
          const { jsPDF } = await import("jspdf");
          const [W, H] = SLIDE_SIZE[orient];
          const pdf = new jsPDF({ unit: "px", format: [W, H], orientation: orient === "landscape" ? "landscape" : "portrait", compress: true, hotfixes: ["px_scaling"] });
          urls.forEach((u, i) => { if (i) pdf.addPage([W, H], orient === "landscape" ? "landscape" : "portrait"); pdf.addImage(u, "PNG", 0, 0, W, H, undefined, "FAST"); });
          pdf.setProperties({ title: `Mister Bamrungsuk · ${t("แผนการเงิน", "Financial plan")} · ${ctx.month}` });
          pdf.save(`${base}-3-slides-${ratioTag(orient)}.pdf`);
        }
      }
    } catch {
      window.alert(t("ส่งออกสไลด์ไม่สำเร็จ ลองใหม่อีกครั้ง", "Could not export the slide — please try again"));
    } finally { setBusy(false); }
  };
  return (
    <span ref={ref} className="relative inline-flex">
      <button type="button" className="fin-exp" onClick={() => setOpen(!open)} aria-expanded={open} disabled={busy} title={t("สร้างรูปสไลด์สรุปจากตัวเลขในแผน", "Create a summary slide image from the plan")}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
        {busy ? t("กำลังสร้าง…", "Exporting…") : t("ส่งออกสไลด์", "Export slide")}
      </button>
      {open && (
        <span className="fin-exp-menu" role="menu">
          <span className="fin-exp-h">{t("สไลด์หน้านี้", "This page")}</span>
          <button type="button" role="menuitem" onClick={() => go("landscape")}><i className="fin-ratio l" />{t("แนวนอน 16:9", "Landscape 16:9")}<small>PNG</small></button>
          <button type="button" role="menuitem" onClick={() => go("portrait")}><i className="fin-ratio p" />{t("แนวตั้ง 9:16", "Portrait 9:16")}<small>PNG</small></button>
          <span className="fin-exp-h">{t("ครบ 3 สไลด์ (ภาพรวม · ต้นทุน · เป้ากำไร)", "All 3 slides (overview · costs · target)")}</span>
          <button type="button" role="menuitem" onClick={() => go("landscape", "pdf")}><i className="fin-ratio l" />{t("PDF แนวนอน 3 หน้า", "PDF landscape, 3 pages")}<small>PDF</small></button>
          <button type="button" role="menuitem" onClick={() => go("portrait", "pdf")}><i className="fin-ratio p" />{t("PDF แนวตั้ง 3 หน้า", "PDF portrait, 3 pages")}<small>PDF</small></button>
          <button type="button" role="menuitem" onClick={() => go("landscape", "all")}><i className="fin-ratio l" />{t("รูปแนวนอน 3 รูป", "3 landscape images")}<small>PNG ×3</small></button>
          <button type="button" role="menuitem" onClick={() => go("portrait", "all")}><i className="fin-ratio p" />{t("รูปแนวตั้ง 3 รูป", "3 portrait images")}<small>PNG ×3</small></button>
        </span>
      )}
    </span>
  );
}
