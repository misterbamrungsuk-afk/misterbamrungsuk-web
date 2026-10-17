import { sessionSecret } from "@/lib/session-secret";
import "server-only";
import { verifiedType } from "@/lib/file-guard";
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SAMPLE_BLOCK, isMockId } from "./mock";
import {
  DEFAULT_SETTINGS, baht, promoDiscount, shippingFor, slugify,
  type Banner, type Category, type MarketSettings, type Order, type OrderItem, type OrderStatus, type Payout,
  type Product, type Promo, type Review, type Vendor, type VendorAccount, type VendorSplit,
} from "./config";

// ที่เก็บ Marketplace
// - มี SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY และรัน supabase/market/0001_products.sql + 0002_marketplace_v2.sql แล้ว → ตาราง market_* + bucket "market"
// - ไม่มี env / ยังไม่รัน migration (ตารางหรือคอลัมน์ไม่มี) → หน่วยความจำ + ข้อมูลตัวอย่าง (หายเมื่อรีสตาร์ท) ตามแบบ src/lib/noshow.ts
// - หน้าร้านสาธารณะอ่านผ่าน catalog.ts: ยังไม่มีสินค้าจริงที่เผยแพร่ → แคตตาล็อกตัวอย่าง (mock.ts) · ฟังก์ชันในไฟล์นี้คืนเฉพาะข้อมูลจริง

const envDemo = !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const gm = globalThis as unknown as { __mbMarketMissing?: boolean };
export const marketDemo = () => envDemo || !!gm.__mbMarketMissing;
function missing(err: { code?: string; message?: string } | null) {
  if (!err) return false;
  if (
    err.code === "PGRST205" || err.code === "PGRST204" || err.code === "42P01" || err.code === "42703" ||
    /could not find the table|does not exist|could not find the '.*' column/i.test(err.message ?? "")
  ) {
    if (!gm.__mbMarketMissing) console.warn("[market] tables/columns missing — run supabase/market/0001 + 0002; using in-memory store");
    gm.__mbMarketMissing = true;
    return true;
  }
  return false;
}
let sb: SupabaseClient | null = null;
const db = () => (sb ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }));

type Demo = {
  vendors: Vendor[]; products: Product[]; orders: Order[]; files: Map<string, { type: string; data: Buffer }>;
  categories: Category[]; reviews: Review[]; banners: Banner[]; promos: Promo[]; accounts: VendorAccount[]; payouts: Payout[];
  settings: MarketSettings;
};
const g = globalThis as unknown as { __mbMarket?: Partial<Demo> };
const now = () => new Date().toISOString();
const m = (g.__mbMarket ??= {});
// เติมทีละคีย์ — เผื่อ dev server ที่ถือ object รุ่นเก่าไว้ (hot reload)
m.files ??= new Map();
m.orders ??= [];
m.vendors ??= [{ id: "v-mohso", name: "คลินิกหมอโส", contact: "", gp_pct: null, created_at: now() }];
for (const v of m.vendors) { v.slug ??= v.id === "v-mohso" ? "mohso" : slugify(v.name); v.description ??= ""; v.logo ??= null; }
m.categories ??= [
  { id: "c-supplement", name: "ผลิตภัณฑ์เสริมอาหาร", slug: "supplement", sort: 1 },
  { id: "c-body", name: "ผลิตภัณฑ์ดูแลผิวกาย", slug: "body-care", sort: 2 },
];
// ไม่ใส่สินค้าตัวอย่างในหน่วยความจำ — รายการสินค้าว่าง = หน้าร้านแสดงแคตตาล็อกตัวอย่าง (src/lib/market/mock.ts ผ่าน catalog.ts)
// เหมือนโปรดักชันที่มีฐานข้อมูลแต่ยังไม่มีสินค้าจริง · ใส่สินค้าทดลองในโหมดนี้ได้จาก /admin/market
m.products ??= [];
for (const p of m.products) { p.approved ??= true; p.bundle_ids ??= []; p.category_id ??= null; }
m.reviews ??= [];
m.banners ??= [
  { id: "b-1", title: "สินค้าคัดสรร มีเลข อย. ทุกชิ้น", subtitle: "แพ็กมิดชิด ไม่ระบุชื่อสินค้าหน้ากล่อง", image: "", link: "/products", sort: 1, active: true },
  { id: "b-2", title: "สปาและโรงแรมพาร์ทเนอร์", subtitle: "นัดเพื่อนในสถานที่ที่ผ่านมาตรฐาน", image: "", link: "/spas", sort: 2, active: true },
];
m.promos ??= [];
m.accounts ??= [];
m.payouts ??= [];
m.settings ??= { ...DEFAULT_SETTINGS };
const mem = m as Demo;

type Res = { data: unknown; error: { code?: string; message?: string } | null };
async function q<T>(run: () => PromiseLike<Res>, fallback: () => T): Promise<T> {
  if (marketDemo()) return fallback();
  const { data, error } = await run();
  if (missing(error)) return fallback();
  if (error) throw new Error(error.message);
  return data as T;
}
const num = (v: unknown) => (v == null ? null : Number(v));
const normOrder = (o: Order): Order => ({
  ...o, total: Number(o.total), gp_pct: num(o.gp_pct), gp_amount: num(o.gp_amount), vendor_amount: num(o.vendor_amount),
  subtotal: o.subtotal == null ? o.items.reduce((s, i) => s + i.price * i.qty, 0) : Number(o.subtotal),
  discount: Number(o.discount ?? 0), shipping_fee: Number(o.shipping_fee ?? 0), vendor_tracking: o.vendor_tracking ?? {},
});
const normVendor = (v: Vendor): Vendor => ({ ...v, gp_pct: num(v.gp_pct), slug: v.slug || slugify(v.name), description: v.description ?? "" });
const normProduct = (p: Product): Product => ({ ...p, approved: p.approved ?? true, bundle_ids: p.bundle_ids ?? [], category_id: p.category_id ?? null });

