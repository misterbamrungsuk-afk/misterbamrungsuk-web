import "server-only";
import { randomUUID } from "node:crypto";
import { verifiedType } from "@/lib/file-guard";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { store } from "./server-store";
import { STRIKE_EXPIRE_DAYS } from "./strikes";
import { NOSHOW_POINTS, PAYOUT_PERCENT, type ClaimStatus, type Evidence, type NoShowClaim } from "./noshow-rules";

// ที่เก็บคำร้องผิดนัด (no-show)
// - มี SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → ตาราง noshow_claims + bucket private "noshow" (supabase/0002_noshow.sql)
// - ไม่มี → โหมดเดโม เก็บในหน่วยความจำ (หายเมื่อรีสตาร์ท)

const envDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
// ยังไม่ได้รัน migration (ตารางไม่มี) → ใช้หน่วยความจำแทนจนกว่าจะรัน
const gm = globalThis as unknown as { __mbNoShowMissing?: boolean };
export const noshowDemo = () => envDemo || !!gm.__mbNoShowMissing;
function checkMissing(err: { code?: string; message?: string } | null) {
  if (!err) return false;
  if (err.code === "PGRST205" || err.code === "42P01" || /could not find the table|does not exist/i.test(err.message ?? "")) {
    if (!gm.__mbNoShowMissing) console.warn("[noshow] noshow_claims table missing — run supabase/0002_noshow.sql; using in-memory store");
    gm.__mbNoShowMissing = true;
    return true;
  }
  return false;
}

let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));

export interface ProviderStrike { id: string; provider_id: string; reason: string; ref: string | null; points: number; created_at: string }
type Demo = { rows: NoShowClaim[]; files: Map<string, { type: string; data: Buffer }>; strikes: ProviderStrike[] };
const g = globalThis as unknown as { __mbNoShow?: Demo };
const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const demo: Demo = (g.__mbNoShow ??= {
  files: new Map(),
  strikes: [],
  rows: [{
    id: "ns-demo-1", booking_id: "HM-24088", amount: 3800, customer_name: "ป.", provider_name: "มายด์", provider_id: "u3",
    status: "pending", on_hold: true, payout_amount: null, refund_amount: null, strike_added: false, points_deducted: 0,
    decided_by: null, decided_at: null, created_at: ago(3),
    provider_evidence: { at: ago(3), gps: { lat: 13.7306, lng: 100.5848, accuracy: 18 }, photo: null, attempts: 4, attemptsSource: "chat_log", note: "รอหน้าคาเฟ่ 20 นาที โทรไม่รับ" },
    customer_evidence: { at: ago(2), gps: { lat: 13.7419, lng: 100.559, accuracy: 35 }, photo: null, attempts: 1, attemptsSource: "manual", note: "ติดประชุม แจ้งในแชทว่าจะสาย" },
  }],
});

export const PHOTO_RE = /^[0-9a-zA-Z-]+\/(provider|customer)-\d+\.(jpg|png|webp)$/;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function savePhoto(key: string, side: "provider" | "customer", file: File): Promise<string | null> {
  const ext = EXT[file.type];
  if (!ext || file.size > 8 * 1024 * 1024) return null;
  const path = `${key.replace(/[^0-9a-zA-Z-]/g, "") || "x"}/${side}-${Date.now()}.${ext}`;
  const data = Buffer.from(await file.arrayBuffer());
  let type: string;
  try { type = verifiedType(data); } catch { return null; }
  if (type !== file.type) return null;
  if (noshowDemo()) { demo.files.set(path, { type, data }); return path; }
  const { error } = await db().storage.from("noshow").upload(path, data, { contentType: type, upsert: false });
  if (error) { console.warn("noshow upload (bucket missing? run 0002_noshow.sql) — keeping in memory:", error.message); demo.files.set(path, { type, data }); }
  return path;
}

export async function readPhoto(path: string) {
  const local = demo.files.get(path);
  if (local || noshowDemo()) return local ?? null;
  const { data, error } = await db().storage.from("noshow").download(path);
  if (error || !data) return null;
  return { type: data.type, data: Buffer.from(await data.arrayBuffer()) };
}

/** จำนวนครั้งที่ฝ่ายนี้ติดต่ออีกฝ่ายจากบันทึกแชทในแอป (null = ไม่มีบันทึก) */
export function chatAttempts(roomId: string, senderId: string): number | null {
  const room = store().rooms.find((r) => r.id === roomId);
  if (!room) return null;
  return room.messages.filter((m) => m.senderId === senderId && m.kind !== "system").length;
}

