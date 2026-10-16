"use client";

import { useState } from "react";
import Link from "next/link";
import { BOOKING_COMMISSION, PACKAGE_KEYS, PARTNER_PACKAGES, baht, type PartnerPackageKey } from "@/lib/partner/config";
import { PartnerPayBox } from "../pay-box";

// หน้าชำระแผนโปรโมทหลังสมัคร — ตามบอร์ด PartnerPay.dc.html (เลือกแผนโปรโมท → สรุปยอด → QR + สลิป → รอตรวจ)
const LINE = "rgba(240,200,90,.38)";
const PERKS = ["คลิปโปรโมท 1 คลิปลง IG & FB ของแบรนด์", "สุ่ม QC มาตรฐาน", "โปรโมทผ่านแพลตฟอร์ม Mister Bamrungsuk", 'ป้าย "ทำงานร่วมกับ Mister Bamrungsuk"'];
const NEXT = ["QC สถานที่", "ทำสัญญา", "ถ่ายคลิป", "เปิดแสดงบนแพลตฟอร์ม"];
const price = (k: PartnerPackageKey) => { const p = PARTNER_PACKAGES[k].price; return p == null ? "ติดต่อทีมงาน" : `฿${baht(p)}`; };

function Row({ n, v, muted = true }: { n: string; v: string; muted?: boolean }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-4">
      <span className={muted ? "shrink-0 whitespace-nowrap text-[#cdbfb3]" : "min-w-0 [overflow-wrap:anywhere]"}>{n}</span>
      <span className={muted ? "min-w-0 text-right [overflow-wrap:anywhere]" : "shrink-0 whitespace-nowrap text-right"}>{v}</span>
    </div>
  );
}

export function SignupPay({ token, business, type, initial, hasPassword }: { token: string; business: string; type: string; initial: PartnerPackageKey; hasPassword: boolean }) {
  const [pkg, setPkg] = useState<PartnerPackageKey>(initial);
  const [invoice, setInvoice] = useState("");
  const [round, setRound] = useState(0);
  const t = encodeURIComponent(token);

  if (invoice)
    return (
      <div className="flex flex-col items-center gap-3 pt-1.5 text-center">
        <div className="grid h-[84px] w-[84px] place-items-center rounded-full border-2 border-[#f0c75a] text-[#f0c75a]">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        </div>
        <div className="font-lux text-[20px] font-semibold text-[#f0c75a]">ได้รับสลิปแล้ว</div>
        <p className="m-0 text-[13px] text-[#cdbfb3]">ทีมงานตรวจภายใน 24 ชม. แล้วติดต่อนัด QC สถานที่ · ใบแจ้งหนี้ {invoice}</p>
        <div className="flex w-full flex-col gap-2.5 rounded-2xl border bg-[#241717] p-3.5 text-left" style={{ borderColor: LINE }}>
          <div className="text-[12px] text-[#cdbfb3]">ขั้นตอนถัดไป</div>
          {NEXT.map((s, i) => (
            <div key={s} className="flex min-w-0 items-center gap-2.5 text-[13px]">
              <span className="font-lux grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border border-[rgba(245,210,110,.85)] text-[13px] text-[#ffd76a]">{i + 1}</span>
              <span className="min-w-0">{s}</span>
            </div>
          ))}
        </div>
        <Link href={`/partner/done?t=${t}`} className="btn-red-lux font-lux grid h-[52px] w-full place-items-center rounded-[14px] text-[15px] font-semibold text-white no-underline">ดูสถานะการสมัคร</Link>
        <Link href={hasPassword ? "/partner/portal" : `/partner/register?t=${t}`} className="p-2 text-[13px] text-[#ffd76a]">
          {hasPassword ? "เข้าสู่พอร์ทัลพาร์ทเนอร์" : "ตั้งรหัสผ่าน / เข้าสู่ระบบพอร์ทัล"}
        </Link>
        <button type="button" onClick={() => { setInvoice(""); setRound((r) => r + 1); }} className="h-12 w-full rounded-[14px] border bg-[#241717] text-[14px] font-semibold text-[#ffd76a]" style={{ borderColor: LINE }}>ส่งสลิปใหม่</button>
        <Link href="/partner" className="p-2 text-[13px] text-[#ffd76a]">กลับหน้าพาร์ทเนอร์</Link>
      </div>
    );

  const sel = PARTNER_PACKAGES[pkg];
  return (
    <>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="แผนโปรโมท">
        {PACKAGE_KEYS.map((k) => {
          const x = PARTNER_PACKAGES[k];
          const on = pkg === k;
          return (
            <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setPkg(k)}
              className="flex min-h-[84px] w-full min-w-0 flex-col items-center justify-center gap-1 rounded-[14px] p-2 text-center text-[#f6efe4]"
              style={{ border: `1px solid ${on ? "#f0c75a" : LINE}`, background: on ? "rgba(240,200,90,.16)" : "#241717" }}>
              {x.badge && <span className="rounded-full bg-[#f0c75a] px-2 py-0.5 text-[11px] font-semibold leading-[1.3] text-[#0e0a0a]">{x.badge}</span>}
              <span className="text-[12px] leading-[1.4] text-[#cdbfb3]">แผนโปรโมท {x.label}</span>
              <span className="font-lux text-[18px] font-semibold text-[#ffd76a]">{price(k)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border bg-[#241717] p-3.5 text-[13px] leading-[1.5]" style={{ borderColor: LINE }}>
        <div className="flex flex-col gap-2">
          <Row n="ธุรกิจ" v={business} />
          <Row n="ประเภท" v={type} />
          <Row n="แผนโปรโมท" v={sel.label} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="text-[12px] text-[#cdbfb3]">รายการ</div>
          <Row muted={false} n={`แผนโปรโมทพาร์ทเนอร์ ${sel.label}`} v={price(pkg)} />
          <Row muted={false} n="ค่าป้ายแบรนด์" v="[รอกำหนด]" />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="text-[12px] text-[#cdbfb3]">สิ่งที่ได้</div>
          <ul className="m-0 flex flex-col gap-1 pl-4">{PERKS.map((p) => <li key={p} className="[overflow-wrap:anywhere]">{p}</li>)}</ul>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="text-[12px] text-[#cdbfb3]">การหักต่อ booking</div>
          <div>หัก {BOOKING_COMMISSION}% ต่อ booking ที่มาจากแพลตฟอร์ม</div>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t pt-4" style={{ borderColor: LINE }}>
          <span>ยอดชำระ</span>
          <span className="font-lux whitespace-nowrap text-right text-[24px] font-semibold text-[#f0c75a]">{price(pkg)}</span>
        </div>
      </div>

      <PartnerPayBox key={`${pkg}-${round}`} pkg={pkg} token={token} onDone={setInvoice} requireAgree showAmount={false} />
    </>
  );
}
