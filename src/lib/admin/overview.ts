import "server-only";
import { PLATFORM, allBalances, listTopups } from "@/lib/wallet";
import { listAll, listAdminNotices } from "@/lib/bookings";
import { listWithdrawals } from "@/lib/bookings/day";
import { extraOf, listApplicants } from "@/lib/join/store";
import { reconcile, type Recon } from "@/lib/wallet/reconcile";

// ตัวเลขจริงสำหรับหน้าภาพรวมแอดมิน — ทุกค่าเป็นสตางค์ยกเว้นที่ระบุ · พังส่วนไหนแสดง null (ไม่ทำทั้งหน้าล่ม)
const safe = async <T,>(p: Promise<T>, fb: T): Promise<T> => p.catch(() => fb);
const bkkDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

export async function overview() {
  const [bookings, bal, topups, wds, apps, alerts, recon] = await Promise.all([
    safe(listAll(5000), []), safe(allBalances(), []), safe(listTopups({ status: "pending", limit: 500 }), []), safe(listWithdrawals(), []),
    safe(listApplicants(), []), safe(listAdminNotices(100), []), safe(reconcile(), null as Recon | null),
  ]);
  const today = bkkDay(new Date()), month = today.slice(0, 7);
  const pf = (bucket: string) => bal.filter((r) => r.owner_type === "platform" && r.owner_id === PLATFORM && r.bucket === bucket).reduce((s, r) => s + r.balance, 0);
  const sum = (type: string, bucket: string) => bal.filter((r) => r.owner_type === type && r.bucket === bucket).reduce((s, r) => s + r.balance, 0);
  const done = bookings.filter((b) => b.status === "completed" && b.completed_at && bkkDay(new Date(b.completed_at)).startsWith(month));
  return {
    bookings: {
      today: bookings.filter((b) => bkkDay(new Date(b.starts_at)) === today && !["declined", "expired", "cancelled"].includes(b.status)).length,
      waiting: bookings.filter((b) => b.status === "requested").length,
      live: bookings.filter((b) => b.status === "accepted" || b.status === "checked_in").length,
      decide: bookings.filter((b) => b.status === "cancel_requested" || b.status === "disputed").length,
      monthDone: done.length,
      monthGmv: done.reduce((s, b) => s + b.total_satang, 0),
    },
    money: {
      revenue: pf("revenue"), escrow: pf("escrow"), bank: -pf("bank"), wht: pf("wht_payable"), partner: pf("partner_payable"),
      customerAvail: sum("customer", "available"), customerHeld: sum("customer", "held"),
      ptPending: sum("parttime", "pending"), ptAvail: sum("parttime", "available"), ptWithdrawing: sum("parttime", "withdrawing"),
    },
    queues: {
      topups: topups.length,
      withdrawRequested: wds.filter((w) => w.status === "requested").length,
      withdrawBatched: wds.filter((w) => w.status === "batched").length,
      withdrawSum: wds.filter((w) => w.status === "requested" || w.status === "batched").reduce((s, w) => s + w.net_satang, 0),
      kyc: apps.filter((a) => extraOf(a).kyc_status === "submitted").length,
      slips: apps.filter((a) => a.status === "pending_slip").length,
      applicants: apps.filter((a) => a.status === "verified").length,
    },
    alerts: { open: alerts.filter((a) => !a.read_at).length, sos: alerts.filter((a) => a.kind === "sos" && !a.read_at), latest: alerts.slice(0, 5) },
    recon,
  };
}

/** คีย์บริการภายนอกที่ตั้งแล้วหรือยัง (แสดงแค่ใช่/ไม่ — ไม่เปิดค่า) */
export function systemChecks() {
  const has = (...k: string[]) => k.every((x) => !!process.env[x]?.trim());
  return [
    { key: "db", label: "ฐานข้อมูล Supabase", ok: has("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"), need: "จำเป็น" },
    { key: "secret", label: "รหัสลงลายเซ็น session (ADMIN_SESSION_SECRET)", ok: (process.env.ADMIN_SESSION_SECRET?.length ?? 0) >= 32, need: "จำเป็น · ยาว ≥ 32 ตัว" },
    { key: "promptpay", label: "พร้อมเพย์รับเงิน", ok: has("NEXT_PUBLIC_PROMPTPAY_ID"), need: "จำเป็น" },
    { key: "slip2go", label: "Slip2Go ตรวจสลิปอัตโนมัติ", ok: has("SLIP2GO_API_SECRET"), need: "ไม่มี = ทุกสลิปเข้าคิวแอดมิน" },
    { key: "cron", label: "รอบรายวัน (CRON_SECRET)", ok: has("CRON_SECRET"), need: "จำเป็น · คืนเงิน/ปล่อยเงิน/กระทบยอด" },
    { key: "push", label: "แจ้งเตือนบนมือถือ (VAPID)", ok: has("VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"), need: "ไม่มี = แจ้งเตือนในแอปอย่างเดียว" },
    { key: "email", label: "อีเมล (Resend)", ok: has("RESEND_API_KEY", "EMAIL_FROM"), need: "ไม่มี = ลืมรหัสผ่าน/อีเมล SOS ไม่ส่ง" },
    { key: "sms", label: "SMS OTP (ThaiBulkSMS)", ok: has("THAIBULKSMS_API_KEY", "THAIBULKSMS_API_SECRET"), need: "ไม่มี = สมัครไม่ยืนยันเบอร์" },
    { key: "turnstile", label: "กันบอท (Turnstile)", ok: has("TURNSTILE_SECRET_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY"), need: "แนะนำ" },
    { key: "sheets", label: "Google Sheet ผู้สมัคร", ok: has("GOOGLE_SHEETS_WEBHOOK_URL"), need: "ไม่บังคับ" },
  ];
}
