-- Mister Bamrungsuk · การจอง + แชท + แจ้งเตือน — รันใน Supabase SQL Editor หลัง supabase/wallet/0001_wallet.sql
-- เงินของการจองเดินผ่าน wallet_post เท่านั้น (hold → confirm → split) · ตารางนี้เก็บสถานะและประวัติ

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_id text not null,
  customer_email text,
  customer_name text,
  parttime_id uuid not null,
  parttime_mb text not null,
  parttime_nick text,
  starts_at timestamptz not null,
  hours int not null check (hours in (3, 5)),
  place jsonb not null default '{}'::jsonb,
  note text,
  price_satang bigint not null check (price_satang > 0),
  room_fee_satang bigint not null default 0,
  total_satang bigint not null check (total_satang > 0),
  status text not null default 'requested' check (status in ('requested','accepted','declined','expired','cancelled','cancel_requested','checked_in','completed','disputed','refunded')),
  expires_at timestamptz,
  decline_reason text,
  accepted_at timestamptz, declined_at timestamptz, cancelled_at timestamptz, checked_in_at timestamptz, completed_at timestamptz,
  pt_done_at timestamptz,            -- Part-Time กดจบงาน (ลูกค้าไม่ค้านใน 12 ชม. = จบอัตโนมัติ)
  tip_satang bigint not null default 0,
  share_pct int,                     -- % ส่วนแบ่ง Part-Time ณ ตอนแบ่งเงิน
  matured_at timestamptz,            -- ปล่อยเงินให้ถอนได้แล้ว (24 ชม. หลังจบงาน)
  resolution jsonb,                  -- ผลตัดสินของแอดมิน (ยกเลิก/ข้อพิพาท)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bookings_customer on public.bookings(customer_id, starts_at desc);
create index if not exists bookings_parttime on public.bookings(parttime_id, starts_at desc);
create index if not exists bookings_status on public.bookings(status, expires_at);

create table if not exists public.booking_events (
  id bigserial primary key,
  booking_id uuid not null references public.bookings(id),
  type text not null,
  actor text,
  data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists booking_events_booking on public.booking_events(booking_id, id);

create table if not exists public.messages (
  id bigserial primary key,
  booking_id uuid not null references public.bookings(id),
  sender_type text not null check (sender_type in ('customer','parttime','system')),
  sender_id text,
  body text not null,
  blocked boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_booking on public.messages(booking_id, id);

create table if not exists public.notifications (
  id bigserial primary key,
  user_type text not null check (user_type in ('customer','parttime','admin')),
  user_id text not null,
  kind text not null,
  title text not null,
  body text,
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user on public.notifications(user_type, user_id, id desc);

-- รีวิวหลังจบงาน (1 การจอง = 1 รีวิว)
create table if not exists public.reviews (
  id bigserial primary key,
  booking_id uuid not null unique references public.bookings(id),
  parttime_id uuid not null,
  customer_id text not null,
  rating int not null check (rating between 1 and 5),
  tags text[] not null default '{}',
  again text,
  body text,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists reviews_parttime on public.reviews(parttime_id, created_at desc);

-- คำขอถอนเงินของ Part-Time → รอบโอน (ไฟล์โอนกลุ่ม) → แอดมินยืนยันโอน
create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  parttime_id uuid not null,
  parttime_mb text not null,
  amount_satang bigint not null check (amount_satang > 0),
  fee_satang bigint not null default 0,
  wht_satang bigint not null default 0,
  net_satang bigint not null,
  bank jsonb not null,
  status text not null default 'requested' check (status in ('requested','batched','paid','failed')),
  batch_id text,
  note text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists withdrawals_parttime on public.withdrawals(parttime_id, created_at desc);
create index if not exists withdrawals_status on public.withdrawals(status, created_at);

alter table public.reviews enable row level security;
alter table public.withdrawals enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
