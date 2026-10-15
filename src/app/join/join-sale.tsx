"use client";
/* eslint-disable @next/next/no-img-element */

// หน้า sale รับสมัคร Part-Time (ตามบอร์ด Join บน canvas "sale page and register")
// มือถือ = คอลัมน์เดียว · md = การ์ด 2 สายวางคู่ · lg = hero แบ่งซ้ายข้อความ / ขวาโปสเตอร์
import { useState } from "react";
import { Badge, Button, Container, Icon, Shell } from "@/components/mb/ui";
import { EARNINGS, FAQ, LOOKING_FOR, PACKAGES, PERKS, SALE_CARDS, TIMELINE, type PackageKey } from "@/lib/join/config";

const fmt = (n: number) => n.toLocaleString("en-US");

const THEME: Record<PackageKey, { bg: string; sh: string; kc: string }> = {
  A: { bg: "linear-gradient(160deg, #4a3a22, #2c2216)", sh: "0 0 0 4px rgba(168,123,31,.18), 0 12px 28px rgba(168,123,31,.25)", kc: "#e6d6c4" },
  B: { bg: "linear-gradient(160deg, #6a1a28, #3a0d16)", sh: "0 0 0 4px rgba(232,196,114,.18), 0 14px 32px rgba(200,16,46,.35)", kc: "#f0d6d0" },
};
const ORDER: PackageKey[] = ["B", "A"];

export type Seats = { left: number; quota: number; cohort: string; closed: boolean };

