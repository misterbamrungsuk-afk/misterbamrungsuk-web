import { notFound, redirect } from "next/navigation";
import { currentCustomer } from "@/lib/customer/auth";
import { getProfile } from "@/lib/customer/profile";
import { getBooking } from "@/lib/bookings";
import { ISSUER } from "@/lib/join/legal";
import { ReceiptView } from "./view";

export const dynamic = "force-dynamic";
export const metadata = { title: "ใบเสร็จ — Mister Bamrungsuk", robots: { index: false } };
const PAID = ["accepted", "checked_in", "completed", "refunded", "cancel_requested", "disputed"];

// บอร์ด C-Receipt "ใบเสร็จ / ใบกำกับภาษี" — ใบเสร็จต่อการจอง (ชำระจากกระเป๋าเงิน) + ขอใบกำกับภาษี (ทีมงานออกให้ทางอีเมลภายใน 3 วันทำการ)
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentCustomer();
  if (!me) redirect(`/login?next=/order/${id}/receipt`);
  const b = await getBooking(id);
  if (!b || b.customer_id !== me.sub) notFound();
  if (!PAID.includes(b.status)) redirect(`/order/${id}`);
  const p = await getProfile(me.sub, me.email).catch(() => null);
  const res = (b.resolution ?? {}) as { refund_satang?: number; decided?: string };
  const lines: [string, number][] = [[`นัดกับ${b.parttime_nick ?? "เพื่อน"} · ${b.place.label} · ${b.hours} ชม.`, b.price_satang]];
  if (b.room_fee_satang) lines.push([`ค่าห้อง ${b.place.spa_name ?? b.place.label}`, b.room_fee_satang]);
  if (b.tip_satang) lines.push(["ทิป", b.tip_satang]);
  if (res.decided === "refund" && res.refund_satang) lines.push(["คืนเงินเข้ากระเป๋า (ยกเลิก/ผลพิจารณา)", -res.refund_satang]);
  const total = lines.reduce((s, [, v]) => s + v, 0);
  return (
    <ReceiptView
      id={b.id}
      doc={{ no: `RC-${b.code.replace(/^BK-/, "")}`, issuer: ISSUER, buyer: `${p?.name || me.email} (${me.email})`, lines, total, paidAt: b.accepted_at ?? b.created_at, code: b.code, email: me.email }}
    />
  );
}
