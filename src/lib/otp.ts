import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { customersEnabled, sbHeaders } from "./customer/auth";

// OTP ยืนยันเบอร์โทร — ไม่ผูกกับผู้ให้บริการ SMS (SmsProvider) ตอนนี้มี ThaiBulkSMS
// - ตั้ง THAIBULKSMS_API_KEY + THAIBULKSMS_API_SECRET (+ SMS_SENDER) → ส่ง SMS จริง
// - ไม่ตั้ง → โหมด dev: log รหัสลงคอนโซล และคืนรหัสให้หน้าจอ (เฉพาะ NODE_ENV !== "production")
// กติกา: ขอใหม่ได้ทุก 60 วิ/เบอร์ · สูงสุด 5 ครั้ง/ชม. ต่อเบอร์และต่อ IP · หมดอายุ 5 นาที · ใส่ผิดได้ 5 ครั้ง · เก็บเป็น hash

export const OTP_TTL_MS = 5 * 60_000;
export const OTP_RESEND_MS = 60_000;
export const OTP_MAX_PER_HOUR = 5;
export const OTP_MAX_ATTEMPTS = 5;

export interface SmsProvider {
  name: string;
  send(phone: string, message: string): Promise<void>;
}

/** ThaiBulkSMS API v2 — https://developer.thaibulksms.com */
export const thaiBulkSms: SmsProvider = {
  name: "thaibulksms",
  async send(phone, message) {
    const key = process.env.THAIBULKSMS_API_KEY!, secret = process.env.THAIBULKSMS_API_SECRET!;
    const body = new URLSearchParams({ msisdn: phone, message, sender: process.env.SMS_SENDER || "OTP" });
    const res = await fetch("https://api-v2.thaibulksms.com/sms", {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
    });
    if (!res.ok) throw new Error(`thaibulksms ${res.status}: ${(await res.text()).slice(0, 200)}`);
  },
};

export const smsProvider = (): SmsProvider | null =>
  process.env.THAIBULKSMS_API_KEY && process.env.THAIBULKSMS_API_SECRET ? thaiBulkSms : null;

/** 08x-xxx-xxxx / +66 8x… → 668xxxxxxxx (null = ไม่ใช่เบอร์มือถือไทย) */
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  const local = d.startsWith("66") ? `0${d.slice(2)}` : d;
  return /^0[689]\d{8}$/.test(local) ? `66${local.slice(1)}` : null;
}

// โหมดจริงห้ามใช้ secret สำรอง (ปลอมโทเคนได้) — ไม่ตั้ง ADMIN_SESSION_SECRET = ล้มทันที
const secret = () => {
  const v = process.env.ADMIN_SESSION_SECRET;
  if (v) return v;
  if (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV) throw new Error("ADMIN_SESSION_SECRET is not set");
  return "hamoo-demo-secret";
};
const hashCode = (phone: string, code: string) => createHmac("sha256", secret()).update(`otp:${phone}:${code}`).digest("hex");

type Row = { id: string; phone: string; ip: string; code_hash: string; attempts: number; expires_at: string; verified_at: string | null; created_at: string };

// ── ที่เก็บ: Supabase (otp_codes) หรือหน่วยความจำ ──
const g = globalThis as unknown as { __mbOtp?: Row[] };
const mem = (g.__mbOtp ??= []);
const SB = () => process.env.SUPABASE_URL;
// ยังไม่ได้รัน supabase/0002_noshow.sql (ตาราง otp_codes ไม่มี → 404) → ใช้หน่วยความจำแทน
const gm = globalThis as unknown as { __mbOtpMissing?: boolean };
const useDb = () => customersEnabled() && !gm.__mbOtpMissing;
function missing(status: number) {
  if (status !== 404) return false;
  if (!gm.__mbOtpMissing) console.warn("[otp] otp_codes table missing — run supabase/0002_noshow.sql; using in-memory store");
  gm.__mbOtpMissing = true;
  return true;
}

