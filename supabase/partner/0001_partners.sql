-- พาร์ทเนอร์ / พื้นที่โปรโมท (หน้า /partner + /admin/partners)
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  type text not null,
  province text not null,
  contact_name text not null,
  tel text not null,
  email text not null,
  line_id text,
  links text,
  package text not null check (package in ('3m', '6m', '12m')),
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qc', 'active', 'expired', 'rejected')),
  qc text not null default 'pending' check (qc in ('pending', 'passed', 'failed')),
  starts_at date,
  ends_at date,
  amount int not null default 0,
  notes text,
  consented_at timestamptz,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists partners_status_idx on public.partners (status);
create index if not exists partners_created_idx on public.partners (created_at desc);
-- เข้าถึงผ่าน service role เท่านั้น
alter table public.partners enable row level security;
