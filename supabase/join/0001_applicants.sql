-- Mister Bamrungsuk: ผู้สมัครหมอนวด / เพื่อนเที่ยว
-- รันใน Supabase SQL editor ครั้งเดียว แล้วสร้าง Storage bucket ชื่อ "applicants" แบบ Private
-- ฟิลด์บังคับตามชีต dev; ฟิลด์จาก Sheet3 (ที่อยู่ บัญชี ฯลฯ) เก็บตอนอบรม จึงว่างได้

create table if not exists public.applicants (
  id                   uuid primary key,
  mb_code              text not null unique,
  status               text not null default 'pending_slip'
                       check (status in ('pending_slip', 'verified', 'rejected', 'refunded')),
  package              text not null check (package in ('A', 'B')),
  amount               integer not null,
  payment_method       text not null check (payment_method in ('qr', 'transfer')),
  title                text not null default '',
  first_name           text not null,
  last_name            text not null,
  nickname             text not null,
  birthdate            date,
  weight               integer not null,
  height               integer not null,
  nationality          text not null default '',
  ethnicity            text not null default '',
  religion             text not null default '',
  education            text not null default '',
  marital              text not null default '',
  start_date           date,
  tel                  text not null,
  line_id              text not null default '',
  email                text not null default '',
  address              text not null default '',
  zipcode              text not null,
  bank                 text not null default '',
  bank_account         text not null default '',
  bank_account_name    text not null default '',
  experience           text not null,
  skills               text[] not null default '{}',
  intro                text not null default '',
  docs                 jsonb not null default '{}',   -- { photo, id_card, bankbook, other_doc, slip } → path ใน storage
  consent_version      text not null,             -- เวอร์ชันนโยบาย/ข้อกำหนดที่ยินยอม
  consented_at         timestamptz not null,
  consent_marketing    boolean not null default false,
  contract_accepted_at timestamptz,
  sheet_synced         boolean not null default false,
  ip                   text,
  created_at           timestamptz not null default now()
);

create index if not exists applicants_status_idx on public.applicants (status);

-- ปิดการเข้าถึงจาก anon/authenticated ทั้งหมด — เว็บเขียน/อ่านผ่าน service role ฝั่งเซิร์ฟเวอร์เท่านั้น
alter table public.applicants enable row level security;

-- ลำดับรหัส MB ต่อเดือน: MB-YYMMNNN (เวลาไทย)
create table if not exists public.mb_counters (
  prefix text primary key,
  last   integer not null default 0
);
alter table public.mb_counters enable row level security;

create or replace function public.next_mb_code() returns text
language plpgsql security definer set search_path = public as $$
declare
  p text := 'MB-' || to_char(now() at time zone 'Asia/Bangkok', 'YYMM');
  n integer;
begin
  insert into mb_counters (prefix, last) values (p, 1)
  on conflict (prefix) do update set last = mb_counters.last + 1
  returning last into n;
  return p || lpad(n::text, 3, '0');
end $$;

-- สร้างผู้สมัคร + ออกรหัส MB ใน transaction เดียว (กันรหัสซ้ำเมื่อสมัครพร้อมกัน)
create or replace function public.create_applicant(p jsonb) returns public.applicants
language plpgsql security definer set search_path = public as $$
declare
  r applicants;
begin
  insert into applicants (
    id, mb_code, package, amount, payment_method,
    title, first_name, last_name, nickname, birthdate, weight, height, nationality, ethnicity, religion,
    education, marital, start_date, tel, line_id, email, address, zipcode, bank, bank_account, bank_account_name,
    experience, skills, intro, docs, ip, consent_version, consented_at, consent_marketing
  ) values (
    (p->>'id')::uuid, next_mb_code(), p->>'package', (p->>'amount')::int, p->>'payment_method',
    p->>'title', p->>'first_name', p->>'last_name', p->>'nickname', (p->>'birthdate')::date,
    (p->>'weight')::int, (p->>'height')::int, p->>'nationality', p->>'ethnicity', p->>'religion',
    p->>'education', p->>'marital', (p->>'start_date')::date, p->>'tel', p->>'line_id', coalesce(p->>'email', ''),
    coalesce(p->>'address', ''), p->>'zipcode', coalesce(p->>'bank', ''), p->>'bank_account', p->>'bank_account_name',
    p->>'experience', coalesce(array(select jsonb_array_elements_text(p->'skills')), '{}'),
    coalesce(p->>'intro', ''), coalesce(p->'docs', '{}'::jsonb), p->>'ip',
    p->>'consent_version', (p->>'consented_at')::timestamptz, coalesce((p->>'consent_marketing')::boolean, false)
  ) returning * into r;
  return r;
end $$;

revoke all on function public.next_mb_code() from public, anon, authenticated;
revoke all on function public.create_applicant(jsonb) from public, anon, authenticated;
