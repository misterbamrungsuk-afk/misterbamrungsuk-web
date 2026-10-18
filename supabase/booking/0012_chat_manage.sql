-- 0012 · จัดการแชทของลูกค้า/Part-Time (src/lib/bookings/chat-manage.ts) — เพิ่มอย่างเดียว · รันซ้ำได้ · ไม่ลบข้อความจริงเลย
-- ยกเลิกการส่ง: messages.unsent_at (ผู้ใช้ทั้งสองฝ่ายเห็น "ยกเลิกการส่งข้อความแล้ว" · ทีมงานยังเห็นข้อความเดิม)
-- ลบข้อความ (เฉพาะฉัน): message_hides · ซ่อนแชท / ลบกล่องแชท (เฉพาะฉัน): chat_hides

alter table public.messages add column if not exists unsent_at timestamptz;
-- poll ฝั่งผู้ใช้ถามว่ามีข้อความไหนถูกยกเลิกการส่งหลังเวลาที่ดึงล่าสุด
create index if not exists messages_unsent on public.messages (booking_id, unsent_at) where unsent_at is not null;

create table if not exists public.message_hides (
  user_type text not null check (user_type in ('customer', 'parttime')),
  user_id text not null,
  message_id bigint not null references public.messages(id),
  created_at timestamptz not null default now(),
  primary key (user_type, user_id, message_id)
);
create index if not exists message_hides_message on public.message_hides (message_id);

-- mode: hide = ซ่อนจากรายการ · delete = ลบกล่องแชท (ล้างประวัติฝั่งฉันถึง cleared_upto)
-- upto_id: id ข้อความล่าสุดตอนซ่อน — มีข้อความใหม่ id มากกว่านี้ = แชทกลับมาในรายการเอง · null = เลิกซ่อนแล้ว
-- cleared_upto: ข้อความ id ≤ ค่านี้ไม่แสดงให้ฉันอีก (ลบกล่องแชท) · คงไว้แม้ซ่อน/เลิกซ่อนภายหลัง
create table if not exists public.chat_hides (
  user_type text not null check (user_type in ('customer', 'parttime')),
  user_id text not null,
  booking_id uuid not null references public.bookings(id),
  mode text not null check (mode in ('hide', 'delete')),
  upto_id bigint,
  cleared_upto bigint,
  created_at timestamptz not null default now(),
  primary key (user_type, user_id, booking_id)
);
alter table public.chat_hides add column if not exists cleared_upto bigint;
create index if not exists chat_hides_booking on public.chat_hides (booking_id);

-- service role เท่านั้น (ไม่มี policy = anon/authenticated อ่านเขียนไม่ได้)
alter table public.message_hides enable row level security;
alter table public.chat_hides enable row level security;
