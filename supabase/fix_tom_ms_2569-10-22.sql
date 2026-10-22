-- แก้ทอมหล่อที่ได้รหัส MB → MS + ลบผู้สมัครทดสอบ MB-2610001/002 (22 ต.ค. 2569)
-- รันใน Supabase SQL Editor (production) ทั้งไฟล์ครั้งเดียว · รันซ้ำได้ (ไม่มีอะไรให้แก้แล้วก็ไม่เปลี่ยนอะไร)

-- 0) ดูก่อน: ทอมหล่อที่รหัสยังเป็น MB + รายการทดสอบที่จะลบ
select mb_code, first_name, last_name, docs->'extra'->>'group' as grp, created_at from public.applicants
where (docs->'extra'->>'group' = 'tom' and mb_code like 'MB-%') or mb_code in ('MB-2610001', 'MB-2610002')
order by created_at;

-- A) ติดตั้งฟังก์ชันรหัส MS ใหม่ (เนื้อหาเดียวกับ join/0011_ms_codes.sql — กันกรณีที่ยังไม่ถูกใช้บนฐานจริง)
create or replace function public.next_brand_code(p_brand text) returns text
language plpgsql security definer set search_path = public as $$
declare
  p text;
  n integer;
begin
  if p_brand not in ('MB', 'MS') then raise exception 'bad brand %', p_brand; end if;
  p := p_brand || '-' || to_char(now() at time zone 'Asia/Bangkok', 'YYMM');
  insert into mb_counters (prefix, last) values (p, 1)
  on conflict (prefix) do update set last = mb_counters.last + 1
  returning last into n;
  return p || lpad(n::text, 3, '0');
end $$;
revoke all on function public.next_brand_code(text) from public, anon, authenticated;

-- สร้างผู้สมัคร: p->>'mb_brand' = 'MS' สำหรับทอมหล่อ (ไม่ส่ง = MB เหมือนเดิม)
create or replace function public.create_applicant(p jsonb) returns public.applicants
language plpgsql security definer set search_path = public as $$
declare
  r applicants;
begin
  insert into applicants (
    id, mb_code, package, amount, payment_method,
    title, first_name, last_name, nickname, birthdate, weight, height, nationality, ethnicity, religion,
    education, marital, start_date, tel, line_id, email, address, zipcode, bank, bank_account, bank_account_name,
    experience, skills, intro, docs, ip, consent_version, consented_at, consent_marketing, consent_criminal,
    activities, massage_cert, availability, ack_hours, ack_no_refuse, phone_verified_at, talents
  ) values (
    (p->>'id')::uuid, next_brand_code(coalesce(nullif(p->>'mb_brand', ''), 'MB')), p->>'package', (p->>'amount')::int, p->>'payment_method',
    p->>'title', p->>'first_name', p->>'last_name', p->>'nickname', (p->>'birthdate')::date,
    (p->>'weight')::int, (p->>'height')::int, p->>'nationality', p->>'ethnicity', p->>'religion',
    p->>'education', p->>'marital', (p->>'start_date')::date, p->>'tel', p->>'line_id', coalesce(p->>'email', ''),
    coalesce(p->>'address', ''), p->>'zipcode', coalesce(p->>'bank', ''), p->>'bank_account', p->>'bank_account_name',
    p->>'experience', coalesce(array(select jsonb_array_elements_text(p->'skills')), '{}'),
    coalesce(p->>'intro', ''), coalesce(p->'docs', '{}'::jsonb), p->>'ip',
    p->>'consent_version', (p->>'consented_at')::timestamptz, coalesce((p->>'consent_marketing')::boolean, false),
    coalesce((p->>'consent_criminal')::boolean, false),
    coalesce(array(select jsonb_array_elements_text(p->'activities')), '{}'),
    (p->>'massage_cert')::boolean,
    p->'availability',
    coalesce((p->>'ack_hours')::boolean, false),
    coalesce((p->>'ack_no_refuse')::boolean, false),
    (p->>'phone_verified_at')::timestamptz,
    coalesce(array(select jsonb_array_elements_text(p->'talents')), '{}')
  ) returning * into r;
  return r;
end $$;

revoke all on function public.create_applicant(jsonb) from public, anon, authenticated;

begin;

-- B) ลบผู้สมัครทดสอบ MB-2610001 / MB-2610002 (เอกสาร KYC ลบตามอัตโนมัติ)
create temp table _pt_test on commit drop as select id from public.applicants where mb_code in ('MB-2610001', 'MB-2610002');
create temp table _pt_test_keep as select id from _pt_test; -- ไว้แสดงโฟลเดอร์ Storage หลัง commit
delete from public.notifications where user_type = 'parttime' and user_id in (select id::text from _pt_test);
delete from public.applicants where id in (select id from _pt_test);

-- C) ทอมหล่อที่ได้ MB → ออกรหัส MS ใหม่ตามลำดับวันสมัคร (MS-2610001, 002, …)
do $$
declare r record;
begin
  for r in select id from public.applicants where docs->'extra'->>'group' = 'tom' and mb_code like 'MB-%' order by created_at loop
    update public.applicants set mb_code = next_brand_code('MS') where id = r.id;
  end loop;
end $$;

-- D) รีเซ็ตเลข MB ของเดือนนี้ = เลขสูงสุดที่เหลือจริง (หนุ่มหล่อคนแรกจริงจะได้ MB-2610001)
update public.mb_counters c
set last = coalesce((select max(substring(mb_code from '\d{3}$')::int) from public.applicants where mb_code like c.prefix || '%'), 0)
where c.prefix = 'MB-' || to_char(now() at time zone 'Asia/Bangkok', 'YYMM');

commit;

-- ตรวจผล
select mb_code, first_name, last_name, docs->'extra'->>'group' as grp from public.applicants
where created_at >= '2026-10-20 00:00:00+07' order by created_at;
select prefix, last from public.mb_counters where prefix like '%-' || to_char(now() at time zone 'Asia/Bangkok', 'YYMM');
-- โฟลเดอร์ที่ลบเองใน Storage → ถัง applicants / โฟลเดอร์ = id ด้านล่าง
select 'applicants' as bucket, id::text as folder from _pt_test_keep;
