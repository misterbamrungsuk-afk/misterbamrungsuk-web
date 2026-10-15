import { NextResponse } from "next/server";
import { fixesExcept, getByMb, saveBank } from "@/lib/join/store";
import { canResume } from "@/lib/join/resume";
import { ALL_BANKS, PROMPTPAY } from "@/lib/join/banks";

export const runtime = "nodejs";

const MAX_FILE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const bad = (error: string, status = 400, fields?: string[]) => NextResponse.json({ ok: false, error, fields }, { status });

export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return bad("ข้อมูลไม่ถูกต้อง"); }
  const s = (k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);
  const mb = s("mb");
  if (!/^MB-\d{7,}$/.test(mb) || !(await canResume(mb, s("t", 2048) || new URL(req.url).searchParams.get("t"))))
    return bad("ลิงก์หมดอายุหรือไม่มีสิทธิ์ กรุณาติดต่อแอดมิน", 403);
  const row = await getByMb(mb);
  if (!row) return bad("ไม่พบใบสมัคร", 404);

  const bank = s("bank");
  const account = s("bank_account").replace(/[-\s]/g, "");
  const name = s("bank_account_name");
  const errors: string[] = [];
  const promptpay = bank === PROMPTPAY;
  if (!promptpay && !ALL_BANKS.includes(bank)) errors.push("bank");
  if (promptpay ? !/^(0\d{9}|\d{13})$/.test(account) : !/^\d{10,12}$/.test(account)) errors.push("bank_account");
  if (name.length < 3) errors.push("bank_account_name");
  let bankbook: File | undefined;
  const f = form.get("bankbook");
  if (f instanceof File && f.size > 0) {
    if (!IMAGE_TYPES.includes(f.type) || f.size > MAX_FILE) errors.push("bankbook");
    else bankbook = f;
  }
  // บอร์ด D3: รูปหน้าสมุดบัญชีบังคับ (บัญชีธนาคาร) + ยินยอม 3 ข้อ
  if (!promptpay && !bankbook && !row.docs.bankbook) errors.push("bankbook");
  for (const k of ["ck_terms", "ck_pdpa", "ck_profile"]) if (s(k) !== "true") errors.push(k);
  if (errors.length) return bad("กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง", 400, errors);

  try {
    await saveBank(row.id, { bank, bank_account: account, bank_account_name: name, bankbook, consents: { terms: true, pdpa: true, profile: true, at: new Date().toISOString() }, otherFixes: fixesExcept(row, ["bank"]) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("bank failed", e);
    return bad("ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง", 500);
  }
}
