import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifiedType } from "@/lib/file-guard";
import type { PackageKey, PtTier } from "./config";
import type { SlipCheck } from "@/lib/slip2go";

// ที่เก็บข้อมูลผู้สมัคร
// - มี SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → Supabase (ตาราง applicants + bucket private "applicants")
// - ไม่มี → โหมดเดโม เก็บในหน่วยความจำ (หายเมื่อรีสตาร์ท)

export type CriminalCheck = "pending" | "passed" | "failed";
export type ApplicantStatus = "pending_slip" | "verified" | "rejected" | "refunded";

/** ไฟล์ที่ผู้สมัครแนบ (other_doc ไม่บังคับ) */
export const DOC_KINDS = ["photo", "id_card", "bankbook", "other_doc", "cert_doc", "slip", "selfie", "id_copy"] as const;
export type DocKind = (typeof DOC_KINDS)[number];
export const DOC_LABEL: Record<DocKind, string> = {
  photo: "รูปถ่าย", id_card: "บัตรประชาชน", bankbook: "สมุดบัญชี", other_doc: "รูปเต็มตัว", cert_doc: "ใบรับรองการนวด", slip: "สลิป", selfie: "เซลฟีถือบัตร", id_copy: "สำเนาบัตรเซ็นรับรอง",
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
  /** ข้อความเมื่อเลือก "อื่น ๆ" (เก็บใน docs.extra) */
  talents_other?: string;
  activities_other?: string;
  /** เวลาที่ยืนยันเบอร์ tel ด้วย OTP (migration join/0004 — ถ้ายังไม่รัน อ่านจาก docs.extra) */
  phone_verified_at?: string | null;
  /** พื้นที่ที่สะดวก / ไม่สะดวกรับงาน (บอร์ด JoinForm · เก็บใน docs.extra) */
  areas?: string[];
  no_area?: string;
  /** ผลตรวจสลิปจาก Slip2Go (เก็บใน docs.extra) */
  slip_check?: SlipCheck | null;
  /** รหัสลิงก์เชิญ (ป้าย · เก็บใน docs.extra) */
  invite?: string | null;
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
  /** KYC (migration join/0006 — ถ้ายังไม่รัน อ่านจาก docs.extra) */
  kyc_status?: KycStatus;
  kyc_reason?: KycReason | null;
  kyc_submitted_at?: string | null;
  bank_book_path?: string | null;
  created_at: string;
}

export type KycStatus = "none" | "submitted" | "approved" | "rejected";
/** เหตุผลรายรายการที่ไม่ผ่าน เช่น { selfie: "รูปมืดเกินไป…" } */
export type KycReason = Partial<Record<string, string>>;

/** slots = ช่วงเวลา (กลางวัน/กลางคืน) · days = จำนวนวัน/สัปดาห์ · hours = ชม./วัน (ค่าสูงสุดของช่วง) · week_days/hours_band = ตามที่ผู้สมัครเลือกจริง (บอร์ด JoinForm2) */
export interface Availability { slots: string[]; days: number | null; hours: number | null; week_days?: string[]; hours_band?: string }

/** ข้อมูลเสริมที่แพ็กไว้ใน docs.extra ด้วย (ทนได้ถ้ายังไม่รัน migration 0003) */
/** การ์ดโปรไฟล์ที่ผู้สมัครแก้เองในหน้า "โปรไฟล์ของฉัน" (บอร์ด ProviderEditProfile) */
export interface ProfileCard { activities: string[]; places: string[]; partner_spas: string[]; skills: string[] }

/** ตั้งค่า Part-Time (บอร์ด ProviderSettings) · ประกาศ "วันนี้ว่าง" (บอร์ด ProviderJobboard) */
export interface PtSettings { auto_reply_on: boolean; auto_reply: string; quick_replies: string[] }
/** โพสต์โปรไฟล์ (บอร์ด P-Posts) — บัญชีละ 1 โพสต์ · รูปใช้รูปโปรไฟล์ 6 รูปแรก · กิจกรรม/สถานที่ใช้จากการ์ดโปรไฟล์ */
/** เวลาทำงานรายวัน (บอร์ด P-Availability) — วัน จ..อา · เวลา HH:MM · รัศมีรับงาน · พักงานชั่วคราว */
export interface PtWork { days: Record<string, { on: boolean; from: string; to: string }>; radius_km: number; paused: boolean; updated_at: string }
export interface PtListing { title: string; rules: string; hidden: boolean; updated_at: string }
export interface PtPost { text: string; time: string; zone: string; open: boolean; created_at: string }

