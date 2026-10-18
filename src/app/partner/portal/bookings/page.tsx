import { redirect } from "next/navigation";
import { currentPartner } from "@/lib/partner/auth";
import { getListing, listBookings } from "@/lib/partner/portal";
import { isHotelPartner, listStays } from "@/lib/hotels/store";
import { BookingsClient } from "./client";
import { StaysClient } from "./stays";

export const dynamic = "force-dynamic";

export default async function PartnerBookingsPage() {
  const p = await currentPartner();
  if (!p) redirect("/partner/login");
  const hotel = await isHotelPartner(p).catch(() => false);
  const [rows, listing, stays] = await Promise.all([
    listBookings(p.id).catch(() => []), getListing(p.id).catch(() => null), hotel ? listStays({ partner: p.id }).catch(() => []) : Promise.resolve([]),
  ]);
  const rooms = Array.from({ length: Math.max(1, listing?.rooms ?? 1) }, (_, i) => `ห้อง ${i + 1}`);
  return (
    <>
      {hotel && (
        <>
          <h1 className="font-display text-2xl font-semibold mt-5">การจองห้องพัก</h1>
          <p className="text-xs text-ink-300 mt-1">ลูกค้าจองและชำระผ่านแพลตฟอร์มแล้ว · ยืนยันหรือปฏิเสธภายใน 12 ชม. (ไม่ตอบ = ระบบคืนเงินลูกค้าอัตโนมัติ) · <a href="/partner/portal/rooms" className="text-gold-300 underline">ตั้งค่าห้องพัก</a></p>
          <StaysClient initial={stays} />
        </>
      )}
      {(!hotel || rows.length > 0) && (
        <>
          <h1 className={`font-display ${hotel ? "text-xl mt-8" : "text-2xl mt-5"} font-semibold`}>{hotel ? "นัดที่ใช้สถานที่ของคุณ" : "การจองของลูกค้า"}</h1>
          <p className="text-xs text-ink-300 mt-1">ลูกค้าที่เลือกร้านของคุณเป็นสถานที่ให้บริการ</p>
          <BookingsClient initial={rows} rooms={rooms} partnerPct={p.platform_pct ?? null} />
        </>
      )}
    </>
  );
}
