-- 0002 · รูปโปรไฟล์ของทุกบัญชี (ลูกค้า / พาร์ทเนอร์ / ร้านค้า / Sale Man) + ตำแหน่ง/ซูมในกรอบ — เพิ่มอย่างเดียว · รันซ้ำได้
create table if not exists public.profile_avatars (
  owner_type text not null check (owner_type in ('customer', 'partner', 'vendor', 'sales')),
  owner_id text not null,
  path text not null,                 -- ไฟล์ใน bucket applicants (avatars/...)
  pos text not null default '50% 50%', -- object-position "x% y%"
  zoom numeric(3,2) not null default 1 check (zoom >= 1 and zoom <= 3),
  updated_at timestamptz not null default now(),
  primary key (owner_type, owner_id)
);
alter table public.profile_avatars enable row level security;
