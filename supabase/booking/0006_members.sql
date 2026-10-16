-- Mister Bamrungsuk · แอดมินจัดการสมาชิกลูกค้า (บอร์ด A-Members): ระงับบัญชี + ลบข้อมูลตามคำขอ (PDPA) — รันหลัง 0005_extras.sql · รันซ้ำได้
alter table public.customers add column if not exists suspended_at timestamptz;
alter table public.customers add column if not exists suspend_reason text;
alter table public.customers add column if not exists deleted_at timestamptz; -- ลบข้อมูลส่วนบุคคลแล้ว (เก็บแถวไว้ให้บัญชีเงิน/การจองอ้างอิงได้)
