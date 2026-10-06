// ── สมาชิก / แพ็กเกจ / ของขวัญ (โหมดสาธิต: เก็บสถานะใน localStorage) ──
import type { Post, PromoCostModel } from "./types";

// ⚠️ ราคาทั้งหมดด้านล่างเป็น "ราคาตัวอย่าง (placeholder)" — เจ้าของกิจการต้องกำหนดราคาจริงก่อนเปิดใช้งาน
export const MEMBERSHIP = {
  /** ค่าแรกเข้า (จ่ายครั้งเดียว) — PLACEHOLDER */
  entryFee: 990,
  /** ค่าสมาชิกรายเดือน — PLACEHOLDER */
  monthlyFee: 390,
};

export interface SessionPack { key: "pack5" | "pack10"; sessions: number; price: number; validMonths: number }

/** แพ็กเกจจำนวนครั้ง อายุ 12 เดือน — ราคาเป็น PLACEHOLDER */
export const SESSION_PACKS: SessionPack[] = [
  { key: "pack5", sessions: 5, price: 4500, validMonths: 12 },
  { key: "pack10", sessions: 10, price: 8500, validMonths: 12 },
];

export type PlanKey = "monthly" | SessionPack["key"];

export function planPrice(plan: PlanKey, withEntry: boolean) {
  const base = plan === "monthly" ? MEMBERSHIP.monthlyFee : SESSION_PACKS.find((p) => p.key === plan)!.price;
  return base + (withEntry ? MEMBERSHIP.entryFee : 0);
}

export function planLabel(plan: PlanKey, th = true) {
  if (plan === "monthly") return th ? "สมาชิกรายเดือน" : "Monthly membership";
  const p = SESSION_PACKS.find((x) => x.key === plan)!;
  return th ? `แพ็กเกจ ${p.sessions} ครั้ง` : `${p.sessions}-session pack`;
}

// ── สถานะสมาชิก (localStorage) ──
export interface MemberState {
  plan: PlanKey | "gift";
  activatedAt: string;
  expiresAt: string;
  sessionsLeft: number | null; // null = ไม่จำกัด (รายเดือน)
  entryPaid: boolean;
}
export interface GiftRecord { code: string; plan: PlanKey; toName: string; toPhone: string; toEmail: string; message: string; createdAt: string; redeemed: boolean }

const K_MEMBER = "mb.membership";
const K_GIFTS = "mb.gifts";
const K_PREMIUM = "mb.premiumUnlocked";

function read<T>(k: string, fallback: T): T {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function write(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
}

const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

export function getMember(): MemberState | null {
  const m = read<MemberState | null>(K_MEMBER, null);
  if (!m) return null;
  return new Date(m.expiresAt).getTime() > Date.now() ? m : null;
}

export function activatePlan(plan: PlanKey): MemberState {
  const now = new Date();
  const pack = SESSION_PACKS.find((p) => p.key === plan);
  const m: MemberState = {
    plan,
    activatedAt: now.toISOString(),
    expiresAt: addMonths(now, pack ? pack.validMonths : 1).toISOString(),
    sessionsLeft: pack ? pack.sessions : null,
    entryPaid: true,
  };
  write(K_MEMBER, m);
  return m;
}

export function hasPaidEntry() { return !!read<MemberState | null>(K_MEMBER, null)?.entryPaid; }

export function isPremiumUnlocked() { return !!getMember() || read<boolean>(K_PREMIUM, false); }

// ── ของขวัญ ──
export function createGift(g: Omit<GiftRecord, "code" | "createdAt" | "redeemed">): GiftRecord {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "GIFT-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  const rec: GiftRecord = { ...g, code, createdAt: new Date().toISOString(), redeemed: false };
  write(K_GIFTS, [rec, ...read<GiftRecord[]>(K_GIFTS, [])]);
  return rec;
}

export function listGifts() { return read<GiftRecord[]>(K_GIFTS, []); }

/** เดโม: รับโค้ดที่สร้างในเครื่องนี้ หรือโค้ดรูปแบบ GIFT-XXXXXX ใดก็ได้ */
export function redeemGift(raw: string): { ok: true; plan: PlanKey } | { ok: false; reason: string } {
  const code = raw.trim().toUpperCase();
  if (!/^GIFT-[A-Z0-9]{6}$/.test(code)) return { ok: false, reason: "รูปแบบโค้ดไม่ถูกต้อง (GIFT-XXXXXX)" };
  const gifts = listGifts();
  const g = gifts.find((x) => x.code === code);
  if (g?.redeemed) return { ok: false, reason: "โค้ดนี้ถูกใช้ไปแล้ว" };
  const plan: PlanKey = g?.plan ?? "monthly";
  if (g) write(K_GIFTS, gifts.map((x) => (x.code === code ? { ...x, redeemed: true } : x)));
  write(K_PREMIUM, true);
  const m = activatePlan(plan);
  write(K_MEMBER, { ...m, plan: "gift" });
  return { ok: true, plan };
}

// ── Part-Time หน้าใหม่ / คิวว่าง / การเรียงแบบ "แนะนำ" ──
export const NEW_PROVIDER_DAYS = 30;

export function isNewProvider(p: Post, now = Date.now()) {
  if (!p.joinedAt) return false;
  const age = now - new Date(p.joinedAt).getTime();
  return age >= 0 && age <= NEW_PROVIDER_DAYS * 86400000;
}

export function queueLabel(p: Post, th = true) {
  const n = p.nextFreeMin ?? 0;
  if (n <= 0) return th ? "ว่างตอนนี้" : "Available now";
  return th ? `ว่างในอีก ${n} นาที` : `Free in ${n} min`;
}

/** แนะนำ: Part-Time หน้าใหม่ (≤30 วัน) ขึ้นก่อน แล้วตามคะแนน/รีวิว */
export function recommendedSort(a: Post, b: Post) {
  const na = isNewProvider(a) ? 1 : 0, nb = isNewProvider(b) ? 1 : 0;
  if (na !== nb) return nb - na;
  return (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount;
}

// ── โมเดลภาระส่วนลดโปรโมชัน ──
export const PROMO_COST_MODELS: Record<PromoCostModel, { th: string; platform: number; provider: number }> = {
  A: { th: "A · แพลตฟอร์ม 100%", platform: 100, provider: 0 },
  B: { th: "B · แพลตฟอร์ม 50% / ผู้ให้บริการ 50%", platform: 50, provider: 50 },
};
