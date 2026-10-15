// รายการที่แอดมิน "ตีกลับ" ให้ผู้สมัครแก้ได้ — เก็บใน docs.extra.kyc_reason { key: เหตุผล } + kyc_status = "rejected"
// ผู้สมัครแก้รายการไหน → ลบ key นั้นออก (clearFixes) · ครบทุกรายการ → กลับเป็นรอตรวจ
export type FixGo = "slip" | "form" | "form2" | "kyc" | "bank";
export const FIX_ITEMS: { key: string; label: string; go: FixGo; onlyB?: boolean }[] = [
  { key: "slip", label: "สลิปโอนเงิน", go: "slip" },
  { key: "info", label: "ข้อมูลส่วนตัว (ชื่อ วันเกิด LINE ที่พัก พื้นที่)", go: "form" },
  { key: "photo", label: "รูปหน้าตรง", go: "form" },
  { key: "other_doc", label: "รูปเต็มตัว", go: "form" },
  { key: "schedule", label: "วันเวลาที่รับงานและประสบการณ์", go: "form2" },
  { key: "cert_doc", label: "ใบรับรองการนวด", go: "form2", onlyB: true },
  { key: "id_card", label: "หน้าบัตรประชาชน", go: "kyc" },
  { key: "selfie", label: "เซลฟีถือบัตร", go: "kyc" },
  { key: "id_copy", label: "สำเนาบัตรประชาชน (เซ็นรับรอง)", go: "kyc" },
  { key: "bank", label: "บัญชีรับเงิน / หน้าสมุดบัญชี", go: "bank" },
];
export const FIX_KEYS = FIX_ITEMS.map((i) => i.key);
export const fixLabel = (k: string) => FIX_ITEMS.find((i) => i.key === k)?.label ?? k;

/** ลิงก์ไปหน้าที่แก้รายการนั้น (fix=1 → บันทึกแล้วกลับมาหน้ารายการต้องแก้) */
export function fixHref(go: FixGo, mb: string, t?: string | null) {
  const tq = t ? `&t=${encodeURIComponent(t)}` : "";
  if (go === "slip") return `/join/slip/${mb}?fix=1${tq}`;
  if (go === "form") return `/join/form/${mb}?fix=1${tq}`;
  if (go === "form2") return `/join/form/${mb}?step=2&fix=1${tq}`;
  return `/join/${go}/${mb}?fix=1${tq}`;
}
