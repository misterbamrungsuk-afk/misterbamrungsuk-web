import { NextResponse } from "next/server";

// Supabase OAuth callback — สลับ session code เป็น token แล้วส่งไปหน้าถัดไป
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/home";

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !code) {
    return NextResponse.redirect(new URL("/home", url.origin));
  }
  // เมื่อผูก Supabase จริง: แลก code ผ่าน @supabase/ssr exchangeCodeForSession
  return NextResponse.redirect(new URL(next, url.origin));
}
