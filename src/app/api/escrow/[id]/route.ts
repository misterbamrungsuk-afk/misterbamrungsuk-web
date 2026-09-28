import { NextResponse } from "next/server";
import { store } from "@/lib/server-store";
import { isDemo } from "@/lib/data";
import type { EscrowState } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// กฎการเปลี่ยนสถานะของระบบกลาง (server เป็นคนตัดสินเสมอ ฝั่ง client กดไม่ได้เอง)
const TRANSITIONS: Record<string, [string, EscrowState][]> = {
  // action: [ผู้ที่กดได้, สถานะปลายทาง]
  fund: [["hirer", "awaiting_check"]],
  verify: [["system", "funded"]],
  start: [["provider", "in_progress"]],
  deliver: [["provider", "delivered"]],
  release: [["hirer", "released"]],   // ลูกค้ายืนยันรับงาน → ปล่อยเงิน (หรือ auto หลัง 24 ชม.)
  dispute: [["hirer", "disputed"]],
  admin_release: [["admin", "released"]],
  admin_refund: [["admin", "accepted"]],
};

// GET /api/escrow/[id] — สถานะระบบกลางปัจจุบัน
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (isDemo) {
    const order = store().escrow[id];
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ order });
  }
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

// POST /api/escrow/[id] — กด action ตามวงจร { action, role }
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { action, role } = await req.json().catch(() => ({}));
  const rule = TRANSITIONS[action as string];
  if (!rule || !role) return NextResponse.json({ error: "bad_action" }, { status: 400 });

  const allowed = rule.find(([who]) => who === role || who === "system" || role === "admin");
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (isDemo) {
    const s = store();
    const order = s.escrow[id];
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const next = allowed[1];
    order.state = next;
    if (action === "deliver") {
      order.deliveredAt = new Date().toISOString();
      order.autoReleaseAt = new Date(Date.now() + 24 * 3600_000).toISOString();
    }
    s.audit.unshift({ id: `esc-${Date.now()}`, actor: `${role}:${id}`, action: `escrow.${action}`, entity: `EscrowOrder ${id} → ${next}`, at: new Date().toLocaleTimeString("th-TH") });
    return NextResponse.json({ order });
  }
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}
