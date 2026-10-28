import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createExternalRep } from "./index";
import { cleanUsername, emailTaken, issueAutoLogin, issueSalesLogin, usernameOk } from "./recruit";

// ใบสมัคร Recruit จากหน้า /recruit/apply (27 ต.ค. 2569) — คนทั่วไปสมัครเอง → แอดมินอนุมัติ = สร้าง Recruit + ออก ID/รหัสผ่าน (แสดงครั้งเดียว)
// เก็บใน Storage _config/recruit-applications.json (แบบเดียวกับ sales-logins)
export type RecruitApp = {
  id: string; name: string; phone: string; email: string; line_id: string; channel: string;
  bank: { bank: string; account: string; name: string };
  status: "pending" | "approved" | "rejected"; created_at: string; ip: string;
  decided_at?: string; decided_by?: string; reason?: string; rep_id?: string; username?: string;
};

const PATH = "_config/recruit-applications.json";
const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const g = globalThis as unknown as { __mbRecruitApps?: RecruitApp[] };
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
async function load(): Promise<RecruitApp[]> {
  if (isDemo) return g.__mbRecruitApps ?? [];
  try { const { data, error } = await db().storage.from("applicants").download(PATH); if (error || !data) return []; return JSON.parse(await data.text()) as RecruitApp[]; } catch { return []; }
}
async function save(list: RecruitApp[]) {
  if (isDemo) { g.__mbRecruitApps = list; return; }
  const { error } = await db().storage.from("applicants").upload(PATH, new Blob([JSON.stringify(list)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
  if (error) throw error;
}

export class ApplyError extends Error {}
const str = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

/** สมัครแล้วเป็น Recruit ทันที (บอสสั่ง 28 ต.ค. 2569): สร้าง Recruit + ID อัตโนมัติ → เข้าแดชบอร์ดเลย ตั้งรหัสผ่านเองทีหลัง
 *  แอดมินยังเห็นใบสมัครใน /admin/sales (อนุมัติอัตโนมัติ) และปิดใช้งาน Recruit ได้ */
export async function submitRecruitApp(b: Record<string, unknown>, ip: string): Promise<{ app: RecruitApp; repId: string; code: string; username: string }> {
  const name = str(b.name, 80), phone = str(b.phone, 20).replace(/[^\d]/g, ""), email = str(b.email, 120).toLowerCase(), line_id = str(b.line_id, 60), channel = str(b.channel, 300);
  const bank = { bank: str(b.bank, 60), account: str(b.account, 20).replace(/[^\d]/g, ""), name: str(b.account_name, 80) };
  if (name.length < 3) throw new ApplyError("กรอกชื่อ-นามสกุล");
  if (!/^0\d{8,9}$/.test(phone)) throw new ApplyError("เบอร์โทร 10 หลัก ขึ้นต้นด้วย 0");
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) throw new ApplyError("กรอกอีเมลให้ถูกต้อง");
  if (!bank.bank || bank.account.length < 10 || !bank.name) throw new ApplyError("กรอกบัญชีรับค่าตอบแทนให้ครบ (ธนาคาร · เลขบัญชี · ชื่อบัญชี)");
  if (b.consent !== true) throw new ApplyError("ติ๊กยอมรับเงื่อนไขและการเก็บข้อมูลก่อนส่ง");
  const list = await load();
  if (list.some((a) => a.status === "pending" && (a.phone === phone || a.email === email))) throw new ApplyError("มีใบสมัครของเบอร์/อีเมลนี้รอตรวจอยู่แล้ว · ทีมงานจะติดต่อกลับ");
  if (list.some((a) => a.status === "approved" && (a.phone === phone || a.email === email)) || (await emailTaken(email))) throw new ApplyError("เบอร์/อีเมลนี้เป็น Recruit อยู่แล้ว · เข้าสู่ระบบที่หน้า Recruit");
  const rep = await createExternalRep({ name, phone, bank }, "self-apply");
  let u = cleanUsername(email.split("@")[0]).replace(/[^a-z0-9._-]/g, "");
  if (!usernameOk(u)) u = `rc${phone.slice(-6)}`;
  let username = "";
  for (let i = 0; i < 6 && !username; i++) username = await issueAutoLogin(rep, i ? `${u}${i + 1}` : u, email, "self-apply").catch(() => "");
  if (!username) username = await issueAutoLogin(rep, `rc${rep.code.toLowerCase()}`, email, "self-apply");
  const now = new Date().toISOString();
  const app: RecruitApp = { id: randomUUID(), name, phone, email, line_id, channel, bank, status: "approved", created_at: now, ip, decided_at: now, decided_by: "auto", rep_id: rep.id, username };
  await save([app, ...(await load())].slice(0, 2000));
  return { app, repId: rep.id, code: rep.code, username };
}

export const listRecruitApps = async (status?: RecruitApp["status"]) => (await load()).filter((a) => !status || a.status === status);

/** แอดมินอนุมัติ → สร้าง Recruit (บัญชีจากใบสมัคร) + ออก ID (ค่าเริ่มต้น = ส่วนหน้าอีเมล) / รหัสผ่าน · คืนรหัสผ่านครั้งเดียว */
export async function approveRecruitApp(id: string, by: string, username?: string): Promise<{ app: RecruitApp; code: string; login: { username: string; password: string } }> {
  const a = (await load()).find((x) => x.id === id);
  if (!a) throw new ApplyError("ไม่พบใบสมัคร");
  if (a.status !== "pending") throw new ApplyError("ใบสมัครนี้ตัดสินแล้ว");
  const rep = await createExternalRep({ name: a.name, phone: a.phone, bank: a.bank }, by);
  let u = cleanUsername(username || a.email.split("@")[0]).replace(/[^a-z0-9._-]/g, "");
  if (!usernameOk(u)) u = `rc${a.phone.slice(-6)}`;
  let login: { username: string; password: string } | null = null;
  for (let i = 0; i < 5 && !login; i++) login = await issueSalesLogin(rep, i ? `${u}${i + 1}` : u, by).catch(() => null);
  if (!login) throw new ApplyError("ออก ID ไม่สำเร็จ · ลองใส่ ID เอง");
  const done: RecruitApp = { ...a, status: "approved", decided_at: new Date().toISOString(), decided_by: by, rep_id: rep.id, username: login.username };
  await save((await load()).map((x) => (x.id === id ? done : x)));
  return { app: done, code: rep.code, login };
}

export async function rejectRecruitApp(id: string, by: string, reason: string): Promise<RecruitApp> {
  if (!reason.trim()) throw new ApplyError("ใส่เหตุผลที่ไม่อนุมัติ");
  const a = (await load()).find((x) => x.id === id);
  if (!a) throw new ApplyError("ไม่พบใบสมัคร");
  if (a.status !== "pending") throw new ApplyError("ใบสมัครนี้ตัดสินแล้ว");
  const done: RecruitApp = { ...a, status: "rejected", decided_at: new Date().toISOString(), decided_by: by, reason: reason.trim().slice(0, 200) };
  await save((await load()).map((x) => (x.id === id ? done : x)));
  return done;
}
