import "server-only";
import { createClient } from "@supabase/supabase-js";
import { PLATFORM, WalletError, balances, post, type Leg } from "@/lib/wallet";
import { verifySlip, type SlipCheck } from "@/lib/slip2go";
import { putFile, type Applicant } from "./store";

// โปรโมทโปรไฟล์ Part-Time — จ่ายแล้วขึ้นอันดับต้นในหน้าแรก + ป้าย "แนะนำ" ตามจำนวนวัน
// จ่ายได้ 2 ทาง: ยอดในกระเป๋า (ตัดทันที) · QR พร้อมเพย์ + สลิป (Slip2Go ผ่าน = เปิดทันที · ไม่ชัด = รอแอดมินตรวจ)
// เก็บเป็น JSON ใน Storage (_config/boosts.json) แบบเดียวกับลิงก์เชิญ · เงินลงบัญชีคู่ (kind "boost")
export const BOOST_PLANS = [
  { id: "d1", name: "ขึ้นหน้าแนะนำ 1 วัน", desc: "แสดงอันดับต้น ๆ ในหน้าเพื่อนในระบบ", days: 1, price: 300 },
  { id: "d3", name: "ขึ้นหน้าแนะนำ 3 วัน", desc: "ยอดนิยม · คุ้มกว่า", days: 3, price: 800 },
  { id: "d7", name: "ขึ้นหน้าแนะนำ 7 วัน", desc: "ปักหมุดหน้าแรก + ป้ายแนะนำ", days: 7, price: 1500 },
] as const;
export type BoostPlanId = (typeof BOOST_PLANS)[number]["id"];

export interface Boost {
  id: string; parttime_id: string; mb: string; plan: BoostPlanId; days: number; price_satang: number;
  status: "active" | "pending" | "rejected"; paid_via: "wallet" | "slip" | "code";
  starts_at: string | null; ends_at: string | null; created_at: string;
  slip_path?: string | null; slip_check?: SlipCheck | null; note?: string | null;
}

export class BoostError extends Error {}

