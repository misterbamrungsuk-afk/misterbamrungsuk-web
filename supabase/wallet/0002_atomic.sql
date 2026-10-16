-- Mister Bamrungsuk · กระเป๋าเงิน รอบ 2 (ผลตรวจความปลอดภัย 16 ต.ค.) — รันหลัง 0001_wallet.sql + booking/0001_booking.sql
-- 1) wallet_move: เปลี่ยนสถานะแบบมีเงื่อนไข + ลงบัญชีเงิน ใน transaction เดียว (พลาดขั้นไหน = ย้อนทั้งหมด ไม่มีเงินค้าง/สถานะเพี้ยน)
-- 2) bookings.pt_pending_satang: ยอดที่เข้า PT.pending จริง → ปล่อยเงินตามยอดนี้เป๊ะ
-- 3) กันสลิปซ้ำในระบบเอง (trans_ref) · กันคำขอถอนซ้อน · ปิดการอ่านยอดผ่าน anon key
-- 4) wallet_recon: กระทบยอดด้วย SQL (ไม่ติดเพดาน 1,000 แถวของ API)

alter table public.bookings add column if not exists pt_pending_satang bigint;

-- สลิปเดียวใช้เติมเงินได้ครั้งเดียว (ยกเว้นรายการที่ถูกปฏิเสธ)
create unique index if not exists wallet_topups_transref on public.wallet_topups ((slip_check->>'trans_ref'))
  where status <> 'rejected' and slip_check->>'trans_ref' is not null;
-- Part-Time มีคำขอถอนที่รอรวมรอบได้ทีละ 1 รายการ
create unique index if not exists withdrawals_one_open on public.withdrawals (parttime_id) where status = 'requested';

-- view ยอดเงิน: ใช้สิทธิ์ของผู้เรียก (RLS) + ไม่ให้ anon/authenticated อ่าน
alter view public.wallet_balances set (security_invoker = true);
revoke all on public.wallet_balances from anon, authenticated;

create or replace function public.wallet_move(
  p_table text, p_id uuid, p_from text[], p_patch jsonb,
  p_kind text, p_ref_type text, p_ref_id text, p_idem text, p_note text, p_actor text, p_legs jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cols text; v_vals text; v_row jsonb; v_tx bigint;
begin
  if p_table not in ('bookings', 'withdrawals', 'wallet_topups') then raise exception 'wallet_move: table not allowed'; end if;
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
  if v_row is null then return null; end if;               -- สถานะเปลี่ยนไปแล้ว → ไม่ลงเงิน
  if p_legs is not null and jsonb_array_length(p_legs) >= 2 then
    v_tx := wallet_post(p_kind, p_ref_type, p_ref_id, p_idem, p_note, p_actor, p_legs);
    if p_table = 'wallet_topups' then
      update public.wallet_topups set tx_id = v_tx where id = p_id returning to_jsonb(wallet_topups) into v_row;
    end if;
  end if;
  return v_row;
end $$;
revoke all on function public.wallet_move(text, uuid, text[], jsonb, text, text, text, text, text, text, jsonb) from public, anon, authenticated;

-- กระทบยอดทั้งระบบใน SQL
create or replace function public.wallet_recon() returns jsonb language sql security definer set search_path = public as $$
  with bal as (select owner_type, owner_id, bucket, balance_satang b from wallet_balances)
  select jsonb_build_object(
    'ledger', (select coalesce(sum(amount_satang), 0) from wallet_entries),
    'escrow', (select coalesce(sum(b), 0) from bal where owner_type = 'platform' and bucket = 'escrow'),
    'expEscrow', (select coalesce(sum(total_satang), 0) from bookings where status in ('accepted', 'checked_in', 'cancel_requested', 'disputed')),
    'held', (select coalesce(sum(b), 0) from bal where owner_type = 'customer' and bucket = 'held'),
    'expHeld', (select coalesce(sum(total_satang), 0) from bookings where status = 'requested'),
    'withdrawing', (select coalesce(sum(b), 0) from bal where owner_type = 'parttime' and bucket = 'withdrawing'),
    'expW', (select coalesce(sum(amount_satang), 0) from withdrawals where status in ('requested', 'batched')),
    'ptPending', (select coalesce(sum(b), 0) from bal where owner_type = 'parttime' and bucket = 'pending'),
    'expPtPending', (select coalesce(sum(pt_pending_satang), 0) from bookings where status in ('completed', 'refunded') and matured_at is null),
    'unknownPending', (select count(*) from bookings where status in ('completed', 'refunded') and matured_at is null and pt_pending_satang is null),
    'negatives', (select count(*) from bal where owner_type <> 'platform' and b < 0)
  );
$$;
revoke all on function public.wallet_recon() from public, anon, authenticated;
