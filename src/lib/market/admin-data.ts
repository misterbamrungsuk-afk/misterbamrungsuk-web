import "server-only";
import {
  getSettings, listAccounts, listBanners, listCategories, listOrders, listPayouts, listProducts, listPromos, listReviews, listVendors,
  marketDemo, monthlySummary, vendorReport,
} from "./store";

/** ข้อมูลทั้งหมดของหน้า /admin/market (ไม่ส่ง password_hash) */
export async function adminData() {
  const [vendors, products, orders, categories, banners, promos, reviews, accounts, payouts, settings] = await Promise.all([
    listVendors(), listProducts(), listOrders(), listCategories(), listBanners(), listPromos(), listReviews(), listAccounts(), listPayouts(), getSettings(),
  ]);
  return {
    demo: marketDemo(), vendors, products, orders, categories, banners, promos, reviews, payouts, settings,
    accounts: accounts.map(({ password_hash, ...a }) => ({ ...a, active: !!password_hash })),
    summary: monthlySummary(orders, vendors), report: vendorReport(orders, vendors, payouts),
  };
}
export type AdminData = Awaited<ReturnType<typeof adminData>>;
