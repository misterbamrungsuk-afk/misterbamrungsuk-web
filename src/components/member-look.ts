// สีบัตรเมม (แยกจาก member-card ที่เป็น "use client" เพื่อให้หน้า server ใช้ค่าได้จริง — import จาก client module จะได้ proxy ไม่ใช่ object)
export type CardTier = "gold" | "black";
export const TIER_LOOK: Record<CardTier, { bg: string; ring: string; label: string; text: string }> = {
  gold: { bg: "linear-gradient(135deg, #8d1424 0%, #5c0c18 45%, #2e050b 100%)", ring: "#e8c472", label: "GOLD MEMBER", text: "#f6dc9a" },
  black: { bg: "linear-gradient(135deg, #2c2622 0%, #141110 50%, #050404 100%)", ring: "#d9b25c", label: "BLACK MEMBER", text: "#f3e3b5" },
};
