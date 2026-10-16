import "server-only";
import { randomInt } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PLATFORM, WalletError, isDemo, post } from "@/lib/wallet";

// โค้ดโปรโมชัน + บัตรของขวัญ (supabase/booking/0004_codes.sql) — ใช้โค้ด = เครดิตเข้ากระเป๋า
export type PromoCode = {
  code: string; kind: "promo" | "gift"; amount_satang: number; max_uses: number; used: number; expires_at: string | null; active: boolean; note: string | null;
  created_by: string | null; from_customer: string | null; to_name: string | null; to_contact: string | null; message: string | null; created_at: string;
};
export class CodeError extends Error {}

let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
const g = globalThis as unknown as { __mbCodes?: { codes: PromoCode[]; used: { code: string; customer_id: string; amount_satang: number; created_at: string }[] } };
const demo = (g.__mbCodes ??= { codes: [], used: [] });

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ไม่มี 0/O/1/I กันอ่านผิด
export const newCode = (prefix = "MB") => prefix + Array.from({ length: 8 }, () => ALPHA[randomInt(ALPHA.length)]).join("");
export const cleanCode = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

const MSG: Record<string, string> = {
  invalid: "โค้ดนี้ใช้ไม่ได้หรือหมดอายุแล้ว ลองเช็กตัวสะกดอีกครั้งนะคะ",
  used: "คุณใช้โค้ดนี้ไปแล้ว",
  "own gift": "ใช้บัตรของขวัญที่คุณซื้อเองไม่ได้ · ส่งโค้ดให้เพื่อนนะคะ",
};
const codeErr = (e: unknown) => { const m = /promo: (invalid|used|own gift)/.exec(String((e as { message?: string })?.message ?? "")); return m ? new CodeError(MSG[m[1]]) : null; };

/** ลูกค้าใช้โค้ด → เครดิตเข้ากระเป๋า */
export async function redeem(code: string, customer_id: string): Promise<{ code: string; kind: string; amount: number; expires_at: string | null; message: string | null }> {
  const c = cleanCode(code);
  if (c.length < 4 || c.length > 24) throw new CodeError(MSG.invalid);
  if (isDemo) {
    const p = demo.codes.find((x) => x.code === c);
    if (!p || !p.active || (p.expires_at && Date.parse(p.expires_at) < Date.now()) || p.used >= p.max_uses) throw new CodeError(MSG.invalid);
    if (p.from_customer === customer_id) throw new CodeError(MSG["own gift"]);
    if (demo.used.some((u) => u.code === c && u.customer_id === customer_id)) throw new CodeError(MSG.used);
    await post("promo", { type: "promo", id: c }, `promo:${c}:${customer_id}`, `${p.kind === "gift" ? "บัตรของขวัญ" : "โค้ดโปรโมชัน"} ${c}`, `customer:${customer_id}`, [
      { owner_type: "platform", owner_id: PLATFORM, bucket: p.kind === "gift" ? "gift_liability" : "promo", amount: -p.amount_satang },
      { owner_type: "customer", owner_id: customer_id, bucket: "available", amount: p.amount_satang },
    ]);
    p.used++; demo.used.push({ code: c, customer_id, amount_satang: p.amount_satang, created_at: new Date().toISOString() });
    return { code: c, kind: p.kind, amount: p.amount_satang, expires_at: p.expires_at, message: p.message };
  }
  const { data, error } = await db().rpc("promo_redeem", { p_code: c, p_customer: customer_id });
  if (error) throw codeErr(error) ?? error;
  const d = data as { code: string; kind: string; amount: number; expires_at: string | null; message: string | null };
  return { ...d, amount: Number(d.amount) };
}

