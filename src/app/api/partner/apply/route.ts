import { NextResponse } from "next/server";
import { PACKAGE_KEYS, PARTNER_TYPES, type PartnerPackageKey } from "@/lib/partner/config";
import { createPartner } from "@/lib/partner/store";
import { notifyAdmin, syncPartnerSheet } from "@/lib/partner/notify";
import { signApplyToken } from "@/lib/partner/auth";

export const runtime = "nodejs";

// กันยิงรัว: 5 ครั้ง / 10 นาที / IP (ในหน่วยความจำ)
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (limited(ip)) return bad("ส่งบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่", 429);
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return bad("ข้อมูลไม่ถูกต้อง");
  if (str(b.website, 100)) return NextResponse.json({ ok: true }); // honeypot กันบอท

  const input = {
    business_name: str(b.business_name, 120), type: str(b.type, 30), province: str(b.province, 80),
    contact_name: str(b.contact_name, 80), tel: str(b.tel, 20).replace(/[^\d+]/g, ""), email: str(b.email, 120).toLowerCase(),
    line_id: str(b.line_id, 60), links: str(b.links, 300), package: str(b.package, 4) as PartnerPackageKey,
    message: str(b.message, 1000),
  };
  if (!input.business_name) return bad("กรอกชื่อธุรกิจ");
  if (!(PARTNER_TYPES as readonly string[]).includes(input.type)) return bad("เลือกประเภทธุรกิจ");
  if (!input.province) return bad("กรอกจังหวัด/พื้นที่");
  if (!input.contact_name) return bad("กรอกชื่อผู้ติดต่อ");
  if (!/^\+?\d{9,15}$/.test(input.tel)) return bad("เบอร์โทรไม่ถูกต้อง");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return bad("อีเมลไม่ถูกต้อง");
  if (!PACKAGE_KEYS.includes(input.package)) return bad("เลือกแพ็กเกจที่สนใจ");
  if (b.consent !== true) return bad("กรุณายินยอมการเก็บข้อมูล (PDPA)");

  try {
    const row = await createPartner({ ...input, consented_at: new Date().toISOString(), ip });
    void Promise.allSettled([syncPartnerSheet(row), notifyAdmin(row)]);
    // token สำหรับชำระค่าแพ็กเกจ + ตั้งรหัสผ่านเข้าพอร์ทัล (/partner/pay)
    return NextResponse.json({ ok: true, token: signApplyToken(row.id), package: row.package });
  } catch (e) {
    console.error("partner apply", e);
    return bad("ระบบขัดข้อง กรุณาลองใหม่", 500);
  }
}
