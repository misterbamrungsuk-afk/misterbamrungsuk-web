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
  const res = (b.resolution ?? {}) as { refund_satang?: number; refund_pct?: number; decided?: string; cancelled?: boolean };
  const lines: [string, number][] = [[`นัดกับ${b.parttime_nick ?? "เพื่อน"} · ${b.place.label} · ${b.hours} ชม.`, b.price_satang]];
  if (b.room_fee_satang) lines.push([`ค่าห้อง ${b.place.spa_name ?? b.place.label}`, b.room_fee_satang]);
  if (b.tip_satang) lines.push(["ทิป", b.tip_satang]);
  if (res.decided === "refund" && res.refund_satang) lines.push([res.cancelled ? `ยกเลิก · คืน ${res.refund_pct ?? 0}% ตามกติกา` : "คืนเงินเข้ากระเป๋า (ผลพิจารณา)", -res.refund_satang]);
  // ยกเลิกช้า คืน 0% — ต้องเห็นว่าเป็นการยกเลิก ไม่ใช่นัดที่เกิดขึ้นจริง
  if (res.decided === "refund" && res.cancelled && !res.refund_satang) lines.push(["ยกเลิก · ไม่คืนเงินตามกติกา", 0]);
  if (res.decided === "noshow:provider_no_show") lines.push(["เพื่อนไม่มาตามนัด · คืนเต็มจำนวน", -(res.refund_satang ?? b.total_satang)]);
  if (res.decided === "noshow:customer_no_show") lines.push(["ลูกค้าไม่มาตามนัด · ไม่คืนเงินตามกติกา", 0]);
  const total = lines.reduce((s, [, v]) => s + v, 0);
  const canInvoice = b.status === "completed" && total > 0;
  return (
    <ReceiptView
      id={b.id}
      canInvoice={canInvoice}
      doc={{ no: `RC-${b.code.replace(/^BK-/, "")}`, issuer: ISSUER, buyer: `${p?.name || me.email} (${me.email})`, lines, total, paidAt: b.accepted_at ?? b.created_at, code: b.code, email: me.email }}
    />
  );
}
