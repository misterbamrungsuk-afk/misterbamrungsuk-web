// ค่าคงที่ + ตัวช่วยของหน้า Part-Time ที่ใช้ได้ทั้งฝั่ง server และ client (ไม่มีโค้ดฝั่งเซิร์ฟเวอร์ · import แค่ type)
// ห้าม export ค่าแบบนี้จากไฟล์ "use client" — หน้า server จะได้ reference แทนค่าจริง
import type { Extra, ProfileCard } from "./store";

/** Part-Time ที่ "ใช้งานจริง" ได้ = ทีมงานอนุมัติ KYC แล้ว และเปิดโปรไฟล์ให้ลูกค้าเห็นแล้ว (กระเป๋า/โปรโมท/ชวนเปิดเมม/ประกาศ) */
export const isPtActive = (x: Pick<Extra, "kyc_status" | "listed">) => x.kyc_status === "approved" && !!x.listed;
export const GATE_SHORT = "เปิดใช้หลังทีมงานอนุมัติ";
export const GATE_MSG = "เปิดใช้หลังทีมงานอนุมัติเอกสารยืนยันตัวตนและเปิดโปรไฟล์ให้ลูกค้าเห็นแล้ว";

/** ข้อความสำเร็จรูปเริ่มต้น — ทีม Part-Time เป็นผู้ชาย ใช้ "ครับ" ทุกที่ (หน้าตั้งค่า + หน้าข้อความตอบกลับเร็ว + แชท) */
export const QUICK_DEFAULT = ["ได้รับการจองแล้วครับ ขอบคุณที่เลือกผมนะครับ", "กำลังเดินทางครับ อีกประมาณ 10 นาที", "ถึงจุดนัดแล้วครับ รออยู่หน้าล็อบบี้"];
export const AUTO_REPLY_DEFAULT = "ขอบคุณที่ทักมานะครับ ตอนนี้ยังไม่สะดวก จะรีบตอบภายใน 1 ชม.";

/** ชนิดรายการในกระเป๋า → คำไทย (หน้า "รายได้ของฉัน") */
export const TX_KIND_TH: Record<string, string> = {
  split: "รายได้จากงาน", mature: "ปล่อยเงิน · ถอนได้", withdraw_req: "ขอถอน", withdraw_paid: "โอนแล้ว", withdraw_fail: "โอนไม่สำเร็จ · คืนยอด", adjust: "ปรับยอดโดยทีมงาน",
  commission: "ค่าคอมชวนเปิดเมม", boost: "ซื้อโปรโมทโปรไฟล์", promo: "โปรโมชัน", gift: "ของขวัญ", member: "สมาชิก", sales_payout: "โอนค่าคอม", refund: "คืนเงิน", reversal: "กลับรายการ",
  topup: "เติมเงิน", hold: "พักเงิน", confirm: "ยืนยันนัด", release: "คืนยอดพัก", market_sale: "ขายสินค้า", payout: "จ่ายเงิน",
};

/** สถานะการจอง → ป้ายภาษาไทย + สี (หน้า "งาน" ส่วนประวัติ) */
export const BOOKING_STATUS_TH: Record<string, [string, string]> = {
  requested: ["รอตอบรับ", "#e8c472"], accepted: ["ยืนยันแล้ว", "#e8c472"], checked_in: ["ถึงจุดนัดแล้ว", "#e8c472"], cancel_requested: ["ลูกค้าขอยกเลิก · รอทีมงาน", "#f0a35a"],
  completed: ["จบงานแล้ว", "#7fd6a3"], declined: ["ไม่สะดวก (ปฏิเสธ)", "#b5a596"], expired: ["หมดเวลาตอบรับ", "#b5a596"], cancelled: ["ยกเลิกแล้ว", "#b5a596"],
  refunded: ["คืนเงินลูกค้าแล้ว", "#ff8a9a"], disputed: ["อยู่ระหว่างตรวจสอบโดยทีมงาน", "#f0a35a"],
};

/** "นวดผ่อนคลาย" ต้องมีใบรับรองการนวด (cert_doc) ก่อนแสดงต่อลูกค้า */
export const MASSAGE_SKILL = "massage";
export const isMassage = (s: string) => /นวด/.test(s);
export const CERT_MSG = "นวดผ่อนคลายต้องแนบใบรับรองการนวดก่อน · แนบได้ที่ใบสมัครขั้นที่ 2 (วันเวลาที่รับงาน)";
/** ตัดกิจกรรม/สกิลนวดออกถ้ายังไม่มีใบรับรอง — คืนการ์ดใหม่ + รายการที่ถูกตัด */
export function dropMassage(card: ProfileCard, hasCert: boolean): { card: ProfileCard; dropped: string[] } {
  if (hasCert) return { card, dropped: [] };
  const dropped = [...card.activities.filter(isMassage), ...(card.skills.includes(MASSAGE_SKILL) ? ["นวดผ่อนคลาย"] : [])];
  return { card: { ...card, activities: card.activities.filter((a) => !isMassage(a)), skills: card.skills.filter((s) => s !== MASSAGE_SKILL) }, dropped };
}

/** ลิงก์ในแจ้งเตือน → หน้าของ Part-Time (แจ้งเตือนบางชนิดชี้หน้าลูกค้า เช่น /chat/<id>, /jobs) · แนบ ?t= ถ้าเข้าด้วยลิงก์ */
export function ptNoticeHref(mb: string, t: string, url: string | null | undefined): string {
  const withT = (p: string) => (!t || /[?&]t=/.test(p) ? p : `${p}${p.includes("?") ? "&" : "?"}t=${encodeURIComponent(t)}`);
  const base = `/join/profile/${mb}`;
  const u = (url ?? "").trim();
  const id = /^\/(?:chat|order)\/([0-9a-f-]{36})/.exec(u)?.[1];
  if (id) return withT(`${base}/chat/${id}`);
  if (u.startsWith(base)) return withT(u);
  if (u.startsWith("/join/")) return withT(u);
  if (/^\/jobs\b/.test(u)) return withT(`${base}/jobs`);
  if (/^\/wallet\b/.test(u)) return withT(`${base}/earnings`);
  return withT(u ? `${base}/jobs` : base);
}
