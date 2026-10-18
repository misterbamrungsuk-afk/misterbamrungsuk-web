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
