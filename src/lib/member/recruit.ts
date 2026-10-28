import "server-only";
import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { PLATFORM, post, type OwnerType } from "@/lib/wallet";
import { notify } from "@/lib/bookings";
import { extraOf, getById, listApplicants, saveProfile, type Applicant } from "@/lib/join/store";
import { hashPw, verifyPw } from "@/lib/join/pt-password";
import { tierLabel } from "@/lib/join/config";
import { findRep, type SalesRep } from "./store";
import { monthJobsOf } from "./recruit-bonus";

// Recruit ชวน Part-Time (หมอ) — บอสสั่ง 24 ต.ค. 2569 (ปรับรอบ 2: ค่าแนะนำ ฿500 ต่อคนทุกแผน)
// ลิงก์ /join/s/<โค้ด> (คุกกี้ mb_sm 30 วัน) หรือกรอกเลขแนะนำตอนสมัคร → ผูก docs.extra.sales_ref
// ทุกแผนได้ ฿500 เมื่อผู้สมัครได้งานแรก (โปสเตอร์ Recruiter Program 27 ต.ค. 2569 · bookings/day.ts matureOne):
// · สมัครแบบจ่ายเงิน → จ่ายจาก platform.marketing (creditRecruit) · สมัครฟรี → ใช้ ฿500 ที่หักค่าสมัครงานแรก (firstJobRecruit)
// · โบนัสรายเดือนต่อผู้สมัคร 1 คน (15 งาน ฿1,000 / 20 งาน ฿2,000) อยู่ใน recruit-bonus.ts (CEO อนุมัติ)
export const RECRUIT_COOKIE = "mb_sm";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH");
const ownerOf = (r: SalesRep): { type: OwnerType; id: string } => (r.kind === "parttime" ? { type: "parttime", id: r.parttime_id! } : { type: "sales", id: r.id });

/** โค้ดที่ใช้ชวนได้ (Recruit ภายนอก หรือ Part-Time ที่เปิดใช้อยู่) */
export async function recruitRep(code: string | null | undefined): Promise<SalesRep | null> {
  const c = String(code ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(c)) return null;
  const r = await findRep({ code: c }).catch(() => null);
  return r?.active ? r : null;
}

/** ค่าแนะนำต่อคน (สตางค์) — ทุกแผนเท่ากัน · ค่าเริ่มต้น ฿500 · CEO กำหนดได้ที่ /admin/recruit-programs (ปิดโปรแกรม = 0) */
export const RECRUIT_FEE_SATANG = 50_000;
export async function recruitRate(_a?: Pick<Applicant, "amount" | "package">): Promise<number> {
  const p = (await (await import("./recruit-programs")).getPrograms()).parttime;
  return p.enabled ? p.amount_satang : 0;
}
/** สมัครแบบจ่ายเงิน ได้งานแรกแล้ว → จ่ายค่าแนะนำให้ Recruit ที่ชวน (ครั้งเดียวต่อผู้สมัคร · idem recruit:<id>) · เรียกจาก matureOne */
export async function creditRecruit(applicantId: string, actor: string): Promise<number> {
  const a = await getById(applicantId);
  if (!a || a.status !== "verified" || !a.amount) return 0;
  const x = extraOf(a);
  if (!x.sales_ref || x.recruit_at) return 0;
  const rep = await findRep({ id: x.sales_ref.rep_id });
  if (!rep) return 0;
  const amt = await recruitRate(a);
  if (amt > 0) {
    const o = ownerOf(rep);
    await post("commission", { type: "applicant", id: a.id }, `recruit:${a.id}`, `ค่าแนะนำ Recruit · ${a.mb_code}`, actor, [
      { owner_type: "platform", owner_id: PLATFORM, bucket: "marketing", amount: -amt },
      { owner_type: o.type, owner_id: o.id, bucket: "available", amount: amt },
    ]);
    if (o.type === "parttime") await notify({ user_type: "parttime", user_id: o.id, kind: "commission", title: `ได้ค่าแนะนำ ${baht(amt)}`, body: a.mb_code, url: "" }).catch(() => {});
  }
  await saveProfile(a.id, { recruit_satang: amt, recruit_at: new Date().toISOString() });
  return amt;
}

