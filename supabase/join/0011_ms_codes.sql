-- รหัสสาวหล่อแยกจากหนุ่มหล่อ (21 ต.ค. 2569): หนุ่มหล่อ MB-YYMMNNN · สาวหล่อ MS-YYMMNNN นับเลขแยกกัน
-- รันใน Supabase SQL Editor (production) · รันซ้ำได้ · ใช้ตาราง mb_counters เดิม (prefix คนละตัว)
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

-- สร้างผู้สมัคร: p->>'mb_brand' = 'MS' สำหรับสาวหล่อ (ไม่ส่ง = MB เหมือนเดิม)
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
