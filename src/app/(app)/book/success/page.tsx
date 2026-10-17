"use client";
/* eslint-disable @next/next/no-img-element */

// บอร์ด C-BookSuccess "จองสำเร็จ" — ส่งคำขอแล้ว เงินกันไว้ในกระเป๋า · รอเพื่อนตอบรับภายใน 30 นาที
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US");
type B = { id: string; code: string; status: string; starts_at: string; hours: number; total_satang: number; place: { label: string; detail: string }; expires_at: string | null; pt: { nick: string; img: string } };
const when = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Success() {
  const id = useSearchParams().get("id") ?? "";
  const [b, setB] = useState<B | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!id) return setErr("ไม่พบการจอง");
    fetch(`/api/bookings/${id}`, { cache: "no-store" }).then((r) => r.json()).then((d) => (d?.ok ? setB(d.booking) : setErr(d?.error || "ไม่พบการจอง"))).catch(() => setErr("โหลดไม่สำเร็จ"));
  }, [id]);
  const ics = () => {
    if (!b) return;
    const t = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const s = new Date(b.starts_at), e = new Date(s.getTime() + b.hours * 3600_000);
    const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", `UID:${b.id}@misterbamrungsuk`, `DTSTART:${t(s)}`, `DTEND:${t(e)}`, `SUMMARY:นัดกับ${b.pt.nick} · ${b.code}`, `LOCATION:${b.place.label} ${b.place.detail}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar" })); a.download = `${b.code}.ics`; a.click();
  };
  const share = async () => {
    if (!b) return;
    const text = `นัดของฉัน ${b.code}: ${when(b.starts_at)} · ${b.place.label} ${b.place.detail} (Mister Bamrungsuk)`;
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); alert("คัดลอกรายละเอียดนัดแล้ว"); } } catch {}
  };

  if (err) return <div className="text-center" style={{ padding: "80px 24px" }}><p className="text-[#ff8a9a]">{err}</p><Link href="/orders" className="text-[#e8c472]">ไปที่การจองของฉัน</Link></div>;
  if (!b) return <p className="text-center text-[#b5a596]" style={{ padding: "80px 24px" }}>กำลังโหลด…</p>;
  const waiting = b.status === "requested";
  return (
    <div className="min-h-dvh pb-[220px]" style={{ background: "#171211" }}>
      <div className="flex flex-col items-center text-center" style={{ padding: "48px 24px 0" }}>
        <div className="w-[88px] h-[88px] rounded-full grid place-items-center" style={{ border: `1px solid ${GOLD}`, color: GOLD }}><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg></div>
        <h1 className="m-0 mt-[18px] font-semibold text-[28px]">{waiting ? "ส่งคำขอนัดแล้ว" : "จองสำเร็จ"}</h1>
        <div className="mt-1.5 text-[14px] text-[#d9c9b4]">{waiting ? `กันเงิน ${baht(b.total_satang)} ไว้ในกระเป๋า · รอ${b.pt.nick}ตอบรับภายใน 30 นาที ถ้าไม่ตอบคืนเงินอัตโนมัติ` : `ชำระเต็มจำนวน ${baht(b.total_satang)} แล้ว เงินพักไว้กับเราจนจบนัด`}</div>
      </div>
      <div className="rounded-[20px] bg-[#211a18]" style={{ margin: "26px 16px 0", padding: "6px 16px 10px", border: `1px solid ${LN}` }}>
        <div className="flex gap-3 items-center py-3" style={{ borderBottom: `1px solid ${LN}` }}><img src={b.pt.img} alt="" className="w-[52px] h-[52px] rounded-full object-cover" /><div className="flex-1"><b className="font-medium text-[17px]">{b.pt.nick}</b><div className="text-[12px] font-light text-[#d9c9b4]">{b.hours} ชม.</div></div></div>
        <div className="flex justify-between text-[14px] py-[9px]" style={{ borderBottom: `1px solid ${LN}` }}><span className="text-[#d9c9b4]">วันเวลา</span><span>{when(b.starts_at)}</span></div>
        <div className="flex justify-between gap-3 text-[14px] py-[9px]" style={{ borderBottom: `1px solid ${LN}` }}><span className="text-[#d9c9b4]">สถานที่</span><span className="text-right">{b.place.label} {b.place.detail}</span></div>
        <div className="flex justify-between text-[14px] py-[9px]"><span className="text-[#d9c9b4]">รหัสจอง</span><span style={{ color: GOLD }}>{b.code}</span></div>
      </div>
      <div className="flex gap-2" style={{ margin: "14px 16px 0" }}>
        <button type="button" onClick={ics} className="flex-1 h-12 rounded-[14px] text-[13px] text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}>เพิ่มลงปฏิทิน</button>
        <button type="button" onClick={share} className="flex-1 h-12 rounded-[14px] text-[13px] text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}>แชร์ให้คนใกล้ชิด</button>
      </div>
      <div className="flex gap-2 text-[12px] font-light text-[#d9c9b4] leading-[1.55]" style={{ margin: "14px 16px 0" }}>เราจะแจ้งเตือนเมื่อ{b.pt.nick}ตอบรับ · ยกเลิกได้ฟรีก่อนเพื่อนตอบรับ</div>
      <div className="fixed left-0 right-0 bottom-0 mx-auto max-w-[480px] flex flex-col gap-[10px]" style={{ padding: "12px 16px calc(24px + env(safe-area-inset-bottom))", background: "linear-gradient(180deg, rgba(23,18,17,0), #171211 25%)" }}>
        <Link href={`/chat/${b.id}`} className="h-[54px] rounded-2xl bg-[#e8c472] text-[#1b130b] font-semibold text-[16px] grid place-items-center hover:text-[#1b130b]">แชทกับ{b.pt.nick}</Link>
        <Link href={`/order/${b.id}`} className="h-[50px] rounded-2xl text-[15px] grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}>ดูสถานะการจองและเงินของคุณ</Link>
        <div className="flex gap-[10px]"><Link href="/orders" className="flex-1 h-[46px] rounded-[14px] text-[14px] grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}>การจองของฉัน</Link><Link href="/" className="flex-1 h-[46px] rounded-[14px] text-[14px] grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}>กลับหน้าแรก</Link></div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return <Suspense><Success /></Suspense>;
}
