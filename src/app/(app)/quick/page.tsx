/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getLivePeople, publicId } from "@/lib/home/live";
import { priceOf } from "@/lib/home/people";
import { currentCustomer } from "@/lib/customer/auth";
import { freeToday } from "@/lib/bookings/quick";
import { priceFor } from "@/lib/bookings";
import { ACTIVITIES } from "@/lib/posts";
import { QuickCall } from "./call";

export const dynamic = "force-dynamic";
export const metadata = { title: "เรียกด่วน — Mister Bamrungsuk" };

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
// บอร์ด C-QuickCall "เรียกด่วน": ฟอร์มเรียก → ระบบกันเงินแล้วแจ้งเพื่อนที่ว่างวันนี้ → คนแรกที่กดรับได้นัด (call.tsx)
// ด้านล่าง: เพื่อนที่ว่างวันนี้ (แตะเพื่อเลือกเองแล้วนัดตามปกติ)
export default async function QuickPage() {
  const [free, people, me] = await Promise.all([freeToday(), getLivePeople().catch(() => []), currentCustomer().catch(() => null)]);
  const rows = free.map(({ a, note, hot }) => { const p = people.find((y) => y.id === publicId(a.mb_code)); return p ? { p, note, hot } : null; }).filter((r) => !!r);
  const est = { 3: 0, 5: 0 };
  for (const { a } of free.slice(0, 20)) { est[3] = Math.max(est[3], (await priceFor(a, 3)) * 100); est[5] = Math.max(est[5], (await priceFor(a, 5)) * 100); }

  return (
    <div className="pb-6">
      <div className="flex items-center gap-[10px]" style={{ padding: 16 }}>
        <Link href="/" aria-label="ย้อนกลับ" className="w-[42px] h-[42px] rounded-full grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]" style={{ border: `1px solid ${LN}` }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
        <h1 className="m-0 font-semibold text-[19px]">เรียกด่วน</h1>
        <span className="ml-auto h-7 px-3 rounded-full text-[12px] font-semibold flex items-center gap-1.5 text-[#FF8A97]" style={{ border: "1px solid #c9283d" }}><span className="w-[7px] h-[7px] rounded-full bg-[#c9283d]" />สด</span>
      </div>
      <QuickCall loggedIn={!!me} free={free.length} est={est} activities={ACTIVITIES} />
      <div className="text-center" style={{ padding: "26px 24px 0" }}>
        <div className="font-semibold text-[18px]">หรือเลือกเพื่อนที่ว่างวันนี้เอง</div>
        <div className="text-[13px] text-[#d9c9b4] mt-1">นัดล่วงหน้าอย่างน้อย 1 ชม. · เพื่อนตอบภายใน 30 นาที</div>
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
