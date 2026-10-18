-- 0006 · ลูกค้าถอนเงินในกระเป๋าเข้าบัญชีธนาคาร — ใช้ตาราง payout_requests เดิม (CEO อนุมัติ → แอดมินโอน) — เพิ่มอย่างเดียว · รันซ้ำได้
-- เงิน: customer.available → customer.withdrawing (ขอ) → platform.bank (โอนแล้ว) · ไม่อนุมัติ/โอนไม่สำเร็จ = คืน available
-- ยอดถอนได้ (ไม่รวมเครดิตโบนัสเมมเบอร์/โค้ด) ตรวจในแอป src/lib/payouts/customer.ts

alter table public.payout_requests drop constraint if exists payout_requests_owner_type_check;
alter table public.payout_requests add constraint payout_requests_owner_type_check check (owner_type in ('partner', 'vendor', 'customer'));
