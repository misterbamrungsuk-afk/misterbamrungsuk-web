import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PARTNER_PACKAGES, type PartnerPackageKey } from "./config";
import { PARTNER_STATUSES, QC_STATES, type PartnerQc, type PartnerStatus } from "./status";
import type { AccountStatus, ClipStatus } from "./portal-types";

export { PARTNER_STATUSES, QC_STATES, type PartnerQc, type PartnerStatus };
export { STATUS_LABEL } from "./status";

// ที่เก็บพาร์ทเนอร์ — Supabase ตาราง partners (supabase/partner/0001_partners.sql) หรือโหมดเดโมในหน่วยความจำ

export interface PartnerInput {
  business_name: string;
  type: string;
  province: string;
  contact_name: string;
  tel: string;
  email: string;
  line_id: string;
  links: string;
  package: PartnerPackageKey;
  message: string;
  consented_at: string;
  ip: string;
}
export interface Partner extends PartnerInput {
  id: string;
  status: PartnerStatus;
  qc: PartnerQc;
  starts_at: string | null;
  ends_at: string | null;
  amount: number;
  notes: string | null;
  created_at: string;
  /** คอลัมน์จาก migration 0002_portal */
  password_hash?: string | null;
  account_status?: AccountStatus;
  clip_status?: ClipStatus | null;
  clip_note?: string | null;
  platform_pct?: number | null;
}
export type PartnerPatch = Partial<Pick<Partner, "status" | "qc" | "package" | "starts_at" | "ends_at" | "amount" | "notes" | "password_hash" | "account_status" | "clip_status" | "clip_note" | "platform_pct">>;

export const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
let sb: SupabaseClient | null = null;
export const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));

const g = globalThis as unknown as { __mbPartnerDemo?: Partner[] };
export const demo: Partner[] = (g.__mbPartnerDemo ??= []);

/** วันสิ้นสุด = วันเริ่ม + จำนวนเดือนของแพ็กเกจ (YYYY-MM-DD) */
export function endDateFor(start: string, pkg: PartnerPackageKey): string {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + PARTNER_PACKAGES[pkg].months);
  return d.toISOString().slice(0, 10);
}

export async function createPartner(input: PartnerInput): Promise<Partner> {
  const row: Partner = { ...input, id: crypto.randomUUID(), status: "new", qc: "pending", starts_at: null, ends_at: null, amount: 0, notes: null, created_at: new Date().toISOString() };
  if (isDemo) {
    demo.push({ ...row, account_status: "pending" });
    return row;
  }
  const { data, error } = await db().from("partners").insert(row).select().single();
  if (error) throw error;
  return data as Partner;
}

/** ตัด password_hash ออกก่อนส่งให้ฝั่งแอดมิน */
export const stripSecret = <T extends Partner | null>(p: T): T => {
  if (!p) return p;
  const { password_hash, ...rest } = p;
  return { ...rest, has_login: !!password_hash } as unknown as T;
};

export async function listPartners(): Promise<Partner[]> {
  if (isDemo) return [...demo].reverse().map(stripSecret);
  const { data, error } = await db().from("partners").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Partner[]).map(stripSecret);
}

export async function updatePartner(id: string, patch: PartnerPatch): Promise<Partner | null> {
  if (isDemo) {
    const r = demo.find((x) => x.id === id);
    if (r) Object.assign(r, patch);
    return stripSecret(r ?? null);
  }
  const { data, error } = await db().from("partners").update(patch).eq("id", id).select().maybeSingle();
  if (error) throw error;
  return stripSecret((data as Partner) ?? null);
}

export async function getPartner(id: string): Promise<Partner | null> {
  if (isDemo) return demo.find((x) => x.id === id) ?? null;
  const { data, error } = await db().from("partners").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Partner) ?? null;
}

/** พาร์ทเนอร์ที่ตั้งรหัสผ่านแล้วด้วยอีเมลนี้ */
export async function findPartnerLogin(email: string): Promise<Partner | null> {
  if (isDemo) return demo.find((x) => x.email === email && x.password_hash) ?? null;
  const { data, error } = await db().from("partners").select("*").eq("email", email).not("password_hash", "is", null).limit(1);
  if (error) throw error;
  return (data as Partner[])[0] ?? null;
}
