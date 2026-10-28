// ─────────────────────────────────────────────────────────────
//  ค่าที่เจ้าของต้องแก้ทั้งหมดอยู่ไฟล์นี้ที่เดียว
//  ค่าที่ขึ้นต้นด้วย [ตัวอย่าง] ยังรอข้อมูลจริงจากเจ้าของ (ดูชีต Follow up Dev)
// ─────────────────────────────────────────────────────────────

/** แบรนด์ของหน้ารับสมัคร (รหัสสมาชิก MB = Mister Bamrungsuk) */
export const BRAND = { name: "Mister Bamrungsuk", short: "MB", domain: "www.misterbamrungsuk.com" };

// ⚠️ ยอดชำระตอนสมัคร = "ค่าสมัคร" ยอดเดียว (รวมค่าอบรมแล้ว) · ไม่คืนเงินทุกกรณี (บอสกำหนด 20 ต.ค. 2569)
//    เจ้าของเปลี่ยนตัวเลขได้ที่นี่ที่เดียว · สายคำเชิญจ่ายเต็มเท่ากัน (ลิงก์เชิญเป็นแค่ช่องทางเข้า)
const fmtN = (n: number) => n.toLocaleString("en-US");
/** สมัคร Part-Time ฟรีทุกคน (บอสสั่ง 28 ต.ค. 2569) — ไม่ต้องโอนตอนสมัคร · หักค่าสมัครจากงาน ฿500/งาน จนครบ ฿10,000 (work-bond.ts JOB_FEE) · false = กลับไปเก็บค่าสมัครตาม PACKAGES */
export const SIGNUP_FREE = true;

export const PACKAGES = {
  A: {
    name: "เพื่อนกินเที่ยว – ตามความสามารถพิเศษ",
    short: "เพื่อนกินเที่ยว",
    track: "ตามความสามารถพิเศษ",
    price: 9500,
    hours: "3-8",
    items: [
      "คอร์สอบรมบุคลิกภาพ มารยาท และการดูแลลูกค้า",
      "งานละ 3–8 ชม. แล้วแต่ระยะเวลาที่ลูกค้าเลือก",
    ] as readonly string[],
  },
  B: {
    name: "เพื่อนกินเที่ยว – พร้อมทักษะการนวด",
    short: "เพื่อนกินเที่ยว",
    track: "ที่มีความสามารถในการนวด",
    price: 15900,
    hours: "3-5",
    items: [
      "คอร์สอบรมบุคลิกภาพ + มาตรฐานการนวด",
      "รับยูนิฟอร์มฟรี (เสื้อยืด + กางเกงขาสั้น) + Massage Oil 1 เซ็ต",
      "งานละ 3–5 ชม. แล้วแต่ระยะเวลาที่ลูกค้าเลือก",
    ] as readonly string[],
  },
};
export type PackageKey = keyof typeof PACKAGES;

/** ค่าสมัครครอบคลุมอะไรบ้าง (แสดงหน้า sale / ชำระเงิน / ใบเสร็จ) */
export const FEE_INCLUDES = (k: PackageKey) => [
  k === "B" ? "อบรมบุคลิกภาพ + มาตรฐานการนวด" : "อบรมบุคลิกภาพ มารยาท และการดูแลลูกค้า",
  "แชร์ข้อมูลทางกฎหมายที่เกี่ยวข้องกับการทำงาน",
  "แชร์ทริคมัดใจลูกค้า",
  ...(k === "B" ? ["ยูนิฟอร์ม + Massage Oil 1 เซ็ต ฟรี"] : []),
];

/** เงื่อนไขค่าสมัคร */
export const FEE_NOTE = "ค่าสมัครรวมค่าอบรมแล้ว · ไม่คืนเงินทุกกรณี";

/** รายการค่าใช้จ่าย (บรรทัดเดียว) · amount = ยอดที่ผู้สมัครจ่ายจริง (ใบเก่าก่อนเปลี่ยนราคายังแสดงยอดเดิม) */
export function feeBreakdown(k: PackageKey, amount?: number | null) {
  return [{ name: "ค่าสมัคร (รวมค่าอบรม)", note: `(${FEE_INCLUDES(k).slice(1, 3).join(" · ")} · ไม่คืนเงิน)`, amount: amount ?? PACKAGES[k].price }];
}

