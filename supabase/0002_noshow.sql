-- คำร้องผิดนัด (no-show) — หลักฐานสองฝ่าย + ผลตัดสินของแอดมิน (เข้าถึงผ่าน service role เท่านั้น)
create table if not exists public.noshow_claims (
  id uuid primary key default gen_random_uuid(),
  booking_id text not null unique,
  amount numeric(12,2) not null default 0,
  customer_name text not null default '',
  provider_name text not null default '',
  provider_id text not null default '',
  status text not null default 'pending' check (status in ('pending','customer_no_show','provider_no_show')),
  provider_evidence jsonb, -- {at, gps:{lat,lng,accuracy}, gpsError, photo, attempts, attemptsSource, note}
  customer_evidence jsonb,
  on_hold boolean not null default true, -- เงินพักไว้จนแอดมินตัดสิน
  payout_amount numeric(12,2), -- ลูกค้าไม่มา: Part-Time ได้ 85%
  refund_amount numeric(12,2), -- Part-Time ไม่มา: คืนลูกค้า 100%
  strike_added boolean not null default false,
  points_deducted int not null default 0,
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists noshow_claims_status_idx on public.noshow_claims (status, created_at desc);
alter table public.noshow_claims enable row level security;

-- ใบเตือนจากการตัดสินของแอดมิน (เช่น Part-Time ไม่มาตามนัด)
create table if not exists public.provider_strikes (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  reason text not null,
  ref text,
  points int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists provider_strikes_provider_idx on public.provider_strikes (provider_id, created_at desc);
alter table public.provider_strikes enable row level security;

-- รหัส OTP ยืนยันเบอร์โทร (เก็บเป็น hash เท่านั้น)
create table if not exists public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  ip text not null default '',
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists otp_codes_phone_idx on public.otp_codes (phone, created_at desc);
create index if not exists otp_codes_ip_idx on public.otp_codes (ip, created_at desc);
alter table public.otp_codes enable row level security;

-- ลูกค้า: เบอร์โทรที่ยืนยันแล้ว
alter table public.customers add column if not exists phone text;
alter table public.customers add column if not exists phone_verified_at timestamptz;

-- bucket private สำหรับรูปหลักฐาน
insert into storage.buckets (id, name, public) values ('noshow', 'noshow', false) on conflict (id) do nothing;
