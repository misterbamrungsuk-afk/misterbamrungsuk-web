// ค่าคงที่ช่องรูปหน้าปก (ใช้ได้ทั้ง server และ client)
export type CoverSlot = "main_slider" | "join_poster" | "partner_hero" | "market_hero" | "market_banner";
export interface SlotConfig { ratio: number; w: number; h: number; max: number; defaults: string[] }
export const SLOTS: Record<CoverSlot, SlotConfig> = {
  main_slider: { ratio: 4 / 3, w: 1600, h: 1200, max: 6, defaults: ["/brand/cover.jpg", "/brand/cover2.jpg"] },
  join_poster: { ratio: 3 / 4, w: 1080, h: 1440, max: 1, defaults: ["/brand/poster.jpg"] },
  partner_hero: { ratio: 1, w: 1200, h: 1200, max: 1, defaults: ["/brand/venue.jpg"] },
  market_hero: { ratio: 4 / 3, w: 1600, h: 1200, max: 1, defaults: ["/brand/venue.jpg"] },
  market_banner: { ratio: 8 / 3, w: 1600, h: 600, max: 5, defaults: [] },
};
export const isSlot = (s: unknown): s is CoverSlot => typeof s === "string" && s in SLOTS;
export interface CoverRow { id: string; slot: CoverSlot; position: number; path: string; url: string }
