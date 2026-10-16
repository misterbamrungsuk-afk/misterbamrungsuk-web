-- Mister Bamrungsuk · แชท: เก็บเหตุผลที่ข้อความถูกกัน (contact / word:คำ) ให้ทีมงานตรวจย้อนหลัง — รันซ้ำได้ ไม่ลบข้อมูล
alter table public.messages add column if not exists flag text;
create index if not exists messages_blocked on public.messages (created_at desc) where blocked;
