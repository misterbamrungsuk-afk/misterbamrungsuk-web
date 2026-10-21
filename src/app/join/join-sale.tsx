"use client";
/* eslint-disable @next/next/no-img-element */

// หน้ารับสมัคร Part Time — ถอดตามบอร์ด Join ("Part Time · หน้ารับสมัคร") ตรงตัวที่มือถือ
// md+: การ์ด 2 สายวางคู่ · สิ่งที่คุณได้รับ 4 คอลัมน์ · คุณสมบัติ + กำหนดการวางคู่
import { useState } from "react";
import Link from "next/link";
import { CONTROLLER } from "@/lib/join/legal";
import { FEE_INCLUDES, LOOKING_FOR, PACKAGES, PERKS, type PackageKey } from "@/lib/join/config";

const fmtB = (n: number) => `${n.toLocaleString("en-US")} บาท`;
const TR: Record<PackageKey, { name2: string; fee: string; lines: [string, string][]; bg: string; kc: string; sh: string }> = {
  A: { name2: "ตามความสามารถพิเศษ", fee: fmtB(PACKAGES.A.price), lines: [["การให้บริการต่อครั้ง", "3–8 ชม."]],
    bg: "linear-gradient(160deg, #4a3a22, #2c2216)", kc: "#e6d6c4", sh: "0 0 0 4px rgba(168,123,31,.18), 0 12px 28px rgba(168,123,31,.25)" },
  B: { name2: "ที่มีความสามารถในการนวด", fee: fmtB(PACKAGES.B.price), lines: [["รับฟรี", "Uniform + Oil นวด 1 ชุด"], ["การให้บริการต่อครั้ง", "3–5 ชม."]],
    bg: "linear-gradient(160deg, #6a1a28, #3a0d16)", kc: "#f0d6d0", sh: "0 0 0 4px rgba(232,196,114,.18), 0 14px 32px rgba(200,16,46,.35)" },
};
const TIMELINE: [string, string][] = [["20 ต.ค. – 10 พ.ย.", "เปิดรับสมัคร"], ["ไม่เกินต้น พ.ย.", "ประกาศกฎเกณฑ์การทำงาน"], ["ภายใน 20 พ.ย.", "อบรมกลุ่ม 1"], ["30 พ.ย.", "พร้อมเปิดให้บริการ"], ["30 พ.ย. – ต้น ธ.ค.", "อบรมกลุ่ม 2"]];
const FAQ_INVITE: [string, string] = ["คำเชิญพิเศษต่างจากสมัครปกติอย่างไร?", "ผู้ได้รับคำเชิญไม่ต้องชำระค่าสมัคร และได้ระดับ TOP ทันที แค่กรอกข้อมูลสมัคร · หลังเริ่มงาน หักเงินประกันงานเคสละ ฿500 จากรายได้ (กันหนีงาน/เทงาน) · เงินแต่ละก้อนครบ 90 วันถอนคืนได้ (ค่าธรรมเนียมถอน 3%)"];
const FAQ: [string, string][] = [
  ["ค่าสมัครรวมอะไรบ้าง คืนได้ไหม?", `รวมค่าอบรมแล้ว ได้แชร์ข้อมูลทางกฎหมายที่เกี่ยวข้องกับการทำงานและทริคมัดใจลูกค้า (เพื่อนกินเที่ยว ${fmtB(PACKAGES.A.price)} · สายนวด ${fmtB(PACKAGES.B.price)}) · ค่าสมัครไม่คืนเงินทุกกรณี`],
  ["ถ้าเริ่มงานแล้วยังไม่ค่อยมีลูกค้า?", "30 วันแรกหลังเปิดรับงาน ถ้าได้งานไม่ถึง 5 เคส ระบบให้โค้ดโปรโมทโปรไฟล์ฟรี 3 วัน ขึ้นหน้าแนะนำให้ลูกค้าเห็นก่อน"],
  ["งานนี้ทำอะไรบ้าง?", "เป็นเพื่อนร่วมกิจกรรมของลูกค้า เช่น ทานข้าว เที่ยว ดูหนัง ถ่ายรูป ไม่มีบริการทางเพศใด ๆ ทั้งสิ้น"],
  ["ไม่เคยมีประสบการณ์ สมัครได้ไหม?", "ได้ ทุกคนจะได้อบรมก่อนเริ่มรับงาน"],
  ["ต้องตรวจประวัติอะไรบ้าง?", "ยืนยันตัวตนด้วยบัตรประชาชน และยินยอมให้ตรวจประวัติอาชญากรรมก่อนเปิดบัญชี"],
];

