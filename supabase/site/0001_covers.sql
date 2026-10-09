-- รูปหน้าปกเว็บ (สไลด์หน้าแรก / โปสเตอร์ /join / ปก /partner / ปก+แบนเนอร์ /market)
create table if not exists public.site_covers (
  id uuid primary key default gen_random_uuid(),
  slot text not null,
  position int not null default 0,
  path text not null,
  created_at timestamptz default now()
);
create index if not exists site_covers_slot_position_idx on public.site_covers (slot, position);
alter table public.site_covers enable row level security; -- server (service role) only, no policies

insert into storage.buckets (id, name, public) values ('covers', 'covers', true)
on conflict (id) do nothing;
