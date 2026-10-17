import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { MemberError, eraseMember, listMembers, setSuspended } from "@/lib/customer/admin";
import { notify } from "@/lib/bookings";

export const runtime = "nodejs";

// สมาชิกลูกค้า (บอร์ด A-Members): POST { action: "suspend" | "unsuspend" | "erase", id, reason? }
export async function POST(req: Request) {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s || !canAccess(s.role, "/admin/members")) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { action?: string; id?: string; reason?: string };
  const m = (await listMembers().catch(() => [])).find((x) => x.id === String(b.id ?? ""));
  if (!m) return NextResponse.json({ ok: false, error: "ไม่พบสมาชิก" }, { status: 404 });
  try {
    if (b.action === "suspend") {
      const reason = String(b.reason ?? "").trim();
      if (!reason) return NextResponse.json({ ok: false, error: "ระบุเหตุผลการระงับ" }, { status: 400 });
      await setSuspended(m.id, true, `${reason} · ${s.email}`);
      await notify({ user_type: "customer", user_id: m.id, kind: "account_suspended", title: "บัญชีถูกระงับชั่วคราว", body: `${reason} · ติดต่อทีมงานทาง LINE`, url: "/page/terms" });
    } else if (b.action === "unsuspend") {
      await setSuspended(m.id, false, "");
    } else if (b.action === "erase") {
      if (!m.delete_requested_at) return NextResponse.json({ ok: false, error: "ลบได้เฉพาะสมาชิกที่ขอลบบัญชี" }, { status: 400 });
      if (s.role !== "super" && s.role !== "ceo") return NextResponse.json({ ok: false, error: "เฉพาะ Super admin" }, { status: 403 });
      await eraseMember(m.id, m.email);
    } else return NextResponse.json({ ok: false, error: "action" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof MemberError) return NextResponse.json({ ok: false, error: e.message }, { status: 409 });
    console.error("admin members", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
