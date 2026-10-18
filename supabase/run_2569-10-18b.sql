-- รวม SQL รอบ 18 ต.ค. 2569 (2) · รันใน Supabase SQL Editor (production) ครั้งเดียว · เพิ่มอย่างเดียว
begin;

-- ===== supabase/booking/0013_change_cancel.sql =====
-- 0013 · ลูกค้ายกเลิกคำขอเปลี่ยนเวลา/ต่อเวลาที่รอเพื่อนตอบ (src/lib/bookings/changes.ts cancelChange) — เพิ่มอย่างเดียว · รันซ้ำได้
-- ยังไม่รัน = โค้ดเก็บเป็น status 'declined' + decided_by 'customer:…' แล้วแปลงเป็น cancelled ตอนอ่าน (ไม่พัง)
-- ไม่มีตารางใหม่: บล็อกลูกค้าของ Part-Time เก็บใน applicants.docs.extra.blocked_customers (src/lib/bookings/blocks.ts)

alter table public.booking_changes drop constraint if exists booking_changes_status_check;
alter table public.booking_changes add constraint booking_changes_status_check
  check (status in ('pending', 'accepted', 'declined', 'expired', 'failed', 'cancelled'));


-- ===== supabase/booking/0014_partner_vendor_notices.sql =====
-- กล่องแจ้งเตือนในแอป + web push สำหรับพาร์ทเนอร์ (สปา/โรงแรม) และร้านค้า Marketplace
-- user_type ใหม่: partner (partners.id) · vendor (market_vendors.id) — โค้ดทำงานได้ก่อนรันไฟล์นี้ (insert พลาดแค่ log · ผูกอุปกรณ์แจ้งว่ายังไม่เปิด)
-- รันซ้ำได้

-- ลบ check เดิมของคอลัมน์ user_type (ชื่ออัตโนมัติ notifications_user_type_check / push_subs_user_type_check หรือชื่ออื่นถ้าเคยแก้)
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass::text as tbl, c.conname
    from pg_constraint c
    where c.contype = 'c' and c.conrelid in ('public.notifications'::regclass, 'public.push_subs'::regclass)
      and pg_get_constraintdef(c.oid) ilike '%user_type%'
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

alter table public.notifications add constraint notifications_user_type_check
  check (user_type in ('customer', 'parttime', 'admin', 'partner', 'vendor'));
alter table public.push_subs add constraint push_subs_user_type_check
  check (user_type in ('customer', 'parttime', 'admin', 'partner', 'vendor'));

-- กระดิ่งนับที่ยังไม่อ่าน
create index if not exists notifications_unread on public.notifications(user_type, user_id) where read_at is null;

commit;
