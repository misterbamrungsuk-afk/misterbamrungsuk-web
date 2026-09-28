import { NextResponse } from "next/server";
import { store } from "@/lib/server-store";
import { isDemo } from "@/lib/data";

// POST /api/interest — toggle สนใจงาน { jobId }
export async function POST(req: Request) {
  const { jobId } = await req.json().catch(() => ({}));
  if (!jobId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  if (isDemo) {
    const s = store();
    s.interests[jobId] = !s.interests[jobId];
    s.interestCounts[jobId] = (s.interestCounts[jobId] ?? 0) + (s.interests[jobId] ? 1 : -1);
    return NextResponse.json({ interested: s.interests[jobId], count: Math.max(0, s.interestCounts[jobId]) });
  }
  // LIVE: prisma.jobInterest upsert/delete + count
  return NextResponse.json({ interested: false, count: 0 });
}
