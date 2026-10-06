"use client";

import { useState } from "react";

// ผู้ให้บริการช่วยขายแพ็กเกจสมาชิก (5/10 ครั้ง) ให้ลูกค้า — ลิงก์ /membership พร้อมรหัสแนะนำ ?ref=<providerId>
export function UpsellCard({ providerId, th }: { providerId: string; th: boolean }) {
  const [copied, setCopied] = useState(false);
  const path = `/membership?ref=${encodeURIComponent(providerId)}`;

  const share = async () => {
    const url = `${window.location.origin}${path}`;
    const text = th ? "แพ็กเกจสมาชิก 5/10 ครั้ง คุ้มกว่าจองทีละครั้ง" : "Membership packages (5/10 sessions)";
    try {
      if (navigator.share) await navigator.share({ title: "Mister Bamrungsuk", text, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch {}
  };

  return (
    <div className="glass rounded-2xl p-4 animate-rise">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">💎 {th ? "แนะนำแพ็กเกจให้ลูกค้า" : "Recommend a package"}</p>
        <span className="chip chip-gold">{th ? "5 / 10 ครั้ง" : "5 / 10 sessions"}</span>
      </div>
      <p className="text-xs text-ink-400 mt-1">{th ? "ลูกค้าประทับใจ? ให้สแกน/เปิดลิงก์สมัครแพ็กเกจ ระบบผูกรหัสแนะนำของคุณอัตโนมัติ" : "Happy customer? Share the link — your referral code is attached."}</p>
      <p className="text-xs mt-2">{th ? "รหัสแนะนำ" : "Referral code"}: <b className="text-gold-400">{providerId}</b></p>
      <div className="flex gap-2 mt-3">
        <a href={path} target="_blank" rel="noopener" className="btn-ghost rounded-xl flex-1 py-2.5 text-sm text-center">{th ? "เปิดให้ลูกค้าดู" : "Show customer"}</a>
        <button onClick={share} className="btn-crimson rounded-xl flex-1 py-2.5 text-sm font-bold">{copied ? (th ? "คัดลอกแล้ว ✓" : "Copied ✓") : th ? "แชร์ลิงก์" : "Share link"}</button>
      </div>
      <p className="text-[10px] text-ink-500 mt-2">{th ? "ค่าคอมมิชชันจากยอดขายแพ็กเกจ: [รอกำหนดอัตรา] — จ่ายรวมกับรายได้รอบถัดไป" : "Commission on package sales: [rate TBD] — paid with next payout"}</p>
    </div>
  );
}
