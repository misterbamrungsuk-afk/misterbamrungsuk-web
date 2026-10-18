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