export type Extra = Pick<Applicant, "activities" | "massage_cert" | "availability" | "ack_hours" | "ack_no_refuse" | "cohort" | "line_joined" | "phone_verified_at" | "talents" | "talents_other" | "activities_other" | "areas" | "no_area" | "slip_check" | "invite" | "kyc_status" | "kyc_reason" | "kyc_submitted_at" | "bank_book_path"> & { attendance?: Record<string, boolean>; /** เวลาเช็กชื่อรายรอบ (โหมดสาธิต / ฐานที่ยังไม่มีตาราง cohort_attendance) */ attendance_at?: Record<string, string>; photos?: string[]; card?: ProfileCard | null; form_done?: number[]; tier?: PtTier; /** ราคา 3 ชม. ของระดับ Secret (บาท · แอดมินตั้ง) */ secret_price?: number | null; pt_settings?: PtSettings | null; post?: PtPost | null; listing?: PtListing | null; work?: PtWork | null; listed?: boolean; delete_requested_at?: string | null; bank_consents?: { terms: boolean; pdpa: boolean; profile: boolean; at: string } | null; /** ตำแหน่งรูปในกรอบ (object-position "x% y%") ต่อ path รูป */ photo_pos?: Record<string, string> | null; /** ย่านที่ Part-Time ตั้งเองให้แสดงบนแผนที่ (ปัดเป็นช่อง ~1 กม. แล้ว ไม่ใช่ตำแหน่งจริง) */ geo?: PtGeo | null; /** แอดมินที่ออกลิงก์เข้าโปรไฟล์ล่าสุด (คนนี้อนุมัติ KYC ผู้สมัครคนนี้ไม่ได้) */ link_by?: { email: string; at: string } | null; /** โทเคนเข้าโปรไฟล์ที่ออกก่อนเวลานี้ใช้ไม่ได้ (ออกจากระบบทุกเครื่อง / แอดมินยกเลิกลิงก์) */ tokens_after?: string | null; /** เปลี่ยนบัญชีรับเงินหลังอนุมัติแล้ว — รอแอดมินตรวจบัญชีใหม่ (ถอนเงินไม่ได้จนตรวจ) · prev = บัญชีเดิม */ bank_review?: { at: string; prev: { bank: string; bank_account: string; bank_account_name: string; bank_book_path: string | null } } | null; /** เวลาที่แก้รายการที่ทีมงานตีกลับครบทุกรายการล่าสุด (หน้า /join/rejected แยก "ส่งแก้ไขครบแล้ว" กับ "ไม่มีรายการต้องแก้") */ fixes_done_at?: string | null; /** แอดมินทุกคนที่เคยออกลิงก์ให้ผู้สมัครคนนี้ (กันอนุมัติ KYC เอง) */ link_by_all?: { email: string; at: string }[] | null; /** เหตุผลล่าสุดที่ไม่อนุมัติสลิปค่าสมัคร */ slip_reject?: { reason: string; by: string; at: string } | null; /** รหัสผ่าน Part-Time (scrypt "salt:hash") — อ่านผ่าน getPwHash เท่านั้น ไม่ส่งออกจาก store */ pw_hash?: string | null; /** เวลาตั้งรหัสผ่านล่าสุด */ pw_at?: string | null; /** เลขใบแจ้งหนี้ (ออกตอนสมัคร) */ inv_no?: string | null; /** เลขใบเสร็จรับเงิน (ออกเมื่ออนุมัติสลิป) */ ri_no?: string | null; ri_at?: string | null; /** วันที่เปิดรับงาน (listed ครั้งแรก) — นับ 30 วันโค้ดโปรโมทฟรี */ listed_at?: string | null; /** หมวด: "tom" = ทอมหล่อ · ไม่มี = หนุ่มหล่อ (บอสสั่ง 21 ต.ค. 2569 · ที่นั่งอบรมแยกโควตา) */ group?: "tom" | null; /** ทอมหล่อที่แปลงเพศแล้ว (ติ๊กในใบสมัคร) · ไม่ติ๊ก = ทอม */ trans?: boolean | null; /** Recruit ที่ชวนมา (ลิงก์ /join/s/โค้ด) */ sales_ref?: { rep_id: string; code: string } | null; /** ค่าตอบแทน Recruit ที่จ่ายแล้ว (สตางค์) + เวลา */ recruit_satang?: number | null; recruit_at?: string | null; /** ค่าสมัครที่หักจากงานแล้ว (สมัครฟรี · สตางค์ · เพดาน ฿10,000) */ fee_paid_satang?: number | null; /** เปิดเผยใบหน้า: yes = แสดงปกติ · no = เบลอหน้าในรูปสาธารณะ · null = ยังไม่เลือก (ถือว่าเปิดเผย) */ disclose?: "yes" | "no" | null; /** รับทราบว่าเบลอหน้ามีผลต่อจำนวนงาน */ blur_ack?: boolean | null; /** จุดเบลอต่อรูป (path → วงกลม %) */ face_blur?: Record<string, { x: number; y: number; r: number }> | null; /** Non Active (ลาออก/พักงาน · แอดมินตั้ง) — รหัสไม่ถูกนำกลับมาใช้ · ซ่อนจากหน้าแรก รับงานไม่ได้ */ inactive?: { reason: string; at: string; by: string; set_at: string } | null; /** ประวัติ Active / Non Active */ active_log?: { active: boolean; reason: string; at: string; by: string; set_at: string }[] | null };
export type PtGeo = { lat: number; lng: number; label: string; src: "gps" | "pin"; at: string };

