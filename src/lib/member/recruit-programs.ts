import "server-only";
import { createClient } from "@supabase/supabase-js";

// โปรแกรม Recruit แยกส่วน (บอสสั่ง 28 ต.ค. 2569 · แถบแบบเป๋าตัง): หา Part-time · หา Partner · หา Collab · หาลูกค้าเปิด Member
// แต่ละส่วนมีเปิด/ปิด + ค่าแนะนำต่อคน + เงื่อนไข · ตอนนี้เปิดแค่ Part-time (ส่วนอื่นยังไม่มีเงื่อนไข)
// แอดมิน (CEO) กำหนดราคาที่ /admin/recruit-programs · เก็บใน Storage _config/recruit-programs.json
export const PROGRAM_KEYS = ["parttime", "partner", "collab", "member"] as const;
export type ProgramKey = (typeof PROGRAM_KEYS)[number];
export type BonusTier = { jobs: number; satang: number };
export type Program = { key: ProgramKey; enabled: boolean; amount_satang: number; note: string; bonus: BonusTier[] };
export type Programs = Record<ProgramKey, Program> & { updated_at?: string; updated_by?: string };

export const PROGRAM_LABEL: Record<ProgramKey, { title: string; short: string; unit: string }> = {
  parttime: { title: "หา Part-time", short: "Part-time", unit: "คน" },
  partner: { title: "หา Partner", short: "Partner", unit: "ร้าน" },
  collab: { title: "หา Collab", short: "Collab", unit: "ราย" },
  member: { title: "หาลูกค้าเปิด Member", short: "Member", unit: "คน" },
};

export const DEFAULT_PROGRAMS: Programs = {
  parttime: { key: "parttime", enabled: true, amount_satang: 50_000, note: "เงินเข้า Wallet เมื่อผู้สมัครได้งานแรก (ทุกแผน)", bonus: [{ jobs: 20, satang: 200_000 }, { jobs: 15, satang: 100_000 }] },
  partner: { key: "partner", enabled: false, amount_satang: 0, note: "", bonus: [] },
  collab: { key: "collab", enabled: false, amount_satang: 0, note: "", bonus: [] },
  member: { key: "member", enabled: false, amount_satang: 0, note: "", bonus: [] },
};

const PATH = "_config/recruit-programs.json";
const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const g = globalThis as unknown as { __mbRecruitPrograms?: Programs };
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const merge = (raw: Partial<Programs> | null | undefined): Programs => {
  const out = { ...DEFAULT_PROGRAMS, updated_at: raw?.updated_at, updated_by: raw?.updated_by } as Programs;
  for (const k of PROGRAM_KEYS) out[k] = { ...DEFAULT_PROGRAMS[k], ...(raw?.[k] ?? {}), key: k };
  return out;
};

export async function getPrograms(): Promise<Programs> {
  if (isDemo) return merge(g.__mbRecruitPrograms);
  try { const { data, error } = await db().storage.from("applicants").download(PATH); if (error || !data) return merge(null); return merge(JSON.parse(await data.text())); } catch { return merge(null); }
}

/** ตรวจ + บันทึก (CEO) · ค่าแนะนำ 0–100,000 บาท · โบนัสเรียงจากงานมากไปน้อย */
export async function savePrograms(input: unknown, by: string): Promise<Programs> {
  const cur = await getPrograms();
  const b = (input ?? {}) as Record<string, Partial<Program>>;
  const next = { ...cur, updated_at: new Date().toISOString(), updated_by: by } as Programs;
  for (const k of PROGRAM_KEYS) {
    const p = b[k];
    if (!p) continue;
    const amt = Math.round(Number(p.amount_satang ?? cur[k].amount_satang));
    if (!Number.isFinite(amt) || amt < 0 || amt > 10_000_000) throw new Error(`${PROGRAM_LABEL[k].title}: ค่าแนะนำต้องอยู่ระหว่าง ฿0 – ฿100,000`);
    const bonus = (Array.isArray(p.bonus) ? p.bonus : cur[k].bonus)
      .map((t) => ({ jobs: Math.round(Number(t?.jobs)), satang: Math.round(Number(t?.satang)) }))
      .filter((t) => t.jobs > 0 && t.satang > 0);
    if (bonus.some((t) => t.jobs > 500 || t.satang > 10_000_000)) throw new Error(`${PROGRAM_LABEL[k].title}: โบนัสไม่ถูกต้อง`);
    bonus.sort((a, z) => z.jobs - a.jobs);
    const enabled = p.enabled === undefined ? cur[k].enabled : !!p.enabled;
    if (enabled && amt <= 0 && !bonus.length) throw new Error(`${PROGRAM_LABEL[k].title}: เปิดใช้ต้องกำหนดค่าแนะนำ`);
    next[k] = { key: k, enabled, amount_satang: amt, note: String(p.note ?? cur[k].note).trim().slice(0, 300), bonus: bonus.slice(0, 5) };
  }
  if (isDemo) { g.__mbRecruitPrograms = next; return next; }
  const { error } = await db().storage.from("applicants").upload(PATH, new Blob([JSON.stringify(next)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
  if (error) throw error;
  return next;
}

/** โบนัสรายเดือนต่อผู้สมัคร 1 คน (ขั้นสูงสุดที่ถึง · แทน ไม่บวกกัน) */
export const bonusOf = (tiers: BonusTier[], jobs: number) => [...tiers].sort((a, z) => z.jobs - a.jobs).find((t) => jobs >= t.jobs)?.satang ?? 0;
