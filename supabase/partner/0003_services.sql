-- Partner ฝั่งสปา: รายการบริการ (ราคาฐานสปา → ราคาขายบนแพลตฟอร์ม) + ตัดแพ็กเกจ 12 เดือน
-- services = [{ "name": text, "minutes": int, "base_price": int, "platform_price": int|null }]
-- platform_price = null แปลว่า [รอกำหนด] (ทีมงานเป็นผู้กำหนด mark up)
alter table public.partner_listings
  add column if not exists services jsonb not null default '[]'::jsonb;

-- แพ็กเกจเหลือแค่ 3m / 6m — แถวเก่าที่เป็น 12m (ถ้ามี) ย้ายเป็น 6m ก่อนแก้ check
update public.partners set package = '6m' where package = '12m';
update public.partner_purchases set package = '6m' where package = '12m';

alter table public.partners drop constraint if exists partners_package_check;
alter table public.partners add constraint partners_package_check check (package in ('3m', '6m'));
alter table public.partner_purchases drop constraint if exists partner_purchases_package_check;
alter table public.partner_purchases add constraint partner_purchases_package_check check (package in ('3m', '6m'));
