-- ลูกค้ากด "สนใจ" ประกาศ "วันนี้ว่าง" ของ Part-Time (src/lib/interests.ts)
-- 1 ลูกค้า ต่อ 1 ประกาศ (ประกาศ = parttime_id + post_at = created_at ของประกาศใน docs.extra.post)
-- ยกเลิกสนใจ = ตั้ง withdrawn_at (ไม่ลบ แถวเดิมกันแจ้งเตือน Part-Time ซ้ำเมื่อกดสนใจอีกครั้ง)
-- เก็บเฉพาะชื่อแบบปิดบัง (customer_label) — Part-Time ไม่เห็นรหัส/อีเมลลูกค้า
create table if not exists public.pt_post_interests (
  id            uuid primary key default gen_random_uuid(),
  parttime_id   uuid not null,
  post_at       timestamptz not null,
  customer_id   text not null,
  customer_label text not null default '',
  withdrawn_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (parttime_id, post_at, customer_id)
);
create index if not exists pt_post_interests_post_idx on public.pt_post_interests (parttime_id, post_at);
alter table public.pt_post_interests enable row level security;  -- เข้าถึงผ่าน service role เท่านั้น
