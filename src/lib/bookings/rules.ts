import "server-only";
import { getMoney } from "@/lib/wallet/settings";

// กติกาเงินลูกค้า + เปลี่ยนแปลงนัด — อ่านจากตั้งค่าการเงิน (_config/money.json) ถ้ามีช่องนั้น ไม่มี = ค่าเริ่มต้นด้านล่าง
// (ช่องใหม่ยังไม่อยู่ในหน้าแอดมิน "กระเป๋าเงิน" — เพิ่มใน MoneySettings ได้ภายหลังโดยไม่ต้องแก้ไฟล์นี้)
export type CustomerRules = {
  custMinWithdraw: number;     // ลูกค้าถอนขั้นต่ำ (บาท)
  rescheduleMinHours: number;  // ขอเปลี่ยนเวลาได้ก่อนเวลานัดเดิมอย่างน้อยกี่ชม.
  rescheduleWaitHours: number; // เพื่อนต้องตอบคำขอเปลี่ยนเวลาภายในกี่ชม. (และไม่เกินเวลานัดเดิม)
  extendMaxHours: number;      // ต่อเวลาระหว่างนัดรวมได้สูงสุดกี่ชม.
  extendWaitMinutes: number;   // เพื่อนต้องตอบคำขอต่อเวลาภายในกี่นาที
};
export const DEFAULT_CUSTOMER_RULES: CustomerRules = { custMinWithdraw: 100, rescheduleMinHours: 3, rescheduleWaitHours: 12, extendMaxHours: 3, extendWaitMinutes: 30 };

const num = (v: unknown, d: number, lo: number, hi: number) => { const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? n : d; };
export async function getCustomerRules(): Promise<CustomerRules> {
  const m = (await getMoney().catch(() => ({}))) as Partial<CustomerRules>;
  const d = DEFAULT_CUSTOMER_RULES;
  return {
    custMinWithdraw: num(m.custMinWithdraw, d.custMinWithdraw, 1, 100000),
    rescheduleMinHours: num(m.rescheduleMinHours, d.rescheduleMinHours, 0, 168),
    rescheduleWaitHours: num(m.rescheduleWaitHours, d.rescheduleWaitHours, 1, 72),
    extendMaxHours: Math.round(num(m.extendMaxHours, d.extendMaxHours, 1, 6)),
    extendWaitMinutes: num(m.extendWaitMinutes, d.extendWaitMinutes, 5, 120),
  };
}
