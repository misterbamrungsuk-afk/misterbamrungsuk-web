import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { clientIp } from "@/lib/customer/auth";
import { FileTypeError } from "@/lib/file-guard";
import { TURNSTILE_ERROR, verifyTurnstile } from "@/lib/turnstile";
import { sendEmail } from "@/lib/email";
import { BUSINESS_TYPES, type ApplyDocKind, type BusinessType } from "@/lib/market/config";
import { ApplyError, applyEmailTaken, createApplication, saveApplyDoc } from "@/lib/market/applications";

export const runtime = "nodejs";

const bad = (error: string, status = 400, fields?: string[]) => NextResponse.json({ ok: false, error, ...(fields ? { fields } : {}) }, { status });
const str = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// สมัครเปิดร้านบน Marketplace (สาธารณะ · multipart) — กันสแปม: rate limit + Turnstile + honeypot · อีเมลซ้ำ = 409
// เอกสาร: บุคคล = สำเนาบัตรประชาชน · นิติบุคคล = หนังสือรับรองบริษัท · ใบอนุญาต อย. (ถ้ามี) — รูป/PDF ตรวจจากเนื้อไฟล์จริง
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await limited(`mkapply:${ip}`, 5, 15 * 60_000)) return bad("ส่งบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่", 429);
  const fd = await req.formData().catch(() => null);
  if (!fd) return bad("ข้อมูลไม่ถูกต้อง");
  if (str(fd.get("website"), 100)) return NextResponse.json({ ok: true }); // honeypot กันบอท
  if (!(await verifyTurnstile(fd.get("turnstile"), ip))) return bad(TURNSTILE_ERROR, 403);

  const input = {
    shop_name: str(fd.get("shop_name"), 80), owner_name: str(fd.get("owner_name"), 80),
    phone: str(fd.get("phone"), 20).replace(/[^\d+]/g, ""), email: str(fd.get("email"), 120).toLowerCase(),
    line_id: str(fd.get("line_id"), 60), business_type: str(fd.get("business_type"), 20) as BusinessType,
    description: str(fd.get("description"), 1000), category: str(fd.get("category"), 80),
  };
  if (input.shop_name.length < 2) return bad("กรอกชื่อร้าน / แบรนด์", 400, ["shop_name"]);
  if (input.owner_name.length < 2) return bad("กรอกชื่อเจ้าของร้าน", 400, ["owner_name"]);
  if (!/^\+?\d{9,15}$/.test(input.phone)) return bad("เบอร์โทรไม่ถูกต้อง", 400, ["phone"]);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return bad("อีเมลไม่ถูกต้อง", 400, ["email"]);
  if (!(input.business_type in BUSINESS_TYPES)) return bad("เลือกประเภทผู้ขาย", 400, ["business_type"]);
  if (!input.category) return bad("เลือกหมวดสินค้า", 400, ["category"]);
  if (str(fd.get("consent"), 5) !== "1") return bad("กรุณายินยอมการเก็บข้อมูล (PDPA)", 400, ["consent"]);

  // อีเมลซ้ำตรวจก่อนรับไฟล์ (ไม่เก็บไฟล์ทิ้งไว้เปล่า ๆ)
  const taken = await applyEmailTaken(input.email).catch(() => null);
  if (taken) return NextResponse.json({ ok: false, code: "exists", fields: ["email"], error: taken === "account"
    ? "อีเมลนี้เป็นร้านค้าอยู่แล้ว · เข้าสู่ระบบที่ /vendor"
    : "อีเมลนี้ส่งใบสมัครไว้แล้ว · ไม่ต้องสมัครซ้ำ ทีมงานจะติดต่อกลับ" }, { status: 409 });

  const mainKind: ApplyDocKind = input.business_type === "company" ? "company_cert" : "id_card";
  const main = fd.get("doc_main"), fda = fd.get("doc_fda");
  if (!(main instanceof File) || !main.size) return bad(input.business_type === "company" ? "แนบหนังสือรับรองบริษัท" : "แนบสำเนาบัตรประชาชน", 400, ["doc_main"]);
  const docs: { kind: ApplyDocKind; path: string; type: string }[] = [];
  try {
    docs.push({ kind: mainKind, ...(await saveApplyDoc(main)) });
    if (fda instanceof File && fda.size) docs.push({ kind: "fda_license", ...(await saveApplyDoc(fda)) });
  } catch (e) {
    if (e instanceof FileTypeError || e instanceof ApplyError) return bad(e.message, 400, [docs.length ? "doc_fda" : "doc_main"]);
    console.error("market apply doc", e);
    return bad("อัปโหลดเอกสารไม่สำเร็จ กรุณาลองใหม่", 500);
  }

  try {
    const row = await createApplication({ ...input, docs, ip });
    const admin = process.env.ADMIN_NOTIFY_EMAIL;
    const esc = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    if (admin) void sendEmail({ to: admin.split(",").map((x) => x.trim()), subject: `[สมัครเปิดร้าน] ${input.shop_name}`, html: `<p>${esc(input.shop_name)} · ${esc(input.owner_name)} · ${esc(input.category)}</p><p>ตรวจได้ที่ /admin/market แท็บ "ใบสมัครร้าน"</p>` }).catch(() => false);
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    if (e instanceof ApplyError) return bad(e.message, e.status, e.status === 409 ? ["email"] : undefined);
    console.error("market apply", e);
    return bad("ระบบขัดข้อง กรุณาลองใหม่", 500);
  }
}
