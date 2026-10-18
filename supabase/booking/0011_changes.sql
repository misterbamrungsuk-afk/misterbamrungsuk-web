-- 0011 · เปลี่ยนเวลานัด + ต่อเวลาระหว่างนัด (src/lib/bookings/changes.ts) — เพิ่มอย่างเดียว · รันซ้ำได้
-- reschedule: ลูกค้าขอเวลาใหม่ → เพื่อนรับ = bookings.starts_at เปลี่ยน (ไม่มีเงินเปลี่ยน)
-- extend: ระหว่างนัดลูกค้าขอ +1 ชม. → เพื่อนรับ = customer.available → platform.escrow (idem extend:<id>) + price/total/extra_hours ของนัดเพิ่ม

alter table public.bookings add column if not exists extra_hours int not null default 0 check (extra_hours between 0 and 6);

create table if not exists public.booking_changes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind text not null check (kind in ('reschedule', 'extend')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'failed')),
  old_starts_at timestamptz,
  new_starts_at timestamptz,
  hours int not null default 0,
  amount_satang bigint not null default 0 check (amount_satang >= 0),
  reason text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text
);
-- คำขอที่รอตอบได้ทีละ 1 ต่อการจอง
create unique index if not exists booking_changes_one_pending on public.booking_changes(booking_id) where status = 'pending';
create index if not exists booking_changes_booking on public.booking_changes(booking_id, created_at desc);
alter table public.booking_changes enable row level security;

-- กันนัดซ้อนเวลา: นับชั่วโมงที่ต่อแล้วด้วย (แทนฟังก์ชันเดิมใน wallet/0003_guards.sql)
create or replace function public.bookings_no_clash() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status in ('requested', 'accepted', 'checked_in')
     and (tg_op = 'INSERT' or old.status is distinct from new.status or old.starts_at is distinct from new.starts_at or old.hours is distinct from new.hours or old.extra_hours is distinct from new.extra_hours) then
    perform pg_advisory_xact_lock(hashtext('booking:' || new.parttime_id::text));
    if exists (
      select 1 from bookings b
      where b.parttime_id = new.parttime_id and b.id <> new.id and b.status in ('requested', 'accepted', 'checked_in')
        and b.starts_at < new.starts_at + make_interval(hours => greatest(new.hours + new.extra_hours, b.hours + b.extra_hours))
        and new.starts_at < b.starts_at + make_interval(hours => greatest(new.hours + new.extra_hours, b.hours + b.extra_hours))
    ) then
      raise exception 'booking clash';
    end if;
  end if;
  return new;
end $$;
