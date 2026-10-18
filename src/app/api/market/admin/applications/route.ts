import { NextResponse } from "next/server";
import { marketAdmin } from "@/lib/market/admin";
import { signInvite } from "@/lib/market/vendor-auth";
import { findAccountByEmail, inviteAccount } from "@/lib/market/store";
import { ApplyError, approveApplication, getApplication, listApplications, rejectApplication } from "@/lib/market/applications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const invitePath = (a: Parameters<typeof signInvite>[0]) => `/vendor/invite?t=${encodeURIComponent(signInvite(a))}`;

export async function GET() {
  if (!(await marketAdmin())) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, applications: await listApplications() });
}

// ตรวจใบสมัครเปิดร้าน: approve (สร้างร้าน + ลิงก์เชิญ) · reject (ต้องมีเหตุผล) · invite (ออกลิงก์เชิญใหม่ให้ร้านที่อนุมัติแล้ว)
export async function POST(req: Request) {
  const admin = await marketAdmin();
  if (!admin) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { op?: string; id?: string; gp_pct?: unknown; reason?: string };
  const id = String(b.id ?? "");
  try {
    if (b.op === "approve") {
      let gp: number | null = null;
      if (b.gp_pct !== null && b.gp_pct !== undefined && b.gp_pct !== "") {
        gp = Number(b.gp_pct);
        if (!Number.isFinite(gp) || gp < 0 || gp > 100) return NextResponse.json({ ok: false, error: "GP % ต้องอยู่ระหว่าง 0–100" }, { status: 400 });
      }
      const r = await approveApplication(id, admin.email, gp);
      return NextResponse.json({ ok: true, application: r.app, vendor: r.vendor, invite: invitePath(r.account) });
    }
    if (b.op === "reject") return NextResponse.json({ ok: true, application: await rejectApplication(id, admin.email, String(b.reason ?? "")) });
    if (b.op === "invite") {
      const a = await getApplication(id);
      if (!a || a.status !== "approved" || !a.vendor_id) return NextResponse.json({ ok: false, error: "ใบสมัครนี้ยังไม่ได้อนุมัติ" }, { status: 400 });
      const ex = await findAccountByEmail(a.email);
      if (ex?.password_hash) return NextResponse.json({ ok: false, error: "ร้านตั้งรหัสผ่านแล้ว · ลืมรหัส ให้เชิญใหม่จากแท็บบัญชีร้านค้า" }, { status: 409 });
      return NextResponse.json({ ok: true, invite: invitePath(await inviteAccount(a.vendor_id, a.email)) });
    }
    return NextResponse.json({ ok: false, error: "op ไม่ถูกต้อง" }, { status: 400 });
  } catch (e) {
    const status = e instanceof ApplyError ? e.status : 400;
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status });
  }
}
