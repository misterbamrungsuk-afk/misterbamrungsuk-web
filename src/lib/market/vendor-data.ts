import "server-only";
import type { Vendor } from "./config";
import { getSettings, listCategories, listOrders, listPayouts, listProducts, listVendors, PAID_STATUSES, splitOf, vendorReport } from "./store";

/** ข้อมูลพอร์ทัลร้านค้า — เฉพาะสินค้า/รายการในออเดอร์ของร้านนี้เท่านั้น */
export async function vendorData(vendor: Vendor) {
  const [products, orders, payouts, vendors, categories, settings] = await Promise.all([listProducts(), listOrders(), listPayouts(), listVendors(), listCategories(), getSettings()]);
  const mine = orders.filter((o) => o.items.some((i) => i.vendor_id === vendor.id) && PAID_STATUSES.includes(o.status));
  return {
    vendor,
    categories,
    /** ค่าส่งกลาง (ใช้เมื่อร้านยังไม่ตั้งค่าส่งเอง) */
    shipDefault: { shipping_fee: settings.shipping_fee, free_threshold: settings.free_threshold },
    products: products.filter((p) => p.vendor_id === vendor.id),
    orders: mine.map((o) => {
      const split = PAID_STATUSES.includes(o.status) ? splitOf(o, vendors).find((s) => s.vendor_id === vendor.id) ?? null : null;
      return {
        id: o.id, order_no: o.order_no, status: o.status, created_at: o.created_at, paid_at: o.paid_at,
        buyer_name: o.buyer_name, phone: `0${o.phone.slice(2)}`, address: o.address,
        items: o.items.filter((i) => i.vendor_id === vendor.id).map(({ product_id, name, price, qty }) => ({ product_id, name, price, qty })),
        tracking: o.vendor_tracking?.[vendor.id] ?? null, split,
      };
    }),
    report: vendorReport(orders, vendors, payouts, vendor.id),
    payouts: payouts.filter((p) => p.vendor_id === vendor.id).map(({ slip_path, recorded_by, ...p }) => ({ ...p, has_slip: !!slip_path })),
  };
}
export type VendorData = Awaited<ReturnType<typeof vendorData>>;
