import { NextResponse } from "next/server";
import { currentPartner } from "@/lib/partner/auth";
import { StayError, partnerAct } from "@/lib/hotels/store";

export const runtime = "nodejs";

// โรงแรมยืนยัน / ปฏิเสธการจองห้อง (ปฏิเสธ = คืนเงินลูกค้าเต็มจำนวน)  { action: "confirm" | "decline", reason? }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const p = await currentPartner();
  if (!p) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { action?: string; reason?: string };
  if (b.action !== "confirm" && b.action !== "decline") return NextResponse.json({ ok: false, error: "action" }, { status: 400 });
  try {
    const row = await partnerAct(p.id, id, b.action, String(b.reason ?? "").trim().slice(0, 200));
    return NextResponse.json({ ok: true, row });
  } catch (e) {
    if (e instanceof StayError) return NextResponse.json({ ok: false, error: e.message, code: e.code }, { status: e.status });
    console.error("stay act", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
