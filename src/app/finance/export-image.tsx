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

// แคปหน้าที่กรอกจริงทั้งหน้า (#fin-page) — ตัดปุ่มแก้ไข (ลบ/เพิ่ม/บันทึก/ส่งออก) ออก เหลือแต่ตัวเลขตามที่กรอก
const HIDE = ".fin-lbl-t > svg,.fin-x,.fin-add,.fin-add-o,.fin-btn,.fin-exp,.fin-seg,.fin-chip,[data-noexport]";
/** แบ่งรูปยาวเป็นหน้า A4 แนวตั้ง ตัดเฉพาะช่องว่างระหว่างการ์ด */
async function paginate(url: string, w: number, h: number, cuts: number[]): Promise<{ url: string; h: number }[]> {
  const pageH = Math.round(w * 1.414);
  const ranges: [number, number][] = [];
  for (let s = 0; s < h - 1; ) {
    if (h - s <= pageH) { ranges.push([s, h]); break; }
    const fit = cuts.filter((c) => c > s + 40 && c <= s + pageH);
    const e = fit.length ? fit[fit.length - 1] : cuts.find((c) => c > s + 40) ?? h;
    ranges.push([s, e]); s = e;
  }
  const img = new Image();
  await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = url; });
  const k = img.naturalWidth / w;
  return ranges.map(([a, b]) => {
    const cv = document.createElement("canvas");
    cv.width = Math.round(w * k); cv.height = Math.round((b - a) * k);
    const g = cv.getContext("2d")!;
    g.fillStyle = "#f6f4fb"; g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(img, 0, Math.round(a * k), cv.width, cv.height, 0, 0, cv.width, cv.height);
    return { url: cv.toDataURL("image/png"), h: b - a };
  });
}

