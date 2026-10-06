"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { BANK } from "@/lib/join/config";
import { resizeImage, dataUrlToFile } from "@/lib/join/form";
import { promptPayPayload } from "@/lib/join/promptpay";
import { PARTNER_PACKAGES, baht, type PartnerPackageKey } from "@/lib/partner/config";

// ชำระค่าแพ็กเกจพาร์ทเนอร์: QR พร้อมเพย์ฝังยอด (เหมือน /join/pay) / โอนผ่านบัญชี + แนบสลิป
// token = ผู้สมัครใหม่ (ยังไม่ล็อกอิน); ไม่มี token = ใช้เซสชันพาร์ทเนอร์
export function PartnerPayBox({ pkg, token, onDone }: { pkg: PartnerPackageKey; token?: string; onDone: (invoice: string) => void }) {
  const price = PARTNER_PACKAGES[pkg].price;
  const hasQr = !!BANK.qrImage || !!promptPayPayload(BANK.promptPayId, 1);
  const [method, setMethod] = useState<"qr" | "transfer">(hasQr ? "qr" : "transfer");
  const [qr, setQr] = useState("");
  const [slip, setSlip] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setQr("");
    if (price == null) return;
    const payload = promptPayPayload(BANK.promptPayId, price);
    if (payload) QRCode.toDataURL(payload, { margin: 1, width: 480, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(""));
  }, [price]);

  if (price == null) return <p className="text-sm text-ink-300">แพ็กเกจ {PARTNER_PACKAGES[pkg].label} กรุณาติดต่อทีมงานเพื่อเสนอราคา</p>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(BANK.accountNo.replace(/\D/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  const onSlip = async (file?: File) => {
    setErr("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr("รับเฉพาะไฟล์รูปภาพ (JPG/PNG)");
    setSlip(await resizeImage(file, 1400, 0.85));
  };
  const submit = async () => {
    if (!slip) return setErr("แนบสลิปการโอนก่อน");
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("package", pkg);
      fd.append("method", method);
      if (token) fd.append("token", token);
      fd.append("slip", await dataUrlToFile(slip, "slip.jpg"));
      const res = await fetch("/api/partner/purchase", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; invoice_no?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "ส่งข้อมูลไม่สำเร็จ");
      onDone(data.invoice_no ?? "");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-baseline">
        <span className="text-sm text-ink-300">ยอดชำระ · {PARTNER_PACKAGES[pkg].label}</span>
        <span className="font-display text-3xl font-bold text-gold-300">฿{baht(price)}</span>
      </div>

      <div className={`grid gap-2 mt-4 ${hasQr ? "grid-cols-2" : "grid-cols-1"}`} role="radiogroup" aria-label="ช่องทางชำระ">
        {(hasQr ? ([["qr", "สแกน QR Code"], ["transfer", "โอนผ่านบัญชี"]] as const) : ([["transfer", "โอนผ่านบัญชี"]] as const)).map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={method === k} onClick={() => setMethod(k)}
            className={`min-h-12 rounded-full border text-sm font-medium ${method === k ? "border-gold-500 bg-gold-500/10 text-gold-300" : "border-ink-600"}`}>{l}</button>
        ))}
      </div>

      <div className="rounded-3xl border border-ink-600 bg-ink-800/60 p-5 mt-3">
        {method === "qr" ? (
          <div className="flex flex-col items-center">
            <div className="w-full max-w-[260px] rounded-3xl bg-white overflow-hidden text-[#1a1206]">
              <div className="bg-[#113566] text-white text-center py-2.5 text-[13px] font-semibold tracking-wide">THAI QR PAYMENT · พร้อมเพย์</div>
              <div className="p-4 flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {qr ? <img src={qr} alt={`QR พร้อมเพย์ ยอด ${price} บาท`} className="w-full aspect-square" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : BANK.qrImage ? <img src={BANK.qrImage} alt="QR ชำระเงิน" className="w-full aspect-square" />
                  : <div className="w-full aspect-square grid place-items-center text-sm text-ink-400">กำลังสร้าง QR…</div>}
                <p className="text-[13px] mt-2 font-medium">{BANK.accountName}</p>
                <p className="font-display text-2xl font-bold mt-1">฿{price.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <p className="text-[13px] text-ink-300 mt-3 text-center leading-relaxed">สแกนด้วยแอปธนาคารใดก็ได้ ยอดเงินขึ้นให้อัตโนมัติ<br />แล้วแคปสลิปมาแนบด้านล่าง</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3"><span className="text-ink-300">ธนาคาร</span><span className="text-right">{BANK.bank}</span></div>
            <div className="flex justify-between gap-3"><span className="text-ink-300">ชื่อบัญชี</span><span className="text-right">{BANK.accountName}</span></div>
            <div className="flex items-center justify-between gap-3 mt-2 rounded-2xl bg-ink-900/60 px-4 py-3">
              <span className="font-display text-xl tracking-wider">{BANK.accountNo}</span>
              <button type="button" onClick={copy} className="btn-ghost h-10 px-4 text-sm shrink-0">{copied ? "✓ คัดลอกแล้ว" : "คัดลอก"}</button>
            </div>
          </div>
        )}
      </div>

      <p className="text-sm text-ink-300 mt-5 mb-2">แนบหลักฐานการโอนเงิน (สลิป)</p>
      <label className="flex items-center gap-4 rounded-3xl border border-dashed border-ink-500 p-4 cursor-pointer hover:border-gold-500">
        {slip
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={slip} alt="สลิปที่แนบ" className="w-20 h-28 rounded-xl object-cover" />
          : <span className="w-20 h-28 rounded-xl bg-ink-800 grid place-items-center text-ink-400 text-3xl">+</span>}
        <span className="text-sm text-ink-300">{slip ? "แตะเพื่อเปลี่ยนสลิป" : "แตะเพื่อเลือกรูปสลิป"}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onSlip(e.target.files?.[0])} />
      </label>

      {err && <p role="alert" className="text-sm text-crimson-300 mt-4">{err}</p>}
      <button type="button" onClick={submit} disabled={busy} className="btn-crimson w-full h-14 mt-5 font-display font-semibold text-lg">
        {busy ? "กำลังส่งข้อมูล…" : "ยืนยันการชำระเงิน"}
      </button>
      <p className="text-xs text-ink-400 text-center mt-3">ทีมงานตรวจสลิปภายใน 24 ชม.</p>
    </div>
  );
}
