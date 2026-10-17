import { NextResponse } from "next/server";
import { clientIp, rateLimited } from "@/lib/customer/auth";
import { notifyOrderSlip } from "@/lib/market/notify";
import { checkOrderToken, getOrder, patchOrder, saveFile, saveSlipCheck } from "@/lib/market/store";
import { verifySlip } from "@/lib/slip2go";

export const runtime = "nodejs";

// แนบสลิปของคำสั่งซื้อ (ผู้ซื้อถือ token ที่ได้ตอนสร้างออเดอร์) → ตรวจ Slip2Go → แจ้งอีเมลแอดมิน
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (rateLimited(`mks:${clientIp(req)}`, 10, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ลองบ่อยเกินไป" }, { status: 429 });
  const fd = await req.formData().catch(() => null);
  if (!fd || !checkOrderToken(id, String(fd.get("token") ?? ""))) return NextResponse.json({ ok: false, error: "ไม่มีสิทธิ์" }, { status: 401 });
  const o = await getOrder(id);
  if (!o) return NextResponse.json({ ok: false, error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
  if (o.status !== "pending") return NextResponse.json({ ok: false, error: "คำสั่งซื้อนี้ตรวจแล้ว" }, { status: 409 });
  const file = fd.get("slip");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "แนบสลิป", fields: ["slip"] }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) return NextResponse.json({ ok: false, error: "รับเฉพาะรูป JPG/PNG/WebP ไม่เกิน 8MB", fields: ["slip"] }, { status: 400 });
  const slipCheck = await verifySlip(file, Number(o.total) || 0);
  if (slipCheck?.verdict === "dup") return NextResponse.json({ ok: false, error: "สลิปนี้เคยถูกใช้แล้ว กรุณาแนบสลิปของการโอนครั้งนี้", fields: ["slip"] }, { status: 400 });
  if (slipCheck?.verdict === "acct") return NextResponse.json({ ok: false, error: "สลิปนี้โอนเข้าบัญชีที่ไม่ใช่ของ Mister Bamrungsuk กรุณาโอนผ่าน QR ในหน้านี้ แล้วแนบสลิปใหม่", fields: ["slip"] }, { status: 400 });
  const path = await saveFile("slips", file);
  if (!path) return NextResponse.json({ ok: false, error: "รับเฉพาะรูป JPG/PNG/WebP ไม่เกิน 8MB", fields: ["slip"] }, { status: 400 });
  const updated = await patchOrder(id, { slip_path: path });
  // เก็บผลตรวจ — ยังไม่ได้รัน 0003_slip_check.sql (ไม่มีคอลัมน์) ก็ข้ามไปเงียบ ๆ
  if (slipCheck) await saveSlipCheck(id, slipCheck).catch(() => {});
  notifyOrderSlip(updated).catch(() => {});
  return NextResponse.json({ ok: true, order_no: updated.order_no });
}
