-- 0005 · เลขอ้างอิงสลิปที่ใช้แล้วทั้งระบบ (กันใช้สลิปเดียวซ้ำข้ามช่องทาง) — เพิ่มอย่างเดียว · รันซ้ำได้
create table if not exists public.slip_refs (
  trans_ref text primary key,
  created_at timestamptz not null default now()
);
alter table public.slip_refs enable row level security;
revoke all on public.slip_refs from anon, authenticated;
grant all on public.slip_refs to service_role;
-- เติมเลขสลิปที่เคยใช้แล้ว (กันใช้ซ้ำย้อนหลัง)
insert into public.slip_refs (trans_ref) select slip_check->>'trans_ref' from public.wallet_topups where slip_check->>'trans_ref' is not null on conflict do nothing;
insert into public.slip_refs (trans_ref) select trans_ref from public.member_purchases where trans_ref is not null on conflict do nothing;