/** รวมคอลัมน์ 0003 กับ docs.extra — คอลัมน์จริงมาก่อน */
export function extraOf(a: Applicant): Extra {
  const x = ((a.docs as Record<string, unknown>)?.extra ?? {}) as Extra;
  return {
    activities: a.activities?.length ? a.activities : x.activities ?? [],
    massage_cert: a.massage_cert ?? x.massage_cert ?? null,
    availability: a.availability ?? x.availability,
    ack_hours: !!(a.ack_hours || x.ack_hours),
    ack_no_refuse: !!(a.ack_no_refuse || x.ack_no_refuse),
    cohort: a.cohort ?? x.cohort ?? null,
    line_joined: a.line_joined ?? x.line_joined ?? false,
    phone_verified_at: a.phone_verified_at ?? x.phone_verified_at ?? null,
    talents: a.talents?.length ? a.talents : x.talents ?? [],
    talents_other: a.talents_other || x.talents_other || "",
    activities_other: a.activities_other || x.activities_other || "",
    areas: x.areas ?? [],
    no_area: x.no_area ?? "",
    photos: x.photos ?? [],
    card: x.card ?? null,
    form_done: x.form_done ?? [],
    tier: x.tier ?? "silver",
    secret_price: x.secret_price ?? null,
    pt_settings: x.pt_settings ?? null,
    post: x.post ?? null,
    listing: x.listing ?? null,
    work: x.work ?? null,
    listed: x.listed ?? false,
    delete_requested_at: x.delete_requested_at ?? null,
    bank_consents: x.bank_consents ?? null,
    photo_pos: x.photo_pos ?? null,
    geo: x.geo ?? null,
    link_by: x.link_by ?? null,
    tokens_after: x.tokens_after ?? null,
    pw_at: x.pw_at ?? null,
    bank_review: x.bank_review ?? null,
    fixes_done_at: x.fixes_done_at ?? null,
    link_by_all: x.link_by_all ?? null,
    slip_reject: x.slip_reject ?? null,
    slip_check: x.slip_check ?? null,
    invite: x.invite ?? null,
    inv_no: x.inv_no ?? null,
    ri_no: x.ri_no ?? null,
    ri_at: x.ri_at ?? null,
    listed_at: x.listed_at ?? null,
    group: x.group === "tom" ? "tom" : null,
    trans: !!x.trans,
    sales_ref: x.sales_ref ?? null,
    recruit_satang: x.recruit_satang ?? null,
    recruit_at: x.recruit_at ?? null,
    fee_paid_satang: x.fee_paid_satang ?? 0,
    disclose: x.disclose ?? null,
    blur_ack: x.blur_ack ?? null,
    face_blur: x.face_blur ?? null,
    inactive: x.inactive ?? null,
    active_log: x.active_log ?? null,
    kyc_status: a.kyc_status && a.kyc_status !== "none" ? a.kyc_status : x.kyc_status ?? a.kyc_status ?? "none",
    kyc_reason: a.kyc_reason ?? x.kyc_reason ?? null,
    kyc_submitted_at: a.kyc_submitted_at ?? x.kyc_submitted_at ?? null,
    bank_book_path: a.bank_book_path ?? x.bank_book_path ?? null,
  };
}

