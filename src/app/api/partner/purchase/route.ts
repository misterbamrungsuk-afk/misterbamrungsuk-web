import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { clientIp } from "@/lib/customer/auth";
import { PACKAGE_KEYS, PARTNER_PACKAGES, type PartnerPackageKey } from "@/lib/partner/config";
import { currentPartner, verifyApplyToken } from "@/lib/partner/auth";
import { IMAGE_TYPES, MAX_FILE, createPurchase, putPartnerFile } from "@/lib/partner/portal";
import { db, getPartner, isDemo } from "@/lib/partner/store";
import { verifySlip } from "@/lib/slip2go";
import { notifyPurchase } from "@/lib/partner/notify";

export const runtime = "nodejs";
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

// ชำระค่าแผนโปรโมท (QR + สลิป) → purchase สถานะ pending รอแอดมินตรวจ
// ผู้เรียก: พาร์ทเนอร์ที่ล็อกอิน (ต่ออายุ/อัปเกรด) หรือผู้สมัครใหม่ที่ถือ token จากฟอร์มสมัคร
export async function POST(req: Request) {
  if (await limited(`ppay:${clientIp(req)}`, 6, 10 * 60_000)) return bad("ส่งบ่อยเกินไป กรุณารอสักครู่", 429);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("ข้อมูลไม่ถูกต้อง");
  }
  const tokenPid = verifyApplyToken(String(form.get("token") ?? ""));
  const partner = tokenPid ? await getPartner(tokenPid) : await currentPartner();
  if (!partner) return bad("กรุณาเข้าสู่ระบบ", 401);

  const pkg = String(form.get("package") ?? "") as PartnerPackageKey;
  if (!PACKAGE_KEYS.includes(pkg)) return bad("เลือกแผนโปรโมท");
  if (PARTNER_PACKAGES[pkg].price == null) return bad("แผนโปรโมทนี้กรุณาติดต่อทีมงาน");
  const slip = form.get("slip");
  if (!(slip instanceof File) || !slip.size) return bad("แนบสลิปการโอนก่อน");
  if (!IMAGE_TYPES.includes(slip.type) || slip.size > MAX_FILE) return bad("สลิปต้องเป็นรูป JPG/PNG/WEBP ไม่เกิน 5MB");

  // ตรวจสลิปผ่าน Slip2Go (ไม่มี secret → null ข้าม) — ปฏิเสธสลิปซ้ำ / โอนผิดบัญชี (ข้อความเดียวกับ /api/join/register)
  const slipCheck = await verifySlip(slip, PARTNER_PACKAGES[pkg].price!);
  if (slipCheck?.verdict === "dup") return NextResponse.json({ ok: false, error: "สลิปนี้เคยถูกใช้แล้ว กรุณาแนบสลิปของการโอนครั้งนี้", fields: ["slip"] }, { status: 400 });
  if (slipCheck?.verdict === "acct") return NextResponse.json({ ok: false, error: "สลิปนี้โอนเข้าบัญชีที่ไม่ใช่ของ Mister Bamrungsuk กรุณาโอนผ่าน QR ในหน้านี้ แล้วแนบสลิปใหม่", fields: ["slip"] }, { status: 400 });

  try {
    const path = await putPartnerFile(partner.id, "slips", slip);
    const row = await createPurchase(partner.id, pkg, path);
    // เก็บผลตรวจแยก (คอลัมน์จาก supabase/partner/0004_slip_check.sql) — ยังไม่รัน migration ก็ไม่ทำให้การซื้อล้ม
    if (slipCheck && !isDemo) {
      const { error } = await db().from("partner_purchases").update({ slip_check: slipCheck }).eq("id", row.id);
      if (error) console.error("partner slip_check save", error.message);
    }
    void notifyPurchase(partner, row);
    return NextResponse.json({ ok: true, invoice_no: row.invoice_no });
  } catch (e) {
    console.error("partner purchase", e);
    return bad("ระบบขัดข้อง กรุณาลองใหม่", 500);
  }
}