export async function listClaims(): Promise<NoShowClaim[]> {
  if (noshowDemo()) return [...demo.rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const { data, error } = await db().from("noshow_claims").select("*").order("created_at", { ascending: false });
  if (checkMissing(error)) return listClaims();
  if (error) throw new Error(error.message);
  return data as NoShowClaim[];
}

/** คำร้องผิดนัดของการจองนี้ (ถ้ามี) */
export async function claimFor(bookingId: string) { return byBooking(bookingId); }
async function byBooking(bookingId: string): Promise<NoShowClaim | null> {
  if (noshowDemo()) return demo.rows.find((r) => r.booking_id === bookingId) ?? null;
  const { data, error } = await db().from("noshow_claims").select("*").eq("booking_id", bookingId).maybeSingle();
  if (checkMissing(error)) return byBooking(bookingId);
  if (error) throw new Error(error.message);
  return (data as NoShowClaim | null) ?? null;
}

/** ส่งหลักฐานของฝ่ายหนึ่ง — สร้างคำร้องใหม่ หรือเติมหลักฐานลงคำร้องเดิมของนัดเดียวกัน */
export async function submitEvidence(input: {
  bookingId: string; side: "provider" | "customer"; evidence: Evidence;
  amount: number; customerName: string; providerName: string; providerId: string;
}): Promise<NoShowClaim> {
  const field = input.side === "provider" ? "provider_evidence" : "customer_evidence";
  const existing = await byBooking(input.bookingId);
  if (existing) {
    if (existing.status !== "pending") return existing; // ตัดสินแล้ว ไม่รับหลักฐานเพิ่ม
    // เติมข้อมูลนัดที่ฝ่ายแรกอาจไม่มี
    const meta: Partial<NoShowClaim> = {};
    if (!Number(existing.amount) && input.amount) meta.amount = input.amount;
    if (!existing.customer_name && input.customerName) meta.customer_name = input.customerName;
    if (!existing.provider_name && input.providerName) meta.provider_name = input.providerName;
    // ฝั่ง Part-Time รู้ id ตัวเองแน่นอน → ใช้แทนค่าที่ลูกค้าส่งมา (strike ต้องลงคนที่ถูก)
    if (input.providerId && (input.side === "provider" ? existing.provider_id !== input.providerId : !existing.provider_id)) meta.provider_id = input.providerId;
    if (noshowDemo()) { Object.assign(existing, meta, { [field]: input.evidence }); return existing; }
    const { data, error } = await db().from("noshow_claims").update({ ...meta, [field]: input.evidence }).eq("id", existing.id).select("*").single();
    if (error) throw new Error(error.message);
    return data as NoShowClaim;
  }
  const row: NoShowClaim = {
    id: randomUUID(), booking_id: input.bookingId, amount: input.amount, customer_name: input.customerName,
    provider_name: input.providerName, provider_id: input.providerId, status: "pending",
    provider_evidence: null, customer_evidence: null,
    on_hold: true, payout_amount: null, refund_amount: null, strike_added: false, points_deducted: 0,
    decided_by: null, decided_at: null, created_at: new Date().toISOString(),
  };
  row[field] = input.evidence;
  if (noshowDemo()) { demo.rows.push(row); return row; }
  const { data, error } = await db().from("noshow_claims").insert(row).select("*").single();
  if (error) throw new Error(error.message);
  return data as NoShowClaim;
}

/** แอดมินตัดสิน — ปลดเงินที่พักไว้ตามผล */
export async function decideClaim(id: string, decision: Exclude<ClaimStatus, "pending">, admin: string): Promise<NoShowClaim | null> {
  const c = (await listClaims()).find((r) => r.id === id);
  if (!c || c.status !== "pending") return null;
  const providerFault = decision === "provider_no_show";
  let payout = providerFault ? 0 : Math.round((Number(c.amount) * PAYOUT_PERCENT) / 100);
  let refund = providerFault ? Number(c.amount) : 0;
  // คำร้องที่ผูกกับการจองจริง → ย้ายเงินจาก escrow ของนัดนั้นก่อน (พลาด = ไม่บันทึกผล ให้แอดมินลองใหม่)
  if (/^[0-9a-f-]{36}$/.test(c.booking_id)) {
    const b = await (await import("./bookings/day")).settleNoShow(c.booking_id, decision, admin, PAYOUT_PERCENT);
    const res = (b.resolution ?? {}) as { pt_satang?: number; refund_satang?: number };
    payout = (res.pt_satang ?? 0) / 100;
    refund = (res.refund_satang ?? 0) / 100;
  }
  const patch: Partial<NoShowClaim> = {
    status: decision, on_hold: false, decided_by: admin, decided_at: new Date().toISOString(),
    payout_amount: payout, refund_amount: refund,
    strike_added: providerFault, points_deducted: providerFault ? NOSHOW_POINTS : 0,
  };
  if (noshowDemo()) {
    Object.assign(c, patch);
    if (providerFault) demo.strikes.push({ id: randomUUID(), provider_id: c.provider_id, reason: "no_show", ref: c.booking_id, points: NOSHOW_POINTS, created_at: patch.decided_at! });
  } else {
    const { data, error } = await db().from("noshow_claims").update(patch).eq("id", id).eq("status", "pending").select("*").single();
    if (error) throw new Error(error.message);
    Object.assign(c, data);
    if (providerFault) {
      if (!c.provider_id) console.warn("[noshow] provider_no_show without provider_id — strike not recorded", c.booking_id);
      else {
        const { error: e2 } = await db().from("provider_strikes").insert({ provider_id: c.provider_id, reason: "no_show", ref: c.booking_id, points: NOSHOW_POINTS, created_at: patch.decided_at });
        // ตาราง strike ไม่มี → เก็บในหน่วยความจำ ไม่ให้ใบเตือนหาย
        if (e2) { console.error("strike insert", e2.message); demo.strikes.push({ id: randomUUID(), provider_id: c.provider_id, reason: "no_show", ref: c.booking_id, points: NOSHOW_POINTS, created_at: patch.decided_at! }); }
      }
    }
  }
  store().audit.unshift({ id: `a-${Date.now()}`, actor: admin, action: `noshow.${decision}`, entity: `Booking ${c.booking_id}`, at: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) });
  return c;
}

