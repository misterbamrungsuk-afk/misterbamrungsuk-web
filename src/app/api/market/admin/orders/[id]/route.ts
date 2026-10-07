import { NextResponse } from "next/server";
import { marketAdmin } from "@/lib/market/admin";
import { decideOrder, type OrderAction } from "@/lib/market/store";

export const runtime = "nodejs";

const ACTIONS: OrderAction[] = ["confirm", "reject", "ship", "done", "regp"];

// ยืนยันสลิป (คิด GP อัตโนมัติ) / ปฏิเสธ / ใส่เลขพัสดุ / ปิดงาน / คำนวณ GP ใหม่
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await marketAdmin();
  if (!admin) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { action?: OrderAction; tracking_no?: string; note?: string };
  if (!b.action || !ACTIONS.includes(b.action)) return NextResponse.json({ ok: false, error: "action ไม่ถูกต้อง" }, { status: 400 });
  try {
    const order = await decideOrder(id, b.action, admin.email, { tracking_no: b.tracking_no, note: b.note });
    return NextResponse.json({ ok: true, order });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