async function recent(col: "phone" | "ip", value: string, sinceMs: number): Promise<Row[]> {
  const since = new Date(Date.now() - sinceMs).toISOString();
  if (useDb()) {
    const res = await fetch(`${SB()}/rest/v1/otp_codes?${col}=eq.${encodeURIComponent(value)}&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&select=*`, { headers: sbHeaders(), cache: "no-store" });
    if (res.ok) return (await res.json()) as Row[];
    if (!missing(res.status)) throw new Error(`otp select ${res.status}`);
  }
  return mem.filter((r) => r[col] === value && r.created_at >= since).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function insert(row: Omit<Row, "id">) {
  if (useDb()) {
    const res = await fetch(`${SB()}/rest/v1/otp_codes`, { method: "POST", headers: sbHeaders(), body: JSON.stringify(row) });
    if (res.ok) return;
    if (!missing(res.status)) throw new Error(`otp insert ${res.status}`);
  }
  mem.push({ ...row, id: String(Date.now()) + randomInt(1000) });
  if (mem.length > 5000) mem.splice(0, 1000);
}

async function patch(id: string, p: Partial<Row>) {
  if (!useDb()) { const r = mem.find((x) => x.id === id); if (r) Object.assign(r, p); return; }
  await fetch(`${SB()}/rest/v1/otp_codes?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: sbHeaders(), body: JSON.stringify(p) });
}

export type SendResult = { ok: true; devCode?: string; dev: boolean } | { ok: false; error: string; retryAfter?: number; status: number };

export async function sendOtp(phone: string, ip: string): Promise<SendResult> {
  const byPhone = await recent("phone", phone, 3600_000);
  const last = byPhone[0];
  if (last) {
    const wait = OTP_RESEND_MS - (Date.now() - Date.parse(last.created_at));
    if (wait > 0) return { ok: false, error: `ขอรหัสใหม่ได้ใน ${Math.ceil(wait / 1000)} วินาที`, retryAfter: Math.ceil(wait / 1000), status: 429 };
  }
  if (byPhone.length >= OTP_MAX_PER_HOUR || (await recent("ip", ip, 3600_000)).length >= OTP_MAX_PER_HOUR)
    return { ok: false, error: "ขอรหัสครบ 5 ครั้งใน 1 ชั่วโมงแล้ว กรุณาลองใหม่ภายหลัง", status: 429 };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();
  await insert({ phone, ip, code_hash: hashCode(phone, code), attempts: 0, expires_at: new Date(now.getTime() + OTP_TTL_MS).toISOString(), verified_at: null, created_at: now.toISOString() });

  const provider = smsProvider();
  if (!provider) {
    console.info(`[otp:dev] ${phone} → ${code}`);
    return { ok: true, dev: true, devCode: process.env.NODE_ENV !== "production" ? code : undefined };
  }
  try {
    await provider.send(phone, `รหัสยืนยัน Mister Bamrungsuk ของคุณคือ ${code} (ใช้ได้ 5 นาที) ห้ามบอกรหัสนี้กับผู้อื่น`);
  } catch (e) {
    console.error("otp sms failed", e);
    return { ok: false, error: "ส่ง SMS ไม่สำเร็จ กรุณาลองใหม่", status: 502 };
  }
  return { ok: true, dev: false };
}

export async function verifyOtp(phone: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const last = (await recent("phone", phone, OTP_TTL_MS))[0];
  if (!last || last.verified_at) return { ok: false, error: "รหัสหมดอายุ กรุณาขอรหัสใหม่" };
  if (Date.parse(last.expires_at) < Date.now()) return { ok: false, error: "รหัสหมดอายุ กรุณาขอรหัสใหม่" };
  if (last.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: "ใส่รหัสผิดเกิน 5 ครั้ง กรุณาขอรหัสใหม่" };
  const want = Buffer.from(last.code_hash, "hex");
  const got = Buffer.from(hashCode(phone, code.replace(/\D/g, "")), "hex");
  if (want.length !== got.length || !timingSafeEqual(want, got)) {
    const left = OTP_MAX_ATTEMPTS - last.attempts - 1;
    await patch(last.id, { attempts: last.attempts + 1 });
    return { ok: false, error: left > 0 ? `รหัสไม่ถูกต้อง (เหลือ ${left} ครั้ง)` : "ใส่รหัสผิดเกิน 5 ครั้ง กรุณาขอรหัสใหม่" };
  }
  await patch(last.id, { verified_at: new Date().toISOString() });
  return { ok: true };
}

// ── หลักฐานว่ายืนยันเบอร์แล้ว (cookie ลงลายเซ็น อายุ 30 นาที) ใช้ตอนสมัคร ──
export const PHONE_COOKIE = "mb_phone_ok";
export const PHONE_TOKEN_MS = 30 * 60_000;

export function signPhoneToken(phone: string) {
  const body = Buffer.from(JSON.stringify({ phone, exp: Date.now() + PHONE_TOKEN_MS })).toString("base64url");
  return `${body}.${createHmac("sha256", secret()).update(`phone:${body}`).digest("base64url")}`;
}

export function readPhoneToken(token: string | undefined): string | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const want = createHmac("sha256", secret()).update(`phone:${body}`).digest("base64url");
  if (want.length !== sig.length || !timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as { phone: string; exp: number };
    return p.exp > Date.now() ? p.phone : null;
  } catch { return null; }
}

/** ต้องยืนยัน OTP ไหม — เปิดเมื่อตั้งคีย์ ThaiBulkSMS แล้ว (หรือรันในเครื่อง ที่ได้รหัสโหมด dev) · บนเว็บจริงที่ยังไม่มีคีย์ = ข้าม OTP ชั่วคราว */
export const otpRequired = () => !!(process.env.THAIBULKSMS_API_KEY && process.env.THAIBULKSMS_API_SECRET) || process.env.NODE_ENV !== "production";
