import "server-only";
import { currentCustomer } from "@/lib/customer/auth";
import { canResume } from "@/lib/join/resume";
import { getByMb } from "@/lib/join/store";
import { getBooking, type Booking } from "./index";

/** Part-Time ที่เป็นเจ้าของ mb (คุกกี้ mb_resume หรือ ?t=) */
export async function currentParttime(mb: string, t?: string | null) {
  if (!/^M[BS]-\d{7,}$/.test(mb) || !(await canResume(mb, t))) return null;
  return getByMb(mb);
}

/** ผู้มีสิทธิ์ในการจองนี้: ลูกค้าเจ้าของ หรือ Part-Time เจ้าของงาน */
export async function bookingActor(id: string, mb?: string | null, t?: string | null): Promise<{ b: Booking; role: "customer" | "parttime"; id: string } | null> {
  const b = await getBooking(id);
  if (!b) return null;
  const c = await currentCustomer();
  if (c && c.sub === b.customer_id) return { b, role: "customer", id: c.sub };
  if (mb && mb === b.parttime_mb) {
    const a = await currentParttime(mb, t);
    if (a && a.id === b.parttime_id) return { b, role: "parttime", id: a.id };
  }
  return null;
}
