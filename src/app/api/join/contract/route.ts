import { NextResponse } from "next/server";
import { canResume } from "@/lib/join/resume";
import { getByMb, updateApplicant } from "@/lib/join/store";

export const runtime = "nodejs";

// ผู้สมัครกดยอมรับสัญญาฉบับเต็มหลังชำระเงิน — บันทึกเวลาไว้เป็นหลักฐาน
export async function POST(req: Request) {
  const { mb, t } = (await req.json().catch(() => ({}))) as { mb?: string; t?: string };
  if (!mb || !/^M[BS]-\d{7,}$/.test(mb)) return NextResponse.json({ ok: false }, { status: 400 });
  // ยอมรับสัญญาได้เฉพาะเจ้าของรหัส (cookie mb_resume หรือโทเคน t)
  if (!(await canResume(mb, typeof t === "string" ? t.slice(0, 2048) : null))) return NextResponse.json({ ok: false }, { status: 403 });
  const row = await getByMb(mb);
  if (!row) return NextResponse.json({ ok: false }, { status: 404 });
  const at = row.contract_accepted_at ?? new Date().toISOString();
  if (!row.contract_accepted_at) await updateApplicant(row.id, { contract_accepted_at: at });
  return NextResponse.json({ ok: true, at });
}
