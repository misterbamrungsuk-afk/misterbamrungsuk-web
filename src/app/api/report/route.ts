import { NextResponse } from "next/server";
import { store } from "@/lib/server-store";
import { isDemo } from "@/lib/data";

// POST /api/report — รีพอร์ท { targetType: post|job|chat|member, targetId, reason }
export async function POST(req: Request) {
  const { targetType, targetId, reason } = await req.json().catch(() => ({}));
  if (!targetType || !reason) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  if (isDemo) {
    store().reports.push({ id: `rp-${Date.now()}`, targetType, targetId: String(targetId ?? ""), reason, createdAt: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: true });
}
