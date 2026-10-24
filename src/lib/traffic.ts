import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// สถิติผู้เข้าชมเว็บ (ของเราเอง) — supabase/site/0003_site_events.sql · โหมดสาธิตเก็บในหน่วยความจำ
export type SiteEvent = {
  id: string; at: string; sid: string; vid: string | null; path: string; ref: string | null;
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
  device: string | null; country: string | null; city: string | null;
  who_type: "customer" | "parttime" | null; who_id: string | null; who_label: string | null;
  mk: boolean; dur_ms: number | null;
};

const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
const g = globalThis as unknown as { __mbTraffic?: SiteEvent[] };
const mem = (g.__mbTraffic ??= []);
let tableMissing = false;

export async function addView(e: SiteEvent) {
  if (isDemo) { mem.push(e); if (mem.length > 20000) mem.splice(0, mem.length - 20000); return; }
  if (tableMissing) return;
  const { error } = await db().from("site_events").insert(e);
  if (error) { if (/relation .*site_events|does not exist|schema cache/i.test(error.message)) tableMissing = true; else console.error("site_events", error.message); }
}
/** เวลาอยู่หน้า (ครั้งเดียวต่อการเปิดหน้า · เพดาน 30 นาที) */
export async function setDuration(id: string, sid: string, ms: number) {
  const dur = Math.max(0, Math.min(30 * 60_000, Math.round(ms)));
  if (isDemo) { const r = mem.find((x) => x.id === id && x.sid === sid); if (r && r.dur_ms == null) r.dur_ms = dur; return; }
  if (tableMissing) return;
  await db().from("site_events").update({ dur_ms: dur }).eq("id", id).eq("sid", sid).is("dur_ms", null);
}
export async function listEvents(fromIso: string): Promise<{ rows: SiteEvent[]; ready: boolean }> {
  if (isDemo) return { rows: mem.filter((r) => r.at >= fromIso), ready: true };
  const out: SiteEvent[] = [];
  for (let page = 0; page < 10; page++) { // สูงสุด 50,000 แถวต่อช่วง
    const { data, error } = await db().from("site_events").select("*").gte("at", fromIso).order("at", { ascending: false }).range(page * 5000, page * 5000 + 4999);
    if (error) return { rows: [], ready: !/relation .*site_events|does not exist|schema cache/i.test(error.message) };
    out.push(...((data ?? []) as SiteEvent[]));
    if ((data ?? []).length < 5000) break;
  }
  return { rows: out, ready: true };
}

// ── สรุปสำหรับหน้าแอดมิน ──
const TH = 7 * 3600_000;
const dayTH = (iso: string) => new Date(Date.parse(iso) + TH).toISOString().slice(0, 10);
const hourTH = (iso: string) => new Date(Date.parse(iso) + TH).getUTCHours();
/** ชื่อเมืองจาก header ของ Vercel (เข้ารหัส URL) — ถอดไม่ได้ = ใช้ค่าเดิม */
const cityName = (c: string) => { try { return decodeURIComponent(c); } catch { return c; } };
const top = (m: Map<string, number>, n = 10) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
const inc = (m: Map<string, number>, k: string, by = 1) => m.set(k, (m.get(k) ?? 0) + by);
export const sourceOf = (r: Pick<SiteEvent, "utm_source" | "ref">) => r.utm_source || (r.ref ? r.ref.replace(/^www\./, "") : "เข้าตรง / ไม่ทราบ");

