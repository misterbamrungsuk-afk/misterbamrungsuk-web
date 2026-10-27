import "server-only";
import { createClient } from "@supabase/supabase-js";
import { PLATFORM, post } from "@/lib/wallet";
import { notify } from "@/lib/bookings";
import { completedBetween } from "@/lib/bookings/day";
import { extraOf, listApplicants } from "@/lib/join/store";
import { findRep, type SalesRep } from "./store";

// โบนัส Recruit ตามผลงานรายเดือน (โปสเตอร์ Recruiter Program · 27 ต.ค. 2569)
// นับต่อ Part-Time 1 คนที่ Recruit แนะนำ: งานจบ (completed) ในเดือนนั้น ครบ 15 งาน = ฿1,000 · ครบ 20 งาน = ฿2,000 (แทน ไม่บวกกัน)
// ระบบคำนวณเดือนที่แล้วทุกวัน (cron · ไม่ซ้ำ) → รอ CEO อนุมัติที่หน้า CEO · อนุมัติแล้วจ่ายจาก platform.marketing เข้ากระเป๋า Recruit
// เก็บใน Storage _config/recruit-monthly-bonus.json (แบบเดียวกับ sales-logins)
export const MONTHLY_TIERS = [{ jobs: 20, satang: 200_000 }, { jobs: 15, satang: 100_000 }] as const;
export const bonusFor = (jobs: number) => MONTHLY_TIERS.find((t) => jobs >= t.jobs)?.satang ?? 0;

export type MonthlyBonus = {
  id: string; rep_id: string; parttime_id: string; mb: string; nick: string; month: string; jobs: number; amount_satang: number;
  status: "pending" | "approved" | "rejected"; created_at: string; decided_at?: string; decided_by?: string; note?: string;
};

const PATH = "_config/recruit-monthly-bonus.json";
const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const g = globalThis as unknown as { __mbRecruitBonus?: MonthlyBonus[] };
const db = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
async function load(): Promise<MonthlyBonus[]> {
  if (isDemo) return g.__mbRecruitBonus ?? [];
  try { const { data, error } = await db().storage.from("applicants").download(PATH); if (error || !data) return []; return JSON.parse(await data.text()) as MonthlyBonus[]; } catch { return []; }
}
async function save(list: MonthlyBonus[]) {
  if (isDemo) { g.__mbRecruitBonus = list; return; }
  const { error } = await db().storage.from("applicants").upload(PATH, new Blob([JSON.stringify(list)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
  if (error) throw error;
}

/** เดือนตามเวลาไทย "YYYY-MM" */
export const monthTH = (t = Date.now()) => new Date(t + 7 * 3600_000).toISOString().slice(0, 7);
export const prevMonthTH = (t = Date.now()) => { const [y, m] = monthTH(t).split("-").map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; };
export function monthRange(month: string): [Date, Date] {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return [new Date(`${month}-01T00:00:00+07:00`), new Date(`${next}-01T00:00:00+07:00`)];
}

/** สร้างรายการโบนัสรออนุมัติของเดือนนั้น (ค่าเริ่มต้น = เดือนที่แล้ว) · ไม่สร้างซ้ำ · คืนจำนวนรายการใหม่ */
export async function computeMonthlyBonuses(month = prevMonthTH()): Promise<number> {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("bad month");
  const [from, to] = monthRange(month);
  const list = await load();
  const have = new Set(list.map((b) => b.id));
  const apps = (await listApplicants()).filter((a) => a.status === "verified" && extraOf(a).sales_ref);
  const fresh: MonthlyBonus[] = [];
  for (const a of apps) {
    const id = `${a.id}:${month}`;
    if (have.has(id)) continue;
    const jobs = await completedBetween(a.id, from, to).catch(() => 0);
    const amount = bonusFor(jobs);
    if (!amount) continue;
    fresh.push({ id, rep_id: extraOf(a).sales_ref!.rep_id, parttime_id: a.id, mb: a.mb_code, nick: a.nickname || a.first_name, month, jobs, amount_satang: amount, status: "pending", created_at: new Date().toISOString() });
  }
  if (fresh.length) await save([...fresh, ...(await load())]);
  return fresh.length;
}

export async function listMonthlyBonuses(f: { status?: MonthlyBonus["status"]; rep_id?: string } = {}): Promise<MonthlyBonus[]> {
  return (await load()).filter((b) => (!f.status || b.status === f.status) && (!f.rep_id || b.rep_id === f.rep_id));
}

/** CEO อนุมัติ (จ่ายเข้ากระเป๋า Recruit · idem ต่อรายการ) / ไม่อนุมัติ (ต้องมีเหตุผล) */
export async function decideMonthlyBonus(id: string, approve: boolean, by: string, note = ""): Promise<MonthlyBonus> {
  const list = await load();
  const b = list.find((x) => x.id === id);
  if (!b) throw new Error("ไม่พบรายการ");
  if (b.status !== "pending") throw new Error("รายการนี้ตัดสินแล้ว");
  if (!approve && !note.trim()) throw new Error("ใส่เหตุผลที่ไม่อนุมัติ");
  if (approve) {
    const rep = await findRep({ id: b.rep_id });
    if (!rep) throw new Error("ไม่พบ Recruit");
    const o = ownerOf(rep);
    await post("commission", { type: "recruit_mbonus", id: b.id }, `recruit-mbonus:${b.id}`, `โบนัส Recruit · ${b.nick} (${b.mb}) ${b.jobs} งาน เดือน ${b.month}`, by, [
      { owner_type: "platform", owner_id: PLATFORM, bucket: "marketing", amount: -b.amount_satang },
      { owner_type: o.type, owner_id: o.id, bucket: "available", amount: b.amount_satang },
    ]);
    if (o.type === "parttime") await notify({ user_type: "parttime", user_id: o.id, kind: "commission", title: `ได้โบนัส Recruit ฿${(b.amount_satang / 100).toLocaleString("th-TH")}`, body: `${b.nick} ทำครบ ${b.jobs} งาน เดือน ${b.month}`, url: "" }).catch(() => {});
  }
  const done: MonthlyBonus = { ...b, status: approve ? "approved" : "rejected", decided_at: new Date().toISOString(), decided_by: by, ...(note.trim() ? { note: note.trim().slice(0, 200) } : {}) };
  await save((await load()).map((x) => (x.id === id ? done : x)));
  return done;
}

/** จำนวนงานจบเดือนนี้ของ Part-Time แต่ละคนที่ Recruit แนะนำ (แสดงความคืบหน้าโบนัส) */
export async function monthJobsOf(parttime_id: string): Promise<number> {
  const [from, to] = monthRange(monthTH());
  return completedBetween(parttime_id, from, to).catch(() => 0);
}

const ownerOf = (r: SalesRep) => (r.kind === "parttime" ? { type: "parttime" as const, id: r.parttime_id! } : { type: "sales" as const, id: r.id });
