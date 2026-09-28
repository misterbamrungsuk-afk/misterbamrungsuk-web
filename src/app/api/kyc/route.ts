import { NextResponse } from "next/server";
import { store } from "@/lib/server-store";
import { isDemo } from "@/lib/data";

// POST /api/kyc — ส่งเรื่องยืนยันตัวตน { selfiePath, cardPath }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (isDemo) {
    const s = store();
    s.kycStatus = "pending";
    s.audit.unshift({ id: `a-${Date.now()}`, actor: "member:me", action: "kyc.submit", entity: "KycSubmission", at: new Date().toLocaleTimeString("th-TH") });
    return NextResponse.json({ status: "pending" });
  }
  void body;
  return NextResponse.json({ status: "pending" });
}

// GET /api/kyc — สถานะปัจจุบัน
export async function GET() {
  if (isDemo) return NextResponse.json({ status: store().kycStatus });
  return NextResponse.json({ status: "none" });
}
