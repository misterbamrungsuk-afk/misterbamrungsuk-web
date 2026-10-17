import { NextResponse } from "next/server";
import { limited as dbLimited } from "@/lib/rate-limit";
import { createHash, timingSafeEqual } from "node:crypto";
import { GATE_COOKIE, gateToken } from "@/lib/site-gate";

const tries = new Map<string, { n: number; at: number }>();

// เทียบรหัสแบบใช้เวลาคงที่ (กันเดาจากเวลาตอบกลับ)
const same = (a: string, b: string) => { const x = createHash("sha256").update(a).digest(), y = createHash("sha256").update(b).digest(); return timingSafeEqual(x, y); };

export async function POST(req: Request) {
  if (await dbLimited(`gate:${(req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim()}`, 10, 10 * 60_000)) return Response.json({ ok: false, error: "ลองบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const t = tries.get(ip);
  if (t && Date.now() - t.at < 10 * 60_000 && t.n >= 10) return NextResponse.json({ ok: false, error: "ลองบ่อยเกินไป รอ 10 นาที" }, { status: 429 });

  const { password } = await req.json().catch(() => ({ password: "" }));
  const want = process.env.SITE_PASSWORD;
  if (!want || typeof password !== "string" || !same(password, want)) {
    tries.set(ip, { n: (t && Date.now() - t.at < 10 * 60_000 ? t.n : 0) + 1, at: Date.now() });
    return NextResponse.json({ ok: false, error: "รหัสไม่ถูกต้อง" }, { status: 401 });
  }
  tries.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, await gateToken(want), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
