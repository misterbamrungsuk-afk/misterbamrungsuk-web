-- ผลตรวจสลิป Slip2Go ของคำสั่งซื้อ Marketplace
alter table market_orders add column if not exists slip_check jsonb;