export type Seats = { left: number; quota: number; cohort: string; closed: boolean; taken?: number };
const h2: React.CSSProperties = { margin: 0, fontWeight: 600, fontSize: 20 };

/** invite = รหัสลิงก์เชิญ (บอร์ด JoinInvite): ค่าสมัครเท่ากัน · ไม่มีแถบที่นั่ง · ปุ่ม "เริ่มสร้างโปรไฟล์" */
export function JoinSalePage({ seats, showEarnings = true, invite, group = null }: { seats: Seats; showEarnings?: boolean; invite?: string; group?: "tom" | null }) {
  const tom = group === "tom";
  const g = tom ? "&g=tom" : "";
  const looking = tom ? ["ทอมหล่อ อายุ 20–50 ปี ดูแลตัวเองสม่ำเสมอ", ...LOOKING_FOR.slice(1)] : LOOKING_FOR;
  const faq = invite ? [FAQ_INVITE, ...FAQ.slice(1)] : FAQ;
  const [pick, setPick] = useState<PackageKey>("B");
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });

  return (
    <div className="mb-v7 min-h-dvh overflow-hidden" style={{ background: "#171211", color: "#f3ead9", fontSize: 15, lineHeight: 1.7 }}>
      <div className="border-b border-[rgba(243,234,217,0.07)]" style={{ background: "#171211" }}>
        <div className="mx-auto max-w-[1200px] flex justify-between items-center" style={{ padding: "12px 16px" }}>
          <Link href="/" aria-label="Mister Bamrungsuk · หน้าแรก" className="inline-flex items-center gap-2 font-brand text-[11px] md:text-[14px]"><img src="/brand/logo.png" alt="" width={40} height={40} className="w-10 h-10 object-contain" /><span className="text-[#e8c472]">Mister Bamrungsuk</span></Link>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] flex flex-col" style={{ padding: "20px 16px 0", gap: 26 }}>
        <section className="join-hero md:min-h-[340px] md:flex md:flex-col md:justify-end md:py-14 md:px-12" style={{ padding: "40px 22px 34px", borderRadius: 18 }}>
          <div className="text-[11px] font-semibold tracking-[2px] text-[#e8c472]">{invite ? <><span className="tracking-normal text-[13px]">✦ คำเชิญพิเศษ</span> · PART TIME</> : "PART TIME"}</div>
          <h1 className="font-semibold text-[30px] md:text-[48px] leading-[1.32] text-[#f3ead9] md:max-w-[640px]" style={{ margin: "10px 0 6px" }}>{tom ? "ทอมหล่อ · เพื่อนกินเที่ยว Mister Bamrungsuk" : "เพื่อนกินเที่ยว Mister Bamrungsuk"}</h1>
          <p className="m-0 text-[15px] md:text-[18px] text-[#e6d6c4]">งานพาร์ทไทม์ เลือกวันเวลาเอง{invite ? " · คำเชิญพิเศษ: สมัครฟรี ได้ระดับ TOP" : ""}</p>
        </section>

        {/* หนุ่มหล่อ / ทอมหล่อ — สมัครแยกหมวด · ที่นั่งอบรมแยกโควตา */}
        {!invite && <nav aria-label="เลือกหมวด" className="self-center grid grid-cols-2 gap-1 rounded-full" style={{ padding: 4, background: "#251d1b" }}>
          {([["/join", "หนุ่มหล่อ", !tom], ["/join/tom", "ทอมหล่อ", tom]] as const).map(([href, label, on]) => (
            <Link key={href} href={href} aria-current={on ? "page" : undefined} data-group-tab={label} className="min-h-11 px-6 rounded-full grid place-items-center text-[15px] font-semibold" style={on ? { background: "#e8c472", color: "#1b130b" } : { color: "#e8c472" }}>{label}</Link>
          ))}
        </nav>}

        <section className="flex flex-col" style={{ gap: 18 }}>
          {/* ลิงก์เชิญพิเศษ: ไม่ต้องเลือกสาย (ทุกคนได้ TOP · ฟรี) → กดเริ่มสร้างโปรไฟล์ได้เลย */}
          {!invite && (
          <div className="grid gap-[18px] md:grid-cols-2 md:gap-6" role="radiogroup" aria-label="เลือกสายงาน">
              {(["B", "A"] as PackageKey[]).map((k) => {
                const on = pick === k, T = TR[k];
                return (
                  <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setPick(k)} className="w-full text-left flex flex-col"
                    style={{ padding: 18, borderRadius: 16, gap: 16, background: T.bg, boxShadow: on ? T.sh : "none", opacity: on ? 1 : 0.8, transform: on ? "scale(1.02)" : "scale(.98)", transition: "all .3s ease", color: "#fff8ea" }}>
                    <span className="flex items-center gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full grid place-items-center" style={{ background: "rgba(243,234,217,0.08)" }}><span className="w-3 h-3 rounded-full" style={{ background: on ? "#e8c472" : "transparent" }} /></span>
                      <span className="flex flex-col min-w-0" style={{ gap: 2 }}><span className="font-semibold text-[18px] leading-[1.35]">เพื่อนกินเที่ยว</span><span className="font-medium text-[15px] leading-[1.4]" style={{ opacity: 0.85 }}>{T.name2}</span></span>
                    </span>
                    <span className="flex flex-col gap-1.5">
                      {T.lines.map(([kk, v]) => <span key={kk} className="flex justify-between gap-[10px] text-[#fff7e8]"><span className="whitespace-nowrap shrink-0" style={{ color: T.kc }}>{kk}</span><span className="font-semibold text-right min-w-0">{v}</span></span>)}
                    </span>
                    <span className="flex flex-col gap-1 rounded-xl" style={{ padding: "12px 14px", background: "rgba(0,0,0,.32)" }}>
                      <span className="flex justify-between gap-[10px] text-[#fff7e8]"><span className="text-[#e8c472] font-semibold">ค่าสมัคร (รวมอบรม)</span><span className="font-bold text-[17px] text-[#fff1c9]" data-fee={k}>{invite ? "ฟรี" : T.fee}</span></span>
                      <span className="text-[13px] leading-[1.6] text-[#fff7e8] font-light">{FEE_INCLUDES(k).slice(1, 3).join(" · ")}<br />{invite ? "✦ คำเชิญพิเศษ: ไม่ต้องชำระ · ได้ระดับ TOP · เงินประกันงานเคสละ ฿500 (ครบ 90 วันถอนคืนได้)" : "ไม่คืนเงินทุกกรณี"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="w-full max-w-[560px] mx-auto flex flex-col" style={{ gap: 18 }}>
            <div className="self-center flex gap-5"><Link href="/join/terms" className="tap text-[14px] text-[#e8c472]">อ่านสัญญา</Link><Link href="/join/showcase" className="tap text-[14px] text-[#e8c472]">ดูหน้าตัวอย่างแอป ›</Link></div>
            {!invite && <div className="flex justify-between items-center rounded-xl text-[13px] font-light" style={{ padding: "10px 14px", background: "rgba(232,196,114,0.10)" }}>
              <span>{seats.closed ? "ปิดรับสมัครรอบนี้แล้ว" : "กลุ่มอบรม"}</span>
              <span className="text-[#e8c472] font-semibold">{seats.closed ? "เต็มแล้ว" : `เหลือ ${seats.left} ที่`}</span>
            </div>}
            {showEarnings && !invite && <Link href="/join/earnings" className="min-h-12 rounded-[14px] text-[#e8c472] font-semibold grid place-items-center text-center hover:text-[#e8c472]" style={{ background: "rgba(232,196,114,0.16)" }}>ดูรายได้และส่วนแบ่ง · คำนวณรายได้ต่อเดือน</Link>}
            {seats.closed
              ? <span aria-disabled="true" className="min-h-14 rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[18px] grid place-items-center" style={{ marginTop: 6, opacity: 0.45 }}>ปิดรับสมัครแล้ว</span>
              : <Link href={invite ? `/join/pay?pkg=A&invite=${invite}` : `/join/pay?pkg=${pick}${g}`} className="min-h-14 rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[18px] grid place-items-center hover:text-[#1b130b]" style={{ marginTop: 6 }}>{invite ? "เริ่มสร้างโปรไฟล์" : "ชำระเงินและรับรหัสสมัคร"}</Link>}
            {invite && <p className="m-0 text-[13px] text-center text-[#b5a596] font-light">ลิงก์ส่วนตัว กรุณาอย่าเผยแพร่</p>}
            <Link href="/join/me" className="self-center min-h-11 inline-flex items-center text-[14px] text-[#e8c472] hover:text-[#e8c472]">สมัครแล้ว? เข้าสู่ระบบ Part-Time ›</Link>
          </div>
        </section>

        <section className="flex flex-col gap-[14px]">
          <h2 style={h2}>สิ่งที่คุณได้รับ</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[10px]">
            {PERKS.map((k) => (
              <div key={k.t} className="flex flex-col gap-2 rounded-[14px] bg-[#251d1b]" style={{ padding: 14 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e8c472" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={k.icon} /></svg>
                <span className="font-semibold leading-[1.4]" style={{ fontSize: 14.5 }}>{k.t}</span>
                <span className="leading-[1.5] text-[#d9c9b4]" style={{ fontSize: 13.5 }}>{k.d}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-[26px] md:gap-10">
          <section className="rounded-2xl bg-[#2c1a1f] md:!px-7 md:!py-6" style={{ padding: "18px 20px" }}>
            <h2 className="font-semibold text-[16px] text-[#f3ead9]" style={{ margin: "0 0 8px" }}>คุณสมบัติที่เรามองหา</h2>
            <div className="flex flex-col gap-1.5 text-[14px] leading-[1.5] md:grid md:grid-cols-3 md:gap-6 md:text-[15px]">
              {looking.map((x) => (
                <div key={x} className="flex gap-[10px] items-start"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8c472" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 mt-0.5"><path d="M5 12l5 5 9-10" /></svg><span>{x}</span></div>
              ))}
            </div>
          </section>

          <section className="flex flex-col" style={{ gap: 18 }}>
            <h2 className="text-center" style={h2}>กำหนดการ</h2>
            {/* จอคอม: เส้นเวลาแนวนอน 5 ช่อง */}
            <ol className="hidden md:grid grid-cols-5 m-0 p-0 list-none">
              {TIMELINE.map(([date, text], i) => (
                <li key={text} className="flex flex-col items-center text-center gap-2">
                  <span className="relative w-full h-3 grid place-items-center">
                    <span className="absolute top-1/2 h-0.5 -translate-y-1/2" style={{ left: i ? 0 : "50%", right: i === TIMELINE.length - 1 ? "50%" : 0, background: "rgba(232,196,114,0.35)" }} />
                    <span className="relative w-3 h-3 rounded-full bg-[#e8c472]" />
                  </span>
                  <span className="text-[13px] text-[#e8c472] font-light">{date}</span>
                  <span className="text-[15px] px-2">{text}</span>
                </li>
              ))}
            </ol>
            <div className="flex flex-col pl-1 md:hidden">
              {TIMELINE.map(([date, text]) => (
                <div key={text} className="flex gap-[14px]">
                  <span className="flex flex-col items-center"><span className="w-3 h-3 rounded-full bg-[#e8c472]" style={{ marginTop: 7 }} /><span className="flex-1 w-0.5" style={{ background: "rgba(232,196,114,0.35)" }} /></span>
                  <span className="flex flex-col pb-4"><span className="text-[13px] text-[#e8c472] font-light">{date}</span><span>{text}</span></span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="flex flex-col w-full max-w-[720px] mx-auto">
          <h2 className="text-center" style={{ ...h2, margin: "0 0 6px" }}>คำถามที่พบบ่อย</h2>
          {faq.map(([q, a], i) => {
            const o = !!open[i];
            return (
              <div key={q} className="border-b border-[rgba(243,234,217,0.07)]">
                <button type="button" aria-expanded={o} onClick={() => setOpen((x) => ({ ...x, [i]: !o }))} className="w-full min-h-[52px] flex justify-between items-center gap-[10px] bg-transparent text-[#f3ead9] text-[15px] font-medium text-left" style={{ padding: "12px 0" }}>
                  {q}<span aria-hidden="true" className="text-[#e8c472] text-[20px]">{o ? "−" : "+"}</span>
                </button>
                {o && <div className="text-[14px]" style={{ padding: "0 0 14px" }}>{a}</div>}
              </div>
            );
          })}
        </section>
      </div>

      <footer className="mx-auto max-w-[1200px]" style={{ padding: "0 20px" }}>
        <div className="flex flex-col border-t border-[rgba(243,234,217,0.07)] text-[13px] leading-[1.6] font-light" style={{ marginTop: 32, padding: "18px 0 24px", gap: 16 }}>
          <div className="flex justify-between items-center gap-3"><span className="inline-flex items-center gap-2"><img src="/brand/logo.png" alt="" width={34} height={34} className="w-[34px] h-[34px] object-contain" /><span className="font-brand text-[21px] text-[#e8c472]">Bamrungsuk</span></span><span>ติดต่อเรา</span></div>
          <div className="flex flex-wrap" style={{ gap: "4px 12px" }}><Link href="/join/terms" className="tap text-[#f3ead9] hover:underline">ข้อกำหนดและเงื่อนไขการใช้งาน</Link><span className="text-[#b5a596]">|</span><Link href="/join/privacy" className="tap text-[#f3ead9] hover:underline">นโยบายความเป็นส่วนตัว (PDPA)</Link></div>
          <div className="select-all">{`${CONTROLLER.email} · ${CONTROLLER.phone}`}</div>
          <div className="text-[#b5a596]">© 2569 Mister Bamrungsuk สงวนลิขสิทธิ์</div>
        </div>
      </footer>
    </div>
  );
}
