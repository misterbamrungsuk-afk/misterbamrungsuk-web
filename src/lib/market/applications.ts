import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { EXT_OF, verifiedType } from "@/lib/file-guard";
import type { ApplyDocKind, BusinessType, Vendor, VendorAccount, VendorApplication } from "./config";
import { NEED_0005, findAccountByEmail, inviteAccount, marketDemo, upsertVendor } from "./store";

// ใบสมัครเปิดร้าน (/market/sell) → คิวแอดมิน /admin/market แท็บ "ใบสมัครร้าน"
// - ตาราง market_vendor_applications (supabase/market/0005_shops_wallet.sql) · ไฟล์เอกสารใน bucket "market" โฟลเดอร์ apply/ (ดูได้เฉพาะแอดมิน)
// - ยังไม่รันไฟล์ 0005 = รับใบสมัครไม่ได้ (แจ้งให้รัน) แต่ไม่สลับทั้ง Marketplace เป็นโหมดหน่วยความจำ
// - โหมดสาธิต (ไม่มี SUPABASE env) = เก็บในหน่วยความจำ

const T = "market_vendor_applications";
let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));
const g = globalThis as unknown as { __mbVendorApply?: { rows: VendorApplication[]; files: Map<string, { type: string; data: Buffer }> } };
type Mem = { rows: VendorApplication[]; files: Map<string, { type: string; data: Buffer }> };
const mem: Mem = (g.__mbVendorApply ??= { rows: [], files: new Map() } as Mem);
const now = () => new Date().toISOString();
const tableMissing = (e: { code?: string; message?: string } | null) => !!e && (e.code === "PGRST205" || e.code === "42P01" || e.code === "PGRST204" || e.code === "42703" || /could not find the table|does not exist|could not find the '.*' column/i.test(e.message ?? ""));

export class ApplyError extends Error { constructor(msg: string, public status = 400) { super(msg); } }
export const APPLY_DOC_RE = /^apply\/\d+-\d+\.(jpg|png|webp|pdf)$/;
const MAX_DOC = 8 * 1024 * 1024;

/** เก็บเอกสาร (รูป/PDF จริงตาม magic bytes) — FileTypeError เมื่อไม่ใช่ชนิดที่รับ */
export async function saveApplyDoc(file: File): Promise<{ path: string; type: string }> {
  if (file.size > MAX_DOC) throw new ApplyError("ไฟล์เอกสารต้องไม่เกิน 8MB");
  const data = Buffer.from(await file.arrayBuffer());
  const type = verifiedType(data, ["image/jpeg", "image/png", "image/webp", "application/pdf"]);
  const path = `apply/${Date.now()}-${randomInt(1e6)}.${EXT_OF[type]}`;
  if (marketDemo()) { mem.files.set(path, { type, data }); return { path, type }; }
  const { error } = await db().storage.from("market").upload(path, data, { contentType: type, upsert: false });
  if (error) throw new Error(error.message);
  return { path, type };
}
export async function readApplyDoc(path: string): Promise<{ type: string; data: Buffer } | null> {
  if (!APPLY_DOC_RE.test(path)) return null;
  const local = mem.files.get(path);
  if (local || marketDemo()) return local ?? null;
  const { data, error } = await db().storage.from("market").download(path);
  if (error || !data) return null;
  return { type: data.type, data: Buffer.from(await data.arrayBuffer()) };
}

