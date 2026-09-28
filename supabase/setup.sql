-- ── HaMoo · Supabase setup (รันครั้งเดียวใน SQL Editor ของ Supabase) ──
-- 1) Storage buckets: แยกสาธารณะ/ส่วนตัว (แก้จุดอ่อน blob สาธารณะแบบที่เคยเจอ)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('posts', 'posts', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('jobs', 'jobs', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('kyc', 'kyc', false) on conflict do nothing;    -- ส่วนตัว: รูปบัตร
insert into storage.buckets (id, name, public) values ('slips', 'slips', false) on conflict do nothing; -- ส่วนตัว: สลิป

-- 2) RLS: realtime + แชทเข้าถึงได้เฉพาะสมาชิกในห้อง
alter table "ChatMessage" enable row level security;

create policy "chat_members_read" on "ChatMessage"
  for select using (
    auth.uid() is not null
    and exists (
      select 1 from "ChatRoom" r
      where r.id = "ChatMessage"."roomId"
        and (r."memberAId" = (select m.id from "Member" m where m."authUserId" = auth.uid()::text limit 1)
          or r."memberBId" = (select m.id from "Member" m where m."authUserId" = auth.uid()::text limit 1))
    )
  );

-- 3) Realtime: เปิดฟังการเปลี่ยนแปลงข้อความแชท (สำหรับ subscribe ฝั่ง client)
alter publication supabase_realtime add table "ChatMessage";
alter publication supabase_realtime add table "TrackingPoint";
alter publication supabase_realtime add table "Notification";

-- 4) KYC/สลิป: อ่านได้เฉพาะเจ้าของ + admin (service role ข้าม RLS อยู่แล้ว)
alter table "KycSubmission" enable row level security;
alter table "PaymentTransaction" enable row level security;
create policy "owner_read_kyc" on "KycSubmission" for select using (true); -- ปรับตาม role จริงภายหลัง