export const fullName = (a: Pick<Applicant, "title" | "first_name" | "last_name">) => `${a.title}${a.first_name} ${a.last_name}`;

export const isDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;

// แฮชรหัสผ่านไม่ออกจาก store (หน้าแอดมิน/API คืน row ทั้งก้อน) — ตัด docs.extra.pw_hash ทิ้งทุกครั้งที่คืนแถว
function noPw1(r: Applicant): Applicant {
  const ex = r?.docs?.extra as (Extra & { pw_hash?: unknown }) | undefined;
  if (!ex || !("pw_hash" in ex)) return r;
  const { pw_hash: _h, ...rest } = ex; void _h;
  return { ...r, docs: { ...r.docs, extra: rest as Extra } };
}
const noPw = (r: Applicant | null) => (r ? noPw1(r) : null);

/** แฮชรหัสผ่าน Part-Time ของใบสมัคร (ไม่มี = null) */
export async function getPwHash(id: string): Promise<string | null> {
  if (isDemo) return (demo.rows.find((x) => x.id === id)?.docs?.extra?.pw_hash as string | undefined) ?? null;
  const { data } = await db().from("applicants").select("docs").eq("id", id).maybeSingle();
  return ((data as Pick<Applicant, "docs"> | null)?.docs?.extra?.pw_hash as string | undefined) ?? null;
}

/** ใบสมัครที่ใช้อีเมลนี้ (ตัวเล็ก) — ล่าสุดก่อน */
export async function getByEmail(email: string): Promise<Applicant[]> {
  const e = email.trim().toLowerCase();
  if (!e) return [];
  if (isDemo) return demo.rows.filter((r) => (r.email ?? "").toLowerCase() === e).reverse().map(noPw1);
  const { data, error } = await db().from("applicants").select("*").ilike("email", e.replace(/[\%_]/g, (c) => "\\" + c)).order("created_at", { ascending: false }).limit(10);
  if (error) throw error;
  return ((data as Applicant[]) ?? []).map(noPw1);
}

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

