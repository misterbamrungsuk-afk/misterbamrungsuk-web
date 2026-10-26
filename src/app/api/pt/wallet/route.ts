import { NextResponse } from "next/server";
import { currentParttime } from "@/lib/bookings/auth";
import { BookingError } from "@/lib/bookings";
import { listWithdrawals, ptWallet, requestWithdraw } from "@/lib/bookings/day";
import { extraOf } from "@/lib/join/store";
import { getMoney } from "@/lib/wallet/settings";
import { GATE_MSG, isPtActive } from "@/lib/join/pt-ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// กระเป๋าเงิน Part-Time: รอปล่อย / ถอนได้ / กำลังโอน + ประวัติ + คำขอถอน (?mb=&t=)
export async function GET(req: Request) {
  const u = new URL(req.url);
  const a = await currentParttime(u.searchParams.get("mb") ?? "", u.searchParams.get("t"));
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  try {
    const [w, ws, m] = await Promise.all([ptWallet(a.id), listWithdrawals({ parttime_id: a.id }), getMoney()]);
    return NextResponse.json({ ok: true, ...w, withdrawals: ws.slice(0, 20), rules: { minWithdraw: m.minWithdraw, feePct: m.feePct, whtPct: m.whtPct, releaseHours: m.releaseHours }, bank: a.bank_account ? { bank: a.bank, tail: a.bank_account.slice(-4) } : null });
  } catch (e) {
    console.error("pt wallet", e);
    return NextResponse.json({ ok: false, error: "ระบบกระเป๋าเงินยังไม่เปิดใช้งาน" }, { status: 503 });
  }
}

// ขอถอน: { mb, t?, amount } (บาท) — ต้องผ่าน KYC และมีบัญชีรับเงิน
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { mb?: string; t?: string; amount?: number };
  const a = await currentParttime(String(b.mb ?? ""), b.t);
  if (!a) return NextResponse.json({ ok: false }, { status: 403 });
  if (extraOf(a).kyc_status !== "approved") return NextResponse.json({ ok: false, error: "เอกสารยืนยันตัวตนยังไม่ครบ · เบิก/ถอนเงินได้หลังทีมงานตรวจเอกสารผ่าน" }, { status: 409 });
  // ยังไม่เปิดโปรไฟล์ให้ลูกค้าเห็น = ยังไม่ใช่ Part-Time ที่ทำงานจริง → ถอนไม่ได้
  if (!isPtActive(extraOf(a))) return NextResponse.json({ ok: false, error: GATE_MSG }, { status: 409 });
  if (extraOf(a).bank_review) return NextResponse.json({ ok: false, error: "บัญชีรับเงินใหม่รอทีมงานตรวจ · ถอนได้หลังตรวจเสร็จ (ปกติภายใน 1 วันทำการ)" }, { status: 409 });
  try {
    const w = await requestWithdraw(a, Number(b.amount) || 0);
    return NextResponse.json({ ok: true, withdrawal: { id: w.id, net_satang: w.net_satang, status: w.status } });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    console.error("withdraw", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
