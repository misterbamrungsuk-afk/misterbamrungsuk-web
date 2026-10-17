import { NextResponse } from "next/server";
import { currentPartner } from "@/lib/partner/auth";
import { isListingType } from "@/lib/partner/kind";
import { PATH_RE, getListing, saveListing } from "@/lib/partner/portal";
import { AMENITIES, type DayHours, type ListingContact, type ServiceItem } from "@/lib/partner/portal-types";

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
  // รับทั้งประเภทเดิมและประเภทจากฟอร์มสมัคร (เดย์สปา/สปาเพื่อสุขภาพ/ร้านนวด ฯลฯ) — บันทึกครั้งแรกไม่ล้ม
  if (type && !isListingType(type)) return bad("ประเภทธุรกิจไม่ถูกต้อง");
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
  // บริการ: พาร์ทเนอร์กำหนดชื่อ/เวลา/ราคาฐานเอง — ราคาแพลตฟอร์มคงค่าเดิม (ทีมงานเป็นผู้กำหนด)
  const old = await getListing(p.id).catch(() => null);
  const prev = new Map((old?.services ?? []).map((x) => [x.name, x]));
  const prevById = new Map((old?.services ?? []).filter((x) => x.id).map((x) => [x.id!, x]));
  const services: ServiceItem[] = [];
  if (Array.isArray(b.services)) {
    for (const x of b.services.slice(0, 30) as Record<string, unknown>[]) {
      const name = String(x?.name ?? "").trim().slice(0, 80);
      const minutes = Math.round(Number(x?.minutes));
      const base_price = Math.round(Number(x?.base_price));
      if (!name) continue;
      if (!(minutes >= 0 && minutes <= 600) || !(base_price >= 0 && base_price <= 1_000_000)) return bad(`ข้อมูลบริการ "${name}" ไม่ถูกต้อง`);
      // id คงที่ (ลูกค้าเลือกตอนจอง) — คงของเดิมถ้าส่งมา ไม่งั้นสร้างใหม่ · ราคาแพลตฟอร์มคงตาม id/ชื่อเดิม
      const pid0 = typeof x?.id === "string" && prevById.has(x.id) ? x.id : null;
      const was = (pid0 ? prevById.get(pid0) : null) ?? prev.get(name);
      services.push({ id: pid0 ?? was?.id ?? crypto.randomUUID().slice(0, 8), name, minutes, base_price, platform_price: was?.platform_price ?? null });
    }
  }
  // ช่องทางติดต่อสาธารณะ (แสดงบนหน้าร้าน แทนเบอร์ส่วนตัวในใบสมัคร)
  const c = (b.contact ?? {}) as Record<string, unknown>;
  const t = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
  const mapUrl = t(c.map_url, 500);
  if (mapUrl && !/^https:\/\//.test(mapUrl)) return bad("ลิงก์แผนที่ต้องขึ้นต้นด้วย https://");
  const lat = c.lat === "" || c.lat == null ? null : Number(c.lat), lng = c.lng === "" || c.lng == null ? null : Number(c.lng);
  const pinOk = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const contact: ListingContact = { phone: t(c.phone, 20).replace(/[^\d+\- ]/g, ""), line_id: t(c.line_id, 60), address: t(c.address, 300), map_url: mapUrl, lat: pinOk ? lat : null, lng: pinOk ? lng : null };
  // เปิดแสดงได้เมื่อบัญชีอนุมัติแล้วเท่านั้น
  const canPublish = p.account_status === "approved" || p.account_status === "active";
  try {
    const row = await saveListing({
      partner_id: p.id, cover, gallery, type: type || null, description: String(b.description ?? "").trim().slice(0, 2000) || null,
      hours, rooms, amenities, services, contact, area: String(b.area ?? "").trim().slice(0, 120) || null, published: canPublish && b.published === true,
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, row, publishBlocked: b.published === true && !canPublish });
  } catch (e) {
    console.error("listing save", e);
    return bad("บันทึกไม่สำเร็จ", 500);
  }
}