/** MBM-YYMMNNN (หนุ่มหล่อ) / MBT-YYMMNNN (ทอมหล่อ · นับเลขแยก · บอสเปลี่ยน 22 ต.ค. 2569): ปี ค.ศ. 2 หลัก + เดือน + ลำดับในเดือนนั้น (เวลาไทย) */
export type Brand = "MBM" | "MBT";
/** เลขท้ายรหัส (ตัดตัวอักษรหน้า): MBM-2610001 → 2610001 */
export const codeNo = (mb: string) => mb.replace(/^[A-Z]+-/, "");
function mbPrefix(d = new Date(), brand: Brand = "MBM") {
  const th = new Date(d.getTime() + 7 * 3600_000);
  return `${brand}-${String(th.getUTCFullYear()).slice(2)}${String(th.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** จำนวนที่นับเข้าโควตา (ไม่นับที่ถูกปฏิเสธหรือคืนเงินแล้ว) */
export async function countActive(): Promise<number> {
  if (isDemo) return demo.rows.filter((r) => r.status === "pending_slip" || r.status === "verified").length;
  const { count, error } = await db().from("applicants").select("id", { count: "exact", head: true }).in("status", ["pending_slip", "verified"]);
  if (error) throw error;
  return count ?? 0;
}

const extOf = (f: File) => (f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg");

export async function putFile(path: string, file: File) {
  const data = Buffer.from(await file.arrayBuffer());
  const type = verifiedType(data);
  if (isDemo) return void demo.files.set(path, { type, data });
  const { error } = await db().storage.from("applicants").upload(path, data, { contentType: type, upsert: false });
  if (error) throw error;
}

export async function createApplicant(input: ApplicantInput, files: Partial<Record<DocKind, File>>, brand: Brand = "MBM"): Promise<Applicant> {
  const id = crypto.randomUUID();
  const docs: Applicant["docs"] = {};
  for (const k of DOC_KINDS) {
    const f = files[k];
    if (!f) continue;
    docs[k] = `${id}/${k}.${extOf(f)}`;
    await putFile(docs[k]!, f);
  }

  // แพ็กข้อมูล Part-Time ไว้ใน docs.extra ด้วย → ไม่หายแม้ยังไม่รัน migration 0003 (RPC เดิมไม่รู้จักคีย์ใหม่ใน p ก็ไม่ error)
  docs.extra = { activities: input.activities ?? [], massage_cert: input.massage_cert ?? null, availability: input.availability, ack_hours: input.ack_hours ?? false, ack_no_refuse: input.ack_no_refuse ?? false, phone_verified_at: input.phone_verified_at ?? null, talents: input.talents ?? [], talents_other: input.talents_other ?? "", activities_other: input.activities_other ?? "", areas: input.areas ?? [], no_area: input.no_area ?? "", slip_check: input.slip_check ?? null, invite: input.invite ?? null };

  if (isDemo) {
    const prefix = mbPrefix(new Date(), brand);
    const seq = demo.rows.filter((r) => r.mb_code.startsWith(prefix)).length + 1;
    const row: Applicant = {
      ...input, id, docs, mb_code: `${prefix}${String(seq).padStart(3, "0")}`,
      status: "pending_slip", criminal_check: "pending", contract_accepted_at: null, sheet_synced: false, created_at: new Date().toISOString(),
    };
    demo.rows.push(row);
    return row;
  }
  // รหัส MB ออกใน DB แบบ atomic (ฟังก์ชัน create_applicant ใน migration)
  // หนุ่มหล่อ MBM- · ทอมหล่อ MBT- นับแยก (supabase/join/0012_mbm_mbt_codes.sql)
  const { data, error } = await db().rpc("create_applicant", { p: { ...input, id, docs, mb_brand: brand } });
  if (error) throw error;
  return data as Applicant;
}

/** เลขเอกสารรันต่อเนื่องต่อเดือน: INV-2610-0001 (ใบแจ้งหนี้) / RI-2610-0001 (ใบเสร็จรับเงิน)
 *  ออกใน DB แบบ atomic (supabase/join/0010_doc_numbers.sql) · ยังไม่รัน SQL → null (ผู้เรียกใช้เลขสำรอง) */
const demoDocs = ((globalThis as unknown as { __mbDocNo?: Map<string, number> }).__mbDocNo ??= new Map());
export async function nextDocNo(kind: "INV" | "RI"): Promise<string | null> {
  if (isDemo) {
    const p = `${kind}-${codeNo(mbPrefix())}-`;
    const n = (demoDocs.get(p) ?? 0) + 1;
    demoDocs.set(p, n);
    return p + String(n).padStart(4, "0");
  }
  const { data, error } = await db().rpc("next_doc_no", { p_kind: kind });
  if (error) { console.error("next_doc_no", error.message); return null; }
  return (data as string) || null;
}

/** ออกเลขใบเสร็จ RI ครั้งเดียวเมื่อสถานะเป็น verified (อนุมัติซ้ำไม่ออกเลขใหม่) */
export async function ensureReceiptNo(row: Applicant): Promise<void> {
  if (row.status !== "verified" || !row.amount || extraOf(row).ri_no) return; // สมัครฟรี (สายเชิญ / ทอมหล่อ · ยอด 0) ไม่ออกใบเสร็จ
  const ri = (await nextDocNo("RI")) ?? `RI-${codeNo(row.mb_code)}`;
  await patchApplicant(row.id, { ri_no: ri, ri_at: new Date().toISOString() });
}

export async function getByMb(mb: string): Promise<Applicant | null> {
  if (isDemo) return noPw(demo.rows.find((r) => r.mb_code === mb) ?? null);
  const { data } = await db().from("applicants").select("*").eq("mb_code", mb).maybeSingle();
  return noPw((data as Applicant) ?? null);
}

/** หาใบสมัครจากเบอร์ (ตัวเลขล้วน) — ใบล่าสุดก่อน (ใช้ขอลิงก์เข้าโปรไฟล์ทางอีเมล) */
export async function getByTel(tel: string): Promise<Applicant[]> {
  if (isDemo) return demo.rows.filter((r) => r.tel === tel).reverse().map(noPw1);
  const { data, error } = await db().from("applicants").select("*").eq("tel", tel).order("created_at", { ascending: false }).limit(5);
  if (error) throw error;
  return ((data as Applicant[]) ?? []).map(noPw1);
}

export async function listApplicants(status?: ApplicantStatus): Promise<Applicant[]> {
  if (isDemo) return [...demo.rows].filter((r) => !status || r.status === status).reverse().map(noPw1);
  let q = db().from("applicants").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data as Applicant[]).map(noPw1);
}

/** ใบสมัครตาม id (ใช้ในหลังบ้าน) */
export async function getById(id: string): Promise<Applicant | null> {
  if (isDemo) return noPw(demo.rows.find((x) => x.id === id) ?? null);
  const { data, error } = await db().from("applicants").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return noPw((data as Applicant) ?? null);
}

export async function updateApplicant(id: string, patch: Partial<Pick<Applicant, "status" | "contract_accepted_at" | "sheet_synced" | "package">>) {
  if (isDemo) {
    const r = demo.rows.find((x) => x.id === id);
    if (r) Object.assign(r, patch);
    return r ?? null;
  }
  const { data, error } = await db().from("applicants").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return noPw1(data as Applicant);
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
    return noPw1(r);
  }
  const { data: cur, error: e1 } = await db().from("applicants").select("docs").eq("id", id).single();
  if (e1) throw e1;
  const docs = { ...(cur?.docs ?? {}), extra: { ...(cur?.docs?.extra ?? {}), ...patch } };
  const withCols = await db().from("applicants").update({ ...patch, docs }).eq("id", id).select().single();
  if (!withCols.error) return noPw1(withCols.data as Applicant);
  // คอลัมน์ cohort/line_joined ยังไม่มี (ยังไม่รัน 0003) → เขียนเฉพาะ docs
  const { data, error } = await db().from("applicants").update({ docs }).eq("id", id).select().single();
  if (error) throw error;
  return noPw1(data as Applicant);
}

// ── KYC / บัญชีรับเงิน / เช็กชื่ออบรม (migration join/0006 — ไม่มีคอลัมน์ก็เก็บใน docs.extra) ──

const KYC_EXTRA_KEYS = ["kyc_status", "kyc_reason", "kyc_submitted_at", "bank_book_path"];
/** เก็บใน docs.extra อย่างเดียว (ไม่มีคอลัมน์) */
const EXTRA_ONLY_KEYS = ["group", "trans", "inactive", "active_log", "disclose", "blur_ack", "face_blur", "sales_ref", "recruit_satang", "recruit_at", "fee_paid_satang", "secret_price", "pw_hash", "pw_at", "inv_no", "ri_no", "ri_at", "listed_at", "blocked_customers", "link_by_all", "slip_reject", "fixes_done_at", "bank_review", "tokens_after", "link_by", "geo", "photo_pos", "slip_check", "pt_settings", "post", "listing", "work", "listed", "delete_requested_at", "tier", "bank_consents", "areas", "no_area", "availability", "massage_cert", "ack_hours", "ack_no_refuse", "photos", "card", "form_done"];

/** เขียนคอลัมน์ + docs (path ไฟล์ และ extra สำรอง) — คอลัมน์ 0006 ยังไม่มีก็เขียนเฉพาะคอลัมน์เดิม + docs */
async function patchApplicant(id: string, allCols: Record<string, unknown>, docPaths: Partial<Record<DocKind, string>> = {}): Promise<Applicant | null> {
  const extraPatch = Object.fromEntries(Object.entries(allCols).filter(([k]) => KYC_EXTRA_KEYS.includes(k) || EXTRA_ONLY_KEYS.includes(k)));
  const cols = Object.fromEntries(Object.entries(allCols).filter(([k]) => !EXTRA_ONLY_KEYS.includes(k)));
  if (isDemo) {
    const r = demo.rows.find((x) => x.id === id);
    if (!r) return null;
    Object.assign(r, cols);
    r.docs = { ...r.docs, ...docPaths, extra: { ...r.docs.extra, ...extraPatch } };
    return noPw1(r);
  }
  const { data: cur, error: e1 } = await db().from("applicants").select("docs").eq("id", id).single();
  if (e1) throw e1;
  const docs = { ...(cur?.docs ?? {}), ...docPaths, extra: { ...(cur?.docs?.extra ?? {}), ...extraPatch } };
  const withCols = await db().from("applicants").update({ ...cols, docs }).eq("id", id).select().single();
  if (!withCols.error) return noPw1(withCols.data as Applicant);
  const base = Object.fromEntries(Object.entries(cols).filter(([k]) => !KYC_EXTRA_KEYS.includes(k)));
  const { data, error } = await db().from("applicants").update({ ...base, docs }).eq("id", id).select().single();
  if (error) throw error;
  return noPw1(data as Applicant);
}

async function putKycFile(id: string, kind: DocKind | "profile", f: File) {
  const path = `${id}/${kind}-${Date.now()}.${extOf(f)}`;
  await putFile(path, f);
  return path;
}

export async function saveKyc(id: string, files: { id_card?: File; selfie?: File; id_copy?: File }, address?: string) {
  const paths: Partial<Record<DocKind, string>> = {};
  if (files.id_card) paths.id_card = await putKycFile(id, "id_card", files.id_card);
  if (files.id_copy) paths.id_copy = await putKycFile(id, "id_copy", files.id_copy);
  if (files.selfie) paths.selfie = await putKycFile(id, "selfie", files.selfie);
  return patchApplicant(id, address ? { address } : {}, paths);
}

/** ใบสมัครหลังชำระเงิน (บอร์ด JoinForm / JoinForm2) — คอลัมน์ปกติ + docs.extra · ไฟล์รูปหน้าตรง/เต็มตัว/ใบรับรอง */
export async function saveProfile(id: string, cols: Record<string, unknown>, files: { photo?: File; other_doc?: File; cert_doc?: File } = {}) {
  const paths: Partial<Record<DocKind, string>> = {};
  for (const k of ["photo", "other_doc", "cert_doc"] as const) { const f = files[k]; if (f) paths[k] = await putKycFile(id, k, f); }
  return patchApplicant(id, cols, paths);
}

/** รูปโปรไฟล์ (บอร์ด ProviderPhotos) สูงสุด 9 รูป — เก็บ path ใน docs.extra.photos ตามลำดับ (รูปแรก = รูปหลัก) */
export async function addProfilePhoto(id: string, f: File) {
  return putKycFile(id, "profile", f);
}
/** แอดมินกำหนดระดับ TOP / Silver / Secret → ราคาบนการ์ดโปรไฟล์ (Secret: ราคา 3 ชม. รายคน) */
export async function setTier(id: string, tier: PtTier, secret_price?: number | null) {
  return patchApplicant(id, { tier, ...(secret_price !== undefined ? { secret_price } : {}) });
}
export async function setProfilePhotos(id: string, photos: string[]) {
  return patchApplicant(id, { photos: photos.slice(0, 9) });
}

/** บันทึกบัญชีรับเงิน + ส่ง KYC (kyc_status = submitted) */
export async function saveBank(id: string, b: { bank: string; bank_account: string; bank_account_name: string; bankbook?: File; consents?: { terms: boolean; pdpa: boolean; profile: boolean; at: string }; otherFixes?: KycReason | null }, current?: Applicant) {
  const paths: Partial<Record<DocKind, string>> = {};
  if (b.bankbook) paths.bankbook = await putKycFile(id, "bankbook", b.bankbook);
  // อนุมัติแล้ว → ยังเปิดรับงานต่อได้ · บัญชีใหม่รอแอดมินตรวจ (ถอนไม่ได้จนตรวจ) แทนการล้างสถานะ KYC ทั้งหมด
  if (current && extraOf(current).kyc_status === "approved") {
    const x = extraOf(current);
    const same = current.bank_account === b.bank_account && current.bank === b.bank && current.bank_account_name === b.bank_account_name && !paths.bankbook;
    if (same) return current;
    const prev = x.bank_review?.prev ?? { bank: current.bank, bank_account: current.bank_account, bank_account_name: current.bank_account_name, bank_book_path: current.bank_book_path ?? null };
    const cols: Record<string, unknown> = { bank: b.bank, bank_account: b.bank_account, bank_account_name: b.bank_account_name, bank_review: { at: new Date().toISOString(), prev } };
    if (paths.bankbook) cols.bank_book_path = paths.bankbook;
    return patchApplicant(id, cols, paths);
  }
  const cols: Record<string, unknown> = {
    bank: b.bank, bank_account: b.bank_account, bank_account_name: b.bank_account_name,
    kyc_status: "submitted", kyc_reason: null, kyc_submitted_at: new Date().toISOString(),
  };
  // ถูกตีกลับหลายรายการ → แก้บัญชีแล้วยังเหลือรายการอื่น คงสถานะ "ต้องแก้ไข" ไว้
  if (b.otherFixes && Object.keys(b.otherFixes).length) { cols.kyc_status = "rejected"; cols.kyc_reason = b.otherFixes; }
  if (paths.bankbook) cols.bank_book_path = paths.bankbook;
  if (b.consents) cols.bank_consents = b.consents;
  return patchApplicant(id, cols, paths);
}

/** ผู้สมัครแก้รายการที่ถูกตีกลับแล้ว → ลบเหตุผลรายการนั้น · ครบทุกรายการ → กลับเป็นรอตรวจ (มีบัญชีแล้ว) หรือยังไม่ส่ง */
export async function clearFixes(row: Applicant, keys: string[]) {
  const x = extraOf(row);
  if (x.kyc_status !== "rejected" || !x.kyc_reason) return;
  const rest: KycReason = { ...x.kyc_reason };
  let changed = false;
  for (const k of keys) if (k in rest) { delete rest[k]; changed = true; }
  if (!changed) return;
  if (Object.keys(rest).length) return patchApplicant(row.id, { kyc_reason: rest });
  const at = new Date().toISOString();
  return patchApplicant(row.id, { kyc_status: row.bank_account ? "submitted" : "none", kyc_reason: null, kyc_submitted_at: at, fixes_done_at: at });
}
/** เหตุผลที่ยังค้าง ยกเว้นรายการที่กำลังแก้ */
export function fixesExcept(row: Applicant, keys: string[]): KycReason | null {
  const x = extraOf(row);
  if (x.kyc_status !== "rejected" || !x.kyc_reason) return null;
  const rest: KycReason = { ...x.kyc_reason };
  for (const k of keys) delete rest[k];
  return rest;
}
/** ส่งสลิปใหม่ (แอดมินตีกลับสลิป หรือยังรอตรวจ) → กลับเป็นรอตรวจสลิป */
export async function saveSlip(id: string, f: File, slipCheck: unknown) {
  const slip = await putKycFile(id, "slip", f);
  return patchApplicant(id, { status: "pending_slip", slip_check: slipCheck }, { slip });
}

/** แอดมินตัดสิน KYC */
export async function setKyc(id: string, status: KycStatus, reason: KycReason | null = null) {
  return patchApplicant(id, { kyc_status: status, kyc_reason: reason });
}

async function attendanceFromExtra(id: string): Promise<Record<number, boolean>> {
  const r = isDemo ? demo.rows.find((x) => x.id === id) : ((await db().from("applicants").select("docs").eq("id", id).maybeSingle()).data as Pick<Applicant, "docs"> | null);
  const a = r?.docs?.extra?.attendance ?? {};
  return Object.fromEntries(Object.entries(a).map(([k, v]) => [Number(k), !!v]));
}

/** ผลเช็กชื่อรายรอบ { [session]: present } */
export async function getAttendance(id: string): Promise<Record<number, boolean>> {
  if (isDemo) return attendanceFromExtra(id);
  const { data, error } = await db().from("cohort_attendance").select("session, present").eq("applicant_id", id);
  if (error) return attendanceFromExtra(id); // ตารางยังไม่มี (ยังไม่รัน 0006)
  return Object.fromEntries((data as { session: number; present: boolean }[]).map((x) => [x.session, x.present]));
}

/** แอดมินเช็กชื่อ */
export async function markAttendance(id: string, session: number, present: boolean) {
  if (!isDemo) {
    const { error } = await db().from("cohort_attendance").upsert({ applicant_id: id, session, present, marked_at: new Date().toISOString() });
    if (!error) return;
  }
  if (isDemo) {
    const r = demo.rows.find((x) => x.id === id);
    if (r) r.docs = { ...r.docs, extra: { ...r.docs.extra, attendance: { ...r.docs.extra?.attendance, [session]: present }, attendance_at: { ...r.docs.extra?.attendance_at, [session]: new Date().toISOString() } } };
    return;
  }
  const { data: cur, error: e1 } = await db().from("applicants").select("docs").eq("id", id).single();
  if (e1) throw e1;
  const ex = cur?.docs?.extra ?? {};
  const docs = { ...(cur?.docs ?? {}), extra: { ...ex, attendance: { ...(ex.attendance ?? {}), [session]: present }, attendance_at: { ...(ex.attendance_at ?? {}), [session]: new Date().toISOString() } } };
  const { error } = await db().from("applicants").update({ docs }).eq("id", id);
  if (error) throw error;
}