// ── ตารางทั่วไป (CRUD) ──
type Key = "categories" | "reviews" | "banners" | "promos" | "accounts" | "payouts";
const TABLE: Record<Key, string> = {
  categories: "market_categories", reviews: "market_reviews", banners: "market_banners",
  promos: "market_promos", accounts: "market_vendor_accounts", payouts: "market_payouts",
};
type Row<K extends Key> = Demo[K][number];
function listT<K extends Key>(k: K, order = "created_at"): Promise<Row<K>[]> {
  return q<Row<K>[]>(() => db().from(TABLE[k]).select("*").order(order), () => [...(mem[k] as Row<K>[])]);
}
function insertT<K extends Key>(k: K, row: Row<K>): Promise<Row<K>> {
  return q<Row<K>>(() => db().from(TABLE[k]).insert(row).select().single(), () => ((mem[k] as Row<K>[]).push(row), row));
}
function updateT<K extends Key>(k: K, id: string, patch: Partial<Row<K>>): Promise<Row<K>> {
  return q<Row<K>>(() => db().from(TABLE[k]).update(patch as never).eq("id", id).select().single(), () => {
    const r = (mem[k] as Row<K>[]).find((x) => x.id === id);
    if (!r) throw new Error("ไม่พบรายการ");
    return Object.assign(r, patch);
  });
}
function deleteT(k: Key, id: string): Promise<boolean> {
  return q<boolean>(() => db().from(TABLE[k]).delete().eq("id", id).then((r) => ({ data: true, error: r.error })), () => {
    const arr = mem[k] as { id: string }[];
    const i = arr.findIndex((x) => x.id === id);
    if (i >= 0) arr.splice(i, 1);
    return true;
  });
}

// ── vendors ──
const asciiSlug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || `shop-${randomUUID().slice(0, 6)}`;
export const listVendors = () =>
  q<Vendor[]>(() => db().from("market_vendors").select("*").order("created_at"), () => mem.vendors).then((r) => r.map(normVendor));
export const getVendorBySlug = async (slug: string) => (await listVendors()).find((v) => v.slug === slug || v.id === slug) ?? null;

export async function upsertVendor(v: { id?: string; name: string; contact?: string; gp_pct?: number | null; slug?: string; description?: string }): Promise<Vendor> {
  const all = await listVendors();
  const row: Partial<Vendor> = { name: v.name, contact: v.contact ?? "", gp_pct: v.gp_pct ?? null };
  if (v.description !== undefined) row.description = v.description.slice(0, 2000);
  if (v.slug !== undefined || !v.id) {
    // ร้านใหม่ = slug ภาษาอังกฤษ/ตัวเลขเท่านั้น (ชื่อไทยล้วน → shop-xxxxxx) ลิงก์ /shop/… อ่าน/แชร์ง่าย · ร้านเดิมคง slug เดิม
    const slug = !v.id ? asciiSlug(v.slug || v.name) : slugify(v.slug || v.name);
    if (all.some((x) => x.slug === slug && x.id !== v.id)) throw new Error("slug ร้านซ้ำ");
    row.slug = slug;
  }
  if (v.id) {
    const id = v.id;
    return q<Vendor>(() => db().from("market_vendors").update(row).eq("id", id).select().single(), () => {
      const r = mem.vendors.find((x) => x.id === id);
      if (!r) throw new Error("ไม่พบร้านค้า");
      return Object.assign(r, row);
    }).then(normVendor);
  }
  const full = { description: "", logo: null, ...row, id: randomUUID(), created_at: now() } as Vendor;
  return q<Vendor>(() => db().from("market_vendors").insert(full).select().single(), () => (mem.vendors.push(full), full)).then(normVendor);
}

// ── products ──
export const listProducts = () => q<Product[]>(() => db().from("market_products").select("*").order("created_at"), () => mem.products).then((r) => r.map(normProduct));
export const isPublic = (p: Product) => p.published && p.approved !== false && !!p.fda_no?.trim();
export const listPublished = async () => (await listProducts()).filter(isPublic);
export const getProduct = async (id: string) => (await listProducts()).find((p) => p.id === id) ?? null;

export async function saveProduct(p: Omit<Product, "id" | "created_at"> & { id?: string }): Promise<Product> {
  if (p.published && !p.fda_no?.trim()) throw new Error("ต้องใส่เลข อย. ก่อนเผยแพร่");
  const { id, ...row } = p;
  if (id) {
    return q<Product>(() => db().from("market_products").update(row).eq("id", id).select().single(), () => {
      const r = mem.products.find((x) => x.id === id);
      if (!r) throw new Error("ไม่พบสินค้า");
      return Object.assign(r, row);
    }).then(normProduct);
  }
  const full: Product = { ...row, id: randomUUID(), created_at: now() };
  return q<Product>(() => db().from("market_products").insert(full).select().single(), () => (mem.products.push(full), full)).then(normProduct);
}

