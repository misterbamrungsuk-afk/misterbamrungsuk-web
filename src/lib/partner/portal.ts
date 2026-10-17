import "server-only";
import { PARTNER_PACKAGES, type PartnerPackageKey } from "./config";
import { EXT_OF, verifiedType } from "@/lib/file-guard";
import { db, endDateFor, getPartner, isDemo, updatePartner } from "./store";
import { DEFAULT_HOURS, type BookingStatus, type Listing, type PartnerBooking, type Purchase } from "./portal-types";
import { qcPassed } from "./kind";

/** คอลัมน์ใหม่ (0006_business.sql) ยังไม่ถูกรัน → PostgREST ตอบ PGRST204 / 42703 — ใช้ลองใหม่แบบไม่ส่งคอลัมน์นั้น */
const missingCol = (e: unknown) => { const x = e as { code?: string; message?: string } | null; return x?.code === "PGRST204" || x?.code === "42703" || /column/i.test(String(x?.message ?? "")); };
export class PurchaseError extends Error {}

// ข้อมูลพอร์ทัลพาร์ทเนอร์ (migration 0002_portal.sql) — Supabase service role หรือโหมดเดโมในหน่วยความจำ
// ไฟล์ (สลิป/รูปหน้าร้าน) อยู่ใน bucket private "partners" → เสิร์ฟผ่าน /api/partner/file

const BUCKET = "partners";
type DemoFile = { type: string; data: Buffer };
type Demo = { listings: Map<string, Listing>; purchases: Purchase[]; bookings: PartnerBooking[]; files: Map<string, DemoFile> };
const g = globalThis as unknown as { __mbPartnerPortal?: Demo };
const demo: Demo = (g.__mbPartnerPortal ??= { listings: new Map(), purchases: [], bookings: [], files: new Map() });

// ── ไฟล์ ──
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_FILE = 5 * 1024 * 1024;
/** เอกสาร QC รับ PDF ด้วย */
export const QC_TYPES = [...IMAGE_TYPES, "application/pdf"];
const extOf = (f: File) => (f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : f.type === "application/pdf" ? "pdf" : "jpg");

/** kind: slips | listing | qc → path `${pid}/${kind}/${uuid}.ext` */
export async function putPartnerFile(pid: string, kind: "slips" | "listing" | "qc", file: File): Promise<string> {
  const data = Buffer.from(await file.arrayBuffer());
  const type = verifiedType(data, kind === "qc" ? ["image/jpeg", "image/png", "image/webp", "application/pdf"] : ["image/jpeg", "image/png", "image/webp"]);
  const path = `${pid}/${kind}/${crypto.randomUUID()}.${EXT_OF[type]}`;
  if (isDemo) demo.files.set(path, { type, data });
  else {
    const { error } = await db().storage.from(BUCKET).upload(path, data, { contentType: type, upsert: false });
    if (error) throw error;
  }
  return path;
}

export async function readPartnerFile(path: string): Promise<DemoFile | null> {
  if (isDemo) return demo.files.get(path) ?? null;
  const { data, error } = await db().storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return { type: data.type, data: Buffer.from(await data.arrayBuffer()) };
}

export const PATH_RE = /^([0-9a-f-]{36})\/(slips|listing|qc)\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/;

// ── หน้าร้าน ──
export const emptyListing = (pid: string): Listing => ({
  partner_id: pid, cover: null, gallery: [], type: null, description: null, hours: DEFAULT_HOURS, rooms: 1, amenities: [], services: [], area: null, published: false, updated_at: new Date().toISOString(),
});

export async function getListing(pid: string): Promise<Listing> {
  if (isDemo) return demo.listings.get(pid) ?? emptyListing(pid);
  const { data, error } = await db().from("partner_listings").select("*").eq("partner_id", pid).maybeSingle();
  if (error) throw error;
  return (data as Listing) ?? emptyListing(pid);
}

export async function saveListing(l: Listing): Promise<Listing> {
  const row = { ...l, updated_at: new Date().toISOString() };
  if (isDemo) {
    demo.listings.set(l.partner_id, row);
    return row;
  }
  let { data, error } = await db().from("partner_listings").upsert(row, { onConflict: "partner_id" }).select().single();
  // ยังไม่รัน 0006 (ไม่มีคอลัมน์ contact) → บันทึกส่วนอื่นได้ก่อน
  if (error && missingCol(error) && "contact" in row) {
    const { contact: _c, ...rest } = row; void _c;
    ({ data, error } = await db().from("partner_listings").upsert(rest, { onConflict: "partner_id" }).select().single());
  }
  if (error) throw error;
  return data as Listing;
}