export function summarize(rows: SiteEvent[], days: number) {
  const views = rows.length;
  const visitors = new Set(rows.map((r) => r.vid || r.sid)).size;
  const sessions = new Map<string, SiteEvent[]>();
  for (const r of rows) { const a = sessions.get(r.sid); if (a) a.push(r); else sessions.set(r.sid, [r]); }
  const sess = [...sessions.values()].map((v) => v.sort((a, b) => a.at.localeCompare(b.at)));
  const sessDur = sess.map((v) => v.reduce((t, r) => t + (r.dur_ms ?? 0), 0));
  const avgSession = sess.length ? Math.round(sessDur.reduce((a, b) => a + b, 0) / sess.length) : 0;
  const bounce = sess.length ? Math.round((sess.filter((v) => v.length === 1).length / sess.length) * 100) : 0;

  // รายวัน (ครบทุกวันในช่วง)
  const today = Date.now() + TH;
  const dayKeys = Array.from({ length: days }, (_, i) => new Date(today - (days - 1 - i) * 86400_000).toISOString().slice(0, 10));
  const dv = new Map<string, number>(), dvis = new Map<string, Set<string>>();
  for (const r of rows) { const d = dayTH(r.at); inc(dv, d); (dvis.get(d) ?? dvis.set(d, new Set()).get(d)!).add(r.vid || r.sid); }
  const daily = dayKeys.map((d) => ({ day: d, views: dv.get(d) ?? 0, visitors: dvis.get(d)?.size ?? 0 }));

  // หน้า
  const pv = new Map<string, number>(), pdur = new Map<string, number[]>(), pvis = new Map<string, Set<string>>();
  for (const r of rows) {
    inc(pv, r.path);
    (pvis.get(r.path) ?? pvis.set(r.path, new Set()).get(r.path)!).add(r.vid || r.sid);
    if (r.dur_ms != null) (pdur.get(r.path) ?? pdur.set(r.path, []).get(r.path)!).push(r.dur_ms);
  }
  const pages = top(pv, 15).map(([path, n]) => { const d = pdur.get(path) ?? []; return { path, views: n, visitors: pvis.get(path)?.size ?? 0, avgMs: d.length ? Math.round(d.reduce((a, b) => a + b, 0) / d.length) : 0 }; });

  // ที่มา (นับต่อรอบการเข้าชม · หน้าแรกของรอบ)
  const src = new Map<string, number>(), camp = new Map<string, number>(), dev = new Map<string, number>(), city = new Map<string, number>(), land = new Map<string, number>();
  for (const v of sess) {
    const f = v[0];
    inc(src, sourceOf(f)); if (f.utm_campaign) inc(camp, f.utm_campaign);
    inc(dev, f.device || "ไม่ทราบ"); inc(city, f.city ? cityName(f.city) : f.country || "ไม่ทราบ"); inc(land, f.path);
  }
  const hours = Array.from({ length: 24 }, (_, h) => rows.filter((r) => hourTH(r.at) === h).length);

  // ผู้ใช้ที่ล็อกอิน (เฉพาะยินยอมคุกกี้วิเคราะห์)
  const people = new Map<string, { type: string; label: string; sessions: Set<string>; views: number; ms: number; last: string; pages: Map<string, number>; mk: boolean }>();
  for (const r of rows) {
    if (!r.who_id || !r.who_type) continue;
    const k = `${r.who_type}:${r.who_id}`;
    const p = people.get(k) ?? people.set(k, { type: r.who_type, label: r.who_label || r.who_id, sessions: new Set(), views: 0, ms: 0, last: r.at, pages: new Map(), mk: false }).get(k)!;
    p.sessions.add(r.sid); p.views++; p.ms += r.dur_ms ?? 0; if (r.at > p.last) p.last = r.at; inc(p.pages, r.path); if (r.mk) p.mk = true;
  }
  const who = [...people.entries()].map(([id, p]) => ({ id, type: p.type, label: p.label, sessions: p.sessions.size, views: p.views, ms: p.ms, last: p.last, pages: top(p.pages, 4).map(([path]) => path), mk: p.mk }))
    .sort((a, b) => b.last.localeCompare(a.last)).slice(0, 100);

  // รอบการเข้าชมล่าสุด
  const recent = sess.sort((a, b) => b[b.length - 1].at.localeCompare(a[a.length - 1].at)).slice(0, 25).map((v) => ({
    sid: v[0].sid.slice(0, 6), at: v[0].at, source: sourceOf(v[0]), device: v[0].device, city: v[0].city ? cityName(v[0].city) : null,
    who: v.find((r) => r.who_label)?.who_label ?? null, path: v.map((r) => r.path).slice(0, 8), ms: v.reduce((t, r) => t + (r.dur_ms ?? 0), 0),
  }));

  return {
    views, visitors, sessions: sess.length, avgSession, pagesPerSession: sess.length ? Math.round((views / sess.length) * 10) / 10 : 0, bounce,
    known: people.size, daily, pages, hours, recent, who,
    sources: top(src, 10), campaigns: top(camp, 10), devices: top(dev, 5), cities: top(city, 10), landing: top(land, 10),
  };
}
export type TrafficSummary = ReturnType<typeof summarize>;
