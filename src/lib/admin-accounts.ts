// บัญชีแอดมิน (ฝั่งเซิร์ฟเวอร์เท่านั้น — ใช้ node:crypto)
// โหมดจริง: ตั้ง ADMIN_ACCOUNTS ใน env รูปแบบ  email|role|salt:hash ; คั่นหลายบัญชีด้วย ;
//   สร้างค่า salt:hash ด้วย  npm run admin:hash -- "รหัสผ่าน"
// โหมดเดโม (ไม่มี DATABASE_URL และไม่ได้ตั้ง ADMIN_ACCOUNTS): ใช้บัญชีสาธิต 4 บทบาท รหัสผ่านจาก ADMIN_DEMO_PASSWORD
import { scryptSync, timingSafeEqual } from "node:crypto";
import type { AdminRole } from "./admin-auth";

type Account = { email: string; role: AdminRole; salt?: string; hash?: string; plain?: string };

const ROLES: AdminRole[] = ["super", "finance", "cs", "kyc"];
const isDemo = !process.env.DATABASE_URL;

export const DEMO_ADMIN_EMAILS: Record<AdminRole, string> = {
  super: "super@mord.demo",
  finance: "finance@mord.demo",
  cs: "cs@mord.demo",
  kyc: "kyc@mord.demo",
};

function accounts(): Account[] {
  // แบบง่าย: ADMIN_EMAIL + ADMIN_PASSWORD = บัญชี super 1 บัญชี (ใช้ร่วมกับ ADMIN_ACCOUNTS ได้)
  // ไม่ได้ตั้ง ADMIN_EMAIL แต่มี ADMIN_PASSWORD → ใช้อีเมลแอดมินหลักของแบรนด์
  const simpleEmail = (process.env.ADMIN_EMAIL?.trim() || (process.env.ADMIN_PASSWORD ? "admin@misterbamrungsuk.com" : "")).toLowerCase();
  const simplePw = process.env.ADMIN_PASSWORD;
  const simple: Account[] = simpleEmail && simplePw ? [{ email: simpleEmail, role: "super", plain: simplePw }] : [];
  const raw = process.env.ADMIN_ACCOUNTS?.trim();
  if (simple.length && !raw) return simple;
  if (raw) {
    return simple.concat(raw.split(";").map((row) => {
      const [email, role, sh] = row.split("|").map((x) => x.trim());
      const [salt, hash] = (sh ?? "").split(":");
      return { email: email.toLowerCase(), role: role as AdminRole, salt, hash };
    }).filter((a) => a.email && ROLES.includes(a.role) && a.salt && a.hash));
  }
  if (!isDemo) return []; // โหมดจริงไม่มีบัญชีสาธิต
  const plain = process.env.ADMIN_DEMO_PASSWORD || "mord-demo";
  return ROLES.map((role) => ({ email: DEMO_ADMIN_EMAILS[role], role, plain }));
}

export function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 32).toString("hex");
}

/** ตรวจอีเมล+รหัสผ่าน คืนบทบาทถ้าถูกต้อง */
export function checkLogin(email: string, password: string): AdminRole | null {
  const acc = accounts().find((a) => a.email === email.trim().toLowerCase());
  if (!acc || !password) return null;
  if (acc.plain !== undefined) {
    const a = Buffer.from(password), b = Buffer.from(acc.plain);
    return a.length === b.length && timingSafeEqual(a, b) ? acc.role : null;
  }
  const got = Buffer.from(hashPassword(password, acc.salt!), "hex");
  const want = Buffer.from(acc.hash!, "hex");
  return got.length === want.length && timingSafeEqual(got, want) ? acc.role : null;
}

export const adminLoginEnabled = () => accounts().length > 0;
export const usingDemoAccounts = () => !process.env.ADMIN_ACCOUNTS?.trim() && !process.env.ADMIN_PASSWORD && isDemo;
