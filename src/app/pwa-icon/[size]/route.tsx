import { ImageResponse } from "next/og";

// ไอคอนแอป MorD (หมุดทอง + จุดแดง) สร้างเป็น PNG ตอนเรียก
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
        <svg width={mark} height={mark} viewBox="0 0 32 32" fill="none">
          <path d="M16 29.5s-9.5-8.4-9.5-15.6a9.5 9.5 0 0 1 19 0c0 7.2-9.5 15.6-9.5 15.6z" stroke="#d4af37" strokeWidth="2.6" strokeLinejoin="round" />
          <circle cx="16" cy="13.9" r="3.9" fill="#e0243c" />
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
