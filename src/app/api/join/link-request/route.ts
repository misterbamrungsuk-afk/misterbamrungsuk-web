import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { getByMb, getByTel } from "@/lib/join/store";
import { cleanEmail, emailProfileLink, linkable } from "@/lib/join/link-mail";
import { TURNSTILE_ERROR, verifyTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";

// ขอลิงก์เข้าโปรไฟล์ Part-Time ทางอีเมลด้วยตัวเอง (/join/me) — ใส่เบอร์ที่สมัคร หรือรหัส MB
// ตอบข้อความเดียวกันเสมอ (เจอ/ไม่เจอ/ไม่มีอีเมล/ถูกจำกัด) → ใช้เดาว่าใครสมัครไม่ได้ · ลิงก์ส่งไปอีเมลที่ใช้สมัครเท่านั้น
const GENERIC = "ถ้าข้อมูลตรงกับใบสมัคร เราส่งลิงก์ไปที่อีเมลที่ใช้สมัครแล้ว · ตรวจกล่องจดหมายและสแปม";

/** เบอร์ 10 หลัก (รับ +66 / 66 / ขีด / เว้นวรรค) หรือ รหัส MB-xxxxxxx */
function parseQ(raw: string): { tel?: string; mb?: string } | null {
  const v = raw.trim().toUpperCase();
  const m = /^(M[BS])-?(\d{7,})$/.exec(v.replace(/\s/g, ""));
  if (m) return { mb: `${m[1]}-${m[2]}` };
  let d = v.replace(/\D/g, "");
  if (/^66\d{9}$/.test(d)) d = "0" + d.slice(2);
  return /^0\d{9}$/.test(d) ? { tel: d } : null;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (await limited(`jlinkreq:${ip}`, 5, 15 * 60_000)) return NextResponse.json({ ok: false, error: "ขอบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่" }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { q?: unknown; turnstile?: unknown } | null;
  if (!(await verifyTurnstile(body?.turnstile, ip))) return NextResponse.json({ ok: false, error: TURNSTILE_ERROR }, { status: 403 });
  const q = parseQ(String(body?.q ?? "").slice(0, 40));
  if (!q) return NextResponse.json({ ok: false, error: "ใส่เบอร์โทร 10 หลักที่ใช้สมัคร หรือรหัส MB (เช่น MB-2610001)" }, { status: 400 });

  try {
    const rows = q.mb ? [await getByMb(q.mb)].filter((r) => !!r) : await getByTel(q.tel!);
    // เบอร์เดียวสมัครหลายใบ → ใบล่าสุดที่ยังใช้งานได้และมีอีเมล
    const row = rows.find((r) => r && linkable(r) && cleanEmail(r.email));
    if (row) {
      if (await limited(`jlinkreq-mb:${row.mb_code}`, 3, 3600_000)) console.info(`[link-request] mb=${row.mb_code} limited`);
      else { void emailProfileLink(req, row).catch(() => {}); console.info(`[link-request] mb=${row.mb_code} sent`); }
    }
  } catch (e) {
    console.error("link-request", (e as Error)?.message);
  }
  return NextResponse.json({ ok: true, message: GENERIC });
}
