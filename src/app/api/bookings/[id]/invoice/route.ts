import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer/auth";
import { limited } from "@/lib/rate-limit";
import { addEvent, getBooking, notify } from "@/lib/bookings";
import { sendEmail } from "@/lib/email";
import { ISSUER } from "@/lib/join/legal";

export const runtime = "nodejs";

/** หลักที่ 13 ของเลขประจำตัวผู้เสียภาษี/บัตรประชาชนไทย = (11 − Σ dᵢ×(13−i) mod 11) mod 10 */
const thaiIdOk = (id: string) => {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
};

// ขอใบกำกับภาษี (บอร์ด C-Receipt): { kind: person|corp, name, tax_id (13 หลัก), branch?, address, email } → แจ้งทีมงาน (ออกให้ภายใน 3 วันทำการ)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (await limited(`invoice:${me.sub}`, 10, 60 * 60_000)) return NextResponse.json({ ok: false, error: "ส่งคำขอบ่อยเกินไป" }, { status: 429 });
  const b = await getBooking((await params).id);
  if (!b || b.customer_id !== me.sub) return NextResponse.json({ ok: false, error: "ไม่พบการจอง" }, { status: 404 });
  const x = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const kind = x.kind === "corp" ? "corp" : "person";
  const name = String(x.name ?? "").trim().slice(0, 120), tax = String(x.tax_id ?? "").replace(/\D/g, ""), address = String(x.address ?? "").trim().slice(0, 300);
  const email = String(x.email ?? "").trim().slice(0, 120), branch = String(x.branch ?? "").trim().slice(0, 60);
  if (!name || !address) return NextResponse.json({ ok: false, error: "กรอกชื่อและที่อยู่ออกใบกำกับ" }, { status: 400 });
  if (!/^\d{13}$/.test(tax)) return NextResponse.json({ ok: false, error: "เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก" }, { status: 400 });
  if (!thaiIdOk(tax)) return NextResponse.json({ ok: false, error: "เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง (หลักตรวจสอบไม่ตรง)" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ ok: false, error: "อีเมลไม่ถูกต้อง" }, { status: 400 });
  // ออกใบกำกับได้เฉพาะนัดที่จบแล้วและมียอดที่เก็บจริง (คืนเต็มจำนวน = ไม่มีรายได้ให้ออกใบกำกับ)
  const kept = b.total_satang + (b.tip_satang ?? 0) - Number((b.resolution as { refund_satang?: number } | null)?.refund_satang ?? 0);
  if (b.status !== "completed" || kept <= 0) return NextResponse.json({ ok: false, error: "ขอใบกำกับภาษีได้หลังนัดจบแล้วเท่านั้น" }, { status: 409 });
  const info = { kind, name, tax_id: tax, branch: kind === "corp" ? branch : null, address, email };
  await addEvent(b.id, "tax_invoice_request", `customer:${me.sub}`, info);
  const line = `${kind === "corp" ? "นิติบุคคล" : "บุคคล"} ${name} · ${tax}${info.branch ? ` · ${info.branch}` : ""} · ${address} · ส่ง ${email}`;
  await notify({ user_type: "admin", user_id: "finance", kind: "tax_invoice", title: `ขอใบกำกับภาษี ${b.code}`, body: line, url: "/admin/orders" });
  void sendEmail({ to: process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL || ISSUER.email, subject: `ขอใบกำกับภาษี ${b.code}`, html: `<p>${line.replace(/[<>&]/g, "")}</p><p>ยอด ${(b.total_satang / 100).toLocaleString()} บาท</p>` }).catch(() => {});
  return NextResponse.json({ ok: true });
}