/** งานแรกของหมอสมัครฟรีที่ Recruit แนะนำ (ยังไม่เคยจ่ายค่าแนะนำ) → ปลายทางของเงินที่หัก + แจ้งเตือน · null = ไม่มี Recruit / จ่ายไปแล้ว */
export async function firstJobRecruit(a: Applicant): Promise<{ repId: string; code: string; owner: { type: OwnerType; id: string }; notify: (amt: number) => Promise<unknown> } | null> {
  const x = extraOf(a);
  if (!x.sales_ref || x.recruit_at || a.amount) return null;
  const rep = await findRep({ id: x.sales_ref.rep_id }).catch(() => null);
  if (!rep) return null;
  const o = ownerOf(rep);
  return {
    repId: rep.id, code: rep.code, owner: o,
    notify: async (amt) => { if (o.type === "parttime") await notify({ user_type: "parttime", user_id: o.id, kind: "commission", title: `ได้ค่าแนะนำ ${baht(amt)}`, body: `${a.mb_code} ได้งานแรกแล้ว`, url: "" }); },
  };
}

/** หมอที่ Recruit คนนี้ชวน (เห็นเฉพาะของตัวเอง · ชื่อเล่น + อักษรแรกนามสกุล) + ได้งานหรือยัง */
export async function recruitsOf(rep: SalesRep) {
  const rows = (await listApplicants().catch(() => [] as Applicant[])).filter((a) => extraOf(a).sales_ref?.rep_id === rep.id);
  const { listForParttime } = await import("@/lib/bookings");
  const out = [];
  const rate = await recruitRate();
  for (const a of rows) {
    const x = extraOf(a);
    const paid = a.status === "verified";
    const jobs = paid ? (await listForParttime(a.id).catch(() => [])).filter((b) => b.status === "completed").length : 0;
    const free = !a.amount;
    out.push({
      id: a.id, mb: a.mb_code, who: `${a.nickname || a.first_name}${a.last_name ? ` ${a.last_name.trim()[0] ?? ""}.` : ""}`,
      pack: `สาย ${a.package}${x.group === "tom" ? " · ทอมหล่อ" : ""}${x.tier && x.tier !== "silver" ? ` · ${tierLabel(x.tier)}` : ""}${free ? " · สมัครฟรี" : ""}`,
      status: a.status === "rejected" ? "ไม่ผ่าน" : a.status === "refunded" ? "คืนเงินแล้ว" : !paid ? "รอตรวจสลิป" : x.inactive ? "Non Active" : !x.listed ? "รอเปิดรับงาน" : jobs ? `ได้งานแล้ว ${jobs} งาน` : "ยังไม่ได้งาน",
      jobs, free,
      commission: x.recruit_at ? x.recruit_satang ?? 0 : rate, credited: !!x.recruit_at, at: x.recruit_at ?? a.created_at,
      wait: x.recruit_at ? "ได้รับแล้ว" : "ได้เมื่อผู้สมัครได้งานแรก", monthJobs: paid ? await monthJobsOf(a.id) : 0,
    });
  }
  return out;
}

