import { NextResponse } from "next/server";
import { marketAdmin } from "@/lib/market/admin";
import { notifyStatus } from "@/lib/market/notify";
import { decideOrder, getSettings, type OrderAction } from "@/lib/market/store";

export const runtime = "nodejs";

const ACTIONS: OrderAction[] = ["confirm", "reject", "ship", "done", "regp"];

// ยืนยันสลิป (คิด GP อัตโนมัติ) / ปฏิเสธ / ใส่เลขพัสดุ / ปิดงาน / คำนวณ GP ใหม่
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await marketAdmin();
  if (!admin) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { action?: OrderAction; tracking_no?: string; carrier?: string; note?: string; reason?: string };
  if (!b.action || !ACTIONS.includes(b.action)) return NextResponse.json({ ok: false, error: "action ไม่ถูกต้อง" }, { status: 400 });
  try {
    const order = await decideOrder(id, b.action, admin.email, { tracking_no: b.tracking_no, carrier: b.carrier, note: b.note, reason: b.reason });
    // SMS ถึงผู้ซื้อเมื่อ "ยืนยันแล้ว" / "จัดส่งแล้ว" (ไม่บล็อก)
    if (b.action === "confirm" || b.action === "ship") getSettings().then((s) => notifyStatus(order, s)).catch(() => {});
    return NextResponse.json({ ok: true, order });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
