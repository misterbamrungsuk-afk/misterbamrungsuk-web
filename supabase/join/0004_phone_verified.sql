-- ผู้สมัคร: เวลาที่ยืนยันเบอร์โทรด้วย OTP (รันหลัง 0003)
-- โค้ดทนได้ถ้ายังไม่รัน: phone_verified_at ถูกแพ็กไว้ใน docs->'extra' ด้วยเสมอ

alter table public.applicants add column if not exists phone_verified_at timestamptz;

update public.applicants set phone_verified_at = (docs->'extra'->>'phone_verified_at')::timestamptz
where phone_verified_at is null and docs->'extra' ? 'phone_verified_at';

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
    activities, massage_cert, availability, ack_hours, ack_no_refuse, phone_verified_at
  ) values (
    (p->>'id')::uuid, next_mb_code(), p->>'package', (p->>'amount')::int, p->>'payment_method',
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
    (p->>'phone_verified_at')::timestamptz
  ) returning * into r;
  return r;
end $$;

revoke all on function public.create_applicant(jsonb) from public, anon, authenticated;
