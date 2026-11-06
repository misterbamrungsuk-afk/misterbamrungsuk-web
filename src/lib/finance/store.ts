import "server-only";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_PLAN, type FinancePlan } from "./plan";

// เก็บแผนการเงินเป็น JSON ใน Storage (_config/finance-plan.json) แบบเดียวกับตั้งค่าเมมเบอร์ — ไม่ต้องรัน SQL
const PATH = "_config/finance-plan.json";
const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const g = globalThis as unknown as { __mbFinance?: FinancePlan };
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export async function getFinancePlan(): Promise<FinancePlan> {
  if (isDemo) return g.__mbFinance ?? DEFAULT_PLAN;
  try {
    const { data, error } = await db().storage.from("applicants").download(PATH);
    if (error || !data) return DEFAULT_PLAN;
    return { ...DEFAULT_PLAN, ...(JSON.parse(await data.text()) as Partial<FinancePlan>) };
  } catch { return DEFAULT_PLAN; }
}

export async function saveFinancePlan(next: Omit<FinancePlan, "history">, by: string, note: string): Promise<FinancePlan> {
  const cur = await getFinancePlan();
  const saved: FinancePlan = { ...next, history: [{ at: new Date().toISOString(), by, note }, ...cur.history].slice(0, 30) };
  if (isDemo) { g.__mbFinance = saved; return saved; }
  const { error } = await db().storage.from("applicants").upload(PATH, new Blob([JSON.stringify(saved)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
  if (error) throw error;
  return saved;
}