/** เกณฑ์อายุรับสมัคร (ปีเต็ม) — ทั้งสองสาย 20–50 */
export const AGE_LIMITS: Record<PackageKey, { min: number; max: number }> = {
  A: { min: 20, max: 50 },
  B: { min: 20, max: 50 },
};

/** ตรวจอายุตามสายงาน — คืนข้อความผิดพลาดภาษาไทย หรือ null ถ้าผ่าน */
export function ageError(pkg: PackageKey, age: number | null): string | null {
  if (age === null) return "กรอกวันเกิด";
  const { min, max } = AGE_LIMITS[pkg];
  if (age < min) return `ต้องอายุ ${min} ปีบริบูรณ์ขึ้นไป`;
  if (age > max) return `รับอายุไม่เกิน ${max} ปี (ปัจจุบัน ${age} ปี)`;
  return null;
}

/** รับจำนวนจำกัด */
export const QUOTA = 50;
/** เปิดรับสมัคร 20 ต.ค. – 10 พ.ย. 2569 (เวลาไทย) */
export const OPEN_AT = "2026-10-20T00:00:00+07:00";
export const CLOSE_AT = "2026-11-10T23:59:59+07:00";

/** ไทม์ไลน์โครงการ (แสดงบนหน้า landing) */
export const TIMELINE = [
  { t: "เปิดรับสมัคร", d: "20 ต.ค. – 10 พ.ย." },
  { t: "ประกาศกฎเกณฑ์การทำงาน", d: "ไม่เกินต้น พ.ย." },
  { t: "อบรมกลุ่ม 1", d: "ภายใน 20 พ.ย." },
  { t: "พร้อมเปิดให้บริการ", d: "30 พ.ย." },
  { t: "อบรมกลุ่ม 2", d: "30 พ.ย. – ต้น ธ.ค." },
];

/** กลุ่มอบรม (แอดมินจัดกลุ่ม) — capacity แก้ได้ */
export const COHORTS = [
  { key: "1", name: "กลุ่ม 1", date: "ภายใน 20 พ.ย. 69", capacity: 25 },
  { key: "2", name: "กลุ่ม 2", date: "30 พ.ย. – ต้น ธ.ค. 69", capacity: 25 },
  { key: "3", name: "กลุ่ม 3", date: "รอประกาศ", capacity: 25 },
] as const;

/** กิจกรรมที่ทำได้ */
export const ACTIVITIES = ["กิน & เที่ยว", "ช่างภาพ", "ออกกำลัง", "คาเฟ่", "วิดีโอคอล", "ดูหนัง", "นั่งชิล", "อื่น ๆ"] as const;
/** ตัวเลือก "อื่น ๆ" ใน TALENTS/ACTIVITIES → ต้องระบุข้อความเพิ่ม (≤ OTHER_MAX ตัวอักษร) */
export const OTHER_OPTION = "อื่น ๆ";
export const OTHER_MAX = 100;
/** ช่วงเวลาที่สะดวก */
export const TIME_SLOTS = ["เช้า", "บ่าย", "เย็น", "ดึก"] as const;

export const BANK = {
  bank: "ธนาคารกสิกรไทย (K Bank)",
  accountNo: "191-2-49978-9",
  accountName: "นส.พรหมระพี ภรณ์ภาสิทธิ์",
  /** รูป QR รับเงิน: บันทึกรูปจากแชทไว้ที่ join/public/qr.png แล้วใส่ "/qr.png" — ว่างไว้ = แสดงเลขบัญชีแทน */
  qrImage: "",
  /** หมายเลขพร้อมเพย์ของบัญชีรับเงิน (เบอร์มือถือหรือเลขบัตร) → สร้าง QR ฝังยอดอัตโนมัติ; ตั้งใน env NEXT_PUBLIC_PROMPTPAY_ID */
  // ว่าง ("") = ปิด QR → ทุกหน้าจ่ายเงินแสดงเลขบัญชี + ปุ่มคัดลอกแทน (components/bank-transfer) · 22 ต.ค. 2569 รอเบอร์พร้อมเพย์ใหม่
  // 22 ต.ค. 2569: เปลี่ยนเป็น 088-639-5324 (ทดสอบสแกน QR 1 บาทผ่านแล้ว) · 0970592995 เดิมไม่ได้ผูกพร้อมเพย์
  // ไม่อ่าน env NEXT_PUBLIC_PROMPTPAY_ID เดิม (อาจยังเป็นเบอร์เก่าบน Vercel) → ใช้ NEXT_PUBLIC_PROMPTPAY_ID_V2 ถ้าจะเปลี่ยนผ่าน env
  promptPayId: process.env.NEXT_PUBLIC_PROMPTPAY_ID_V2 || "0886395324",
};

