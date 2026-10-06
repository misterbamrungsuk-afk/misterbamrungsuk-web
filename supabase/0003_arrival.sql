-- เวลา + ตำแหน่งที่ Part-Time กด "ถึงจุดนัดแล้ว" — ตัวจับเวลารอ 15 นาทีเริ่มจากเวลานี้ (เข้าถึงผ่าน service role เท่านั้น)
-- โค้ดทนได้ถ้ายังไม่รัน: ใช้หน่วยความจำแทน (+ localStorage ฝั่งเครื่อง)
create table if not exists public.booking_arrivals (
  booking_id text primary key,
  provider_id text not null default '',
  arrived_at timestamptz not null default now(),
  lat double precision,
  lng double precision,
  accuracy int,
  gps_error text,
  created_at timestamptz not null default now()
);
alter table public.booking_arrivals enable row level security;
