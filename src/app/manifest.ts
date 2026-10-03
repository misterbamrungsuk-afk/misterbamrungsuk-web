import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mister Bamrungsuk — หมอนวดชายมืออาชีพ",
    short_name: "Bamrungsuk",
    description: "จองหมอนวดชายที่ยืนยันตัวตนแล้ว ถึงที่ของคุณ",
    lang: "th",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fffaf2",
    theme_color: "#fffaf2",
    categories: ["health", "lifestyle"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "เรียกด่วน", url: "/matching" },
      { name: "แผนที่ใกล้ฉัน", url: "/map" },
      { name: "แชท", url: "/chat" },
    ],
  };
}