async function capturePage(): Promise<{ url: string; w: number; h: number; cuts: number[] }> {
  const node = document.getElementById("fin-page");
  if (!node) throw new Error("no page");
  (document.activeElement as HTMLElement | null)?.blur?.();
  await document.fonts?.ready;
  // ตัวเลือกใน select: ใส่ attribute selected ให้ตรงค่าปัจจุบัน (ไม่งั้นรูปอาจโชว์ตัวเลือกผิด)
  const sels = [...node.querySelectorAll("select")];
  const prevSel = sels.map((s) => [...s.options].map((o) => o.hasAttribute("selected")));
  sels.forEach((s) => [...s.options].forEach((o, i) => (i === s.selectedIndex ? o.setAttribute("selected", "") : o.removeAttribute("selected"))));
  // ตารางที่เลื่อนแนวนอนได้ (เช่นตารางเคส 18 เดือน) → ขยายหน้าให้กว้างพอเห็นครบทุกคอลัมน์
    const scrollers = [...node.querySelectorAll<HTMLElement>(".overflow-x-auto")];
  const prev = { width: node.style.width, flex: node.style.flex, maxWidth: node.style.maxWidth };
  // เรียงคอลัมน์เดียวบนลงล่าง กว้างแบบจอคอม (ใช้ setTimeout แทน rAF — แท็บที่ซ่อนอยู่ rAF ไม่ทำงาน)
  const frame = () => new Promise((r) => setTimeout(r, 80));
  node.classList.add("fin-cap");
  node.style.flex = "none"; node.style.maxWidth = "none";
  node.style.width = "920px";
  try {
    await frame();
    for (let i = 0; i < 3; i++) {
      const more = Math.max(0, ...scrollers.map((el) => el.scrollWidth - el.clientWidth));
      if (!more) break;
      node.style.width = `${Math.min(3200, node.clientWidth + more + 8)}px`;
      await frame();
    }
    const w = node.scrollWidth, h = node.scrollHeight;
    // จุดตัดหน้าที่ปลอดภัย = ช่องว่างระหว่างบล็อก (หัวเรื่อง · แถบเดือน · การ์ดตัวเลข · การ์ด 1 · การ์ด 2 · สรุป · ตารางเคส) — ไม่ตัดกลางการ์ด
    const top0 = node.getBoundingClientRect().top;
    const blocks = [...node.querySelectorAll<HTMLElement>("header, .fin-bar, section.fin-card, div:has(> .fin-kpi)")]
      .map((el) => { const r = el.getBoundingClientRect(); return [r.top - top0, r.bottom - top0] as const; })
      .filter(([a, b]) => b > a);
    const cuts = [...new Set(blocks.map(([, b]) => b))]
      .filter((y) => !blocks.some(([a, b]) => a < y - 1 && b > y + 1))
      .map((y) => { const next = Math.min(h, ...blocks.map(([a]) => a).filter((a) => a >= y)); return Math.round((y + next) / 2); })
      .filter((y) => y > 0 && y < h)
      .sort((a, b) => a - b);
    const { toPng } = await import("html-to-image");
    const url = await toPng(node, {
      width: w, height: h, pixelRatio: Math.max(1, Math.min(2, Math.sqrt(12e6 / (w * h)))), cacheBust: true, backgroundColor: "#f6f4fb",
      filter: (el) => !(el instanceof Element && el.matches(HIDE)),
    });
    return { url, w, h, cuts };
  } finally {
    Object.assign(node.style, prev);
    node.classList.remove("fin-cap");
    sels.forEach((s, j) => [...s.options].forEach((o, i) => (prevSel[j][i] ? o.setAttribute("selected", "") : o.removeAttribute("selected"))));
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
  const goPage = async (as: "png" | "pages" | "pdf") => {
    setOpen(false); setBusy(true);
    try {
      const { url, w, h, cuts } = await capturePage();
      if (as === "png") download(url, `${file}-page.png`);
      else if (as === "pages") {
        const pages = await paginate(url, w, h, cuts);
        for (let i = 0; i < pages.length; i++) {
          download(pages[i].url, `${file}-page-${i + 1}.png`);
          await new Promise((r) => setTimeout(r, 400));
        }
      } else {
        const pages = await paginate(url, w, h, cuts);
        const { jsPDF } = await import("jspdf");
        const pageH = Math.round(w * 1.414);
        const pdf = new jsPDF({ unit: "px", format: [w, pageH], orientation: "portrait", compress: true, hotfixes: ["px_scaling"] });
        pages.forEach((pg, i) => {
          if (i) pdf.addPage([w, pageH], "portrait");
          pdf.setFillColor("#f6f4fb"); pdf.rect(0, 0, w, pageH, "F");
          pdf.addImage(pg.url, "PNG", 0, 0, w, Math.min(pg.h, pageH), undefined, "FAST");
        });
        pdf.setProperties({ title: `Mister Bamrungsuk · ${t("แผนการเงิน", "Financial plan")} · ${ctx.month}` });
        pdf.save(`${file}-page.pdf`);
      }
    } catch {
      window.alert(t("ส่งออกไม่สำเร็จ ลองใหม่อีกครั้ง", "Export failed — please try again"));
    } finally { setBusy(false); }
  };
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
          <span className="fin-exp-h">{t("หน้านี้ตามที่กรอก (ทั้งหน้า)", "This page as entered (full page)")}</span>
          <button type="button" role="menuitem" onClick={() => goPage("png")}><i className="fin-ratio p" />{t("รูปทั้งหน้า (รูปเดียว)", "Full page, one image")}<small>PNG</small></button>
          <button type="button" role="menuitem" onClick={() => goPage("pdf")}><i className="fin-ratio p" />{t("PDF แบ่งหน้า A4", "PDF, A4 pages")}<small>PDF</small></button>
          <button type="button" role="menuitem" onClick={() => goPage("pages")}><i className="fin-ratio p" />{t("รูปแบ่งหน้า", "Images per page")}<small>PNG</small></button>
          <span className="fin-exp-h">{t("สไลด์สรุปหน้านี้", "Summary slide of this page")}</span>
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
