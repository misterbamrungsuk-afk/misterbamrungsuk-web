"use client";

import { useState } from "react";
import Link from "next/link";
import { SavePdfButton } from "@/app/join/receipt/[mb]/save-pdf";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
type Doc = { no: string; issuer: { name: string; taxId: string; address: string; email: string; phone: string }; buyer: string; lines: [string, number][]; total: number; paidAt: string; code: string; email: string };
const baht = (s: number) => (s < 0 ? "−฿" : "฿") + (Math.abs(s) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ReceiptView({ id, doc, canInvoice = true }: { id: string; doc: Doc; canInvoice?: boolean }) {
  const [tab, setTab] = useState<"view" | "form">("view");
  const [kind, setKind] = useState<"person" | "corp">("person");
  const [f, setF] = useState({ name: "", tax_id: "", branch: "สำนักงานใหญ่ (00000)", address: "", email: doc.email });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const submit = async () => {
    setBusy(true); setMsg(null);
    const r = await fetch(`/api/bookings/${id}/invoice`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, ...f }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    setMsg(d?.ok ? { ok: true, text: "ส่งคำขอแล้ว เราจะส่งใบกำกับภาษีทางอีเมลภายใน 3 วันทำการ" } : { ok: false, text: d?.error || "ส่งคำขอไม่สำเร็จ" });
  };
  const inp = "h-12 w-full rounded-xl bg-[#251d1b] px-[14px] text-[16px] text-[#f3ead9] outline-none placeholder:text-[#b5a596]";
  return (
    <div className="min-h-dvh pb-8" style={{ background: "#171211", color: "#f3ead9" }}>
      <div className="flex items-center gap-2" style={{ padding: "12px 14px 0" }}>
        <Link href={`/order/${id}`} aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full bg-[#211a18] grid place-items-center hover:text-[#e8c472]" style={{ border: `1px solid ${LN}`, color: GOLD }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg></Link>
        <h1 className="m-0 font-semibold text-[17px]" style={{ color: GOLD }}>ใบเสร็จ / ใบกำกับภาษี</h1>
      </div>
      <div className="flex flex-col gap-[14px]" style={{ padding: "12px 18px 0" }}>
        <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-[#211a18]" style={{ border: `1px solid ${LN}` }}>
          {([["view", "ใบเสร็จ"], ["form", "ขอใบกำกับภาษี"]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setTab(k)} className="h-11 rounded-full text-[13px] font-semibold" style={{ background: tab === k ? GOLD : "transparent", color: tab === k ? "#1b130b" : "#d9c9b4" }}>{l}</button>)}
        </div>
        {tab === "view" ? (
          <>
            <div id="receipt-doc" className="rounded-[18px] flex flex-col gap-2.5" style={{ background: "#f3ead9", color: "#2a1d17", padding: 18 }}>
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0"><div className="font-semibold text-[16px]" style={{ color: "#9a6f1e" }}>Mister Bamrungsuk</div><div className="text-[12px] font-light" style={{ color: "#6b5a52" }}>{doc.issuer.name} · เลขผู้เสียภาษี {doc.issuer.taxId}</div></div>
                <div className="text-right text-[12px] font-light shrink-0">ใบเสร็จรับเงิน<br /><b>{doc.no}</b></div>
              </div>
              <div className="text-[12px] font-light pt-2" style={{ color: "#6b5a52", borderTop: "1px dashed #c9b8a6" }}>ผู้ซื้อ: {doc.buyer}</div>
              {doc.lines.map(([n, v]) => <div key={n} className="flex justify-between gap-3 text-[13px] font-light"><span>{n}</span><span className="tabular-nums shrink-0">{baht(v)}</span></div>)}
              <div className="flex justify-between pt-2 font-bold text-[18px]" style={{ color: "#9a6f1e", borderTop: "1px solid #c9b8a6" }}><span>รวมทั้งสิ้น</span><span className="tabular-nums">{baht(doc.total)}</span></div>
              <div className="text-[12px] font-light" style={{ color: "#6b5a52" }}>ชำระจากกระเป๋าเงินในแอป · {new Date(doc.paidAt).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" })} · การจอง #{doc.code}</div>
              <div className="text-[12px] font-light" style={{ color: "#6b5d55" }}>{doc.issuer.address} · {doc.issuer.phone}</div>
            </div>
            <SavePdfButton targetId="receipt-doc" fileName={`ใบเสร็จ-${doc.no}`} />
          </>
        ) : !canInvoice ? (
          // ใบกำกับภาษีออกได้หลังนัดจบและมียอดที่เก็บจริง (เซิร์ฟเวอร์ตรวจซ้ำ)
          <p className="m-0 rounded-2xl bg-[#211a18] text-[14px] text-[#d9c9b4]" style={{ padding: 16, border: `1px solid ${LN}` }}>ขอใบกำกับภาษีได้หลังนัดจบแล้ว · ถ้าคืนเงินเต็มจำนวนจะไม่มียอดให้ออกใบกำกับ</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">{([["person", "บุคคลธรรมดา"], ["corp", "นิติบุคคล"]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setKind(k)} className="min-h-12 rounded-xl bg-[#211a18] text-[13px]" style={{ border: `1px solid ${kind === k ? GOLD : "rgba(232,196,114,0.14)"}`, color: kind === k ? GOLD : "#d9c9b4" }}>{l}</button>)}</div>
            <label className="flex flex-col gap-1.5 text-[12px] text-[#d9c9b4]">{kind === "corp" ? "ชื่อบริษัท" : "ชื่อ-นามสกุล"}<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={120} className={inp} /></label>
            <label className="flex flex-col gap-1.5 text-[12px] text-[#d9c9b4]">เลขประจำตัวผู้เสียภาษี (13 หลัก)<input value={f.tax_id} onChange={(e) => setF({ ...f, tax_id: e.target.value.replace(/\D/g, "").slice(0, 13) })} inputMode="numeric" className={inp} /></label>
            {kind === "corp" && <label className="flex flex-col gap-1.5 text-[12px] text-[#d9c9b4]">สาขา<input value={f.branch} onChange={(e) => setF({ ...f, branch: e.target.value })} maxLength={60} className={inp} /></label>}
            <label className="flex flex-col gap-1.5 text-[12px] text-[#d9c9b4]">ที่อยู่ออกใบกำกับ<textarea value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} maxLength={300} rows={3} className="rounded-xl bg-[#251d1b] p-[14px] text-[16px] text-[#f3ead9] outline-none resize-none" /></label>
            <label className="flex flex-col gap-1.5 text-[12px] text-[#d9c9b4]">ส่งไปที่อีเมล<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} maxLength={120} className={inp} /></label>
            {msg && <div role="status" className="rounded-2xl text-[13px] font-light" style={{ padding: 14, background: "#211a18", border: `1px solid ${msg.ok ? "rgba(60,170,110,.5)" : "rgba(255,138,154,.5)"}`, color: msg.ok ? "#7fd6a3" : "#ff8a9a" }}>{msg.text}</div>}
            <button type="button" onClick={submit} disabled={busy || !!msg?.ok} className="h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold disabled:opacity-50">{busy ? "กำลังส่ง…" : msg?.ok ? "ส่งคำขอแล้ว" : "ส่งคำขอใบกำกับภาษี"}</button>
          </div>
        )}
      </div>
    </div>
  );
}
