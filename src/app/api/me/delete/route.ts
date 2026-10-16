import { NextResponse } from "next/server";
import { SESSION_COOKIE, currentCustomer, forgetSession } from "@/lib/customer/auth";
import { getProfile, updateProfile } from "@/lib/customer/profile";
import { listForCustomer, notify } from "@/lib/bookings";

export const runtime = "nodejs";

// ขอลบบัญชี (บอร์ด C-DeleteAccount · PDPA) — มีนัดที่ยังไม่จบ = ลบไม่ได้ · ส่งคำขอให้ทีมงานลบภายใน 30 วัน (ไม่ลบทันที)
export async function POST() {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const open = (await listForCustomer(me.sub).catch(() => [])).filter((b) => ["requested", "accepted", "checked_in", "cancel_requested", "disputed"].includes(b.status));
  if (open.length) return NextResponse.json({ ok: false, error: `ยังมีนัดที่ยังไม่จบ ${open.length} รายการ`, open: open.length }, { status: 409 });
  const p = await getProfile(me.sub, me.email);
  if (p.delete_requested_at) return NextResponse.json({ ok: true, at: p.delete_requested_at });
  const at = new Date().toISOString();
  try {
    await updateProfile(me.sub, me.email, { delete_requested_at: at });
    await notify({ user_type: "admin", user_id: "pdpa", kind: "customer_delete", title: "ลูกค้าขอลบบัญชี", body: me.email, url: null });
    forgetSession(me.sub);
    // ขอลบแล้ว = ออกจากระบบทุกเครื่อง (session ถูกเพิกถอนที่ currentCustomer) · ทีมงานลบข้อมูลภายใน 30 วัน
    const res = NextResponse.json({ ok: true, at, signedOut: true });
    res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    console.error("delete request", e);
    return NextResponse.json({ ok: false, error: "ส่งคำขอไม่สำเร็จ · ติดต่อทีมงานทาง LINE" }, { status: 500 });
  }
}
