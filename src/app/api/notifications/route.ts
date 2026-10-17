import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { listNotices, markNoticesRead } from "@/lib/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// การแจ้งเตือนของลูกค้า · POST = อ่านทั้งหมดแล้ว
export async function GET() {
  const me = await currentCustomer();
  // ยังไม่ล็อกอิน = ไม่มีแจ้งเตือน (ตอบ 200 ไม่ให้หน้าสาธารณะมี error ใน console ทุกหน้า)
  if (!me) return NextResponse.json({ ok: true, guest: true, notices: [] });
  try {
    return NextResponse.json({ ok: true, notices: await listNotices("customer", me.sub) });
  } catch {
    return NextResponse.json({ ok: true, notices: [] });
  }
}

export async function POST() {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  await markNoticesRead("customer", me.sub).catch(() => {});
  return NextResponse.json({ ok: true });
}
