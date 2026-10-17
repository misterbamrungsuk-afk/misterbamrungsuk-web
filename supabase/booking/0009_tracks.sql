-- 0009 · ตำแหน่ง Part-Time ระหว่างเดินทางไปหาลูกค้า (จุดล่าสุดจุดเดียวต่อการจอง · ลบเมื่อพ้นสถานะ "รับแล้ว") — เพิ่มอย่างเดียว · รันซ้ำได้
create table if not exists public.booking_tracks (
  booking_id uuid primary key,
  lat double precision not null,
  lng double precision not null,
  accuracy integer,
  at timestamptz not null default now(),
  started_at timestamptz not null default now()
);
alter table public.booking_tracks enable row level security;
