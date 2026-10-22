// หลังบ้านแอดมิน (QA รอบ 17 ต.ค.): cs เห็นแบนเนอร์ denied · ผู้ออกลิงก์ทุกคนอนุมัติ KYC ไม่ได้ · ปฏิเสธสลิปต้องมีเหตุผล
// · เตือนผู้ใช้ในแชท · หน้าจอซ่อนปุ่มตามบทบาท · ไม่มีบัญชีสาธิตฝังในโค้ด (โหมดเดโม)
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const B = 'http://localhost:3210', mb = 'MBM-2610001';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '');
const AKEY = KEY.length >= 32 ? KEY : 'mord-demo-only-admin-session-secret-not-for-production';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const b64 = (b) => Buffer.from(b).toString('base64url');
// โทเคนแอดมินแบบ _tok.js — กำหนดบทบาทและอีเมลเองได้
const tok = (role, email = `qa-${role}@local.test`) => { const p = b64(JSON.stringify({ email, role, exp: Date.now() + 3600e3 })); return p + '.' + b64(crypto.createHmac('sha256', AKEY).update(p).digest()); };
const H = (role, email) => ({ cookie: 'mord_admin=' + tok(role, email), 'content-type': 'application/json' });
const page = async (path, role, email) => (await (await fetch(B + path, { headers: H(role, email) })).text()).replace(/\\"/g, '"');
const patch = (id, role, body, email) => fetch(B + `/api/admin/applicants/${id}`, { method: 'PATCH', headers: H(role, email), body: JSON.stringify(body) });

(async () => {
  // ── homeFor('cs') = /admin/orders (ไม่ผ่าน /admin/cs ที่ทำ ?denied=1 หาย) ──
  let r = await fetch(B + '/admin/wallet', { headers: H('cs'), redirect: 'manual' });
  const loc = r.headers.get('location') || '';
  ok('cs denied → /admin/orders?denied=1', r.status >= 300 && r.status < 400 && /\/admin\/orders\?denied=1/.test(loc), r.status + ' ' + loc);
  r = await fetch(B + '/admin/cs?denied=1', { headers: H('cs'), redirect: 'manual' });
  ok('/admin/cs keeps query when redirecting', /\/admin\/orders\?denied=1/.test(r.headers.get('location') || ''), String(r.headers.get('location')));
  if (r.status >= 300 && r.status < 400) {
    const h = await page('/admin/orders?denied=1', 'cs');
    ok('cs sees denied banner', h.includes('บทบาทของคุณไม่มีสิทธิ์เข้าหน้านั้น'));
  }

  // ── หา id ผู้สมัครทดสอบ (แบบเดียวกับ 23-hardening) ──
  const list = await page('/admin/applicants', 'ceo');
  const at = list.indexOf('"mb_code":"' + mb + '"');
  const ids = [...list.slice(Math.max(0, at - 6000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)];
  const id = ids[ids.length - 1]?.[1];
  ok('found test applicant', !!id);

  // ── แยกหน้าที่ KYC: ทุกคนที่ออกลิงก์ใน 30 วัน อนุมัติไม่ได้ (ไม่ใช่แค่คนล่าสุด) · เทียบอีเมลตัวพิมพ์เล็ก ──
  const A = 'QA-Minter-A@Local.Test', Bm = 'qa-minter-b@local.test';
  r = await fetch(B + `/api/admin/applicants/${id}/link`, { method: 'POST', headers: H('super', A) }); ok('A mints link', r.status === 200, String(r.status));
  r = await fetch(B + `/api/admin/applicants/${id}/link`, { method: 'POST', headers: H('super', Bm) }); ok('B mints link (overwrites latest)', r.status === 200, String(r.status));
  r = await patch(id, 'super', { kyc_status: 'approved' }, A.toLowerCase());
  ok('earlier minter A still blocked from KYC approve', r.status === 403, String(r.status));
  r = await patch(id, 'super', { kyc_status: 'approved' }, Bm.toUpperCase());
  ok('latest minter B blocked (case-insensitive)', r.status === 403, String(r.status));
  r = await patch(id, 'kyc', { kyc_status: 'approved' }, 'qa-kyc-27@local.test');
  ok('non-minter KYC admin can approve', r.status === 200, String(r.status));
  r = await fetch(B + `/api/admin/applicants/${id}/link`, { method: 'DELETE', headers: H('kyc') });
  ok('kyc role cannot revoke/mint links', r.status === 401, String(r.status));
  r = await fetch(B + `/api/admin/applicants/${id}/link`, { method: 'DELETE', headers: H('super') });
  ok('super revokes all profile links', r.status === 200, String(r.status));

  // ── ปฏิเสธสลิปต้องมีเหตุผล ──
  r = await patch(id, 'finance', { status: 'rejected' });
  ok('slip reject without reason → 400', r.status === 400, String(r.status));
  r = await patch(id, 'finance', { status: 'rejected', reason: '   ' });
  ok('slip reject blank reason → 400', r.status === 400, String(r.status));
  r = await patch(id, 'finance', { status: 'rejected', reason: 'ยอดโอนขาด ฿500' });
  const rj = await r.json().catch(() => ({}));
  ok('slip reject with reason → 200', r.status === 200 && rj.row?.status === 'rejected', String(r.status));
  await patch(id, 'finance', { status: 'verified' }); // คืนสถานะให้ชุดทดสอบอื่น

  // ── หน้าจอตามบทบาท ──
  const fin = await page('/admin/applicants', 'finance');
  if (fin.includes('ตรวจเอกสาร')) ok('finance: no KYC decide buttons on applicants', fin.includes('ได้เฉพาะฝ่าย KYC') && !fin.includes('>อนุมัติเอกสาร<'));
  const sup = await page('/admin/applicants', 'super');
  if (sup.includes('ตรวจเอกสาร')) ok('super: KYC decide buttons shown', !sup.includes('ได้เฉพาะฝ่าย KYC'));
  const kq = await page('/admin/kyc', 'kyc');
  ok('kyc role: no "copy profile link" button', !kq.includes('คัดลอกลิงก์เข้าโปรไฟล์') && !kq.includes('คัดลอกข้อความแจ้งแก้ไข + ลิงก์'));
  const ov = await page('/admin', 'cs');
  ok('cs overview hides queues it cannot open', !ov.includes('href="/admin/kyc"') && !ov.includes('href="/admin/payouts"') && !ov.includes('href="/admin/slips"'));
  const ok2 = await page('/admin', 'kyc');
  ok('kyc overview shows KYC queue, not payroll', ok2.includes('href="/admin/kyc"') && !ok2.includes('href="/admin/payroll"'));

  // ── เตือนผู้ใช้ในแชท ──
  const chats = await page('/admin/chats', 'super');
  const bid = /\/admin\/chats\/([0-9a-f-]{36})/.exec(chats)?.[1];
  if (!bid) console.log('SKIP chat warning (ยังไม่มีห้องแชทในโหมดเดโม)');
  else {
    const W = (role, body) => fetch(B + '/api/admin/chats/warn', { method: 'POST', headers: H(role), body: JSON.stringify(body) });
    ok('warn: kyc role refused', (await W('kyc', { booking_id: bid, to: 'both', text: 'ทดสอบเตือน' })).status === 401);
    ok('warn: empty text → 400', (await W('cs', { booking_id: bid, to: 'both', text: '' })).status === 400);
    ok('warn: bad target → 400', (await W('cs', { booking_id: bid, to: 'everyone', text: 'ทดสอบเตือน' })).status === 400);
    ok('warn: unknown booking → 404', (await W('cs', { booking_id: '00000000-0000-0000-0000-000000000000', to: 'both', text: 'ทดสอบเตือน' })).status === 404);
    const text = 'ห้ามแลกเบอร์นอกแอป e2e-' + Date.now();
    r = await W('cs', { booking_id: bid, to: 'customer', text });
    ok('warn: cs sends system warning', r.status === 200, String(r.status));
    const tr = await page('/admin/chats/' + bid, 'cs');
    ok('warning shows in transcript as system message', tr.includes(text) && tr.includes('คำเตือนจากทีมงาน'));
  }

  // ── บัญชีสาธิต: ไม่ฝังรหัสในโค้ดฝั่งเบราว์เซอร์ · กล่องเดโมนับบทบาทถูก ──
  const ms = fs.readFileSync(WEB + '/src/components/mode-switch.tsx', 'utf8');
  ok('mode-switch has no demo credentials / auto-login', !/mord-demo|@mord\.demo|\/api\/admin\/login/.test(ms));
  const lg = await (await fetch(B + '/admin-login')).text();
  if (lg.includes('โหมดสาธิต')) ok('demo box lists 5 roles', lg.includes('บัญชีทดลอง 5 บทบาท') || lg.includes('บัญชีทดลอง <!-- -->5<!-- --> บทบาท'));

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
