import "server-only";
import { createClient } from "@supabase/supabase-js";

// ระดับเมมเบอร์ Gold / Black + ค่าคอม Recruit + แต้ม — ตั้งค่าใน Storage JSON (_config/member.json) · แก้ได้เฉพาะ CEO (/admin/sales)
// ตัวเลขเริ่มต้นตามบรีฟ (17 ต.ค. 2569): จ่าย 50,000 ได้ 70,000 · จ่าย 100,000 ได้ 150,000 · คอม 2,000 / 5,000 หรือวงเงินโปรโมท ×2
export type TierId = "gold" | "black";
export interface TierCfg { id: TierId; name: string; pay: number; credit: number; commission: number; pointsPer100: number }
export interface MemberSettings {
  enabled: boolean;
  boostMult: number;        // ค่าคอมแปลงเป็นวงเงินโปรโมท × เท่า (เฉพาะ Part-Time)
  basePointsPer100: number; // แต้มของคนที่ยังไม่เป็นเมม ต่อการใช้จ่าย ฿100
  tiers: Record<TierId, TierCfg>;
  /** ค่าตอบแทน Recruit ชวน Part-Time (หมอ) ต่อคน (บาท) — ได้เมื่อชำระค่าสมัครแล้ว · A/B = สายที่จ่ายค่าสมัคร · free = สมัครฟรี (ลิงก์เชิญ TOP/Secret · ทอมหล่อ) */
  recruit: { A: number; B: number; free: number };
  history: { at: string; by: string; note: string }[];
}
export const DEFAULT_MEMBER: MemberSettings = {
  enabled: true, boostMult: 2, basePointsPer100: 1,
  tiers: {
    gold: { id: "gold", name: "Gold", pay: 50000, credit: 70000, commission: 2000, pointsPer100: 1.5 },
    black: { id: "black", name: "Black", pay: 100000, credit: 150000, commission: 5000, pointsPer100: 2 },
  },
  recruit: { A: 0, B: 0, free: 0 },
  history: [],
};
export const TIER_IDS: TierId[] = ["gold", "black"];
export const isTier = (v: unknown): v is TierId => v === "gold" || v === "black";

const PATH = "_config/member.json";
const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const g = globalThis as unknown as { __mbMember?: MemberSettings };
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export async function getMemberSettings(): Promise<MemberSettings> {
  if (isDemo) return g.__mbMember ?? DEFAULT_MEMBER;
  try {
    const { data, error } = await db().storage.from("applicants").download(PATH);
    if (error || !data) return DEFAULT_MEMBER;
    const v = JSON.parse(await data.text()) as Partial<MemberSettings>;
    return { ...DEFAULT_MEMBER, ...v, tiers: { gold: { ...DEFAULT_MEMBER.tiers.gold, ...v.tiers?.gold, id: "gold" }, black: { ...DEFAULT_MEMBER.tiers.black, ...v.tiers?.black, id: "black" } }, recruit: { ...DEFAULT_MEMBER.recruit, ...v.recruit } };
  } catch { return DEFAULT_MEMBER; }
}

export function validateMember(s: Omit<MemberSettings, "history">): string | null {
  for (const t of TIER_IDS.map((k) => s.tiers[k])) {
    if (!t.name.trim()) return "กรอกชื่อระดับ";
    if (!(t.pay >= 1000 && t.pay <= 1_000_000)) return `${t.name}: ยอดจ่าย 1,000–1,000,000 บาท`;
    if (!(t.credit >= t.pay && t.credit <= t.pay * 3)) return `${t.name}: เครดิตต้องไม่น้อยกว่ายอดจ่าย และไม่เกิน 3 เท่า`;
    if (!(t.commission >= 0 && t.commission <= t.pay * 0.3)) return `${t.name}: ค่าคอมไม่เกิน 30% ของยอดจ่าย`;
    if (!(t.pointsPer100 >= 0 && t.pointsPer100 <= 20)) return `${t.name}: แต้มต่อ ฿100 อยู่ระหว่าง 0–20`;
  }
  if (!(s.boostMult >= 1 && s.boostMult <= 5)) return "วงเงินโปรโมท 1–5 เท่า";
  for (const [k, v] of Object.entries(s.recruit)) if (!(Number.isInteger(v) && v >= 0 && v <= 50000)) return `ค่าตอบแทนชวนหมอ (${k === "free" ? "สมัครฟรี" : `สาย ${k}`}) 0–50,000 บาท`;
  if (!(s.basePointsPer100 >= 0 && s.basePointsPer100 <= 20)) return "แต้มทั่วไปต่อ ฿100 อยู่ระหว่าง 0–20";
  return null;
}

export async function saveMemberSettings(next: Omit<MemberSettings, "history">, by: string, note: string): Promise<MemberSettings> {
  const cur = await getMemberSettings();
  const saved: MemberSettings = { ...next, history: [{ at: new Date().toISOString(), by, note }, ...cur.history].slice(0, 20) };
  if (isDemo) { g.__mbMember = saved; return saved; }
  const { error } = await db().storage.from("applicants").upload(PATH, new Blob([JSON.stringify(saved)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
  if (error) throw error;
  return saved;
}
