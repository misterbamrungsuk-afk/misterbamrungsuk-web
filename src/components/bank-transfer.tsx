"use client";

import { useState } from "react";
import { BANK } from "@/lib/join/config";

/** โอนเข้าบัญชีธนาคาร (ใช้แทน QR เมื่อยังไม่มีพร้อมเพย์ที่ใช้ได้ · BANK.promptPayId ว่าง) — เลขบัญชี + ยอด พร้อมปุ่มคัดลอก */
export function BankTransfer({ amount }: { amount: number }) {
  const [copied, setCopied] = useState("");
  const copy = async (k: string, v: string) => {
    try { await navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(""), 1600); } catch { /* เครื่องไม่ให้คัดลอก → ผู้ใช้ลากเลือกเองได้ */ }
  };
  const btn = "shrink-0 min-h-9 px-3 rounded-full text-[13px] font-semibold";
  return (
    <div data-bank-transfer className="w-full flex flex-col gap-3 text-[#f3ead9]">
      <div className="text-[14px] font-semibold text-[#e8c472]">โอนเข้าบัญชีธนาคาร</div>
      <div className="flex justify-between gap-3 text-[14px]"><span className="text-[#b5a596]">ธนาคาร</span><span className="text-right">{BANK.bank}</span></div>
      <div className="flex justify-between gap-3 text-[14px]"><span className="text-[#b5a596]">ชื่อบัญชี</span><span className="text-right">{BANK.accountName}</span></div>
      <div className="flex items-center justify-between gap-3 rounded-xl" style={{ padding: "10px 12px", background: "rgba(232,196,114,0.12)" }}>
        <span className="flex flex-col"><span className="text-[12px] text-[#b5a596]">เลขบัญชี</span><span className="font-semibold text-[22px] tracking-[1px] select-all" style={{ fontVariantNumeric: "tabular-nums" }}>{BANK.accountNo}</span></span>
        <button type="button" onClick={() => copy("acc", BANK.accountNo.replace(/\D/g, ""))} className={btn} style={{ background: "#e8c472", color: "#1b130b" }}>{copied === "acc" ? "คัดลอกแล้ว ✓" : "คัดลอก"}</button>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl" style={{ padding: "10px 12px", background: "rgba(232,196,114,0.12)" }}>
        <span className="flex flex-col"><span className="text-[12px] text-[#b5a596]">ยอดที่ต้องโอน</span><span className="font-semibold text-[22px] text-[#e8c472] select-all" style={{ fontVariantNumeric: "tabular-nums" }}>{amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span></span>
        <button type="button" onClick={() => copy("amt", amount.toFixed(2))} className={btn} style={{ background: "rgba(232,196,114,0.2)", color: "#e8c472" }}>{copied === "amt" ? "คัดลอกแล้ว ✓" : "คัดลอก"}</button>
      </div>
      <p className="m-0 text-[12.5px] text-[#b5a596] font-light leading-[1.6]">โอนยอดให้ตรง แล้วแนบสลิปด้านล่าง · ระบบตรวจสลิปอัตโนมัติ</p>
    </div>
  );
}
