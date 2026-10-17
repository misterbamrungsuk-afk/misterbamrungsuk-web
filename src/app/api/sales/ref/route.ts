import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { clientIp } from "@/lib/customer/auth";
import { findRep } from "@/lib/member/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ตรวจโค้ดผู้แนะนำก่อนเปิดเมม (?code=) → { valid, name } · ไม่เปิดข้อมูลอื่นของ Sale Man
export async function GET(req: Request) {
  if (await limited(`sref:${clientIp(req)}`, 30, 10 * 60_000)) return NextResponse.json({ ok: false, error: "ลองบ่อยเกินไป" }, { status: 429 });
  const code = String(new URL(req.url).searchParams.get("code") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return NextResponse.json({ ok: true, valid: false });
  const r = await findRep({ code }).catch(() => null);
  // ชื่อแสดงแค่ตัวแรก + *** (ยืนยันว่าใช่คนที่ชวน โดยไม่เปิดชื่อเต็ม)
  return NextResponse.json({ ok: true, valid: !!r?.active, name: r?.active && r.name ? `${[...r.name][0]}***` : null });
}
