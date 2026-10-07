-- Marketplace หน้าแรก: ร้านค้า (vendor) / สินค้าเข้าค่าย / คำสั่งซื้อ (ตะกร้า + QR + สลิป แอดมินยืนยัน)
-- ใช้ผ่าน service role ฝั่งเซิร์ฟเวอร์เท่านั้น (RLS เปิด ไม่มี policy = anon/auth อ่านเขียนไม่ได้)
-- gp_pct = null แปลว่า [รอกำหนด] (แอดมินยังไม่ตั้ง)

create table if not exists public.market_vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null default '',
  gp_pct numeric(5,2) check (gp_pct is null or (gp_pct >= 0 and gp_pct <= 100)),
  created_at timestamptz not null default now()
);

create table if not exists public.market_products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.market_vendors(id) on delete restrict,
  name text not null,
  description text not null default '',
  warning text not null default '',
  price integer not null check (price >= 0),
  images jsonb not null default '[]'::jsonb,          -- path ใน bucket "market" (products/...)
  fda_no text,                                         -- เลข อย. (บังคับก่อน publish)
  stock integer not null default 0 check (stock >= 0),
  age_restricted boolean not null default true,        -- ต้องยืนยันอายุ 20+
  published boolean not null default false,
  created_at timestamptz not null default now(),
  constraint market_products_fda_required check (not published or coalesce(btrim(fda_no), '') <> '')
);
create index if not exists market_products_vendor_idx on public.market_products(vendor_id);

create table if not exists public.market_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  buyer_name text not null,
  phone text not null,                                 -- ยืนยันด้วย OTP แล้ว (668xxxxxxxx)
  address text not null,
  items jsonb not null,                                -- [{product_id,vendor_id,name,price,qty}]
  total integer not null check (total >= 0),
  gp_pct numeric(5,2),                                 -- null = รอกำหนด / หลาย vendor ต่าง %
  gp_amount numeric(12,2),
  vendor_amount numeric(12,2),
  slip_path text,
  status text not null default 'pending' check (status in ('pending','paid','shipped','done','rejected')),
  tracking_no text,
  admin_note text,
  age_confirmed_at timestamptz not null,
  ip text not null default '',
  paid_at timestamptz,
  decided_by text,
  created_at timestamptz not null default now()
);
create index if not exists market_orders_status_idx on public.market_orders(status, created_at desc);

alter table public.market_vendors enable row level security;
alter table public.market_products enable row level security;
alter table public.market_orders enable row level security;

-- bucket ส่วนตัวสำหรับรูปสินค้า (products/...) และสลิป (slips/...) — เสิร์ฟผ่าน API ของแอป
insert into storage.buckets (id, name, public) values ('market', 'market', false)
on conflict (id) do nothing;

-- vendor แรก (GP รอกำหนด)
insert into public.market_vendors (name, contact)
select 'คลินิกหมอโส', '' where not exists (select 1 from public.market_vendors where name = 'คลินิกหมอโส');
