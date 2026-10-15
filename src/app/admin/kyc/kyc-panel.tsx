"use client";

import { useState } from "react";
import type { Applicant, KycStatus } from "@/lib/join/store";
import { FIX_ITEMS, fixLabel } from "@/lib/join/fixes";

// แผงตรวจเอกสาร + ตีกลับ — ใช้ร่วมกันในหน้า /admin/applicants (aside) และ /admin/kyc (คิว)
// ตีกลับได้ทุกรายการ (สลิป ข้อมูล รูป บัตร บัญชี) พร้อมเหตุผล → ผู้สมัครเห็นที่หน้า "ต้องแก้ไขเอกสาร" แล้วแก้ทีละรายการ
const file = (p: string) => `/api/admin/applicants/file?path=${encodeURIComponent(p)}`;

export const KYC_LABEL: Record<KycStatus, [string, string]> = {
  none: ["ยังไม่ส่งเอกสาร", "#7d6d6a"],
  submitted: ["รอตรวจเอกสาร", "#eed58a"],
  approved: ["✓ อนุมัติแล้ว", "#4ade80"],
  rejected: ["ตีกลับ · รอผู้สมัครแก้", "#fca5a5"],
};

/** เหตุผลสำเร็จรูป — แตะเพื่อเติมลงช่อง แก้ต่อได้ */
const PRESETS: Record<string, string[]> = {
  slip: ["ยอดไม่ตรง", "สลิปไม่ชัด", "ไม่พบรายการโอน"],
  info: ["ชื่อไม่ตรงกับบัตร", "วันเกิดไม่ถูกต้อง", "LINE ID ติดต่อไม่ได้"],
  photo: ["รูปไม่ชัด", "ไม่เห็นใบหน้าชัดเจน", "ใส่แว่นดำ/หน้ากาก"],
  other_doc: ["รูปไม่ชัด", "ไม่เห็นเต็มตัว"],
  schedule: ["ข้อมูลไม่ครบ"],
  cert_doc: ["รูปไม่ชัด", "ใบรับรองหมดอายุ"],
  id_card: ["รูปมืด อ่านเลขบัตรไม่ได้", "บัตรหมดอายุ", "แสงสะท้อนบังข้อมูล"],
  selfie: ["ไม่เห็นใบหน้าและบัตรพร้อมกัน", "รูปไม่ชัด"],
  id_copy: ["ไม่มีลายเซ็นรับรอง", "ไม่มีข้อความกำกับการใช้งาน", "รูปไม่ชัด"],
  bank: ["ชื่อบัญชีไม่ตรงกับผู้สมัคร", "ไม่เห็นเลขบัญชีบนสมุด"],
};

