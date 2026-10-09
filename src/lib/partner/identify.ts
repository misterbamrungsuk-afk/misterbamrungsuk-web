import "server-only";
import { currentPartner, verifyApplyToken } from "./auth";
import { listPurchases } from "./portal";
import { getPartner, type Partner } from "./store";
import { partnerTimeline, type TimelineStep } from "./status";

// ระบุตัวพาร์ทเนอร์สำหรับหน้าสมัครสำเร็จ / นัด QC: token จากฟอร์มสมัคร (?t=) ก่อน ไม่มีก็ใช้เซสชันที่ล็อกอิน
export async function partnerFromTokenOrSession(token: string | null | undefined): Promise<Partner | null> {
  const pid = verifyApplyToken(token);
  if (pid) return getPartner(pid).catch(() => null);
  return currentPartner();
}

/** ไทม์ไลน์สถานะจากข้อมูลจริง (partners + สลิปล่าสุดใน partner_purchases) */
export async function timelineFor(p: Partner): Promise<TimelineStep[]> {
  const last = (await listPurchases(p.id).catch(() => []))[0];
  return partnerTimeline({ ...p, pay: last?.status ?? null });
}
