-- Mister Bamrungsuk · กระเป๋าเงิน (ledger บัญชีคู่) — รันใน Supabase SQL Editor ครั้งเดียว
-- หลัก: ทุกการเคลื่อนไหวเงิน = 1 รายการ (wallet_tx) + บรรทัดบัญชี (wallet_entries) ที่ผลรวม = 0 เสมอ
--       แก้/ลบไม่ได้ (append-only) · เงินเป็นสตางค์ (bigint) · กันกดซ้ำด้วย idem_key
-- เจ้าของ: customer (ลูกค้า) · parttime (applicants.id) · partner · platform (บริษัท)
-- ช่อง: customer.available/held · parttime.pending/available/withdrawing · platform.bank/escrow/revenue/wht_payable/adjust

create table if not exists public.wallet_accounts (
  id bigserial primary key,
  owner_type text not null check (owner_type in ('customer','parttime','partner','platform')),
  owner_id text not null,
  bucket text not null,
  created_at timestamptz not null default now(),
  unique (owner_type, owner_id, bucket)
);

create table if not exists public.wallet_tx (
  id bigserial primary key,
  kind text not null,
  ref_type text,
  ref_id text,
  idem_key text unique,
  note text,
  actor text,
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_entries (
  id bigserial primary key,
  tx_id bigint not null references public.wallet_tx(id),
  account_id bigint not null references public.wallet_accounts(id),
  amount_satang bigint not null check (amount_satang <> 0),
  created_at timestamptz not null default now()
);
create index if not exists wallet_entries_account on public.wallet_entries(account_id);
create index if not exists wallet_entries_tx on public.wallet_entries(tx_id);
create index if not exists wallet_tx_ref on public.wallet_tx(ref_type, ref_id);

-- ยอดคงเหลือต่อบัญชี (ผลรวมรายการ — ไม่มีการเขียนทับยอด)
create or replace view public.wallet_balances as
  select a.id as account_id, a.owner_type, a.owner_id, a.bucket, coalesce(sum(e.amount_satang), 0)::bigint as balance_satang
  from public.wallet_accounts a left join public.wallet_entries e on e.account_id = a.id
  group by a.id;

-- คำขอเติมเงินของลูกค้า (QR + สลิป) — Slip2Go ผ่าน = credited อัตโนมัติ · ไม่ผ่าน = pending ให้แอดมินตัดสิน
create table if not exists public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null,
  customer_email text,
  amount_satang bigint not null check (amount_satang > 0),
  slip_path text,
  slip_check jsonb,
  status text not null default 'pending' check (status in ('pending','credited','rejected')),
  reason text,
  tx_id bigint references public.wallet_tx(id),
  reviewed_by text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists wallet_topups_customer on public.wallet_topups(customer_id, created_at desc);
create index if not exists wallet_topups_status on public.wallet_topups(status, created_at);

-- ── ฟังก์ชันเดียวสำหรับทุกการเคลื่อนไหวเงิน ──
-- p_legs = [{"owner_type":"customer","owner_id":"…","bucket":"available","amount":10000}, …] (สตางค์ · ผลรวมต้อง = 0)
-- บัญชีที่ไม่ใช่ platform ห้ามติดลบหลังทำรายการ · idem_key ซ้ำ = คืน tx เดิม (ไม่ทำซ้ำ)
create or replace function public.wallet_post(p_kind text, p_ref_type text, p_ref_id text, p_idem text, p_note text, p_actor text, p_legs jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_tx bigint; v_leg jsonb; v_acc bigint; v_sum bigint := 0; v_bal bigint; v_ids bigint[] := '{}';
begin
  if p_idem is not null then
    select id into v_tx from wallet_tx where idem_key = p_idem;
    if found then return v_tx; end if;
  end if;
  if jsonb_array_length(p_legs) < 2 then raise exception 'wallet: need at least 2 legs'; end if;
  for v_leg in select * from jsonb_array_elements(p_legs) loop
    v_sum := v_sum + (v_leg->>'amount')::bigint;
  end loop;
  if v_sum <> 0 then raise exception 'wallet: legs must sum to 0 (got %)', v_sum; end if;

  insert into wallet_tx(kind, ref_type, ref_id, idem_key, note, actor) values (p_kind, p_ref_type, p_ref_id, p_idem, p_note, p_actor) returning id into v_tx;
  for v_leg in select * from jsonb_array_elements(p_legs) order by (value->>'owner_type'), (value->>'owner_id'), (value->>'bucket') loop
    insert into wallet_accounts(owner_type, owner_id, bucket) values (v_leg->>'owner_type', v_leg->>'owner_id', v_leg->>'bucket')
      on conflict (owner_type, owner_id, bucket) do nothing;
    select id into v_acc from wallet_accounts where owner_type = v_leg->>'owner_type' and owner_id = v_leg->>'owner_id' and bucket = v_leg->>'bucket' for update;
    if (v_leg->>'amount')::bigint <> 0 then
      insert into wallet_entries(tx_id, account_id, amount_satang) values (v_tx, v_acc, (v_leg->>'amount')::bigint);
    end if;
    if v_leg->>'owner_type' <> 'platform' then v_ids := v_ids || v_acc; end if;
  end loop;
  foreach v_acc in array v_ids loop
    select coalesce(sum(amount_satang), 0) into v_bal from wallet_entries where account_id = v_acc;
    if v_bal < 0 then raise exception 'wallet: insufficient balance'; end if;
  end loop;
  return v_tx;
exception when unique_violation then
  select id into v_tx from wallet_tx where idem_key = p_idem;
  if v_tx is not null then return v_tx; end if;
  raise;
end $$;

-- ปิดสิทธิ์ทุกตาราง: เข้าถึงผ่านเซิร์ฟเวอร์ (service role) เท่านั้น
alter table public.wallet_accounts enable row level security;
alter table public.wallet_tx enable row level security;
alter table public.wallet_entries enable row level security;
alter table public.wallet_topups enable row level security;
revoke all on function public.wallet_post(text, text, text, text, text, text, jsonb) from public, anon, authenticated;

-- ห้ามแก้/ลบรายการเงิน (append-only)
create or replace function public.wallet_no_change() returns trigger language plpgsql as $$ begin raise exception 'wallet ledger is append-only'; end $$;
drop trigger if exists wallet_entries_lock on public.wallet_entries;
create trigger wallet_entries_lock before update or delete on public.wallet_entries for each row execute function public.wallet_no_change();
drop trigger if exists wallet_tx_lock on public.wallet_tx;
create trigger wallet_tx_lock before update or delete on public.wallet_tx for each row execute function public.wallet_no_change();
