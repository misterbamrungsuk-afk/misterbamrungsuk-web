import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { getProfile, updateProfile } from "@/lib/customer/profile";
import { limited } from "@/lib/rate-limit";
import { getBooking } from "@/lib/bookings";
import { getLivePeople, publicId } from "@/lib/home/live";
import { REASONS, createReport } from "@/lib/reports";

export const runtime = "nodejs";

// ลูกค้ารายงานเพื่อน (บอร์ด C-Report): { booking_id? | pid?, reason, detail, block } → ทีมงานได้แจ้งเตือนทันที · block = ซ่อนเพื่อนคนนี้ + จองไม่ได้
export async function POST(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (await limited(`report:${me.sub}`, 10, 60 * 60_000)) return NextResponse.json({ ok: false, error: "ส่งรายงานบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { booking_id?: string; pid?: string; reason?: string; detail?: string; block?: boolean };
  const reason = String(b.reason ?? "");
  if (!REASONS.includes(reason)) return NextResponse.json({ ok: false, error: "เลือกเหตุผล" }, { status: 400 });
  let pid = String(b.pid ?? ""), label = "", target = "", bookingId: string | null = null;
  if (b.booking_id) {
    const bk = await getBooking(String(b.booking_id));
    if (!bk || bk.customer_id !== me.sub) return NextResponse.json({ ok: false, error: "ไม่พบการจอง" }, { status: 404 });
    pid = publicId(bk.parttime_mb); label = `${bk.parttime_nick ?? ""} (${bk.parttime_mb}) · นัด ${bk.code}`; target = bk.parttime_id; bookingId = bk.id;
  } else {
    const p = (await getLivePeople().catch(() => [])).find((x) => x.id === pid);
    if (!p) return NextResponse.json({ ok: false, error: "ไม่พบผู้ใช้" }, { status: 404 });
    label = `${p.nick} (${pid})`; target = pid;
  }
  const r = await createReport({ reporter_type: "customer", reporter_id: me.sub, target_type: "parttime", target_id: target, target_label: label, booking_id: bookingId, reason, detail: String(b.detail ?? "").trim().slice(0, 1000) || null, blocked: !!b.block });
  if (b.block && pid) {
    const prof = await getProfile(me.sub, me.email);
    if (!prof.blocked.includes(pid)) await updateProfile(me.sub, me.email, { blocked: [...prof.blocked, pid].slice(-200) }).catch((e) => console.error("block", e));
  }
  return NextResponse.json({ ok: true, code: r.code });
}
