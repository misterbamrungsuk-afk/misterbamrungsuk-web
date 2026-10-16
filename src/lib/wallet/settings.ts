import "server-only";
import { createClient } from "@supabase/supabase-js";

// ตั้งค่าการเงิน (issue #11) — เก็บใน Storage JSON แบบเดียวกับ "ราคาและส่วนแบ่ง" · แก้ในหลังบ้าน /admin/wallet ไม่ต้องแก้โค้ด
export interface MoneySettings {
  minWithdraw: number;      // บาท
  feePct: number;           // ค่าธรรมเนียมแพลตฟอร์มตอนถอน (%)
  whtPct: number;           // หัก ณ ที่จ่าย (%)
  releaseHours: number;     // ปล่อยเงินให้ถอนได้หลังจบงาน (ชม.)
  autoCompleteHours: number;// Part-Time กดจบงาน แล้วลูกค้าไม่ค้าน = จบอัตโนมัติ (ชม.)
  autoPayoutLimit: number;  // วงเงินถอนอัตโนมัติต่อคนต่อวัน (บาท) — เกินให้แอดมินอนุมัติ
  cancelRule: string;       // กติกายกเลิก (ข้อความแสดงลูกค้า) — ช่วงแรกแอดมินตัดสินเป็นเคส
  history: { at: string; by: string; note: string }[];
}
export const DEFAULT_MONEY: MoneySettings = {
  minWithdraw: 500, feePct: 3, whtPct: 3, releaseHours: 24, autoCompleteHours: 12, autoPayoutLimit: 20000,
  cancelRule: "ยกเลิกได้ฟรีก่อนเพื่อนตอบรับ · หลังยืนยันแล้ว ทีมงานพิจารณาตามกรณี", history: [],
};
const PATH = "_config/money.json";
const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const g = globalThis as unknown as { __mbMoney?: MoneySettings };
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export async function getMoney(): Promise<MoneySettings> {
  if (isDemo) return g.__mbMoney ?? DEFAULT_MONEY;
  try {
    const { data, error } = await db().storage.from("applicants").download(PATH);
    if (error || !data) return DEFAULT_MONEY;
    return { ...DEFAULT_MONEY, ...(JSON.parse(await data.text()) as Partial<MoneySettings>) };
  } catch { return DEFAULT_MONEY; }
}

export function validateMoney(s: Omit<MoneySettings, "history">): string | null {
  if (!(s.minWithdraw >= 1 && s.minWithdraw <= 100000)) return "ถอนขั้นต่ำ 1–100,000 บาท";
  if (!(s.feePct >= 0 && s.feePct <= 30)) return "ค่าธรรมเนียม 0–30%";
  if (!(s.whtPct >= 0 && s.whtPct <= 15)) return "หัก ณ ที่จ่าย 0–15%";
  if (!(s.releaseHours >= 0 && s.releaseHours <= 168)) return "ปล่อยเงิน 0–168 ชม.";
  if (!(s.autoCompleteHours >= 1 && s.autoCompleteHours <= 72)) return "จบงานอัตโนมัติ 1–72 ชม.";
  if (!(s.autoPayoutLimit >= 0)) return "วงเงินอัตโนมัติไม่ถูกต้อง";
  if (!s.cancelRule.trim()) return "กรอกกติกายกเลิก";
  return null;
}

export async function saveMoney(next: Omit<MoneySettings, "history">, by: string, note: string): Promise<MoneySettings> {
  const cur = await getMoney();
  const saved: MoneySettings = { ...next, history: [{ at: new Date().toISOString(), by, note }, ...cur.history].slice(0, 20) };
  if (isDemo) { g.__mbMoney = saved; return saved; }
  const { error } = await db().storage.from("applicants").upload(PATH, new Blob([JSON.stringify(saved)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
  if (error) throw error;
  return saved;
}
