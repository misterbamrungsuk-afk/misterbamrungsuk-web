-- KYC (ขั้น 4/5) + บัญชีรับเงิน (5/5) + เช็กชื่ออบรม
-- รันใน Supabase SQL editor; ไฟล์เก็บใน bucket private "applicants" เดิม
-- ถ้ายังไม่รัน แอปจะเก็บค่าเหล่านี้ใน docs.extra แทน

alter table public.applicants add column if not exists kyc_status text not null default 'none';
do $$ begin
  alter table public.applicants add constraint applicants_kyc_status_check
    check (kyc_status in ('none', 'submitted', 'approved', 'rejected'));
exception when duplicate_object then null; end $$;
alter table public.applicants add column if not exists kyc_reason jsonb;          -- {"selfie": "รูปมืดเกินไป…"}
alter table public.applicants add column if not exists kyc_submitted_at timestamptz;
alter table public.applicants add column if not exists bank_book_path text;

create table if not exists public.cohort_attendance (
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  session      int not null,
  present      boolean not null default false,
  marked_at    timestamptz not null default now(),
  primary key (applicant_id, session)
);

-- server-only (service role ข้าม RLS) — ไม่มี policy = anon/auth อ่านเขียนไม่ได้
alter table public.cohort_attendance enable row level security;
