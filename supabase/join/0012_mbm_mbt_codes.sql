-- รหัส Part-Time ใหม่ (22 ต.ค. 2569): หนุ่มหล่อ MBM-YYMMNNN · ทอมหล่อ MBT-YYMMNNN (นับเลขแยก)
-- รันใน Supabase SQL Editor (production) ก่อน deploy โค้ด · รันซ้ำได้
-- เปลี่ยนรหัสเดิม: MB-xxxxxxx → MBM-xxxxxxx · MS-xxxxxxx → MBT-xxxxxxx (เลขเดิม)

create or replace function public.next_brand_code(p_brand text) returns text
language plpgsql security definer set search_path = public as $$
declare
  p text;
  n integer;
begin
  if p_brand = 'MB' then p_brand := 'MBM'; elsif p_brand = 'MS' then p_brand := 'MBT'; end if;
  if p_brand not in ('MBM', 'MBT') then raise exception 'bad brand %', p_brand; end if;
  p := p_brand || '-' || to_char(now() at time zone 'Asia/Bangkok', 'YYMM');
  insert into mb_counters (prefix, last) values (p, 1)
  on conflict (prefix) do update set last = mb_counters.last + 1
  returning last into n;
  return p || lpad(n::text, 3, '0');
end $$;
revoke all on function public.next_brand_code(text) from public, anon, authenticated;

begin;

-- ย้ายตัวนับเลข: MB-YYMM → MBM-YYMM · MS-YYMM → MBT-YYMM (เก็บค่าที่มากกว่า)
insert into mb_counters (prefix, last)
select case when prefix like 'MS-%' then 'MBT-' else 'MBM-' end || substring(prefix from 4), last
from mb_counters where prefix ~ '^M[BS]-\d{4}$'
on conflict (prefix) do update set last = greatest(mb_counters.last, excluded.last);

-- เปลี่ยนรหัสในใบสมัคร + ตารางที่อ้างรหัส
update public.applicants set mb_code = 'MBM-' || substring(mb_code from 4) where mb_code ~ '^MB-\d';
update public.applicants set mb_code = 'MBT-' || substring(mb_code from 4) where mb_code ~ '^MS-\d';
update public.bookings set parttime_mb = 'MBM-' || substring(parttime_mb from 4) where parttime_mb ~ '^MB-\d';
update public.bookings set parttime_mb = 'MBT-' || substring(parttime_mb from 4) where parttime_mb ~ '^MS-\d';
update public.withdrawals set parttime_mb = 'MBM-' || substring(parttime_mb from 4) where parttime_mb ~ '^MB-\d';
update public.withdrawals set parttime_mb = 'MBT-' || substring(parttime_mb from 4) where parttime_mb ~ '^MS-\d';
update public.post_interests set parttime_mb = 'MBM-' || substring(parttime_mb from 4) where parttime_mb ~ '^MB-\d';
update public.post_interests set parttime_mb = 'MBT-' || substring(parttime_mb from 4) where parttime_mb ~ '^MS-\d';

commit;

-- ผลลัพธ์
select mb_code, first_name, docs->'extra'->>'group' as grp from public.applicants
where created_at >= '2026-10-20 00:00:00+07' order by created_at;
