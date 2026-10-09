-- ผลตรวจสลิปค่าแพ็กเกจพาร์ทเนอร์ผ่าน Slip2Go (SlipCheck จาก src/lib/slip2go.ts) — null = ไม่ได้ตรวจ (ไม่มี SLIP2GO_API_SECRET)
alter table public.partner_purchases add column if not exists slip_check jsonb;
