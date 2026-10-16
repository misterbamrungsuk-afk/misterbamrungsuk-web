-- Mister Bamrungsuk · รอบ 3 (ปิดงานค้าง #28) — รันหลัง 0002_atomic.sql · รันซ้ำได้
-- 1) rate_hit: นับครั้งกันเดารหัส/สแปมในฐานข้อมูล (ทุกเซิร์ฟเวอร์ของ Vercel เห็นตัวนับเดียวกัน)
-- 2) bookings_no_clash: Part-Time คนเดียวมีนัดซ้อนเวลาไม่ได้ (กันกดจองพร้อมกันเป๊ะ) — ตรวจตอนเข้าสถานะ requested/accepted/checked_in

create table if not exists public.rate_hits (
  key text primary key,             -- sha256 ของ key (ไม่เก็บอีเมล/IP ตรง ๆ)
  window_start timestamptz not null,
  hits int not null
);
alter table public.rate_hits enable row level security;

create or replace function public.rate_hit(p_key text, p_max int, p_window_s int) returns boolean
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into rate_hits(key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when rate_hits.window_start < now() - make_interval(secs => p_window_s) then 1 else rate_hits.hits + 1 end,
    window_start = case when rate_hits.window_start < now() - make_interval(secs => p_window_s) then now() else rate_hits.window_start end
  returning hits into v;
  return v > p_max;
end $$;
revoke all on function public.rate_hit(text, int, int) from public, anon, authenticated;

create or replace function public.rate_gc() returns int
language sql security definer set search_path = public as $$
  with d as (delete from rate_hits where window_start < now() - interval '1 day' returning 1) select count(*)::int from d;
$$;
revoke all on function public.rate_gc() from public, anon, authenticated;

create or replace function public.bookings_no_clash() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status in ('requested', 'accepted', 'checked_in')
     and (tg_op = 'INSERT' or old.status is distinct from new.status or old.starts_at is distinct from new.starts_at or old.hours is distinct from new.hours) then
    perform pg_advisory_xact_lock(hashtext('booking:' || new.parttime_id::text));
    if exists (
      select 1 from bookings b
      where b.parttime_id = new.parttime_id and b.id <> new.id and b.status in ('requested', 'accepted', 'checked_in')
        and b.starts_at < new.starts_at + make_interval(hours => greatest(new.hours, b.hours))
        and new.starts_at < b.starts_at + make_interval(hours => greatest(new.hours, b.hours))
    ) then
      raise exception 'booking clash';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists bookings_no_clash on public.bookings;
create trigger bookings_no_clash before insert or update on public.bookings for each row execute function public.bookings_no_clash();
