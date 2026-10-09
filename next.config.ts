import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // site key ของ Turnstile เป็นค่าสาธารณะ — รับได้ทั้งชื่อ NEXT_PUBLIC_… และ TURNSTILE_SITE_KEY (ที่ตั้งไว้ใน Vercel)
  env: { NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || process.env.TURNSTILE_SITE_KEY || "" },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