// ── ใบเตือน (strike) จากการตัดสิน — provider_strikes หรือหน่วยความจำ ──
const gs = globalThis as unknown as { __mbStrikesMissing?: boolean };
async function strikeRows(providerId?: string): Promise<ProviderStrike[]> {
  const local = demo.strikes.filter((s) => !providerId || s.provider_id === providerId);
  if (envDemo || gs.__mbStrikesMissing) return local;
  let q = db().from("provider_strikes").select("*").order("created_at", { ascending: false }).limit(500);
  if (providerId) q = q.eq("provider_id", providerId);
  const { data, error } = await q;
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01" || /could not find the table|does not exist/i.test(error.message)) {
      if (!gs.__mbStrikesMissing) console.warn("[noshow] provider_strikes table missing — run supabase/0002_noshow.sql; using in-memory store");
      gs.__mbStrikesMissing = true;
    } else console.error("strikes select", error.message);
    return local;
  }
  return [...(data as ProviderStrike[]), ...local];
}

/** ใบเตือนของ Part-Time คนหนึ่ง (ใหม่ → เก่า) */
export async function listStrikes(providerId: string): Promise<ProviderStrike[]> {
  return (await strikeRows(providerId)).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** จำนวนใบเตือนที่ยังไม่หมดอายุ ต่อ provider_id (สำหรับแอดมิน) */
export async function strikeCounts(expireDays: number): Promise<Record<string, number>> {
  const since = new Date(Date.now() - expireDays * 86400_000).toISOString();
  const out: Record<string, number> = {};
  for (const s of await strikeRows()) if (s.created_at >= since) out[s.provider_id] = (out[s.provider_id] ?? 0) + 1;
  return out;
}

/** ใบเตือนของ Part-Time คนนี้ที่ยังไม่หมดอายุ (parttime_id = applicant id) — ใช้แสดงในหน้าใบเตือนของ Part-Time
 *  count = จำนวนใบ · points = คะแนนที่ถูกหักรวม · strikes = รายการ (ใหม่ → เก่า) */
export async function strikesFor(parttime_id: string, expireDays = STRIKE_EXPIRE_DAYS): Promise<{ count: number; points: number; strikes: ProviderStrike[] }> {
  const since = new Date(Date.now() - expireDays * 86400_000).toISOString();
  const strikes = (await listStrikes(parttime_id)).filter((s) => s.created_at >= since);
  return { count: strikes.length, points: strikes.reduce((t, s) => t + (s.points || 0), 0), strikes };
}
