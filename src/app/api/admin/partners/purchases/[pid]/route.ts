import { NextResponse } from "next/server";
import { decidePurchase } from "@/lib/partner/portal";
import { getPartner, stripSecret } from "@/lib/partner/store";
import { allowed } from "../../guard";

export const runtime = "nodejs";

// แอดมินตรวจสลิปค่าแพ็กเกจ: approve = ตั้ง starts_at/ends_at + ต่ออายุพาร์ทเนอร์, reject = ไม่ผ่าน
export async function POST(req: Request, { params }: { params: Promise<{ pid: string }> }) {
  if (!(await allowed())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { pid } = await params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (b.action !== "approve" && b.action !== "reject") return NextResponse.json({ ok: false, error: "action" }, { status: 400 });
  try {
    const row = await decidePurchase(pid, b.action, typeof b.note === "string" ? b.note.slice(0, 500) : undefined);
    if (!row) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, row, partner: stripSecret(await getPartner(row.partner_id)) });
  } catch (e) {
    console.error("decide purchase", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
