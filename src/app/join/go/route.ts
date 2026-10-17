import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { RESUME_COOKIE, RESUME_TTL_MS, readResume } from "@/lib/join/resume";
import { sameOrigin, switchPage } from "@/lib/switch-confirm";

export const runtime = "nodejs";

// ลิงก์เข้าโปรไฟล์ที่แอดมินส่งให้ (#35) — ตรวจโทเคนแล้วตั้งคุกกี้ mb_resume ให้เครื่องนี้ จากนั้นพาไปโปรไฟล์ (ไม่ต้องพก ?t= ทุกหน้า)
// เครื่องนี้ล็อกอินโปรไฟล์อื่นอยู่ = ถามยืนยันก่อนสลับ (กันถูกสลับบัญชีจากลิงก์ที่คนอื่นส่งมา)
function enter(url: URL, t: string, mb: string, to: string | null) {
  const res = NextResponse.redirect(new URL(to === "rejected" ? `/join/rejected/${mb}` : `/join/profile/${mb}`, url), 303);
  res.cookies.set(RESUME_COOKIE, t, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: RESUME_TTL_MS / 1000 });
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const t = url.searchParams.get("t");
  const mb = readResume(t);
  if (!mb || !t) return NextResponse.redirect(new URL("/join/go/expired", url));
  const cur = readResume((await cookies()).get(RESUME_COOKIE)?.value);
  if (cur && cur !== mb) return switchPage("/join/go", { t, to: url.searchParams.get("to") ?? "" }, mb, cur);
  return enter(url, t, mb, url.searchParams.get("to"));
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!sameOrigin(req)) return new Response("forbidden", { status: 403 });
  const fd = await req.formData().catch(() => null);
  const t = String(fd?.get("t") ?? "");
  const mb = readResume(t);
  if (!mb) return NextResponse.redirect(new URL("/join/go/expired", url), 303);
  return enter(url, t, mb, String(fd?.get("to") ?? ""));
}
