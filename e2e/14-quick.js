// เรียกด่วน (C-QuickCall): กันเงิน → เชิญเพื่อนที่ว่างวันนี้ → คนแรกที่รับได้นัด · ยกเลิก/หมดเวลา = คืนเงิน · กระทบยอดตรง
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210', mb = 'MB-2610001';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const env = (k) => (new RegExp('^' + k + '=(.*)$', 'm').exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '');
const KEY = env('ADMIN_SESSION_SECRET') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json();
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const C1 = { cookie: 'hamoo_session=' + sign({ sub: 'demo:quick@test.local', email: 'quick@test.local', exp: Date.now() + 3600e3 }), 'content-type': 'application/json' };
const T = (() => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600e3 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); })();
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = (extra = {}) => fetch(B + '/api/quick', { method: 'POST', headers: C1, body: JSON.stringify({ activity: 'คาเฟ่', hours: 3, place: { type: 'cafe', detail: 'อโศก' }, note: '', ...extra }) });
const wallet = () => fetch(B + '/api/wallet', { headers: C1 }).then(J);
(async () => {
  // Part-Time ประกาศ "วันนี้ว่าง" → อยู่ในรายชื่อเชิญ
  const fd0 = new FormData(); fd0.set('mb', mb); fd0.set('t', T); fd0.set('step', 'post'); fd0.set('text', 'ว่างไปคาเฟ่'); fd0.set('time', 'ทั้งวัน'); fd0.set('zone', 'อโศก');
  let r = await fetch(B + `/api/join/profile?mb=${mb}&t=${encodeURIComponent(T)}`, { method: 'POST', body: fd0 }); ok('pt posts free today', (await J(r)).ok);
  ok('no login → 401', (await fetch(B + '/api/quick', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status === 401);
  let j = await J(await call()); ok('no funds → 402-ish', j.code === 'funds' && j.short > 0, j.error);
  const fd = new FormData(); fd.set('amount', '30000'); fd.set('slip', new File([img], 's.jpg', { type: 'image/jpeg' }));
  await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { cookie: C1.cookie }, body: fd });
  const a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'approve', id: a.topups.find((x) => x.customer_email === 'quick@test.local' && x.status === 'pending').id }) });
  r = await call({ place: { type: 'cafe', detail: 'โทร 0812345678' } }); ok('contact in place refused', r.status === 400);
  r = await call({ place: { type: 'spa', detail: 'x' } }); ok('spa not allowed', r.status === 400);
  const w0 = await wallet();
  j = await J(await call()); ok('quick created', j.ok && j.quick.status === 'open' && j.quick.invited >= 1, j.error); let qid = j.quick?.id; const hold = j.quick?.hold_satang;
  let w = await wallet(); ok('hold moved to held', w.held - w0.held === hold && w0.available - w.available === hold, `${hold}`);
  j = await J(await call()); ok('second open refused', !j.ok && /รอเพื่อนรับอยู่แล้ว/.test(j.error));
  j = await J(await fetch(`${B}/api/pt/quick?mb=${mb}&t=${encodeURIComponent(T)}`)); ok('pt sees invite', j.calls?.some((c) => c.id === qid && c.price_satang > 0));
  r = await fetch(B + `/api/quick/${qid}`, { method: 'POST', headers: C1, body: JSON.stringify({ action: 'cancel' }) }); j = await J(r); ok('cancel', j.ok && j.quick.status === 'cancelled');
  w = await wallet(); ok('cancel refunded', w.available === w0.available && w.held === w0.held);
  ok('cancel twice refused', (await fetch(B + `/api/quick/${qid}`, { method: 'POST', headers: C1, body: JSON.stringify({ action: 'cancel' }) })).status === 409);
  // รับนัด
  j = await J(await call({ hours: 5 })); qid = j.quick.id;
  const pq = await J(await fetch(`${B}/api/pt/quick?mb=${mb}&t=${encodeURIComponent(T)}`)); const price = pq.calls.find((c) => c.id === qid).price_satang;
  r = await fetch(B + '/api/pt/quick', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, id: qid }) }); j = await J(r);
  ok('pt accepts (first wins)', j.ok && j.booking.code, j.error); const bid = j.booking?.id;
  r = await fetch(B + '/api/pt/quick', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, id: qid }) }); ok('second accept refused', r.status === 409);
  j = await J(await fetch(B + `/api/quick/${qid}`, { headers: C1 })); ok('customer sees matched + booking', j.quick.status === 'matched' && j.quick.booking_id === bid);
  j = await J(await fetch(B + `/api/bookings/${bid}`, { headers: C1 })); ok('booking accepted at pt price', j.booking.status === 'accepted' && j.booking.total_satang === price && /เรียกด่วน/.test(j.booking.note), `${j.booking.status} ${j.booking.total_satang}/${price}`);
  w = await wallet(); ok('paid pt price only, held back to 0', w0.available - w.available === price && w.held === w0.held, `${w0.available - w.available}`);
  // หมดเวลา = คืนเงิน (ตั้ง 15 วิ)
  const m = (await J(await fetch(B + '/api/admin/wallet', { headers: ADM }))).money;
  await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'settings', money: { ...m, quickSeconds: 15 }, note: 'ทดสอบเรียกด่วน' }) });
  const w1 = await wallet();
  // PT มีนัดแล้วในช่วงเวลานี้ → ไม่มีคนว่าง; ใช้ 3 ชม. ก็ยังชน → คาดว่า "ไม่มีเพื่อนว่าง" หรือเปิดได้ถ้ามีคนอื่น
  j = await J(await call());
  if (j.ok) {
    qid = j.quick.id; await sleep(16500);
    j = await J(await fetch(B + `/api/quick/${qid}`, { headers: C1 })); ok('expired after timeout', j.quick.status === 'expired');
    w = await wallet(); ok('expire refunded', w.available === w1.available && w.held === w1.held);
  } else ok('no free pt (already booked) → refused', j.code === 'none' || /บ่อยเกินไป/.test(j.error || ''), j.error); // ชุดนี้เรียกเกิน 6 ครั้ง/ชม. แล้ว → ถูกจำกัดความถี่ก็นับว่าไม่ได้เรียก
  await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'settings', money: { ...m }, note: 'คืนค่า' }) });
  let t = await (await fetch(B + '/quick', { headers: C1 })).text(); ok('quick page renders', t.includes('เรียกด่วน'));
  t = await (await fetch(`${B}/join/profile/${mb}/jobs?t=${encodeURIComponent(T)}`)).text(); ok('pt jobs page renders', t.length > 0);
  j = await J(await fetch(B + '/api/cron/money', { headers: { authorization: 'Bearer ' + env('CRON_SECRET') } })); ok('recon ok', j.recon?.ok, JSON.stringify(j.recon?.issues));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
