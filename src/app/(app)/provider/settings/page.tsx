"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Toast, baht } from "@/components/ui";
import { BANKS } from "@/lib/categories";
import { Toggle } from "../_components/toggle";

const QUICK = { th: ["กำลังเดินทาง ถึงใน 15 นาทีครับ", "ขอบคุณที่ใช้บริการครับ", "ตอนนี้ติดงาน จะตอบกลับโดยเร็วครับ"], en: ["On my way, 15 min", "Thanks for booking!", "Busy now, will reply soon"] };

export default function ProviderSettingsPage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const [auto, setAuto] = useState(true);
  const [msg, setMsg] = useState(th ? "สวัสดีครับ ขณะนี้กำลังให้บริการ จะตอบกลับภายใน 30 นาทีครับ" : "Hi! I'm with a client now, will reply within 30 min.");
  const [accounts, setAccounts] = useState([{ bank: "kbank", no: "xxx-x-x4821", primary: true }, { bank: "scb", no: "xxx-x-x0917", primary: false }]);
  const [slipOk, setSlipOk] = useState(false);
  const [toast, setToast] = useState("");
  const say = (s: string) => { setToast(s); setTimeout(() => setToast(""), 2000); };

  return (
    <>
      <TopBar back="/provider" title={th ? "ตั้งค่าหมอ" : "Provider settings"} />
      <div className="px-4 py-4 space-y-4 pb-8">
        <Link href="/provider/kyc-rejected" className="glass glass-hover rounded-3xl p-4 flex items-center gap-3 border-crimson-500/30">
          <span className="w-11 h-11 rounded-2xl grid place-items-center text-xl bg-crimson-600/15 shrink-0">🪪</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{th ? "สถานะ KYC" : "KYC status"}</p>
            <p className="text-xs text-ink-400">{th ? "ต้องส่งเอกสารเพิ่ม 1 รายการ" : "1 item needs resubmission"}</p>
          </div>
          <span className="chip chip-red shrink-0">{th ? "แก้ไข" : "Fix"}</span>
        </Link>

        <div className="glass rounded-3xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{th ? "ตอบกลับอัตโนมัติ" : "Auto-reply"}</p>
              <p className="text-xs text-ink-400">{th ? "ส่งเมื่อคุณกำลังให้บริการ" : "Sent while you are on a job"}</p>
            </div>
            <Toggle on={auto} onChange={setAuto} label={th ? "ตอบกลับอัตโนมัติ" : "Auto-reply"} />
          </div>
          {auto && (
            <>
              <textarea value={msg} onChange={(e) => setMsg(e.target.value)} className="input-dark h-20 resize-none w-full" aria-label={th ? "ข้อความ" : "Message"} />
              <p className="text-xs text-ink-400">{th ? "ข้อความด่วน (แตะเพื่อใช้)" : "Quick replies (tap to use)"}</p>
              <div className="flex flex-wrap gap-2">
                {QUICK[th ? "th" : "en"].map((q) => (
                  <button key={q} onClick={() => setMsg(q)} className="chip h-9 px-3 text-left">{q}</button>
                ))}
              </div>
              <button onClick={() => say(th ? "บันทึกข้อความแล้ว" : "Message saved")} className="btn-ghost w-full h-10 rounded-full text-sm">{th ? "บันทึกข้อความ" : "Save message"}</button>
            </>
          )}
        </div>

        <div>
          <h2 className="section-title mb-2">{th ? "บัญชีรับเงิน" : "Payout accounts"}</h2>
          <div className="glass rounded-3xl divide-y divide-white/5 overflow-hidden">
            {accounts.map((a, i) => {
              const b = BANKS.find((x) => x.code === a.bank);
              return (
                <div key={a.no} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-9 h-9 rounded-full shrink-0" style={{ background: b?.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{th ? b?.name : b?.en}</p>
                    <p className="text-[11px] text-ink-400">{a.no}</p>
                  </div>
                  {a.primary ? <span className="chip chip-gold shrink-0">{th ? "หลัก" : "Primary"}</span> : (
                    <button onClick={() => { setAccounts(accounts.map((x, j) => ({ ...x, primary: j === i }))); say(th ? "ตั้งเป็นบัญชีหลักแล้ว" : "Set as primary"); }}
                      className="min-h-9 px-2 text-xs text-gold-600 shrink-0">{th ? "ตั้งเป็นหลัก" : "Make primary"}</button>
                  )}
                </div>
              );
            })}
            <button onClick={() => say(th ? "เพิ่มบัญชีได้ในขั้นตอนสมัคร (ขั้น 3)" : "Add accounts in the apply flow (step 3)")} className="w-full px-4 py-3 text-sm text-left text-gold-600">+ {th ? "เพิ่มบัญชี" : "Add account"}</button>
          </div>
        </div>

        <div className="glass rounded-3xl p-4">
          <p className="font-semibold text-sm">{th ? "เงินมัดจำประกันงาน" : "Security deposit"}</p>
          <p className="text-xs text-ink-400 mt-1">{th ? `โอนแล้ว ${baht(500)} · 28/09 10:42 · สลิป #TX88231` : `Transferred ${baht(500)} · 28/09 10:42 · slip #TX88231`}</p>
          <button onClick={() => { setSlipOk(true); say(th ? "ยืนยันสลิปแล้ว รอตรวจสอบ" : "Slip confirmed, pending review"); }} disabled={slipOk}
            className="btn-crimson w-full h-11 mt-3 text-sm font-semibold">{slipOk ? (th ? "ยืนยันแล้ว ✓" : "Confirmed ✓") : th ? "ยืนยันสลิปมัดจำ" : "Confirm deposit slip"}</button>
        </div>
      </div>
      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
