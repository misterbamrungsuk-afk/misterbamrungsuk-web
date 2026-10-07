import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PackageKey } from "./config";

// ที่เก็บข้อมูลผู้สมัคร
// - มี SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → Supabase (ตาราง applicants + bucket private "applicants")
// - ไม่มี → โหมดเดโม เก็บในหน่วยความจำ (หายเมื่อรีสตาร์ท)

export type CriminalCheck = "pending" | "passed" | "failed";
export type ApplicantStatus = "pending_slip" | "verified" | "rejected" | "refunded";

/** ไฟล์ที่ผู้สมัครแนบ (other_doc ไม่บังคับ) */
export const DOC_KINDS = ["photo", "id_card", "bankbook", "other_doc", "cert_doc", "slip"] as const;
export type DocKind = (typeof DOC_KINDS)[number];
export const DOC_LABEL: Record<DocKind, string> = {
  photo: "รูปถ่าย", id_card: "บัตรประชาชน", bankbook: "สมุดบัญชี", other_doc: "เอกสารอื่นๆ", cert_doc: "ใบรับรองการนวด", slip: "สลิป",
};

export interface ApplicantInput {
  title: string;
  first_name: string;
  last_name: string;
  nickname: string;
  birthdate: string | null;
  weight: number;
  height: number;
  nationality: string;
  ethnicity: string;
  religion: string;
  education: string;
  marital: string;
  start_date: string | null;
  tel: string;
  line_id: string;
  email: string;
  address: string;
  zipcode: string;
  bank: string;
  bank_account: string;
  bank_account_name: string;
  experience: string;
  skills: string[];
  intro: string;
  /** บันทึกความยินยอม (ม.19): เวอร์ชันเอกสาร + เวลา */
  consent_version: string;
  consented_at: string;
  consent_marketing: boolean;
  /** ยินยอมตรวจประวัติอาชญากรรม (คอลัมน์จาก migration 0002 — ถ้ายังไม่รัน ดูจาก consent_version ที่ลงท้าย "/criminal") */
  consent_criminal?: boolean;
  /** ข้อมูล Part-Time (migration 0003) — ถ้ายังไม่รัน 0003 จะอ่านจาก extra ใน docs แทน */
  activities?: string[];
  massage_cert?: boolean | null;
  availability?: Availability;
  ack_hours?: boolean;
  ack_no_refuse?: boolean;
  /** ความสามารถพิเศษ (migration join/0005 — ถ้ายังไม่รัน อ่านจาก docs.extra) */
  talents?: string[];
  /** เวลาที่ยืนยันเบอร์ tel ด้วย OTP (migration join/0004 — ถ้ายังไม่รัน อ่านจาก docs.extra) */
  phone_verified_at?: string | null;
  package: PackageKey;
  amount: number;
  payment_method: "qr" | "transfer";
  ip: string;
}

export interface Applicant extends ApplicantInput {
  id: string;
  mb_code: string;
  status: ApplicantStatus;
  /** path ของไฟล์แต่ละชนิดใน storage */
  docs: Partial<Record<DocKind, string>> & { extra?: Extra };
  contract_accepted_at: string | null;
  sheet_synced: boolean;
  /** ผลตรวจประวัติอาชญากรรม (migration 0002; ไม่มีคอลัมน์ = ถือว่า pending) */
  criminal_check?: CriminalCheck;
  /** รุ่นอบรม + เข้ากลุ่ม LINE (migration 0003) */
  cohort?: string | null;
  line_joined?: boolean;
  created_at: string;
}

export interface Availability { slots: string[]; days: number | null; hours: number | null }

/** ข้อมูลเสริมที่แพ็กไว้ใน docs.extra ด้วย (ทนได้ถ้ายังไม่รัน migration 0003) */
export type Extra = Pick<Applicant, "activities" | "massage_cert" | "availability" | "ack_hours" | "ack_no_refuse" | "cohort" | "line_joined" | "phone_verified_at" | "talents">;

/** รวมคอลัมน์ 0003 กับ docs.extra — คอลัมน์จริงมาก่อน */
export function extraOf(a: Applicant): Extra {
  const x = ((a.docs as Record<string, unknown>)?.extra ?? {}) as Extra;
  return {
    activities: a.activities?.length ? a.activities : x.activities ?? [],
    massage_cert: a.massage_cert ?? x.massage_cert ?? null,
    availability: a.availability ?? x.availability,
    ack_hours: a.ack_hours ?? x.ack_hours ?? false,
    ack_no_refuse: a.ack_no_refuse ?? x.ack_no_refuse ?? false,
    cohort: a.cohort ?? x.cohort ?? null,
    line_joined: a.line_joined ?? x.line_joined ?? false,
    phone_verified_at: a.phone_verified_at ?? x.phone_verified_at ?? null,
    talents: a.talents?.length ? a.talents : x.talents ?? [],
  };
}

export const fullName = (a: Pick<Applicant, "title" | "first_name" | "last_name">) => `${a.title}${a.first_name} ${a.last_name}`;

export const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;

let sb: SupabaseClient | null = null;
function db() {
  if (!sb) sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  return sb;
}

// ── โหมดเดโม ──
type DemoFile = { type: string; data: Buffer };
type DemoStore = { rows: Applicant[]; files: Map<string, DemoFile> };
const g = globalThis as unknown as { __mbJoinDemo?: DemoStore };
const demo: DemoStore = (g.__mbJoinDemo ??= { rows: [], files: new Map() });

