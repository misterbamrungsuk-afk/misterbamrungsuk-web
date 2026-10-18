-- รวม SQL รอบ 18 ต.ค. 2569 · รันใน Supabase SQL Editor (production) ครั้งเดียว · เพิ่มอย่างเดียว ไม่ลบข้อมูล
-- ลำดับ: wallet 0006 → booking 0010, 0011 → join 0008, 0009 → market 0005 → partner 0007
begin;

-- ===== supabase/wallet/0006_customer_withdraw.sql =====
-- 0006 · ลูกค้าถอนเงินในกระเป๋าเข้าบัญชีธนาคาร — ใช้ตาราง payout_requests เดิม (CEO อนุมัติ → แอดมินโอน) — เพิ่มอย่างเดียว · รันซ้ำได้
-- เงิน: customer.available → customer.withdrawing (ขอ) → platform.bank (โอนแล้ว) · ไม่อนุมัติ/โอนไม่สำเร็จ = คืน available
-- ยอดถอนได้ (ไม่รวมเครดิตโบนัสเมมเบอร์/โค้ด) ตรวจในแอป src/lib/payouts/customer.ts

alter table public.payout_requests drop constraint if exists payout_requests_owner_type_check;
alter table public.payout_requests add constraint payout_requests_owner_type_check check (owner_type in ('partner', 'vendor', 'customer'));


-- ===== supabase/booking/0010_calls.sql =====
-- 0010 · โทรผ่านแอป (WebRTC) — หนึ่งแถวต่อสาย · เก็บ SDP ระหว่างต่อสาย (ลบทิ้งเมื่อจบสาย) — เพิ่มอย่างเดียว · รันซ้ำได้
create table if not exists public.booking_calls (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  caller_type text not null check (caller_type in ('customer', 'parttime')),
  caller_id text not null,
  callee_type text not null check (callee_type in ('customer', 'parttime')),
  callee_id text not null,
  caller_name text,
  status text not null default 'ringing' check (status in ('ringing', 'active', 'ended', 'missed', 'declined')),
  end_reason text,
  offer text,
  answer text,
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_s integer
);
-- เปิดได้ทีละหนึ่งสายต่อการจอง (กันกดพร้อมกันสองฝั่ง)
create unique index if not exists booking_calls_one_live on public.booking_calls (booking_id) where status in ('ringing', 'active');
create index if not exists booking_calls_booking on public.booking_calls (booking_id, created_at desc);
create index if not exists booking_calls_callee_ringing on public.booking_calls (callee_type, callee_id) where status = 'ringing';
alter table public.booking_calls enable row level security;


-- ===== supabase/booking/0011_changes.sql =====
-- 0011 · เปลี่ยนเวลานัด + ต่อเวลาระหว่างนัด (src/lib/bookings/changes.ts) — เพิ่มอย่างเดียว · รันซ้ำได้
-- reschedule: ลูกค้าขอเวลาใหม่ → เพื่อนรับ = bookings.starts_at เปลี่ยน (ไม่มีเงินเปลี่ยน)
-- extend: ระหว่างนัดลูกค้าขอ +1 ชม. → เพื่อนรับ = customer.available → platform.escrow (idem extend:<id>) + price/total/extra_hours ของนัดเพิ่ม

alter table public.bookings add column if not exists extra_hours int not null default 0 check (extra_hours between 0 and 6);

create table if not exists public.booking_changes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind text not null check (kind in ('reschedule', 'extend')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'failed')),
  old_starts_at timestamptz,
  new_starts_at timestamptz,
  hours int not null default 0,
  amount_satang bigint not null default 0 check (amount_satang >= 0),
  reason text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text
);
-- คำขอที่รอตอบได้ทีละ 1 ต่อการจอง
create unique index if not exists booking_changes_one_pending on public.booking_changes(booking_id) where status = 'pending';
create index if not exists booking_changes_booking on public.booking_changes(booking_id, created_at desc);
alter table public.booking_changes enable row level security;

