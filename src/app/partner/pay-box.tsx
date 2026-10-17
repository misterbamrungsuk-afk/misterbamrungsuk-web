"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { BANK } from "@/lib/join/config";
import { resizeImage, dataUrlToFile } from "@/lib/join/form";
import { promptPayPayload } from "@/lib/join/promptpay";
import { BOOKING_COMMISSION, PARTNER_PACKAGES, baht, type PartnerPackageKey } from "@/lib/partner/config";

// ชำระค่าแผนโปรโมทพาร์ทเนอร์: QR พร้อมเพย์ฝังยอด (หมดอายุ 15 นาที กดสร้างใหม่ได้) + แนบสลิป — ตามบอร์ด PartnerPay.dc.html
// token = ผู้สมัครใหม่ (ยังไม่ล็อกอิน); ไม่มี token = ใช้เซสชันพาร์ทเนอร์
// requireAgree = แสดงช่องยอมรับเงื่อนไข (หน้าสมัคร) · showAmount = แสดงยอดชำระในกล่อง (พอร์ทัล)
const QR_TTL = 15 * 60;
const LINE = "rgba(240,200,90,.38)";

export function PartnerPayBox({ pkg, token, onDone, requireAgree = false, showAmount = true }: {
  pkg: PartnerPackageKey; token?: string; onDone: (invoice: string) => void; requireAgree?: boolean; showAmount?: boolean;
}) {
  const price = PARTNER_PACKAGES[pkg].price;
  const [qr, setQr] = useState("");
  const [sec, setSec] = useState(QR_TTL);
  const [slip, setSlip] = useState("");
  const [slipName, setSlipName] = useState("");
  const [agree, setAgree] = useState(!requireAgree);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [slipErr, setSlipErr] = useState("");

  useEffect(() => {
    setQr("");
    if (price == null) return;
    const payload = promptPayPayload(BANK.promptPayId, price);
    if (payload) QRCode.toDataURL(payload, { margin: 1, width: 480, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(""));
  }, [price]);

  useEffect(() => {
    const t = setInterval(() => setSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  if (price == null) return <p className="text-sm text-[#cdbfb3]">แผนโปรโมท {PARTNER_PACKAGES[pkg].label} กรุณาติดต่อทีมงานเพื่อเสนอราคา</p>;

  const hasQr = !!qr || !!BANK.qrImage;
  const expired = sec === 0;
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  const ok = !!slip && agree && !busy;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(BANK.accountNo.replace(/\D/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  const onSlip = async (file?: File) => {
    setSlipErr("");
    setErr("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setSlipErr("รับเฉพาะไฟล์รูปภาพ (JPG/PNG)");
    try { setSlip(await resizeImage(file, 1400, 0.85)); setSlipName(file.name); } catch (e) { setSlipErr((e instanceof Error ? e.message : "ไฟล์นี้เปิดเป็นรูปไม่ได้ · เลือกรูป JPG/PNG อีกครั้ง")); }
  };
  const submit = async () => {
    if (!slip) return setSlipErr("แนบสลิปการโอนก่อน");
    if (!agree) return setErr("กรุณายอมรับเงื่อนไขพาร์ทเนอร์");
    setBusy(true);
    setErr("");
    setSlipErr("");
    try {
      const fd = new FormData();
      fd.append("package", pkg);
      fd.append("method", hasQr ? "qr" : "transfer");
      if (token) fd.append("token", token);
      fd.append("slip", await dataUrlToFile(slip, "slip.jpg"));
      const res = await fetch("/api/partner/purchase", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; invoice_no?: string; fields?: string[] };
      if (!res.ok || !data.ok) {
        const msg = data.error || "ส่งข้อมูลไม่สำเร็จ";
        if (data.fields?.includes("slip")) setSlipErr(msg); else setErr(msg);
        return;
      }
      onDone(data.invoice_no ?? "");
    } catch (e) {
      setErr((e as Error).message || "เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      {showAmount && (
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[13px] text-[#cdbfb3]">ยอดชำระ · {PARTNER_PACKAGES[pkg].label}</span>
          <span className="font-lux text-[24px] font-semibold text-[#f0c75a]">฿{baht(price)}</span>
        </div>
      )}

      <div className="flex w-full min-w-0 flex-col items-center gap-2 rounded-[18px] border border-[rgba(245,210,110,.85)] bg-[#241717] p-4">
        {hasQr ? (
          <>
            <div className="flex w-full flex-wrap justify-between gap-2 text-[12px]">
              <span className="font-semibold text-[#ffd76a]">PromptPay</span>
              <span className="text-[#cdbfb3]">QR หมดอายุใน <b className="font-lux text-[14px]" style={{ color: sec < 120 ? "#ef6b7b" : "#ffd76a" }}>{mm}:{ss}</b></span>
            </div>
            <div className="rounded-xl bg-white p-2.5" style={{ opacity: expired ? 0.2 : 1 }}>
              <img src={qr || BANK.qrImage} alt={`QR พร้อมเพย์ ยอด ${price} บาท`} className="block h-[175px] w-[175px]" />
            </div>
            <div className="text-center text-[12px] text-[#cdbfb3] [overflow-wrap:anywhere]">{BANK.accountName} · บัญชีรับเงิน {BANK.accountNo}</div>
            {expired && (
              <button type="button" onClick={() => setSec(QR_TTL)} className="h-12 w-full rounded-[14px] border bg-[#241717] text-[14px] font-semibold text-[#ffd76a]" style={{ borderColor: LINE }}>สร้าง QR ใหม่</button>
            )}
          </>
        ) : (
          <div className="flex w-full flex-col gap-2 text-[13px]">
            <div className="flex justify-between gap-3"><span className="text-[#cdbfb3]">ธนาคาร</span><span className="text-right">{BANK.bank}</span></div>
            <div className="flex justify-between gap-3"><span className="text-[#cdbfb3]">ชื่อบัญชี</span><span className="text-right">{BANK.accountName}</span></div>
            <div className="mt-1 flex items-center justify-between gap-3 rounded-xl bg-[#130e0e] px-3.5 py-3">
              <span className="font-lux text-[18px] tracking-wider">{BANK.accountNo}</span>
              <button type="button" onClick={copy} className="h-10 shrink-0 rounded-[12px] border px-3.5 text-[13px] text-[#ffd76a]" style={{ borderColor: LINE }}>{copied ? "✓ คัดลอกแล้ว" : "คัดลอก"}</button>
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="m-0 mb-1.5 text-[12px] text-[#cdbfb3]">อัปโหลดสลิปการโอน</p>
        <label className="flex min-h-[84px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-[14px] bg-[#241717] px-3 text-[13px]"
          style={{ border: `1.5px dashed ${slipErr ? "#ef6b7b" : slip ? "#4cc283" : LINE}`, color: slip ? "#7fd6a3" : "#cdbfb3" }}>
          {slip
            ? <img src={slip} alt="สลิปที่แนบ" className="h-16 w-12 shrink-0 rounded-md object-cover" />
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></svg>}
          <span className="min-w-0 [overflow-wrap:anywhere]">{slip ? `${slipName || "slip.jpg"} · แตะเพื่อเปลี่ยน` : "แตะเพื่อแนบรูปสลิป (JPG/PNG)"}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onSlip(e.target.files?.[0])} />
        </label>
        {slipErr && <p role="alert" className="m-0 mt-2 text-[12.5px] leading-[1.5] text-[#ef6b7b]">{slipErr}</p>}
      </div>

      {requireAgree && (
        <button type="button" role="checkbox" aria-checked={agree} onClick={() => setAgree((a) => !a)}
          className="flex w-full min-w-0 items-start gap-2.5 border-0 bg-transparent px-0 py-1 text-left text-[13px] leading-[1.5] text-[#f6efe4]">
          <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md text-[14px] font-bold text-[#0e0a0a]"
            style={{ border: `1.5px solid ${agree ? "#f0c75a" : "#5a4a4d"}`, background: agree ? "#f0c75a" : "transparent" }}>{agree ? "✓" : ""}</span>
          <span className="min-w-0">ยอมรับเงื่อนไขพาร์ทเนอร์ (QC มาตรฐานเดียวกับบำรุงสุข · หัก {BOOKING_COMMISSION}% ต่อ booking)</span>
        </button>
      )}

      {err && <p role="alert" className="m-0 text-[13px] text-[#ef6b7b]">{err}</p>}
      <button type="button" onClick={submit} disabled={!ok}
        className="btn-red-lux font-lux h-[52px] w-full rounded-[14px] text-[15px] font-semibold text-white" style={{ opacity: ok ? 1 : 0.45 }}>
        {busy ? "กำลังส่งข้อมูล…" : "ยืนยันการชำระ · ส่งสลิป"}
      </button>
    </div>
  );
}
