import "server-only";
import { createClient } from "@supabase/supabase-js";
import { EARNINGS } from "./config";

// ราคาและส่วนแบ่ง (บอร์ดแอดมิน A-Earnings) — แอดมินแก้ได้ · ค่าเริ่มต้นจาก EARNINGS ใน config.ts
// เก็บเป็น JSON ใน Storage bucket "applicants" (_config/earnings.json) จึงไม่ต้องสร้างตารางใหม่ · โหมดเดโมเก็บในหน่วยความจำ

import type { Tier } from "./earnings-shared";
export type { Tier } from "./earnings-shared";
export { pctFor, tierLabel } from "./earnings-shared";
export interface EarningsSettings {
  show: boolean;
  price3h: { eat: { top: number; silver: number }; massage: { top: number; silver: number } };
  fiveHourMultiplier: number;
  tiers: Tier[];
  payout: string;
  noShow: string;
  tipPct: number;
  history: { at: string; by: string; note: string }[];
}

const PATH = "_config/earnings.json";
const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const g = globalThis as unknown as { __mbEarnings?: EarningsSettings };

export const DEFAULT_EARNINGS: EarningsSettings = {
  show: EARNINGS.show,
  price3h: { eat: { top: EARNINGS.price3h.eat.top, silver: EARNINGS.price3h.eat.silver }, massage: { top: EARNINGS.price3h.massage.top, silver: EARNINGS.price3h.massage.silver } },
  fiveHourMultiplier: EARNINGS.fiveHourMultiplier,
  tiers: EARNINGS.tiers.map((t) => ({ min: t.min, max: t.max, pct: t.pct })),
  payout: "ภายใน 24 ชม.",
  noShow: "โอนส่วนของ Part-Time เต็ม",
  tipPct: EARNINGS.tipPct,
  history: [],
};

const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export async function getEarnings(): Promise<EarningsSettings> {
  if (isDemo) return g.__mbEarnings ?? DEFAULT_EARNINGS;
  try {
    const { data, error } = await db().storage.from("applicants").download(PATH);
    if (error || !data) return DEFAULT_EARNINGS;
    return { ...DEFAULT_EARNINGS, ...(JSON.parse(await data.text()) as Partial<EarningsSettings>) };
  } catch {
    return DEFAULT_EARNINGS;
  }
}

/** ตรวจค่าที่แอดมินส่งมา — คืนข้อความผิดพลาด หรือ null */
export function validateEarnings(s: Omit<EarningsSettings, "history">): string | null {
  const prices = [s.price3h.eat.top, s.price3h.eat.silver, s.price3h.massage.top, s.price3h.massage.silver];
  if (prices.some((n) => !Number.isInteger(n) || n < 0 || n > 1_000_000)) return "ราคาต้องเป็นจำนวนเต็ม 0–1,000,000";
  if (!(s.fiveHourMultiplier >= 1 && s.fiveHourMultiplier <= 5)) return "ตัวคูณ 5 ชม. ต้องอยู่ระหว่าง 1–5";
  if (!s.tiers.length || s.tiers.length > 8) return "ขั้นส่วนแบ่งต้องมี 1–8 ขั้น";
  let prev = 0;
  for (const [i, t] of s.tiers.entries()) {
    if (!Number.isInteger(t.min) || t.min < 1) return `ขั้นที่ ${i + 1}: "ตั้งแต่" ต้องเป็นจำนวนเต็มตั้งแต่ 1`;
    if (t.min <= prev) return `ขั้นที่ ${i + 1}: ต้องเริ่มต่อจากขั้นก่อนหน้า`;
    if (t.max !== null && (!Number.isInteger(t.max) || t.max < t.min)) return `ขั้นที่ ${i + 1}: "ถึง" ต้องไม่น้อยกว่า "ตั้งแต่"`;
    if (t.max === null && i !== s.tiers.length - 1) return "เฉพาะขั้นสุดท้ายที่ไม่จำกัดได้";
    if (!(t.pct >= 0 && t.pct <= 100)) return `ขั้นที่ ${i + 1}: ส่วนแบ่ง 0–100%`;
    prev = t.max ?? t.min;
  }
  if (!(s.tipPct >= 0 && s.tipPct <= 100)) return "ทิป 0–100%";
  if (!s.payout.trim() || !s.noShow.trim()) return "กรอกรอบโอนและกรณีไม่มาตามนัด";
  return null;
}

export async function saveEarnings(next: Omit<EarningsSettings, "history">, by: string, note: string): Promise<EarningsSettings> {
  const cur = await getEarnings();
  const saved: EarningsSettings = { ...next, history: [{ at: new Date().toISOString(), by, note }, ...cur.history].slice(0, 20) };
  if (isDemo) { g.__mbEarnings = saved; return saved; }
  const { error } = await db().storage.from("applicants").upload(PATH, new Blob([JSON.stringify(saved)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
  if (error) throw error;
  return saved;
}
