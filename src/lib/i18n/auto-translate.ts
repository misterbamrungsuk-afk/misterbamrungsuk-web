import "server-only";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// แปลข้อความที่ Part-Time/ลูกค้าพิมพ์เอง (ชื่อเล่น · แนะนำตัว · ประกาศวันนี้ว่าง · รีวิว) เป็น EN / 中文 อัตโนมัติ (29 ต.ค. 2569)
// · ใช้ Claude (ANTHROPIC_API_KEY ใน env) · แปลครั้งเดียวแล้วเก็บแคชใน Storage _config/i18n-cache.json + หน่วยความจำ
// · ไม่มีคีย์ / เรียกไม่สำเร็จ / เกินเวลา = แสดงข้อความเดิม (ภาษาไทย) — หน้าเว็บไม่ล้ม ไม่รอนาน
export type AutoLang = "en" | "zh";
export type AutoKind = "name" | "text";
type Cache = Record<string, string>;

const PATH = "_config/i18n-cache.json";
const MODEL = process.env.TRANSLATE_MODEL || "claude-haiku-5-5";
const THAI = /[฀-๿]/;
const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const g = globalThis as unknown as { __mbI18n?: { cache: Cache; at: number } };
const keyOf = (lang: AutoLang, kind: AutoKind, s: string) => `${lang}:${kind}:${createHash("sha256").update(s).digest("hex").slice(0, 24)}`;

async function load(): Promise<Cache> {
  const m = g.__mbI18n;
  if (m && (isDemo || Date.now() - m.at < 5 * 60_000)) return m.cache;
  let cache: Cache = m?.cache ?? {};
  if (!isDemo) {
    try { const { data } = await db().storage.from("applicants").download(PATH); if (data) cache = { ...JSON.parse(await data.text()), ...cache }; } catch { /* ไม่มีไฟล์ = เริ่มว่าง */ }
  }
  g.__mbI18n = { cache, at: Date.now() };
  return cache;
}
async function save(add: Cache) {
  const cur = await load();
  Object.assign(cur, add);
  if (isDemo) return;
  try {
    await db().storage.from("applicants").upload(PATH, new Blob([JSON.stringify(cur)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
  } catch (e) { console.error("i18n cache save", e); }
}

async function callClaude(items: { kind: AutoKind; text: string }[], lang: AutoLang): Promise<string[] | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !items.length) return null;
  const target = lang === "en" ? "English" : "Simplified Chinese (as used in Singapore)";
  const prompt = `You translate short Thai texts from a dining & outing companion app (premium, non-romantic social companionship; never imply escort or adult services).
For each item:
- kind "name": a Thai nickname. Romanise it into a natural, commonly used Latin spelling (e.g. ต้น → Ton, ปังเป → Pang Pe). Use Latin letters even for Chinese output.
- kind "text": translate naturally into ${target}. Keep it short, keep numbers/times/emoji, translate Thai place names to their common ${lang === "en" ? "English" : "Chinese"} names.
Return ONLY a JSON array of strings, same length and order as the input.

Input:
${JSON.stringify(items)}`;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: ctl.signal,
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) { console.error("translate http", r.status, (await r.text()).slice(0, 200)); return null; }
    const j = (await r.json()) as { content?: { type: string; text?: string }[] };
    const txt = (j.content ?? []).map((c) => c.text ?? "").join("");
    const arr = JSON.parse(txt.slice(txt.indexOf("["), txt.lastIndexOf("]") + 1)) as unknown;
    return Array.isArray(arr) && arr.length === items.length && arr.every((x) => typeof x === "string") ? (arr as string[]) : null;
  } catch (e) {
    console.error("translate", (e as Error).message);
    return null;
  } finally { clearTimeout(t); }
}

/** แปลหลายข้อความในครั้งเดียว · คืนฟังก์ชัน tr(kind, text) — ข้อความที่ไม่มีอักษรไทย/แปลไม่ได้ = คืนค่าเดิม */
export async function autoTranslate(lang: AutoLang, items: { kind: AutoKind; text: string | null | undefined }[]) {
  const cache = await load();
  const want = [...new Map(items.filter((x) => x.text && THAI.test(x.text)).map((x) => [keyOf(lang, x.kind, x.text!), { kind: x.kind, text: x.text!.slice(0, 600) }])).entries()];
  const miss = want.filter(([k]) => !(k in cache)).slice(0, 60);
  if (miss.length) {
    const out = await callClaude(miss.map(([, v]) => v), lang);
    if (out) await save(Object.fromEntries(miss.map(([k], i) => [k, out[i].trim()])));
  }
  return (kind: AutoKind, text: string | null | undefined): string => {
    if (!text || !THAI.test(text)) return text ?? "";
    return (g.__mbI18n?.cache ?? cache)[keyOf(lang, kind, text)] || text;
  };
}