/** MB-YYMMNNN: ปี ค.ศ. 2 หลัก + เดือน + ลำดับในเดือนนั้น (เวลาไทย) */
function mbPrefix(d = new Date()) {
  const th = new Date(d.getTime() + 7 * 3600_000);
  return `MB-${String(th.getUTCFullYear()).slice(2)}${String(th.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** จำนวนที่นับเข้าโควตา (ไม่นับที่ถูกปฏิเสธหรือคืนเงินแล้ว) */
export async function countActive(): Promise<number> {
  if (isDemo) return demo.rows.filter((r) => r.status === "pending_slip" || r.status === "verified").length;
  const { count, error } = await db().from("applicants").select("id", { count: "exact", head: true }).in("status", ["pending_slip", "verified"]);
  if (error) throw error;
  return count ?? 0;
}

const extOf = (f: File) => (f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg");

async function putFile(path: string, file: File) {
  const data = Buffer.from(await file.arrayBuffer());
  if (isDemo) return void demo.files.set(path, { type: file.type, data });
  const { error } = await db().storage.from("applicants").upload(path, data, { contentType: file.type, upsert: false });
  if (error) throw error;
}

export async function createApplicant(input: ApplicantInput, files: Partial<Record<DocKind, File>>): Promise<Applicant> {
  const id = crypto.randomUUID();
  const docs: Applicant["docs"] = {};
  for (const k of DOC_KINDS) {
    const f = files[k];
    if (!f) continue;
    docs[k] = `${id}/${k}.${extOf(f)}`;
    await putFile(docs[k]!, f);
  }

  // แพ็กข้อมูล Part-Time ไว้ใน docs.extra ด้วย → ไม่หายแม้ยังไม่รัน migration 0003 (RPC เดิมไม่รู้จักคีย์ใหม่ใน p ก็ไม่ error)
  docs.extra = { activities: input.activities ?? [], massage_cert: input.massage_cert ?? null, availability: input.availability, ack_hours: input.ack_hours ?? false, ack_no_refuse: input.ack_no_refuse ?? false, phone_verified_at: input.phone_verified_at ?? null, talents: input.talents ?? [] };

  if (isDemo) {
    const prefix = mbPrefix();
    const seq = demo.rows.filter((r) => r.mb_code.startsWith(prefix)).length + 1;
    const row: Applicant = {
      ...input, id, docs, mb_code: `${prefix}${String(seq).padStart(3, "0")}`,
      status: "pending_slip", criminal_check: "pending", contract_accepted_at: null, sheet_synced: false, created_at: new Date().toISOString(),
    };
    demo.rows.push(row);
    return row;
  }
  // รหัส MB ออกใน DB แบบ atomic (ฟังก์ชัน create_applicant ใน migration)
  const { data, error } = await db().rpc("create_applicant", { p: { ...input, id, docs } });
  if (error) throw error;
  return data as Applicant;
}

export async function getByMb(mb: string): Promise<Applicant | null> {
  if (isDemo) return demo.rows.find((r) => r.mb_code === mb) ?? null;
  const { data } = await db().from("applicants").select("*").eq("mb_code", mb).maybeSingle();
  return (data as Applicant) ?? null;
}

export async function listApplicants(status?: ApplicantStatus): Promise<Applicant[]> {
  if (isDemo) return [...demo.rows].filter((r) => !status || r.status === status).reverse();
  let q = db().from("applicants").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data as Applicant[];
}

export async function updateApplicant(id: string, patch: Partial<Pick<Applicant, "status" | "contract_accepted_at" | "sheet_synced">>) {
  if (isDemo) {
    const r = demo.rows.find((x) => x.id === id);
    if (r) Object.assign(r, patch);
    return r ?? null;
  }
  const { data, error } = await db().from("applicants").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Applicant;
}

/** ไฟล์เอกสาร/สลิป สำหรับแอดมินเท่านั้น */
export async function readFile(path: string): Promise<{ type: string; data: Buffer } | null> {
  if (isDemo) return demo.files.get(path) ?? null;
  const { data, error } = await db().storage.from("applicants").download(path);
  if (error || !data) return null;
  return { type: data.type, data: Buffer.from(await data.arrayBuffer()) };
}

/** จัดรุ่นอบรม / สถานะเข้ากลุ่ม LINE — เขียนคอลัมน์ 0003 ถ้ามี; ไม่มีก็เก็บใน docs.extra */
export async function updateExtra(id: string, patch: Pick<Extra, "cohort" | "line_joined">): Promise<Applicant | null> {
  if (isDemo) {
    const r = demo.rows.find((x) => x.id === id);
    if (!r) return null;
    Object.assign(r, patch);
    r.docs = { ...r.docs, extra: { ...r.docs.extra, ...patch } };
    return r;
  }
  const { data: cur, error: e1 } = await db().from("applicants").select("docs").eq("id", id).single();
  if (e1) throw e1;
  const docs = { ...(cur?.docs ?? {}), extra: { ...(cur?.docs?.extra ?? {}), ...patch } };
  const withCols = await db().from("applicants").update({ ...patch, docs }).eq("id", id).select().single();
  if (!withCols.error) return withCols.data as Applicant;
  // คอลัมน์ cohort/line_joined ยังไม่มี (ยังไม่รัน 0003) → เขียนเฉพาะ docs
  const { data, error } = await db().from("applicants").update({ docs }).eq("id", id).select().single();
  if (error) throw error;
  return data as Applicant;
}
