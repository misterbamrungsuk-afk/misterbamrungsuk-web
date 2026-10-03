import { NextResponse } from "next/server";
import { CLOSE_AT, EXPERIENCE, PACKAGES, QUOTA, STRENGTHS, TITLES, type PackageKey } from "@/lib/join/config";
import { countActive, createApplicant, updateApplicant, type DocKind } from "@/lib/join/store";
import { appendToSheet } from "@/lib/join/sheets";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/join/legal";

export const runtime = "nodejs";

const MAX_FILE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const REQUIRED_DOCS: DocKind[] = ["photo", "id_card", "slip"];

// กันยิงรัว: 5 ครั้ง / 10 นาที / IP (ในหน่วยความจำ — หลายเครื่องต้องย้ายไป Redis)
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const oneOf = (list: readonly string[], v: string) => list.includes(v);
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));


export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (limited(ip)) return bad("ส่งบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่", 429);

  if (Date.now() > Date.parse(CLOSE_AT)) return bad("ปิดรับสมัครแล้ว", 410);
  if ((await countActive()) >= QUOTA) return bad("รับครบจำนวนแล้ว", 410);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("ข้อมูลไม่ถูกต้อง");
  }
  const s = (k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);

  const pkg = s("package") as PackageKey;
  const height = Number(s("height"));
  const weight = Number(s("weight"));
  const tel = s("tel").replace(/[-\s]/g, "");
  const account = s("bank_account").replace(/[-\s]/g, "");
  const email = s("email").toLowerCase();
  const skills = form.getAll("skills").map(String).filter((x) => oneOf(STRENGTHS, x));
  const method = s("payment_method");

  const errors: string[] = [];
  if (!(pkg in PACKAGES)) errors.push("package");
  for (const k of ["first_name", "last_name", "nickname"]) if (!s(k)) errors.push(k);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.push("email");
  if (!/^0\d{9}$/.test(tel)) errors.push("tel");
  if (!/^\d{5}$/.test(s("zipcode"))) errors.push("zipcode");
  if (!(height >= 140 && height <= 220)) errors.push("height");
  if (!(weight >= 35 && weight <= 200)) errors.push("weight");
  if (!oneOf(EXPERIENCE, s("experience"))) errors.push("experience");
  if (s("accept_terms") !== "true") errors.push("accept_terms");
  if (s("consent_pdpa") !== "true") errors.push("consent_pdpa");
  if (method !== "qr" && method !== "transfer") errors.push("payment_method");
  // ฟิลด์ Sheet3 (เก็บตอนอบรม) — ถ้าส่งมาต้องอยู่ในรายการที่กำหนด
  if (s("title") && !oneOf(TITLES, s("title"))) errors.push("title");
  if (s("birthdate") && !isDate(s("birthdate"))) errors.push("birthdate");
  if (s("start_date") && !isDate(s("start_date"))) errors.push("start_date");
  if (s("bank_account") && !/^\d{10,12}$/.test(account)) errors.push("bank_account");

  const files: Partial<Record<DocKind, File>> = {};
  for (const k of [...REQUIRED_DOCS, "bankbook", "other_doc"] as DocKind[]) {
    const f = form.get(k);
    if (f instanceof File && f.size > 0) {
      if (!IMAGE_TYPES.includes(f.type) || f.size > MAX_FILE) errors.push(k);
      else files[k] = f;
    } else if (REQUIRED_DOCS.includes(k)) errors.push(k);
  }
  if (errors.length) return NextResponse.json({ ok: false, error: "กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง", fields: errors }, { status: 400 });

  try {
    const row = await createApplicant(
      {
        title: s("title"), first_name: s("first_name"), last_name: s("last_name"), nickname: s("nickname"),
        birthdate: s("birthdate") || null, weight, height, nationality: s("nationality"), ethnicity: s("ethnicity"),
        religion: s("religion"), education: s("education"), marital: s("marital"), start_date: s("start_date") || null,
        tel, line_id: s("line_id"), email, address: s("address", 500), zipcode: s("zipcode"),
        bank: s("bank"), bank_account: account, bank_account_name: s("bank_account_name"),
        experience: s("experience"), skills, intro: s("intro", 1000),
        consent_marketing: s("consent_marketing") === "true",
        consent_version: `privacy-${PRIVACY_VERSION}/terms-${TERMS_VERSION}`, consented_at: new Date().toISOString(),
        package: pkg, amount: PACKAGES[pkg].price, payment_method: method as "qr" | "transfer", ip,
      },
      files,
    );
    // sync ชีตแบบไม่ให้ล้มทั้งคำขอ — ถ้าไม่สำเร็จ แอดมินกด sync ซ้ำได้
    if (await appendToSheet(row)) await updateApplicant(row.id, { sheet_synced: true });
    return NextResponse.json({ ok: true, mb_code: row.mb_code });
  } catch (e) {
    console.error("register failed", e);
    return bad("ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง", 500);
  }
}
