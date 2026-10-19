import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// รหัสผ่าน Part-Time — scrypt + salt สุ่ม (รูปแบบเดียวกับ npm run admin:hash: "saltHex:hashHex") เก็บใน docs.extra.pw_hash
export const PW_MIN = 8;
export const PW_MAX = 128;

/** ข้อความผิดพลาดภาษาไทย หรือ "" ถ้าใช้ได้ */
export function pwProblem(pw: unknown): string {
  if (typeof pw !== "string" || !pw) return "ตั้งรหัสผ่านอย่างน้อย 8 ตัวอักษร";
  if (pw.length < PW_MIN) return "รหัสผ่านสั้นเกินไป · อย่างน้อย 8 ตัวอักษร";
  if (pw.length > PW_MAX) return "รหัสผ่านยาวเกินไป · ไม่เกิน 128 ตัวอักษร";
  return "";
}

export function hashPw(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 32).toString("hex")}`;
}

// แฮชหลอกไว้เทียบเวลาเมื่อไม่พบบัญชี (กันจับเวลาเดาว่าอีเมลไหนสมัคร)
const DUMMY = hashPw(randomBytes(12).toString("hex"));

export function verifyPw(pw: string, stored: string | null | undefined): boolean {
  const [salt, hex] = String(stored || DUMMY).split(":");
  if (!salt || !hex) return false;
  const got = scryptSync(String(pw).slice(0, PW_MAX), salt, 32);
  const want = Buffer.from(hex, "hex");
  return want.length === got.length && timingSafeEqual(got, want) && !!stored;
}
