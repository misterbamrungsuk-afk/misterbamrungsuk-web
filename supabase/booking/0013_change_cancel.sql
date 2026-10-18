-- 0013 · ลูกค้ายกเลิกคำขอเปลี่ยนเวลา/ต่อเวลาที่รอเพื่อนตอบ (src/lib/bookings/changes.ts cancelChange) — เพิ่มอย่างเดียว · รันซ้ำได้
-- ยังไม่รัน = โค้ดเก็บเป็น status 'declined' + decided_by 'customer:…' แล้วแปลงเป็น cancelled ตอนอ่าน (ไม่พัง)
-- ไม่มีตารางใหม่: บล็อกลูกค้าของ Part-Time เก็บใน applicants.docs.extra.blocked_customers (src/lib/bookings/blocks.ts)

alter table public.booking_changes drop constraint if exists booking_changes_status_check;
alter table public.booking_changes add constraint booking_changes_status_check
  check (status in ('pending', 'accepted', 'declined', 'expired', 'failed', 'cancelled'));
