// #23 กติกายกเลิกอัตโนมัติ + #24 กระทบยอด + #21 ใบเสร็จถอน (โหมดเดโม · รันหลัง acct-e2e)
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210', mb = 'MB-2610001';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const env = (k) => (new RegExp('^' + k + '=(.*)$', 'm').exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '');
const KEY = env('ADMIN_SESSION_SECRET') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const sess = (sub, email) => { const b = Buffer.from(JSON.stringify({ sub, email, exp: Date.now() + 3600e3 })).toString('base64url'); return 'hamoo_session=' + b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const C1 = { cookie: sess('demo:canceller@test.local', 'canceller@test.local'), 'content-type': 'application/json' };
const body = Buffer.from(JSON.stringify({ mb, exp: Date.now() + 3600_000 })).toString('base64url');
const T = body + '.' + crypto.createHmac('sha256', KEY).update('resume:' + body).digest('base64url');
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const J = (r) => r.json();
const CRON = { authorization: 'Bearer ' + env('CRON_SECRET') };
(async () => {
  const h = await (await fetch(B + '/')).text();
  const pid = (/\/p\/(r[0-9a-f]{10})/.exec(h) || [])[1];
  let j = await J(await fetch(B + '/api/cron/money', { headers: CRON })); ok('recon ok before', j.ok && j.recon.ok, JSON.stringify(j.recon?.issues));
  let a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  let r = await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'settings', money: { ...a.money, autoCancel: true, cancelFullHours: 3, cancelLatePct: 50 }, note: 'ทดสอบยกเลิก' }) }); ok('enable auto cancel', (await J(r)).ok);
  r = await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'settings', money: { ...a.money, autoCancel: true, cancelLatePct: 150 } }) }); ok('bad pct refused', r.status === 400);
  const fd = new FormData(); fd.set('amount', '20000'); fd.set('slip', new File([img], 's.jpg', { type: 'image/jpeg' }));
  await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { cookie: C1.cookie }, body: fd });
  a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  const tp = a.topups.find((x) => x.customer_email === 'canceller@test.local' && x.status === 'pending');
  await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'approve', id: tp.id }) });
  const mk = async (ms) => { const d = new Date(Date.now() + ms); d.setMinutes(0, 0, 0); const x = await J(await fetch(B + '/api/bookings', { method: 'POST', headers: C1, body: JSON.stringify({ pid, hours: 3, starts_at: d.toISOString(), place: { type: 'cafe', detail: 'คาเฟ่ ทดสอบ' }, note: '' }) })); if (x.ok) await fetch(B + `/api/pt/bookings/${x.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, accept: true }) }); return x; };
  const early = await mk(9 * 86400e3); ok('book early', early.ok, early.error);
  const late = await mk(26 * 3600e3 + 2 * 3600e3 - 26 * 3600e3 + 3600e3 * 2); ok('book late (~3-4h)', late.ok, late.error);
  j = await J(await fetch(B + `/api/bookings/${early.id}`, { headers: C1 })); ok('preview early 100%', j.booking.cancel_refund_pct === 100);
  j = await J(await fetch(B + `/api/bookings/${late.id}`, { headers: C1 })); const lateRefund = j.booking.cancel_refund_pct; ok('preview late', lateRefund === 50 || lateRefund === 100, String(lateRefund));
  let w0 = await J(await fetch(B + '/api/wallet', { headers: C1 }));
  r = await fetch(B + `/api/bookings/${early.id}/cancel`, { method: 'POST', headers: C1, body: JSON.stringify({ reason: 'ติดงาน' }) }); j = await J(r); ok('early cancel refunded', j.ok && j.status === 'refunded', j.status || j.error);
  let w1 = await J(await fetch(B + '/api/wallet', { headers: C1 })); ok('full refund in wallet', w1.available > w0.available, `${w0.available}→${w1.available}`);
  if (late.ok) {
    j = await J(await fetch(B + `/api/bookings/${late.id}`, { headers: C1 })); const tot = j.booking.total_satang;
    r = await fetch(B + `/api/bookings/${late.id}/cancel`, { method: 'POST', headers: C1, body: JSON.stringify({ reason: '' }) }); j = await J(r);
    const w2 = await J(await fetch(B + '/api/wallet', { headers: C1 }));
    ok('late cancel refund by pct', j.ok && w2.available - w1.available === Math.round(tot * lateRefund / 100), `${j.status} +${w2.available - w1.available}/${tot}`);
  }
  j = await J(await fetch(B + '/api/cron/money', { headers: CRON })); ok('recon ok after', j.recon.ok, JSON.stringify(j.recon.issues));
  r = await fetch(B + '/api/cron/money'); ok('cron needs secret', r.status === 401);
  let t = await (await fetch(B + '/admin/wallet', { headers: ADM })).text(); ok('admin shows recon + toggle', t.includes('กระทบยอดตรง') && t.includes('ยกเลิกอัตโนมัติตามกติกา'));
  t = await (await fetch(B + '/page/terms', { headers: C1 })).text(); ok('terms shows rule', t.replace(/<!-- -->/g, '').includes('คืนเต็ม 100%'));
  // ปิดกลับ = แอดมินตัดสิน
  a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'settings', money: { ...a.money, autoCancel: false }, note: 'ปิด' }) });
  const third = await mk(10 * 86400e3);
  r = await fetch(B + `/api/bookings/${third.id}/cancel`, { method: 'POST', headers: C1, body: JSON.stringify({ reason: '' }) }); j = await J(r); ok('auto off → cancel_requested', j.status === 'cancel_requested', j.status);
  // คืน 50% (ตั้งคืนเต็มต้อง ≥ 999 ชม.) → ส่วนที่เหลือแบ่ง PT/บริษัท
  a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'settings', money: { ...a.money, autoCancel: true, cancelFullHours: 168, cancelLatePct: 50 }, note: 'ทดสอบ 50' }) });
  const half = await mk(11 * 86400e3 - 9 * 86400e3);
  const wa = await J(await fetch(B + '/api/wallet', { headers: C1 }));
  j = await J(await fetch(B + `/api/bookings/${half.id}`, { headers: C1 })); const tot2 = j.booking.total_satang; ok('preview 50%', j.booking.cancel_refund_pct === 50);
  r = await fetch(B + `/api/bookings/${half.id}/cancel`, { method: 'POST', headers: C1, body: JSON.stringify({ reason: '' }) }); j = await J(r);
  const wb = await J(await fetch(B + '/api/wallet', { headers: C1 }));
  ok('50% refund + rest split', j.status === 'completed' && wb.available - wa.available === Math.round(tot2 / 2), `${j.status} +${wb.available - wa.available}/${tot2}`);
  t = (await (await fetch(B + `/order/${half.id}`, { headers: C1 })).text()); ok('order page 200', t.length > 0);
  j = await J(await fetch(B + '/api/cron/money', { headers: CRON })); ok('recon ok after split', j.recon.ok, JSON.stringify(j.recon.issues));
  await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'settings', money: { ...a.money, autoCancel: false }, note: 'ปิด' }) });
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
