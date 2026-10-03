-- ลูกค้า (ล็อกอินด้วยอีเมล+รหัสผ่าน) — เข้าถึงผ่าน service role เท่านั้น
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  password_hash text not null, -- salt:hash (scrypt 32 bytes, hex)
  created_at timestamptz not null default now()
);
alter table public.customers enable row level security;
-- ไม่มี policy = anon/authenticated เข้าไม่ได้ (service role ข้าม RLS)
