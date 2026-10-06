// ข้อมูลตัวอย่างหลังบ้านแอดมิน (โหมดเดโม) — โหมดจริงดึงจาก API/DB
import { DEMO_MEMBERS } from "./demo-data";

const av = (i: number) => DEMO_MEMBERS[i % DEMO_MEMBERS.length].avatar;
const nm = (i: number) => DEMO_MEMBERS[i % DEMO_MEMBERS.length].name;

export type KycItem = { id: string; name: string; avatar: string; skills: string; submitted: string; docs: string[]; resubmit?: boolean };
export const KYC_QUEUE: KycItem[] = [
  { id: "k1", name: nm(2), avatar: av(2), skills: "คาเฟ่ · ดูหนัง · นวดผ่อนคลาย", submitted: "10 นาที", docs: ["หน้าบัตร", "ถือบัตรคู่หน้า", "ใบรับรองนวดผ่อนคลาย"] },
  { id: "k2", name: nm(3), avatar: av(3), skills: "ออฟฟิศซินโดรม", submitted: "1 ชม.", docs: ["หน้าบัตร", "ถือบัตรคู่หน้า"] },
  { id: "k3", name: nm(6), avatar: av(6), skills: "กิน & เที่ยว · ช่างภาพ · นวดผ่อนคลาย", submitted: "3 ชม.", docs: ["หน้าบัตร", "ถือบัตรคู่หน้า", "ใบรับรองนวดผ่อนคลาย"] },
  { id: "k4", name: nm(5), avatar: av(5), skills: "ออกกำลัง", submitted: "เมื่อวาน", docs: ["หน้าบัตร", "ถือบัตรคู่หน้า"], resubmit: true },
];

export type OrderStatus = "held" | "in_progress" | "awaiting_release" | "released" | "disputed" | "cancelled";
export type AdminOrder = { id: string; customer: string; partTime: string; avatar: string; service: string; amount: number; status: OrderStatus; when: string; place: string };
export const ADMIN_ORDERS: AdminOrder[] = [
  { id: "HM-24091", customer: "ม.", partTime: nm(0), avatar: av(0), service: "ดินเนอร์ + ดูหนัง 3 ชม.", amount: 2400, status: "held", when: "วันนี้ 19:00", place: "อโศก" },
  { id: "HM-24090", customer: "ก.", partTime: nm(1), avatar: av(1), service: "บัดดี้วิ่ง 3 ชม.", amount: 1900, status: "released", when: "เมื่อวาน 18:00", place: "อารีย์" },
  { id: "HM-24088", customer: "ป.", partTime: nm(2), avatar: av(2), service: "คาเฟ่ + ถ่ายรูป 5 ชม.", amount: 3800, status: "disputed", when: "เมื่อวาน 20:00", place: "ทองหล่อ" },
  { id: "HM-24087", customer: "ส.", partTime: nm(3), avatar: av(3), service: "นั่งชิล 3 ชม.", amount: 2100, status: "in_progress", when: "วันนี้ 14:00", place: "สาทร" },
  { id: "HM-24085", customer: "ว.", partTime: nm(5), avatar: av(5), service: "ช้อปปิ้ง 5 ชม.", amount: 3500, status: "awaiting_release", when: "วันนี้ 12:00", place: "เอกมัย" },
  { id: "HM-24082", customer: "จ.", partTime: nm(6), avatar: av(6), service: "คาเฟ่ 3 ชม.", amount: 1800, status: "cancelled", when: "จ. 10:00", place: "พระราม 9" },
];

export const STATUS_LABEL: Record<OrderStatus, { th: string; tone: "gold" | "red" | "muted" | "green" }> = {
  held: { th: "เงินถูกกัน", tone: "gold" },
  in_progress: { th: "ระหว่างนัด", tone: "muted" },
  awaiting_release: { th: "รอปล่อยเงิน", tone: "muted" },
  released: { th: "ปล่อยแล้ว", tone: "green" },
  disputed: { th: "ข้อพิพาท", tone: "red" },
  cancelled: { th: "ยกเลิก", tone: "muted" },
};

export type Payout = { id: string; name: string; avatar: string; account: string; jobs: number; gross: number; hold?: boolean };
export const PAYOUTS: Payout[] = [
  { id: "w1", name: nm(0), avatar: av(0), account: "กสิกร ••1234", jobs: 3, gross: 2700 },
  { id: "w2", name: nm(1), avatar: av(1), account: "พร้อมเพย์ ••5678", jobs: 2, gross: 1400 },
  { id: "w3", name: nm(2), avatar: av(2), account: "SCB ••9012", jobs: 1, gross: 1200, hold: true },
  { id: "w4", name: nm(5), avatar: av(5), account: "กรุงไทย ••3456", jobs: 4, gross: 3600 },
];