/** LINE OA สำหรับยืนยันคิวอบรม */
/** LINE Official Account (ใหม่ 21 ต.ค. 2569 · lin.ee/rnqFY2n → @350oyqnc) */
export const LINE_OA_ID = "@350oyqnc";
export const lineAddUrl = () => "https://lin.ee/rnqFY2n";
/** กลุ่ม LINE ทั้งหมด (บอสให้ 28 ต.ค. 2569 · Canva "Update MB" หน้า 5) — หน้า /admin/line-groups แสดงเป็นปุ่มเข้ากลุ่ม
 *  pt = กลุ่มของ Part-Time (ปุ่มในโปรไฟล์/หน้าสมัครเสร็จ ตามหมวด + ระดับ) · team = ทีมงานภายใน · other = กลุ่มอื่น */
export type LineGroup = { key: string; label: string; url: string; kind: "pt" | "team" | "other"; note?: string };
export const LINE_GROUP_LIST: LineGroup[] = [
  { key: "secret_man", label: "Secret MBMS (หนุ่มหล่อ)", url: "https://line.me/ti/g/HWVAy7kW9g", kind: "pt", note: "สมัครผ่านลิงก์เชิญ Secret · หนุ่มหล่อ" },
  { key: "secret_tom", label: "Secret MBTS (ทอมหล่อ)", url: "https://line.me/ti/g/yt9XSYW_xA", kind: "pt", note: "สมัครผ่านลิงก์เชิญ Secret · ทอมหล่อ" },
  { key: "man", label: "กลุ่ม หนุ่มหล่อ MBM01", url: "https://line.me/ti/g/Fmv_gqJQmF", kind: "pt", note: "หนุ่มหล่อที่สมัครทางอื่น (สมัครเอง · ลิงก์เชิญ TOP · Recruit)" },
  // ลิงก์ในสไลด์เหมือน MBM01 ทุกตัวอักษร — รอบอสยืนยันลิงก์ทอมหล่อ
  { key: "tom", label: "กลุ่ม ทอมหล่อ MBT01", url: "https://line.me/ti/g/Fmv_gqJQmF", kind: "pt", note: "ทอมหล่อที่สมัครทางอื่น (สมัครเอง · ลิงก์เชิญ TOP · Recruit)" },
  { key: "tom_premium", label: "The tom พรีเมี่ยม", url: "https://line.me/ti/g/PK4djenHv2", kind: "other" },
  { key: "find_boys", label: "หาเด็กผู้ชาย", url: "https://line.me/ti/g/zA8kNb8was", kind: "other" },
  { key: "mkt", label: "MKT & Consult", url: "https://line.me/ti/g/fm4uNS54tx", kind: "team" },
  { key: "dev", label: "Programmer", url: "https://line.me/ti/g/BHqCnYDjSr", kind: "team" },
  { key: "mgmt", label: "Management team", url: "https://line.me/ti/g/hSK6tSGwhc", kind: "team" },
  { key: "company", label: "บริษัท มิสเตอร์บำรุงสุข บาย มาดามกอ จำกัด", url: "https://line.me/ti/g/2xZpcMd5kw", kind: "team" },
  { key: "admin", label: "Admin MR.Bamrungsuk", url: "https://line.me/ti/p/2qGPpbXqQA", kind: "team", note: "บัญชีแอดมิน (แชทส่วนตัว)" },
];
const lineGroup = (k: string) => LINE_GROUP_LIST.find((g) => g.key === k)!;
/** ลิงก์กลุ่ม LINE ของผู้สมัคร: ชำระแล้ว = ทีมงานอนุมัติสลิป / สมัครฟรี (verified) หรือ Slip2Go ยืนยันยอดตรง · ยังไม่ชำระ = null
 *  แยกตามช่องทางที่สมัครมา (บอส 28 ต.ค. 2569): ลิงก์เชิญ Secret → กลุ่ม Secret MBMS/MBTS · ทางอื่น → MBM01/MBT01 (ตามหมวด)
 *  ใช้ via ที่บันทึกตอนสมัคร (แอดมินเปลี่ยนระดับทีหลังไม่ย้ายกลุ่ม) · ใบเก่าที่ไม่มี via → ลิงก์เชิญ + ระดับ Secret */
