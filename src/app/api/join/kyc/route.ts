import { NextResponse } from "next/server";
import { FileTypeError } from "@/lib/file-guard";
import { clearFixes, extraOf, getByMb, saveKyc } from "@/lib/join/store";
import { canResume } from "@/lib/join/resume";

export const runtime = "nodejs";

const MAX_FILE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const bad = (error: string, status = 400, fields?: string[]) => NextResponse.json({ ok: false, error, fields }, { status });

export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return bad("ข้อมูลไม่ถูกต้อง"); }
  const mb = String(form.get("mb") ?? "").trim();
  if (!/^MB[MT]?-\d{7,}$/.test(mb) || !(await canResume(mb, String(form.get("t") ?? "") || new URL(req.url).searchParams.get("t"))))
    return bad("ลิงก์หมดอายุหรือไม่มีสิทธิ์ กรุณาติดต่อแอดมิน", 403);
  const row = await getByMb(mb);
  if (!row) return bad("ไม่พบใบสมัคร", 404);

  if (extraOf(row).kyc_status === "approved") return bad("ยืนยันตัวตนผ่านแล้ว · ต้องการเปลี่ยนเอกสาร ติดต่อทีมงานทาง LINE", 409);
  const files: { id_card?: File; selfie?: File; id_copy?: File } = {};
  const errors: string[] = [];
  // ถูกตีกลับ → ส่งเฉพาะรายการที่ต้องแก้ · ครั้งแรกต้องครบ (บัตรมีจากใบสมัครแล้วไม่ต้องส่งซ้ำ)
  const fix = extraOf(row).kyc_status === "rejected" ? extraOf(row).kyc_reason ?? {} : {};
  for (const k of ["id_card", "id_copy", "selfie"] as const) {
    const f = form.get(k);
    if (f instanceof File && f.size > 0) {
      if (!IMAGE_TYPES.includes(f.type) || f.size > MAX_FILE) errors.push(k);
      else files[k] = f;
    } else if (!row.docs[k] || fix[k]) errors.push(k);
  }
  if (errors.length) return bad("กรุณาแนบรูป JPG/PNG/WEBP ไม่เกิน 5MB", 400, errors);
  const address = String(form.get("address") ?? "").trim().slice(0, 500) || undefined;

  try {
    await saveKyc(row.id, files, address);
    await clearFixes(row, Object.keys(files));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("kyc failed", e);
    return e instanceof FileTypeError ? bad(e.message, 400) : bad("ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง", 500);
  }
}
