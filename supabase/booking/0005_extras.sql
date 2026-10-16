-- Mister Bamrungsuk · ลูกค้า: บล็อกผู้ใช้ + ที่อยู่ที่บันทึก (C-Report / C-Addresses) + ตารางรายงานผู้ใช้ — รันหลัง 0004_codes.sql · รันซ้ำได้ ไม่ลบข้อมูล
alter table public.customers add column if not exists blocked text[] not null default '{}';        -- publicId ของเพื่อนที่บล็อก
alter table public.customers add column if not exists addresses jsonb not null default '[]'::jsonb; -- [{ id, label, detail, note, primary }]

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  reporter_type text not null check (reporter_type in ('customer', 'parttime')),
  reporter_id text not null,
  target_type text not null check (target_type in ('customer', 'parttime')),
  target_id text not null,
  target_label text,
  booking_id uuid,
  reason text not null,
  detail text,
  blocked boolean not null default false,
  status text not null default 'open' check (status in ('open', 'closed')),
  admin_note text,
  created_at timestamptz not null default now()
);
create index if not exists reports_open on public.reports (status, created_at desc);
create index if not exists reports_target on public.reports (target_type, target_id);
alter table public.reports enable row level security;
