import { NextResponse } from "next/server";
import { currentPartner } from "@/lib/partner/auth";
import { IMAGE_TYPES, MAX_FILE, putPartnerFile } from "@/lib/partner/portal";

export const runtime = "nodejs";

// อัปโหลดรูปหน้าร้าน (ปก/แกลเลอรี) → คืน path ใน bucket partners
export async function POST(req: Request) {
  const p = await currentPartner();
  if (!p) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const f = form?.get("file");
  if (!(f instanceof File) || !f.size || !IMAGE_TYPES.includes(f.type) || f.size > MAX_FILE) return NextResponse.json({ ok: false, error: "รูปต้องเป็น JPG/PNG/WEBP ไม่เกิน 5MB" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, path: await putPartnerFile(p.id, "listing", f) });
  } catch (e) {
    console.error("listing image", e);
    return NextResponse.json({ ok: false, error: "อัปโหลดไม่สำเร็จ" }, { status: 500 });
  }
}