-- กันนัดซ้อนเวลา: นับชั่วโมงที่ต่อแล้วด้วย (แทนฟังก์ชันเดิมใน wallet/0003_guards.sql)
create or replace function public.bookings_no_clash() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status in ('requested', 'accepted', 'checked_in')
     and (tg_op = 'INSERT' or old.status is distinct from new.status or old.starts_at is distinct from new.starts_at or old.hours is distinct from new.hours or old.extra_hours is distinct from new.extra_hours) then
    perform pg_advisory_xact_lock(hashtext('booking:' || new.parttime_id::text));
    if exists (
      select 1 from bookings b
      where b.parttime_id = new.parttime_id and b.id <> new.id and b.status in ('requested', 'accepted', 'checked_in')
        and b.starts_at < new.starts_at + make_interval(hours => greatest(new.hours + new.extra_hours, b.hours + b.extra_hours))
        and new.starts_at < b.starts_at + make_interval(hours => greatest(new.hours + new.extra_hours, b.hours + b.extra_hours))
    ) then
      raise exception 'booking clash';
    end if;
  end if;
  return new;
end $$;


-- ===== supabase/join/0008_post_interests.sql =====
-- ลูกค้ากด "สนใจ" ประกาศ "วันนี้ว่าง" ของ Part-Time (src/lib/interests.ts)
-- 1 ลูกค้า ต่อ 1 ประกาศ (ประกาศ = parttime_id + post_at = created_at ของประกาศใน docs.extra.post)
-- ยกเลิกสนใจ = ตั้ง withdrawn_at (ไม่ลบ แถวเดิมกันแจ้งเตือน Part-Time ซ้ำเมื่อกดสนใจอีกครั้ง)
-- เก็บเฉพาะชื่อแบบปิดบัง (customer_label) — Part-Time ไม่เห็นรหัส/อีเมลลูกค้า
create table if not exists public.pt_post_interests (
  id            uuid primary key default gen_random_uuid(),
  parttime_id   uuid not null,
  post_at       timestamptz not null,
  customer_id   text not null,
  customer_label text not null default '',
  withdrawn_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (parttime_id, post_at, customer_id)
);
create index if not exists pt_post_interests_post_idx on public.pt_post_interests (parttime_id, post_at);
alter table public.pt_post_interests enable row level security;  -- เข้าถึงผ่าน service role เท่านั้น


