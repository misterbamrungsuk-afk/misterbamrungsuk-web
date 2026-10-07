import "server-only";
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Order, OrderItem, OrderStatus, Product, Vendor } from "./config";

// ที่เก็บ Marketplace
// - มี SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY และรัน supabase/market/0001_products.sql แล้ว → ตาราง market_* + bucket "market"
// - ไม่มี env / ยังไม่รัน migration → หน่วยความจำ + สินค้าตัวอย่าง (หายเมื่อรีสตาร์ท) ตามแบบ src/lib/noshow.ts

const envDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const gm = globalThis as unknown as { __mbMarketMissing?: boolean };
export const marketDemo = () => envDemo || !!gm.__mbMarketMissing;
function missing(err: { code?: string; message?: string } | null) {
  if (!err) return false;
  if (err.code === "PGRST205" || err.code === "42P01" || /could not find the table|does not exist/i.test(err.message ?? "")) {
    if (!gm.__mbMarketMissing) console.warn("[market] tables missing — run supabase/market/0001_products.sql; using in-memory store");
    gm.__mbMarketMissing = true;
    return true;
  }
  return false;
}
let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));

type Demo = { vendors: Vendor[]; products: Product[]; orders: Order[]; files: Map<string, { type: string; data: Buffer }> };
const g = globalThis as unknown as { __mbMarket?: Demo };
const now = () => new Date().toISOString();
const mem: Demo = (g.__mbMarket ??= {
  files: new Map(),
  orders: [],
  vendors: [{ id: "v-mohso", name: "คลินิกหมอโส", contact: "", gp_pct: null, created_at: now() }],
  products: [
    {
      id: "p-love-hormone", vendor_id: "v-mohso", name: "Love Hormone (ตัวอย่าง)", price: 2490, stock: 30, images: [], age_restricted: true, published: true, created_at: now(),
      fda_no: "[ตัวอย่าง] เลข อย. รอข้อมูลจริง",
      description: "ผลิตภัณฑ์เสริมอาหารนำเข้าจากสหรัฐอเมริกา คัดสรรโดยคลินิกหมอโส — ข้อมูลตัวอย่าง รอรายละเอียด ราคา รูป และเลข อย. จริงจากร้านค้า",
      warning: "ควรกินอาหารหลากหลาย ครบ 5 หมู่ ในสัดส่วนที่เหมาะสม · เด็กและสตรีมีครรภ์ไม่ควรรับประทาน",
    },
    {
      id: "p-massage-oil", vendor_id: "v-mohso", name: "Massage Oil Set (ตัวอย่าง)", price: 890, stock: 50, images: [], age_restricted: false, published: true, created_at: now(),
      fda_no: "[ตัวอย่าง] เลขจดแจ้ง รอข้อมูลจริง",
      description: "น้ำมันนวดตัวกลิ่นหอมผ่อนคลาย — ข้อมูลตัวอย่าง",
      warning: "ใช้ภายนอกเท่านั้น ทดสอบที่ท้องแขนก่อนใช้ หากระคายเคืองให้หยุดใช้",
    },
  ],
});

type Res = { data: unknown; error: { code?: string; message?: string } | null };
async function q<T>(run: () => PromiseLike<Res>, fallback: () => T): Promise<T> {
  if (marketDemo()) return fallback();
  const { data, error } = await run();
  if (missing(error)) return fallback();
  if (error) throw new Error(error.message);
  return data as T;
}
const num = (v: unknown) => (v == null ? null : Number(v));
const normOrder = (o: Order): Order => ({ ...o, total: Number(o.total), gp_pct: num(o.gp_pct), gp_amount: num(o.gp_amount), vendor_amount: num(o.vendor_amount) });
const normVendor = (v: Vendor): Vendor => ({ ...v, gp_pct: num(v.gp_pct) });

// ── vendors ──
export const listVendors = () =>
  q<Vendor[]>(() => db().from("market_vendors").select("*").order("created_at"), () => mem.vendors).then((r) => r.map(normVendor));

export async function upsertVendor(v: { id?: string; name: string; contact?: string; gp_pct?: number | null }): Promise<Vendor> {
  const row = { name: v.name, contact: v.contact ?? "", gp_pct: v.gp_pct ?? null };
  if (v.id) {
    const id = v.id;
    return q<Vendor>(() => db().from("market_vendors").update(row).eq("id", id).select().single(), () => {
      const r = mem.vendors.find((x) => x.id === id);
      if (!r) throw new Error("ไม่พบร้านค้า");
      return Object.assign(r, row);
    }).then(normVendor);
  }
  const full: Vendor = { ...row, id: randomUUID(), created_at: now() };
  return q<Vendor>(() => db().from("market_vendors").insert(full).select().single(), () => (mem.vendors.push(full), full)).then(normVendor);
}

