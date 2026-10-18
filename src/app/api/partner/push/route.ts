import { NextResponse } from "next/server";
import { currentPartner } from "@/lib/partner/auth";
import { pushBind } from "@/lib/notices/inbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ผูกอุปกรณ์รับ web push ของพาร์ทเนอร์ (cookie mb_partner) · ยกเลิกใช้ DELETE /api/push ตามเดิม
export async function POST(req: Request) {
  const p = await currentPartner();
  if (!p) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  return pushBind({ type: "partner", id: p.id }, req);
}