export function ptLineGroupKey(x: { group?: "tom" | null; tier?: string | null; via?: string | null; invite?: string | null }): string {
  const secret = x.via ? x.via === "secret" : !!x.invite && x.tier === "secret";
  return `${secret ? "secret_" : ""}${x.group === "tom" ? "tom" : "man"}`;
}
export function ptLineGroup(row: { status: string }, x: { group?: "tom" | null; tier?: string | null; via?: string | null; invite?: string | null; slip_check?: { verdict?: string } | null }): { key: string; url: string; label: string } | null {
  const paid = row.status === "verified" || x.slip_check?.verdict === "ok";
  if (!paid) return null;
  const g = lineGroup(ptLineGroupKey(x));
  return { key: g.key, url: g.url, label: `เข้ากลุ่ม LINE ${g.label}` };
}

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1745270029066-8c1dfb37c03c?auto=format&fit=crop&w=1200&q=75";

/** สรุปเงื่อนไขที่ผู้สมัครติ๊กยอมรับก่อนชำระเงิน */
export const TERMS_SUMMARY = [
  "ชำระค่าสมัคร (รวมค่าอบรม) เต็มจำนวนตามสายงานที่เลือก",
  "ค่าสมัครไม่คืนเงินทุกกรณี",
  "ไม่ปฏิเสธการรับลูกค้าโดยไม่มีเหตุผลอันสมควร",
  "30 วันแรกหลังเปิดรับงาน ถ้าได้งานไม่ถึง 5 เคส รับโค้ดโปรโมทโปรไฟล์ฟรี 3 วัน",
  "บริการทั้งหมดเป็นการเป็นเพื่อนร่วมกิจกรรม (สาย B มีความสามารถในการนวดเป็นทักษะเพิ่มเติม) เท่านั้น ไม่มีบริการทางเพศทุกรูปแบบ",
];

/** สัญญาฉบับเต็ม แสดงหลังชำระเงิน — [ตัวอย่าง] รอเนื้อหาจริงจากเจ้าของ */
export const CONTRACT = [
  { h: "1. คู่สัญญา", p: "[ตัวอย่าง] สัญญานี้ทำขึ้นระหว่าง Mister Bamrungsuk (“บริษัท”) กับผู้สมัครตามรหัสสมาชิกที่ระบุ (“ผู้สมัคร”)" },
  { h: "2. การอบรม", p: "[ตัวอย่าง] บริษัทจัดอบรมตามสายงานที่ผู้สมัครเลือก วันและสถานที่แจ้งทาง LINE อย่างน้อย 7 วันล่วงหน้า" },
  { h: "3. ค่าสมัคร", p: `[ตัวอย่าง] ${FEE_NOTE}` },
  { h: "4. ขอบเขตงาน", p: "[ตัวอย่าง] งานทั้งหมดเป็นการเป็นเพื่อนร่วมกิจกรรมในที่สาธารณะ (สาย B มีความสามารถในการนวดเป็นทักษะเพิ่มเติม) ห้ามให้หรือรับบริการทางเพศ ฝ่าฝืนบริษัทยกเลิกสมาชิกทันที" },
  { h: "5. ข้อมูลส่วนบุคคล", p: "[ตัวอย่าง] บริษัทเก็บข้อมูลเท่าที่จำเป็นต่อการคัดเลือกและจัดงาน และลบเมื่อผู้สมัครร้องขอตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล" },
];

