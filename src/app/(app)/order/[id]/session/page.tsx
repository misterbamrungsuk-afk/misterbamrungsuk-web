"use client";
/* eslint-disable @next/next/no-img-element */

// บอร์ด C-InSession "ระหว่างนัด" — วงเวลาที่เหลือ (นับจากเวลานัด/เช็กอิน) · แชท · แจ้งปัญหา · SOS · จบนัดหมาย
// ต่างจากบอร์ด: ไม่มี "ต่อเวลา 1 ชม." (ยังไม่มีระบบเงินรองรับ) และไม่อ้างว่าแอดมินเห็นตำแหน่งตลอดนัด (ไม่มีติดตามสด)
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
type B = { id: string; code: string; status: string; starts_at: string; hours: number; checked_in_at: string | null; place: { label: string; detail: string }; pt: { nick: string; img: string } };
const hm = (ms: number) => { const m = Math.max(0, Math.round(ms / 60000)); return `${Math.floor(m / 60)} ชม. ${m % 60} นาที`; };

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [b, setB] = useState<B | null>(null);
  const [now, setNow] = useState(Date.now());
  const load = useCallback(() => fetch(`/api/bookings/${id}`, { cache: "no-store" }).then((r) => r.json()).then((d) => { if (d?.ok) setB(d.booking); else router.replace(`/order/${id}`); }).catch(() => {}), [id, router]);
  useEffect(() => { load(); const t = setInterval(load, 30_000); const c = setInterval(() => setNow(Date.now()), 1000); return () => { clearInterval(t); clearInterval(c); }; }, [load]);
  useEffect(() => { if (b && !["accepted", "checked_in"].includes(b.status)) router.replace(`/order/${id}`); }, [b, id, router]);
  if (!b) return <p className="text-center text-[#b5a596]" style={{ padding: 60 }}>กำลังโหลด…</p>;

  const start = Math.max(Date.parse(b.starts_at), b.checked_in_at ? Date.parse(b.checked_in_at) : 0);
  const total = b.hours * 3600_000, end = start + total;
  const before = now < start, left = Math.max(0, end - now), passed = Math.max(0, Math.min(total, now - start));
  const sec = Math.floor((before ? start - now : left) / 1000);
  const clock = sec >= 86400 ? `${Math.floor(sec / 86400)} วัน ${Math.floor((sec % 86400) / 3600)} ชม.` : `${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  const qa = "flex-1 h-16 rounded-2xl bg-[#211a18] text-[#f3ead9] text-[12px] flex flex-col items-center justify-center gap-1 hover:text-[#f3ead9]";
  return (
    <div className="min-h-dvh pb-[210px]" style={{ background: "#171211" }}>
      <div className="flex items-center gap-[10px]" style={{ padding: 16 }}>
        <Link href={`/order/${id}`} aria-label="ย้อนกลับ" className="shrink-0"><img src={b.pt.img} alt="" className="w-[42px] h-[42px] rounded-full object-cover" style={{ border: `1px solid ${GOLD}` }} /></Link>
        <div className="flex-1 min-w-0"><b className="font-medium">{before ? `รอเจอ${b.pt.nick}` : `กำลังใช้เวลากับ${b.pt.nick}`}</b><div className="text-[12px] font-light text-[#d9c9b4] truncate">{b.place.label} {b.place.detail} · {b.hours} ชม.</div></div>
        <Link href="/sos" aria-label="SOS" className="w-11 h-11 rounded-full grid place-items-center text-[12px] font-bold text-white hover:text-white" style={{ background: "#c9283d" }}>SOS</Link>
      </div>
      <div className="relative mx-auto" style={{ width: 270, height: 270, marginTop: 26, maxWidth: "100%" }}>
        <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full" style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
          <circle cx="100" cy="100" r="90" stroke="rgba(232,196,114,0.14)" strokeWidth="6" fill="none" />
          <circle cx="100" cy="100" r="90" stroke={GOLD} strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray="565" strokeDashoffset={before ? 565 : 565 * (passed / total)} style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[13px] font-light text-[#d9c9b4]">{before ? "เริ่มนัดในอีก" : left ? "เหลืออีก" : "ครบเวลานัดแล้ว"}</div>
          <div className="font-semibold leading-[1.1] tabular-nums" style={{ fontSize: sec >= 86400 ? 34 : 48 }} aria-live="off">{left || before ? clock : "00:00:00"}</div>
          <div className="text-[13px] font-light" style={{ color: GOLD }}>{before ? new Date(start).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " น." : `ผ่านไป ${hm(passed)}`}</div>
        </div>
      </div>
      <div className="flex gap-2" style={{ margin: "28px 16px 0" }}>
        <Link href={`/chat/${id}`} className={qa} style={{ border: `1px solid ${LN}` }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>แชท</Link>
        <Link href={`/order/${id}/dispute`} className={qa} style={{ border: `1px solid ${LN}` }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h0" /></svg>แจ้งปัญหา</Link>
        <Link href={`/report?booking=${id}&nick=${encodeURIComponent(b.pt.nick)}`} className={qa} style={{ border: `1px solid ${LN}` }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 21V4h11l-1.5 4L16 12H5" /></svg>รายงานผู้ใช้</Link>
      </div>
      <div className="flex gap-2.5 items-center rounded-2xl text-[13px] font-light" style={{ margin: "14px 16px 0", padding: 14, border: "1px solid rgba(232,196,114,0.55)" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" aria-hidden="true" className="shrink-0"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
        <span>เงินยังพักไว้กับเรา จะโอนให้{b.pt.nick}เมื่อคุณยืนยันว่าจบนัด</span>
      </div>
      <div className="fixed left-0 right-0 bottom-0 mx-auto max-w-[480px] flex flex-col gap-2 z-40" style={{ padding: "12px 16px calc(20px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg, rgba(23,18,17,0), #171211 30%)" }}>
        {/* ตรงกับกติกาเซิร์ฟเวอร์ (customerComplete): ลูกค้ากดจบนัดได้ตั้งแต่เวลาเริ่มนัด ไม่ต้องรอครบชั่วโมง */}
        {Date.parse(b.starts_at) > now ? <>
          <button type="button" disabled aria-describedby="end-why" className="h-[52px] rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[16px] opacity-40">จบนัดหมาย</button>
          <p id="end-why" className="m-0 text-center text-[12.5px] text-[#d9c9b4]">ยังไม่ถึงเวลานัด · กดจบนัดได้ตั้งแต่ {new Date(Date.parse(b.starts_at)).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })} น.</p>
        </> : <>
          <Link href={`/order/${id}/complete`} className="h-[52px] rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[16px] grid place-items-center hover:text-[#1b130b]">จบนัดหมาย</Link>
          <p className="m-0 text-center text-[12.5px] text-[#d9c9b4]">จบก่อนครบ {b.hours} ชม. ได้ · ถ้าเพื่อนแจ้งจบงานแล้วคุณไม่ตอบ ระบบยืนยันให้อัตโนมัติ</p>
        </>}
        <p className="m-0 text-center text-[12px] font-light text-[#d9c9b4]">มีเหตุฉุกเฉินกด SOS · ทีมงานได้รับแจ้งพร้อมตำแหน่งที่คุณส่งทันที</p>
      </div>
    </div>
  );
}
