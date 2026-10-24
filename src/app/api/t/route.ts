import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { limited } from "@/lib/rate-limit";
import { addView, setDuration } from "@/lib/traffic";
import { currentCustomer } from "@/lib/customer/auth";
import { RESUME_COOKIE, readResume } from "@/lib/join/resume";

export const runtime = "nodejs";

// ตัวนับผู้เข้าชม (sendBeacon จาก components/site-tracker) — { t:"v" เปิดหน้า | t:"d" เวลาอยู่หน้า }
// ระบุตัวผู้ใช้ (ลูกค้า/Part-Time) เฉพาะเมื่อยินยอมคุกกี้วิเคราะห์ (a=1) — อ่านจากคุกกี้ล็อกอินฝั่งเซิร์ฟเวอร์ ไม่เชื่อค่าจากเบราว์เซอร์
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|python|curl|wget/i;
const s = (v: unknown, n: number) => (typeof v === "string" && v ? v.slice(0, n) : null);
const decodeCity = (v: string | null) => { if (!v) return null; try { return decodeURIComponent(v); } catch { return v; } };
const okId = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/.test(v);

export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  if (BOT.test(ua)) return new NextResponse(null, { status: 204 });
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (await limited(`t:${ip}`, 240, 10 * 60_000)) return new NextResponse(null, { status: 204 });
  const raw = await req.text().catch(() => "");
  if (raw.length > 2000) return new NextResponse(null, { status: 413 });
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw) as Record<string, unknown>; } catch { return new NextResponse(null, { status: 400 }); }
  if (!okId(b.v) || typeof b.sid !== "string" || !/^[a-z0-9]{8,40}$/i.test(b.sid)) return new NextResponse(null, { status: 400 });

  if (b.t === "d") { await setDuration(b.v as string, b.sid, Number(b.ms) || 0).catch(() => {}); return new NextResponse(null, { status: 204 }); }
  const path = s(b.p, 200);
  if (!path || !path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) return new NextResponse(null, { status: 204 });

  const consent = b.a === 1;
  let who: { who_type: "customer" | "parttime"; who_id: string; who_label: string } | null = null;
  if (consent) {
    const me = await currentCustomer().catch(() => null);
    if (me) who = { who_type: "customer", who_id: me.sub, who_label: me.email };
    else {
      const mb = readResume((await cookies()).get(RESUME_COOKIE)?.value);
      if (mb) who = { who_type: "parttime", who_id: mb, who_label: mb };
    }
  }
  const mobile = /iphone|android.*mobile|mobile/i.test(ua), tablet = /ipad|tablet|android(?!.*mobile)/i.test(ua);
  let ref: string | null = null;
  try { const r = s(b.r, 300); if (r) { const h = new URL(r).hostname; if (!/misterbamrungsuk\.(com|co\.th)$|localhost/.test(h)) ref = h; } } catch {}
  await addView({
    id: b.v as string, at: new Date().toISOString(), sid: b.sid, vid: consent && typeof b.vid === "string" && /^[a-z0-9]{8,40}$/i.test(b.vid) ? b.vid : null,
    path, ref, utm_source: s(b.us, 60), utm_medium: s(b.um, 60), utm_campaign: s(b.uc, 80),
    device: tablet ? "tablet" : mobile ? "mobile" : "desktop",
    country: s(req.headers.get("x-vercel-ip-country"), 4), city: s(decodeCity(req.headers.get("x-vercel-ip-city")), 60),
    who_type: who?.who_type ?? null, who_id: who?.who_id ?? null, who_label: who?.who_label ?? null,
    mk: consent && b.m === 1, dur_ms: null,
  }).catch((e) => console.error("track", (e as Error).message));
  return new NextResponse(null, { status: 204 });
}