const PATH = "_config/boosts.json";
const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const g = globalThis as unknown as { __mbBoosts?: Boost[] };
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export async function listBoosts(): Promise<Boost[]> {
  if (isDemo) return g.__mbBoosts ?? [];
  try {
    const { data, error } = await db().storage.from("applicants").download(PATH);
    if (error || !data) return [];
    return JSON.parse(await data.text()) as Boost[];
  } catch { return []; }
}
async function save(list: Boost[]) {
  if (isDemo) { g.__mbBoosts = list; return; }
  const { error } = await db().storage.from("applicants").upload(PATH, new Blob([JSON.stringify(list)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
  if (error) throw error;
}

/** Part-Time ที่โปรโมทอยู่ตอนนี้ → วันหมด (ใช้เรียงหน้าแรก) */
export async function activeBoosts(): Promise<Map<string, string>> {
  const now = Date.now(), out = new Map<string, string>();
  for (const b of await listBoosts()) {
    if (b.status !== "active" || !b.ends_at || Date.parse(b.ends_at) <= now) continue;
    if (!out.has(b.parttime_id) || Date.parse(b.ends_at) > Date.parse(out.get(b.parttime_id)!)) out.set(b.parttime_id, b.ends_at);
  }
  return out;
}

const planOf = (id: string) => { const p = BOOST_PLANS.find((x) => x.id === id); if (!p) throw new BoostError("เลือกแผนโปรโมท"); return p; };

/** ต่อเวลาจากของเดิม (ซื้อซ้อนได้ ไม่เสียวันที่เหลือ) */
async function activate(list: Boost[], b: Boost) {
  const cur = (await activeBoosts()).get(b.parttime_id);
  const start = cur && Date.parse(cur) > Date.now() ? Date.parse(cur) : Date.now();
  b.status = "active"; b.starts_at = new Date(start).toISOString(); b.ends_at = new Date(start + b.days * 86400_000).toISOString();
  return b;
}

/** จ่ายจากกระเป๋า Part-Time — ใช้วงเงินโปรโมท (ค่าคอมที่แปลง ×2) ก่อน แล้วค่อยใช้ยอดถอนได้ */
export async function buyBoostWithWallet(a: Applicant, planId: string): Promise<Boost> {
  const p = planOf(planId), amt = p.price * 100, id = crypto.randomUUID();
  const credit = Math.max(0, (await balances("parttime", a.id).catch(() => ({} as Record<string, number>))).boost_credit ?? 0);
  const fromCredit = Math.min(credit, amt);
  const legs: Leg[] = [
    { owner_type: "parttime", owner_id: a.id, bucket: "boost_credit", amount: -fromCredit },
    { owner_type: "parttime", owner_id: a.id, bucket: "available", amount: -(amt - fromCredit) },
    { owner_type: "platform", owner_id: PLATFORM, bucket: "revenue", amount: amt },
  ];
  try {
    await post("boost", { type: "boost", id }, `boost:${id}`, `โปรโมทโปรไฟล์ ${p.name}${fromCredit ? ` (วงเงินโปรโมท ฿${fromCredit / 100})` : ""}`, `parttime:${a.id}`, legs.filter((l) => l.amount !== 0));
  } catch (e) {
    if (e instanceof WalletError) throw new BoostError("ยอดในกระเป๋าไม่พอ · จ่ายด้วย QR แทนได้");
    throw e;
  }
  const list = await listBoosts();
  const b = await activate(list, { id, parttime_id: a.id, mb: a.mb_code, plan: p.id, days: p.days, price_satang: amt, status: "pending", paid_via: "wallet", starts_at: null, ends_at: null, created_at: new Date().toISOString() });
  await save([b, ...list]);
  return b;
}

/** จ่ายด้วย QR + สลิป — Slip2Go ผ่าน (ยอดตรง เข้าบัญชีร้าน ไม่ซ้ำ) = เปิดทันที · อื่น ๆ = รอแอดมินตรวจ · สลิปซ้ำ/ผิดบัญชี/ยอดไม่ตรง = ไม่รับ */
export async function buyBoostWithSlip(a: Applicant, planId: string, slip: File): Promise<Boost> {
  const p = planOf(planId), amt = p.price * 100, id = crypto.randomUUID();
  const check = await verifySlip(slip, p.price);
  if (check?.verdict === "dup") throw new BoostError("สลิปนี้เคยใช้แล้ว");
  if (check?.verdict === "acct") throw new BoostError("สลิปโอนเข้าบัญชีอื่น กรุณาโอนผ่าน QR ในหน้านี้");
  if (check?.verdict === "amt") throw new BoostError(`ยอดในสลิปไม่ตรง (ต้องโอน ฿${p.price.toLocaleString()})`);
  const slip_path = `boost/${a.mb_code}/${id}.${slip.type === "image/png" ? "png" : slip.type === "image/webp" ? "webp" : "jpg"}`;
  await putFile(slip_path, slip);
  const list = await listBoosts();
  let b: Boost = { id, parttime_id: a.id, mb: a.mb_code, plan: p.id, days: p.days, price_satang: amt, status: "pending", paid_via: "slip", starts_at: null, ends_at: null, created_at: new Date().toISOString(), slip_path, slip_check: check };
  if (check?.verdict === "ok") { await postSlipMoney(b); b = await activate(list, b); }
  await save([b, ...list]);
  return b;
}
const postSlipMoney = (b: Boost) => post("boost", { type: "boost", id: b.id }, `boost:${b.id}`, `โปรโมทโปรไฟล์ ${b.mb} (โอน QR)`, `parttime:${b.parttime_id}`, [
  { owner_type: "platform", owner_id: PLATFORM, bucket: "bank", amount: -b.price_satang },
  { owner_type: "platform", owner_id: PLATFORM, bucket: "revenue", amount: b.price_satang },
]);

/** แอดมินตรวจสลิปโปรโมทที่ระบบยืนยันเองไม่ได้ */
export async function decideBoost(id: string, approve: boolean, admin: string, note = ""): Promise<Boost> {
  const list = await listBoosts();
  const b = list.find((x) => x.id === id);
  if (!b || b.status !== "pending") throw new BoostError("รายการนี้ไม่ได้รอตรวจ");
  if (approve) { await postSlipMoney(b); await activate(list, b); }
  else b.status = "rejected";
  b.note = `${approve ? "อนุมัติ" : "ไม่อนุมัติ"} · ${admin}${note ? ` · ${note}` : ""}`.slice(0, 200);
  await save(list);
  return b;
}

// ─── โค้ดโปรโมทฟรี (บอสกำหนด 20 ต.ค. 2569) ───
// 30 วันแรกนับจากวันเปิดรับงาน (listed_at) ได้งานจบไม่ถึง 5 เคส → ระบบออกโค้ดโปรโมทฟรี 3 วันให้อัตโนมัติ (คนละครั้ง · free-boost.ts)
// แอดมินออกเองเพิ่มได้ (reason "admin") · โค้ดผูกกับ Part-Time คนนั้น ใช้แล้วเปิดโปรโมททันที (ต่อจากของเดิม) ไม่ลงเงิน
export const FREE_BOOST = { days: 3, windowDays: 30, minJobs: 5 } as const;
export interface BoostCode {
  code: string; parttime_id: string; mb: string; days: number;
  reason: "low_jobs_30d" | "admin"; status: "unused" | "used";
  issued_at: string; used_at?: string | null; boost_id?: string | null; by?: string | null; jobs?: number | null;
}
const CODES_PATH = "_config/boost-codes.json";
const gc = globalThis as unknown as { __mbBoostCodes?: BoostCode[] };
export async function listBoostCodes(): Promise<BoostCode[]> {
  if (isDemo) return gc.__mbBoostCodes ?? [];
  try {
    const { data, error } = await db().storage.from("applicants").download(CODES_PATH);
    if (error || !data) return [];
    return JSON.parse(await data.text()) as BoostCode[];
  } catch { return []; }
}
async function saveCodes(list: BoostCode[]) {
  if (isDemo) { gc.__mbBoostCodes = list; return; }
  const { error } = await db().storage.from("applicants").upload(CODES_PATH, new Blob([JSON.stringify(list)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
  if (error) throw error;
}
const newCode = () => "FREE" + Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[b % 31]).join("");

/** ออกโค้ด · reason low_jobs_30d ออกได้คนละครั้ง (ออกแล้ว → null) */
export async function issueBoostCode(a: Pick<Applicant, "id" | "mb_code">, reason: BoostCode["reason"], opts: { days?: number; by?: string; jobs?: number } = {}): Promise<BoostCode | null> {
  const list = await listBoostCodes();
  if (reason === "low_jobs_30d" && list.some((c) => c.parttime_id === a.id && c.reason === "low_jobs_30d")) return null;
  const c: BoostCode = { code: newCode(), parttime_id: a.id, mb: a.mb_code, days: opts.days ?? FREE_BOOST.days, reason, status: "unused", issued_at: new Date().toISOString(), by: opts.by ?? null, jobs: opts.jobs ?? null };
  await saveCodes([c, ...list]);
  return c;
}

/** Part-Time ใช้โค้ดของตัวเอง → โปรโมทฟรีตามจำนวนวัน (ต่อจากที่เหลือ) */
export async function redeemBoostCode(a: Applicant, code: string): Promise<Boost> {
  const codes = await listBoostCodes();
  const c = codes.find((x) => x.code === code.trim().toUpperCase() && x.parttime_id === a.id);
  if (!c) throw new BoostError("โค้ดไม่ถูกต้อง");
  if (c.status !== "unused") throw new BoostError("โค้ดนี้ใช้ไปแล้ว");
  const list = await listBoosts();
  const plan = (BOOST_PLANS.find((p) => p.days === c.days) ?? BOOST_PLANS[1]).id;
  const b = await activate(list, { id: crypto.randomUUID(), parttime_id: a.id, mb: a.mb_code, plan, days: c.days, price_satang: 0, status: "pending", paid_via: "code", starts_at: null, ends_at: null, created_at: new Date().toISOString(), note: `โค้ด ${c.code}` });
  await save([b, ...list]);
  c.status = "used"; c.used_at = new Date().toISOString(); c.boost_id = b.id;
  await saveCodes(codes);
  return b;
}
