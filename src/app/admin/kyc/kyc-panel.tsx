"use client";

import { useState } from "react";
import type { Applicant, KycStatus } from "@/lib/join/store";

// แผงตรวจเอกสาร KYC — ใช้ร่วมกันในหน้า /admin/applicants (aside) และ /admin/kyc (คิว)
const file = (p: string) => `/api/admin/applicants/file?path=${encodeURIComponent(p)}`;

export const KYC_LABEL: Record<KycStatus, [string, string]> = {
  none: ["ยังไม่ส่งเอกสาร", "#7d6d6a"],
  submitted: ["รอตรวจเอกสาร", "#eed58a"],
  approved: ["✓ อนุมัติแล้ว", "#4ade80"],
  rejected: ["ไม่ผ่าน · รอส่งใหม่", "#fca5a5"],
};

const ITEMS = [
  { key: "id_card", label: "หน้าบัตรประชาชน" },
  { key: "selfie", label: "เซลฟีถือบัตร" },
  { key: "cert_doc", label: "ใบรับรองการนวด", onlyB: true },
  { key: "bank", label: "บัญชีรับเงิน" },
] as const;
type ItemKey = (typeof ITEMS)[number]["key"];

export function KycPanel({ row, onSaved }: { row: Applicant; onSaved: (row: Applicant) => void }) {
  const [mode, setMode] = useState<"view" | "reject">("view");
  const [fail, setFail] = useState<Partial<Record<ItemKey, string>>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const status: KycStatus = row.kyc_status ?? "none";
  const bankbook = row.bank_book_path ?? row.docs.bankbook;
  const thumbs = ([["บัตรประชาชน", row.docs.id_card], ["เซลฟีถือบัตร", row.docs.selfie], ["สมุดบัญชี", bankbook], ...(row.package === "B" ? [["ใบรับรองนวด", row.docs.cert_doc]] : [])] as [string, string | undefined | null][]);
  const items = ITEMS.filter((i) => !("onlyB" in i) || row.package === "B");

  const send = async (body: Record<string, unknown>) => {
    setBusy(true);
    const res = await fetch(`/api/admin/applicants/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; row?: Applicant; error?: string };
    setBusy(false);
    if (data.row) { onSaved(data.row); setMode("view"); setFail({}); setMsg(body.kyc_status === "approved" ? "อนุมัติเอกสารแล้ว" : "บันทึกไม่ผ่าน · ผู้สมัครเห็นเหตุผลที่หน้าแจ้งส่งใหม่"); }
    else setMsg(data.error ?? "บันทึกไม่สำเร็จ");
    setTimeout(() => setMsg(""), 3000);
  };

  return (
    <div className="flex flex-col gap-2.5 text-[13px]">
      <div className="flex justify-between items-center">
        <span className="text-[11px] tracking-[1.5px] text-[#f0c75a] font-semibold">ยืนยันตัวตน · KYC</span>
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
      {status === "rejected" && row.kyc_reason && (
        <div className="rounded-xl border border-[rgba(239,68,68,.5)] bg-[rgba(239,68,68,.1)] px-3 py-2 text-[12px] text-[#fecaca] leading-relaxed">
          {Object.entries(row.kyc_reason).map(([k, v]) => <p key={k}>{ITEMS.find((i) => i.key === k)?.label ?? k}: {v}</p>)}
        </div>
      )}

      {mode === "reject" ? (
        <div className="flex flex-col gap-2 rounded-xl border border-[rgba(201,40,61,.55)] bg-[rgba(176,24,44,.1)] p-2.5">
          <p className="text-[12px] text-[#cdbfb3]">เลือกรายการที่ไม่ผ่าน + เหตุผล</p>
          {items.map((i) => {
            const on = fail[i.key] !== undefined;
            return (
              <div key={i.key} className="flex flex-col gap-1">
                <label className="flex items-center gap-2 text-[12.5px]">
                  <input type="checkbox" className="accent-[#c8102e]" checked={on} onChange={(e) => setFail((f) => { const n = { ...f }; if (e.target.checked) n[i.key] = ""; else delete n[i.key]; return n; })} />
                  {i.label}
                </label>
                {on && <input value={fail[i.key]} onChange={(e) => setFail((f) => ({ ...f, [i.key]: e.target.value }))} placeholder="เช่น รูปมืด อ่านเลขบัตรไม่ได้" className="h-9 rounded-lg border border-[rgba(240,200,90,.38)] bg-[#130e0e] px-2.5 text-[12.5px] text-[#f6efe4] outline-none focus:border-[#f0c75a]" />}
              </div>
            );
          })}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button onClick={() => { setMode("view"); setFail({}); }} className="h-10 rounded-full border border-[rgba(240,200,90,.38)] text-[#d3c7bc]">ยกเลิก</button>
            <button disabled={busy || !Object.values(fail).some((v) => v?.trim())} onClick={() => send({ kyc_status: "rejected", kyc_reason: fail })}
              className="h-10 rounded-full border border-[rgba(201,40,61,.6)] bg-[rgba(176,24,44,.3)] text-[#fecaca] font-semibold disabled:opacity-40">ยืนยันไม่ผ่าน</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button disabled={busy || status === "none"} onClick={() => setMode("reject")} className="h-10 rounded-full border border-[rgba(201,40,61,.6)] bg-[rgba(176,24,44,.15)] text-[#fecaca] font-semibold disabled:opacity-40">ไม่ผ่าน</button>
          <button disabled={busy || status === "none" || status === "approved"} onClick={() => send({ kyc_status: "approved" })} className="btn-red-lux h-10 rounded-full text-white font-semibold disabled:opacity-40">อนุมัติเอกสาร</button>
        </div>
      )}
      {msg && <p role="status" className="text-[12px] text-[#eed58a]">{msg}</p>}
    </div>
  );
}