// ── ID / รหัสผ่าน Recruit ภายนอก (ทีมงานออกให้) · เก็บแฮชใน Storage _config/sales-logins.json ──
// pw_set false = สมัครเองแล้วเข้าระบบอัตโนมัติ ยังไม่ได้ตั้งรหัสผ่าน (ตั้งเองในแดชบอร์ด) · email = เข้าระบบด้วยอีเมลได้
type Login = { rep_id: string; username: string; pw_hash: string; updated_at: string; by: string; email?: string; pw_set?: boolean };
const PATH = "_config/sales-logins.json";
const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const g = globalThis as unknown as { __mbSalesLogins?: Login[] };
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
async function loadLogins(): Promise<Login[]> {
  if (isDemo) return g.__mbSalesLogins ?? [];
  try { const { data, error } = await db().storage.from("applicants").download(PATH); if (error || !data) return []; return JSON.parse(await data.text()) as Login[]; } catch { return []; }
}
async function saveLogins(list: Login[]) {
  if (isDemo) { g.__mbSalesLogins = list; return; }
  const { error } = await db().storage.from("applicants").upload(PATH, new Blob([JSON.stringify(list)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
  if (error) throw error;
}
export const cleanUsername = (u: unknown) => String(u ?? "").trim().toLowerCase();
export const usernameOk = (u: string) => /^[a-z0-9._-]{4,32}$/.test(u);
/** รหัสผ่านสุ่ม 10 ตัว (ตัดตัวที่สับสนง่าย) */
const newPassword = () => [...randomBytes(10)].map((b) => "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 55]).join("");

/** แอดมินออก ID/รหัสผ่านใหม่ให้ Recruit (คืนรหัสผ่านครั้งเดียว · เก็บแค่แฮช) */
export async function issueSalesLogin(rep: SalesRep, username: string, by: string): Promise<{ username: string; password: string }> {
  const u = cleanUsername(username);
  if (!usernameOk(u)) throw new Error("ID ใช้ a-z 0-9 . _ - ยาว 4–32 ตัว");
  const list = await loadLogins();
  if (list.some((l) => l.username === u && l.rep_id !== rep.id)) throw new Error("ID นี้ถูกใช้แล้ว");
  const password = newPassword();
  const row: Login = { rep_id: rep.id, username: u, pw_hash: hashPw(password), updated_at: new Date().toISOString(), by, email: list.find((l) => l.rep_id === rep.id)?.email, pw_set: true };
  await saveLogins([row, ...list.filter((l) => l.rep_id !== rep.id)]);
  return { username: u, password };
}
/** สมัคร Recruit เอง (28 ต.ค. 2569): ออก ID อัตโนมัติ · รหัสผ่านสุ่มที่ไม่มีใครรู้ (pw_set false) จนกว่าเจ้าตัวจะตั้งเองในแดชบอร์ด */
export async function issueAutoLogin(rep: SalesRep, username: string, email: string, by: string): Promise<string> {
  const u = cleanUsername(username), em = cleanUsername(email);
  if (!usernameOk(u)) throw new Error("bad username");
  const list = await loadLogins();
  if (list.some((l) => l.username === u && l.rep_id !== rep.id)) throw new Error("ID นี้ถูกใช้แล้ว");
  if (em && list.some((l) => l.email === em && l.rep_id !== rep.id)) throw new Error("อีเมลนี้ถูกใช้แล้ว");
  const row: Login = { rep_id: rep.id, username: u, pw_hash: hashPw(newPassword() + newPassword()), updated_at: new Date().toISOString(), by, email: em || undefined, pw_set: false };
  await saveLogins([row, ...list.filter((l) => l.rep_id !== rep.id)]);
  return u;
}
export async function loginOf(repId: string): Promise<{ username: string; email?: string; pwSet: boolean } | null> {
  const l = (await loadLogins()).find((x) => x.rep_id === repId);
  return l ? { username: l.username, email: l.email, pwSet: l.pw_set !== false } : null;
}
export async function emailTaken(email: string) { const em = cleanUsername(email); return (await loadLogins()).some((l) => l.email === em); }
/** Recruit ตั้ง/เปลี่ยนรหัสผ่านเอง · ตั้งครั้งแรก (pw_set false) ไม่ต้องใส่รหัสเดิม */
export async function setSalesPassword(repId: string, password: string, current?: string): Promise<void> {
  if (password.length < 8 || password.length > 72) throw new Error("รหัสผ่านอย่างน้อย 8 ตัว");
  const list = await loadLogins();
  const row = list.find((l) => l.rep_id === repId);
  if (!row) throw new Error("ยังไม่มี ID · ติดต่อทีมงาน");
  if (row.pw_set !== false && !verifyPw(String(current ?? ""), row.pw_hash)) throw new Error("รหัสผ่านเดิมไม่ถูกต้อง");
  await saveLogins(list.map((l) => (l.rep_id === repId ? { ...l, pw_hash: hashPw(password), pw_set: true, updated_at: new Date().toISOString(), by: `self:${repId}` } : l)));
}
export async function removeSalesLogin(repId: string) { const list = await loadLogins(); if (list.some((l) => l.rep_id === repId)) await saveLogins(list.filter((l) => l.rep_id !== repId)); }
export async function loginUsernames(): Promise<Record<string, string>> {
  return Object.fromEntries((await loadLogins()).map((l) => [l.rep_id, l.username]));
}
/** ตรวจ ID/รหัสผ่าน → rep id (ไม่บอกว่าผิดตรงไหน) */
export async function checkSalesLogin(username: unknown, password: unknown): Promise<string | null> {
  const u = cleanUsername(username);
  const row = (await loadLogins()).find((l) => l.username === u || (!!l.email && l.email === u));
  const ok = verifyPw(String(password ?? ""), row?.pw_hash);
  return ok && row ? row.rep_id : null;
}
