import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { saveChatRules } from "@/lib/chat-guard";

export const runtime = "nodejs";

// ตั้งค่าคำห้ามส่งในแชท: POST { words: string[] | string (คั่นบรรทัด/จุลภาค), strikeLimit }
export async function POST(req: Request) {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!s || !canAccess(s.role, "/admin/chats")) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { words?: unknown; strikeLimit?: unknown };
  const words = Array.isArray(b.words) ? b.words.map(String) : String(b.words ?? "").split(/[\n,]+/);
  try {
    const rules = await saveChatRules(words, Number(b.strikeLimit), s.email);
    return NextResponse.json({ ok: true, rules });
  } catch (e) {
    console.error("chat rules", e);
    return NextResponse.json({ ok: false, error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
}
