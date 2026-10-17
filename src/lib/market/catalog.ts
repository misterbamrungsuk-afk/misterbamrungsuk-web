import "server-only";
import type { Banner, Category, Product, Review, Vendor } from "./config";
import { MOCK_BANNERS, MOCK_CATEGORIES, MOCK_FEATURED, MOCK_PRODUCTS, MOCK_VENDORS, isMockId, mockReviews } from "./mock";
import { activeBanners, listCategories, listPublished, listReviews, listVendors } from "./store";

// แคตตาล็อกสำหรับหน้าร้านสาธารณะ (/market, /products, /products/[id], /shop/[slug])
// กติกา "ส่วนที่ต้องใช้ข้อมูลจริง แสดง mockup ไปก่อน จนกว่าจะมีข้อมูลจริง":
//   listPublished() (สินค้าจริงที่เผยแพร่ + อนุมัติ + มีเลข อย.) ว่าง → ใช้แคตตาล็อกตัวอย่างทั้งชุด (สินค้า/ร้าน/หมวด/แบนเนอร์/รีวิว)
//   มีสินค้าจริงแม้ 1 ชิ้น → ข้อมูลจริงล้วน (ไม่ผสมตัวอย่าง)
// ฟังก์ชันใน store.ts (listPublished/listVendors/…) ยังคืนเฉพาะข้อมูลจริง — API สั่งซื้อ/คิดราคา/แอดมิน จึงไม่เห็นสินค้าตัวอย่างเลย
export interface ShopCatalog {
  mock: boolean;
  products: Product[];
  vendors: Vendor[];
  categories: Category[];
  banners: Banner[];
  reviews: Review[];
  featured: typeof MOCK_FEATURED | null;
}

export async function shopCatalog(): Promise<ShopCatalog> {
  const products = await listPublished();
  if (!products.length) {
    return { mock: true, products: MOCK_PRODUCTS, vendors: MOCK_VENDORS, categories: MOCK_CATEGORIES, banners: MOCK_BANNERS, reviews: mockReviews(), featured: MOCK_FEATURED };
  }
  const [vendors, categories, banners, reviews] = await Promise.all([listVendors(), listCategories().catch(() => []), activeBanners().catch(() => []), listReviews().catch(() => [])]);
  return { mock: false, products, vendors, categories, banners, reviews: reviews.filter((r) => !r.hidden), featured: null };
}

/** สินค้า id นี้ในแคตตาล็อกปัจจุบัน (สินค้าตัวอย่างเปิดได้เฉพาะตอนแคตตาล็อกเป็นตัวอย่าง) */
export async function shopProduct(id: string) {
  const c = await shopCatalog();
  return { c, p: c.products.find((p) => p.id === id) ?? null };
}

/** ร้านจาก slug — ตอนเป็นตัวอย่างหาในร้านตัวอย่างก่อน แล้วค่อยร้านจริง (ร้านจริงที่ยังไม่มีสินค้ายังเปิดหน้าได้) */
export async function shopVendor(slug: string) {
  const c = await shopCatalog();
  const hit = (v: Vendor) => v.slug === slug || v.id === slug;
  let v = c.vendors.find(hit) ?? null;
  if (!v && c.mock && !isMockId(slug)) v = (await listVendors()).find(hit) ?? null;
  return { c, v };
}
