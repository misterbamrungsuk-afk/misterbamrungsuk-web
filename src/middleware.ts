import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth guard — ทุกหน้าแอปต้องผ่านล็อกอิน (cookie hamoo_session)
// โหมดจริง: ตรวจ Supabase session; โหมดเดโม: cookie ถูกตั้งตอนกดเข้าสู่ระบบ
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/login" ||
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
