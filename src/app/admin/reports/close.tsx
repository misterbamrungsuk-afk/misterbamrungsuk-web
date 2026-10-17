"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EXPIRED, useConfirm } from "../confirm";

export function CloseReport({ id }: { id: string }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmUi, ask] = useConfirm();
  const router = useRouter();
  const close = async () => {
    // ปิดเรื่องแล้วหายจากคิว "รอตรวจ" — ยืนยันพร้อมผลการตรวจก่อน
    if (!(await ask({ title: "ปิดเรื่องรายงานนี้?", body: note.trim() ? `ผลการตรวจ: ${note.trim()}` : "ยังไม่ได้ใส่ผลการตรวจ — แนะนำให้ใส่ก่อนปิดเรื่อง", ok: "ปิดเรื่อง" }))) return;
    setBusy(true); setErr("");
    const r = await fetch("/api/admin/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, note }) }).catch(() => null);
    setBusy(false);
    if (r?.ok) router.refresh(); else setErr(r?.status === 401 ? EXPIRED : "ปิดเรื่องไม่สำเร็จ");
  };
  return (
    <span className="ml-auto flex flex-wrap gap-2 items-center">
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="ผลการตรวจ เช่น ตักเตือนแล้ว" className="h-9 w-56 max-w-[50vw] rounded-lg border border-ink-600 bg-[#130e0e] px-2.5 text-[12.5px] text-[#f6efe4] outline-none" />
      <button type="button" onClick={close} disabled={busy} className="chip h-9 px-3">ปิดเรื่อง</button>
      {err && <span role="alert" className="text-[12px] text-[#fca5a5]">{err}{err === EXPIRED && <> · <a href="/admin-login" className="underline text-[#ffd76a]">เข้าสู่ระบบ</a></>}</span>}
      {confirmUi}
    </span>
  );
}