export function KycPanel({ row, onSaved }: { row: Applicant; onSaved: (row: Applicant) => void }) {
  const [mode, setMode] = useState<"view" | "reject">("view");
  const [fail, setFail] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const status: KycStatus = row.kyc_status ?? "none";
  const bankbook = row.bank_book_path ?? row.docs.bankbook;
  const thumbs = ([["สลิป", row.docs.slip], ["รูปหน้าตรง", row.docs.photo], ["รูปเต็มตัว", row.docs.other_doc], ["บัตรประชาชน", row.docs.id_card], ["สำเนาบัตรเซ็นรับรอง", row.docs.id_copy], ["เซลฟีถือบัตร", row.docs.selfie], ["สมุดบัญชี", bankbook], ...(row.package === "B" || row.docs.cert_doc ? [["ใบรับรองนวด", row.docs.cert_doc]] : [])] as [string, string | undefined | null][]);
  const items = FIX_ITEMS.filter((i) => !i.onlyB || row.package === "B");
  const nFail = Object.keys(fail).length;
  const ready = nFail > 0 && Object.values(fail).every((v) => v.trim());

  const send = async (body: Record<string, unknown>) => {
    setBusy(true);
    const res = await fetch(`/api/admin/applicants/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; row?: Applicant; error?: string };
    setBusy(false);
    if (data.row) { onSaved(data.row); setMode("view"); setFail({}); setMsg(body.kyc_status === "approved" ? "อนุมัติเอกสารแล้ว" : "ตีกลับแล้ว · ผู้สมัครเห็นเหตุผลที่โปรไฟล์และแก้ได้ทันที"); }
    else setMsg(data.error ?? "บันทึกไม่สำเร็จ");
    setTimeout(() => setMsg(""), 3500);
  };
  const toggle = (k: string, on: boolean) => setFail((f) => { const n = { ...f }; if (on) n[k] = n[k] ?? ""; else delete n[k]; return n; });

  return (
    <div className="flex flex-col gap-2.5 text-[13px]">
      <div className="flex justify-between items-center">
        <span className="text-[11px] tracking-[1.5px] text-[#f0c75a] font-semibold">ตรวจเอกสาร</span>
        <span style={{ color: KYC_LABEL[status][1] }} className="text-[12px]">{KYC_LABEL[status][0]}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {thumbs.map(([l, p]) => p ? (
          <a key={l} href={file(p)} target="_blank" rel="noopener noreferrer" className="block text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={file(p)} alt={l} className="w-full aspect-[4/3] rounded-lg object-cover bg-[#130e0e] border border-[rgba(240,200,90,.25)]" />
            <span className="text-[10.5px] text-[#cdbfb3]">{l}</span>
          </a>
        ) : (
          <div key={l} className="text-center">
            <div className="w-full aspect-[4/3] rounded-lg border border-dashed border-[rgba(240,200,90,.3)] bg-[#130e0e] grid place-items-center text-[10px] text-[#7d6d6a]">ไม่มีไฟล์</div>
            <span className="text-[10.5px] text-[#7d6d6a]">{l}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between gap-3"><span className="text-[#cdbfb3]">ธนาคาร</span><span className="text-right">{row.bank || "—"}</span></div>
      <div className="flex justify-between gap-3"><span className="text-[#cdbfb3]">เลขบัญชี</span><span className="text-right tabular-nums">{row.bank_account || "—"}</span></div>
      <div className="flex justify-between gap-3"><span className="text-[#cdbfb3]">ชื่อบัญชี</span><span className="text-right">{row.bank_account_name || "—"}</span></div>
      {status === "rejected" && row.kyc_reason && Object.keys(row.kyc_reason).length > 0 && (
        <div className="rounded-xl border border-[rgba(239,68,68,.5)] bg-[rgba(239,68,68,.1)] px-3 py-2 text-[12px] text-[#fecaca] leading-relaxed">
          <p className="m-0 font-semibold">รอผู้สมัครแก้ {Object.keys(row.kyc_reason).length} รายการ</p>
          {Object.entries(row.kyc_reason).map(([k, v]) => <p key={k} className="m-0">• {fixLabel(k)}: {v}</p>)}
        </div>
      )}

      {mode === "reject" ? (
        <div className="flex flex-col gap-2 rounded-xl border border-[rgba(201,40,61,.55)] bg-[rgba(176,24,44,.1)] p-2.5">
          <p className="m-0 text-[12px] text-[#cdbfb3]">เลือกรายการที่ต้องให้ผู้สมัครแก้ + เหตุผล (ผู้สมัครเห็นข้อความนี้)</p>
          {items.map((i) => {
            const on = fail[i.key] !== undefined;
            return (
              <div key={i.key} className="flex flex-col gap-1">
                <label className="flex items-center gap-2 text-[12.5px] min-h-8">
                  <input type="checkbox" className="accent-[#c8102e] w-4 h-4" checked={on} onChange={(e) => toggle(i.key, e.target.checked)} />
                  {i.label}
                </label>
                {on && <>
                  <div className="flex flex-wrap gap-1 pl-6">
                    {(PRESETS[i.key] ?? []).map((p) => (
                      <button key={p} type="button" onClick={() => setFail((f) => ({ ...f, [i.key]: p }))} className="h-7 px-2.5 rounded-full border text-[11.5px]"
                        style={{ borderColor: fail[i.key] === p ? "#f0c75a" : "rgba(240,200,90,.3)", color: fail[i.key] === p ? "#f0c75a" : "#cdbfb3" }}>{p}</button>
                    ))}
                  </div>
                  <input value={fail[i.key]} onChange={(e) => setFail((f) => ({ ...f, [i.key]: e.target.value }))} placeholder="เหตุผล / สิ่งที่ต้องแก้" maxLength={300}
                    className="ml-6 h-9 rounded-lg border border-[rgba(240,200,90,.38)] bg-[#130e0e] px-2.5 text-[12.5px] text-[#f6efe4] outline-none focus:border-[#f0c75a]" />
                </>}
              </div>
            );
          })}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button onClick={() => { setMode("view"); setFail({}); }} className="h-10 rounded-full border border-[rgba(240,200,90,.38)] text-[#d3c7bc]">ยกเลิก</button>
            <button disabled={busy || !ready} onClick={() => send({ kyc_status: "rejected", kyc_reason: fail })}
              className="h-10 rounded-full border border-[rgba(201,40,61,.6)] bg-[rgba(176,24,44,.3)] text-[#fecaca] font-semibold disabled:opacity-40">ตีกลับ {nFail || ""} รายการ</button>
          </div>
          {nFail > 0 && !ready && <p className="m-0 text-[11.5px] text-[#eed58a]">ใส่เหตุผลให้ครบทุกรายการที่เลือก</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button disabled={busy} onClick={() => { setFail(status === "rejected" ? Object.fromEntries(Object.entries(row.kyc_reason ?? {}).map(([k, v]) => [k, v ?? ""])) : {}); setMode("reject"); }} className="h-10 rounded-full border border-[rgba(201,40,61,.6)] bg-[rgba(176,24,44,.15)] text-[#fecaca] font-semibold disabled:opacity-40">{status === "rejected" ? "แก้รายการตีกลับ" : "ตีกลับให้แก้"}</button>
          <button disabled={busy || status === "none" || status === "approved"} onClick={() => send({ kyc_status: "approved" })} title={status === "none" ? "ผู้สมัครยังส่งเอกสารไม่ครบ" : ""} className="btn-red-lux h-10 rounded-full text-white font-semibold disabled:opacity-40">อนุมัติเอกสาร</button>
        </div>
      )}
      {msg && <p role="status" className="text-[12px] text-[#eed58a]">{msg}</p>}
    </div>
  );
}
