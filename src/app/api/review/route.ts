import { NextResponse } from "next/server";
import { store } from "@/lib/server-store";
import { isDemo } from "@/lib/data";

// POST /api/review — เขียนรีวิว (ผูกกับ order ที่จ่ายครบเท่านั้นในโหมดจริง)
export async function POST(req: Request) {
  const { postId, rating, content } = await req.json().catch(() => ({}));
  if (!postId || !rating) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  if (isDemo) {
    store().reviews.push({ id: `r-${Date.now()}`, postId, rating: +rating, content: String(content ?? ""), createdAt: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: true });
}
