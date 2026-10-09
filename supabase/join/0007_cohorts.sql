-- กลุ่มอบรม Part-Time (แอดมินสร้างกลุ่มใหม่ได้จาก /admin/cohorts)
-- รันใน Supabase SQL editor; ถ้ายังไม่รัน แอปจะใช้ COHORTS ใน src/lib/join/config.ts แทน
create table if not exists public.join_cohorts (
  key        text primary key,
  name       text not null,
  date_text  text not null default '',
  venue      text not null default '',
  sessions   int  not null default 5,
  capacity   int  not null default 50,
  status     text not null default 'open',   -- done | open | draft
  created_at timestamptz not null default now()
);
do $$ begin
  alter table public.join_cohorts add constraint join_cohorts_status_check check (status in ('done', 'open', 'draft'));
exception when duplicate_object then null; end $$;
alter table public.join_cohorts enable row level security;  -- เข้าถึงผ่าน service role เท่านั้น

insert into public.join_cohorts (key, name, date_text, venue, sessions, capacity, status) values
  ('1', 'กลุ่ม 1', 'ภายใน 20 พ.ย. 69', 'MB Studio ทองหล่อ', 5, 25, 'open'),
  ('2', 'กลุ่ม 2', '30 พ.ย. – ต้น ธ.ค. 69', 'MB Studio ทองหล่อ', 5, 25, 'open'),
  ('3', 'กลุ่ม 3', 'รอประกาศ', '', 5, 25, 'draft')
on conflict (key) do nothing;
