import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { approveEarnings } from "@/lib/bookings/day";
import { payrollRows, todayBkk } from "@/lib/bookings/payroll";
import { StayError, ceoSettleStay } from "@/lib/hotels/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ห้อง CEO: อนุมัติรายได้ Part-Time เข้ากระเป๋า POST { parttime_id, ids? } · { all: true } = ทุกคนที่มียอดรออนุมัติ
// · { action: "stay_settle", id } = ค่าห้องพักที่เช็กเอาต์แล้วเข้ากระเป๋าโรงแรม
export async function POST(req: Request) {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s) return NextResponse.json({ ok: false, error: "ไม่มีสิทธิ์" }, { status: 401 });
  if (s.role !== "ceo") return NextResponse.json({ ok: false, error: "เฉพาะ CEO อนุมัติรายได้ได้" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { parttime_id?: string; ids?: string[]; all?: boolean; action?: string; id?: string };
  try {
    if (b.action === "stay_settle") {
      try {
        const r = await ceoSettleStay(String(b.id ?? ""), `ceo:${s.email}`);
        return NextResponse.json({ ok: true, count: 1, amount: r.partner_net_satang ?? 0 });
      } catch (e) {
        if (e instanceof StayError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
        throw e;
      }
    }
    if (b.all) {
      const { rows, sample } = await payrollRows(todayBkk());
      if (sample) return NextResponse.json({ ok: false, error: "ยังไม่มีงานจริง (ข้อมูลตัวอย่าง)" }, { status: 400 });
      let count = 0, amount = 0;
      for (const r of rows.filter((x) => x.waitingJobs > 0)) { const x = await approveEarnings(r.parttime_id, s.email); count += x.count; amount += x.amount; }
      return NextResponse.json({ ok: true, count, amount });
    }
    const id = String(b.parttime_id ?? "");
    if (!id || id === "sample") return NextResponse.json({ ok: false, error: "เลือก Part-Time" }, { status: 400 });
    const ids = Array.isArray(b.ids) ? b.ids.map(String).slice(0, 500) : undefined;
    return NextResponse.json({ ok: true, ...(await approveEarnings(id, s.email, ids)) });
  } catch (e) {
    console.error("payroll approve", e);
    return NextResponse.json({ ok: false, error: "อนุมัติไม่สำเร็จ" }, { status: 500 });
  }
}