/** คำถามที่พบบ่อย (ตามบอร์ด Join) */
export const FAQ = [
  { q: "ค่าสมัครรวมอะไรบ้าง คืนได้ไหม?", a: `ค่าสมัคร ${fmtN(PACKAGES.A.price)} บาท (เพื่อนกินเที่ยว) หรือ ${fmtN(PACKAGES.B.price)} บาท (สายนวด) รวมค่าอบรมแล้ว ได้แชร์ข้อมูลทางกฎหมายที่เกี่ยวข้องกับการทำงานและทริคมัดใจลูกค้า · ไม่คืนเงินทุกกรณี` },
  { q: "ถ้าเริ่มงานแล้วยังไม่ค่อยมีลูกค้า?", a: "30 วันแรกหลังเปิดรับงาน ถ้าได้งานไม่ถึง 5 เคส ระบบให้โค้ดโปรโมทโปรไฟล์ฟรี 3 วัน ขึ้นหน้าแนะนำให้ลูกค้าเห็นก่อน" },
  { q: "งานนี้ทำอะไรบ้าง?", a: "เป็นเพื่อนร่วมกิจกรรมของลูกค้า เช่น ทานข้าว เที่ยว ดูหนัง ถ่ายรูป ไม่มีบริการทางเพศใด ๆ ทั้งสิ้น" },
  { q: "จะได้รายได้เท่าไหร่?", a: "ขึ้นกับสายงาน ระดับ (TOP / Silver) และจำนวนนัดต่อเดือน ส่วนแบ่ง 40–60% ของราคานัด และทิปได้เต็ม 100% ลองคำนวณได้ที่หน้า “รายได้และส่วนแบ่ง”" },
  { q: "ไม่เคยมีประสบการณ์ สมัครได้ไหม?", a: "ได้ ทุกคนจะได้อบรมก่อนเริ่มรับงาน" },
  { q: "ต้องตรวจประวัติอะไรบ้าง?", a: "ยืนยันตัวตนด้วยบัตรประชาชน และยินยอมให้ตรวจประวัติอาชญากรรมก่อนเปิดบัญชี" },
];

/** การ์ดสายงานบนหน้า sale (ตามบอร์ด Join) — ตัวเลขดึงจาก PACKAGES */
export const SALE_CARDS: Record<PackageKey, { lines: { k: string; v: string }[] }> = {
  A: { lines: [{ k: "ค่าสมัคร (รวมอบรม)", v: `${fmtN(PACKAGES.A.price)} บาท` }, { k: "การให้บริการต่อครั้ง", v: "3–8 ชม." }] },
  B: { lines: [{ k: "ค่าสมัคร (รวมอบรม)", v: `${fmtN(PACKAGES.B.price)} บาท` }, { k: "รับฟรี", v: "Uniform + Oil นวด 1 ชุด" }, { k: "การให้บริการต่อครั้ง", v: "3–5 ชม." }] },
};

