import { NextResponse } from "next/server";
import { CLOSE_AT, ageError, PACKAGES, QUOTA, type PackageKey } from "@/lib/join/config";
import { countActive, createApplicant, updateApplicant, type DocKind } from "@/lib/join/store";
import { appendToSheet } from "@/lib/join/sheets";
import { applicantRegistered, sendAll } from "@/lib/email";
import { ageFrom } from "@/lib/join/form";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/join/legal";
import { TURNSTILE_ERROR, verifyTurnstile } from "@/lib/turnstile";
import { cookies } from "next/headers";
import { PHONE_COOKIE, normalizePhone, otpRequired, readPhoneToken } from "@/lib/otp";
import { verifySlip } from "@/lib/slip2go";
import { RESUME_COOKIE, RESUME_TTL_MS, signResume } from "@/lib/join/resume";

export const runtime = "nodejs";

const MAX_FILE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
// ใบสมัครตามบอร์ด JoinForm: รูปหน้าตรง + รูปเต็มตัว (other_doc) + สลิป · บัตรประชาชนย้ายไปขั้นยืนยันตัวตน (/api/join/kyc)
const REQUIRED_DOCS: DocKind[] = ["photo", "other_doc", "slip"];
const WEEK_DAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
const PERIODS = ["กลางวัน", "กลางคืน"];
const HOUR_BANDS: Record<string, number> = { "3–4 ชม.": 4, "5–6 ชม.": 6, "7–8 ชม.": 8, "มากกว่า 8 ชม.": 10 };

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
  const tel = s("tel").replace(/[-\s]/g, "");
  const weekDays = [...new Set(form.getAll("week_days").map(String))].filter((x) => WEEK_DAYS.includes(x));
  const periods = [...new Set(form.getAll("periods").map(String))].filter((x) => PERIODS.includes(x));
  const hoursBand = s("hours_band");
  const areas = [...new Set(form.getAll("areas").map((x) => String(x).trim().slice(0, 120)))].filter(Boolean).slice(0, 20);
  const cert = s("massage_cert");

  const errors: string[] = [];
  if (!(pkg in PACKAGES)) errors.push("package");
  for (const k of ["first_name", "last_name", "nickname", "line_id", "address"]) if (!s(k)) errors.push(k);
  if (!/^0\d{9}$/.test(tel)) errors.push("tel");
  if (s("accept_terms") !== "true") errors.push("accept_terms");
  if (s("consent_pdpa") !== "true") errors.push("consent_pdpa");
  // อายุ 20–50 ปี (AGE_LIMITS) — วันเกิดบังคับ
  if (!isDate(s("birthdate"))) errors.push("birthdate");
  else if (pkg in PACKAGES) {
    const ageErr = ageError(pkg, ageFrom(s("birthdate")));
    if (ageErr) return NextResponse.json({ ok: false, error: ageErr, fields: ["birthdate"] }, { status: 400 });
  }
  if (!areas.length) errors.push("areas");
  if (!weekDays.length) errors.push("week_days");
  if (!periods.length) errors.push("periods");
  if (!(hoursBand in HOUR_BANDS)) errors.push("hours_band");
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
  if (otpRequired() && (!verifiedPhone || verifiedPhone !== normalizePhone(tel)))
    return NextResponse.json({ ok: false, error: "กรุณายืนยันเบอร์โทรด้วยรหัส OTP ก่อนส่งใบสมัคร", fields: ["tel"], needOtp: true }, { status: 403 });

  // ตรวจสลิปกับ Slip2Go — สลิปซ้ำ หรือโอนเข้าบัญชีอื่น ไม่รับ; กรณีอื่นบันทึกผลให้แอดมินตัดสิน
  const slipCheck = await verifySlip(files.slip!, PACKAGES[pkg].price);
  if (slipCheck?.verdict === "dup") return NextResponse.json({ ok: false, error: "สลิปนี้เคยถูกใช้แล้ว กรุณาแนบสลิปของการโอนครั้งนี้", fields: ["slip"] }, { status: 400 });
  if (slipCheck?.verdict === "acct") return NextResponse.json({ ok: false, error: "สลิปนี้โอนเข้าบัญชีที่ไม่ใช่ของ Mister Bamrungsuk กรุณาโอนผ่าน QR ในหน้านี้ แล้วแนบสลิปใหม่", fields: ["slip"] }, { status: 400 });

  try {
    const row = await createApplicant(
      {
        // คอลัมน์ NOT NULL ที่ใบสมัครชุดใหม่ไม่ถาม → ค่าว่าง (ไม่ต้องแก้ฐานข้อมูล)
        title: "นาย", first_name: s("first_name"), last_name: s("last_name"), nickname: s("nickname"),
        birthdate: s("birthdate"), weight: 0, height: 0, nationality: "ไทย", ethnicity: "ไทย",
        religion: "", education: "", marital: "", start_date: null,
        tel, line_id: s("line_id", 60), email: "", address: s("address", 300), zipcode: "",
        bank: "", bank_account: "", bank_account_name: "",
        experience: s("experience", 500), skills: [], intro: s("intro", 300),
        consent_marketing: false,
        consent_criminal: false,
        activities: [], talents: [], talents_other: "", activities_other: "", massage_cert: pkg === "B" ? cert === "yes" : null,
        areas, no_area: s("no_area", 300),
        availability: { slots: periods, days: weekDays.length, hours: HOUR_BANDS[hoursBand], week_days: weekDays, hours_band: hoursBand },
        ack_hours: true, ack_no_refuse: true,
        phone_verified_at: verifiedPhone && verifiedPhone === normalizePhone(tel) ? new Date().toISOString() : null,
        slip_check: slipCheck,
        // ต่อท้าย "/criminal" ใน consent_version ด้วย — บันทึกความยินยอมได้แม้ยังไม่รัน migration 0002
        consent_version: `privacy-${PRIVACY_VERSION}/terms-${TERMS_VERSION}`, consented_at: new Date().toISOString(),
        package: pkg, amount: PACKAGES[pkg].price, payment_method: "qr", ip,
      },
      files,
    );
    // sync ชีตแบบไม่ให้ล้มทั้งคำขอ — ถ้าไม่สำเร็จ แอดมินกด sync ซ้ำได้
    // อีเมลแจ้งผู้สมัคร + แอดมิน (ไม่รอ ไม่ทำให้คำขอล้ม)
    void sendAll(applicantRegistered({ mb_code: row.mb_code, first_name: row.first_name, last_name: row.last_name, email: row.email, tel: row.tel, package: PACKAGES[pkg].name ?? pkg, amount: row.amount }));
    if (await appendToSheet(row)) await updateApplicant(row.id, { sheet_synced: true });
    const res = NextResponse.json({ ok: true, mb_code: row.mb_code });
    res.cookies.delete(PHONE_COOKIE);
    res.cookies.set(RESUME_COOKIE, signResume(row.mb_code), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: RESUME_TTL_MS / 1000 });
    return res;
  } catch (e) {
    console.error("register failed", e);
    return bad("ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง", 500);
  }
}