// ── แผนโปรโมท ──
function invoiceNo() {
  const th = new Date(Date.now() + 7 * 3600_000);
  return `PI-${String(th.getUTCFullYear()).slice(2)}${String(th.getUTCMonth() + 1).padStart(2, "0")}${String(th.getUTCDate()).padStart(2, "0")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

/** สลิปที่ยังรอตรวจของพาร์ทเนอร์นี้ (ถ้ามี) — กันส่งซ้ำ */
export async function pendingPurchase(pid: string): Promise<Purchase | null> {
  return (await listPurchases(pid)).find((x) => x.status === "pending") ?? null;
}

export async function createPurchase(pid: string, pkg: PartnerPackageKey, slip: string): Promise<Purchase> {
  const price = PARTNER_PACKAGES[pkg].price;
  if (price == null) throw new Error("package has no price");
  // มีสลิปรอตรวจอยู่แล้ว = ไม่สร้างรายการใหม่ (กดซ้ำ / ส่งสลิปซ้อน)
  const open = await pendingPurchase(pid);
  if (open) throw new PurchaseError(`มีสลิปรอตรวจอยู่แล้ว (${open.invoice_no}) · ทีมงานตรวจภายใน 24 ชม. ถ้าแนบผิด ติดต่อทีมงานทาง LINE`);
  const row: Purchase = {
    id: crypto.randomUUID(), partner_id: pid, invoice_no: invoiceNo(), package: pkg, amount: price, slip_url: slip,
    status: "pending", starts_at: null, ends_at: null, note: null, created_at: new Date().toISOString(), decided_at: null,
  };
  if (isDemo) {
    demo.purchases.push(row);
    return row;
  }
  const { data, error } = await db().from("partner_purchases").insert(row).select().single();
  if (error) throw error;
  return data as Purchase;
}

export async function listPurchases(pid?: string): Promise<Purchase[]> {
  if (isDemo) return demo.purchases.filter((x) => !pid || x.partner_id === pid).slice().reverse();
  let q = db().from("partner_purchases").select("*").order("created_at", { ascending: false });
  if (pid) q = q.eq("partner_id", pid);
  const { data, error } = await q;
  if (error) throw error;
  return data as Purchase[];
}

const today = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const nextDay = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + 86400_000).toISOString().slice(0, 10);

/** แอดมินอนุมัติ/ปฏิเสธสลิป — อนุมัติ = ต่อจากวันหมดอายุเดิม (ถ้ายังไม่หมด) หรือเริ่มวันนี้ */
export async function decidePurchase(id: string, action: "approve" | "reject", note?: string): Promise<Purchase | null> {
  const all = isDemo ? demo.purchases : null;
  let cur: Purchase | null;
  if (all) cur = all.find((x) => x.id === id) ?? null;
  else {
    const { data, error } = await db().from("partner_purchases").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    cur = (data as Purchase) ?? null;
  }
  if (!cur || cur.status !== "pending") return cur;
  const patch: Partial<Purchase> = { status: action === "approve" ? "paid" : "rejected", decided_at: new Date().toISOString(), note: note ?? cur.note };

  if (action === "approve") {
    const p = await getPartner(cur.partner_id);
    if (!p) return null;
    const t = today();
    const start = p.ends_at && p.ends_at >= t ? nextDay(p.ends_at) : t;
    patch.starts_at = start;
    patch.ends_at = endDateFor(start, cur.package);
    // จ่ายแล้วแต่ยังไม่ผ่าน QC = อนุมัติบัญชี (เข้าพอร์ทัล/แก้หน้าร้านได้) แต่ยังไม่เปิดแสดง — เปิดเมื่อแอดมินกดผ่าน QC
    const live = qcPassed(p);
    await updatePartner(p.id, {
      package: cur.package,
      starts_at: p.ends_at && p.ends_at >= t && p.starts_at ? p.starts_at : start,
      ends_at: patch.ends_at,
      amount: (p.amount || 0) + cur.amount,
      status: live ? "active" : p.status === "rejected" || p.status === "expired" ? p.status : "qc",
      account_status: live ? "active" : "approved",
    });
  }
  if (all) {
    Object.assign(cur, patch);
    return cur;
  }
  const { data, error } = await db().from("partner_purchases").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Purchase;
}

// ── การจอง ──
/** % ที่แพลตฟอร์มเก็บจากค่าห้องของการจองนี้ (snapshot ตอนเพื่อนตอบรับ ใน partner_bookings) · ไม่มี = % ปัจจุบันของพาร์ทเนอร์ · ไม่ตั้ง = 0
 *  ใช้ใน lib/bookings/day.ts (roomLeg) เพื่อแบ่ง ค่าห้อง → พาร์ทเนอร์ (100−%) / รายได้บริษัท (%) */
export async function bookingPlatformPct(code: string, pid: string): Promise<number> {
  let pct: number | null = null;
  if (isDemo) pct = demo.bookings.find((x) => x.booking_ref === code)?.platform_pct ?? null;
  else {
    const { data } = await db().from("partner_bookings").select("platform_pct").eq("booking_ref", code).maybeSingle();
    pct = (data as { platform_pct: number | null } | null)?.platform_pct ?? null;
  }
  if (pct == null) pct = (await getPartner(pid).catch(() => null))?.platform_pct ?? null;
  const n = Number(pct ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}
export async function listBookings(pid: string, sinceIso?: string): Promise<PartnerBooking[]> {
  if (isDemo) return demo.bookings.filter((b) => b.partner_id === pid && (!sinceIso || b.start_time >= sinceIso)).sort((a, b) => a.start_time.localeCompare(b.start_time));
  let q = db().from("partner_bookings").select("*").eq("partner_id", pid).order("start_time", { ascending: true }).limit(500);
  if (sinceIso) q = q.gte("start_time", sinceIso);
  const { data, error } = await q;
  if (error) throw error;
  return data as PartnerBooking[];
}

/** พาร์ทเนอร์ยืนยัน (พร้อมห้อง) หรือแจ้งห้องเต็ม — เฉพาะรายการของตัวเองที่ยังรอยืนยัน/ยืนยันแล้ว */
export async function actOnBooking(pid: string, id: string, status: Extract<BookingStatus, "confirmed" | "full">, room: string | null): Promise<PartnerBooking | null> {
  const patch = { status, room: status === "confirmed" ? room : null, updated_at: new Date().toISOString() };
  if (isDemo) {
    const b = demo.bookings.find((x) => x.id === id && x.partner_id === pid && (x.status === "pending" || x.status === "confirmed"));
    if (b) Object.assign(b, patch);
    return b ?? null;
  }
  const { data, error } = await db().from("partner_bookings").update(patch).eq("id", id).eq("partner_id", pid).in("status", ["pending", "confirmed"]).select().maybeSingle();
  if (error) throw error;
  return (data as PartnerBooking) ?? null;
}

/** การจองจริงที่ลูกค้าเลือกสปาพาร์ทเนอร์ (#26) — เพื่อนตอบรับ = เข้าพอร์ทัลเป็น "รอยืนยัน" · จบ = เสร็จสิ้น · ยกเลิก/คืนเงิน = ยกเลิก
 *  ไม่ทับสถานะที่พาร์ทเนอร์ตั้งเอง (ยืนยัน/ห้องเต็ม) ระหว่างนัดยังเดินอยู่ · ไม่ส่งข้อมูลติดต่อลูกค้า */
export async function syncSpaBooking(b: { code: string; status: string; starts_at: string; hours: number; room_fee_satang: number; customer_name: string | null; parttime_nick: string | null; note?: string | null; place: { spa_id?: string } }) {
  const pid = b.place.spa_id;
  if (!pid || (!isDemo && !/^[0-9a-f-]{36}$/.test(pid))) return;
  const to: BookingStatus | null = b.status === "accepted" ? "pending" : b.status === "completed" ? "done" : ["refunded", "cancelled"].includes(b.status) ? "cancelled" : null;
  if (!to) return;
  const nowIso = new Date().toISOString();
  // บริการที่ลูกค้าเลือก (place.spa_service) → ช่อง addon · % แพลตฟอร์ม = ค่าที่แอดมินตั้งให้พาร์ทเนอร์ ณ ตอนจอง
  const svc = String((b.place as { spa_service?: unknown }).spa_service ?? "").slice(0, 80) || null;
  const pct = to === "pending" ? (await getPartner(pid).catch(() => null))?.platform_pct ?? null : null;
  const first = String(b.customer_name ?? "").trim().split(/\s+/)[0]?.slice(0, 40) ?? "";
  const row = { partner_id: pid, booking_ref: b.code, customer_name: first, parttime_name: b.parttime_nick ?? "เพื่อน", start_time: b.starts_at, hours: b.hours, room: null, addon: svc, status: to, amount: Math.round(b.room_fee_satang / 100), platform_pct: pct == null ? null : Number(pct), note: String(b.note ?? "").trim().slice(0, 300) || null };
  if (isDemo) {
    const cur = demo.bookings.find((x) => x.booking_ref === b.code);
    if (cur) { if (to !== "pending") Object.assign(cur, { status: to }); }
    else if (to === "pending") demo.bookings.push({ ...row, id: crypto.randomUUID(), created_at: nowIso });
    return;
  }
  if (to === "pending") {
    let { error } = await db().from("partner_bookings").upsert(row, { onConflict: "booking_ref", ignoreDuplicates: true });
    if (error && missingCol(error)) { const { note: _n, ...rest } = row; void _n; ({ error } = await db().from("partner_bookings").upsert(rest, { onConflict: "booking_ref", ignoreDuplicates: true })); }
    if (error) throw error;
  } else {
    const { error } = await db().from("partner_bookings").update({ status: to, updated_at: nowIso }).eq("booking_ref", b.code);
    if (error) throw error;
  }
}