/** ลบสินค้า — เคยอยู่ในออเดอร์แล้ว = ลบไม่ได้ (ประวัติบัญชี) → ซ่อนจากหน้าเว็บแทน */
export async function removeProduct(id: string): Promise<{ deleted: boolean; archived: boolean }> {
  const p = await getProduct(id);
  if (!p) throw new Error("ไม่พบสินค้า");
  if ((await listOrders()).some((o) => o.items.some((i) => i.product_id === id))) {
    await q(() => db().from("market_products").update({ published: false }).eq("id", id).select().single(), () => { const r = mem.products.find((x) => x.id === id); if (r) r.published = false; return r; });
    return { deleted: false, archived: true };
  }
  await q(() => db().from("market_products").delete().eq("id", id).then((r) => ({ data: true, error: r.error })), () => { const i = mem.products.findIndex((x) => x.id === id); if (i >= 0) mem.products.splice(i, 1); return true; });
  return { deleted: true, archived: false };
}
/** ลบร้าน — มีออเดอร์แล้ว = ซ่อนสินค้าทั้งร้านแทน (กระเป๋า/รายงานยังอ้างอิงได้) · ไม่มี = ลบสินค้า บัญชีร้าน และร้าน */
export async function removeVendor(id: string): Promise<{ deleted: boolean; archived: boolean }> {
  if (!(await listVendors()).some((v) => v.id === id)) throw new Error("ไม่พบร้านค้า");
  const mine = (await listProducts()).filter((p) => p.vendor_id === id);
  if ((await listOrders()).some((o) => o.items.some((i) => i.vendor_id === id))) {
    for (const p of mine) if (p.published) await saveProduct({ ...p, published: false });
    return { deleted: false, archived: true };
  }
  for (const p of mine) await removeProduct(p.id);
  for (const a of (await listAccounts()).filter((x) => x.vendor_id === id)) await deleteAccount(a.id);
  await q(() => db().from("market_vendors").delete().eq("id", id).then((r) => ({ data: true, error: r.error })), () => { const i = mem.vendors.findIndex((x) => x.id === id); if (i >= 0) mem.vendors.splice(i, 1); return true; });
  return { deleted: true, archived: false };
}

async function adjustStock(items: OrderItem[], sign: 1 | -1) {
  const all = await listProducts();
  for (const it of items) {
    const p = all.find((x) => x.id === it.product_id);
    if (!p) continue;
    const stock = Math.max(0, p.stock + sign * it.qty);
    await q(() => db().from("market_products").update({ stock }).eq("id", p.id).select().single(), () => {
      const r = mem.products.find((x) => x.id === p.id);
      if (r) r.stock = stock;
    });
  }
}

/** สินค้าที่เกี่ยวข้อง: หมวดเดียวกันก่อน แล้วร้านเดียวกัน */
export function relatedOf(p: Product, all: Product[], n = 4) {
  const pub = all.filter((x) => x.id !== p.id && isPublic(x));
  const score = (x: Product) => (p.category_id && x.category_id === p.category_id ? 2 : 0) + (x.vendor_id === p.vendor_id ? 1 : 0);
  return pub.filter((x) => score(x) > 0).sort((a, b) => score(b) - score(a)).slice(0, n);
}
/** ซื้อคู่กัน: แอดมินตั้ง (bundle_ids) → ไม่งั้นนับจากออเดอร์ที่เคยซื้อด้วยกัน → ไม่งั้นหมวดเดียวกัน/ร้านเดียวกัน */
export function bundleOf(p: Product, all: Product[], orders: Order[], n = 3) {
  const pub = all.filter((x) => x.id !== p.id && isPublic(x));
  if (p.bundle_ids?.length) return { auto: false, items: p.bundle_ids.map((id) => pub.find((x) => x.id === id)).filter((x): x is Product => !!x).slice(0, n) };
  const co = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "rejected" || !o.items.some((i) => i.product_id === p.id)) continue;
    for (const i of o.items) if (i.product_id !== p.id) co.set(i.product_id, (co.get(i.product_id) ?? 0) + 1);
  }
  const byCo = pub.filter((x) => co.has(x.id)).sort((a, b) => co.get(b.id)! - co.get(a.id)!);
  const rest = relatedOf(p, all, n).filter((x) => !byCo.includes(x));
  return { auto: true, items: [...byCo, ...rest].slice(0, n) };
}

// ── files (รูปสินค้า / สลิป / สลิปโอนร้าน) ──
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const FILE_RE = /^(products|slips|payouts|banners)\/\d+-\d+\.(jpg|png|webp)$/;

