// #26 นัดที่สปาพาร์ทเนอร์ → พอร์ทัลพาร์ทเนอร์เห็น · ยืนยันห้อง/ห้องเต็ม → แจ้งลูกค้า (โหมดเดโม · รันหลัง cancel-e2e)
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210', mb = 'MBM-2610001';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const C1 = { cookie: 'hamoo_session=' + sign({ sub: 'demo:spa@test.local', email: 'spa@test.local', exp: Date.now() + 3600e3 }), 'content-type': 'application/json' };
const T = (() => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600_000 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); })();
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const J = (r) => r.json();
(async () => {
  let r = await fetch(B + '/api/partner/apply', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ business_name: 'สปาทดสอบพอร์ทัล', type: 'สปา', province: 'กรุงเทพ', contact_name: 'คุณสปา', tel: '0812345678', email: 'spa-owner' + Date.now() + '@test.local', package: '3m', consent: true }) });
  let j = await J(r); ok('partner apply', j.ok, j.error);
  r = await fetch(B + '/api/partner/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: j.token, password: 'demo-test-' + crypto.randomBytes(6).toString('hex') }) }); ok('partner set password (demo)', (await J(r)).ok);
  const list = await J(await fetch(B + '/api/admin/partners', { headers: ADM }));
  const p = (list.rows || list.partners || list).find?.((x) => x.email.startsWith('spa-owner'));
  ok('partner found', !!p, JSON.stringify(Object.keys(list)).slice(0, 80));
  r = await fetch(B + `/api/admin/partners/${p.id}`, { method: 'PATCH', headers: ADM, body: JSON.stringify({ account_status: 'active', status: 'active', qc_status: 'passed' }) }); j = await J(r); ok('activate partner', j.ok, j.error);
  const PC = { cookie: 'mb_partner=' + sign({ k: 'ps', pid: p.id, exp: Date.now() + 3600e3 }), 'content-type': 'application/json' };
  // ลูกค้าเติมเงินแล้วจองที่สปานี้
  const fd = new FormData(); fd.set('amount', '20000'); fd.set('slip', new File([img], 's.jpg', { type: 'image/jpeg' }));
  await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { cookie: C1.cookie }, body: fd });
  const a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'approve', id: a.topups.find((x) => x.customer_email === 'spa@test.local' && x.status === 'pending').id }) });
  const pid = (/\/p\/(r[0-9a-f]{10})/.exec(await (await fetch(B + '/')).text()) || [])[1];
  const d = new Date(Date.now() + 12 * 86400e3); d.setHours(14, 0, 0, 0);
  r = await fetch(B + '/api/bookings', { method: 'POST', headers: C1, body: JSON.stringify({ pid, hours: 3, starts_at: d.toISOString(), place: { type: 'spa', spa_id: p.id }, note: '' }) }); j = await J(r); ok('book at partner spa', j.ok, j.error); const id = j.id;
  let t = await (await fetch(B + '/partner/portal/bookings', { headers: PC })).text(); ok('portal: not shown before accept', !t.includes('BK-') || !t.includes(j.code || 'zzz'));
  await fetch(B + `/api/pt/bookings/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, accept: true }) });
  const bk = (await J(await fetch(B + `/api/bookings/${id}`, { headers: C1 }))).booking;
  t = (await (await fetch(B + '/partner/portal/bookings', { headers: PC })).text()).replace(/<!-- -->/g, '');
  ok('portal shows booking after accept', t.includes(bk.code), bk.code);
  const pb = new RegExp('"booking_ref":"' + bk.code + '"[^}]*"id":"([0-9a-f-]{36})"').exec(t.replace(/\\"/g, '"'))?.[1];
  ok('partner booking id', !!pb);
  r = await fetch(B + `/api/partner/bookings/${pb}`, { method: 'PATCH', headers: PC, body: JSON.stringify({ action: 'full' }) }); ok('partner marks full', (await J(r)).ok);
  const n = await J(await fetch(B + '/api/notifications', { headers: C1 }));
  ok('customer notified spa full', JSON.stringify(n).includes('แจ้งห้องเต็ม'));
  // แอดมินคืนเงินเต็ม → พอร์ทัลเป็น "ยกเลิก"
  const cx = await J(await fetch(B + `/api/bookings/${id}/cancel`, { method: 'POST', headers: C1, body: JSON.stringify({ reason: 'ห้องเต็ม' }) }));
  // ยกเลิกล่วงหน้านาน = คืนเงินอัตโนมัติตามกติกา · ไม่งั้นแอดมินคืนเต็ม
  const auto = (await J(await fetch(B + `/api/bookings/${id}`, { headers: C1 }))).booking.status === 'refunded';
  if (!auto) { r = await fetch(B + '/api/admin/bookings', { method: 'POST', headers: ADM, body: JSON.stringify({ id, action: 'refund', refund_pct: 100, note: 'สปาเต็ม' }) }); }
  ok('refunded (auto rule or admin)', auto || (await J(r)).ok, JSON.stringify(cx).slice(0, 120));
  t = (await (await fetch(B + '/partner/portal/bookings', { headers: PC })).text()).replace(/\\"/g, '"');
  ok('portal row cancelled', new RegExp(`"booking_ref":"${bk.code}"[^}]*"status":"cancelled"`).test(t));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
