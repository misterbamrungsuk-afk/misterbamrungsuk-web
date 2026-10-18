import "server-only";
import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { rateLimited } from "@/lib/customer/auth";

// กันเดารหัส/สแปมแบบนับรวมทุกเซิร์ฟเวอร์ (Postgres rate_hit · supabase/wallet/0003_guards.sql)
// ไม่มีฐาน / ฐานล่ม = ใช้ตัวนับในหน่วยความจำของเครื่องนี้แทน (ไม่ปิดบริการเพราะตัวนับพัง)
let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));

export async function limited(key: string, max = 10, windowMs = 15 * 60_000): Promise<boolean> {
  // ไม่มี IP (เรียกตรงในเครื่อง ไม่ผ่าน proxy) = ข้ามเฉพาะคีย์ราย IP · บน Vercel มี x-forwarded-for เสมอ
  if (key.endsWith(":local")) return false;
  const local = rateLimited(key, max, windowMs);
  if (local) return true;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    const { data, error } = await db().rpc("rate_hit", { p_key: createHash("sha256").update(key).digest("hex").slice(0, 40), p_max: max, p_window_s: Math.round(windowMs / 1000) });
    if (error) throw error;
    return data === true;
  } catch (e) {
    console.error("rate_hit", (e as Error).message);
    return false;
  }
}
