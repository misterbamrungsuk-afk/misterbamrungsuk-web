-- อุทธรณ์ใบเตือน (strike) ในแอป (src/lib/appeals.ts) — 1 อุทธรณ์ ต่อ 1 ใบเตือน
-- status: pending → accepted (ใบเตือนถูกยกเลิก: ไม่นับใบนี้) | rejected (decision_note = เหตุผล)
-- ใบเตือนที่ยกเลิก = strike_id ที่มีอุทธรณ์ status = 'accepted' (การนับใบเตือนต้องกรองออก)
create table if not exists public.strike_appeals (
  id            uuid primary key default gen_random_uuid(),
  strike_id     text not null unique,
  parttime_id   uuid not null,
  mb            text not null,
  strike_reason text not null default '',
  strike_ref    text,
  strike_at     timestamptz,
  reason        text not null check (char_length(reason) between 1 and 1000),
  photo_path    text,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  decision_note text,
  decided_by    text,
  decided_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists strike_appeals_pt_idx on public.strike_appeals (parttime_id, created_at desc);
create index if not exists strike_appeals_status_idx on public.strike_appeals (status, created_at desc);
alter table public.strike_appeals enable row level security;  -- เข้าถึงผ่าน service role เท่านั้น
