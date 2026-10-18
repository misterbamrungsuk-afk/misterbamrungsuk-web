import "server-only";
import {
  getSettings, listAccounts, listBanners, listCategories, listOrders, listPayouts, listProducts, listPromos, listReviews, listVendors,
  marketDemo, monthlySummary, vendorReport,
} from "./store";
import { listApplications } from "./applications";

/** ข้อมูลทั้งหมดของหน้า /admin/market (ไม่ส่ง password_hash · ใบสมัครไม่ส่ง ip) */
export async function adminData() {
  const [vendors, products, orders, categories, banners, promos, reviews, accounts, payouts, settings, apps] = await Promise.all([
    listVendors(), listProducts(), listOrders(), listCategories(), listBanners(), listPromos(), listReviews(), listAccounts(), listPayouts(), getSettings(),
    listApplications().catch(() => []),
  ]);
  return {
    demo: marketDemo(), vendors, products, orders, categories, banners, promos, reviews, payouts, settings,
    applications: apps.map(({ ip, ...a }) => a),
    accounts: accounts.map(({ password_hash, ...a }) => ({ ...a, active: !!password_hash })),
    summary: monthlySummary(orders, vendors), report: vendorReport(orders, vendors, payouts),
  };
}
export type AdminData = Awaited<ReturnType<typeof adminData>>;