export type Report = { id: string; target: string; avatar?: string; by: string; reason: string; severity: "high" | "mid" | "low"; ref?: string; at: string };
export const REPORTS: Report[] = [
  { id: "r1", target: `${nm(4)} (Part-Time)`, avatar: av(4), by: "ลูกค้า ร.", reason: "พฤติกรรมไม่เหมาะสม", severity: "high", ref: "HM-24079", at: "15 นาที" },
  { id: "r2", target: `${nm(7)} (โพสต์)`, avatar: av(7), by: "ลูกค้า น.", reason: "รูปโปรไฟล์ไม่ตรงปก", severity: "mid", at: "2 ชม." },
  { id: "r3", target: "ลูกค้า ท.", by: `Part-Time ${nm(3)}`, reason: "ลูกค้าไม่อยู่ตามนัด (รอครบ 15 นาที)", severity: "low", ref: "HM-24070", at: "เมื่อวาน" },
];

export type Ticket = { id: string; by: string; topic: string; cat: string; status: "new" | "doing" | "closed"; ref?: string; at: string; owner?: string };
export const TICKETS: Ticket[] = [
  { id: "c1", by: "ลูกค้า ม.", topic: "อยู่ด้วยไม่ครบเวลาที่จอง", cat: "ข้อพิพาท", status: "new", ref: "HM-24091", at: "5 นาที" },
  { id: "c2", by: "ลูกค้า ส.", topic: "อัปโหลดสลิปไม่ได้", cat: "การชำระเงิน", status: "new", at: "20 นาที" },
  { id: "c3", by: "ลูกค้า ว.", topic: "ขอลบบัญชี (PDPA)", cat: "บัญชี", status: "new", at: "1 ชม." },
  { id: "c4", by: `Part-Time ${nm(1)}`, topic: "ยอดถอนยังไม่เข้า", cat: "ถอนเงิน", status: "doing", at: "3 ชม.", owner: "แอดมิน A" },
  { id: "c5", by: `Part-Time ${nm(5)}`, topic: "ขอแก้ชื่อในบัตร", cat: "KYC", status: "doing", at: "เมื่อวาน", owner: "แอดมิน B" },
];

export type AdminMember = { id: string; name: string; avatar?: string; role: "parttime" | "customer"; kyc: boolean; jobs: number; rating: number; strikes: number; suspended: boolean };
export const MEMBERS: AdminMember[] = [
  { id: "m1", name: nm(4), avatar: av(4), role: "parttime", kyc: true, jobs: 58, rating: 4.6, strikes: 2, suspended: false },
  { id: "m2", name: nm(0), avatar: av(0), role: "parttime", kyc: true, jobs: 412, rating: 4.9, strikes: 1, suspended: false },
  { id: "m3", name: nm(1), avatar: av(1), role: "parttime", kyc: true, jobs: 203, rating: 5.0, strikes: 0, suspended: false },
  { id: "m4", name: "ลูกค้า ม.", role: "customer", kyc: false, jobs: 12, rating: 4.8, strikes: 0, suspended: false },
  { id: "m5", name: "ลูกค้า ท.", role: "customer", kyc: false, jobs: 3, rating: 3.2, strikes: 3, suspended: true },
];

export type AuditEntry = { id: string; at: string; type: "SOS" | "การเงิน" | "ออเดอร์" | "สมาชิก" | "KYC" | "โปรโมชัน" | "CS"; text: string; actor: string };
export const AUDIT: AuditEntry[] = [
  { id: "a1", at: "14:21", type: "SOS", text: "ลูกค้ากด SOS · HM-24077 · อโศก", actor: "ระบบ" },
  { id: "a2", at: "14:02", type: "ออเดอร์", text: "ปิดงาน HM-24060", actor: "แอดมิน A" },
  { id: "a3", at: "13:55", type: "การเงิน", text: `ยืนยันโอน ฿2,160 ให้ ${nm(0)}`, actor: "แอดมิน B" },
  { id: "a4", at: "13:48", type: "สมาชิก", text: "ระงับอัตโนมัติ ลูกค้า ท. (ครบ 3 strike)", actor: "ระบบ" },
  { id: "a5", at: "13:30", type: "KYC", text: `อนุมัติ KYC ${nm(1)} · มอบตรา ✓`, actor: "แอดมิน A" },
  { id: "a6", at: "13:12", type: "การเงิน", text: "ปล่อยเงินอัตโนมัติ HM-24031 (ครบ 24 ชม.)", actor: "ระบบ" },
  { id: "a7", at: "12:05", type: "CS", text: "คืนเงินบางส่วน ฿267 · HM-24012", actor: "แอดมิน A" },
];

export const WEEKLY = [
  { label: "สัปดาห์ 1", gmv: 48000, gp: 9600 },
  { label: "สัปดาห์ 2", gmv: 62500, gp: 12500 },
  { label: "สัปดาห์ 3", gmv: 71000, gp: 14200 },
  { label: "สัปดาห์ 4", gmv: 84500, gp: 16900 },
];
