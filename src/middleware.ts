import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, canAccess, homeFor, verifySession } from "@/lib/admin-auth";
import { mfaEnforcedEdge } from "@/lib/admin-mfa-policy";
import { GATE_COOKIE, PT_ONLY, gateExempt, gateToken, marketPublic, ptOnlyOpen } from "@/lib/site-gate";

// API ที่ใช้ได้แม้ยังไม่ผ่าน 2 ชั้นตอนเปิดบังคับ (ตั้งค่า 2 ชั้น · เข้าสู่ระบบ · ออกจากระบบ)
const mfaFreeApi = (p: string) => ["/api/admin/security", "/api/admin/login", "/api/admin/logout"].some((x) => p === x || p.startsWith(x + "/"));

// Auth guard
// - หน้าแอปทั่วไป: ต้องมี cookie hamoo_session (โหมดจริง: ตรวจ Supabase session; โหมดเดโม: ตั้งตอนกดเข้าสู่ระบบ)
// - หลังบ้าน /admin/*: ต้องมี session แอดมินที่ลงลายเซ็นถูกต้อง + บทบาทมีสิทธิ์เข้าหน้านั้น
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // กัน CSRF: คำสั่งที่เปลี่ยนข้อมูล (POST/PUT/PATCH/DELETE) ต้องมาจากหน้าเว็บของเราเอง
  // เบราว์เซอร์ส่ง Origin / Sec-Fetch-Site มาเสมอ — มาจากเว็บอื่น = ปฏิเสธ · ไม่มี header (เซิร์ฟเวอร์เรียก/cron) = ผ่านไปตรวจสิทธิ์ตามปกติ
  if (pathname.startsWith("/api") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    let foreign = request.headers.get("sec-fetch-site") === "cross-site";
    if (origin) { try { foreign ||= new URL(origin).host !== host; } catch { foreign = true; } }
    if (foreign) return NextResponse.json({ ok: false, error: "forbidden origin" }, { status: 403 });
  }

  // แท็บแชทระหว่างโหมดนี้ → ห้องแชทตัวอย่าง
  if (PT_ONLY && pathname === "/chat") {
    const url = request.nextUrl.clone();
    url.pathname = "/p/ton/chat";
    url.search = "";
    return NextResponse.rewrite(url);
  }
  // โหมดรับสมัคร Part-Time อย่างเดียว: หน้าอื่น → "เปิดให้บริการเร็ว ๆ นี้" · ทีมงาน (คุกกี้แอดมิน / รหัสเข้าเว็บ) ยังเปิดดูได้ทุกหน้า
  if (PT_ONLY && !ptOnlyOpen(pathname)) {
    const sitePw0 = process.env.SITE_PASSWORD;
    const team = !!(await verifySession(request.cookies.get(ADMIN_COOKIE)?.value)) || (!!sitePw0 && request.cookies.get(GATE_COOKIE)?.value === (await gateToken(sitePw0)));
    if (!team) {
      const url = request.nextUrl.clone();
      url.pathname = "/soon";
      url.search = "";
      return NextResponse.rewrite(url);
    }
  }
  // /login (ลูกค้า) ระหว่างโหมดนี้ → Part-Time เข้าสู่ระบบ
  if (PT_ONLY && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/join/me";
    url.search = "";
    return NextResponse.redirect(url);
  }

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

  // บังคับ 2 ชั้น (CEO เปิดที่ /admin/security): session แอดมินที่ยังไม่ผ่าน 2 ชั้น ใช้ API แอดมินไม่ได้
  // ไม่มีคุกกี้แอดมิน / ไม่ได้เปิดบังคับ = ไม่แตะเลย (ทำงานเหมือนเดิมทุกอย่าง)
  if (pathname.startsWith("/api/") && !mfaFreeApi(pathname)) {
    const raw = request.cookies.get(ADMIN_COOKIE)?.value;
    const s = raw ? await verifySession(raw) : null;
    if (s && !s.mfa && (await mfaEnforcedEdge(request))) {
      if (pathname.startsWith("/api/admin/")) return NextResponse.json({ ok: false, error: "ต้องตั้งค่ายืนยันตัวตน 2 ชั้นก่อน (หน้า ความปลอดภัยบัญชี)", mfa_required: true }, { status: 403 });
      // API อื่นที่รับคุกกี้แอดมินด้วย: ตัดคุกกี้แอดมินออก = ใช้งานแบบไม่ใช่แอดมิน
      const h = new Headers(request.headers);
      h.set("cookie", (request.headers.get("cookie") ?? "").split(/;\s*/).filter((c) => c && !c.startsWith(ADMIN_COOKIE + "=")).join("; "));
      return NextResponse.next({ request: { headers: h } });
    }
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
    // ถอดรหัส %xx ก่อนตรวจสิทธิ์ (กัน /admin/w%61llet หลุดไปเข้ากฎ /admin กว้าง ๆ)
    let path = pathname;
    try { path = decodeURIComponent(pathname); } catch { path = "/admin"; }
    // อักขระควบคุม (%00 ฯลฯ) ใน path = ไม่ใช่หน้าจริง → 404 (กันหลุดกฎสิทธิ์/500)
    if (/[\x00-\x1f]/.test(path)) return new NextResponse("not found", { status: 404 });
    // เปิดบังคับ 2 ชั้นอยู่ + session นี้ยังไม่ผ่าน 2 ชั้น → ไปหน้าตั้งค่า/ยืนยันก่อน (เปิดหน้าอื่นไม่ได้)
    const securityPage = path === "/admin/security" || path.startsWith("/admin/security/");
    if (!admin.mfa && !securityPage && (await mfaEnforcedEdge(request))) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/security";
      url.search = "?required=1";
      return NextResponse.redirect(url);
    }
    if (!canAccess(admin.role, path)) {
      const url = request.nextUrl.clone();
      url.pathname = homeFor(admin.role);
      url.search = "?denied=1";
      return NextResponse.redirect(url);
    }
    // ส่ง path ให้ layout ตรวจสิทธิ์ซ้ำอีกชั้นฝั่งเซิร์ฟเวอร์
    const h = new Headers(request.headers);
    h.set("x-admin-path", path);
    return NextResponse.next({ request: { headers: h } });
  }

  const isPublic =
    pathname === "/login" ||
    pathname === "/admin-login" ||
    pathname === "/gate" ||
    pathname === "/welcome" ||
    pathname === "/onboarding" ||
    pathname === "/sos" ||
    // ข้อกำหนด/นโยบาย ต้องอ่านได้ก่อนสมัคร (ลิงก์จากหน้าสมัคร + คุกกี้) · ค้นหาเพื่อนดูได้แบบเดียวกับหน้าแรก
    pathname === "/page/terms" || pathname === "/privacy" || pathname.startsWith("/privacy/") || pathname === "/soon" ||
    pathname === "/search" ||
    // โปรเปิดเมมเบอร์ดูได้ก่อนล็อกอิน · Sale Man (หน้าขาย/แดชบอร์ดผ่านลิงก์) · ลิงก์แนะนำ /ref/CODE
    pathname === "/membership" || pathname === "/sales" || pathname.startsWith("/sales/") || pathname.startsWith("/ref/") ||
    // หน้ารับสมัคร Part-Time (sale funnel) เปิดสาธารณะ
    pathname === "/join" ||
    pathname.startsWith("/join/") ||
    // หน้าขายพื้นที่พาร์ทเนอร์ เปิดสาธารณะ
    pathname === "/partner" ||
    pathname.startsWith("/partner/") ||
    // Marketplace หน้าแรก เปิดสาธารณะ
    pathname === "/" || pathname === "/work-with-us" || pathname === "/map" || pathname.startsWith("/p/") || pathname === "/market" || pathname.startsWith("/market/") || marketPublic(pathname) ||
    pathname === "/products" || pathname.startsWith("/products/") || pathname === "/cart" ||
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
