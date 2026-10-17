"use client";

// บันทึกใบเสร็จเป็นไฟล์ PDF (A4) บนเครื่องผู้ใช้ — แปลงหน้าเอกสารเป็นรูปความละเอียดสูงด้วยฟอนต์เดียวกับหน้าเว็บ (ภาษาไทยไม่เพี้ยน)
// เบราว์เซอร์ในแอป (LINE ฯลฯ) ที่ดาวน์โหลดไฟล์ไม่ได้ → เปิด PDF ในแท็บใหม่ให้กดบันทึก/แชร์เอง
import { useState } from "react";

export function SavePdfButton({ targetId, fileName, label = "ดาวน์โหลดใบเสร็จ (PDF)" }: { targetId: string; fileName: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    const el = document.getElementById(targetId);
    if (!el) return;
    setBusy(true); setErr("");
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      await document.fonts?.ready;
      // จัดหน้าที่ความกว้าง A4 (794px @96dpi) เสมอ ไม่ว่าจะเปิดจากมือถือหรือจอคอม แล้วคืนค่าเดิม
      const prev = { width: el.style.width, maxWidth: el.style.maxWidth };
      el.style.width = "794px"; el.style.maxWidth = "none";
      let png: string, ratio: number;
      try {
        ratio = el.offsetHeight / el.offsetWidth;
        png = await toPng(el, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true, width: 794, height: el.offsetHeight, style: { boxShadow: "none", margin: "0" } });
      } finally { el.style.width = prev.width; el.style.maxWidth = prev.maxWidth; }
      const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
      const w = 210, h = w * ratio;
      // ยาวเกินหน้า → ย่อให้พอดี 1 หน้า
      if (h <= 297) pdf.addImage(png, "PNG", 0, 0, w, h, undefined, "FAST");
      else pdf.addImage(png, "PNG", (210 - 297 / ratio) / 2, 0, 297 / ratio, 297, undefined, "FAST");
      pdf.setProperties({ title: fileName });
      const inApp = /Line\/|FBAN|FBAV|Instagram|; wv\)/i.test(navigator.userAgent);
      if (inApp) window.open(URL.createObjectURL(pdf.output("blob")), "_blank");
      else pdf.save(`${fileName}.pdf`);
    } catch (e) {
      console.error(e);
      setErr("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง หรือเปิดหน้านี้ในเบราว์เซอร์ (Chrome / Safari)");
    } finally { setBusy(false); }
  };
  return (
    <span className="flex flex-col items-end gap-1">
      <button type="button" onClick={save} disabled={busy} className="btn-gold-lux no-print h-11 px-6 rounded-full text-[14px] disabled:opacity-60">{busy ? "กำลังสร้าง PDF…" : label}</button>
      {err && <span role="alert" className="text-[12px] text-[#b3122a]">{err}</span>}
    </span>
  );
}
