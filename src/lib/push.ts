import "server-only";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Web Push (#16) — VAPID จาก env · ไม่ตั้ง = ปิด (ยังมีแจ้งเตือนในแอปตามเดิม)
// ส่งแบบ urgency high + TTL 1 ชม. (กัน Android Doze หน่วงจนปลดล็อก) · endpoint ตาย 404/410 = ลบทิ้ง
export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } };
type Row = { endpoint: string; user_type: string; user_id: string; p256dh: string; auth: string };

const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const g = globalThis as unknown as { __mbPush?: Row[]; __mbPushSent?: { endpoint: string; title: string }[] };
const demo = (g.__mbPush ??= []);
const sentLog = (g.__mbPushSent ??= []);

export const pushPublicKey = () => process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
export const pushEnabled = () => !!pushPublicKey() && !!process.env.VAPID_PRIVATE_KEY;
let ready = false;
function init() {
  if (ready || !pushEnabled()) return ready;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:Misterbamrungsuk@gmail.com", pushPublicKey(), process.env.VAPID_PRIVATE_KEY!);
  return (ready = true);
}

// รับเฉพาะ endpoint ของบริการ push จริง (Chrome/Android · Firefox · Safari/iOS · Edge) — กันใช้เซิร์ฟเวอร์เรายิง POST ไป URL อื่น
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^(updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com)$/, /(^|\.)push\.apple\.com$/, /\.notify\.windows\.com$/];
export function validSub(s: unknown): s is PushSub {
  const x = s as PushSub;
  if (!x || typeof x.endpoint !== "string" || x.endpoint.length > 1000 || typeof x.keys?.p256dh !== "string" || typeof x.keys?.auth !== "string") return false;
  try {
    const u = new URL(x.endpoint);
    return u.protocol === "https:" && PUSH_HOSTS.some((h) => h.test(u.hostname));
  } catch { return false; }
}

export async function saveSub(user_type: Row["user_type"], user_id: string, s: PushSub) {
  const row: Row = { endpoint: s.endpoint, user_type, user_id, p256dh: s.keys.p256dh, auth: s.keys.auth };
  if (isDemo) { const i = demo.findIndex((r) => r.endpoint === s.endpoint); if (i >= 0) demo.splice(i, 1); demo.push(row); return; }
  const { error } = await db().from("push_subs").upsert(row, { onConflict: "endpoint" });
  if (error) throw error;
}
export async function removeSub(endpoint: string) {
  if (isDemo) { const i = demo.findIndex((r) => r.endpoint === endpoint); if (i >= 0) demo.splice(i, 1); return; }
  await db().from("push_subs").delete().eq("endpoint", endpoint);
}
async function subsFor(user_type: string, user_id: string): Promise<Row[]> {
  if (isDemo) return demo.filter((r) => r.user_type === user_type && r.user_id === user_id);
  const { data } = await db().from("push_subs").select().eq("user_type", user_type).eq("user_id", user_id).limit(10);
  return (data ?? []) as Row[];
}

/** ส่งไปทุกอุปกรณ์ของผู้ใช้ — ไม่ throw (แจ้งเตือนพลาดต้องไม่ทำให้เงิน/การจองพัง) */
export async function sendPush(user_type: string, user_id: string, m: { title: string; body?: string | null; url?: string | null; tag?: string }) {
  try {
    const subs = await subsFor(user_type, user_id);
    if (!subs.length) return 0;
    if (isDemo && !pushEnabled()) { for (const s of subs) sentLog.push({ endpoint: s.endpoint, title: m.title }); return subs.length; }
    if (!init()) return 0;
    const payload = JSON.stringify({ title: m.title, body: m.body ?? "", url: m.url ?? "/notifications", tag: m.tag });
    let n = 0;
    await Promise.all(subs.map(async (s) => {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { urgency: "high", TTL: 3600 }); n++; }
      catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await removeSub(s.endpoint);
        else console.error("push", new URL(s.endpoint).host, code);
      }
    }));
    return n;
  } catch (e) { console.error("push", e); return 0; }
}
export const demoPushLog = () => sentLog;
