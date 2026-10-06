import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// "ถึงจุดนัดแล้ว" — บันทึกเวลา + GPS ที่ Part-Time มาถึง (นับเวลารอลูกค้า 15 นาทีจากตรงนี้)
// - มี SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → ตาราง booking_arrivals (supabase/0003_arrival.sql)
// - ไม่มี / ยังไม่รัน migration → หน่วยความจำ (หายเมื่อรีสตาร์ท; หน้าเว็บสำรองไว้ใน localStorage ด้วย)

export interface Arrival {
  booking_id: string;
  provider_id: string;
  arrived_at: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  gps_error: string | null;
}

const envDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const g = globalThis as unknown as { __mbArrivals?: Map<string, Arrival>; __mbArrivalMissing?: boolean };
const mem = (g.__mbArrivals ??= new Map());
const useMem = () => envDemo || !!g.__mbArrivalMissing;
function missing(err: { code?: string; message?: string } | null) {
  if (!err) return false;
  if (err.code === "PGRST205" || err.code === "42P01" || /could not find the table|does not exist/i.test(err.message ?? "")) {
    if (!g.__mbArrivalMissing) console.warn("[arrival] booking_arrivals table missing — run supabase/0003_arrival.sql; using in-memory store");
    g.__mbArrivalMissing = true;
    return true;
  }
  return false;
}

let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));

export async function getArrival(bookingId: string): Promise<Arrival | null> {
  if (useMem()) return mem.get(bookingId) ?? null;
  const { data, error } = await db().from("booking_arrivals").select("*").eq("booking_id", bookingId).maybeSingle();
  if (missing(error)) return getArrival(bookingId);
  if (error) throw new Error(error.message);
  return (data as Arrival | null) ?? mem.get(bookingId) ?? null;
}

/** บันทึกครั้งแรกเท่านั้น — กดซ้ำได้เวลาเดิม (กันรีเซ็ตตัวจับเวลา) */
export async function recordArrival(a: Omit<Arrival, "arrived_at">): Promise<Arrival> {
  const existing = await getArrival(a.booking_id);
  if (existing) return existing;
  const row: Arrival = { ...a, arrived_at: new Date().toISOString() };
  if (useMem()) { mem.set(row.booking_id, row); return row; }
  const { data, error } = await db().from("booking_arrivals").upsert(row, { onConflict: "booking_id", ignoreDuplicates: true }).select("*").maybeSingle();
  if (missing(error)) return recordArrival(a);
  if (error) { console.error("arrival insert", error.message); mem.set(row.booking_id, row); return row; }
  return (data as Arrival | null) ?? (await getArrival(a.booking_id)) ?? row;
}
