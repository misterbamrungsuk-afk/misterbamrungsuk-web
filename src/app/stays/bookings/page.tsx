import Link from "next/link";
import { currentCustomer } from "@/lib/customer/auth";
import { listStays } from "@/lib/hotels/store";
import { STAY_LABEL, bahtTxt, thDate, type StayBooking } from "@/lib/hotels/types";
import { SiteHeader } from "@/components/site-header";
import { LuxHeader } from "../../hotels/venue-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "การจองห้องพัก · Mister Bamrungsuk" };

const BD = "rgba(232,196,114,.38)";
const UPCOMING = new Set(["pending", "confirmed"]);
const tone = (s: StayBooking["status"]) => (s === "pending" ? "#e8c472" : s === "confirmed" ? "#7fd6a3" : "#b5a596");

// การจองห้องพักของฉัน (ลิงก์จาก /orders "นัดของฉัน")
export default async function MyStaysPage() {
  const me = await currentCustomer();
  const rows = me ? await listStays({ customer: me.sub }).catch(() => [] as StayBooking[]) : [];
  const shown = rows.filter((b) => b.status !== "void");
  const up = shown.filter((b) => UPCOMING.has(b.status)), past = shown.filter((b) => !UPCOMING.has(b.status));
  const item = (b: StayBooking) => (
    <li key={b.id}>
      <Link href={`/stays/bookings/${b.id}`} className="block no-underline text-[#f3ead9] rounded-2xl bg-[#211a18] p-3.5" style={{ border: `1px solid ${BD}` }}>
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <div className="font-lux font-semibold text-[15px] truncate">{b.partner_name}</div>
            <div className="text-[12.5px] text-[#d9c9b4] truncate">{b.room_name} × {b.rooms} · {b.nights} คืน</div>
            <div className="text-[12px] text-[#b5a596] mt-0.5">{thDate(b.check_in, { day: "numeric", month: "short" })} – {thDate(b.check_out, { day: "numeric", month: "short", year: "numeric" })} · {b.code}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-lux font-semibold text-[#e8c472]">{bahtTxt(b.total_satang)}</div>
            <div className="text-[11.5px] mt-1" style={{ color: tone(b.status) }}>{STAY_LABEL[b.status]}</div>
          </div>
        </div>
      </Link>
    </li>
  );
  return (
    <main className="min-h-dvh bg-[#171211] text-[#f3ead9] mb-v7 mb-c">
      <div className="max-w-[480px] md:max-w-[760px] mx-auto">
        <SiteHeader />
        <LuxHeader back="/orders" eyebrow="MY STAYS" title="การจองห้องพัก" />
        <div className="px-[18px] pt-4 pb-10 flex flex-col gap-3">
          {!me ? (
            <div className="p-4 rounded-2xl bg-[#211a18] text-center text-[13px] text-[#d9c9b4]" style={{ border: `1px solid ${BD}` }}>
              เข้าสู่ระบบเพื่อดูการจองห้องพัก<br /><Link href="/login?next=/stays/bookings" className="text-[#e8c472] underline">เข้าสู่ระบบ</Link>
            </div>
          ) : !shown.length ? (
            <div className="p-4 rounded-2xl bg-[#211a18] text-center text-[13px] text-[#d9c9b4] leading-[1.7]" style={{ border: `1px solid ${BD}` }}>
              ยังไม่มีการจองห้องพัก<br /><Link href="/hotels" className="min-h-10 inline-flex items-center px-2 text-[#e8c472] underline">ดูโรงแรมพาร์ทเนอร์</Link>
            </div>
          ) : (
            <>
              {up.length > 0 && <><h2 className="font-lux font-semibold text-[16px]">กำลังจะเข้าพัก</h2><ul className="flex flex-col gap-2.5">{up.map(item)}</ul></>}
              {past.length > 0 && <><h2 className="font-lux font-semibold text-[16px] mt-3">ประวัติ</h2><ul className="flex flex-col gap-2.5">{past.map(item)}</ul></>}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
