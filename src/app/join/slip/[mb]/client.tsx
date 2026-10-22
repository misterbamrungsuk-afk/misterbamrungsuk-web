"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { promptPayPayload } from "@/lib/join/promptpay";
import { BankTransfer } from "@/components/bank-transfer";
import { BottomBar, ctaStyle } from "../../_kyc/ui";
import { dataUrlToFile, resizeImage } from "@/lib/join/form";

const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];
const baht = (n: number) => "฿" + n.toLocaleString("en-US");

export function SlipForm({ mb, t, amount, reason, promptPayId, accountName, allowed }: { mb: string; t: string; amount: number; reason: string; promptPayId: string; accountName: string; allowed: boolean }) {
  const router = useRouter();
  const [qr, setQr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const q = t ? `?t=${encodeURIComponent(t)}` : "";

  useEffect(() => {
    const p = promptPayPayload(promptPayId, amount);
    if (p) QRCode.toDataURL(p, { margin: 1, width: 480, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(""));
  }, [promptPayId, amount]);

  // รูปจากกล้อง/HEIC ที่เครื่องแปลงแล้วมักใหญ่ → ย่อในเครื่องเป็น JPEG ก่อนส่ง (เหมือนหน้าชำระเงินแรก)
  const pick = async (f0?: File) => {
    if (!f0) return;
    if (!f0.type.startsWith("image/")) return setError("สลิปต้องเป็นรูป JPG/PNG/WEBP");
    let f = f0;
    try { f = await dataUrlToFile(await resizeImage(f0, 1400, 0.85), "slip.jpg"); } catch { if (!OK_TYPES.includes(f0.type)) return setError("ไฟล์นี้เปิดเป็นรูปไม่ได้ · เลือกรูป JPG/PNG อีกครั้ง"); }
    if (f.size > 5 * 1024 * 1024) return setError("สลิปต้องเป็นรูป JPG/PNG/WEBP ไม่เกิน 5MB");
    setError(""); setFile(f);
    setUrl((o) => { if (o) URL.revokeObjectURL(o); return URL.createObjectURL(f); });
  };
  const submit = async () => {
    if (!file) return setError("กรุณาแนบสลิป");
    setBusy(true); setError("");
    const fd = new FormData();
    fd.set("mb", mb); if (t) fd.set("t", t); fd.set("slip", file);
    const res = await fetch("/api/join/slip", { method: "POST", body: fd }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (res?.ok && data?.ok) return router.push(`/join/rejected/${mb}${q}`);
    setError(data?.error ?? "ส่งไม่สำเร็จ กรุณาลองใหม่"); setBusy(false);
  };

  if (!allowed) return (
    <div className="flex flex-col gap-4" style={{ padding: "24px 20px 0" }}>
      <p className="m-0">ทีมงานตรวจสลิปของคุณแล้ว ไม่ต้องส่งใหม่</p>
      <Link href={`/join/profile/${mb}${q}`} style={ctaStyle} className="hover:text-[#1b130b]">ไปที่โปรไฟล์ของฉัน</Link>
    </div>
  );

  return (
    <>
      <div className="flex flex-col md:grid md:grid-cols-2 md:items-start" style={{ padding: "16px 20px 0", gap: 20 }}>
        {reason && (
          <div className="md:col-span-2 rounded-2xl text-[14px]" style={{ padding: "12px 16px", background: "rgba(217,58,58,.14)", color: "#ffb3bd" }}>
            <b className="font-semibold">ทีมงานแจ้ง:</b> {reason}
          </div>
        )}
        {!promptPayPayload(promptPayId, amount) ? <div className="flex flex-col gap-3 rounded-2xl bg-[#251d1b]" style={{ padding: 20 }}><BankTransfer amount={amount} /><span className="text-[12.5px] font-light text-[#b5a596]">ถ้าโอนแล้ว ไม่ต้องโอนซ้ำ · แนบสลิปเดิมที่ชัดเจนได้เลย</span></div> :
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-[#251d1b]" style={{ padding: 20 }}>
          <div className="flex justify-between w-full text-[14px]"><span className="text-[#e8c472] font-semibold">PromptPay</span><span>ยอด <b className="text-[#e8c472]">{baht(amount)}</b></span></div>
          <div className="rounded-xl bg-white p-2">
            {qr ? <img src={qr} alt={`QR พร้อมเพย์ ยอด ${baht(amount)}`} width={175} height={175} className="w-[175px] h-[175px] block" /> : <div className="w-[175px] h-[175px]" />}
          </div>
          <span className="text-[13px] font-light text-[#d9c9b4]">ชื่อบัญชี {accountName}</span>
          <span className="text-[12.5px] font-light text-[#b5a596] text-center">ถ้าโอนแล้ว ไม่ต้องโอนซ้ำ · แนบสลิปเดิมที่ชัดเจนได้เลย</span>
        </div>}
        <label className="rounded-2xl bg-[#251d1b] flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden text-center" style={{ padding: url ? 0 : 20, minHeight: 260 }}>
          {url ? <img src={url} alt="สลิปที่แนบ" className="w-full max-h-[420px] object-contain" /> : <>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>
            <span className="text-[15px] font-semibold">แตะเพื่อแนบสลิป</span>
            <span className="text-[13px] font-light text-[#d9c9b4]">JPG / PNG ไม่เกิน 5MB</span>
          </>}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      </div>
      <BottomBar>
        {error && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{error}</p>}
        <button type="button" onClick={submit} disabled={busy} style={{ ...ctaStyle, opacity: busy ? 0.6 : 1 }}>{busy ? "กำลังส่ง…" : "ส่งสลิปให้ทีมงานตรวจ"}</button>
      </BottomBar>
    </>
  );
}