export function JoinSalePage({ poster, seats }: { poster: string; seats: Seats }) {
  const [pick, setPick] = useState<PackageKey>("B");
  const h2 = "mb-h text-[20px] md:text-[24px]";

  return (
    <Shell>
      <Container className="pt-5 md:pt-8 flex flex-col gap-7 md:gap-10">
        {/* Hero */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-stretch">
          <div className="rounded-[18px] px-[22px] pt-10 pb-[34px] md:px-10 md:py-14 flex flex-col justify-center"
            style={{ background: `linear-gradient(180deg, rgba(79,22,34,.82), rgba(42,13,19,.96)), url(/brand/extra.jpg) 60% 30%/cover` }}>
            <div className="text-[11px] font-semibold tracking-[2px] text-mb-gold">PART TIME</div>
            <h1 className="mb-h mt-2.5 mb-1.5 text-[30px] leading-[1.25] md:text-[40px]">เพื่อนกินเที่ยว Mister Bamrungsuk</h1>
            <p className="m-0 text-[15px] md:text-[17px] text-[#e6d6c4]">งานพาร์ทไทม์ เลือกวันเวลาเอง</p>
            <div className="hidden lg:flex gap-3 mt-8 max-w-[420px]">
              <Button href="#packages">เลือกสายงานและสมัคร</Button>
              {EARNINGS.show && <Button href="/join/earnings" variant="secondary">ดูรายได้</Button>}
            </div>
          </div>
          <img src={poster} alt="โปสเตอร์รับสมัคร Part Time Mister Bamrungsuk รอบ 20 ต.ค. – 10 พ.ย." className="hidden lg:block w-full aspect-[3/4] object-cover rounded-[18px]" />
        </section>

        {/* เลือกสายงาน */}
        <section id="packages" className="scroll-mt-4 flex flex-col gap-[18px]">
          <h2 className={`${h2} hidden md:block`}>เลือกสายงาน</h2>
          <div className="grid gap-[18px] md:grid-cols-2 md:gap-5" role="radiogroup" aria-label="เลือกสายงาน">
            {ORDER.map((k) => {
              const on = pick === k, P = PACKAGES[k], T = THEME[k];
              return (
                <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setPick(k)}
                  className="w-full text-left p-[18px] md:p-6 rounded-2xl flex flex-col gap-4 text-[#fff8ea] transition-all duration-300"
                  style={{ background: T.bg, boxShadow: on ? T.sh : "none", opacity: on ? 1 : 0.8, transform: on ? "none" : "scale(.98)" }}>
                  <span className="flex items-center gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full grid place-items-center bg-[rgba(243,234,217,0.08)]"><span className="w-3 h-3 rounded-full" style={{ background: on ? "#e8c472" : "transparent" }} /></span>
                    <span className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-semibold text-[18px] leading-[1.35]">{P.short}</span>
                      <span className="font-normal text-[15px] leading-[1.4] opacity-85">{P.track}</span>
                    </span>
                  </span>
                  <span className="flex flex-col gap-1.5">
                    {SALE_CARDS[k].lines.map((l) => (
                      <span key={l.k} className="flex justify-between gap-2.5"><span className="whitespace-nowrap shrink-0" style={{ color: T.kc }}>{l.k}</span><span className="font-semibold text-right min-w-0">{l.v}</span></span>
                    ))}
                  </span>
                  <span className="px-3.5 py-3 rounded-xl bg-[rgba(0,0,0,.32)] flex flex-col gap-1">
                    <span className="flex justify-between gap-2.5"><span className="text-mb-gold font-semibold">ค่าการันตี Branding</span><span className="font-bold text-[17px] text-[#fff1c9]">{fmt(P.guarantee)} บาท</span></span>
                    <span className="text-[13px] leading-relaxed font-light">รับคืนเมื่อครบ 1 ปี ถ้าไม่ทำผิดกฎบริษัทและกฎหมาย (เช่น ไม่ปฏิเสธการรับลูกค้า)</span>
                  </span>
                  <span className="flex justify-between items-baseline border-t border-[rgba(243,234,217,0.12)] pt-3 text-[14px]">
                    <span className="font-light">ยอดชำระตอนสมัคร</span><span className="font-semibold text-[16px] text-mb-gold">{fmt(P.price)} บาท</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="w-full max-w-[560px] mx-auto flex flex-col gap-[18px]">
            <a href="/join/terms" className="self-center min-h-11 inline-flex items-center text-[14px] text-mb-gold hover:underline">อ่านสัญญา</a>
            <div className="flex justify-between items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[rgba(232,196,114,0.10)] text-[13px] font-light" aria-live="polite">
              <span>{seats.closed ? "ปิดรับสมัครรอบนี้แล้ว" : `กลุ่มอบรมถัดไป · ${seats.cohort}`}</span>
              <span className="text-mb-gold font-semibold">{seats.closed ? "เต็ม" : `เหลือ ${seats.left} / ${seats.quota} ที่`}</span>
            </div>
            {EARNINGS.show && <Button href="/join/earnings" variant="secondary">ดูรายได้และส่วนแบ่ง · คำนวณรายได้ต่อเดือน</Button>}
            {seats.closed
              ? <Button disabled className="min-h-14 text-[18px] rounded-2xl mt-1.5">ปิดรับสมัครแล้ว</Button>
              : <Button href={`/join/apply?pkg=${pick}`} className="min-h-14 text-[18px] rounded-2xl mt-1.5">สมัครสาย{pick === "B" ? "นวด" : "กินเที่ยว"} · {fmt(PACKAGES[pick].price)} บาท</Button>}
            <Button href="/join/showcase" variant="text" block={false} className="self-center">ดูตัวอย่างแอปที่ลูกค้าเห็น ›</Button>
          </div>
        </section>

        {/* สิ่งที่คุณได้รับ */}
        <section className="flex flex-col gap-3.5">
          <h2 className={h2}>สิ่งที่คุณได้รับ</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
            {PERKS.map((k) => (
              <div key={k.t} className="p-3.5 md:p-5 rounded-[14px] bg-mb-surface2 flex flex-col gap-2">
                <Icon d={k.icon} size={22} className="text-mb-gold" />
                <span className="font-semibold text-[14.5px] leading-[1.4]">{k.t}</span>
                <span className="text-[13.5px] leading-normal text-mb-text2 font-light">{k.d}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-7 lg:grid-cols-2 lg:gap-10 lg:items-start">
          {/* คุณสมบัติ */}
          <section className="px-5 py-[18px] md:p-7 rounded-2xl bg-mb-surface3">
            <h2 className="mb-h text-[16px] md:text-[20px] mb-2">คุณสมบัติที่เรามองหา</h2>
            <ul className="m-0 p-0 list-none flex flex-col gap-1.5 text-[14px] md:text-[15px] leading-normal">
              {LOOKING_FOR.map((x) => (
                <li key={x} className="flex gap-2.5 items-start"><Icon d="M5 12l5 5 9-10" size={18} stroke={2.2} className="text-mb-gold mt-0.5" /><span>{x}</span></li>
              ))}
            </ul>
          </section>

          {/* กำหนดการ */}
          <section className="flex flex-col gap-[18px]">
            <h2 className={`${h2} text-center lg:text-left`}>กำหนดการ</h2>
            <ol className="m-0 pl-1 list-none flex flex-col">
              {TIMELINE.map((t, i) => (
                <li key={t.t} className="flex gap-3.5">
                  <span className="flex flex-col items-center"><span className="w-3 h-3 rounded-full bg-mb-gold mt-[7px]" />{i < TIMELINE.length - 1 && <span className="flex-1 w-0.5 bg-[rgba(232,196,114,0.35)]" />}</span>
                  <span className="pb-4 flex flex-col"><span className="text-[13px] text-mb-gold font-light">{t.d}</span><span>{t.t}</span></span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* FAQ */}
        <section className="w-full max-w-[720px] mx-auto flex flex-col">
          <h2 className={`${h2} text-center mb-1.5`}>คำถามที่พบบ่อย</h2>
          {FAQ.map((f, i) => (
            <details key={f.q} open={i === 0} className="group border-b border-[rgba(243,234,217,0.07)]">
              <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer min-h-[52px] flex justify-between items-center gap-2.5 py-3 text-[15px] font-normal">
                {f.q}<span aria-hidden className="text-mb-gold text-[20px] group-open:hidden">+</span><span aria-hidden className="text-mb-gold text-[20px] hidden group-open:inline">−</span>
              </summary>
              <div className="pb-3.5 text-[14px] font-light">{f.a}</div>
            </details>
          ))}
          <div className="mt-6 flex justify-center"><Badge tone="gold">รับจำนวนจำกัด {seats.quota} ที่ · สมัคร 20 ต.ค. – 10 พ.ย.</Badge></div>
        </section>
      </Container>
    </Shell>
  );
}