-- ===== supabase/join/0009_strike_appeals.sql =====
-- อุทธรณ์ใบเตือน (strike) ในแอป (src/lib/appeals.ts) — 1 อุทธรณ์ ต่อ 1 ใบเตือน
-- status: pending → accepted (ใบเตือนถูกยกเลิก: ไม่นับใบนี้) | rejected (decision_note = เหตุผล)
-- ใบเตือนที่ยกเลิก = strike_id ที่มีอุทธรณ์ status = 'accepted' (การนับใบเตือนต้องกรองออก)
create table if not exists public.strike_appeals (
  id            uuid primary key default gen_random_uuid(),
  strike_id     text not null unique,
  parttime_id   uuid not null,
  mb            text not null,
  strike_reason text not null default '',
  strike_ref    text,
  strike_at     timestamptz,
  reason        text not null check (char_length(reason) between 1 and 1000),
  photo_path    text,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  decision_note text,
  decided_by    text,
  decided_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists strike_appeals_pt_idx on public.strike_appeals (parttime_id, created_at desc);
create index if not exists strike_appeals_status_idx on public.strike_appeals (status, created_at desc);
alter table public.strike_appeals enable row level security;  -- เข้าถึงผ่าน service role เท่านั้น


-- ===== supabase/market/0005_shops_wallet.sql =====
-- 0005 · Marketplace หลายร้าน: ใบสมัครเปิดร้าน · ค่าส่งต่อร้าน · จ่ายด้วยกระเป๋าเงิน — เพิ่มอย่างเดียว · รันซ้ำได้
-- โค้ดรองรับก่อนรันไฟล์นี้: ค่าส่งต่อร้าน/จ่ายด้วยกระเป๋า/รับใบสมัคร จะแจ้งว่า "ระบบยังไม่พร้อม" โดยไม่สลับทั้งร้านเป็นโหมดหน่วยความจำ

-- ค่าส่งที่ร้านตั้งเอง (บาท/ออเดอร์) · null = ใช้ค่าส่งกลางใน market_settings
alter table public.market_vendors add column if not exists shipping_fee numeric(10,2);
alter table public.market_vendors add column if not exists free_threshold numeric(10,2);

-- วิธีชำระของออเดอร์: slip (QR + สลิป) | wallet (ตัดจากกระเป๋าเงิน → wallet bucket platform.market_escrow)
alter table public.market_orders add column if not exists pay_method text not null default 'slip';
do $$ begin
  alter table public.market_orders add constraint market_orders_pay_method check (pay_method in ('slip', 'wallet'));
exception when duplicate_object then null; end $$;

-- ใบสมัครเปิดร้าน (/market/sell) — เอกสารอยู่ใน bucket "market" โฟลเดอร์ apply/ (ไม่เปิดสาธารณะ เสิร์ฟผ่าน /api/market/admin/apply-doc)
create table if not exists public.market_vendor_applications (
  id uuid primary key default gen_random_uuid(),
  shop_name text not null,
  owner_name text not null,
  phone text not null,
  email text not null,
  line_id text not null default '',
  business_type text not null check (business_type in ('person', 'company')),
  description text not null default '',
  category text not null default '',
  docs jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  vendor_id uuid references public.market_vendors(id) on delete set null,
  reviewed_by text,
  reviewed_at timestamptz,
  ip text not null default '',
  created_at timestamptz not null default now()
);
-- อีเมลเดียวมีใบสมัครที่ยังไม่ถูกปฏิเสธได้ใบเดียว (กันสมัครซ้ำ/ยิงพร้อมกัน)
create unique index if not exists market_vendor_applications_email on public.market_vendor_applications (lower(email)) where status <> 'rejected';
create index if not exists market_vendor_applications_status on public.market_vendor_applications (status, created_at desc);
alter table public.market_vendor_applications enable row level security;


-- ===== supabase/partner/0007_hotel_rooms.sql =====
-- จองห้องพักโรงแรมพาร์ทเนอร์ในแอป (src/lib/hotels/store.ts) — additive · รันหลัง wallet/0004_partner_vendor.sql
-- 1) ประเภทห้อง  2) การจองห้อง  3) trigger กันจองเกินจำนวนห้อง  4) ให้ wallet_move รู้จักตาราง hotel_bookings

create table if not exists public.partner_room_types (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  price_satang bigint not null check (price_satang > 0 and price_satang <= 10000000),
  capacity int not null check (capacity between 1 and 20),
  rooms int not null check (rooms between 1 and 500),
  photos jsonb not null default '[]'::jsonb,
  description text,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists partner_room_types_partner on public.partner_room_types(partner_id, active, sort);
alter table public.partner_room_types enable row level security;

create table if not exists public.hotel_bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  partner_id uuid not null references public.partners(id),
  partner_name text not null,
  room_type_id uuid not null references public.partner_room_types(id),
  room_name text not null,
  customer_id text not null,
  customer_email text,
  guest_name text not null,
  guests int not null check (guests >= 1),
  rooms int not null check (rooms between 1 and 10),
  check_in date not null,
  check_out date not null,
  nights int not null check (nights between 1 and 14),
  price_satang bigint not null check (price_satang > 0),
  total_satang bigint not null check (total_satang > 0),
  platform_pct numeric not null default 0 check (platform_pct between 0 and 100),
  status text not null default 'paying' check (status in ('paying', 'pending', 'confirmed', 'declined', 'expired', 'cancelled', 'completed', 'refunded', 'void')),
  note text,
  expires_at timestamptz not null,
  decline_reason text,
  refund_satang bigint,
  partner_net_satang bigint,
  platform_fee_satang bigint,
  confirmed_at timestamptz,
  declined_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in)
);
create index if not exists hotel_bookings_customer on public.hotel_bookings(customer_id, created_at desc);
create index if not exists hotel_bookings_partner on public.hotel_bookings(partner_id, created_at desc);
create index if not exists hotel_bookings_hold on public.hotel_bookings(room_type_id, check_in, check_out) where status in ('paying', 'pending', 'confirmed');
create index if not exists hotel_bookings_sweep on public.hotel_bookings(status, expires_at);
alter table public.hotel_bookings enable row level security;

