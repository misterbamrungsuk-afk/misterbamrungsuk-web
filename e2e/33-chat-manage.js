// จัดการแชท: ยกเลิกการส่ง (ผู้ส่ง · 24 ชม.) · ลบข้อความเฉพาะฉัน · ซ่อนแชท/เลิกซ่อน · ลบกล่องแชท (เฉพาะนัดที่จบ) · ทีมงานเห็นครบพร้อมป้าย
// โหมดสาธิตเท่านั้น — ใช้ action demo_age ของ /api/bookings/[id]/chat ทำให้ข้อความเก่าเกิน 24 ชม.
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
const cust = (e) => ({ cookie: 'hamoo_session=' + sign({ sub: 'demo:' + e, email: e, exp: Date.now() + 3600e3 }), 'content-type': 'application/json' });
const C = cust('chatman@test.local'), C2 = cust('chatman2@test.local');
const T = (() => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600e3 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); })();
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const PTQ = `mb=${mb}&t=${encodeURIComponent(T)}`;
const csend = (id, body) => fetch(B + `/api/bookings/${id}/messages`, { method: 'POST', headers: C, body: JSON.stringify({ body }) }).then(J);
const psend = (id, body) => fetch(B + `/api/bookings/${id}/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body, mb, t: T }) }).then(J);
const cget = (id, qs = '') => fetch(B + `/api/bookings/${id}/messages${qs ? '?' + qs : ''}`, { headers: C }).then(J);
const pget = (id, qs = '') => fetch(B + `/api/bookings/${id}/messages?${PTQ}${qs ? '&' + qs : ''}`).then(J);
const act = (id, h, body) => fetch(B + `/api/bookings/${id}/chat`, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, ...(await r.json()) }));
const cact = (id, action, extra = {}) => act(id, C, { action, ...extra });
const pact = (id, action, extra = {}) => act(id, { 'content-type': 'application/json' }, { action, mb, t: T, ...extra });
const warn = (id, text) => fetch(B + '/api/admin/chats/warn', { method: 'POST', headers: ADM, body: JSON.stringify({ booking_id: id, to: 'both', text }) }).then(J);
const chatList = () => fetch(B + '/api/bookings?chat=1', { headers: C }).then(J).then((d) => d.bookings || []);
const state = async (id) => (await chatList()).find((b) => b.id === id)?.chat ?? null;
const transcript = async (id) => (await (await fetch(B + `/admin/chats/${id}`, { headers: ADM })).text()).replace(/<!-- -->/g, '');
const far = (d, min) => { const x = new Date(Date.now() + d * 86400e3); x.setHours(15, min, 0, 0); return x.toISOString(); };

(async () => {
  const fd = new FormData(); fd.set('amount', '30000'); fd.set('slip', new File([img], 's.jpg', { type: 'image/jpeg' }));
  await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { cookie: C.cookie }, body: fd });
  const a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  const tp = a.topups.find((x) => x.customer_email === 'chatman@test.local' && x.status === 'pending');
  if (tp) await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'approve', id: tp.id }) });
  // รายการเติมเงินในหลังบ้านแสดงจำนวนจำกัด (ชุดท้าย ๆ อาจหาไม่เจอ) → เติมด้วยการปรับยอดของ CEO ให้แน่ใจว่ามีเงินพอ
  if (!tp) await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'adjust', owner_type: 'customer', owner_id: 'demo:chatman@test.local', bucket: 'available', amount_baht: 30000, reason: 'e2e', idem: 'e2e-chatman@test.local-' + Date.now() }) });
  const pid = (/\/p\/(r[0-9a-f]{10})/.exec(await (await fetch(B + '/')).text()) || [])[1];
  const book = (starts_at) => fetch(B + '/api/bookings', { method: 'POST', headers: C, body: JSON.stringify({ pid, hours: 3, starts_at, place: { type: 'cafe', detail: 'คาเฟ่ทดสอบจัดการแชท' }, note: '' }) }).then(J);
  let j = await book(far(46, 23)); ok('booking #1 (active)', j.ok, j.error); const id1 = j.id;

  // ── ยกเลิกการส่ง ──
  const SECRET = 'ข้อความลับทดสอบยกเลิก ' + Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 6); // ห้ามมีตัวเลขยาว ๆ — ตัวกรองแชทมองเป็นเบอร์โทร
  const m1 = (await csend(id1, SECRET)).message; ok('customer message', !!m1 && !m1.blocked);
  const m2 = (await psend(id1, 'สวัสดีค่ะ จากเพื่อน')).message; ok('pt message', !!m2 && !m2.blocked);
  const m3 = (await warn(id1, 'ทดสอบข้อความระบบ')).message; ok('system message', !!m3);
  const p0 = await pget(id1); ok('pt sees customer message', p0.messages.some((m) => m.id === m1.id && m.body === SECRET) && !!p0.ts && p0.last >= m3.id);
  j = await cact(id1, 'unsend', { message_id: m1.id }); ok('unsend own within 24h', j.ok, j.error);
  j = await cget(id1); const cm1 = j.messages.find((m) => m.id === m1.id);
  ok('customer sees placeholder', cm1?.unsent === true && cm1.body === '' && !JSON.stringify(j).includes(SECRET));
  j = await pget(id1); const pm1 = j.messages.find((m) => m.id === m1.id);
  ok('pt sees placeholder, no body', pm1?.unsent === true && pm1.body === '' && !JSON.stringify(j).includes(SECRET));
  j = await pget(id1, `after=${p0.last}&since=${encodeURIComponent(p0.ts)}`);
  ok('poll returns unsent id since last poll', (j.unsent || []).includes(m1.id) && !j.messages.length, JSON.stringify(j.unsent));
  j = await pget(id1, `after=${p0.last}&since=${encodeURIComponent(j.ts)}`); ok('next poll: no repeat', !(j.unsent || []).length);
  const pn = await fetch(B + `/api/pt/notifications?${PTQ}`).then(J).then((d) => d.notices || []);
  ok('pt notification no longer shows body', !JSON.stringify(pn).includes(SECRET));
  j = await cact(id1, 'unsend', { message_id: m2.id }); ok('cannot unsend other side message', j.status === 403, String(j.status));
  j = await cact(id1, 'unsend', { message_id: m3.id }); ok('cannot unsend system message', j.status === 403, String(j.status));
  const m4 = (await csend(id1, 'ข้อความเก่าทดสอบ')).message;
  j = await cact(id1, 'demo_age', { message_id: m4.id, hours: 25 }); ok('demo age helper', j.ok);
  j = await cact(id1, 'unsend', { message_id: m4.id }); ok('cannot unsend after 24h', j.status === 409 && /24/.test(j.error || ''), j.error);
  const blk = (await csend(id1, 'โทร 081-234-5678')).message;
  j = await cact(id1, 'unsend', { message_id: blk.id }); ok('cannot unsend blocked message', j.status === 409, String(j.status));
  const m5 = (await psend(id1, 'เพื่อนจะยกเลิกข้อความนี้')).message;
  j = await pact(id1, 'unsend', { message_id: m5.id }); ok('pt unsends own', j.ok, j.error);
  j = await cget(id1); ok('customer sees pt unsent placeholder', j.messages.find((m) => m.id === m5.id)?.unsent === true);
  j = await act(id1, { 'content-type': 'application/json' }, { action: 'unsend', message_id: m5.id, mb }); ok('pt without token refused', j.status === 404, String(j.status));
  j = await act(id1, C2, { action: 'hide' }); ok('other customer refused', j.status === 404, String(j.status));

  // ── ลบข้อความ (เฉพาะฉัน) ──
  j = await cact(id1, 'delete', { message_id: m2.id }); ok('delete other side message for me', j.ok, j.error);
  j = await cact(id1, 'delete', { message_id: m3.id }); ok('delete system message for me', j.ok, j.error);
  j = await cget(id1); ok('hidden on my side', !j.messages.some((m) => m.id === m2.id || m.id === m3.id));
  j = await pget(id1); ok('other side still sees', j.messages.some((m) => m.id === m2.id) && j.messages.some((m) => m.id === m3.id));

  // ── ซ่อนแชท ──
  j = await cact(id1, 'hide'); ok('hide chat', j.ok, j.error);
  let s = await state(id1); ok('hidden in my list', s?.hidden === true && s.mode === 'hide', JSON.stringify(s));
  await psend(id1, 'ข้อความใหม่หลังซ่อน');
  s = await state(id1); ok('new message → reappears', s && s.hidden === false, JSON.stringify(s));
  await cact(id1, 'hide'); ok('hide again', (await state(id1))?.hidden === true);
  j = await cact(id1, 'unhide'); s = await state(id1); ok('unhide', j.ok && s?.hidden === false, JSON.stringify(s));
  j = await cact(id1, 'delete_box'); ok('delete box refused on active booking', j.status === 409 && /ซ่อน/.test(j.error || ''), j.error);
  ok('chat list page renders', (await (await fetch(B + '/chat', { headers: C })).text()).length > 0);

  // ── ลบกล่องแชท (นัดที่จบแล้ว) ──
  j = await book(far(47, 23)); ok('booking #2', j.ok, j.error); const id2 = j.id;
  const OLD = 'ประวัติเก่ากล่องสอง ' + Math.random().toString(36).replace(/[^a-z]/g, '').slice(0, 6);
  const o1 = (await csend(id2, OLD)).message; const o2 = (await psend(id2, 'ตอบประวัติเก่า')).message;
  j = await J(await fetch(B + `/api/bookings/${id2}/cancel`, { method: 'POST', headers: C, body: JSON.stringify({ reason: 'ทดสอบ' }) })); ok('cancel #2 (finished)', j.ok, j.error);
  j = await cact(id2, 'delete_box'); ok('delete box on finished booking', j.ok, j.error);
  s = await state(id2); ok('removed from my list', s?.hidden === true && s.mode === 'delete', JSON.stringify(s));
  j = await cget(id2); ok('history cleared for me', j.ok && !j.messages.length && j.last >= o2.id, String(j.messages?.length));
  j = await pget(id2); ok('other side history intact', j.messages.some((m) => m.id === o1.id && m.body === OLD) && j.messages.some((m) => m.id === o2.id));
  let t = await transcript(id2);
  ok('admin transcript keeps deleted-box history', t.includes(OLD) && t.includes('ลบฝั่งลูกค้า (ลบกล่องแชท)') && t.includes('ลูกค้าลบกล่องแชท'));
  t = await transcript(id1);
  ok('admin transcript keeps unsent body + tag', t.includes(SECRET) && t.includes('ยกเลิกการส่ง ·') && t.includes('ลบฝั่งลูกค้า ·'));
  ok('admin transcript keeps pt unsent body', t.includes('เพื่อนจะยกเลิกข้อความนี้'));
  const nm = (await warn(id2, 'ข้อความใหม่หลังลบกล่อง')).message;
  j = await cget(id2); ok('new message after delete: only new shown', j.messages.length === 1 && j.messages[0].id === nm.id, JSON.stringify(j.messages.map((m) => m.id)));
  s = await state(id2); ok('chat reappears after new message', s && s.hidden === false, JSON.stringify(s));
  j = await cact(id2, 'hide'); j = await cact(id2, 'unhide'); j = await cget(id2); ok('hide/unhide keeps history cleared', j.messages.length === 1);
  ok('admin chats need admin', (await fetch(B + `/admin/chats/${id2}`, { redirect: 'manual' })).status >= 300);
  await fetch(B + `/api/bookings/${id1}/cancel`, { method: 'POST', headers: C, body: JSON.stringify({ reason: 'ทดสอบ' }) });
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
