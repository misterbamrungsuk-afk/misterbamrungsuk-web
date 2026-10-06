// ── Domain types (แชร์ทั้งฝั่ง demo-mode และ Prisma) ──
export type Gender = "male" | "female" | "other";
export type KycStatus = "none" | "pending" | "verified" | "rejected";
export type MemberStatus = "active" | "suspended" | "banned";
export type JobRole = "hirer" | "provider";
/** ลูกค้าจ่ายเต็มจำนวนครั้งเดียวตอนจอง (ไม่มีระบบมัดจำ) */
export type PaymentType = "full";
export type PaymentStatus = "created" | "slip_uploaded" | "confirmed" | "failed";
export type OrderStatus = "negotiated" | "paid" | "in_progress" | "completed" | "reviewed";

export interface MemberLite {
  id: string;
  name: string;
  avatar: string;
  gender: Gender | null;
  age: number | null;
  kycVerified: boolean;
  province?: string | null;
}

export interface Post {
  id: string;
  member: MemberLite;
  images: string[];
  categories: string[]; // slugs กิจกรรม (เท่ากับ activities)
  workingHours: string; // "12:00-23:00"
  languages: string[];
  acceptGender: "any" | "male" | "female";
  serviceArea: string;
  province: string;
  lat?: number;
  lng?: number;
  personality: string;
  interests: string;
  extraInfo: string;
  rules: string[];
  rating: number | null;
  reviewCount: number;
  expiresAt: string;
  isHidden: boolean;
  createdAt: string;
  /** วันที่ Part-Time เข้าร่วมแพลตฟอร์ม (ISO) — ใช้ดันหน้าใหม่ใน 30 วันแรก */
  joinedAt?: string;
  /** คิวว่างในอีกกี่นาที (0 = ว่างตอนนี้) — เดโมกำหนดตายตัว */
  nextFreeMin?: number;
  /** Part-Time กลุ่มพรีเมียม — เห็นได้เฉพาะสมาชิก/ผู้ได้รับของขวัญ */
  premium?: boolean;
  /** กิจกรรมที่รับ: slug จาก ACTIVITIES หรือข้อความที่ Part-Time พิมพ์เอง */
  activities: string[];
  /** สกิลพิเศษ (slug จาก SKILLS) — แท็กเท่านั้น ไม่มีค่าบริการเพิ่ม; "massage" = นวดผ่อนคลาย (ต้องมีใบรับรอง) */
  skills: string[];
  /** สถานที่ที่รับนัด (slug จาก PLACES) */
  places: string[];
  /** ราคาบล็อก 3 ชม. / 5 ชม. (หน่วยขายเดียว) */
  price3h: number;
  price5h: number;
  heightCm?: number;
  distanceKm?: number;
  yearsExp?: number;
  jobsDone?: number;
  responseRate?: number;
}

export interface Review {
  id: string;
  postId: string;
  reviewer: MemberLite;
  rating: number;
  content: string;
  createdAt: string;
}

export interface JobBoard {
  id: string;
  owner: MemberLite;
  role: JobRole;
  title: string;
  durationHours: number;
  scheduleDate: string; // ISO date
  startTime: string;
  endTime: string;
  placeName: string;
  province: string;
  lat: number;
  lng: number;
  budget: number;
  images: string[];
  interestedCount: number;
  isInterested: boolean;
  createdAt: string;
}

export interface ChatPayment {
  id: string;
  type: PaymentType;
  amount: number;
  status: PaymentStatus;
  bankLabel: string;
  slipUrl?: string;
  promoCode?: string;
  discount: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  kind: "text" | "image" | "payment" | "system";
  content: string;
  payment?: ChatPayment;
  createdAt: string;
  isRead: boolean;
}

export interface ChatRoom {
  id: string;
  partner: MemberLite;
  lastMessage: string;
  lastAt: string;
  unread: number;
  orderStatus: OrderStatus;
  paymentCreated: boolean;
  paymentConfirmed: boolean;
  reviewed: boolean;
  messages: ChatMessage[];
}

export interface Order {
  id: string;
  roomId: string;
  hirer: MemberLite;
  provider: MemberLite;
  status: OrderStatus;
  totalAmount: number;
  discount: number;
  promoCode?: string;
  commission: number;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  bankCode: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  isPromptPay: boolean;
}

export interface SavedReply {
  id: string;
  title: string;
  message: string;
}

export interface AppNotification {
  id: string;
  type: "kyc" | "post" | "job" | "chat" | "order";
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface PromoCode {
  code: string;
  type: "percent" | "fixed";
  value: number;
  active: boolean;
  usedCount: number;
  quota: number;
  /** ผู้รับภาระส่วนลด: A = แพลตฟอร์ม 100%, B = แพลตฟอร์ม 50% / ผู้ให้บริการ 50% */
  costModel?: PromoCostModel;
}

export type PromoCostModel = "A" | "B";

// ── ระบบกลาง (Escrow) ── วงจร: รับงาน → โอนเข้าระบบกลาง → ส่งงาน → รับเงิน
export type EscrowState =
  | "accepted"        // รับงานแล้ว — รอลูกค้าโอนเข้าระบบกลาง
  | "awaiting_check"  // ลูกค้าแนบสลิปแล้ว — ระบบตรวจสอบ
  | "funded"          // เงินถูกกันไว้กับระบบกลาง 🔒 — เพื่อนเริ่มงานได้
  | "in_progress"     // กำลังทำงาน
  | "delivered"       // เพื่อนส่งงานแล้ว — รอลูกค้ายืนยันรับงาน (หรือ auto-release 24 ชม.)
  | "released"        // ปล่อยเงินให้เพื่อนแล้ว (หัก GP) — ปิดงาน
  | "disputed";       // มีข้อพิพาท — แอดมินพิจารณา

export interface EscrowOrder {
  id: string;
  roomId: string;
  hirer: MemberLite;
  provider: MemberLite;
  title: string;
  hours: number;
  place: string;
  amount: number;       // ยอดเต็มที่ลูกค้าจ่าย
  gpPercent: number;    // ค่าธรรมเนียมระบบกลาง (%)
  state: EscrowState;
  slipUrl?: string;
  deliveredAt?: string;
  autoReleaseAt?: string;
  createdAt: string;
}
