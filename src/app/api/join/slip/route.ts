import { NextResponse } from "next/server";
import { FileTypeError } from "@/lib/file-guard";
import { limited as dbLimited } from "@/lib/rate-limit";
import { clearFixes, extraOf, getByMb, saveSlip } from "@/lib/join/store";
import { canResume } from "@/lib/join/resume";
import { verifySlip } from "@/lib/slip2go";

export const runtime = "nodejs";

const MAX_FILE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const bad = (error: string, status = 400, fields?: string[]) => NextResponse.json({ ok: false, error, fields }, { status });

// ส่งสลิปใหม่ — เฉพาะใบสมัครที่ยังรอตรวจสลิป หรือแอดมินตีกลับสลิป · ตรวจ Slip2Go ซ้ำ (สลิปซ้ำ/โอนผิดบัญชี ไม่รับ)
export async function POST(req: Request) {
  if (await dbLimited(`jslip:${(req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim()}`, 6, 10 * 60_000)) return Response.json({ ok: false, error: "ลองบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  let form: FormData;
  try { form = await req.formData(); } catch { return bad("ข้อมูลไม่ถูกต้อง"); }
  const mb = String(form.get("mb") ?? "").trim();
  if (!/^M[BS]-\d{7,}$/.test(mb) || !(await canResume(mb, String(form.get("t") ?? "").slice(0, 2048) || null)))
    return bad("ลิงก์หมดอายุหรือไม่มีสิทธิ์ กรุณาติดต่อแอดมิน", 403);
  const row = await getByMb(mb);
  if (!row) return bad("ไม่พบใบสมัคร", 404);
  const x = extraOf(row);
  const asked = x.kyc_status === "rejected" && !!x.kyc_reason?.slip;
  if (row.status !== "pending_slip" && !asked) return bad("ใบสมัครนี้ตรวจสลิปแล้ว ไม่ต้องส่งใหม่", 409);

  const f = form.get("slip");
  if (!(f instanceof File) || f.size === 0) return bad("กรุณาแนบสลิป", 400, ["slip"]);
  if (!IMAGE_TYPES.includes(f.type) || f.size > MAX_FILE) return bad("สลิปต้องเป็นรูป JPG/PNG/WEBP ไม่เกิน 5MB", 400, ["slip"]);

  const check = await verifySlip(f, row.amount);
  if (check?.verdict === "dup") return bad("สลิปนี้เคยถูกใช้แล้ว กรุณาแนบสลิปของการโอนครั้งนี้", 400, ["slip"]);
  if (check?.verdict === "acct") return bad("สลิปนี้โอนเข้าบัญชีที่ไม่ใช่ของ Mister Bamrungsuk กรุณาโอนผ่าน QR แล้วแนบสลิปใหม่", 400, ["slip"]);

  try {
    await saveSlip(row.id, f, check);
    await clearFixes(row, ["slip"]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("slip resend failed", e);
    return e instanceof FileTypeError ? bad(e.message, 400) : bad("ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง", 500);
  }
}
