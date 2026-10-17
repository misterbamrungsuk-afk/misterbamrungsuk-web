import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { addEvent, notify, type Booking } from "@/lib/bookings";
import { etaRange, inThailand, km, type LatLng } from "@/lib/geo";

// ติดตามตำแหน่ง Part-Time ระหว่างเดินทางไปหาลูกค้า (เฉพาะนัดที่จ่ายเงินและรับแล้ว)
// - Part-Time กด "เริ่มเดินทาง" (ได้ตั้งแต่ 2 ชม. ก่อนนัด) → ส่งตำแหน่งทุก ~20 วินาที
// - เก็บเฉพาะจุดล่าสุด 1 จุดต่อการจอง (ไม่เก็บเส้นทาง) · พ้นสถานะ "รับแล้ว" (ถึงจุดนัด/จบ/ยกเลิก) = ลบทิ้ง
// - ลูกค้าเห็นตำแหน่ง+ระยะ+เวลาถึง · Part-Time ไม่เห็นตำแหน่งลูกค้า (เห็นแค่จุดนัดที่ลูกค้าปักไว้ ใช้นำทาง)
export type Track = { booking_id: string; lat: number; lng: number; accuracy: number | null; at: string; started_at: string };
export class TrackError extends Error {}
export const START_BEFORE_MS = 2 * 3600_000;
const STALE_MS = 10 * 60_000;

const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
const g = globalThis as unknown as { __mbTracks?: Map<string, Track> };
const demo = (g.__mbTracks ??= new Map());

async function read(id: string): Promise<Track | null> {
  if (isDemo) return demo.get(id) ?? null;
  const { data, error } = await db().from("booking_tracks").select().eq("booking_id", id).maybeSingle();
  if (error) throw error;
  return (data as Track) ?? null;
}
export async function lastTrack(id: string) { return read(id); }
export async function clearTrack(id: string) {
  if (isDemo) { demo.delete(id); return; }
  await db().from("booking_tracks").delete().eq("booking_id", id);
}

const dest = (b: Booking): LatLng | null => { const p = { lat: b.place?.lat, lng: b.place?.lng }; return inThailand(p) ? p : null; };
const summary = (b: Booking, t: Track) => {
  const d = dest(b);
  const dist = d ? km(t, d) : null;
  return { lat: t.lat, lng: t.lng, at: t.at, started_at: t.started_at, km: dist, eta: dist == null ? null : etaRange(dist), stale: Date.now() - Date.parse(t.at) > STALE_MS };
};

/** Part-Time ส่งตำแหน่ง (ครั้งแรก = เริ่มเดินทาง → แจ้งลูกค้า) · คืนระยะถึงจุดนัดให้ Part-Time */
export async function pushTrack(b: Booking, p: { lat?: unknown; lng?: unknown; accuracy?: unknown }) {
  if (b.status !== "accepted") throw new TrackError(b.status === "checked_in" ? "ถึงจุดนัดแล้ว · หยุดแชร์ตำแหน่ง" : "นัดนี้ไม่ได้อยู่ระหว่างรอพบ");
  if (Date.parse(b.starts_at) - Date.now() > START_BEFORE_MS) throw new TrackError("เริ่มเดินทางได้ก่อนเวลานัด 2 ชม.");
  const pos = { lat: Number(p.lat), lng: Number(p.lng) };
  if (!inThailand(pos)) throw new TrackError("ตำแหน่งไม่ถูกต้อง");
  const acc = Number(p.accuracy);
  const cur = await read(b.id);
  if (cur && Date.now() - Date.parse(cur.at) < 8_000) return summary(b, cur); // กันส่งถี่เกิน
  const t: Track = { booking_id: b.id, lat: Math.round(pos.lat * 1e5) / 1e5, lng: Math.round(pos.lng * 1e5) / 1e5, accuracy: Number.isFinite(acc) ? Math.round(acc) : null, at: new Date().toISOString(), started_at: cur?.started_at ?? new Date().toISOString() };
  if (isDemo) demo.set(b.id, t);
  else { const { error } = await db().from("booking_tracks").upsert(t, { onConflict: "booking_id" }); if (error) throw error; }
  if (!cur) {
    await addEvent(b.id, "on_the_way", `parttime:${b.parttime_id}`);
    await notify({ user_type: "customer", user_id: b.customer_id, kind: "on_the_way", title: `${b.parttime_nick ?? "เพื่อน"}กำลังเดินทางมาหาคุณ`, body: `${b.code} · ดูตำแหน่งและเวลาถึงได้ในหน้านัด`, url: `/order/${b.id}` }).catch(() => {});
  }
  return summary(b, t);
}

/** ลูกค้าดูตำแหน่ง Part-Time — เฉพาะนัดที่รับแล้วและ Part-Time กดเริ่มเดินทาง · สถานะอื่น = ลบตำแหน่งทิ้ง */
export async function trackForCustomer(b: Booking) {
  const t = await read(b.id).catch(() => null);
  if (b.status !== "accepted") { if (t) await clearTrack(b.id).catch(() => {}); return { state: b.status === "checked_in" ? "arrived" : "off", track: null, dest: dest(b) } as const; }
  return { state: t ? "moving" : "waiting", track: t ? summary(b, t) : null, dest: dest(b) } as const;
}
export async function trackForParttime(b: Booking) {
  const t = await read(b.id).catch(() => null);
  return t && b.status === "accepted" ? summary(b, t) : null;
}
