-- 0010 · โทรผ่านแอป (WebRTC) — หนึ่งแถวต่อสาย · เก็บ SDP ระหว่างต่อสาย (ลบทิ้งเมื่อจบสาย) — เพิ่มอย่างเดียว · รันซ้ำได้
create table if not exists public.booking_calls (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  caller_type text not null check (caller_type in ('customer', 'parttime')),
  caller_id text not null,
  callee_type text not null check (callee_type in ('customer', 'parttime')),
  callee_id text not null,
  caller_name text,
  status text not null default 'ringing' check (status in ('ringing', 'active', 'ended', 'missed', 'declined')),
  end_reason text,
  offer text,
  answer text,
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_s integer
);
-- เปิดได้ทีละหนึ่งสายต่อการจอง (กันกดพร้อมกันสองฝั่ง)
create unique index if not exists booking_calls_one_live on public.booking_calls (booking_id) where status in ('ringing', 'active');
create index if not exists booking_calls_booking on public.booking_calls (booking_id, created_at desc);
create index if not exists booking_calls_callee_ringing on public.booking_calls (callee_type, callee_id) where status = 'ringing';
alter table public.booking_calls enable row level security;
