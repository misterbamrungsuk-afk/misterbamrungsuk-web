/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getLiveApplicants, getLivePeople, publicId } from "@/lib/home/live";
import { extraOf } from "@/lib/join/store";
import { priceOf } from "@/lib/home/people";

export const dynamic = "force-dynamic";
export const metadata = { title: "เรียกด่วน — Mister Bamrungsuk" };

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const JS_DAY: Record<string, number> = { "อา": 0, "จ": 1, "อ": 2, "พ": 3, "พฤ": 4, "ศ": 5, "ส": 6 };

// บอร์ด C-QuickCall "เรียกด่วน" — รอบเปิดตัว: แสดงเพื่อนที่ว่างวันนี้ (ประกาศ "วันนี้ว่าง" หรือวันรับงานตรงกับวันนี้) เรียงคนที่ประกาศก่อน → แตะเพื่อจองทันที
// (การกระจายคำขอให้เพื่อนใกล้ ๆ รับภายใน 15 วิ ยังไม่อยู่ในรอบ 20 พ.ย.)
export default async function QuickPage() {
  const [apps, people] = await Promise.all([getLiveApplicants().catch(() => []), getLivePeople().catch(() => [])]);
  const today = new Date().getDay();
  const rows = apps.map((a) => {
    const x = extraOf(a);
    const post = x.post?.open ? x.post : null;
    const work = x.work?.days ? Object.entries(x.work.days).find(([k, d]) => d.on && JS_DAY[k] === today)?.[1] : null;
    const free = !!post || !!work || (x.availability?.week_days ?? []).some((k) => JS_DAY[k] === today);
    const p = people.find((y) => y.id === publicId(a.mb_code));
    return p && free ? { p, note: post ? `${post.time} · ${post.zone}` : work ? `ว่าง ${work.from}–${work.to}` : "ว่างวันนี้", hot: !!post } : null;
  }).filter((r) => !!r).sort((a, b) => Number(b!.hot) - Number(a!.hot));

  return (
    <div className="pb-6">
      <div className="flex items-center gap-[10px]" style={{ padding: 16 }}>
        <Link href="/" aria-label="ย้อนกลับ" className="w-[42px] h-[42px] rounded-full grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
        <h1 className="m-0 font-semibold text-[19px]">เรียกด่วน</h1>
        <span className="ml-auto h-7 px-3 rounded-full text-[12px] font-semibold flex items-center gap-1.5 text-[#FF8A97]" style={{ border: "1px solid #c9283d" }}><span className="w-[7px] h-[7px] rounded-full bg-[#c9283d]" />สด</span>
      </div>
      <div className="text-center" style={{ padding: "0 24px" }}>
        <div className="font-semibold text-[22px]">เพื่อนที่ว่างวันนี้</div>
        <div className="text-[14px] text-[#d9c9b4] mt-1">เลือกคนที่ใช่ แล้วนัดล่วงหน้าอย่างน้อย 1 ชม. · ส่งคำขอแล้วเพื่อนตอบภายใน 30 นาที</div>
      </div>
      <div className="flex flex-col gap-2" style={{ padding: "18px 16px 0" }}>
        {!rows.length ? (
          <div className="rounded-[20px] bg-[#211a18] flex flex-col items-center gap-3 text-center" style={{ padding: 28, border: `1px solid ${LN}` }}>
            <span className="text-[14px] text-[#d9c9b4]">ตอนนี้ยังไม่มีเพื่อนประกาศว่างวันนี้ · ลองดูเพื่อนทั้งหมดแล้วนัดล่วงหน้า</span>
            <Link href="/" className="h-11 px-5 rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold grid place-items-center hover:text-[#1b130b]">ดูเพื่อนทั้งหมด</Link>
          </div>
        ) : rows.map((r) => (
          <Link key={r!.p.id} href={`/book/${r!.p.id}`} className="flex gap-3 items-center rounded-2xl bg-[#211a18] text-[#f3ead9] hover:text-[#f3ead9]" style={{ padding: 12, border: `1px solid ${r!.hot ? GOLD : LN}` }}>
            <img src={r!.p.img} alt={r!.p.nick} className="w-14 h-14 rounded-full object-cover shrink-0" style={{ boxShadow: `0 0 0 2px ${GOLD}`, objectPosition: r!.p.pos }} />
            <span className="flex-1 min-w-0"><b className="font-medium text-[16px]">{r!.p.nick}{r!.p.age ? `, ${r!.p.age}` : ""}</b><span className="block text-[12.5px] font-light text-[#d9c9b4] truncate">{r!.note} · {r!.p.area}</span></span>
            <span className="text-right shrink-0"><b className="font-semibold" style={{ color: GOLD }}>฿{priceOf(r!.p).toLocaleString("en-US")}</b><span className="block text-[12px] font-light text-[#d9c9b4]">จองเลย ›</span></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
