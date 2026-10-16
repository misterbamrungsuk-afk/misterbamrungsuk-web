import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mister Bamrungsuk — เพื่อนกิน เพื่อนเที่ยว",
    short_name: "Bamrungsuk",
    description: "นัดเพื่อนกิน เพื่อนเที่ยว ระดับพรีเมียม ที่ยืนยันตัวตนแล้ว",
    lang: "th",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["lifestyle", "social"],
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "เรียกด่วน", url: "/matching" },
      { name: "แผนที่ใกล้ฉัน", url: "/map" },
      { name: "แชท", url: "/chat" },
    ],
  };
}
