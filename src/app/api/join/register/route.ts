import { NextResponse } from "next/server";
import { limited as dbLimited } from "@/lib/rate-limit";
import { CLOSE_AT, PACKAGES, type PackageKey } from "@/lib/join/config";
import { createApplicant, updateApplicant, type DocKind } from "@/lib/join/store";
import { consumeInvite, findInvite } from "@/lib/join/invites";
import { appendToSheet } from "@/lib/join/sheets";
import { applicantRegistered, sendAll } from "@/lib/email";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/join/legal";
import { TURNSTILE_ERROR, verifyTurnstile } from "@/lib/turnstile";
import { cookies } from "next/headers";
import { PHONE_COOKIE, normalizePhone, otpRequired, readPhoneToken } from "@/lib/otp";
import { verifySlip } from "@/lib/slip2go";
import { RESUME_COOKIE, RESUME_TTL_MS, signResume } from "@/lib/join/resume";

export const runtime = "nodejs";

const MAX_FILE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
// ชำระเงินก่อนกรอกใบสมัคร (บอร์ด JoinPay): รับชื่อ + เบอร์ที่ยืนยัน OTP + สลิป → สร้างรหัส MB · ใบสมัครที่เหลือกรอกที่ /join/form/[mb]
const REQUIRED_DOCS: DocKind[] = ["slip"];

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


export async function POST(req: Request) {
  if (await dbLimited(`jreg:${(req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim()}`, 8, 15 * 60_000)) return Response.json({ ok: false, error: "ลองบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (limited(ip)) return bad("ส่งบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่", 429);

  if (Date.now() > Date.parse(CLOSE_AT)) return bad("ปิดรับสมัครแล้ว", 410);
  if ((await (await import("@/lib/join/cohorts")).nextCohortSeats()).full) return bad("รับครบจำนวนแล้ว", 410);

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

  const errors: string[] = [];
  if (!(pkg in PACKAGES)) errors.push("package");
  for (const k of ["first_name", "last_name", "nickname"]) if (!s(k)) errors.push(k);
  if (!/^0\d{9}$/.test(tel)) errors.push("tel");
  if (s("accept_terms") !== "true") errors.push("accept_terms");
  if (s("consent_pdpa") !== "true") errors.push("consent_pdpa");

  const files: Partial<Record<DocKind, File>> = {};
  for (const k of REQUIRED_DOCS) {
    const f = form.get(k);
    if (f instanceof File && f.size > 0) {
      if (!IMAGE_TYPES.includes(f.type) || f.size > MAX_FILE) errors.push(k);
      else files[k] = f;
    } else if (REQUIRED_DOCS.includes(k)) errors.push(k);
  }
  if (errors.length) return NextResponse.json({ ok: false, error: "กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง", fields: errors }, { status: 400 });

  // ลิงก์เชิญ → ไม่เก็บค่าการันตี Branding ยอดที่ต้องโอน = ค่าอบรมเท่านั้น
  const inviteCode = s("invite", 12).toUpperCase();
  let invite: string | null = null;
  if (inviteCode) {
    const { state } = await findInvite(inviteCode);
    if (state !== "ok") return bad(state === "full" ? "ลิงก์เชิญนี้มีผู้ใช้ครบจำนวนแล้ว" : state === "expired" ? "ลิงก์เชิญนี้หมดอายุแล้ว" : "ลิงก์เชิญนี้ใช้ไม่ได้ กรุณาติดต่อแอดมิน", 410);
    invite = inviteCode;
  }
  const amount = invite ? PACKAGES[pkg].training : PACKAGES[pkg].price;

  // เบอร์ที่ส่งมาต้องตรงกับเบอร์ที่ยืนยัน OTP แล้ว (cookie ลงลายเซ็นจาก /api/otp/verify)
  const verifiedPhone = readPhoneToken((await cookies()).get(PHONE_COOKIE)?.value);
  if (otpRequired() && (!verifiedPhone || verifiedPhone !== normalizePhone(tel)))
    return NextResponse.json({ ok: false, error: "กรุณายืนยันเบอร์โทรด้วยรหัส OTP ก่อนส่งใบสมัคร", fields: ["tel"], needOtp: true }, { status: 403 });

  // ตรวจสลิปกับ Slip2Go — สลิปซ้ำ หรือโอนเข้าบัญชีอื่น ไม่รับ; กรณีอื่นบันทึกผลให้แอดมินตัดสิน
  const slipCheck = await verifySlip(files.slip!, amount);
  if (slipCheck?.verdict === "dup") return NextResponse.json({ ok: false, error: "สลิปนี้เคยถูกใช้แล้ว กรุณาแนบสลิปของการโอนครั้งนี้", fields: ["slip"] }, { status: 400 });
  if (slipCheck?.verdict === "acct") return NextResponse.json({ ok: false, error: "สลิปนี้โอนเข้าบัญชีที่ไม่ใช่ของ Mister Bamrungsuk กรุณาโอนผ่าน QR ในหน้านี้ แล้วแนบสลิปใหม่", fields: ["slip"] }, { status: 400 });

  try {
    const row = await createApplicant(
      {
        // ข้อมูลใบสมัครที่เหลือกรอกหลังชำระเงิน → ตอนนี้ค่าว่าง (คอลัมน์ NOT NULL ใส่ค่าว่าง ไม่ต้องแก้ฐานข้อมูล)
        title: "นาย", first_name: s("first_name"), last_name: s("last_name"), nickname: s("nickname"),
        birthdate: null, weight: 0, height: 0, nationality: "ไทย", ethnicity: "ไทย",
        religion: "", education: "", marital: "", start_date: null,
        tel, line_id: "", email: "", address: "", zipcode: "",
        bank: "", bank_account: "", bank_account_name: "",
        experience: "", skills: [], intro: "",
        consent_marketing: false,
        consent_criminal: false,
        activities: [], talents: [], talents_other: "", activities_other: "", massage_cert: null,
        areas: [], no_area: "",
        ack_hours: false, ack_no_refuse: false,
        phone_verified_at: verifiedPhone && verifiedPhone === normalizePhone(tel) ? new Date().toISOString() : null,
        slip_check: slipCheck,
        invite,
        consent_version: `privacy-${PRIVACY_VERSION}/terms-${TERMS_VERSION}`, consented_at: new Date().toISOString(),
        package: pkg, amount, payment_method: "qr", ip,
      },
      files,
    );
    if (invite) await consumeInvite(invite).catch((e) => console.error("consume invite failed", e));
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
