import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**" },
    ],
  },
  // ช่วงเปิดรับสมัคร Part-Time: หน้าแรกพาไป sale page /join ก่อน (ชั่วคราว — ลบออกเมื่อจะเปิด Marketplace เป็นหน้าแรก)
  async redirects() {
    return [{ source: "/", destination: "/join", permanent: false }];
  },
};

export default nextConfig;
