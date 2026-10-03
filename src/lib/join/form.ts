import type { PackageKey } from "./config";

// ข้อมูลฟอร์มส่งต่อจากหน้า sale page → หน้าชำระเงิน ผ่าน sessionStorage (อยู่ในเครื่องผู้สมัครเท่านั้น)
// ฟอร์มสั้นตามชีต dev + รูปถ่าย/บัตรประชาชน; ฟิลด์ที่เหลือของ Sheet3 เก็บตอนอบรม (ปล่อยว่างได้)
export const FORM_KEY = "mb_join_form";

export interface JoinForm {
  package: PackageKey | "";
  title: string;
  first_name: string;
  last_name: string;
  nickname: string;
  birthdate: string; // yyyy-mm-dd
  weight: string;
  height: string;
  nationality: string;
  ethnicity: string;
  religion: string;
  education: string;
  marital: string;
  start_date: string; // วันที่สะดวกเริ่มงาน
  tel: string;
  line_id: string;
  email: string;
  address: string; // ที่อยู่จัดส่งเอกสาร (เก็บภายหลัง)
  zipcode: string;
  bank: string;
  bank_account: string;
  bank_account_name: string;
  experience: string;
  skills: string[];
  intro: string;
  // ไฟล์ (data URL ที่ย่อแล้ว)
  photo: string;
  id_card: string;
  bankbook: string;
  other_doc: string;
  accept_terms: boolean;
  /** ยินยอมให้ประมวลผลข้อมูล รวมข้อมูลอ่อนไหวบนบัตรประชาชน (ม.19, 26) — บังคับ */
  consent_pdpa: boolean;
  /** ยินยอมรับข่าวสาร — ไม่บังคับ */
  consent_marketing: boolean;
}

export const FILE_FIELDS = ["photo", "id_card", "bankbook", "other_doc"] as const;
export type FileField = (typeof FILE_FIELDS)[number];

export const emptyForm: JoinForm = {
  package: "", title: "", first_name: "", last_name: "", nickname: "", birthdate: "", weight: "", height: "",
  nationality: "ไทย", ethnicity: "ไทย", religion: "", education: "", marital: "", start_date: "",
  tel: "", line_id: "", email: "", address: "", zipcode: "", bank: "", bank_account: "", bank_account_name: "",
  experience: "", skills: [], intro: "", photo: "", id_card: "", bankbook: "", other_doc: "", accept_terms: false, consent_pdpa: false, consent_marketing: false,
};

/** อายุเต็มปีจากวันเกิด */
export function ageFrom(birthdate: string, now = new Date()): number | null {
  const d = new Date(birthdate);
  if (Number.isNaN(d.getTime())) return null;
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
  return a;
}

/** ย่อรูปฝั่งเครื่องผู้ใช้ให้ด้านยาวไม่เกิน max px แล้วคืนเป็น JPEG data URL */
export function resizeImage(file: File, max: number, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

export async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}
