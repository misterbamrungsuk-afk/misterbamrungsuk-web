import { redirect } from "next/navigation";
import { currentPartner } from "@/lib/partner/auth";
import { getListing, listBookings } from "@/lib/partner/portal";
import { BookingsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function PartnerBookingsPage() {
  const p = await currentPartner();
  if (!p) redirect("/partner/login");
  const [rows, listing] = await Promise.all([listBookings(p.id).catch(() => []), getListing(p.id).catch(() => null)]);
  const rooms = Array.from({ length: Math.max(1, listing?.rooms ?? 1) }, (_, i) => `ห้อง ${i + 1}`);
  return (
    <>
      <h1 className="font-display text-2xl font-semibold mt-5">การจองของลูกค้า</h1>
      <p className="text-xs text-ink-300 mt-1">ลูกค้าที่เลือกร้านของคุณเป็นสถานที่ให้บริการ</p>
      <BookingsClient initial={rows} rooms={rooms} partnerPct={p.platform_pct ?? null} />
    </>
  );
}
