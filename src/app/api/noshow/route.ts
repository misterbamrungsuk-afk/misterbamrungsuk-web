import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clientIp, rateLimited } from "@/lib/customer/auth";
import { chatAttempts, savePhoto, submitEvidence } from "@/lib/noshow";
import { NOSHOW_WAIT_MIN, type Evidence } from "@/lib/noshow-rules";
import { getArrival } from "@/lib/arrival";

export const runtime = "nodejs";
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

// จำนวนครั้งที่ติดต่อจากบันทึกแชท (ไม่มีบันทึก → attempts: null ให้กรอกเอง)
export async function GET(req: Request) {
  const u = new URL(req.url);
  const room = u.searchParams.get("room") ?? "";
  const sender = u.searchParams.get("sender") ?? "";
  return NextResponse.json({ ok: true, attempts: room && sender ? chatAttempts(room, sender) : null });
}

// ส่งหลักฐานผิดนัด (multipart) — Part-Time: side=provider (ลูกค้าไม่มา) · ลูกค้า: side=customer (เพื่อนไม่มา)
export async function POST(req: Request) {
  if (!(await cookies()).get("hamoo_session")?.value) return bad("กรุณาเข้าสู่ระบบ", 401);
  if (rateLimited(`noshow:${clientIp(req)}`, 10, 10 * 60_000)) return bad("ส่งบ่อยเกินไป กรุณารอสักครู่", 429);
  const fd = await req.formData().catch(() => null);
  if (!fd) return bad("ข้อมูลไม่ถูกต้อง");
  const s = (k: string) => String(fd.get(k) ?? "").trim();
  const side = s("side");
  if (side !== "provider" && side !== "customer") return bad("side ไม่ถูกต้อง");
  const bookingId = s("bookingId").slice(0, 40);
  if (!/^[0-9A-Za-z-]+$/.test(bookingId)) return bad("ไม่พบนัดหมาย");

  const lat = Number(s("lat")), lng = Number(s("lng")), acc = Number(s("accuracy"));
  const gps = s("lat") && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng, accuracy: Number.isFinite(acc) ? Math.round(acc) : 0 } : null;
  const attempts = Math.max(0, Math.min(99, Math.floor(Number(s("attempts")) || 0)));
  const photoFile = fd.get("photo");
  let photo: string | null = null;
  if (photoFile instanceof File && photoFile.size > 0) {
    photo = await savePhoto(bookingId, side, photoFile);
    if (!photo) return bad("อัปโหลดรูปไม่สำเร็จ (jpg/png/webp ไม่เกิน 8MB)");
  }
  if (side === "provider" && (!photo || (!gps && !s("gpsError")))) return bad("ต้องมีรูปสถานที่และเช็กอิน GPS");

  // Part-Time: ต้องกด "ถึงจุดนัดแล้ว" และรอครบ 15 นาทีนับจากเวลาที่บันทึกบนเซิร์ฟเวอร์
  let arrival: Evidence["arrival"] = null;
  if (side === "provider") {
    const a = await getArrival(bookingId).catch(() => null);
    if (!a) return bad("กด \"ถึงจุดนัดแล้ว\" ก่อน แล้วรอครบ " + NOSHOW_WAIT_MIN + " นาที");
    const left = NOSHOW_WAIT_MIN * 60_000 - (Date.now() - Date.parse(a.arrived_at));
    if (left > 0) return bad(`ยังรอไม่ครบ ${NOSHOW_WAIT_MIN} นาที (อีก ${Math.ceil(left / 60_000)} นาที)`);
    arrival = { at: a.arrived_at, gps: a.lat != null && a.lng != null ? { lat: a.lat, lng: a.lng, accuracy: a.accuracy ?? 0 } : null, gpsError: a.gps_error ?? undefined };
  }

  const evidence: Evidence = {
    at: new Date().toISOString(), gps, gpsError: gps ? undefined : s("gpsError").slice(0, 120) || undefined,
    photo, attempts, attemptsSource: s("attemptsSource") === "chat_log" ? "chat_log" : "manual", note: s("note").slice(0, 500) || undefined,
    ...(arrival ? { arrival } : {}),
  };
  try {
    const claim = await submitEvidence({
      bookingId, side, evidence, amount: Math.max(0, Number(s("amount")) || 0),
      customerName: s("customerName").slice(0, 80), providerName: s("providerName").slice(0, 80), providerId: s("providerId").slice(0, 60),
    });
    return NextResponse.json({ ok: true, id: claim.id, status: claim.status });
  } catch (e) {
    console.error("noshow submit", e);
    return bad("ระบบขัดข้อง กรุณาลองใหม่", 500);
  }
}