/** ลูกค้าซื้อบัตรของขวัญจากกระเป๋า → ได้โค้ดส่งให้เพื่อน (ใช้ได้ 1 ครั้ง · 1 ปี) */
export async function buyGift(customer_id: string, amount_satang: number, to: { name: string; contact: string; message: string }): Promise<PromoCode> {
  if (!Number.isInteger(amount_satang) || amount_satang < 10000 || amount_satang > 5000000) throw new CodeError("มูลค่าบัตร ฿100 – ฿50,000");
  const code = newCode("GIFT");
  const row = { name: to.name.trim().slice(0, 60) || null, contact: to.contact.trim().slice(0, 80) || null, message: to.message.trim().slice(0, 200) || null };
  if (isDemo) {
    try {
      await post("gift", { type: "gift", id: code }, `gift:${code}`, `ซื้อบัตรของขวัญ ${code}`, `customer:${customer_id}`, [
        { owner_type: "customer", owner_id: customer_id, bucket: "available", amount: -amount_satang },
        { owner_type: "platform", owner_id: PLATFORM, bucket: "gift_liability", amount: amount_satang },
      ]);
    } catch (e) { if (e instanceof WalletError) throw new CodeError("ยอดในกระเป๋าไม่พอ"); throw e; }
    const p: PromoCode = { code, kind: "gift", amount_satang, max_uses: 1, used: 0, expires_at: new Date(Date.now() + 365 * 86400e3).toISOString(), active: true, note: null, created_by: `customer:${customer_id}`, from_customer: customer_id, to_name: row.name, to_contact: row.contact, message: row.message, created_at: new Date().toISOString() };
    demo.codes.unshift(p);
    return p;
  }
  const { error } = await db().rpc("gift_buy", { p_customer: customer_id, p_amount: amount_satang, p_code: code, p_to_name: row.name, p_to_contact: row.contact, p_message: row.message });
  if (error) { if (/insufficient balance/.test(error.message)) throw new CodeError("ยอดในกระเป๋าไม่พอ"); throw error; }
  return (await getCode(code))!;
}

export async function getCode(code: string): Promise<PromoCode | null> {
  if (isDemo) return demo.codes.find((x) => x.code === code) ?? null;
  const { data } = await db().from("promo_codes").select().eq("code", code).maybeSingle();
  return (data as PromoCode) ?? null;
}
export async function myGifts(customer_id: string): Promise<PromoCode[]> {
  if (isDemo) return demo.codes.filter((x) => x.from_customer === customer_id);
  const { data } = await db().from("promo_codes").select().eq("from_customer", customer_id).order("created_at", { ascending: false }).limit(50);
  return (data ?? []) as PromoCode[];
}

// ── แอดมิน ──
export async function listCodes(): Promise<PromoCode[]> {
  if (isDemo) return demo.codes.slice(0, 500);
  const { data, error } = await db().from("promo_codes").select().order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []) as PromoCode[];
}
export async function createPromo(admin: string, p: { code?: string; amount_satang: number; max_uses: number; expires_at: string | null; note: string }): Promise<PromoCode> {
  const code = p.code ? cleanCode(p.code) : newCode("MB");
  if (code.length < 4 || code.length > 24) throw new CodeError("โค้ด 4–24 ตัว (A–Z, 0–9)");
  if (!Number.isInteger(p.amount_satang) || p.amount_satang < 100 || p.amount_satang > 10000000) throw new CodeError("มูลค่า ฿1 – ฿100,000");
  if (!Number.isInteger(p.max_uses) || p.max_uses < 1 || p.max_uses > 100000) throw new CodeError("จำนวนสิทธิ์ 1 – 100,000");
  const row: PromoCode = { code, kind: "promo", amount_satang: p.amount_satang, max_uses: p.max_uses, used: 0, expires_at: p.expires_at, active: true, note: p.note.slice(0, 200) || null, created_by: admin, from_customer: null, to_name: null, to_contact: null, message: null, created_at: new Date().toISOString() };
  if (isDemo) { if (demo.codes.some((x) => x.code === code)) throw new CodeError("มีโค้ดนี้แล้ว"); demo.codes.unshift(row); return row; }
  const { data, error } = await db().from("promo_codes").insert({ ...row, created_at: undefined }).select().single();
  if (error?.code === "23505") throw new CodeError("มีโค้ดนี้แล้ว");
  if (error) throw error;
  return data as PromoCode;
}
export async function setActive(code: string, active: boolean) {
  if (isDemo) { const p = demo.codes.find((x) => x.code === code); if (p) p.active = active; return; }
  await db().from("promo_codes").update({ active }).eq("code", code);
}