-- กันจองเกิน: ล็อกแถวประเภทห้อง แล้วนับห้องที่ถูกกันไว้ทุกคืนในช่วงที่จอง (รวมรายการใหม่) ต้องไม่เกินจำนวนห้อง
create or replace function public.hotel_bookings_capacity() returns trigger language plpgsql as $$
declare v_cap int; v_d date; v_used int;
begin
  if new.status not in ('paying', 'pending', 'confirmed') then return new; end if;
  select rooms into v_cap from public.partner_room_types where id = new.room_type_id for update;
  if v_cap is null then raise exception 'hotel overbook: room type missing'; end if;
  v_d := new.check_in;
  while v_d < new.check_out loop
    select coalesce(sum(rooms), 0) into v_used from public.hotel_bookings
      where room_type_id = new.room_type_id and id <> new.id and status in ('paying', 'pending', 'confirmed') and check_in <= v_d and check_out > v_d;
    if v_used + new.rooms > v_cap then raise exception 'hotel overbook'; end if;
    v_d := v_d + 1;
  end loop;
  return new;
end $$;
drop trigger if exists hotel_bookings_capacity on public.hotel_bookings;
create trigger hotel_bookings_capacity before insert on public.hotel_bookings for each row execute function public.hotel_bookings_capacity();

-- wallet_move: เพิ่ม hotel_bookings ในรายการตารางที่อนุญาต (เหมือน 0004_partner_vendor.sql ทุกอย่าง + ตารางนี้)
-- ถ้ามี migration อื่นแก้ wallet_move หลัง 0004 ให้รวมรายการตารางเข้าด้วยกันก่อนรัน
create or replace function public.wallet_move(
  p_table text, p_id uuid, p_from text[], p_patch jsonb,
  p_kind text, p_ref_type text, p_ref_id text, p_idem text, p_note text, p_actor text, p_legs jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cols text; v_vals text; v_row jsonb; v_tx bigint;
begin
  if p_table not in ('bookings', 'withdrawals', 'wallet_topups', 'quick_calls', 'member_purchases', 'sales_payouts', 'payout_requests', 'hotel_bookings') then raise exception 'wallet_move: table not allowed'; end if;
  select string_agg(format('%I', k), ', '), string_agg(format('r.%I', k), ', ')
    into v_cols, v_vals
    from jsonb_object_keys(p_patch) k
    where exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = p_table and c.column_name = k and k <> 'id');
  if v_cols is null then raise exception 'wallet_move: empty patch'; end if;
  execute format(
    'update public.%I t set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1) r) where t.id = $2 and t.status = any($3) returning to_jsonb(t)',
    p_table, v_cols || case when p_table = 'bookings' then ', updated_at' else '' end,
    v_vals || case when p_table = 'bookings' then ', now()' else '' end, p_table)
    using p_patch, p_id, p_from into v_row;
  if v_row is null then return null; end if;
  if p_legs is not null and jsonb_array_length(p_legs) >= 2 then
    v_tx := wallet_post(p_kind, p_ref_type, p_ref_id, p_idem, p_note, p_actor, p_legs);
    if p_table = 'wallet_topups' then
      update public.wallet_topups set tx_id = v_tx where id = p_id returning to_jsonb(wallet_topups) into v_row;
    end if;
  end if;
  return v_row;
end $$;
revoke all on function public.wallet_move(text, uuid, text[], jsonb, text, text, text, text, text, text, jsonb) from public, anon, authenticated;

commit;