// ── products ──
export const listProducts = () => q<Product[]>(() => db().from("market_products").select("*").order("created_at"), () => mem.products);
export const listPublished = async () => (await listProducts()).filter((p) => p.published && !!p.fda_no?.trim());
export const getProduct = async (id: string) => (await listProducts()).find((p) => p.id === id) ?? null;

export async function saveProduct(p: Omit<Product, "id" | "created_at"> & { id?: string }): Promise<Product> {
  if (p.published && !p.fda_no?.trim()) throw new Error("ต้องใส่เลข อย. ก่อนเผยแพร่");
  const { id, ...row } = p;
  if (id) {
    return q<Product>(() => db().from("market_products").update(row).eq("id", id).select().single(), () => {
      const r = mem.products.find((x) => x.id === id);
      if (!r) throw new Error("ไม่พบสินค้า");
      return Object.assign(r, row);
    });
  }
  const full: Product = { ...row, id: randomUUID(), created_at: now() };
  return q<Product>(() => db().from("market_products").insert(full).select().single(), () => (mem.products.push(full), full));
}

async function adjustStock(items: OrderItem[], sign: 1 | -1) {
  const all = await listProducts();
  for (const it of items) {
    const p = all.find((x) => x.id === it.product_id);
    if (!p) continue;
    const stock = Math.max(0, p.stock + sign * it.qty);
    await q(() => db().from("market_products").update({ stock }).eq("id", p.id).select().single(), () => (p.stock = stock));
  }
}

// ── files (รูปสินค้า / สลิป) ──
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const FILE_RE = /^(products|slips)\/\d+-\d+\.(jpg|png|webp)$/;

export async function saveFile(folder: "products" | "slips", file: File): Promise<string | null> {
  const ext = EXT[file.type];
  if (!ext || file.size > 8 * 1024 * 1024) return null;
  const path = `${folder}/${Date.now()}-${randomInt(1e6)}.${ext}`;
  const data = Buffer.from(await file.arrayBuffer());
  if (marketDemo()) { mem.files.set(path, { type: file.type, data }); return path; }
  const { error } = await db().storage.from("market").upload(path, data, { contentType: file.type, upsert: false });
  if (error) {
    console.warn("[market] upload failed (bucket missing? run market/0001) — keeping in memory:", error.message);
    mem.files.set(path, { type: file.type, data });
  }
  return path;
}

export async function readFile(path: string) {
  const local = mem.files.get(path);
  if (local || marketDemo()) return local ?? null;
  const { data, error } = await db().storage.from("market").download(path);
  if (error || !data) return null;
  return { type: data.type, data: Buffer.from(await data.arrayBuffer()) };
}

// ── orders ──
export const listOrders = () =>
  q<Order[]>(() => db().from("market_orders").select("*").order("created_at", { ascending: false }), () => [...mem.orders].reverse()).then((r) => r.map(normOrder));
export const getOrder = async (id: string) => (await listOrders()).find((o) => o.id === id) ?? null;

const orderNo = () => {
  const d = new Date(Date.now() + 7 * 3600_000).toISOString().slice(2, 10).replace(/-/g, "");
  return `MK${d}-${String(randomInt(0, 1e4)).padStart(4, "0")}`;
};

export async function createOrder(input: { buyer_name: string; phone: string; address: string; items: OrderItem[]; ip: string }): Promise<Order> {
  const total = input.items.reduce((s, i) => s + i.price * i.qty, 0);
  const row: Order = {
    id: randomUUID(), order_no: orderNo(), buyer_name: input.buyer_name, phone: input.phone, address: input.address, items: input.items, total,
    gp_pct: null, gp_amount: null, vendor_amount: null, slip_path: null, status: "pending", tracking_no: null, admin_note: null,
    age_confirmed_at: now(), ip: input.ip, paid_at: null, decided_by: null, created_at: now(),
  };
  return q<Order>(() => db().from("market_orders").insert(row).select().single(), () => (mem.orders.push(row), row)).then(normOrder);
}

