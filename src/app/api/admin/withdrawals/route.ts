import { csvCell } from "@/lib/csv";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ceoSession } from "@/lib/ceo-room-auth";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { BookingError } from "@/lib/bookings";
import { withdrawInfo } from "@/lib/admin/withdraw-info";
import { approveWithdrawal, getWithdrawal, listWithdrawals, makeBatch, markFailed, markPaid, rejectWithdrawal } from "@/lib/bookings/day";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function admin() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return s && canAccess(s.role, "/admin/wallet") ? s : null;
}

// คิวถอนเงิน Part-Time · ?csv=BATCH = ไฟล์โอนกลุ่ม (ธนาคาร, เลขบัญชี, ชื่อบัญชี, ยอดสุทธิ, อ้างอิง)
export async function GET(req: Request) {
  if (!(await admin())) return NextResponse.json({ ok: false }, { status: 401 });
  const csv = new URL(req.url).searchParams.get("csv");
  try {
    const rows = await listWithdrawals();
    if (csv) {
      const esc = (v: unknown) => csvCell(v); // กันสูตร Excel
      const lines = rows.filter((w) => w.batch_id === csv && w.status === "batched").map((w) => [w.bank.bank, w.bank.account, w.bank.name, (w.net_satang / 100).toFixed(2), w.parttime_mb, w.id].map(esc).join(","));
      const body = "﻿" + [["ธนาคาร", "เลขบัญชี", "ชื่อบัญชี", "ยอดโอนสุทธิ", "รหัส MB", "อ้างอิง"].map(esc).join(","), ...lines].join("\r\n");
      return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="payout-${String(csv).replace(/[^\w-]/g, "")}.csv"`, "Cache-Control": "no-store" } });
    }
    // ชื่อ PT + ป้ายบัญชีใหม่ (เทียบกับบัญชีที่โอนสำเร็จครั้งล่าสุด) สำหรับรายการที่ยังไม่จบ
    const info = await withdrawInfo(rows, rows).catch(() => ({}));
    return NextResponse.json({ ok: true, withdrawals: rows, info });
  } catch (e) {
    console.error("admin withdrawals", e);
    return NextResponse.json({ ok: false, error: "ระบบกระเป๋าเงินยังไม่เปิดใช้งาน" }, { status: 503 });
  }
}

// แอดมิน: { action: "batch" } · { action: "paid", id } · { action: "failed", id, note }
// CEO เท่านั้น: { action: "approve", id } · { action: "reject", id, note } (อนุมัติคำขอถอนชั้นที่ 2 ก่อนส่งให้แอดมินโอน)
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { action?: string; id?: string; note?: string };
  try {
    // อนุมัติ/ไม่อนุมัติ = ห้อง CEO เท่านั้น (คุกกี้ /ceo · ไม่ใช้บัญชีแอดมิน)
    if (b.action === "approve" || b.action === "reject") {
      const ceo = await ceoSession();
      if (!ceo) return NextResponse.json({ ok: false, error: "อนุมัติได้ที่ห้อง CEO (ลิงก์ /ceo) เท่านั้น" }, { status: 403 });
      const id = String(b.id ?? "");
      return NextResponse.json({ ok: true, row: b.action === "approve" ? await approveWithdrawal(id, ceo.actor) : await rejectWithdrawal(id, ceo.actor, String(b.note ?? "").slice(0, 200)) });
    }
    const s = await admin();
    if (!s) return NextResponse.json({ ok: false }, { status: 401 });
    const actor = `admin:${s.email}`;
    if (b.action === "batch") return NextResponse.json({ ok: true, ...(await makeBatch(actor)) });
    if (b.action === "paid") return NextResponse.json({ ok: true, row: await markPaid(String(b.id ?? ""), actor) });
    if (b.action === "failed") {
      if (!String(b.note ?? "").trim()) return NextResponse.json({ ok: false, error: "ระบุสาเหตุ" }, { status: 400 });
      const cur = await getWithdrawal(String(b.id ?? ""));
      if (cur?.status === "requested" && s.role !== "ceo") return NextResponse.json({ ok: false, error: "คำขอนี้ยังรอ CEO — ปฏิเสธได้เฉพาะ CEO" }, { status: 403 });
      return NextResponse.json({ ok: true, row: await markFailed(String(b.id ?? ""), actor, String(b.note)) });
    }
    return NextResponse.json({ ok: false, error: "ไม่รู้จักคำสั่ง" }, { status: 400 });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message }, { status: 409 });
    console.error("withdrawal action", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
