import "server-only";
import { createSign } from "node:crypto";
import { PACKAGES } from "./config";
import { DOC_LABEL, extraOf, type Applicant } from "./store";

// ส่งแถวผู้สมัครเข้า Google Sheet ให้ทีมเปิดดู (สำเนา — ข้อมูลจริงอยู่ใน Supabase)
// ตั้งค่าได้ 2 แบบ:
//  1) (แนะนำ ง่าย) Google Apps Script — GOOGLE_SHEETS_WEBHOOK_URL + GOOGLE_SHEETS_WEBHOOK_TOKEN (โค้ดสคริปต์อยู่ที่ google-apps-script.gs)
//  2) Service account — GOOGLE_SHEETS_ID + GOOGLE_SERVICE_ACCOUNT_JSON แล้วแชร์ชีตให้อีเมล service account เป็น Editor
// ไม่มีรูปถ่าย/สลิปในชีต (ข้อมูลส่วนบุคคล) — ดูได้ในหน้าแอดมินเท่านั้น

const webhookEnabled = () => !!process.env.GOOGLE_SHEETS_WEBHOOK_URL && !!process.env.GOOGLE_SHEETS_WEBHOOK_TOKEN;
const serviceAccountEnabled = () => !!process.env.GOOGLE_SHEETS_ID && !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
export const sheetsEnabled = () => webhookEnabled() || serviceAccountEnabled();

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

async function accessToken() {
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }));
  const sig = createSign("RSA-SHA256").update(`${head}.${claim}`).sign(sa.private_key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claim}.${b64url(sig)}` }),
  });
  if (!res.ok) throw new Error(`google token ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

/** ต่อแถวท้ายแท็บ "applicants" — คืน true ถ้าสำเร็จ */
export async function appendToSheet(a: Applicant): Promise<boolean> {
  if (webhookEnabled()) {
    try {
      // Apps Script ตอบกลับด้วย redirect ไป googleusercontent — fetch ตามให้เอง
      const res = await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL!, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ token: process.env.GOOGLE_SHEETS_WEBHOOK_TOKEN, columns: COLUMNS, row: applicantRow(a) }),
      });
      const out = (await res.json().catch(() => ({}))) as { ok?: boolean };
      return res.ok && out.ok === true;
    } catch {
      return false;
    }
  }
  if (!serviceAccountEnabled()) return false;
  try {
    const token = await accessToken();
    const row = applicantRow(a);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEETS_ID}/values/applicants!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const res = await fetch(url, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** หัวคอลัมน์ (ใช้ทั้งชีตและ CSV) — ลำดับตามชีตลงทะเบียน + ข้อมูลการสมัคร; ไฟล์เอกสารดูในหน้าแอดมิน */
export const COLUMNS = [
  "รหัส MB", "วันที่สมัคร", "สถานะ", "แพ็กเกจ", "ยอดชำระ",
  "คำนำหน้า", "ชื่อจริง", "นามสกุล", "ชื่อเล่น", "ว/ด/ป เกิด", "น้ำหนัก", "ส่วนสูง", "สัญชาติ", "เชื้อชาติ", "ศาสนา",
  "ระดับการศึกษา", "วันที่สะดวกเริ่มงาน", "สถานภาพ", "เบอร์ที่ติดต่อได้", "ID LINE", "email ส่วนตัว",
  "ธนาคาร", "เลขที่บัญชี", "ชื่อตามสมุดบัญชี", "ที่อยู่ในการจัดส่งเอกสาร", "รหัสไปรษณีย์",
  "ประสบการณ์", "จุดเด่น", "แนะนำตัว", "ช่องทางชำระ", "เอกสารที่แนบ", "ยินยอม PDPA (เวอร์ชัน)", "รับข่าวสาร",
  "กิจกรรม", "ใบรับรองนวด", "เวลาที่สะดวก", "รุ่นอบรม", "กลุ่ม LINE",
];

export function applicantRow(a: Applicant): (string | number)[] {
  return [
    a.mb_code, new Date(a.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }), a.status, PACKAGES[a.package].name, a.amount,
    a.title, a.first_name, a.last_name, a.nickname, a.birthdate ?? "", a.weight, a.height, a.nationality, a.ethnicity, a.religion,
    a.education, a.start_date ?? "", a.marital, `'${a.tel}`, a.line_id, a.email || "-",
    a.bank, a.bank_account ? `'${a.bank_account}` : "", a.bank_account_name, a.address, `'${a.zipcode}`,
    a.experience, a.skills.join(", "), a.intro, a.payment_method === "qr" ? "QR" : "โอนบัญชี",
    Object.keys(a.docs).filter((k) => k in DOC_LABEL).map((k) => DOC_LABEL[k as keyof typeof DOC_LABEL]).join(", "),
    a.consent_version, a.consent_marketing ? "ยินยอม" : "ไม่ยินยอม",
    ...((x) => [
      (x.activities ?? []).join(", "), x.massage_cert == null ? "-" : x.massage_cert ? "มี" : "ไม่มี",
      x.availability ? `${x.availability.slots.join("/")} · ${x.availability.days ?? "-"} วัน/สัปดาห์ · ${x.availability.hours ?? "-"} ชม./วัน` : "-",
      x.cohort ? `รุ่น ${x.cohort}` : "-", x.line_joined ? "เข้าแล้ว" : "ยังไม่เข้า",
    ])(extraOf(a)),
  ];
}
