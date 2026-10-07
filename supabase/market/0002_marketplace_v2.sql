-- Marketplace v2: หมวดหมู่ / รีวิว / แบนเนอร์ / โค้ดส่วนลด / ตั้งค่าค่าส่ง+นโยบาย / บัญชีร้านค้า (vendor portal) / รอบโอนเงินร้าน
-- + ฟิลด์ติดตามคำสั่งซื้อ (ส่วนลด, ค่าส่ง, ขนส่ง, เหตุผลปฏิเสธ, ส่วนแบ่งต่อร้าน, เลขพัสดุต่อร้าน)
-- รันหลัง 0001_products.sql · ใช้ผ่าน service role ฝั่งเซิร์ฟเวอร์เท่านั้น (RLS เปิด ไม่มี policy)
-- ค่าที่เจ้าของยังไม่กำหนด = null → หน้าเว็บแสดง [รอกำหนด] และแก้ได้ใน /admin/market

-- ── ร้านค้า: หน้าร้าน /shop/[slug] ──
alter table public.market_vendors add column if not exists slug text;
alter table public.market_vendors add column if not exists description text not null default '';
alter table public.market_vendors add column if not exists logo text;
update public.market_vendors set slug = 'mohso' where slug is null and name = 'คลินิกหมอโส';
update public.market_vendors set slug = 'shop-' || left(id::text, 8) where slug is null;
create unique index if not exists market_vendors_slug_idx on public.market_vendors(slug);

-- ── หมวดหมู่ ──
create table if not exists public.market_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort integer not null default 0
);
insert into public.market_categories (name, slug, sort) values
  ('ผลิตภัณฑ์เสริมอาหาร', 'supplement', 1),
  ('ผลิตภัณฑ์ดูแลผิวกาย', 'body-care', 2)
on conflict (slug) do nothing;

-- ── สินค้า: หมวด / แอดมินอนุมัติ / ซื้อคู่กัน ──
alter table public.market_products add column if not exists category_id uuid references public.market_categories(id) on delete set null;
alter table public.market_products add column if not exists approved boolean not null default true;   -- สินค้าที่ร้านเพิ่มเองจาก /vendor เริ่มที่ false
alter table public.market_products add column if not exists bundle_ids jsonb not null default '[]'::jsonb; -- [] = แนะนำอัตโนมัติ
create index if not exists market_products_category_idx on public.market_products(category_id);

-- ── คำสั่งซื้อ: ราคา + ติดตาม ──
-- total = subtotal - discount + shipping_fee · GP คิดจาก (subtotal - discount) เท่านั้น
alter table public.market_orders add column if not exists subtotal integer;
alter table public.market_orders add column if not exists discount numeric(12,2) not null default 0;
alter table public.market_orders add column if not exists promo_code text;
alter table public.market_orders add column if not exists shipping_fee numeric(12,2) not null default 0;
alter table public.market_orders add column if not exists carrier text;
alter table public.market_orders add column if not exists shipped_at timestamptz;
alter table public.market_orders add column if not exists done_at timestamptz;
alter table public.market_orders add column if not exists reject_reason text;
alter table public.market_orders add column if not exists vendor_split jsonb;                          -- [{vendor_id,gross,discount,net,gp_pct,gp,shipping,payout}]
alter table public.market_orders add column if not exists vendor_tracking jsonb not null default '{}'::jsonb; -- {vendor_id:{tracking_no,carrier,at}}
alter table public.market_orders alter column total type numeric(12,2);
update public.market_orders set subtotal = total where subtotal is null;
create index if not exists market_orders_phone_idx on public.market_orders(phone, created_at desc);

-- ── รีวิว (เฉพาะผู้ซื้อที่มีออเดอร์สถานะ done) ──
create table if not exists public.market_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.market_products(id) on delete cascade,
  order_id uuid not null references public.market_orders(id) on delete cascade,
  phone text not null,
  name text not null default 'ผู้ซื้อ',
  stars smallint not null check (stars between 1 and 5),
  text text not null default '',
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, order_id)
);
create index if not exists market_reviews_product_idx on public.market_reviews(product_id, created_at desc);

-- ── แบนเนอร์หน้าแรก ──
create table if not exists public.market_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  image text not null default '',      -- path ใน bucket market (banners/...) หรือ URL
  link text not null default '',       -- ลิงก์ภายในเว็บ (ขึ้นต้นด้วย /)
  sort integer not null default 0,
  active boolean not null default true
);

-- ── โค้ดส่วนลด ──
create table if not exists public.market_promos (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('percent','fixed')),
  value numeric(12,2) not null check (value > 0),
  min_spend numeric(12,2) not null default 0,
  expires_at timestamptz,
  usage_limit integer,
  used_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint market_promos_pct check (kind <> 'percent' or value <= 100)
);

-- ── ตั้งค่า (แถวเดียว): ค่าส่ง / เกณฑ์ส่งฟรี / ระยะเวลาจัดส่ง / ข้อความนโยบาย / LINE hook ──
create table if not exists public.market_settings (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,   -- {shipping_fee:null|n, free_threshold:null|n, delivery_days, policy_returns, policy_shipping, policy_privacy, line_notify_url}
  updated_at timestamptz not null default now()
);
insert into public.market_settings (id, data) values (1, '{"shipping_fee":null,"free_threshold":null,"delivery_days":"[รอกำหนด]"}'::jsonb)
on conflict (id) do nothing;

-- ── บัญชีร้านค้า (vendor portal) — แอดมินเชิญด้วยอีเมล ร้านตั้งรหัสผ่านจากลิงก์เชิญ ──
create table if not exists public.market_vendor_accounts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.market_vendors(id) on delete cascade,
  email text not null unique,
  password_hash text,                    -- null = ยังไม่ตั้งรหัส (ลิงก์เชิญยังไม่ถูกใช้)
  invited_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- ── รอบโอนเงินให้ร้าน (ต่อร้าน × เดือน) ──
create table if not exists public.market_payouts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.market_vendors(id) on delete restrict,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  gross numeric(12,2) not null,
  discount numeric(12,2) not null default 0,
  gp numeric(12,2) not null,
  shipping numeric(12,2) not null default 0,
  amount numeric(12,2) not null,         -- ยอดที่โอน = gross - discount - gp + shipping
  paid_at timestamptz not null,
  ref text not null,
  slip_path text,                        -- payouts/... ใน bucket market
  recorded_by text not null,
  created_at timestamptz not null default now(),
  unique (vendor_id, month)
);

alter table public.market_categories enable row level security;
alter table public.market_reviews enable row level security;
alter table public.market_banners enable row level security;
alter table public.market_promos enable row level security;
alter table public.market_settings enable row level security;
alter table public.market_vendor_accounts enable row level security;
alter table public.market_payouts enable row level security;
