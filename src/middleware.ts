import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, canAccess, homeFor, verifySession } from "@/lib/admin-auth";
import { GATE_COOKIE, gateExempt, gateToken } from "@/lib/site-gate";

// Auth guard
// - หน้าแอปทั่วไป: ต้องมี cookie hamoo_session (โหมดจริง: ตรวจ Supabase session; โหมดเดโม: ตั้งตอนกดเข้าสู่ระบบ)
// - หลังบ้าน /admin/*: ต้องมี session แอดมินที่ลงลายเซ็นถูกต้อง + บทบาทมีสิทธิ์เข้าหน้านั้น
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // รหัสเข้าเว็บ (ตั้ง SITE_PASSWORD) — ล็อกทุกหน้า ยกเว้นหน้ารับสมัคร /join
  const sitePw = process.env.SITE_PASSWORD;
  if (sitePw && !gateExempt(pathname) && request.cookies.get(GATE_COOKIE)?.value !== (await gateToken(sitePw))) {
    if (pathname.startsWith("/api")) return NextResponse.json({ ok: false, error: "locked" }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/gate";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const admin = await verifySession(request.cookies.get(ADMIN_COOKIE)?.value);
    if (!admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin-login";
      url.search = "";
      url.searchParams.set("next", pathname);
      const res = NextResponse.redirect(url);
      res.cookies.delete(ADMIN_COOKIE); // ล้าง token ที่หมดอายุ/ปลอม
      return res;
    }
    if (!canAccess(admin.role, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = homeFor(admin.role);
      url.search = "?denied=1";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const isPublic =
    pathname === "/login" ||
    pathname === "/admin-login" ||
    pathname === "/gate" ||
    pathname === "/welcome" ||
    pathname === "/onboarding" ||
    pathname === "/sos" ||
    // หน้ารับสมัครหมอ (sale funnel) เปิดสาธารณะ
    pathname === "/join" ||
    pathname.startsWith("/join/") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/auth") ||
    pathname === "/favicon.ico" ||
    // PWA: manifest / ไอคอน / service worker / หน้าออฟไลน์ ต้องโหลดได้ก่อนล็อกอิน
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/offline" ||
    pathname.startsWith("/pwa-icon") ||
    pathname.startsWith("/brand");

  if (isPublic) return NextResponse.next();

  const session = request.cookies.get("hamoo_session")?.value;
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
