import "server-only";
import { createClient } from "@supabase/supabase-js";

// ตั้งค่าการเงิน (issue #11) — เก็บใน Storage JSON แบบเดียวกับ "ราคาและส่วนแบ่ง" · แก้ในหลังบ้าน /admin/wallet ไม่ต้องแก้โค้ด
export interface MoneySettings {
  minWithdraw: number;      // บาท
  feePct: number;           // ค่าธรรมเนียมแพลตฟอร์มตอนถอน (%)
  whtPct: number;           // หัก ณ ที่จ่าย (%)
  releaseHours: number;     // ปล่อยเงินให้ถอนได้หลังจบงาน (ชม.) — ใช้เมื่อ releaseMode = "auto"
  releaseMode: "manual" | "auto"; // manual = แอดมินตรวจงานแล้วกดอนุมัติเข้ากระเป๋า (/admin/payroll) · auto = ปล่อยเองหลัง releaseHours
  autoCompleteHours: number;// Part-Time กดจบงาน แล้วลูกค้าไม่ค้าน = จบอัตโนมัติ (ชม.)
  autoPayoutLimit: number;  // วงเงินถอนอัตโนมัติต่อคนต่อวัน (บาท) — เกินให้แอดมินอนุมัติ
  cancelRule: string;       // กติกายกเลิก (ข้อความแสดงลูกค้า) — ช่วงแรกแอดมินตัดสินเป็นเคส
  autoCancel: boolean;      // เปิด = ลูกค้าขอยกเลิกหลังยืนยัน → ระบบคืนเงินตามกติกาทันที · ปิด = แอดมินตัดสิน (#23)
  cancelFullHours: number;  // ยกเลิกก่อนเวลานัด ≥ กี่ชม. = คืนเต็ม
  cancelLatePct: number;    // ยกเลิกช้ากว่านั้น = คืนกี่ %
  quickSeconds: number;     // เรียกด่วน: รอเพื่อนกดรับกี่วินาที (บอร์ด 15 วิ · ค่าเริ่มต้น 180 ให้เพื่อนทันเห็นแจ้งเตือน)
  history: { at: string; by: string; note: string }[];
}
export const DEFAULT_MONEY: MoneySettings = {
  minWithdraw: 500, feePct: 3, whtPct: 3, releaseHours: 24, releaseMode: "manual", autoCompleteHours: 12, autoPayoutLimit: 20000,
  cancelRule: "ยกเลิกได้ฟรีก่อนเพื่อนตอบรับ · หลังยืนยันแล้ว ทีมงานพิจารณาตามกรณี",
  autoCancel: false, cancelFullHours: 3, cancelLatePct: 50, quickSeconds: 180, history: [],
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
  if (s.releaseMode !== "manual" && s.releaseMode !== "auto") return "เลือกวิธีปล่อยรายได้";
  if (!(s.autoCompleteHours >= 1 && s.autoCompleteHours <= 72)) return "จบงานอัตโนมัติ 1–72 ชม.";
  if (!(s.autoPayoutLimit >= 0)) return "วงเงินอัตโนมัติไม่ถูกต้อง";
  if (!s.cancelRule.trim()) return "กรอกกติกายกเลิก";
  if (!(s.cancelFullHours >= 0 && s.cancelFullHours <= 168)) return "ยกเลิกคืนเต็ม 0–168 ชม.";
  if (!(s.cancelLatePct >= 0 && s.cancelLatePct <= 100)) return "คืนเงินเมื่อยกเลิกช้า 0–100%";
  if (!(s.quickSeconds >= 15 && s.quickSeconds <= 1800)) return "เรียกด่วนรอรับ 15–1,800 วินาที";
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

// % ที่คืนลูกค้าเมื่อยกเลิกนัดที่ยืนยันแล้ว — null = ปิดกติกาอัตโนมัติ (แอดมินตัดสิน)
export function cancelRefundPct(m: MoneySettings, starts_at: string, at = Date.now()): number | null {
  if (!m.autoCancel) return null;
  return Date.parse(starts_at) - at >= m.cancelFullHours * 3600_000 ? 100 : m.cancelLatePct;
}
