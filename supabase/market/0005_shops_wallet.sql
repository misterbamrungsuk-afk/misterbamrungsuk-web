-- 0005 · Marketplace หลายร้าน: ใบสมัครเปิดร้าน · ค่าส่งต่อร้าน · จ่ายด้วยกระเป๋าเงิน — เพิ่มอย่างเดียว · รันซ้ำได้
-- โค้ดรองรับก่อนรันไฟล์นี้: ค่าส่งต่อร้าน/จ่ายด้วยกระเป๋า/รับใบสมัคร จะแจ้งว่า "ระบบยังไม่พร้อม" โดยไม่สลับทั้งร้านเป็นโหมดหน่วยความจำ

-- ค่าส่งที่ร้านตั้งเอง (บาท/ออเดอร์) · null = ใช้ค่าส่งกลางใน market_settings
alter table public.market_vendors add column if not exists shipping_fee numeric(10,2);
alter table public.market_vendors add column if not exists free_threshold numeric(10,2);

-- วิธีชำระของออเดอร์: slip (QR + สลิป) | wallet (ตัดจากกระเป๋าเงิน → wallet bucket platform.market_escrow)
alter table public.market_orders add column if not exists pay_method text not null default 'slip';
do $$ begin
  alter table public.market_orders add constraint market_orders_pay_method check (pay_method in ('slip', 'wallet'));
exception when duplicate_object then null; end $$;

-- ใบสมัครเปิดร้าน (/market/sell) — เอกสารอยู่ใน bucket "market" โฟลเดอร์ apply/ (ไม่เปิดสาธารณะ เสิร์ฟผ่าน /api/market/admin/apply-doc)
create table if not exists public.market_vendor_applications (
  id uuid primary key default gen_random_uuid(),
  shop_name text not null,
  owner_name text not null,
  phone text not null,
  email text not null,
  line_id text not null default '',
  business_type text not null check (business_type in ('person', 'company')),
  description text not null default '',
  category text not null default '',
  docs jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  vendor_id uuid references public.market_vendors(id) on delete set null,
  reviewed_by text,
  reviewed_at timestamptz,
  ip text not null default '',
  created_at timestamptz not null default now()
);
-- อีเมลเดียวมีใบสมัครที่ยังไม่ถูกปฏิเสธได้ใบเดียว (กันสมัครซ้ำ/ยิงพร้อมกัน)
create unique index if not exists market_vendor_applications_email on public.market_vendor_applications (lower(email)) where status <> 'rejected';
create index if not exists market_vendor_applications_status on public.market_vendor_applications (status, created_at desc);
alter table public.market_vendor_applications enable row level security;
