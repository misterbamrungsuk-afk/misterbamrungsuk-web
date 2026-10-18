import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { clientIp } from "@/lib/customer/auth";
import { recordClientError } from "@/lib/client-errors";

export const runtime = "nodejs";

// รับ error จากเบราว์เซอร์ผู้ใช้ (ErrorReporter) — ไม่ต้องล็อกอิน · จำกัดขนาด/ความถี่ · ตัด noise ที่ไม่ใช่โค้ดเรา
const NOISE = /ResizeObserver loop|chrome-extension:|moz-extension:|safari-extension:|challenges\.cloudflare|turnstile|Script error\.?$|AbortError|Load failed|NetworkError|Failed to fetch/i;
const str = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, n);

export async function POST(req: Request) {
  if (await limited(`clog:${clientIp(req)}`, 20, 10 * 60_000)) return new NextResponse(null, { status: 204 });
  const raw = await req.text().catch(() => "");
  if (!raw || raw.length > 6000) return new NextResponse(null, { status: 204 });
  let b: Record<string, unknown> = {};
  try { b = JSON.parse(raw); } catch { return new NextResponse(null, { status: 204 }); }
  const message = str(b.message, 400);
  if (!message || NOISE.test(message) || NOISE.test(str(b.stack, 400))) return new NextResponse(null, { status: 204 });
  // เส้นทางเท่านั้น (ไม่เก็บ query เพราะอาจมีโทเคน ?t=)
  const path = str(b.path, 200).split("?")[0].replace(/\/(MB-\d+|[0-9a-f-]{36}|r[0-9a-f]{10})(?=\/|$)/gi, "/:id");
  await recordClientError({
    kind: str(b.kind, 20) || "error", message, path, stack: str(b.stack, 800),
    ua: str(req.headers.get("user-agent"), 200), vw: Number(b.vw) || 0, vh: Number(b.vh) || 0, sw: !!b.sw, ms: Math.round(Number(b.ms) || 0),
  }).catch((e) => console.error("client-log", e));
  return new NextResponse(null, { status: 204 });
}
