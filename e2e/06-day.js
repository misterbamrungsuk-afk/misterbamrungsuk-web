// ช่วง 5: เช็กอิน → จบงาน + รีวิว + ทิป → แบ่งเงิน → ปล่อยเงิน → ถอน → รอบโอน → โอนแล้ว · ข้อพิพาท → แอดมินตัดสิน (โหมดเดโม · รันหลัง book-e2e)
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210', mb = 'MB-2610001';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const sess = (sub, email) => { const b = Buffer.from(JSON.stringify({ sub, email, exp: Date.now() + 3600e3 })).toString('base64url'); return 'hamoo_session=' + b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const C1 = { cookie: sess('demo:buyer@test.local', 'buyer@test.local'), 'content-type': 'application/json' };
const body = Buffer.from(JSON.stringify({ mb, exp: Date.now() + 3600_000 })).toString('base64url');
const T = body + '.' + crypto.createHmac('sha256', KEY).update('resume:' + body).digest('base64url');
const J = (r) => r.json();
const PT = (id, action) => fetch(B + `/api/pt/bookings/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, action }) });
const ptw = () => fetch(B + `/api/pt/wallet?mb=${mb}&t=${encodeURIComponent(T)}`).then(J);
(async () => {
  const h = await (await fetch(B + '/')).text();
  const pid = (/\/p\/(r[0-9a-f]{10})/.exec(h) || [])[1];
  const soon = new Date(Date.now() + 65 * 60_000).toISOString();
  let j = await J(await fetch(B + '/api/bookings', { method: 'POST', headers: C1, body: JSON.stringify({ pid, hours: 3, starts_at: soon, place: { type: 'cafe', detail: 'คาเฟ่ทดสอบ' }, note: '' }) }));
  ok('book soon', j.ok, j.error); const id = j.id;
  ok('checkin before accept refused', (await PT(id, 'checkin')).status === 409);
  await PT(id, 'accept');
  let r = await fetch(B + `/api/bookings/${id}/complete`, { method: 'POST', headers: C1, body: JSON.stringify({ rating: 5 }) }); ok('complete before start/checkin refused', r.status === 409);
  ok('pt checkin', (await J(await PT(id, 'checkin'))).ok);
  ok('pt done before start refused', (await PT(id, 'done')).status >= 400); // จบงานได้หลังเวลานัดเท่านั้น (ผลตรวจความปลอดภัย)
  const bk = (await J(await fetch(B + `/api/bookings/${id}`, { headers: C1 }))).booking;
  let w0 = await J(await fetch(B + '/api/wallet', { headers: C1 }));
  r = await fetch(B + `/api/bookings/${id}/complete`, { method: 'POST', headers: C1, body: JSON.stringify({ rating: 5, tags: ['ตรงเวลา'], again: 'yes', body: 'ดีมาก', tip: 200 }) });
  j = await J(r); ok('customer completes + tip', j.ok && j.status === 'completed', j.error);
  let w1 = await J(await fetch(B + '/api/wallet', { headers: C1 })); ok('tip deducted 200', w0.available - w1.available === 20000);
  let p = await ptw(); ok('pt pending = share + tip share', p.pending > 0 && p.available === 0, `${p.pending}`);
  r = await fetch(B + `/api/bookings/${id}/complete`, { method: 'POST', headers: C1, body: JSON.stringify({ rating: 5 }) }); ok('complete twice refused', r.status === 409);
  // ปล่อยเงินทันที (ตั้งค่า releaseHours=0) → ถอน
  let a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  r = await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'settings', money: { ...a.money, releaseHours: 0 }, note: 'ทดสอบ' }) }); ok('save money settings', (await J(r)).ok);
  r = await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'settings', money: { ...a.money, feePct: 99 } }) }); ok('invalid settings refused', r.status === 400);
  // ค่าเริ่มต้น = แอดมินอนุมัติ (releaseMode manual): อ่านแล้วยังไม่ปล่อยเอง → หน้า "รายได้ Part-Time" → กดอนุมัติ → เข้ากระเป๋า
  ok('default release mode = manual', a.money.releaseMode === 'manual');
  await fetch(B + `/api/pt/bookings?mb=${mb}&t=${encodeURIComponent(T)}`);
  p = await ptw(); ok('manual mode: still pending (no auto release)', p.pending > 0 && p.available === 0);
  let t = await (await fetch(B + '/admin/payroll', { headers: ADM })).text(); ok('payroll lists pt waiting', t.includes(mb) && t.includes('รออนุมัติ') && !t.includes('ข้อมูลตัวอย่าง 1 คน'));
  ok('payroll needs admin', (await fetch(B + '/api/admin/payroll', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ all: true }) })).status === 401);
  j = await J(await fetch(B + '/api/admin/payroll', { method: 'POST', headers: ADM, body: JSON.stringify({ all: true }) })); ok('approve earnings', j.ok && j.count >= 1 && j.amount > 0, JSON.stringify(j));
  j = await J(await fetch(B + '/api/admin/payroll', { method: 'POST', headers: ADM, body: JSON.stringify({ all: true }) })); ok('approve twice = nothing', j.ok && j.count === 0);
  p = await ptw(); ok('matured → available', p.available > 0 && p.pending === 0, `${p.available}`);
  // โหมดอัตโนมัติยังใช้ได้ (สำหรับการทดสอบถัดไป)
  r = await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'settings', money: { ...a.money, releaseHours: 0, releaseMode: 'auto' }, note: 'ทดสอบ auto' }) }); ok('switch to auto release', (await J(r)).ok);
  r = await fetch(B + '/api/pt/wallet', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, amount: 100 }) }); ok('below min refused', r.status === 400);
  const avail = Math.floor(p.available / 100);
  r = await fetch(B + '/api/pt/wallet', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, amount: avail + 1 }) }); ok('over balance refused', r.status === 400);
  r = await fetch(B + '/api/pt/wallet', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, amount: avail }) }); j = await J(r); ok('withdraw request', j.ok, j.error);
  r = await fetch(B + '/api/pt/wallet', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, amount: 0 }) });
  p = await ptw(); ok('withdrawing bucket', p.withdrawing === avail * 100 && p.withdrawals[0].net_satang === avail * 100 * 0.94, `${p.withdrawals[0].net_satang}`);
  j = await J(await fetch(B + '/api/admin/withdrawals', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'batch' }) })); ok('batch', j.ok && j.rows.length === 1, j.batch);
  r = await fetch(B + `/api/admin/withdrawals?csv=${j.batch}`, { headers: ADM }); let csv = await r.text(); ok('bulk csv', csv.includes(mb) && csv.includes('กสิกรไทย'));
  r = await fetch(B + '/api/admin/withdrawals', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'paid', id: j.rows[0].id }) }); ok('mark paid', (await J(r)).ok);
  r = await fetch(B + '/api/admin/withdrawals', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'paid', id: j.rows[0].id }) }); ok('paid twice refused', r.status === 409);
  p = await ptw(); ok('withdrawing cleared', p.withdrawing === 0);
  // ข้อพิพาท → แอดมินคืน 50%
  j = await J(await fetch(B + '/api/bookings', { method: 'POST', headers: C1, body: JSON.stringify({ pid, hours: 3, starts_at: new Date(Date.now() + 4 * 86400_000).toISOString(), place: { type: 'mall', detail: 'ห้าง' }, note: '' }) })); const id2 = j.id;
  await PT(id2, 'accept');
  r = await fetch(B + `/api/bookings/${id2}/dispute`, { method: 'POST', headers: C1, body: JSON.stringify({ topic: 'ไม่มาตามนัด', text: 'รอ 30 นาทีไม่มา' }) }); ok('dispute', (await J(r)).status === 'disputed');
  r = await fetch(B + '/api/admin/bookings', { method: 'POST', headers: ADM, body: JSON.stringify({ id: id2, action: 'refund', refund_pct: 50 }) }); ok('resolve needs note', r.status === 400);
  w0 = await J(await fetch(B + '/api/wallet', { headers: C1 }));
  const total2 = (await J(await fetch(B + `/api/bookings/${id2}`, { headers: C1 }))).booking.total_satang;
  r = await fetch(B + '/api/admin/bookings', { method: 'POST', headers: ADM, body: JSON.stringify({ id: id2, action: 'refund', refund_pct: 50, note: 'ไม่มาตามนัดบางส่วน' }) }); ok('resolve 50%', (await J(r)).ok);
  w1 = await J(await fetch(B + '/api/wallet', { headers: C1 })); ok('customer got 50% back', w1.available - w0.available === Math.round(total2 / 2), `${w1.available - w0.available}`);
  j = await J(await fetch(B + '/api/admin/bookings', { headers: ADM })); ok('admin bookings list', j.bookings.length >= 5);
  a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM })); ok('ledger sums to 0', a.sum === 0, a.sum);
  ok('platform revenue > 0 & wht_payable > 0', (a.accounts.find((x) => x.owner_type === 'platform' && x.bucket === 'revenue')?.balance ?? 0) > 0 && (a.accounts.find((x) => x.bucket === 'wht_payable')?.balance ?? 0) > 0);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
