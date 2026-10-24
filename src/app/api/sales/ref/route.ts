import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { clientIp } from "@/lib/customer/auth";
import { cookies } from "next/headers";
import { findRep } from "@/lib/member/store";
import { RECRUIT_COOKIE } from "@/lib/member/recruit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ตรวจโค้ดผู้แนะนำก่อนเปิดเมม (?code=) → { valid, name } · ไม่เปิดข้อมูลอื่นของ Recruit
export async function GET(req: Request) {
  if (await limited(`sref:${clientIp(req)}`, 30, 10 * 60_000)) return NextResponse.json({ ok: false, error: "ลองบ่อยเกินไป" }, { status: 429 });
  // ไม่ส่ง code = เลขแนะนำจากลิงก์ Recruit ที่เปิดไว้ (คุกกี้ mb_sm) → เติมช่องเลขแนะนำในหน้าสมัครให้
  const q = new URL(req.url).searchParams.get("code");
  const code = String(q ?? (await cookies()).get(RECRUIT_COOKIE)?.value ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return NextResponse.json({ ok: true, valid: false });
  const r = await findRep({ code }).catch(() => null);
  // ชื่อแสดงแค่ตัวแรก + *** (ยืนยันว่าใช่คนที่ชวน โดยไม่เปิดชื่อเต็ม)
  return NextResponse.json({ ok: true, code: r?.active ? r.code : null, valid: !!r?.active, name: r?.active && r.name ? `${[...r.name][0]}***` : null });
}
