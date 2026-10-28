import { NextResponse } from "next/server";
import { CEO_COOKIE } from "@/lib/ceo-room-auth";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(CEO_COOKIE);
  return res;
}
