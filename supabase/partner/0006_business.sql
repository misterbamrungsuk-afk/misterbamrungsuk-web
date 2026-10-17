-- ข้อมูลติดต่อสาธารณะของสถานที่ (แยกจากเบอร์/LINE ส่วนตัวผู้สมัคร) + ข้อความฝากบอกในนัดที่สปา
alter table public.partner_listings add column if not exists contact jsonb;
alter table public.partner_bookings add column if not exists note text;
