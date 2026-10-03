"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { baht } from "./ui";
import { BANK } from "@/lib/join/config";
import { promptPayPayload } from "@/lib/join/promptpay";

/** การ์ด QR พร้อมเพย์ฝังยอด (สไตล์เดียวกับหน้า checkout) */
export default function PromptPayCard({ amount }: { amount: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    const payload = promptPayPayload(BANK.promptPayId, amount);
    if (payload) QRCode.toDataURL(payload, { margin: 1, width: 440 }).then(setSrc).catch(() => setSrc(""));
  }, [amount]);
  return (
    <div className="w-full max-w-[260px] rounded-2xl bg-white overflow-hidden text-[#1a1206]">
      <div className="bg-[#113566] text-white text-center py-2 text-[12px] font-semibold tracking-wide">THAI QR PAYMENT · พร้อมเพย์</div>
      <div className="p-3 flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt={`QR พร้อมเพย์ ${amount} บาท`} className="w-full aspect-square" /> : <div className="w-full aspect-square grid place-items-center text-sm text-ink-400">…</div>}
        <p className="text-[12px] mt-1.5 font-medium">{BANK.accountName}</p>
        <p className="font-display text-xl font-bold">{baht(amount)}</p>
      </div>
    </div>
  );
}
