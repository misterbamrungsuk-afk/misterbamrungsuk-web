"use client";
/* eslint-disable @next/next/no-img-element */

// บอร์ด C-Profile — รูปใหญ่ · ชื่อ + ยืนยันตัวตน · สถิติ 4 ช่อง · เกี่ยวกับ · เลือกบริการ 3/5 ชม. · รีวิว · แถบล่าง (แชท / จองเลย)
// จอคอม (lg): รูปซ้ายติดจอ · ข้อมูลขวา
import { useState } from "react";
import Link from "next/link";
import { priceOf, type Act, type Person } from "@/lib/home/people";

const LABEL: Record<Act, string> = { eat: "กิน & เที่ยว", massage: "นวดผ่อนคลาย", cafe: "คาเฟ่", photo: "ถ่ายรูป", movie: "ดูหนัง", gym: "ออกกำลัง", chill: "นั่งชิล" };
const baht = (n: number) => "฿" + n.toLocaleString("en-US");
const line = "1px solid rgba(243,234,217,0.07)";

export function ProfileView({ p }: { p: Person }) {
  const [svc, setSvc] = useState<3 | 5>(3);
  const [fav, setFav] = useState(false);
  const price = { 3: priceOf(p), 5: Math.round(priceOf(p) * 1.5) };
  const where = p.prov ? `${p.area} ${p.prov}` : `${p.area} กรุงเทพฯ`;
  const round = "w-11 h-11 rounded-full grid place-items-center";
  const glass = { background: "rgba(8,6,6,.6)", border: "1px solid rgba(246,239,228,.2)" };

  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9", lineHeight: "normal" }}>
      <div className="mx-auto w-full max-w-[1120px] lg:grid lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:gap-10 lg:px-8 lg:pt-8" style={{ paddingBottom: "calc(100px + env(safe-area-inset-bottom))" }}>
        {/* รูป */}
        <div className="relative h-[380px] md:h-[520px] lg:h-[640px] lg:sticky lg:top-8 lg:rounded-[28px] lg:overflow-hidden">
          <img src={p.img} alt={p.nick} className="w-full h-full object-cover block" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(23,18,17,.35) 0%, rgba(23,18,17,0) 30%, rgba(23,18,17,0) 60%, #171211 100%)" }} />
          <Link href="/" aria-label="ย้อนกลับ" className={`absolute top-[14px] left-[14px] ${round} text-[#f3ead9] hover:text-[#f3ead9]`} style={glass}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <button type="button" onClick={() => setFav(!fav)} aria-pressed={fav} aria-label="บันทึกเป็นคนโปรด" className={`absolute top-[14px] right-[14px] ${round}`} style={{ ...glass, color: fav ? "#ef8a97" : "#f3ead9" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={fav ? "#c9283d" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9z" /></svg>
          </button>
          <div className="absolute right-[18px] bottom-6 h-[26px] rounded-full text-[12px] font-light flex items-center gap-[5px]" style={{ padding: "0 10px", background: "rgba(8,6,6,.7)", border: `1px solid ${p.free ? "rgba(232,196,114,.6)" : "rgba(74,222,128,.7)"}`, color: p.free ? "#e8c472" : "#bbf7d0" }}>
            {p.free ? `● ว่างในอีก ${p.free} นาที` : "● ออนไลน์ · ว่างตอนนี้"}
          </div>
        </div>

        {/* ข้อมูล */}
        <div className="flex flex-col gap-4 min-w-0" style={{ padding: "6px 18px 0" }}>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="m-0 font-bold text-[30px] lg:text-[38px]">{p.nick}</h1>
              {p.top && <span className="inline-flex items-center h-[18px] rounded text-[9.5px] font-bold tracking-[.2em] text-[#1b130b]" style={{ padding: "0 7px", background: "linear-gradient(135deg, #fff1c9 0%, #e8c472 45%, #a8781f 100%)" }}>TOP</span>}
              <span className="h-[26px] rounded-full text-[12px] font-light text-[#e8c472] flex items-center" style={{ padding: "0 10px", border: "1px solid rgba(212,175,55,.6)" }}>✓ ยืนยันตัวตน + ตรวจประวัติ</span>
            </div>
            <div className="text-[13px] text-[#d9c9b4] mt-1 font-light">{p.age} ปี · {p.height} ซม. · {where}</div>
          </div>

          <div className="grid grid-cols-4 text-center" style={{ borderTop: line, borderBottom: line, padding: "12px 0" }}>
            {[[p.rating, `${p.reviews} รีวิว`, true], [String(p.jobs), "นัดสำเร็จ"], [`${p.years} ปี`, "ประสบการณ์"], ["98%", "ตอบกลับ"]].map(([v, l, g], i) => (
              <div key={String(l)} style={{ borderLeft: i ? line : undefined }}><div className="font-semibold text-[18px]" style={{ color: g ? "#e8c472" : undefined }}>{v}</div><div className="text-[12px] text-[#d9c9b4] font-light">{l}</div></div>
            ))}
          </div>

          <div>
            <h2 className="m-0 mb-1.5 font-semibold text-[17px]">เกี่ยวกับ{p.nick}</h2>
            <p className="m-0 text-[13.5px] leading-[1.7] text-[#d9c9b4]">{p.bio}</p>
            <div className="flex flex-wrap gap-1.5 mt-2.5 text-[12px] font-light">
              {p.acts.map((a) => <span key={a} className="rounded-full" style={{ padding: "5px 11px", border: a === "massage" ? "1px solid rgba(212,175,55,.6)" : line, color: a === "massage" ? "#e8c472" : "#d9c9b4" }}>{LABEL[a]}</span>)}
              <span className="rounded-full text-[#d9c9b4]" style={{ padding: "5px 11px", border: line }}>{p.langs}</span>
            </div>
          </div>

          <div>
            <h2 className="m-0 mb-2 font-semibold text-[17px]">เลือกบริการ</h2>
            <div className="flex flex-col gap-2">
              {([3, 5] as const).map((h) => (
                <button key={h} type="button" aria-pressed={svc === h} onClick={() => setSvc(h)} className="flex justify-between items-center rounded-2xl text-[#f3ead9] text-left" style={{ padding: 14, border: `1.5px solid ${svc === h ? "#e8c472" : "rgba(232,196,114,0.14)"}`, background: svc === h ? "rgba(232,196,114,0.16)" : "#211a18" }}>
                  <span><span className="block font-semibold text-[14px]">นัด {h} ชม.</span><span className="block text-[12px] text-[#d9c9b4] font-light">{h === 3 ? "กิน เที่ยว คาเฟ่ ดูหนัง" : "เหมาครึ่งวัน เปลี่ยนกิจกรรมได้"}</span></span>
                  <span className="font-bold text-[18px] text-[#e8c472]">{baht(price[h])}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="m-0 mb-2 font-semibold text-[17px]">รีวิว</h2>
            <div className="flex gap-4 items-center">
              <div className="text-center"><div className="font-bold text-[40px] text-[#e8c472] leading-none">{p.rating}</div><div className="text-[12px] text-[#d9c9b4] mt-1 font-light">{p.reviews} รีวิว</div></div>
              <div className="flex-1 flex flex-col gap-[5px]">
                {[5, 4, 3, 2, 1].map((n) => {
                  const w = n === 5 ? (p.rating === "5.0" ? 100 : 80) : n === 4 ? (p.rating === "5.0" ? 0 : 18) : n === 3 && p.rating !== "5.0" ? 2 : 0;
                  return <div key={n} className="flex items-center gap-2 text-[12px] text-[#d9c9b4] font-light"><span className="w-2.5">{n}</span><div className="flex-1 h-1.5 rounded-[3px]" style={{ background: "rgba(232,196,114,0.14)" }}><div className="h-1.5 rounded-[3px] bg-[#e8c472]" style={{ width: `${w}%` }} /></div></div>;
                })}
              </div>
            </div>
            <div className="mt-3 rounded-[14px] bg-[#211a18] text-[13px] leading-[1.6] text-[#d9c9b4] font-light" style={{ padding: 12, border: line }}>
              <div className="text-[#e8c472] text-[12px]">★★★★★ · {p.review[0]} · 3 วันที่แล้ว</div>{p.review[1]}
            </div>
          </div>
          <p className="m-0 text-[12px] text-[#b5a596] font-light">ข้อมูลตัวอย่าง · แอปลูกค้าเปิดให้จองจริงเร็ว ๆ นี้</p>
        </div>
      </div>

      {/* แถบล่าง */}
      <div className="fixed inset-x-0 bottom-0 z-40" style={{ background: "rgba(23,18,17,.97)", borderTop: line }}>
        <div className="mx-auto max-w-[1120px] flex items-center justify-between gap-3 lg:px-8" style={{ padding: "12px 18px calc(18px + env(safe-area-inset-bottom))" }}>
          <div><div className="text-[12px] text-[#d9c9b4] font-light">{svc} ชม.</div><div className="font-bold text-[22px] text-[#e8c472]">{baht(price[svc])}</div></div>
          <div className="flex gap-2">
            <Link href={`/p/${p.id}/chat`} aria-label={`แชทกับ${p.nick}`} className="h-[52px] rounded-full flex items-center gap-2 text-[#e8c472] font-semibold hover:text-[#e8c472]" style={{ padding: "0 20px", border: "1.5px solid rgba(232,196,114,.6)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>แชท
            </Link>
            <Link href="/login" className="h-[52px] rounded-full bg-[#e8c472] text-[#1b130b] font-semibold flex items-center hover:text-[#1b130b]" style={{ padding: "0 28px", border: "1.5px solid #e8c472" }}>จองเลย</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
