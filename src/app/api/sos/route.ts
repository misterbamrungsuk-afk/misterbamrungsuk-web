import { NextResponse } from "next/server";
import { store } from "@/lib/server-store";
import { isDemo } from "@/lib/data";

// POST /api/sos — แจ้งเหตุฉุกเฉิน (บันทึก + แจ้งแอดมินทันที)
export async function POST(req: Request) {
  const { lat, lng } = await req.json().catch(() => ({}));
  if (isDemo) {
    const s = store();
    s.audit.unshift({
      id: `sos-${Date.now()}`, actor: "member:me", action: "sos.alert",
      entity: lat != null ? `SOS @ ${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}` : "SOS (no location)",
      at: new Date().toLocaleTimeString("th-TH"),
    });
    (s as unknown as { sosCount: number }).sosCount = ((s as unknown as { sosCount: number }).sosCount ?? 0) + 1;
    return NextResponse.json({ ok: true, hotline: { police: "191", medical: "1669" } });
  }
  return NextResponse.json({ ok: true });
}
