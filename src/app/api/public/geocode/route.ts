import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";

export const runtime = "nodejs";

// ค้นหาพิกัดสถานที่ (แผนที่ "เลือกเพื่อนจากแผนที่") — ผ่าน OpenStreetMap Nominatim ฝั่งเซิร์ฟเวอร์ (เบราว์เซอร์เรียกตรงไม่ได้เพราะ CSP)
// จำกัดในประเทศไทย · แคชผล 1 วัน · จำกัดความถี่ต่อ IP (นโยบาย Nominatim: ไม่เกิน ~1 ครั้ง/วินาที)
type Hit = { name: string; full: string; lat: number; lng: number };
const g = globalThis as unknown as { __mbGeo?: Map<string, { at: number; hits: Hit[] }> };
const cache = (g.__mbGeo ??= new Map());

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ ok: true, hits: [] });
  const key = q.toLowerCase();
  const c = cache.get(key);
  if (c && Date.now() - c.at < 86_400_000) return NextResponse.json({ ok: true, hits: c.hits });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (await limited(`geo:${ip}`, 30, 60_000)) return NextResponse.json({ ok: false, error: "ค้นหาบ่อยเกินไป รอสักครู่" }, { status: 429 });
  try {
    const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=th&accept-language=th,en&q=${encodeURIComponent(q)}`;
    const r = await fetch(u, { headers: { "User-Agent": "MisterBamrungsuk/1.0 (+https://misterbamrungsuk.com)" }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return NextResponse.json({ ok: false, error: "ค้นหาสถานที่ไม่สำเร็จ" }, { status: 502 });
    const rows = (await r.json()) as { name?: string; display_name?: string; lat?: string; lon?: string }[];
    const hits: Hit[] = rows
      .map((x) => ({ name: (x.name || x.display_name || "").split(",")[0].trim(), full: (x.display_name || "").split(",").slice(0, 3).join(",").trim(), lat: Number(x.lat), lng: Number(x.lon) }))
      .filter((h) => h.name && Number.isFinite(h.lat) && Number.isFinite(h.lng));
    cache.set(key, { at: Date.now(), hits });
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    return NextResponse.json({ ok: true, hits });
  } catch {
    return NextResponse.json({ ok: false, error: "ค้นหาสถานที่ไม่สำเร็จ" }, { status: 502 });
  }
}
