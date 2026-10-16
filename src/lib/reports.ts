import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { notify } from "@/lib/bookings";

// รายงานผู้ใช้ (บอร์ด C-Report) — ทีมงานตรวจภายใน 24 ชม. · ผู้ถูกรายงานไม่รู้ว่าใครรายงาน · ตาราง reports (booking/0005_extras.sql)
export const REASONS = ["ไม่มาตามนัด / มาสาย", "พูดหรือทำไม่สุภาพ", "ขอติดต่อ / จ่ายเงินนอกแอป", "ทำให้รู้สึกไม่ปลอดภัย", "ข้อมูลโปรไฟล์ไม่ตรง", "อื่นๆ"];
export type Report = {
  id: string; code: string; reporter_type: "customer" | "parttime"; reporter_id: string; target_type: "customer" | "parttime"; target_id: string; target_label: string | null;
  booking_id: string | null; reason: string; detail: string | null; blocked: boolean; status: "open" | "closed"; admin_note: string | null; created_at: string;
};
const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
const g = globalThis as unknown as { __mbReports?: Report[] };
const demo: Report[] = (g.__mbReports ??= []);

export async function createReport(r: Omit<Report, "id" | "code" | "status" | "admin_note" | "created_at">): Promise<Report> {
  const code = "RP-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  let row: Report;
  if (isDemo) { row = { ...r, id: crypto.randomUUID(), code, status: "open", admin_note: null, created_at: new Date().toISOString() }; demo.unshift(row); }
  else { const { data, error } = await db().from("reports").insert({ ...r, code }).select().single(); if (error) throw error; row = data as Report; }
  const urgent = r.reason === "ทำให้รู้สึกไม่ปลอดภัย";
  await notify({ user_type: "admin", user_id: "cs", kind: urgent ? "sos" : "report", title: `${urgent ? "🚨 " : ""}รายงานผู้ใช้ ${code} · ${r.reason}`, body: `${r.reporter_type === "customer" ? "ลูกค้า" : "Part-Time"} รายงาน ${r.target_label ?? r.target_id}${r.detail ? ` · ${r.detail.slice(0, 200)}` : ""}${r.blocked ? " · บล็อกแล้ว" : ""}`, url: r.booking_id ? `/admin/chats/${r.booking_id}` : "/admin/reports" });
  return row;
}
export async function listReports(): Promise<Report[]> {
  if (isDemo) return demo.slice(0, 300);
  const { data, error } = await db().from("reports").select().order("created_at", { ascending: false }).limit(300);
  if (error) throw error;
  return (data ?? []) as Report[];
}
export async function closeReport(id: string, note: string) {
  if (isDemo) { const r = demo.find((x) => x.id === id); if (r) Object.assign(r, { status: "closed", admin_note: note }); return; }
  await db().from("reports").update({ status: "closed", admin_note: note.slice(0, 300) || null }).eq("id", id);
}
