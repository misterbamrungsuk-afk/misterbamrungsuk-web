import { ImageResponse } from "next/og";

// ไอคอนแอป Mister Bamrungsuk (ตรา MB วงทอง) สร้างเป็น PNG ตอนเรียก
// /pwa-icon/192, /pwa-icon/512, /pwa-icon/512?maskable=1 (เว้นขอบให้ Android ครอปวงกลมได้)
const ALLOWED = new Set([180, 192, 512]);

export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = ALLOWED.has(Number(raw)) ? Number(raw) : 192;
  const maskable = new URL(req.url).searchParams.has("maskable");
  const mark = size * (maskable ? 0.5 : 0.64);

  return new ImageResponse(
    (
      <div style={{ width: size, height: size, background: "#0b0b0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: mark, height: mark, borderRadius: mark, border: `${Math.max(3, Math.round(mark * 0.05))}px solid #d4af37`, background: "#0b0b0d", display: "flex", alignItems: "center", justifyContent: "center", color: "#d4af37", fontSize: Math.round(mark * 0.4), fontWeight: 700, letterSpacing: -1 }}>MB</div>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
