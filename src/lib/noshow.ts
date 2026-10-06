import "server-only";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { store } from "./server-store";
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

type Demo = { rows: NoShowClaim[]; files: Map<string, { type: string; data: Buffer }>; strikes: { providerId: string; ref: string; at: string }[] };
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
  if (noshowDemo()) { demo.files.set(path, { type: file.type, data }); return path; }
  const { error } = await db().storage.from("noshow").upload(path, data, { contentType: file.type, upsert: false });
  if (error) { console.warn("noshow upload (bucket missing? run 0002_noshow.sql) — keeping in memory:", error.message); demo.files.set(path, { type: file.type, data }); }
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
    if (!existing.provider_id && input.providerId) meta.provider_id = input.providerId;
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
  const patch: Partial<NoShowClaim> = {
    status: decision, on_hold: false, decided_by: admin, decided_at: new Date().toISOString(),
    payout_amount: providerFault ? 0 : Math.round((Number(c.amount) * PAYOUT_PERCENT) / 100),
    refund_amount: providerFault ? Number(c.amount) : 0,
    strike_added: providerFault, points_deducted: providerFault ? NOSHOW_POINTS : 0,
  };
  if (noshowDemo()) {
    Object.assign(c, patch);
    if (providerFault) demo.strikes.push({ providerId: c.provider_id, ref: c.booking_id, at: patch.decided_at! });
  } else {
    const { data, error } = await db().from("noshow_claims").update(patch).eq("id", id).eq("status", "pending").select("*").single();
    if (error) throw new Error(error.message);
    Object.assign(c, data);
    if (providerFault) {
      const { error: e2 } = await db().from("provider_strikes").insert({ provider_id: c.provider_id, reason: "no_show", ref: c.booking_id, points: NOSHOW_POINTS });
      if (e2) console.error("strike insert", e2.message);
    }
  }
  store().audit.unshift({ id: `a-${Date.now()}`, actor: admin, action: `noshow.${decision}`, entity: `Booking ${c.booking_id}`, at: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) });
  return c;
}
