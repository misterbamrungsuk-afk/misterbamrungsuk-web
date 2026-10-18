import { NextResponse } from "next/server";
import { currentParttime } from "@/lib/bookings/auth";
import { limited } from "@/lib/rate-limit";
import { FileTypeError } from "@/lib/file-guard";
import { AppealError, strikesWithAppeals, submitAppeal } from "@/lib/appeals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// อุทธรณ์ใบเตือนของ Part-Time
// GET ?mb=&t= → { count (ใบที่ยังมีผล), voided, strikes: [{ id, reason, ref, points, created_at, appeal }] }
// POST multipart { mb, t, strike_id, reason (≤1000), photo? } → ยื่นอุทธรณ์ (ใบละครั้ง)
export async function GET(req: Request) {
  const u = new URL(req.url);
  const a = await currentParttime(u.searchParams.get("mb") ?? "", u.searchParams.get("t"));
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  const r = await strikesWithAppeals(a.id);
  return NextResponse.json({
    ok: true, count: r.count, voided: r.voided,
    strikes: r.strikes.map((s) => ({ id: s.id, reason: s.reason, ref: s.ref, points: s.points, created_at: s.created_at, appeal: s.appeal ? { status: s.appeal.status, note: s.appeal.decision_note, created_at: s.appeal.created_at } : null })),
  });
}

export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ ok: false, error: "ข้อมูลไม่ครบ" }, { status: 400 });
  const a = await currentParttime(String(fd.get("mb") ?? ""), (fd.get("t") as string | null) || null);
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  if (await limited(`appeal:${a.id}`, 10, 60 * 60_000)) return NextResponse.json({ ok: false, error: "ส่งบ่อยเกินไป ลองใหม่ภายหลัง" }, { status: 429 });
  const photo = fd.get("photo");
  try {
    const ap = await submitAppeal(a, String(fd.get("strike_id") ?? ""), String(fd.get("reason") ?? ""), photo instanceof File && photo.size ? photo : null);
    return NextResponse.json({ ok: true, id: ap.id, status: ap.status });
  } catch (e) {
    if (e instanceof AppealError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    if (e instanceof FileTypeError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("appeal submit", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
