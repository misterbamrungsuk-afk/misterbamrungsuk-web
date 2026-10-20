-- เลขเอกสารรันต่อเนื่องต่อเดือน (เวลาไทย): INV-YYMM-NNNN ใบแจ้งหนี้ (ออกตอนสมัคร) · RI-YYMM-NNNN ใบเสร็จรับเงิน (ออกเมื่ออนุมัติสลิป)
-- รันใน Supabase SQL Editor (production) ก่อน deploy · รันซ้ำได้
create table if not exists public.doc_counters (
  prefix text primary key,
  last   integer not null default 0
);
alter table public.doc_counters enable row level security;

create or replace function public.next_doc_no(p_kind text) returns text
language plpgsql security definer set search_path = public as $$
declare
  p text;
  n integer;
begin
  if p_kind not in ('INV', 'RI') then raise exception 'bad kind %', p_kind; end if;
  p := p_kind || '-' || to_char(now() at time zone 'Asia/Bangkok', 'YYMM') || '-';
  insert into doc_counters (prefix, last) values (p, 1)
  on conflict (prefix) do update set last = doc_counters.last + 1
  returning last into n;
  return p || lpad(n::text, 4, '0');
end $$;

revoke all on function public.next_doc_no(text) from public, anon, authenticated;

-- ตรวจผล: ควรได้ INV-YYMM-0001 (เรียกจริงจะกินเลข 1 เลข — ถ้าไม่อยากเสียเลข ข้ามบรรทัดนี้)
-- select public.next_doc_no('INV');
