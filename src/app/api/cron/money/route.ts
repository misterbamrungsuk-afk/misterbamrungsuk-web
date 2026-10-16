import { NextResponse } from "next/server";
import { listAll, notify } from "@/lib/bookings";
import { reconcile } from "@/lib/wallet/reconcile";
import { sendEmail } from "@/lib/email";
import { ISSUER } from "@/lib/join/legal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// รอบรายวัน: หมดเวลาตอบรับ → คืนเงิน · จบงานอัตโนมัติ · ปล่อยรายได้ที่ครบเวลา (ปกติทำตอนมีคนเปิดหน้าอยู่แล้ว รอบนี้กันค้าง)
// แล้วกระทบยอด ledger กับการจอง/คำขอถอน (#24) — ไม่ตรง = แจ้งเตือนในหลังบ้าน + อีเมลแอดมิน
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 }); // ไม่ตั้ง secret = ปิด (กัน "Bearer undefined")
  try {
    const rows = await listAll(1000);
    const r = await reconcile();
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient } = await import("@supabase/supabase-js");
      await createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }).rpc("rate_gc").then(() => {}, () => {}); // ล้างตัวนับกันสแปมที่เก่ากว่า 1 วัน
    }
    if (!r.ok) {
      await notify({ user_type: "admin", user_id: "finance", kind: "recon_alert", title: "ยอดเงินไม่ตรง (กระทบยอดรายวัน)", body: r.issues.join(" · ").slice(0, 500), url: "/admin/wallet" });
      const to = process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL || ISSUER.email;
      await sendEmail({ to, subject: "⚠️ Mister Bamrungsuk: ยอดเงินไม่ตรง", html: `<div style="font-family:Tahoma,sans-serif"><h3>กระทบยอดรายวันพบ ${r.issues.length} รายการ</h3><ul>${r.issues.map((i) => `<li>${i.replace(/[<>&]/g, "")}</li>`).join("")}</ul><p>ตรวจที่ /admin/wallet</p></div>` });
    }
    return NextResponse.json({ ok: true, checked: rows.length, recon: r });
  } catch (e) {
    console.error("cron money", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
