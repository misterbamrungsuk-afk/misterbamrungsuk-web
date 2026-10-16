import "server-only";
import { createClient } from "@supabase/supabase-js";
import { hasContact } from "@/lib/join/contact-guard";

// ตัวกรองแชท (ลูกค้า ↔ Part-Time): ช่องทางติดต่อนอกแอป + คำห้ามส่ง (แอดมินแก้ได้ที่ /admin/chats)
// ข้อความที่ถูกกันยังถูกเก็บ (blocked + flag) ให้ทีมงานตรวจย้อนหลัง · ผู้ส่งเห็นของตัวเอง อีกฝ่ายไม่เห็น
export interface ChatRules {
  words: string[];          // คำห้ามส่ง (เทียบแบบตัดช่องว่าง/จุด/ขีด · ไม่สนตัวพิมพ์)
  strikeLimit: number;      // ส่งข้อความต้องห้ามครบกี่ครั้งต่อการจอง → แจ้งทีมงาน
  history: { at: string; by: string }[];
}
export const DEFAULT_WORDS = [
  // นัดคุย/จ่ายเงินนอกแอป
  "ไลน์", "lineid", "แอดไลน์", "แอดline", "ไอดีไลน์", "ขอเบอร์", "ขอไลน์", "ทักไลน์", "เบอร์โทร", "โทรหา", "โทรมา", "เพิ่มเพื่อน", "นอกแอป", "นอกระบบ",
  "โอนตรง", "โอนนอก", "จ่ายนอก", "จ่ายนอกแอป", "เลขบัญชี", "ไม่ผ่านแอป",
  "telegram", "whatsapp", "wechat", "kakao", "signal", "messenger", "onlyfans",
  // บริการที่ไม่อยู่ในขอบเขต (แพลตฟอร์มเพื่อนกินเที่ยว)
  "sex", "เซ็กส์", "เซ็ก", "มีอะไรกัน", "นอนด้วย", "ค้างคืนด้วย", "ขายตัว", "ไซด์ไลน์", "ยาเสพติด", "ยาไอซ์", "ยาบ้า",
];
export const DEFAULT_CHAT: ChatRules = { words: DEFAULT_WORDS, strikeLimit: 3, history: [] };

const PATH = "_config/chat.json";
const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const g = globalThis as unknown as { __mbChat?: ChatRules; __mbChatAt?: number; __mbChatCache?: ChatRules };
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export async function getChatRules(): Promise<ChatRules> {
  if (isDemo) return g.__mbChat ?? DEFAULT_CHAT;
  if (g.__mbChatCache && Date.now() - (g.__mbChatAt ?? 0) < 60_000) return g.__mbChatCache;
  try {
    const { data, error } = await db().storage.from("applicants").download(PATH);
    const rules = error || !data ? DEFAULT_CHAT : { ...DEFAULT_CHAT, ...(JSON.parse(await data.text()) as Partial<ChatRules>) };
    g.__mbChatCache = rules; g.__mbChatAt = Date.now();
    return rules;
  } catch { return DEFAULT_CHAT; }
}
export async function saveChatRules(words: string[], strikeLimit: number, by: string): Promise<ChatRules> {
  const cur = await getChatRules();
  const clean = [...new Set(words.map((w) => w.trim()).filter((w) => w.length >= 2 && w.length <= 40))].slice(0, 500);
  const saved: ChatRules = { words: clean, strikeLimit: Math.max(1, Math.min(20, Math.round(strikeLimit) || 3)), history: [{ at: new Date().toISOString(), by }, ...cur.history].slice(0, 20) };
  if (isDemo) { g.__mbChat = saved; return saved; }
  const { error } = await db().storage.from("applicants").upload(PATH, new Blob([JSON.stringify(saved)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
  if (error) throw error;
  g.__mbChatCache = saved; g.__mbChatAt = Date.now();
  return saved;
}

/** ตัดตัวเลี่ยง: ช่องว่าง จุด ขีด อักขระล่องหน · เลขไทย → อารบิก · ตัวพิมพ์เล็ก */
const THAI_DIGIT = "๐๑๒๓๔๕๖๗๘๙";
export const normalize = (s: string) =>
  s.toLowerCase().replace(/[๐-๙]/g, (d) => String(THAI_DIGIT.indexOf(d))).replace(/[\s._\-*/\\|~^'"`,:;()[\]{}​-‍﻿]+/g, "");

export type ChatCheck = { blocked: false } | { blocked: true; flag: string; reason: string };
export async function checkChat(text: string): Promise<ChatCheck> {
  if (hasContact(text)) return { blocked: true, flag: "contact", reason: "มีเบอร์โทร LINE ลิงก์ หรือช่องทางติดต่อนอกแอป" };
  const n = normalize(text);
  const word = (await getChatRules()).words.find((w) => n.includes(normalize(w)));
  if (word) return { blocked: true, flag: `word:${word}`, reason: "มีคำที่ไม่อนุญาตให้ส่งในแชท" };
  return { blocked: false };
}
