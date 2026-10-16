// ช่วง 4 การจอง + แชท (โหมดเดโม · ต้องรัน fix-e2e แล้ว pos-e2e ก่อน → MB-2610001 เปิดแสดง)
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
const C2 = { cookie: sess('demo:other@test.local', 'other@test.local'), 'content-type': 'application/json' };
const body = Buffer.from(JSON.stringify({ mb, exp: Date.now() + 3600_000 })).toString('base64url');
const T = body + '.' + crypto.createHmac('sha256', KEY).update('resume:' + body).digest('base64url');
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const J = (r) => r.json();
const at = (days, h) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, 0, 0, 0); return d.toISOString(); };
const book = (hdr, extra = {}) => fetch(B + '/api/bookings', { method: 'POST', headers: hdr, body: JSON.stringify({ pid, hours: 3, starts_at: at(2, 19), place: { type: 'cafe', detail: 'ร้านกาแฟ อโศก' }, note: 'ทดสอบ', ...extra }) });
let pid;
(async () => {
  const h = await (await fetch(B + '/')).text();
  pid = (/\/p\/(r[0-9a-f]{10})/.exec(h) || [])[1]; ok('live person on home', !!pid, pid);
  let r = await fetch(B + `/book/${pid}`, { headers: C1 }); let t = await r.text(); ok('book page renders for live', t.includes('นัดเพื่อน') && t.includes('ระยะเวลา'));
  t = await (await fetch(B + '/book/ton', { headers: C1 })).text(); ok('sample person not bookable', t.includes('ข้อมูลตัวอย่าง'));
  r = await book({ 'content-type': 'application/json' }); ok('no login → 401', r.status === 401);
  r = await book(C1); let j = await J(r); ok('no funds → 402', r.status === 402 && j.code === 'funds' && j.short > 0, j.short);
  // เติมเงิน 20,000 แล้วอนุมัติ
  const fd = new FormData(); fd.set('amount', '20000'); fd.set('slip', new File([img], 's.jpg', { type: 'image/jpeg' }));
  await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { cookie: C1.cookie }, body: fd });
  const a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  const tp = a.topups.find((x) => x.customer_email === 'buyer@test.local' && x.status === 'pending');
  await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'approve', id: tp.id }) });
  r = await book(C1, { starts_at: new Date(Date.now() + 10 * 60_000).toISOString() }); ok('too soon refused', r.status === 400);
  r = await book(C1, { note: 'โทร 0812345678 นะ' }); ok('contact in note refused', r.status === 400);
  r = await book(C1, { place: { type: 'spa', spa_id: 's1' } }); j = await J(r); ok('book spa (room fee)', j.ok, j.code);
  const spaId = j.id;
  r = await book(C1); j = await J(r); ok('clash same time refused', r.status === 400 && /มีนัดแล้ว/.test(j.error), j.error);
  r = await book(C1, { starts_at: at(3, 19) }); j = await J(r); ok('book #2', j.ok); const id2 = j.id;
  let w = await J(await fetch(B + '/api/wallet', { headers: C1 })); ok('held = sum of 2 bookings', w.held > 0 && w.available + w.held === 2000000, `${w.available}/${w.held}`);
  r = await fetch(B + `/api/bookings/${spaId}`, { headers: C2 }); ok('other customer cannot see', r.status === 404);
  j = await J(await fetch(B + `/api/bookings/${spaId}`, { headers: C1 })); ok('room fee in total', j.booking.room_fee_satang === 60000 && !j.booking.parttime_mb, j.booking.total_satang);
  // Part-Time
  r = await fetch(B + `/api/pt/bookings?mb=${mb}`); ok('pt list needs token', r.status === 403);
  j = await J(await fetch(B + `/api/pt/bookings?mb=${mb}&t=${encodeURIComponent(T)}`)); ok('pt sees 2 requests (no customer email)', j.bookings.filter((b) => b.status === 'requested').length === 2 && !j.bookings[0].customer_email);
  r = await fetch(B + `/api/pt/bookings/${spaId}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, accept: true }) }); ok('pt accepts', (await J(r)).ok);
  r = await fetch(B + `/api/pt/bookings/${spaId}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, accept: false }) }); ok('double respond blocked', r.status === 409);
  r = await fetch(B + `/api/pt/bookings/${id2}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, accept: false, reason: 'ติดธุระ' }) }); ok('pt declines #2', (await J(r)).ok);
  w = await J(await fetch(B + '/api/wallet', { headers: C1 }));
  j = await J(await fetch(B + `/api/bookings/${spaId}`, { headers: C1 }));
  ok('after accept: held 0, escrow took spa booking, decline refunded', w.held === 0 && w.available === 2000000 - j.booking.total_satang, `${w.available}`);
  // แชท
  r = await fetch(B + `/api/bookings/${spaId}/messages`, { method: 'POST', headers: C1, body: JSON.stringify({ body: 'สวัสดีค่ะ เจอกันหน้าร้าน' }) }); ok('customer sends', (await J(r)).ok);
  r = await fetch(B + `/api/bookings/${spaId}/messages`, { method: 'POST', headers: C1, body: JSON.stringify({ body: 'แอดไลน์ @abc123 นะ' }) }); j = await J(r); ok('contact blocked w/ warning', j.ok && j.message.blocked && !!j.warning);
  r = await fetch(B + `/api/bookings/${spaId}/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body: 'รับทราบครับ', mb, t: T }) }); ok('pt replies', (await J(r)).ok);
  j = await J(await fetch(B + `/api/bookings/${spaId}/messages?mb=${mb}&t=${encodeURIComponent(T)}`)); ok('pt does not see blocked msg', j.messages.length >= 3 && !j.messages.some((m) => m.blocked), j.messages.length);
  j = await J(await fetch(B + `/api/bookings/${spaId}/messages`, { headers: C1 })); ok('customer sees own blocked + system msg', j.messages.some((m) => m.blocked) && j.messages.some((m) => m.sender_type === 'system'));
  r = await fetch(B + `/api/bookings/${spaId}/messages`, { method: 'POST', headers: C2, body: JSON.stringify({ body: 'hi' }) }); ok('stranger cannot chat', r.status === 404);
  // ยกเลิก
  r = await book(C1, { starts_at: at(5, 19) }); const id3 = (await J(r)).id;
  r = await fetch(B + `/api/bookings/${id3}/cancel`, { method: 'POST', headers: C1, body: '{}' }); j = await J(r); ok('cancel before accept → cancelled', j.status === 'cancelled');
  r = await fetch(B + `/api/bookings/${spaId}/cancel`, { method: 'POST', headers: C1, body: JSON.stringify({ reason: 'ติดงาน' }) }); j = await J(r); ok('cancel after accept → cancel_requested', j.status === 'cancel_requested');
  w = await J(await fetch(B + '/api/wallet', { headers: C1 })); ok('cancelled #3 refunded', w.held === 0);
  j = await J(await fetch(B + '/api/notifications', { headers: C1 })); ok('customer notifications', j.notices.length >= 3, j.notices.map((n) => n.kind).join(','));
  const s = await J(await fetch(B + '/api/admin/wallet', { headers: ADM })); ok('ledger sums to 0', s.sum === 0, s.sum);
  for (const p of ['/orders', '/chat', '/notifications', `/order/${spaId}`, `/chat/${spaId}`, `/book/success?id=${spaId}`]) { r = await fetch(B + p, { headers: C1 }); ok(`page ${p}`, r.status === 200); }
  r = await fetch(B + `/join/profile/${mb}/jobs?t=${encodeURIComponent(T)}`); ok('pt jobs page', (await r.text()).includes('งานเข้า'));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
