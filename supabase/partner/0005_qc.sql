-- นัด QC สถานที่ (/partner/qc) — รันหลัง 0002_portal.sql
-- qc_slot   = วัน-เวลาที่พาร์ทเนอร์นัด (null = ยังไม่นัด)
-- qc_docs   = {"license": [path], "photos": [path, ...], "prices": [path]} (ไฟล์ใน bucket "partners" โฟลเดอร์ qc/)
-- qc_status = booked (นัดแล้ว รอเข้า) | passed | failed — ผลตรวจจริงยังซิงก์กับคอลัมน์ qc เดิม
alter table public.partners add column if not exists qc_slot timestamptz;
alter table public.partners add column if not exists qc_docs jsonb not null default '{}'::jsonb;
alter table public.partners add column if not exists qc_status text
  check (qc_status is null or qc_status in ('booked', 'passed', 'failed'));
create index if not exists partners_qc_slot_idx on public.partners (qc_slot) where qc_slot is not null;
