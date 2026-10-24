import { NextResponse } from "next/server";
import { FileTypeError } from "@/lib/file-guard";
import { limited as dbLimited } from "@/lib/rate-limit";
import { CLOSE_AT, PACKAGES, type PackageKey } from "@/lib/join/config";
import { codeNo, createApplicant, getByEmail, nextDocNo, saveProfile, updateApplicant, type DocKind } from "@/lib/join/store";
import { consumeInvite, findInvite } from "@/lib/join/invites";
import { appendToSheet } from "@/lib/join/sheets";
import { applicantRegistered, sendAll } from "@/lib/email";
import { CONSENT_VERSION, PRIVACY_VERSION, TERMS_VERSION } from "@/lib/join/legal";
import { TURNSTILE_ERROR, verifyTurnstile } from "@/lib/turnstile";
import { cookies } from "next/headers";
import { PHONE_COOKIE, normalizePhone, otpRequired, readPhoneToken } from "@/lib/otp";
import { verifySlip } from "@/lib/slip2go";
import { RESUME_COOKIE, RESUME_TTL_MS, signResume } from "@/lib/join/resume";
import { EMAIL_ERROR, cleanEmail, linkable } from "@/lib/join/link-mail";
import { hashPw, pwProblem } from "@/lib/join/pt-password";
import { siteUrl } from "@/lib/site-url";
import { RECRUIT_COOKIE, recruitRep } from "@/lib/member/recruit";

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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("ข้อมูลไม่ถูกต้อง");
  }
  const s = (k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);
  if (!(await verifyTurnstile(s("turnstile", 2048), ip))) return bad(TURNSTILE_ERROR, 403);

  // ทอมหล่อมีสายเดียว: เพื่อนกินเที่ยว (มีความสามารถในการนวด) = B
  // ทอมหล่อ + ลิงก์เชิญ (TOP / Secret) = สาย B "เพื่อนกินเที่ยว พร้อมทักษะการนวด" เสมอ (บอสสั่ง 22 ต.ค. 2569)
  const pkg = (s("group") === "tom" || s("invite", 12) ? "B" : s("package")) as PackageKey;
  // หมวดทอมหล่อ (/join/tom) — ที่นั่งอบรมแยกโควตาจากหนุ่มหล่อ
  const group = s("group") === "tom" ? "tom" : null;
  if ((await (await import("@/lib/join/cohorts")).nextCohortSeats(group)).full) return bad("รับครบจำนวนแล้ว", 410);
  // ตัดทุกอย่างที่ไม่ใช่ตัวเลขก่อน (วาง "abc081-234-5678" ก็ได้ 0812345678) แล้วตรวจ 10 หลักด้านล่าง
  const tel = s("tel").replace(/\D/g, "");

  const errors: string[] = [];
  if (!(pkg in PACKAGES)) errors.push("package");
  for (const k of ["first_name", "last_name", "nickname"]) if (!s(k)) errors.push(k);
  if (!/^0\d{9}$/.test(tel)) errors.push("tel");
  // อีเมลบังคับ — ใช้ส่งลิงก์เข้าโปรไฟล์ (LINE ↔ Chrome คุกกี้แยกกัน · ปิด OTP อยู่) และใบเสร็จ
  const email = cleanEmail(form.get("email"));
  if (!email) return NextResponse.json({ ok: false, error: EMAIL_ERROR, fields: ["email"] }, { status: 400 });
  // รหัสผ่าน Part-Time (เข้าสู่ระบบที่ /join/me) — ลืมรหัส = ขอลิงก์ทางอีเมล
  const password = String(form.get("password") ?? "");
  const pwErr = pwProblem(password);
  if (pwErr) return NextResponse.json({ ok: false, error: pwErr, fields: ["password"] }, { status: 400 });
  // อีเมลซ้ำกับใบสมัครที่ยังใช้งานอยู่ → ให้เข้าสู่ระบบแทน (ตรวจก่อนส่งสลิปไป Slip2Go)
  if ((await getByEmail(email)).some(linkable)) return NextResponse.json({ ok: false, error: "อีเมลนี้สมัครไว้แล้ว · เข้าสู่ระบบ Part-Time", fields: ["email"], login: "/join/me" }, { status: 409 });
  if (s("accept_terms") !== "true") errors.push("accept_terms");
  if (s("consent_pdpa") !== "true") errors.push("consent_pdpa");
  // แบบคำขอความยินยอม (ผู้สมัคร) ข้อ 6: ตรวจประวัติอาชญากรรม + ผลตรวจสุขภาพ = ข้อมูลอ่อนไหว (ม.26) แยกติ๊ก บังคับ
  if (s("consent_criminal") !== "true") errors.push("consent_criminal");

  // ลิงก์เชิญพิเศษ = ไม่ต้องจ่าย ไม่ต้องแนบสลิป (ตรวจรหัสด้านล่าง)
  const inviteCode = s("invite", 12).toUpperCase();
  const files: Partial<Record<DocKind, File>> = {};
  // สมัครฟรี (ไม่ต้องแนบสลิป): ลิงก์เชิญพิเศษ หรือหมวดทอมหล่อ
  const freeSignup = !!inviteCode || group === "tom";
  for (const k of freeSignup ? [] : REQUIRED_DOCS) {
    const f = form.get(k);
    if (f instanceof File && f.size > 0) {
      if (!IMAGE_TYPES.includes(f.type) || f.size > MAX_FILE) errors.push(k);
      else files[k] = f;
    } else if (REQUIRED_DOCS.includes(k)) errors.push(k);
  }
  if (errors.length) return NextResponse.json({ ok: false, error: "กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง", fields: errors }, { status: 400 });

  // ลิงก์เชิญพิเศษ (บอสกำหนด 20 ต.ค. 2569): ไม่ต้องจ่ายค่าสมัคร · ได้ระดับ TOP ทันที · แค่สมัคร
  let invite: string | null = null;
  let secret = false; // ลิงก์เชิญ Secret → ระดับ Secret (ราคาแอดมินตั้งรายคน)
  if (inviteCode) {
    const { state, invite: inv } = await findInvite(inviteCode);
    secret = inv?.kind === "secret";
    if (state !== "ok") return bad(state === "full" ? "ลิงก์เชิญนี้มีผู้ใช้ครบจำนวนแล้ว" : state === "expired" ? "ลิงก์เชิญนี้หมดอายุแล้ว" : "ลิงก์เชิญนี้ใช้ไม่ได้ กรุณาติดต่อแอดมิน", 410);
    invite = inviteCode;
  }
  const free = !!invite || group === "tom";
  const amount = free ? 0 : PACKAGES[pkg].price;

  // เบอร์ที่ส่งมาต้องตรงกับเบอร์ที่ยืนยัน OTP แล้ว (cookie ลงลายเซ็นจาก /api/otp/verify)
  const jar = await cookies();
  const verifiedPhone = readPhoneToken(jar.get(PHONE_COOKIE)?.value);
  // Recruit ที่แนะนำ: เลขแนะนำที่กรอกเอง (ผิด = แจ้งให้แก้) มาก่อนคุกกี้จากลิงก์ /join/s/<โค้ด> (ปิดแล้ว/ไม่ถูกต้อง = ไม่ผูก)
  const typedRef = s("recruit_code").toUpperCase();
  const salesRep = typedRef ? await recruitRep(typedRef).catch(() => null) : await recruitRep(jar.get(RECRUIT_COOKIE)?.value).catch(() => null);
  if (typedRef && !salesRep) return NextResponse.json({ ok: false, error: "ไม่พบเลขแนะนำนี้ · ตรวจกับ Recruit ที่แนะนำอีกครั้ง หรือเว้นว่างไว้", fields: ["recruit_code"] }, { status: 400 });
  if (otpRequired() && (!verifiedPhone || verifiedPhone !== normalizePhone(tel)))
    return NextResponse.json({ ok: false, error: "กรุณายืนยันเบอร์โทรด้วยรหัส OTP ก่อนส่งใบสมัคร", fields: ["tel"], needOtp: true }, { status: 403 });

  // ตรวจสลิปกับ Slip2Go — สลิปซ้ำ หรือโอนเข้าบัญชีอื่น ไม่รับ; กรณีอื่นบันทึกผลให้แอดมินตัดสิน
  const slipCheck = free ? null : await verifySlip(files.slip!, amount);
  if (slipCheck?.verdict === "dup") return NextResponse.json({ ok: false, error: "สลิปนี้เคยถูกใช้แล้ว กรุณาแนบสลิปของการโอนครั้งนี้", fields: ["slip"] }, { status: 400 });
  if (slipCheck?.verdict === "acct") return NextResponse.json({ ok: false, error: "สลิปนี้โอนเข้าบัญชีที่ไม่ใช่ของ Mister Bamrungsuk กรุณาโอนผ่าน QR ในหน้านี้ แล้วแนบสลิปใหม่", fields: ["slip"] }, { status: 400 });

  try {
    const row = await createApplicant(
      {
        // ข้อมูลใบสมัครที่เหลือกรอกหลังชำระเงิน → ตอนนี้ค่าว่าง (คอลัมน์ NOT NULL ใส่ค่าว่าง ไม่ต้องแก้ฐานข้อมูล)
        title: group === "tom" ? "นางสาว" : "นาย", first_name: s("first_name"), last_name: s("last_name"), nickname: s("nickname"),
        birthdate: null, weight: 0, height: 0, nationality: "ไทย", ethnicity: "ไทย",
        religion: "", education: "", marital: "", start_date: null,
        tel, line_id: "", email, address: "", zipcode: "",
        bank: "", bank_account: "", bank_account_name: "",
        experience: "", skills: [], intro: "",
        consent_marketing: false,
        consent_criminal: true,
        activities: [], talents: [], talents_other: "", activities_other: "", massage_cert: null,
        areas: [], no_area: "",
        ack_hours: false, ack_no_refuse: false,
        phone_verified_at: verifiedPhone && verifiedPhone === normalizePhone(tel) ? new Date().toISOString() : null,
        slip_check: slipCheck,
        invite,
        consent_version: `privacy-${PRIVACY_VERSION}/terms-${TERMS_VERSION}/consent-${CONSENT_VERSION}`, consented_at: new Date().toISOString(),
        package: pkg, amount, payment_method: "qr", ip,
      },
      files,
      group === "tom" ? "MBT" : "MBM",
    );
    // เก็บเฉพาะแฮช (docs.extra.pw_hash · store ไม่ส่งออก)
    // เลขใบแจ้งหนี้ INV (ยังไม่รัน SQL 0010 → ใช้เลขตามรหัส MB)
    // สายเชิญไม่มียอด → ไม่ออกเอกสาร · ถือว่าชำระแล้ว (verified) + ระดับ TOP
    const inv_no = free ? null : (await nextDocNo("INV").catch(() => null)) ?? `INV-${codeNo(row.mb_code)}`;
    await saveProfile(row.id, { pw_hash: hashPw(password), pw_at: new Date().toISOString(), inv_no, ...(invite ? { tier: secret ? "secret" : "top" } : {}), ...(group ? { group } : {}), ...(salesRep ? { sales_ref: { rep_id: salesRep.id, code: salesRep.code } } : {}) });
    if (free) await updateApplicant(row.id, { status: "verified" });
    if (invite) await consumeInvite(invite).catch((e) => console.error("consume invite failed", e));
    // sync ชีตแบบไม่ให้ล้มทั้งคำขอ — ถ้าไม่สำเร็จ แอดมินกด sync ซ้ำได้
    // อีเมลแจ้งผู้สมัคร + แอดมิน (ไม่รอ ไม่ทำให้คำขอล้ม)
    // โทเคนเดียวกับคุกกี้ — ส่งไปอีเมล + คืนให้ป๊อปอัปหลังจ่าย (คัดลอก / ส่งเข้า LINE ตัวเอง)
    const token = signResume(row.mb_code);
    const link = `${siteUrl(req)}/join/go?t=${encodeURIComponent(token)}`;
    void sendAll(applicantRegistered({ mb_code: row.mb_code, first_name: row.first_name, last_name: row.last_name, nickname: row.nickname, email: row.email || email, tel: row.tel, package: PACKAGES[pkg].name ?? pkg, amount: row.amount, link }));
    if (await appendToSheet(row)) await updateApplicant(row.id, { sheet_synced: true });
    const res = NextResponse.json({ ok: true, mb_code: row.mb_code, link });
    res.cookies.delete(PHONE_COOKIE);
    res.cookies.set(RESUME_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: RESUME_TTL_MS / 1000 });
    return res;
  } catch (e) {
    console.error("register failed", e);
    return e instanceof FileTypeError ? bad(e.message, 400) : bad("ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง", 500);
  }
}
