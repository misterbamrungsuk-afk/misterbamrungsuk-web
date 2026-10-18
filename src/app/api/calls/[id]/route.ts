import { NextResponse } from "next/server";
import { CallError, accept, callFor, decline, demoAge, getCall, hangup, postSignal, viewFor } from "@/lib/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const nf = () => NextResponse.json({ ok: false, error: "ไม่พบสายนี้" }, { status: 404 });

// GET ?as=&mb=&t= → สถานะสาย + SDP ของอีกฝั่ง (หน้าจอถามทุก 1 วิระหว่างต่อสาย)
export async function GET(req: Request, { params }: Ctx) {
  const sp = new URL(req.url).searchParams;
  const x = await callFor((await params).id, { as: sp.get("as"), mb: sp.get("mb"), t: sp.get("t") });
  if (!x) return nf();
  return NextResponse.json({ ok: true, call: viewFor(x.c, x.who, x.b) }, { headers: { "Cache-Control": "no-store" } });
}

// POST { action: "signal" (kind: offer|answer, sdp) | "accept" (sdp?) | "decline" | "hangup" (reason?), as?, mb?, t? }
export async function POST(req: Request, { params }: Ctx) {
  const id = (await params).id;
  const body = (await req.json().catch(() => ({}))) as { action?: string; kind?: string; sdp?: unknown; reason?: string; seconds?: number; as?: string; mb?: string; t?: string };
  const x = await callFor(id, body);
  if (!x) return nf();
  try {
    let c = x.c;
    switch (body.action) {
      case "signal": c = await postSignal(c, x.who, String(body.kind ?? ""), body.sdp); break;
      case "accept": c = await accept(c, x.who, body.sdp); break;
      case "decline": c = await decline(c, x.who); break;
      case "hangup": c = await hangup(c, x.who, body.reason); break;
      // ทดสอบเท่านั้น: ย้อนเวลาสาย (โหมดสาธิต + ไม่ใช่ production) แล้วให้ระบบปิดสายตามกติกา
      case "demo_age": {
        if (!demoAge(id, Number(body.seconds) || 0)) return NextResponse.json({ ok: false }, { status: 404 });
        c = (await getCall(id)) ?? c;
        break;
      }
      default: return NextResponse.json({ ok: false, error: "action ไม่ถูกต้อง" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, call: viewFor(c, x.who, x.b) });
  } catch (e) {
    if (e instanceof CallError) return NextResponse.json({ ok: false, error: e.message, code: e.code }, { status: e.status });
    console.error("call action", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