/** สิ่งที่คุณได้รับ (4 ช่อง · ไอคอนเป็น path ของ SVG 24×24) */
export const PERKS = [
  { icon: "M3 11l18-8-8 18-2-8-8-2z", t: "โปรโมทตลอดปี", d: "แพลตฟอร์มที่มีการโปรโมทตลอดปี" },
  { icon: "M12 2l3 7h7l-5.5 4.5 2 7.5-6.5-4.5-6.5 4.5 2-7.5L2 9h7z", t: "Branding น่าเชื่อถือ", d: "แบรนด์ที่ลูกค้ามั่นใจ" },
  { icon: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", t: "ทำงานปลอดภัย", d: "กฎเกณฑ์การทำงานที่มีกรอบของกฎหมายนำ" },
  { icon: "M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7c-2-4-6-4-6-1s4 1 6 1c2 0 6 2 6-1s-4-3-6 1", t: "สิทธิพิเศษ", d: "ทำงานครบตามจำนวนครั้งต่อเดือน รับการดูแลจากคลินิกพาร์ทเนอร์ เสื้อผ้า หรืออื่น ๆ" },
];

/** คุณสมบัติที่เรามองหา */
export const LOOKING_FOR = ["ผู้ชายอายุ 20–50 ปี ดูแลตัวเองสม่ำเสมอ", "สุภาพ ใจรักงานบริการ เป็นผู้ฟังที่ดี", "ไม่ต้องมีประสบการณ์ ถ้านวดเป็นจะมีรายได้มากขึ้น"];

/** ─── รายได้และส่วนแบ่ง (หน้า /join/earnings ตามบอร์ด JoinEarnings) ───
 *  ราคาที่ลูกค้าจ่ายต่อนัด 3 ชม. · ขั้นส่วนแบ่งนับนัดทั้งเดือน · แก้ตัวเลขที่นี่ที่เดียว */
export const EARNINGS = {
  show: true,
  price3h: {
    eat: { label: "เพื่อนกินเที่ยว", top: 5000, silver: 3500 },
    massage: { label: "เพื่อนกินเที่ยว · นวด", top: 10000, silver: 6500 },
  },
  fiveHourMultiplier: 1.5,
  /** ขั้นส่วนแบ่งของ Part-Time: ตั้งแต่ min นัด/เดือน ขึ้นไป ได้ pct% (เรียงจากน้อยไปมาก) */
  tiers: [
    { min: 1, max: 10, pct: 40, label: "ไม่เกิน 10 นัด" },
    { min: 11, max: 24, pct: 50, label: "11–24 นัด" },
    { min: 25, max: null, pct: 60, label: "25 นัดขึ้นไป" },
  ],
  caseOptions: [5, 10, 15, 20, 25, 30],
  payout: "จบนัดแล้วโอนส่วนของคุณภายใน 24 ชม.",
  tipPct: 100,
} as const;
export type EarnSvc = keyof typeof EARNINGS.price3h;
export type EarnTier = "top" | "silver";
/** ระดับ Part-Time: Secret = ลิงก์เชิญ Secret (บอสสั่ง 22 ต.ค. 2569) · แสดงแบบ TOP แต่ป้าย "Secret" กรอบดำเรืองแสง · ขึ้นก่อน TOP · ราคาแอดมินกำหนดรายคน */
export type PtTier = "top" | "silver" | "secret";
export const tierLabel = (t?: string | null) => (t === "secret" ? "Secret" : t === "top" ? "TOP" : "Silver");
/** ราคา 3 ชม. ตามระดับ — Secret = ราคาที่แอดมินตั้งรายคน (ยังไม่ตั้ง = ราคา TOP) */
export const tierPrice = (x: { tier?: string | null; secret_price?: number | null }, svc: { top: number; silver: number }) =>
  x.tier === "secret" ? (x.secret_price && x.secret_price > 0 ? x.secret_price : svc.top) : x.tier === "top" ? svc.top : svc.silver;
export function sharePct(cases: number): number {
  let pct: number = EARNINGS.tiers[0].pct;
  for (const t of EARNINGS.tiers) if (cases >= t.min) pct = t.pct;
  return pct;
}

export const TITLES = ["นาย", "นาง", "นางสาว"] as const;
export const RELIGIONS = ["พุทธ", "คริสต์", "อิสลาม", "อื่น ๆ"] as const;
export const EDUCATION = ["ต่ำกว่ามัธยมศึกษาตอนต้น", "มัธยมศึกษาตอนต้น (ม.3)", "มัธยมศึกษาตอนปลาย (ม.6)", "ปวช.", "ปวส. / อนุปริญญา", "ปริญญาตรี", "สูงกว่าปริญญาตรี"] as const;
export const MARITAL = ["โสด", "สมรส", "หย่าร้าง", "แยกกันอยู่", "หม้าย"] as const;
export const BANKS = ["กสิกรไทย", "ไทยพาณิชย์", "กรุงเทพ", "กรุงไทย", "กรุงศรีอยุธยา", "ทหารไทยธนชาต", "ออมสิน", "อื่น ๆ"] as const;

export const EXPERIENCE = ["ไม่มี", "1–3 ปี", "มากกว่า 3 ปี"] as const;
export const STRENGTHS = ["บุคลิก", "รูปร่าง", "ทักษะนวด", "การสื่อสาร"] as const;

/** ความสามารถพิเศษ (multi-select บังคับ ≥1) — เก็บใน applicants.talents (join/0005) + docs.extra */
export const TALENTS = ["ทำอาหาร", "ดนตรี", "ถ่ายรูป", "พูดอังกฤษ", "ขับรถ", "ฟิตเนส", "ไกด์", "นวด", "อื่น ๆ"] as const;

/** ข้อความ checkbox บังคับ (ack_no_refuse) ตามชีตคุณพล */
export const ACK_NO_REFUSE_TEXT = "รับทราบเงื่อนไขค่าสมัคร (ไม่คืนเงิน) และกฎห้ามปฏิเสธงานโดยไม่มีเหตุผลอันสมควร";
