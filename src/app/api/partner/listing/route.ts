import { NextResponse } from "next/server";
import { currentPartner } from "@/lib/partner/auth";
import { PARTNER_TYPES } from "@/lib/partner/config";
import { PATH_RE, saveListing } from "@/lib/partner/portal";
import { AMENITIES, type DayHours } from "@/lib/partner/portal-types";

export const runtime = "nodejs";
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function PUT(req: Request) {
  const p = await currentPartner();
  if (!p) return bad("กรุณาเข้าสู่ระบบ", 401);
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return bad("ข้อมูลไม่ถูกต้อง");
  // รูปต้องเป็นของพาร์ทเนอร์คนนี้เท่านั้น
  const own = (v: unknown): v is string => typeof v === "string" && PATH_RE.test(v) && v.startsWith(`${p.id}/listing/`);
  let cover: string | null = null;
  if (b.cover != null && b.cover !== "") {
    if (!own(b.cover)) return bad("รูปปกไม่ถูกต้อง");
    cover = b.cover;
  }
  const gallery = Array.isArray(b.gallery) ? b.gallery.filter(own).slice(0, 12) : [];
  const type = String(b.type ?? "");
  if (type && !(PARTNER_TYPES as readonly string[]).includes(type)) return bad("ประเภทธุรกิจไม่ถูกต้อง");
  const hours: DayHours[] = [];
  if (Array.isArray(b.hours)) {
    for (const h of b.hours.slice(0, 7) as Record<string, unknown>[]) {
      const day = Number(h?.day);
      if (!(day >= 0 && day <= 6) || !TIME.test(String(h.from)) || !TIME.test(String(h.to))) return bad("เวลาเปิด-ปิดไม่ถูกต้อง");
      hours.push({ day, open: h.open === true, from: String(h.from), to: String(h.to) });
    }
  }
  const rooms = Math.round(Number(b.rooms));
  if (!(rooms >= 0 && rooms <= 200)) return bad("จำนวนห้องไม่ถูกต้อง");
  const amenities = Array.isArray(b.amenities) ? b.amenities.map(String).filter((a) => AMENITIES.includes(a)) : [];
  // เปิดแสดงได้เมื่อบัญชีอนุมัติแล้วเท่านั้น
  const canPublish = p.account_status === "approved" || p.account_status === "active";
  try {
    const row = await saveListing({
      partner_id: p.id, cover, gallery, type: type || null, description: String(b.description ?? "").trim().slice(0, 2000) || null,
      hours, rooms, amenities, area: String(b.area ?? "").trim().slice(0, 120) || null, published: canPublish && b.published === true,
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, row, publishBlocked: b.published === true && !canPublish });
  } catch (e) {
    console.error("listing save", e);
    return bad("บันทึกไม่สำเร็จ", 500);
  }
}
