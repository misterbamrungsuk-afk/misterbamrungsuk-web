-- Mister Bamrungsuk · โค้ดโปรโมชัน + บัตรของขวัญ (บอร์ด C-Redeem + "ซื้อเป็นของขวัญ" ใน C-Membership) — รันหลัง 0003_quick.sql · รันซ้ำได้
-- โปรโมชัน: แอดมินสร้าง → ลูกค้ากรอก → เครดิตเข้ากระเป๋า (บริษัท.promo = ค่าการตลาด)
-- บัตรของขวัญ: ลูกค้าซื้อจากกระเป๋า (→ บริษัท.gift_liability) → ผู้รับกรอกโค้ด → เครดิตเข้ากระเป๋าผู้รับ
-- ใช้โค้ด/ซื้อบัตร = ฟังก์ชันเดียว (ล็อกแถวโค้ด · คนเดียวใช้โค้ดเดิมได้ครั้งเดียว · ลงเงินผ่าน wallet_post)

create table if not exists public.promo_codes (
  code text primary key,
  kind text not null check (kind in ('promo', 'gift')),
  amount_satang bigint not null check (amount_satang > 0 and amount_satang <= 10000000),
  max_uses int not null default 1 check (max_uses >= 1),
  used int not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  note text,
  created_by text,
  from_customer text,
  to_name text,
  to_contact text,
  message text,
  created_at timestamptz not null default now()
);
create index if not exists promo_codes_from on public.promo_codes (from_customer, created_at desc);
create table if not exists public.promo_redemptions (
  code text not null references public.promo_codes(code),
  customer_id text not null,
  amount_satang bigint not null,
  tx_id bigint,
  created_at timestamptz not null default now(),
  primary key (code, customer_id)
);
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;

create or replace function public.promo_redeem(p_code text, p_customer text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c promo_codes; v_tx bigint;
begin
  select * into c from promo_codes where code = upper(trim(p_code)) for update;
  if not found or not c.active or (c.expires_at is not null and c.expires_at < now()) or c.used >= c.max_uses then raise exception 'promo: invalid'; end if;
  if c.from_customer = p_customer then raise exception 'promo: own gift'; end if;
  begin
    insert into promo_redemptions(code, customer_id, amount_satang) values (c.code, p_customer, c.amount_satang);
  exception when unique_violation then raise exception 'promo: used'; end;
  update promo_codes set used = used + 1 where code = c.code;
  v_tx := wallet_post('promo', 'promo', c.code, 'promo:' || c.code || ':' || p_customer,
    case when c.kind = 'gift' then 'บัตรของขวัญ ' else 'โค้ดโปรโมชัน ' end || c.code, 'customer:' || p_customer,
    jsonb_build_array(
      jsonb_build_object('owner_type', 'platform', 'owner_id', 'mb', 'bucket', case when c.kind = 'gift' then 'gift_liability' else 'promo' end, 'amount', -c.amount_satang),
      jsonb_build_object('owner_type', 'customer', 'owner_id', p_customer, 'bucket', 'available', 'amount', c.amount_satang)));
  update promo_redemptions set tx_id = v_tx where code = c.code and customer_id = p_customer;
  return jsonb_build_object('code', c.code, 'kind', c.kind, 'amount', c.amount_satang, 'expires_at', c.expires_at, 'message', c.message, 'to_name', c.to_name);
end $$;
revoke all on function public.promo_redeem(text, text) from public, anon, authenticated;

create or replace function public.gift_buy(p_customer text, p_amount bigint, p_code text, p_to_name text, p_to_contact text, p_message text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_tx bigint;
begin
  if p_amount < 10000 or p_amount > 5000000 then raise exception 'gift: amount'; end if;
  insert into promo_codes(code, kind, amount_satang, max_uses, expires_at, from_customer, to_name, to_contact, message, created_by)
    values (upper(p_code), 'gift', p_amount, 1, now() + interval '1 year', p_customer, p_to_name, p_to_contact, p_message, 'customer:' || p_customer);
  v_tx := wallet_post('gift', 'gift', upper(p_code), 'gift:' || upper(p_code), 'ซื้อบัตรของขวัญ ' || upper(p_code), 'customer:' || p_customer,
    jsonb_build_array(
      jsonb_build_object('owner_type', 'customer', 'owner_id', p_customer, 'bucket', 'available', 'amount', -p_amount),
      jsonb_build_object('owner_type', 'platform', 'owner_id', 'mb', 'bucket', 'gift_liability', 'amount', p_amount)));
  return jsonb_build_object('code', upper(p_code), 'amount', p_amount, 'tx', v_tx);
end $$;
revoke all on function public.gift_buy(text, bigint, text, text, text, text) from public, anon, authenticated;

-- กระทบยอด: + บัตรของขวัญที่ยังไม่ถูกใช้ ต้องเท่ากับยอดในบัญชี gift_liability
create or replace function public.wallet_recon() returns jsonb language sql security definer set search_path = public as $$
  with bal as (select owner_type, owner_id, bucket, balance_satang b from wallet_balances)
  select jsonb_build_object(
    'ledger', (select coalesce(sum(amount_satang), 0) from wallet_entries),
    'escrow', (select coalesce(sum(b), 0) from bal where owner_type = 'platform' and bucket = 'escrow'),
    'expEscrow', (select coalesce(sum(total_satang), 0) from bookings where status in ('accepted', 'checked_in', 'cancel_requested', 'disputed')),
    'held', (select coalesce(sum(b), 0) from bal where owner_type = 'customer' and bucket = 'held'),
    'expHeld', (select coalesce(sum(total_satang), 0) from bookings where status = 'requested') + (select coalesce(sum(hold_satang), 0) from quick_calls where status = 'open'),
    'withdrawing', (select coalesce(sum(b), 0) from bal where owner_type = 'parttime' and bucket = 'withdrawing'),
    'expW', (select coalesce(sum(amount_satang), 0) from withdrawals where status in ('requested', 'batched')),
    'ptPending', (select coalesce(sum(b), 0) from bal where owner_type = 'parttime' and bucket = 'pending'),
    'expPtPending', (select coalesce(sum(pt_pending_satang), 0) from bookings where status in ('completed', 'refunded') and matured_at is null),
    'unknownPending', (select count(*) from bookings where status in ('completed', 'refunded') and matured_at is null and pt_pending_satang is null),
    'gift', (select coalesce(sum(b), 0) from bal where owner_type = 'platform' and bucket = 'gift_liability'),
    'expGift', (select coalesce(sum(amount_satang * (max_uses - used)), 0) from promo_codes where kind = 'gift'),
    'negatives', (select count(*) from bal where owner_type <> 'platform' and b < 0)
  );
$$;
revoke all on function public.wallet_recon() from public, anon, authenticated;
