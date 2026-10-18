"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConfirm } from "../confirm";

export function ClearErrors() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmUi, ask] = useConfirm();
  const clear = async () => {
    if (!(await ask({ title: "ล้างรายการข้อผิดพลาดทั้งหมด?", body: "ใช้หลังแก้บั๊กแล้ว เพื่อดูว่ายังเกิดซ้ำไหม", ok: "ล้างรายการ", danger: true }))) return;
    setBusy(true);
    await fetch("/api/admin/errors", { method: "DELETE" }).catch(() => null);
    setBusy(false); router.refresh();
  };
  return (
    <>
      {confirmUi}
      <button type="button" disabled={busy} onClick={clear} className="h-10 px-3 rounded-xl border text-[13px] text-[#fecaca] disabled:opacity-40" style={{ borderColor: "rgba(201,40,61,.6)" }}>ล้างรายการ</button>
    </>
  );
}
