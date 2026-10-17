-- 0004 · ผูกออเดอร์กับบัญชีลูกค้าที่ล็อกอินตอนสั่ง (ให้แต้มสมาชิกเมื่อออเดอร์สำเร็จ) — เพิ่มอย่างเดียว · รันซ้ำได้
alter table public.market_orders add column if not exists customer_id text;
alter table public.market_orders add column if not exists customer_email text;
create index if not exists market_orders_customer on public.market_orders(customer_id) where customer_id is not null;
