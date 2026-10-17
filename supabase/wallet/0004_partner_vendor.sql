-- 0004 · กระเป๋าแยกของพาร์ทเนอร์ (โรงแรม/สปา) และร้านค้า Marketplace + คำขอถอน (CEO อนุมัติ → แอดมินโอน) — เพิ่มอย่างเดียว · รันซ้ำได้

-- เจ้าของกระเป๋าเพิ่ม 'vendor' (ร้านค้า) · 'partner' มีอยู่แล้ว
alter table public.wallet_accounts drop constraint if exists wallet_accounts_owner_type_check;
alter table public.wallet_accounts add constraint wallet_accounts_owner_type_check check (owner_type in ('customer', 'parttime', 'partner', 'platform', 'sales', 'vendor'));

-- คำขอถอนของพาร์ทเนอร์ / ร้านค้า: requested → approved (CEO) → paid (แอดมินโอนแล้ว) · failed/rejected = คืนยอด
create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('partner', 'vendor')),
  owner_id text not null,
  owner_name text not null default '',
  amount_satang bigint not null check (amount_satang > 0),
  bank jsonb not null,
  status text not null default 'requested' check (status in ('requested', 'approved', 'paid', 'failed', 'rejected')),
  approved_by text,
  approved_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create unique index if not exists payout_requests_one_open on public.payout_requests(owner_type, owner_id) where status in ('requested', 'approved');
create index if not exists payout_requests_status on public.payout_requests(status, created_at desc);
alter table public.payout_requests enable row level security;

-- ย้ายสถานะ + ลงเงินพร้อมกัน: เพิ่มตาราง payout_requests
create or replace function public.wallet_move(
  p_table text, p_id uuid, p_from text[], p_patch jsonb,
  p_kind text, p_ref_type text, p_ref_id text, p_idem text, p_note text, p_actor text, p_legs jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cols text; v_vals text; v_row jsonb; v_tx bigint;
begin
  if p_table not in ('bookings', 'withdrawals', 'wallet_topups', 'quick_calls', 'member_purchases', 'sales_payouts', 'payout_requests') then raise exception 'wallet_move: table not allowed'; end if;
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