export async function patchOrder(id: string, patch: Partial<Order>): Promise<Order> {
  return q<Order>(() => db().from("market_orders").update(patch).eq("id", id).select().single(), () => {
    const r = mem.orders.find((x) => x.id === id);
    if (!r) throw new Error("ไม่พบคำสั่งซื้อ");
    return Object.assign(r, patch);
  }).then(normOrder);
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** GP ต่อคำสั่งซื้อ = Σ (ราคา × จำนวน × gp_pct ของ vendor) — vendor ใดยังไม่ตั้ง GP → ทั้งออเดอร์ "รอกำหนด" (null) */
export function computeGp(items: OrderItem[], vendors: Vendor[]): Pick<Order, "gp_pct" | "gp_amount" | "vendor_amount"> {
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  let gp = 0;
  for (const it of items) {
    const pct = vendors.find((v) => v.id === it.vendor_id)?.gp_pct;
    if (pct == null) return { gp_pct: null, gp_amount: null, vendor_amount: null };
    gp += (it.price * it.qty * pct) / 100;
  }
  return { gp_pct: total ? r2((gp / total) * 100) : 0, gp_amount: r2(gp), vendor_amount: r2(total - gp) };
}

export type OrderAction = "confirm" | "reject" | "ship" | "done" | "regp";

/** แอดมินเปลี่ยนสถานะ — ยืนยันชำระ = คำนวณ GP + ตัดสต็อก; ปฏิเสธหลังยืนยัน = คืนสต็อก; regp = คำนวณ GP ใหม่ (หลังตั้ง %) */
export async function decideOrder(id: string, action: OrderAction, admin: string, extra: { tracking_no?: string; note?: string } = {}): Promise<Order> {
  const o = await getOrder(id);
  if (!o) throw new Error("ไม่พบคำสั่งซื้อ");
  const allow: Record<OrderAction, OrderStatus[]> = { confirm: ["pending"], reject: ["pending", "paid"], ship: ["paid"], done: ["shipped"], regp: ["paid", "shipped", "done"] };
  if (!allow[action].includes(o.status)) throw new Error(`สถานะปัจจุบัน (${o.status}) ทำรายการนี้ไม่ได้`);
  const patch: Partial<Order> = { decided_by: admin };
  if (extra.note !== undefined) patch.admin_note = extra.note.slice(0, 500) || null;
  if (action === "confirm") {
    if (!o.slip_path) throw new Error("ยังไม่มีสลิป");
    Object.assign(patch, { status: "paid", paid_at: now() }, computeGp(o.items, await listVendors()));
    await adjustStock(o.items, -1);
  } else if (action === "regp") {
    Object.assign(patch, computeGp(o.items, await listVendors()));
  } else if (action === "reject") {
    patch.status = "rejected";
    if (o.status === "paid") await adjustStock(o.items, 1);
  } else if (action === "ship") {
    if (!extra.tracking_no?.trim()) throw new Error("ใส่เลขพัสดุ");
    Object.assign(patch, { status: "shipped", tracking_no: extra.tracking_no.trim().slice(0, 60) });
  } else patch.status = "done";
  return patchOrder(id, patch);
}

export interface SummaryRow { month: string; vendor: string; sales: number; gp: number; payout: number; orders: number; pendingGp: number }

/** สรุปยอดต่อเดือน × vendor (เฉพาะออเดอร์ที่ยืนยันชำระแล้ว) — pendingGp = ยอดขายที่ GP ยังรอกำหนด */
export function monthlySummary(orders: Order[], vendors: Vendor[]): SummaryRow[] {
  const out = new Map<string, SummaryRow>();
  for (const o of orders) {
    if (!["paid", "shipped", "done"].includes(o.status)) continue;
    const month = new Date(Date.parse(o.paid_at ?? o.created_at) + 7 * 3600_000).toISOString().slice(0, 7);
    const byVendor = new Map<string, number>();
    for (const it of o.items) byVendor.set(it.vendor_id, (byVendor.get(it.vendor_id) ?? 0) + it.price * it.qty);
    for (const [vid, sales] of byVendor) {
      const key = `${month}|${vid}`;
      const row = out.get(key) ?? { month, vendor: vendors.find((v) => v.id === vid)?.name ?? vid, sales: 0, gp: 0, payout: 0, orders: 0, pendingGp: 0 };
      row.sales += sales;
      row.orders += 1;
      if (o.gp_amount == null) row.pendingGp += sales;
      else {
        const pct = vendors.find((v) => v.id === vid)?.gp_pct;
        // หลาย vendor ในออเดอร์เดียว: แบ่งตาม % ของ vendor นั้น (ถ้ามี) ไม่งั้นตามสัดส่วนยอด
        const gp = pct != null ? (sales * pct) / 100 : o.total ? (o.gp_amount * sales) / o.total : 0;
        row.gp = r2(row.gp + gp);
        row.payout = r2(row.payout + sales - gp);
      }
      out.set(key, row);
    }
  }
  return [...out.values()].sort((a, b) => b.month.localeCompare(a.month) || a.vendor.localeCompare(b.vendor));
}

// ── token ให้ผู้ซื้ออัปโหลดสลิปของออเดอร์ตัวเอง ──
const secret = () => process.env.ADMIN_SESSION_SECRET || "hamoo-demo-secret";
export const orderToken = (id: string) => createHmac("sha256", secret()).update(`market-order:${id}`).digest("base64url");
export function checkOrderToken(id: string, token: string) {
  const a = Buffer.from(orderToken(id)), b = Buffer.from(token || "");
  return a.length === b.length && timingSafeEqual(a, b);
}
