-- ลบผู้สมัคร Part-Time ทดสอบที่สมัครก่อนเปิดรับจริง (ก่อน 20 ต.ค. 2569 00:00 เวลาไทย) — ให้ผู้สมัครจริงคนแรกได้ MB-2610001
-- รันใน Supabase SQL Editor (production) ก่อนเปิดรับสมัคร 20 ต.ค. · ถ้ามีผู้สมัครจริงเข้ามาแล้ว ห้ามรัน

-- 0) ดูก่อนว่าจะลบใคร (ควรเห็นเฉพาะรายการทดสอบ)
select mb_code, first_name, last_name, tel, status, created_at from public.applicants
where created_at < '2026-10-20 00:00:00+07' order by created_at;

begin;

-- 1) โฟลเดอร์ไฟล์ที่ต้องลบเองใน Storage (ถัง applicants / โฟลเดอร์ = id) — SQL ลบไฟล์ไม่ได้
create temp table _pt_test as select id from public.applicants where created_at < '2026-10-20 00:00:00+07';

-- 2) แจ้งเตือน + ผู้สมัครทดสอบ (การเช็กชื่อกลุ่มอบรมลบตามอัตโนมัติ)
delete from public.notifications where user_type = 'parttime' and user_id in (select id::text from _pt_test);
delete from public.applicants where id in (select id from _pt_test);

-- 3) รีเซ็ตเลขรหัส MB ของเดือนนี้
update public.mb_counters c
set last = coalesce((select max(substring(mb_code from '\d{3}$')::int) from public.applicants where mb_code like c.prefix || '%'), 0)
where c.prefix = 'MB-' || to_char(now() at time zone 'Asia/Bangkok', 'YYMM');

commit;

-- โฟลเดอร์ที่ต้องลบใน Storage → applicants/<id>
select 'applicants' as bucket, id::text as folder from _pt_test;

-- ตรวจผล: ควรได้ 0 และเลขล่าสุดของเดือน = 0
select count(*) as test_left from public.applicants where created_at < '2026-10-20 00:00:00+07';
select prefix, last from public.mb_counters where prefix = 'MB-' || to_char(now() at time zone 'Asia/Bangkok', 'YYMM');
