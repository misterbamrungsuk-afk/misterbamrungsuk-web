import { NextResponse } from "next/server";
import { ACTIVITIES, CLOSE_AT, ageError, EXPERIENCE, PACKAGES, QUOTA, STRENGTHS, TALENTS, TIME_SLOTS, TITLES, type PackageKey } from "@/lib/join/config";
import { countActive, createApplicant, updateApplicant, type DocKind } from "@/lib/join/store";
import { appendToSheet } from "@/lib/join/sheets";
import { applicantRegistered, sendAll } from "@/lib/email";
import { ageFrom } from "@/lib/join/form";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/join/legal";
import { TURNSTILE_ERROR, verifyTurnstile } from "@/lib/turnstile";
import { cookies } from "next/headers";
import { PHONE_COOKIE, normalizePhone, readPhoneToken } from "@/lib/otp";
import { verifySlip } from "@/lib/slip2go";

export const runtime = "nodejs";

const MAX_FILE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const REQUIRED_DOCS: DocKind[] = ["photo", "id_card", "slip"];

// กันยิงรัว: 5 ครั้ง / 10 นาที / IP (ในหน่วยความจำ — หลายเครื่องต้องย้ายไป Redis)
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const oneOf = (list: readonly string[], v: string) => list.includes(v);
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));


