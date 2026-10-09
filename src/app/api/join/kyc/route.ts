import { NextResponse } from "next/server";
import { getByMb, saveKyc } from "@/lib/join/store";
import { canResume } from "@/lib/join/resume";

export const runtime = "nodejs";

const MAX_FILE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const bad = (error: string, status = 400, fields?: string[]) => NextResponse.json({ ok: false, error, fields }, { status });

export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return bad("ข้อมูลไม่ถูกต้อง"); }
  const mb = String(form.get("mb") ?? "").trim();
  if (!/^MB-\d{7,}$/.test(mb) || !(await canResume(mb, String(form.get("t") ?? "") || new URL(req.url).searchParams.get("t"))))
    return bad("ลิงก์หมดอายุหรือไม่มีสิทธิ์ กรุณาติดต่อแอดมิน", 403);
  const row = await getByMb(mb);
  if (!row) return bad("ไม่พบใบสมัคร", 404);

  const files: { id_card?: File; selfie?: File } = {};
  const errors: string[] = [];
  for (const k of ["id_card", "selfie"] as const) {
    const f = form.get(k);
    if (f instanceof File && f.size > 0) {
      if (!IMAGE_TYPES.includes(f.type) || f.size > MAX_FILE) errors.push(k);
      else files[k] = f;
    } else if (k === "selfie" || !row.docs.id_card) errors.push(k); // บัตรมีจากใบสมัครแล้วไม่ต้องส่งซ้ำ
  }
  if (errors.length) return bad("กรุณาแนบรูป JPG/PNG/WEBP ไม่เกิน 5MB", 400, errors);
  const address = String(form.get("address") ?? "").trim().slice(0, 500) || undefined;

  try {
    await saveKyc(row.id, files, address);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("kyc failed", e);
    return bad("ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง", 500);
  }
}
