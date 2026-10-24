-- สถิติผู้เข้าชมเว็บ (ของเราเอง · หน้าแอดมิน /admin/traffic) — 24 ต.ค. 2569
-- 1 แถว = เปิด 1 หน้า · dur_ms = เวลาที่อยู่หน้านั้น (ส่งตอนออกจากหน้า)
-- ไม่ยินยอมคุกกี้วิเคราะห์ = เก็บแบบไม่ระบุตัวตน (sid ชั่วคราวต่อแท็บ · ไม่มี vid/ผู้ใช้)
-- รันใน Supabase SQL Editor (production) · รันซ้ำได้
create table if not exists public.site_events (
  id uuid primary key,
  at timestamptz not null default now(),
  sid text not null,               -- รอบการเข้าชม (หายเมื่อปิดแท็บ)
  vid text,                        -- ผู้เข้าชมซ้ำ (เฉพาะยินยอมคุกกี้วิเคราะห์)
  path text not null,
  ref text,                        -- โดเมนที่มา
  utm_source text, utm_medium text, utm_campaign text,
  device text,                     -- mobile / tablet / desktop
  country text, city text,
  who_type text,                   -- customer / parttime (เฉพาะยินยอม + ล็อกอิน)
  who_id text, who_label text,
  mk boolean not null default false, -- ยินยอมคุกกี้การตลาด (ส่งออกรายชื่อทำโฆษณาได้เฉพาะ true)
  dur_ms integer
);
create index if not exists site_events_at on public.site_events (at desc);
create index if not exists site_events_sid on public.site_events (sid);
alter table public.site_events enable row level security; -- เข้าถึงผ่าน service role (เซิร์ฟเวอร์) เท่านั้น
