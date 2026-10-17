// บอร์ดลูกค้าที่เหลือ: C-Report (+บล็อก) · C-Addresses · C-Reviews · C-InSession · C-Receipt (+ขอใบกำกับภาษี) · C-Filter
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210', mb = 'MB-2610001';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json();
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const C = { cookie: 'hamoo_session=' + sign({ sub: 'demo:extras@test.local', email: 'extras@test.local', exp: Date.now() + 3600e3 }), 'content-type': 'application/json' };
const T = (() => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600e3 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); })();
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const me = (body) => fetch(B + '/api/me', { method: 'POST', headers: C, body: JSON.stringify(body) }).then(J);
(async () => {
  const pid = (/\/p\/(r[0-9a-f]{10})/.exec(await (await fetch(B + '/')).text()) || [])[1];
  // เงิน + นัด (ตอบรับแล้ว) สำหรับใบเสร็จ/หน้าระหว่างนัด
  const fd = new FormData(); fd.set('amount', '20000'); fd.set('slip', new File([img], 's.jpg', { type: 'image/jpeg' }));
  await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { cookie: C.cookie }, body: fd });
  const a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'approve', id: a.topups.find((x) => x.customer_email === 'extras@test.local' && x.status === 'pending').id }) });
  const d = new Date(Date.now() + 25 * 86400e3); d.setHours(15, 0, 0, 0);
  let j = await J(await fetch(B + '/api/bookings', { method: 'POST', headers: C, body: JSON.stringify({ pid, hours: 3, starts_at: d.toISOString(), place: { type: 'cafe', detail: 'คาเฟ่' }, note: '' }) }));
  ok('booking', j.ok, j.error); const bid = j.id;
  await fetch(B + `/api/pt/bookings/${bid}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, accept: true }) });
  // ขอใบกำกับภาษีได้เฉพาะนัดที่จบแล้ว → เลื่อนเวลานัดย้อนหลัง (โหมดสาธิต) · เช็กอิน · ลูกค้าจบนัด
  await fetch(B + '/api/admin/bookings', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'demo_shift', id: bid, minutes: 25 * 1440 + 240 }) });
  await fetch(B + `/api/pt/bookings/${bid}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, action: 'checkin' }) });
  ok('complete for invoice', (await J(await fetch(B + `/api/bookings/${bid}/complete`, { method: 'POST', headers: C, body: JSON.stringify({ rating: 5 }) }))).ok);
  // C-Receipt
  let r = await fetch(B + `/order/${bid}/receipt`, { headers: C }); let t = (await r.text()).replace(/<!-- -->/g, '');
  ok('receipt page', r.status === 200 && t.includes('ใบเสร็จรับเงิน') && t.includes('RC-'));
  r = await fetch(B + `/api/bookings/${bid}/invoice`, { method: 'POST', headers: C, body: JSON.stringify({ kind: 'person', name: 'ทดสอบ', tax_id: '123', address: 'กทม', email: 'a@b.co' }) }); ok('invoice bad tax id', r.status === 400);
  r = await fetch(B + `/api/bookings/${bid}/invoice`, { method: 'POST', headers: C, body: JSON.stringify({ kind: 'corp', name: 'บจก. ทดสอบ', tax_id: '0105561234560', branch: 'สำนักงานใหญ่', address: 'กทม 10110', email: 'tax@test.local' }) }); ok('invoice request', (await J(r)).ok);
  j = await J(await fetch(B + '/api/admin/alerts', { headers: ADM })); ok('admin gets tax invoice alert', j.items.some((n) => n.kind === 'tax_invoice'));
  // C-InSession
  r = await fetch(B + `/order/${bid}/session`, { headers: C }); ok('session page', r.status === 200);
  // C-Reviews
  r = await fetch(B + `/p/${pid}/reviews`); t = await r.text(); ok('reviews page', r.status === 200 && t.includes('รีวิวของ'));
  ok('reviews bad id 404', (await fetch(B + '/p/xyz/reviews')).status === 404);
  // C-Addresses
  j = await me({ addresses: [{ label: 'คอนโด', detail: 'สุขุมวิท 21', note: 'ตึก B' }, { label: 'ออฟฟิศ', detail: 'สีลม', note: '', primary: true }] });
  ok('save addresses (one primary)', j.ok && j.profile.addresses.length === 2 && j.profile.addresses.filter((x) => x.primary).length === 1);
  j = await me({ addresses: [{ label: 'x', detail: 'โทร 0812345678', note: '' }] }); ok('contact in address refused', !j.ok);
  t = await (await fetch(B + `/book/${pid}`, { headers: C })).text(); ok('booking shows saved addresses', t.includes('คอนโด') && t.includes('ออฟฟิศ'));
  // C-Report + บล็อก
  r = await fetch(B + '/api/report', { method: 'POST', headers: C, body: JSON.stringify({ booking_id: bid, reason: 'ไม่ใช่เหตุผล' }) }); ok('bad reason refused', r.status === 400);
  ok('report needs login', (await fetch(B + '/api/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status === 401);
  j = await J(await fetch(B + '/api/report', { method: 'POST', headers: C, body: JSON.stringify({ booking_id: bid, reason: 'ขอติดต่อ / จ่ายเงินนอกแอป', detail: 'ขอไลน์ในแชท', block: true }) }));
  ok('report + block', j.ok && /^RP-/.test(j.code));
  j = await J(await fetch(B + '/api/admin/alerts', { headers: ADM })); ok('admin gets report alert', j.items.some((n) => n.kind === 'report'));
  t = await (await fetch(B + '/admin/reports', { headers: ADM })).text(); ok('admin reports page', t.includes('ขอติดต่อ / จ่ายเงินนอกแอป'));
  t = await (await fetch(B + '/', { headers: C })).text(); ok('blocked hidden on home', !t.includes(`/p/${pid}`));
  t = await (await fetch(B + '/search', { headers: C })).text(); ok('blocked hidden in search', !t.includes(`/p/${pid}`));
  r = await fetch(B + '/api/bookings', { method: 'POST', headers: C, body: JSON.stringify({ pid, hours: 3, starts_at: new Date(Date.now() + 30 * 86400e3).toISOString(), place: { type: 'cafe', detail: 'x' }, note: '' }) }); ok('booking blocked pt refused', r.status === 403);
  t = await (await fetch(B + '/profile/blocked', { headers: C })).text(); ok('blocked list page', t.includes('ยกเลิกบล็อก'));
  j = await me({ block: pid, on: false }); ok('unblock', j.ok && !j.profile.blocked.includes(pid));
  t = await (await fetch(B + '/', { headers: C })).text(); ok('visible again after unblock', t.includes(`/p/${pid}`));
  ok('other visitors unaffected', (await (await fetch(B + '/')).text()).includes(`/p/${pid}`));
  // C-Filter
  t = await (await fetch(B + '/search', { headers: C })).text(); ok('search page with filter', t.includes('ตัวกรอง'));
  for (const p of ['/report?booking=' + bid, '/profile/addresses']) { r = await fetch(B + p, { headers: C }); ok('page ' + p.split('?')[0], r.status === 200); }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
