import { NextResponse } from "next/server";
import { getByMb, updateApplicant } from "@/lib/join/store";

export const runtime = "nodejs";

// ผู้สมัครกดยอมรับสัญญาฉบับเต็มหลังชำระเงิน — บันทึกเวลาไว้เป็นหลักฐาน
export async function POST(req: Request) {
  const { mb } = (await req.json().catch(() => ({}))) as { mb?: string };
  if (!mb || !/^MB-\d{7,}$/.test(mb)) return NextResponse.json({ ok: false }, { status: 400 });
  const row = await getByMb(mb);
  if (!row) return NextResponse.json({ ok: false }, { status: 404 });
  const at = row.contract_accepted_at ?? new Date().toISOString();
  if (!row.contract_accepted_at) await updateApplicant(row.id, { contract_accepted_at: at });
  return NextResponse.json({ ok: true, at });
}
