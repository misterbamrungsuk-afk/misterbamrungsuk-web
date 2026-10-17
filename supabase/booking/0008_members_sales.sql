-- 0008 · เปิดเมมเบอร์ Gold/Black + แต้ม + Sale Man (ค่าคอม) — เพิ่มอย่างเดียว ไม่ลบข้อมูล · รันซ้ำได้

-- ระดับสมาชิกของลูกค้า
alter table public.customers add column if not exists member_tier text check (member_tier in ('gold', 'black'));
alter table public.customers add column if not exists member_since timestamptz;
alter table public.customers add column if not exists member_no text;
create unique index if not exists customers_member_no on public.customers(member_no) where member_no is not null;

-- คำสั่งเปิดเมม (จ่าย QR + สลิป) · credited = เข้ากระเป๋าแล้ว
create table if not exists public.member_purchases (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null,
  customer_email text,
  tier text not null check (tier in ('gold', 'black')),
  pay_satang bigint not null check (pay_satang > 0),
  credit_satang bigint not null check (credit_satang >= pay_satang),
  bonus_satang bigint not null default 0,
  status text not null default 'pending' check (status in ('pending', 'credited', 'rejected')),
  slip_path text,
  slip_check jsonb,
  trans_ref text,
  ref_code text,
  referrer_type text check (referrer_type in ('parttime', 'sales')),
  referrer_id text,
  commission_satang bigint not null default 0,
  commission_mode text check (commission_mode in ('cash', 'boost')),
  commission_paid_at timestamptz,
  reason text,
  created_at timestamptz not null default now(),
  credited_at timestamptz
);
create unique index if not exists member_purchases_trans_ref on public.member_purchases(trans_ref) where trans_ref is not null;
create index if not exists member_purchases_status on public.member_purchases(status, created_at desc);
create index if not exists member_purchases_referrer on public.member_purchases(referrer_type, referrer_id, created_at desc);
alter table public.member_purchases enable row level security;

-- Sale Man (Part-Time หรือภายนอก) · code = โค้ดแนะนำ
create table if not exists public.sales_reps (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('parttime', 'external')),
  parttime_id text unique,
  name text not null default '',
  phone text,
  bank jsonb,
  active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.sales_reps enable row level security;

-- คำขอรับค่าคอม (Sale Man ภายนอก) → CEO อนุมัติ → แอดมินโอนแล้วเช็ก
create table if not exists public.sales_payouts (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null,
  amount_satang bigint not null check (amount_satang > 0),
  bank jsonb,
  status text not null default 'requested' check (status in ('requested', 'approved', 'paid', 'failed')),
  approved_by text,
  approved_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create unique index if not exists sales_payouts_one_open on public.sales_payouts(rep_id) where status in ('requested', 'approved');
alter table public.sales_payouts enable row level security;

-- แต้มสะสม (ไม่ใช่เงิน)
create table if not exists public.points_ledger (
  id bigserial primary key,
  customer_id text not null,
  delta integer not null,
  reason text not null,
  ref text,
  created_at timestamptz not null default now(),
  unique (customer_id, ref)
);
create index if not exists points_ledger_customer on public.points_ledger(customer_id, created_at desc);
alter table public.points_ledger enable row level security;

-- กระเป๋าเงิน Sale Man ภายนอก
alter table public.wallet_accounts drop constraint if exists wallet_accounts_owner_type_check;
alter table public.wallet_accounts add constraint wallet_accounts_owner_type_check check (owner_type in ('customer', 'parttime', 'partner', 'platform', 'sales'));

-- ย้ายสถานะ + ลงเงินพร้อมกัน: เพิ่มตาราง member_purchases, sales_payouts
create or replace function public.wallet_move(
  p_table text, p_id uuid, p_from text[], p_patch jsonb,
  p_kind text, p_ref_type text, p_ref_id text, p_idem text, p_note text, p_actor text, p_legs jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cols text; v_vals text; v_row jsonb; v_tx bigint;
begin
  if p_table not in ('bookings', 'withdrawals', 'wallet_topups', 'quick_calls', 'member_purchases', 'sales_payouts') then raise exception 'wallet_move: table not allowed'; end if;
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