export async function saveFile(folder: "products" | "slips" | "payouts" | "banners", file: File): Promise<string | null> {
  const ext = EXT[file.type];
  if (!ext || file.size > 8 * 1024 * 1024) return null;
  const path = `${folder}/${Date.now()}-${randomInt(1e6)}.${ext}`;
  const data = Buffer.from(await file.arrayBuffer());
  let type: string;
  try { type = verifiedType(data); } catch { return null; }
  if (type !== file.type) return null;
  if (marketDemo()) { mem.files.set(path, { type, data }); return path; }
  const { error } = await db().storage.from("market").upload(path, data, { contentType: type, upsert: false });
  if (error) {
    console.warn("[market] upload failed (bucket missing? run market/0001) — keeping in memory:", error.message);
    mem.files.set(path, { type, data });
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

// ── settings (แถวเดียว id=1, data jsonb) ──
export async function getSettings(): Promise<MarketSettings> {
  const row = await q<{ data: Partial<MarketSettings> } | null>(
    () => db().from("market_settings").select("data").eq("id", 1).maybeSingle(),
    () => ({ data: mem.settings }),
  );
  return { ...DEFAULT_SETTINGS, ...(row?.data ?? {}) };
}
export async function saveSettings(patch: Partial<MarketSettings>): Promise<MarketSettings> {
  const next = { ...(await getSettings()), ...patch };
  await q(() => db().from("market_settings").upsert({ id: 1, data: next, updated_at: now() }).select().single(), () => (mem.settings = next));
  return next;
}

// ── categories / banners / promos / reviews ──
export const listCategories = () => listT("categories", "sort").then((r) => r.sort((a, b) => a.sort - b.sort));
export async function saveCategory(c: Partial<Category> & { name: string }) {
  const row = { name: c.name.slice(0, 80), slug: slugify(c.slug || c.name), sort: Math.floor(Number(c.sort ?? 0)) };
  return c.id ? updateT("categories", c.id, row) : insertT("categories", { ...row, id: randomUUID() });
}
export const deleteCategory = (id: string) => deleteT("categories", id);

export const listBanners = () => listT("banners", "sort").then((r) => r.sort((a, b) => a.sort - b.sort));
export const activeBanners = async () => (await listBanners()).filter((b) => b.active);
export async function saveBanner(b: Partial<Banner> & { title: string }) {
  const row = { title: b.title.slice(0, 120), subtitle: (b.subtitle ?? "").slice(0, 200), image: b.image ?? "", link: (b.link ?? "").slice(0, 300), sort: Math.floor(Number(b.sort ?? 0)), active: b.active !== false };
  if (row.link && !/^\/(?!\/)/.test(row.link)) throw new Error("ลิงก์ต้องขึ้นต้นด้วย / (หน้าในเว็บ)");
  return b.id ? updateT("banners", b.id, row) : insertT("banners", { ...row, id: randomUUID() });
}
export const deleteBanner = (id: string) => deleteT("banners", id);

export const listPromos = () => listT("promos");
export const findPromo = async (code: string) => (await listPromos()).find((p) => p.code === code.trim().toUpperCase()) ?? null;
export async function savePromo(p: Partial<Promo> & { code: string }) {
  const code = p.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
  if (!code) throw new Error("ใส่โค้ด");
  const kind = p.kind === "fixed" ? "fixed" : "percent";
  const value = Number(p.value);
  if (!(value > 0) || (kind === "percent" && value > 100)) throw new Error("มูลค่าส่วนลดไม่ถูกต้อง");
  const all = await listPromos();
  if (all.some((x) => x.code === code && x.id !== p.id)) throw new Error("โค้ดซ้ำ");
  const row = {
    code, kind, value, min_spend: Math.max(0, Number(p.min_spend ?? 0)),
    expires_at: p.expires_at || null, usage_limit: p.usage_limit == null || (p.usage_limit as unknown) === "" ? null : Math.max(0, Math.floor(Number(p.usage_limit))),
    active: p.active !== false,
  } as Partial<Promo>;
  return p.id ? updateT("promos", p.id, row) : insertT("promos", { ...(row as Promo), id: randomUUID(), used_count: 0, created_at: now() });
}
export const deletePromo = (id: string) => deleteT("promos", id);

export const listReviews = () => listT("reviews").then((r) => r.sort((a, b) => b.created_at.localeCompare(a.created_at)));
export const visibleReviews = async (productId: string) => (await listReviews()).filter((r) => r.product_id === productId && !r.hidden);
export const setReviewHidden = (id: string, hidden: boolean) => updateT("reviews", id, { hidden });

/** รีวิวได้เมื่อมีออเดอร์ "สำเร็จ" ที่มีสินค้านี้ของเบอร์นี้ และยังไม่เคยรีวิวสินค้านี้จากออเดอร์นั้น */
export async function reviewEligibility(phone: string, productId: string): Promise<{ ok: true; order: Order } | { ok: false; error: string }> {
  const done = (await listOrders()).filter((o) => o.phone === phone && o.status === "done" && o.items.some((i) => i.product_id === productId));
  if (!done.length) return { ok: false, error: "รีวิวได้เฉพาะผู้ซื้อที่ได้รับสินค้าแล้ว (คำสั่งซื้อสถานะสำเร็จ)" };
  const mine = (await listReviews()).filter((r) => r.product_id === productId && r.phone === phone);
  const order = done.find((o) => !mine.some((r) => r.order_id === o.id));
  return order ? { ok: true, order } : { ok: false, error: "คุณรีวิวสินค้านี้แล้ว" };
}
export async function addReview(input: { phone: string; product_id: string; stars: number; text: string; name: string }) {
  const el = await reviewEligibility(input.phone, input.product_id);
  if (!el.ok) throw new Error(el.error);
  return insertT("reviews", {
    id: randomUUID(), product_id: input.product_id, order_id: el.order.id, phone: input.phone, name: input.name.slice(0, 40) || "ผู้ซื้อ",
    stars: Math.min(5, Math.max(1, Math.round(input.stars))), text: input.text.slice(0, 1000), hidden: false, created_at: now(),
  });
}

// ── vendor accounts / payouts ──
export const listAccounts = () => listT("accounts", "invited_at");
export const getAccount = async (id: string) => (await listAccounts()).find((a) => a.id === id) ?? null;
export const findAccountByEmail = async (email: string) => (await listAccounts()).find((a) => a.email === email.trim().toLowerCase()) ?? null;
export async function inviteAccount(vendor_id: string, email: string) {
  const e = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error("อีเมลไม่ถูกต้อง");
  if (!(await listVendors()).some((v) => v.id === vendor_id)) throw new Error("ไม่พบร้านค้า");
  const ex = await findAccountByEmail(e);
  if (ex) {
    if (ex.vendor_id !== vendor_id) throw new Error("อีเมลนี้ผูกกับร้านอื่นแล้ว");
    return updateT("accounts", ex.id, { invited_at: now() });
  }
  return insertT("accounts", { id: randomUUID(), vendor_id, email: e, password_hash: null, invited_at: now(), last_login_at: null });
}
export const patchAccount = (id: string, p: Partial<VendorAccount>) => updateT("accounts", id, p);
export const deleteAccount = (id: string) => deleteT("accounts", id);

export const listPayouts = () => listT("payouts");
export async function recordPayout(p: Omit<Payout, "id" | "created_at">) {
  if ((await listPayouts()).some((x) => x.vendor_id === p.vendor_id && x.month === p.month)) throw new Error("รอบนี้บันทึกการโอนแล้ว");
  return insertT("payouts", { ...p, id: randomUUID(), created_at: now() });
}

// ── orders ──
export const listOrders = () =>
  q<Order[]>(() => db().from("market_orders").select("*").order("created_at", { ascending: false }), () => [...mem.orders].reverse()).then((r) => r.map(normOrder));
export const getOrder = async (id: string) => (await listOrders()).find((o) => o.id === id) ?? null;
export const findOrderByNo = async (no: string) => (await listOrders()).find((o) => o.order_no === no.trim().toUpperCase()) ?? null;

const orderNo = () => {
  const d = new Date(Date.now() + 7 * 3600_000).toISOString().slice(2, 10).replace(/-/g, "");
  return `MK${d}-${String(randomInt(0, 1e4)).padStart(4, "0")}`;
};

/** ราคา: subtotal → ส่วนลดโค้ด → ค่าส่ง (คิดจากยอดหลังส่วนลด) */
export async function priceCart(items: OrderItem[], code?: string | null) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  let discount = 0, promo: Promo | null = null, promoError = "";
  if (code?.trim()) {
    promo = await findPromo(code);
    const r = promoDiscount(promo, subtotal);
    if (r.ok) discount = r.discount; else { promoError = r.error; promo = null; }
  }
  const settings = await getSettings();
  const shipping_fee = shippingFor(settings, subtotal - discount);
  return { subtotal, discount, promo, promoError, shipping_fee, total: r2(subtotal - discount + shipping_fee), settings };
}

export async function createOrder(input: { buyer_name: string; phone: string; address: string; items: OrderItem[]; ip: string; promo_code?: string | null; customer?: { id: string; email: string } | null }): Promise<Order> {
  // กันชั้นสุดท้าย: สินค้าตัวอย่าง (mock-*) ห้ามเกิดออเดอร์/รับเงินจริง
  if (input.items.some((i) => isMockId(i.product_id))) throw new Error(SAMPLE_BLOCK);
  const pr = await priceCart(input.items, input.promo_code);
  if (input.promo_code?.trim() && !pr.promo) throw new Error(pr.promoError || "โค้ดส่วนลดใช้ไม่ได้");
  const row: Order = {
    id: randomUUID(), order_no: orderNo(), buyer_name: input.buyer_name, phone: input.phone, address: input.address, items: input.items, total: pr.total,
    gp_pct: null, gp_amount: null, vendor_amount: null, slip_path: null, status: "pending", tracking_no: null, admin_note: null,
    age_confirmed_at: now(), ip: input.ip, paid_at: null, decided_by: null, created_at: now(),
    subtotal: pr.subtotal, discount: pr.discount, promo_code: pr.promo?.code ?? null, shipping_fee: pr.shipping_fee,
    carrier: null, shipped_at: null, done_at: null, reject_reason: null, vendor_split: null, vendor_tracking: {},
    ...(input.customer ? { customer_id: input.customer.id, customer_email: input.customer.email } : {}),
  };
  const o = await q<Order>(() => db().from("market_orders").insert(row).select().single(), () => (mem.orders.push(row), row)).then(normOrder);
  if (pr.promo) await updateT("promos", pr.promo.id, { used_count: pr.promo.used_count + 1 }).catch(() => {});
  return o;
}

/** from = เปลี่ยนได้เฉพาะเมื่อสถานะยังเป็นค่านี้ (กันกดพร้อมกัน 2 ครั้งแล้วตัดสต็อก/ลงเงินซ้ำ) */
export async function patchOrder(id: string, patch: Partial<Order>, from?: OrderStatus): Promise<Order> {
  return q<Order>(() => { let u = db().from("market_orders").update(patch).eq("id", id); if (from) u = u.eq("status", from); return u.select().single(); }, () => {
    const r = mem.orders.find((x) => x.id === id);
    if (!r) throw new Error("ไม่พบคำสั่งซื้อ");
    if (from && r.status !== from) throw new Error("สถานะคำสั่งซื้อเปลี่ยนไปแล้ว ลองโหลดหน้าใหม่");
    return Object.assign(r, patch);
  }).then(normOrder).catch((e) => { if (from && /PGRST116|0 rows|multiple \(or no\) rows/i.test(String((e as { code?: string; message?: string })?.code ?? "") + String((e as Error)?.message ?? ""))) throw new Error("สถานะคำสั่งซื้อเปลี่ยนไปแล้ว ลองโหลดหน้าใหม่"); throw e; });
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * ส่วนแบ่งต่อร้าน — ส่วนลดและค่าส่งปันตามสัดส่วนยอดสินค้าของแต่ละร้าน
 * net = gross − discount; GP = net × gp_pct (GP คิดเฉพาะยอดสินค้าที่จ่ายจริง ไม่รวมค่าส่ง)
 * payout = net − GP + shipping (ร้านจัดส่งเอง จึงได้ค่าส่ง)
 */
export function computeSplit(o: Pick<Order, "items" | "discount" | "shipping_fee">, vendors: Vendor[]): VendorSplit[] {
  const gross = new Map<string, number>();
  for (const it of o.items) gross.set(it.vendor_id, (gross.get(it.vendor_id) ?? 0) + it.price * it.qty);
  const subtotal = [...gross.values()].reduce((a, b) => a + b, 0);
  const disc = Number(o.discount ?? 0), ship = Number(o.shipping_fee ?? 0);
  const ids = [...gross.keys()];
  let dLeft = disc, sLeft = ship;
  return ids.map((vid, i) => {
    const g = gross.get(vid)!;
    const last = i === ids.length - 1;
    const d = last ? r2(dLeft) : r2(subtotal ? (disc * g) / subtotal : 0);
    const s = last ? r2(sLeft) : r2(subtotal ? (ship * g) / subtotal : 0);
    dLeft -= d; sLeft -= s;
    const net = r2(g - d);
    const pct = vendors.find((v) => v.id === vid)?.gp_pct ?? null;
    const gp = pct == null ? null : r2((net * pct) / 100);
    return { vendor_id: vid, gross: g, discount: d, net, gp_pct: pct, gp, shipping: s, payout: gp == null ? null : r2(net - gp + s) };
  });
}
/** GP ระดับออเดอร์ — ร้านใดยังไม่ตั้ง GP → ทั้งออเดอร์ "รอกำหนด" (null) */
export function computeGp(o: Pick<Order, "items" | "discount" | "shipping_fee">, vendors: Vendor[]): Pick<Order, "gp_pct" | "gp_amount" | "vendor_amount" | "vendor_split"> {
  const split = computeSplit(o, vendors);
  if (split.some((s) => s.gp == null)) return { gp_pct: null, gp_amount: null, vendor_amount: null, vendor_split: split };
  const net = split.reduce((a, s) => a + s.net, 0), gp = split.reduce((a, s) => a + s.gp!, 0);
  return { gp_pct: net ? r2((gp / net) * 100) : 0, gp_amount: r2(gp), vendor_amount: r2(split.reduce((a, s) => a + s.payout!, 0)), vendor_split: split };
}

export type OrderAction = "confirm" | "reject" | "ship" | "done" | "regp" | "refunded";
/** ป้ายใน admin_note: ปฏิเสธออเดอร์ที่ผู้ซื้อโอนแล้ว (มีสลิป) → ต้องคืนเงินนอกระบบ · คืนแล้วเปลี่ยนป้าย */
export const REFUND_DUE = "[ต้องคืนเงินผู้ซื้อ";
export const REFUND_DONE = "[คืนเงินผู้ซื้อแล้ว";

/** แอดมินเปลี่ยนสถานะ — ยืนยันชำระ = คำนวณ GP + ตัดสต็อก; ปฏิเสธหลังยืนยัน = คืนสต็อก; regp = คำนวณ GP ใหม่ (หลังตั้ง %) */
export async function decideOrder(id: string, action: OrderAction, admin: string, extra: { tracking_no?: string; carrier?: string; note?: string; reason?: string } = {}): Promise<Order> {
  const o = await getOrder(id);
  if (!o) throw new Error("ไม่พบคำสั่งซื้อ");
  const allow: Record<OrderAction, OrderStatus[]> = { confirm: ["pending"], reject: ["pending", "paid"], ship: ["paid"], done: ["shipped"], regp: ["paid", "shipped", "done"], refunded: ["rejected"] };
  if (!allow[action].includes(o.status)) throw new Error(`สถานะปัจจุบัน (${o.status}) ทำรายการนี้ไม่ได้`);
  const patch: Partial<Order> = { decided_by: admin };
  if (extra.note !== undefined) patch.admin_note = extra.note.slice(0, 500) || null;
  if (action === "confirm") {
    if (!o.slip_path) throw new Error("ยังไม่มีสลิป");
    Object.assign(patch, { status: "paid", paid_at: now() }, computeGp(o, await listVendors()));
  } else if (action === "regp") {
    Object.assign(patch, computeGp(o, await listVendors()));
    if (o.status === "done") { const out = await patchOrder(id, patch); await creditVendors(out, admin).catch((e) => console.error("market credit", e)); return out; }
  } else if (action === "reject") {
    const reason = (extra.reason ?? "").trim().slice(0, 300);
    if (!reason) throw new Error("ระบุเหตุผลที่ปฏิเสธ");
    patch.status = "rejected";
    patch.reject_reason = reason;
    // ล้างส่วนแบ่ง/GP — ออเดอร์ที่ปฏิเสธต้องไม่ถูกนับเป็นยอดขาย/ค้างจ่ายร้าน
    Object.assign(patch, { gp_amount: null, vendor_amount: null, vendor_split: null });
    // ผู้ซื้อโอนแล้ว (มีสลิป) = เงินอยู่นอกระบบ → ติดป้ายต้องคืนเงินพร้อมยอด ให้แอดมินตามคืน
    if (o.slip_path) patch.admin_note = `${REFUND_DUE} ฿${baht(Number(o.total))}] ${extra.note ?? o.admin_note ?? ""}`.trim().slice(0, 500);
  } else if (action === "refunded") {
    const cur = o.admin_note ?? "";
    if (!cur.startsWith(REFUND_DUE)) throw new Error("ออเดอร์นี้ไม่มีรายการต้องคืนเงิน");
    patch.admin_note = `${REFUND_DONE} ฿${baht(Number(o.total))} · ${new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)}${extra.note ? ` · ${extra.note}` : ""}] ${cur.replace(/^\[[^\]]*\]\s*/, "")}`.slice(0, 500);

  } else if (action === "ship") {
    if (!extra.tracking_no?.trim()) throw new Error("ใส่เลขพัสดุ");
    Object.assign(patch, { status: "shipped", tracking_no: extra.tracking_no.trim().slice(0, 60), carrier: extra.carrier || null, shipped_at: now() });
  } else Object.assign(patch, { status: "done", done_at: now() });
  const out = await patchOrder(id, patch, o.status);
  if (action === "confirm") await adjustStock(o.items, -1);
  if (action === "reject" && o.status === "paid") await adjustStock(o.items, 1);
  if (out.status === "done") {
    await creditVendors(out, admin).catch((e) => console.error("market credit", e));
    // แต้มสมาชิก: เฉพาะออเดอร์ที่ลูกค้าล็อกอินตอนสั่ง (คิดจากยอดที่จ่ายจริง) · ครั้งเดียวต่อออเดอร์
    if (out.customer_id) await import("@/lib/member").then((m) => m.awardPoints(out.customer_id!, out.customer_email ?? "", Math.round(Number(out.total) * 100), `mk:${out.id}`, `ซื้อสินค้า ${out.order_no}`)).catch((e) => console.error("market points", e));
  }
  return out;
}

/** ออเดอร์สำเร็จ → ส่วนของแต่ละร้าน (สุทธิ − GP + ค่าส่ง) เข้ากระเป๋าร้าน · เงินลูกค้าเข้าบัญชีบริษัท · GP + เศษ = รายได้บริษัท
 *  ลงครั้งเดียวต่อออเดอร์ (idem) · ร้านยังไม่ตั้ง GP = ยังไม่ลง (ลงเมื่อแอดมินคำนวณ GP ใหม่หลังตั้ง %) */
export async function creditVendors(o: Order, actor: string): Promise<boolean> {
  const split = o.vendor_split ?? computeSplit(o, await listVendors());
  if (!split.length || split.some((x) => x.payout == null)) return false;
  const { post, PLATFORM } = await import("@/lib/wallet");
  const total = Math.round(Number(o.total) * 100);
  const legs = split.map((x) => ({ owner_type: "vendor" as const, owner_id: x.vendor_id, bucket: "available", amount: Math.round(x.payout! * 100) })).filter((l) => l.amount > 0);
  const toVendors = legs.reduce((a, l) => a + l.amount, 0);
  const all = [{ owner_type: "platform" as const, owner_id: PLATFORM, bucket: "bank", amount: -total }, ...legs, { owner_type: "platform" as const, owner_id: PLATFORM, bucket: "revenue", amount: total - toVendors }].filter((l) => l.amount !== 0);
  if (all.length < 2) return false;
  await post("market_sale", { type: "market_order", id: o.id }, `market:${o.id}`, `ออเดอร์ ${o.order_no} สำเร็จ`, actor, all);
  return true;
}

/** ร้านใส่เลขพัสดุของสินค้าตัวเอง — ครบทุกร้านในออเดอร์ → สถานะ "จัดส่งแล้ว" อัตโนมัติ */
export async function setVendorTracking(orderId: string, vendorId: string, tracking_no: string, carrier: string): Promise<{ order: Order; shippedNow: boolean }> {
  const o = await getOrder(orderId);
  if (!o || !o.items.some((i) => i.vendor_id === vendorId)) throw new Error("ไม่พบคำสั่งซื้อ");
  if (o.status !== "paid" && o.status !== "shipped") throw new Error("ใส่เลขพัสดุได้หลังทีมงานยืนยันการชำระ");
  const no = tracking_no.trim().slice(0, 60);
  if (!no) throw new Error("ใส่เลขพัสดุ");
  const vt = { ...(o.vendor_tracking ?? {}), [vendorId]: { tracking_no: no, carrier, at: now() } };
  const vids = [...new Set(o.items.map((i) => i.vendor_id))];
  const all = vids.every((v) => vt[v]);
  const patch: Partial<Order> = { vendor_tracking: vt };
  const shippedNow = all && o.status === "paid";
  if (all) {
    patch.tracking_no = vids.map((v) => vt[v].tracking_no).join(", ").slice(0, 200);
    patch.carrier = vids.length === 1 ? carrier : vt[vids[0]].carrier;
    if (shippedNow) Object.assign(patch, { status: "shipped", shipped_at: now() });
  }
  return { order: await patchOrder(orderId, patch), shippedNow };
}

export const PAID_STATUSES: OrderStatus[] = ["paid", "shipped", "done"];
export const thMonth = (iso: string) => new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(0, 7);
/** ส่วนแบ่งที่ใช้ทำรายงาน — ใช้ที่บันทึกไว้ตอนยืนยัน ถ้า GP ยังรอกำหนดคิดใหม่ตาม % ปัจจุบัน */
export const splitOf = (o: Order, vendors: Vendor[]) => (o.vendor_split?.length && o.vendor_split.every((s) => s.gp != null) ? o.vendor_split : computeSplit(o, vendors));

export interface ReportRow {
  month: string; vendor_id: string; vendor: string; orders: number;
  gross: number; discount: number; gp: number; shipping: number; payout: number; pendingGp: number;
  paid: Payout | null;
}
/** รายงานต่อเดือน × ร้าน (เฉพาะออเดอร์ที่ยืนยันชำระแล้ว) — pendingGp = ยอดสินค้าสุทธิที่ร้านยังไม่ตั้ง GP */
export function vendorReport(orders: Order[], vendors: Vendor[], payouts: Payout[], vendorId?: string): ReportRow[] {
  const out = new Map<string, ReportRow>();
  for (const o of orders) {
    if (!PAID_STATUSES.includes(o.status)) continue;
    const month = thMonth(o.paid_at ?? o.created_at);
    for (const s of splitOf(o, vendors)) {
      if (vendorId && s.vendor_id !== vendorId) continue;
      const key = `${month}|${s.vendor_id}`;
      const row = out.get(key) ?? {
        month, vendor_id: s.vendor_id, vendor: vendors.find((v) => v.id === s.vendor_id)?.name ?? s.vendor_id, orders: 0,
        gross: 0, discount: 0, gp: 0, shipping: 0, payout: 0, pendingGp: 0, paid: payouts.find((p) => p.vendor_id === s.vendor_id && p.month === month) ?? null,
      };
      row.orders += 1;
      row.gross = r2(row.gross + s.gross);
      row.discount = r2(row.discount + s.discount);
      row.shipping = r2(row.shipping + s.shipping);
      if (s.gp == null) row.pendingGp = r2(row.pendingGp + s.net);
      else { row.gp = r2(row.gp + s.gp); row.payout = r2(row.payout + s.payout!); }
      out.set(key, row);
    }
  }
  return [...out.values()].sort((a, b) => b.month.localeCompare(a.month) || a.vendor.localeCompare(b.vendor));
}
export const reportCsv = (rows: ReportRow[]) => {
  const head = ["month", "vendor", "orders", "gross", "discount", "gp", "shipping", "payout_due", "gp_pending_amount", "paid_at", "paid_ref"];
  const esc = (v: unknown) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + [head, ...rows.map((r) => [r.month, r.vendor, r.orders, r.gross, r.discount, r.gp, r.shipping, r.payout, r.pendingGp, r.paid?.paid_at ?? "", r.paid?.ref ?? ""])].map((l) => l.map(esc).join(",")).join("\n");
};

/** สรุปเดิม (คงไว้ให้หน้าแอดมินรุ่นก่อน) */
export interface SummaryRow { month: string; vendor: string; sales: number; gp: number; payout: number; orders: number; pendingGp: number }
export const monthlySummary = (orders: Order[], vendors: Vendor[]): SummaryRow[] =>
  vendorReport(orders, vendors, []).map((r) => ({ month: r.month, vendor: r.vendor, sales: r.gross - r.discount, gp: r.gp, payout: r.payout, orders: r.orders, pendingGp: r.pendingGp }));

// ── token ให้ผู้ซื้ออัปโหลดสลิป / ดูสถานะออเดอร์ของตัวเอง ──
const secret = () => sessionSecret();
export const orderToken = (id: string) => createHmac("sha256", secret()).update(`market-order:${id}`).digest("base64url");
export function checkOrderToken(id: string, token: string) {
  const a = Buffer.from(orderToken(id)), b = Buffer.from(token || "");
  return a.length === b.length && timingSafeEqual(a, b);
}
export const trackPath = (o: Pick<Order, "id">) => `/orders/track?id=${o.id}&t=${orderToken(o.id)}`;

/** เก็บผลตรวจสลิป Slip2Go — ไม่ผ่าน q() เพราะถ้ายังไม่รัน 0003_slip_check.sql (ไม่มีคอลัมน์) จะไม่สลับทั้งร้านเป็นโหมดตัวอย่าง */
export async function saveSlipCheck(id: string, check: unknown): Promise<void> {
  if (marketDemo()) { const r = mem.orders.find((x) => x.id === id); if (r) r.slip_check = check; return; }
  const { error } = await db().from("market_orders").update({ slip_check: check }).eq("id", id);
  if (error) console.warn("[market] slip_check not saved (run supabase/market/0003_slip_check.sql):", error.message);
}
