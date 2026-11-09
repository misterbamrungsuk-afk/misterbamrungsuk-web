import "server-only";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_PLAN, migratePlan, type FinancePlan } from "./plan";

// เก็บแผนการเงินเป็น JSON ใน Storage (_config/finance-plan.json) แบบเดียวกับตั้งค่าเมมเบอร์ — ไม่ต้องรัน SQL
// อ่านผ่าน signed URL ใหม่ทุกครั้ง + no-store: Storage/CDN เคย cache ไฟล์ไว้ ~1 ชม. → บันทึกแล้วเปิดใหม่ได้ตัวเลขเก่า (8 พ.ย. 2569)
const PATH = "_config/finance-plan.json";
const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const g = globalThis as unknown as { __mbFinance?: FinancePlan };
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
  global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }) },
});

export async function getFinancePlan(): Promise<FinancePlan> {
  if (isDemo) return migratePlan(g.__mbFinance ?? DEFAULT_PLAN);
  try {
    const { data: signed, error } = await db().storage.from("applicants").createSignedUrl(PATH, 60);
    if (error || !signed?.signedUrl) return DEFAULT_PLAN;
    const r = await fetch(`${signed.signedUrl}&t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return DEFAULT_PLAN;
    return migratePlan({ ...DEFAULT_PLAN, ...((await r.json()) as Partial<FinancePlan>) });
  } catch { return DEFAULT_PLAN; }
}

export async function saveFinancePlan(next: Omit<FinancePlan, "history">, by: string, note: string): Promise<FinancePlan> {
  const cur = await getFinancePlan();
  const saved: FinancePlan = { ...next, history: [{ at: new Date().toISOString(), by, note }, ...cur.history].slice(0, 30) };
  if (isDemo) { g.__mbFinance = saved; return saved; }
  const { error } = await db().storage.from("applicants").upload(PATH, new Blob([JSON.stringify(saved)], { type: "application/json" }), { upsert: true, contentType: "application/json", cacheControl: "0" });
  if (error) throw error;
  return saved;
}
