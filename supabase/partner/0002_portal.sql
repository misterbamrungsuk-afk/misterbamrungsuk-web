-- Partner portal (/partner/portal/*) — รันหลัง 0001_partners.sql
-- เข้าถึงผ่าน service role เท่านั้น (RLS เปิด ไม่มี policy) เหมือนตารางอื่นของระบบ

-- ── บัญชีพาร์ทเนอร์ (ล็อกอินอีเมล+รหัสผ่าน แบบเดียวกับ customers: salt:hash scrypt) ──
alter table public.partners add column if not exists password_hash text;
alter table public.partners add column if not exists account_status text not null default 'pending'
  check (account_status in ('pending', 'approved', 'active', 'expired'));
alter table public.partners add column if not exists clip_status text
  check (clip_status in ('shot', 'editing', 'posted'));
alter table public.partners add column if not exists clip_note text;
-- % ที่แพลตฟอร์มหักจาก booking (null = [รอกำหนด])
alter table public.partners add column if not exists platform_pct numeric(5,2)
  check (platform_pct is null or (platform_pct >= 0 and platform_pct <= 100));
create unique index if not exists partners_email_login_idx on public.partners (lower(email)) where password_hash is not null;

-- ── หน้าร้าน ──
create table if not exists public.partner_listings (
  partner_id uuid primary key references public.partners(id) on delete cascade,
  cover text,                                   -- path ใน bucket "partners"
  gallery jsonb not null default '[]'::jsonb,   -- [path, ...]
  type text,
  description text,
  hours jsonb not null default '[]'::jsonb,     -- [{day:0..6, open:bool, from:"10:00", to:"22:00"}]
  rooms int not null default 1 check (rooms between 0 and 200),
  amenities jsonb not null default '[]'::jsonb, -- [text, ...]
  area text,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.partner_listings enable row level security;

-- ── การซื้อ/ต่ออายุแพ็กเกจ (QR + สลิป) ──
create table if not exists public.partner_purchases (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  invoice_no text not null unique,
  package text not null check (package in ('3m', '6m', '12m')),
  amount int not null check (amount >= 0),
  slip_url text,                                -- path ใน bucket "partners"
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  starts_at date,
  ends_at date,
  note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists partner_purchases_partner_idx on public.partner_purchases (partner_id, created_at desc);
create index if not exists partner_purchases_status_idx on public.partner_purchases (status);
alter table public.partner_purchases enable row level security;

-- ── การจองที่ใช้สถานที่ของพาร์ทเนอร์ ──
create table if not exists public.partner_bookings (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  booking_ref text not null unique,
  customer_name text not null,      -- ชื่อแสดงผล (ไม่เก็บข้อมูลติดต่อลูกค้า)
  parttime_name text not null,
  start_time timestamptz not null,
  hours int not null check (hours between 1 and 24),
  room text,
  addon text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'full', 'done', 'cancelled')),
  amount int not null default 0 check (amount >= 0),
  platform_pct numeric(5,2) check (platform_pct is null or (platform_pct >= 0 and platform_pct <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists partner_bookings_partner_idx on public.partner_bookings (partner_id, start_time);
alter table public.partner_bookings enable row level security;

-- ── Storage: bucket private "partners" (สลิป + รูปหน้าร้าน) เสิร์ฟผ่าน /api/partner/file ──
insert into storage.buckets (id, name, public) values ('partners', 'partners', false)
on conflict (id) do nothing;
