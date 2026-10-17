import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// ── ความปลอดภัยระดับ HTTP (ทุกหน้า) ──
// CSP: อนุญาตเฉพาะโดเมนที่ใช้จริง — แผนที่ OSM, Turnstile (Cloudflare), รูปจาก Supabase/Unsplash · ห้ามฝังเว็บเราในเฟรมคนอื่น (กัน clickjacking)
// script ต้องมี 'unsafe-inline' เพราะ Next.js ใส่สคริปต์ inline ตอน hydrate (ไม่มี nonce) · โหมด dev ต้อง 'unsafe-eval' สำหรับ HMR
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://*.supabase.co https://images.unsplash.com",
  "font-src 'self' data:",
  // data:/blob: = ย่อรูปในเครื่องก่อนอัป (fetch(dataUrl) → File) · ไม่ใช่การติดต่อเว็บภายนอก
  `connect-src 'self' data: blob: https://challenges.cloudflare.com${dev ? " ws: http://localhost:*" : ""}`,
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  // ล็อกอิน LINE/Google ส่งฟอร์มแล้ว redirect ออกไปผู้ให้บริการ → ต้องอนุญาต https:
  "form-action 'self' https:",
  "frame-ancestors 'none'",
  // MB_LOCAL_HTTP=1 = เปิด production build ทดสอบบน http://localhost (ไม่บังคับ https)
  ...(dev || process.env.MB_LOCAL_HTTP ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(self), microphone=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // site key ของ Turnstile เป็นค่าสาธารณะ — รับได้ทั้งชื่อ NEXT_PUBLIC_… และ TURNSTILE_SITE_KEY (ที่ตั้งไว้ใน Vercel)
  env: { NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || process.env.TURNSTILE_SITE_KEY || "" },
  // ตัวย่อรูปของ Next (/_next/image) รับเฉพาะโดเมนที่ใช้จริง — เดิม "**" ทำให้ใครก็ใช้เป็นพร็อกซีดึงรูปจากเว็บไหนก็ได้
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // CSP ของหน้าเว็บ — ไม่ใส่ให้ /api (ไฟล์ที่ผู้ใช้อัปมี CSP sandbox ของตัวเอง ห้ามถูกทับ)
      { source: "/((?!api/).*)", headers: [{ key: "Content-Security-Policy", value: csp }] },
      // ข้อมูลส่วนตัว/API ห้ามแคชที่ proxy หรือเบราว์เซอร์ร่วม
      { source: "/api/:path((?!public/).*)", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Robots-Tag", value: "noindex" }] },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
