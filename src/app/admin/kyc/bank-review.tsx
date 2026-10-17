"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Part-Time ที่อนุมัติแล้วเปลี่ยนบัญชีรับเงิน → ยังรับงานได้ แต่ถอนไม่ได้จนแอดมินตรวจบัญชีใหม่ (ชื่อบัญชีต้องตรงชื่อในบัตร)
type Row = { id: string; mb_code: string; first_name: string; last_name: string; nickname: string; bank: string; bank_account: string; bank_account_name: string; bank_book_path: string | null; bank_review: { at: string; prev: { bank: string; bank_account: string; bank_account_name: string } } };
const file = (p: string) => `/api/admin/applicants/file?path=${encodeURIComponent(p)}`;
const LN = "rgba(240,200,90,.38)";

export function BankReview({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  if (!rows.length) return null;
  const act = async (id: string, decision: "approved" | "rejected") => {
    setBusy(id); setMsg("");
    const r = await fetch(`/api/admin/applicants/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bank_review: decision }) });
    const d = await r.json().catch(() => ({}));
    setBusy(""); setMsg(d.ok ? (decision === "approved" ? "อนุมัติบัญชีใหม่แล้ว · ถอนเงินได้" : "ไม่อนุมัติ · กลับไปใช้บัญชีเดิม") : d.error ?? "บันทึกไม่สำเร็จ");
    if (d.ok) router.refresh();
  };
  return (
    <section className="rounded-2xl border p-3.5 flex flex-col gap-2.5" style={{ borderColor: "#f0a35a", background: "rgba(240,163,90,.06)" }}>
      <b className="text-[15px]">เปลี่ยนบัญชีรับเงิน · รอตรวจ ({rows.length})</b>
      <p className="m-0 text-[12.5px] text-[#cdbfb3]">ยังรับงานได้ตามปกติ แต่ถอนเงินไม่ได้จนกว่าจะตรวจ · ชื่อบัญชีต้องตรงกับชื่อในบัตรประชาชน</p>
      {msg && <p className="m-0 text-[13px] text-[#f0c75a]" role="status">{msg}</p>}
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl border p-3 flex flex-wrap gap-3 items-center" style={{ borderColor: LN }}>
          <span className="flex-1 min-w-[240px] text-[13px]">
            <b className="text-[#ffd76a]">{r.mb_code}</b> · {r.first_name} {r.last_name} ({r.nickname})
            <span className="block text-[#9a8a85]">เดิม: {r.bank_review.prev.bank} {r.bank_review.prev.bank_account} · {r.bank_review.prev.bank_account_name}</span>
            <span className="block">ใหม่: <b>{r.bank} {r.bank_account} · {r.bank_account_name}</b>{r.bank_book_path && <> · <a className="underline text-[#f0c75a]" href={file(r.bank_book_path)} target="_blank" rel="noreferrer">หน้าสมุดบัญชี</a></>}</span>
            <span className="block text-[11.5px] text-[#9a8a85]">แจ้งเมื่อ {new Date(r.bank_review.at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</span>
          </span>
          <button type="button" disabled={!!busy} onClick={() => act(r.id, "approved")} className="h-10 px-4 rounded-xl font-semibold text-[#1a1206] disabled:opacity-40" style={{ background: "#f0c75a" }}>อนุมัติบัญชีใหม่</button>
          <button type="button" disabled={!!busy} onClick={() => act(r.id, "rejected")} className="h-10 px-3 rounded-xl border text-[13px] text-[#fecaca] disabled:opacity-40" style={{ borderColor: "rgba(201,40,61,.6)" }}>ไม่อนุมัติ (ใช้บัญชีเดิม)</button>
        </div>
      ))}
    </section>
  );
}