export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (limited(ip)) return bad("ส่งบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่", 429);

  if (Date.now() > Date.parse(CLOSE_AT)) return bad("ปิดรับสมัครแล้ว", 410);
  if ((await countActive()) >= QUOTA) return bad("รับครบจำนวนแล้ว", 410);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("ข้อมูลไม่ถูกต้อง");
  }
  const s = (k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);
  if (!(await verifyTurnstile(s("turnstile", 2048), ip))) return bad(TURNSTILE_ERROR, 403);

  const pkg = s("package") as PackageKey;
  const height = Number(s("height"));
  const weight = Number(s("weight"));
  const tel = s("tel").replace(/[-\s]/g, "");
  const account = s("bank_account").replace(/[-\s]/g, "");
  const email = s("email").toLowerCase();
  const skills = form.getAll("skills").map(String).filter((x) => oneOf(STRENGTHS, x));
  const method = s("payment_method");
  const activities = form.getAll("activities").map(String).filter((x) => oneOf(ACTIVITIES, x));
  const talents = form.getAll("talents").map(String).filter((x) => oneOf(TALENTS, x));
  const slots = form.getAll("avail_slots").map(String).filter((x) => oneOf(TIME_SLOTS, x));
  const days = Number(s("avail_days"));
  const hoursPerDay = Number(s("avail_hours"));
  const cert = s("massage_cert");

  const errors: string[] = [];
  if (!(pkg in PACKAGES)) errors.push("package");
  for (const k of ["first_name", "last_name", "nickname"]) if (!s(k)) errors.push(k);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.push("email");
  if (!/^0\d{9}$/.test(tel)) errors.push("tel");
  if (!/^\d{5}$/.test(s("zipcode"))) errors.push("zipcode");
  if (!(height >= 140 && height <= 220)) errors.push("height");
  if (!(weight >= 35 && weight <= 200)) errors.push("weight");
  if (!oneOf(EXPERIENCE, s("experience"))) errors.push("experience");
  if (s("accept_terms") !== "true") errors.push("accept_terms");
  if (s("consent_pdpa") !== "true") errors.push("consent_pdpa");
  if (method !== "qr" && method !== "transfer") errors.push("payment_method");
  // ฟิลด์ Sheet3 (เก็บตอนอบรม) — ถ้าส่งมาต้องอยู่ในรายการที่กำหนด
  if (s("consent_criminal") !== "true") errors.push("consent_criminal");
  if (s("title") && !oneOf(TITLES, s("title"))) errors.push("title");
  // อายุตามแพ็กเกจ: ขั้นต่ำ 20, A ≤ 50, B ≤ 45 — วันเกิดบังคับ
  if (!isDate(s("birthdate"))) errors.push("birthdate");
  else if (pkg in PACKAGES) {
    const ageErr = ageError(pkg, ageFrom(s("birthdate")));
    if (ageErr) return NextResponse.json({ ok: false, error: ageErr, fields: ["birthdate"] }, { status: 400 });
  }
  if (s("start_date") && !isDate(s("start_date"))) errors.push("start_date");
  if (s("bank_account") && !/^\d{10,12}$/.test(account)) errors.push("bank_account");
  // ข้อมูล Part-Time
  if (!activities.length) errors.push("activities");
  if (!talents.length) errors.push("talents");
  if (!slots.length) errors.push("avail_slots");
  if (!(Number.isInteger(days) && days >= 1 && days <= 7)) errors.push("avail_days");
  if (!(hoursPerDay >= 1 && hoursPerDay <= 24)) errors.push("avail_hours");
  if (pkg === "B" && cert !== "yes" && cert !== "no") errors.push("massage_cert");
  if (s("ack_hours") !== "true") errors.push("ack_hours");
  if (s("ack_no_refuse") !== "true") errors.push("ack_no_refuse");

  const files: Partial<Record<DocKind, File>> = {};
  for (const k of [...REQUIRED_DOCS, "bankbook", "other_doc", "cert_doc"] as DocKind[]) {
    const f = form.get(k);
    if (f instanceof File && f.size > 0) {
      if (!IMAGE_TYPES.includes(f.type) || f.size > MAX_FILE) errors.push(k);
      else files[k] = f;
    } else if (REQUIRED_DOCS.includes(k)) errors.push(k);
  }
  if (errors.length) return NextResponse.json({ ok: false, error: "กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง", fields: errors }, { status: 400 });

  // เบอร์ที่ส่งมาต้องตรงกับเบอร์ที่ยืนยัน OTP แล้ว (cookie ลงลายเซ็นจาก /api/otp/verify)
  const verifiedPhone = readPhoneToken((await cookies()).get(PHONE_COOKIE)?.value);
  if (!verifiedPhone || verifiedPhone !== normalizePhone(tel))
    return NextResponse.json({ ok: false, error: "กรุณายืนยันเบอร์โทรด้วยรหัส OTP ก่อนส่งใบสมัคร", fields: ["tel"], needOtp: true }, { status: 403 });

  // ตรวจสลิปกับ Slip2Go — สลิปซ้ำ หรือโอนเข้าบัญชีอื่น ไม่รับ; กรณีอื่นบันทึกผลให้แอดมินตัดสิน
  const slipCheck = await verifySlip(files.slip!, PACKAGES[pkg].price);
  if (slipCheck?.verdict === "dup") return NextResponse.json({ ok: false, error: "สลิปนี้เคยถูกใช้แล้ว กรุณาแนบสลิปของการโอนครั้งนี้", fields: ["slip"] }, { status: 400 });
  if (slipCheck?.verdict === "acct") return NextResponse.json({ ok: false, error: "สลิปนี้โอนเข้าบัญชีที่ไม่ใช่ของ Mister Bamrungsuk กรุณาโอนผ่าน QR ในหน้านี้ แล้วแนบสลิปใหม่", fields: ["slip"] }, { status: 400 });

  try {
    const row = await createApplicant(
      {
        title: s("title"), first_name: s("first_name"), last_name: s("last_name"), nickname: s("nickname"),
        birthdate: s("birthdate") || null, weight, height, nationality: s("nationality"), ethnicity: s("ethnicity"),
        religion: s("religion"), education: s("education"), marital: s("marital"), start_date: s("start_date") || null,
        tel, line_id: s("line_id"), email, address: s("address", 500), zipcode: s("zipcode"),
        bank: s("bank"), bank_account: account, bank_account_name: s("bank_account_name"),
        experience: s("experience"), skills, intro: s("intro", 1000),
        consent_marketing: s("consent_marketing") === "true",
        consent_criminal: true,
        activities, talents, massage_cert: pkg === "B" ? cert === "yes" : null,
        availability: { slots, days, hours: hoursPerDay },
        ack_hours: true, ack_no_refuse: true,
        phone_verified_at: new Date().toISOString(),
        slip_check: slipCheck,
        // ต่อท้าย "/criminal" ใน consent_version ด้วย — บันทึกความยินยอมได้แม้ยังไม่รัน migration 0002
        consent_version: `privacy-${PRIVACY_VERSION}/terms-${TERMS_VERSION}/criminal`, consented_at: new Date().toISOString(),
        package: pkg, amount: PACKAGES[pkg].price, payment_method: method as "qr" | "transfer", ip,
      },
      files,
    );
    // sync ชีตแบบไม่ให้ล้มทั้งคำขอ — ถ้าไม่สำเร็จ แอดมินกด sync ซ้ำได้
    // อีเมลแจ้งผู้สมัคร + แอดมิน (ไม่รอ ไม่ทำให้คำขอล้ม)
    void sendAll(applicantRegistered({ mb_code: row.mb_code, first_name: row.first_name, last_name: row.last_name, email: row.email, tel: row.tel, package: PACKAGES[pkg].name ?? pkg, amount: row.amount }));
    if (await appendToSheet(row)) await updateApplicant(row.id, { sheet_synced: true });
    const res = NextResponse.json({ ok: true, mb_code: row.mb_code });
    res.cookies.delete(PHONE_COOKIE);
    return res;
  } catch (e) {
    console.error("register failed", e);
    return bad("ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง", 500);
  }
}