export async function listApplications(): Promise<VendorApplication[]> {
  if (marketDemo()) return [...mem.rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const { data, error } = await db().from(T).select("*").order("created_at", { ascending: false }).limit(500);
  if (tableMissing(error)) { console.warn("[market] market_vendor_applications missing — run supabase/market/0005"); return []; }
  if (error) throw new Error(error.message);
  return (data ?? []) as VendorApplication[];
}
export const getApplication = async (id: string) => (await listApplications()).find((a) => a.id === id) ?? null;

async function patchApp(id: string, patch: Partial<VendorApplication>, from: VendorApplication["status"]): Promise<VendorApplication | null> {
  if (marketDemo()) {
    const r = mem.rows.find((x) => x.id === id);
    if (!r || r.status !== from) return null;
    return Object.assign(r, patch);
  }
  const { data, error } = await db().from(T).update(patch).eq("id", id).eq("status", from).select().maybeSingle();
  if (tableMissing(error)) throw new ApplyError(NEED_0005, 503);
  if (error) throw new Error(error.message);
  return (data as VendorApplication) ?? null;
}

export type ApplyInput = {
  shop_name: string; owner_name: string; phone: string; email: string; line_id: string;
  business_type: BusinessType; description: string; category: string; ip: string;
  docs: { kind: ApplyDocKind; path: string; type: string }[];
};

/** อีเมลนี้สมัคร/เป็นร้านอยู่แล้วหรือยัง (ใบที่ถูกปฏิเสธไม่นับ — สมัครใหม่ได้) */
export async function applyEmailTaken(email: string): Promise<"account" | "application" | null> {
  const e = email.trim().toLowerCase();
  if (await findAccountByEmail(e)) return "account";
  return (await listApplications()).some((a) => a.email === e && a.status !== "rejected") ? "application" : null;
}

export async function createApplication(input: ApplyInput): Promise<VendorApplication> {
  if (await applyEmailTaken(input.email)) throw new ApplyError("อีเมลนี้สมัครเปิดร้านไว้แล้ว", 409);
  const row: VendorApplication = {
    id: randomUUID(), ...input, email: input.email.trim().toLowerCase(),
    status: "pending", reject_reason: null, vendor_id: null, reviewed_by: null, reviewed_at: null, created_at: now(),
  };
  if (marketDemo()) { mem.rows.push(row); return row; }
  const { data, error } = await db().from(T).insert(row as never).select().single();
  if (error?.code === "23505") throw new ApplyError("อีเมลนี้สมัครเปิดร้านไว้แล้ว", 409); // unique index ใบที่ยังไม่ถูกปฏิเสธ
  if (tableMissing(error)) throw new ApplyError(NEED_0005, 503);
  if (error) throw new Error(error.message);
  return data as VendorApplication;
}

/** อนุมัติ → สร้างร้าน (GP ตามที่แอดมินใส่ / ว่าง = รอกำหนด) + บัญชีร้านจากอีเมลผู้สมัคร → คืนบัญชีไว้สร้างลิงก์เชิญ */
export async function approveApplication(id: string, admin: string, gp_pct: number | null): Promise<{ app: VendorApplication; vendor: Vendor; account: VendorAccount }> {
  const a = await getApplication(id);
  if (!a) throw new ApplyError("ไม่พบใบสมัคร", 404);
  if (a.status !== "pending") throw new ApplyError("ใบสมัครนี้ตรวจแล้ว", 409);
  if (await findAccountByEmail(a.email)) throw new ApplyError("อีเมลนี้มีบัญชีร้านค้าแล้ว", 409);
  // จองสถานะก่อน (กันกดอนุมัติพร้อมกัน 2 ครั้งแล้วได้ร้านซ้ำ)
  const locked = await patchApp(id, { status: "approved", reviewed_by: admin, reviewed_at: now() }, "pending");
  if (!locked) throw new ApplyError("ใบสมัครนี้ตรวจแล้ว", 409);
  try {
    const contact = [a.owner_name, a.phone, a.line_id && `LINE ${a.line_id}`, a.email].filter(Boolean).join(" · ").slice(0, 300);
    let vendor: Vendor;
    try { vendor = await upsertVendor({ name: a.shop_name, contact, gp_pct, description: a.description }); }
    catch (e) {
      if (!/slug/.test((e as Error).message)) throw e;
      vendor = await upsertVendor({ name: a.shop_name, contact, gp_pct, description: a.description, slug: `${a.shop_name}-${randomInt(1e4)}` });
    }
    const account = await inviteAccount(vendor.id, a.email);
    const app = (await patchApp(id, { vendor_id: vendor.id }, "approved")) ?? { ...locked, vendor_id: vendor.id };
    return { app, vendor, account };
  } catch (e) {
    // สร้างร้านไม่สำเร็จ → คืนสถานะรอตรวจ ให้แอดมินลองใหม่
    await patchApp(id, { status: "pending", reviewed_by: null, reviewed_at: null }, "approved").catch(() => {});
    throw e;
  }
}

export async function rejectApplication(id: string, admin: string, reason: string): Promise<VendorApplication> {
  const r = reason.trim().slice(0, 300);
  if (!r) throw new ApplyError("ระบุเหตุผลที่ไม่อนุมัติ");
  const out = await patchApp(id, { status: "rejected", reject_reason: r, reviewed_by: admin, reviewed_at: now() }, "pending");
  if (!out) throw new ApplyError("ใบสมัครนี้ตรวจแล้ว", 409);
  return out;
}
