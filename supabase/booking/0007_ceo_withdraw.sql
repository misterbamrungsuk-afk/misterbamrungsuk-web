-- 0007 · ถอนเงิน 2 ชั้น: Part-Time ขอถอน (requested) → CEO อนุมัติ (approved) → แอดมินรวมรอบ/โอน (batched → paid) · CEO ไม่อนุมัติ = failed + คืนยอด
-- เพิ่มอย่างเดียว (ไม่ลบข้อมูล) · รันซ้ำได้
alter table public.withdrawals drop constraint if exists withdrawals_status_check;
alter table public.withdrawals add constraint withdrawals_status_check check (status in ('requested', 'approved', 'batched', 'paid', 'failed'));
alter table public.withdrawals add column if not exists approved_by text;
alter table public.withdrawals add column if not exists approved_at timestamptz;

-- กระทบยอด: เงินกำลังถอน = คำขอที่ยังเปิด (รวม approved)
create or replace function public.wallet_recon() returns jsonb language sql security definer set search_path = public as $$
  with bal as (select owner_type, owner_id, bucket, balance_satang b from wallet_balances)
  select jsonb_build_object(
    'ledger', (select coalesce(sum(amount_satang), 0) from wallet_entries),
    'escrow', (select coalesce(sum(b), 0) from bal where owner_type = 'platform' and bucket = 'escrow'),
    'expEscrow', (select coalesce(sum(total_satang), 0) from bookings where status in ('accepted', 'checked_in', 'cancel_requested', 'disputed')),
    'held', (select coalesce(sum(b), 0) from bal where owner_type = 'customer' and bucket = 'held'),
    'expHeld', (select coalesce(sum(total_satang), 0) from bookings where status = 'requested') + (select coalesce(sum(hold_satang), 0) from quick_calls where status = 'open'),
    'withdrawing', (select coalesce(sum(b), 0) from bal where owner_type = 'parttime' and bucket = 'withdrawing'),
    'expW', (select coalesce(sum(amount_satang), 0) from withdrawals where status in ('requested', 'approved', 'batched')),
    'ptPending', (select coalesce(sum(b), 0) from bal where owner_type = 'parttime' and bucket = 'pending'),
    'expPtPending', (select coalesce(sum(pt_pending_satang), 0) from bookings where status in ('completed', 'refunded') and matured_at is null),
    'unknownPending', (select count(*) from bookings where status in ('completed', 'refunded') and matured_at is null and pt_pending_satang is null),
    'gift', (select coalesce(sum(b), 0) from bal where owner_type = 'platform' and bucket = 'gift_liability'),
    'expGift', (select coalesce(sum(amount_satang * (max_uses - used)), 0) from promo_codes where kind = 'gift'),
    'negatives', (select count(*) from bal where owner_type <> 'platform' and b < 0)
  );
$$;
revoke all on function public.wallet_recon() from public, anon, authenticated;
