import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { slip2goPing } from "@/lib/slip2go";
import { sendTestEmail } from "@/lib/email";

export const runtime = "nodejs";

// ทดสอบบริการภายนอกจริงจากหน้าภาพรวมแอดมิน: POST { service: "slip2go" | "email" }
export async function POST(req: Request) {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s || !canAccess(s.role, "/admin")) return NextResponse.json({ ok: false }, { status: 401 });
  const { service } = (await req.json().catch(() => ({}))) as { service?: string };
  if (service === "slip2go") {
    const r = await slip2goPing();
    return NextResponse.json({ ok: r.ok, detail: [r.status || "", r.code, r.message].filter(Boolean).join(" · ") });
  }
  if (service === "email") {
    const to = process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL || s.email;
    const r = await sendTestEmail(to);
    return NextResponse.json({ ok: r.ok, detail: r.ok ? `ส่งไป ${to.replace(/^(.{2}).*(@.*)$/, "$1…$2")} แล้ว` : r.error });
  }
  return NextResponse.json({ ok: false, detail: "service" }, { status: 400 });
}
