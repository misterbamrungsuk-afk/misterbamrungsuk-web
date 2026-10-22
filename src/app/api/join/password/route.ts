import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { limited } from "@/lib/rate-limit";
import { RESUME_COOKIE, canResume, iatOf, readResume } from "@/lib/join/resume";
import { getByEmail, getByMb, getPwHash, saveProfile } from "@/lib/join/store";
import { cleanEmail, linkable } from "@/lib/join/link-mail";
import { hashPw, pwProblem, verifyPw } from "@/lib/join/pt-password";

export const runtime = "nodejs";

// ตั้ง / เปลี่ยนรหัสผ่าน Part-Time (หน้าตั้งค่า) — ต้องเป็นเจ้าของโปรไฟล์ (คุกกี้ หรือ ?t=)
// ต้องใส่รหัสเดิม ยกเว้น: ยังไม่เคยตั้ง (สมัครก่อนมีระบบรหัสผ่าน) หรือเพิ่งเข้าจากลิงก์ในอีเมลไม่เกิน 30 นาที (ลืมรหัสผ่าน)
const FRESH_MS = 30 * 60_000;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const mb = u.searchParams.get("mb") ?? "";
  const t = u.searchParams.get("t");
  if (!/^MB[MT]?-\d{7,}$/.test(mb) || !(await canResume(mb, t))) return NextResponse.json({ ok: false }, { status: 401 });
  const row = await getByMb(mb);
  if (!row) return NextResponse.json({ ok: false }, { status: 404 });
  const tok = readResume(t) === mb ? t : (await cookies()).get(RESUME_COOKIE)?.value;
  return NextResponse.json({ ok: true, has: !!(await getPwHash(row.id)), fresh: Date.now() - iatOf(tok) < FRESH_MS, email: row.email || "" }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { mb?: string; t?: string; current?: unknown; password?: unknown; email?: unknown } | null;
  const mb = String(b?.mb ?? "");
  if (!/^MB[MT]?-\d{7,}$/.test(mb) || !(await canResume(mb, b?.t))) return NextResponse.json({ ok: false, error: "ไม่มีสิทธิ์เข้าโปรไฟล์นี้" }, { status: 401 });
  if (await limited(`jpw:${mb}`, 8, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ลองบ่อยเกินไป กรุณารอ 15 นาที" }, { status: 429 });
  const row = await getByMb(mb);
  if (!row) return NextResponse.json({ ok: false }, { status: 404 });
  const pw = typeof b?.password === "string" ? b.password : "";
  const p = pwProblem(pw);
  if (p) return NextResponse.json({ ok: false, error: p, fields: ["password"] }, { status: 400 });
  // ใบสมัครเก่าที่ไม่มีอีเมล → ใส่อีเมลพร้อมตั้งรหัส (ใช้เข้าสู่ระบบ) · ห้ามซ้ำกับใบสมัครอื่นที่ยังใช้งาน
  let newEmail: string | null = null;
  if (!cleanEmail(row.email)) {
    newEmail = cleanEmail(b?.email);
    if (!newEmail) return NextResponse.json({ ok: false, error: "กรอกอีเมลให้ถูกต้อง เช่น name@gmail.com · ใช้เข้าสู่ระบบและรับลิงก์เมื่อลืมรหัสผ่าน", fields: ["email"] }, { status: 400 });
    if ((await getByEmail(newEmail)).some((r) => r.id !== row.id && linkable(r))) return NextResponse.json({ ok: false, error: "อีเมลนี้ถูกใช้กับใบสมัครอื่นแล้ว", fields: ["email"] }, { status: 409 });
  }
  const cur = await getPwHash(row.id);
  const tok = readResume(b?.t) === mb ? b?.t : (await cookies()).get(RESUME_COOKIE)?.value;
  const fresh = Date.now() - iatOf(tok) < FRESH_MS;
  if (cur && !fresh && !verifyPw(typeof b?.current === "string" ? b.current : "", cur))
    return NextResponse.json({ ok: false, error: "รหัสผ่านเดิมไม่ถูกต้อง · ลืมรหัสผ่าน? ขอลิงก์ทางอีเมลแล้วเปิดลิงก์ภายใน 30 นาที", fields: ["current"] }, { status: 403 });
  await saveProfile(row.id, { pw_hash: hashPw(pw), pw_at: new Date().toISOString(), ...(newEmail ? { email: newEmail } : {}) });
  console.info(`[pt-password] mb=${mb} ${cur ? "changed" : "set"}`);
  return NextResponse.json({ ok: true, email: newEmail ?? row.email ?? "" });
}
