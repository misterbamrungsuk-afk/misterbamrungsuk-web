import { NextResponse } from "next/server";

// ไอคอนแอป Mister Bamrungsuk = โลโก้ใหม่ (จาก canvas) บนพื้นสีแบรนด์ — ไฟล์คงที่ public/brand/icon-{size}[-maskable].png
// เส้นทางเดิม /pwa-icon/192, /pwa-icon/512, /pwa-icon/512?maskable=1 ยังใช้ได้ (ส่งต่อไปไฟล์คงที่)
const ALLOWED = new Set([180, 192, 512]);

export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = ALLOWED.has(Number(raw)) ? Number(raw) : 192;
  const maskable = new URL(req.url).searchParams.has("maskable");
  return NextResponse.redirect(new URL(`/brand/icon-${size}${maskable ? "-maskable" : ""}.png`, req.url), 308);
}
