// พาร์ทเนอร์ประเภทสปาแบบใหม่ (เดย์สปา) · ค่าห้องจากบริการที่เลือก · กันสลิปซ้ำ · ประตู QC · ลิงก์รีเซ็ตรหัส · ไฟล์ QC ด้วย token · Sale Man บัญชี/ออกจากระบบ
// โหมดเดโม · รันหลัง 09/19/20 ได้ (ใช้อีเมล/เวลาไม่ชนชุดก่อน)
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210', mb = 'MBM-2610001';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json();
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const post = (u, h, b) => fetch(B + u, { method: 'POST', headers: h, body: JSON.stringify(b) });
const T = (() => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600_000 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); })();
const H = { 'content-type': 'application/json', origin: B };

(async () => {
  const email = `dayspa${Date.now() % 1e7}@test.local`;
  const apply = { business_name: 'เดย์สปาทดสอบ', type: 'เดย์สปา', province: 'กรุงเทพมหานคร', contact_name: 'คุณเจ้าของ', tel: '0811112222', email, line_id: 'owner-private', links: '', package: '3m', message: '', consent: true };
  let j = await J(await post('/api/partner/apply', H, apply)); ok('apply as เดย์สปา', j.ok && !!j.token, j.error); const tok = j.token;
  j = await J(await post('/api/partner/apply', H, apply)); ok('duplicate email apply refused', !j.ok && j.code === 'exists', j.error);
  j = await J(await post('/api/partner/auth/register', H, { token: tok, password: 'demo-' + crypto.randomBytes(6).toString('hex') })); ok('set password with apply token', j.ok, j.error);
  const list = await J(await fetch(B + '/api/admin/partners', { headers: ADM }));
  const p = list.rows.find((x) => x.email === email); ok('partner row', !!p && p.type === 'เดย์สปา');
  const PC = { cookie: 'mb_partner=' + sign({ k: 'ps', pid: p.id, exp: Date.now() + 3600e3 }), 'content-type': 'application/json' };

  // หน้าร้านครั้งแรก: ประเภทจากใบสมัคร (เดย์สปา) บันทึกได้ + บริการ + ช่องทางติดต่อสาธารณะ
  j = await J(await fetch(B + '/api/partner/listing', { method: 'PUT', headers: PC, body: JSON.stringify({ type: 'เดย์สปา', description: 'ทดสอบ', hours: [], rooms: 2, amenities: [], area: 'อารีย์', services: [{ name: 'ห้องส่วนตัว 2 ชม.', minutes: 120, base_price: 800 }, { name: 'แพ็กเกจอโรมา', minutes: 90, base_price: 1200 }], contact: { phone: '02-111-2222', line_id: '@dayspa', address: '1 ซอยอารีย์ พญาไท กรุงเทพ', map_url: 'https://maps.app.goo.gl/test' }, published: true }) }));
  ok('first listing save with spa variant type', j.ok, j.error);
  const svc = j.row?.services?.[0]; ok('services get stable ids', !!svc?.id);

  // ชำระแผน: สลิปที่ 2 ระหว่างรอตรวจ = ไม่รับ
  const pay = () => { const fd = new FormData(); fd.set('package', '3m'); fd.set('token', tok); fd.set('slip', new File([img], 's.jpg', { type: 'image/jpeg' })); return fetch(B + '/api/partner/purchase', { method: 'POST', body: fd }); };
  j = await J(await pay()); ok('plan slip #1 accepted', j.ok, j.error);
  let r = await pay(); j = await J(r); ok('plan slip #2 blocked while pending', r.status === 409 && !j.ok && j.code === 'pending', j.error);
  const pur = (await J(await fetch(B + `/api/admin/partners/purchases?partner=${p.id}`, { headers: ADM }))).rows;
  ok('only one purchase row', pur.length === 1, String(pur.length));
  j = await J(await post(`/api/admin/partners/purchases/${pur[0].id}`, ADM, { action: 'approve' }));
  ok('approve slip → approved, not public yet', j.ok && j.partner.account_status === 'approved' && j.partner.status !== 'active', JSON.stringify(j.partner && { a: j.partner.account_status, s: j.partner.status }));
  let spas = (await J(await fetch(B + '/api/spas'))).spas; ok('not bookable before QC', !spas.some((s) => s.id === p.id));
  ok('venue page 404 before QC', (await fetch(B + `/spas/${p.id}`)).status === 404);
  let t = (await (await fetch(B + '/partner/portal', { headers: PC })).text()).replace(/<!-- -->/g, ''); ok('portal says waiting for QC', t.includes('รอผ่าน QC ก่อนเปิดแสดง'));

  // ไฟล์ QC: ผู้ถือ token เปิดได้ · ไม่มีสิทธิ์ = 401
  const qf = new FormData(); qf.set('action', 'upload'); qf.set('key', 'license'); qf.set('token', tok); qf.append('files', new File([img], 'l.jpg', { type: 'image/jpeg' }));
  j = await J(await fetch(B + '/api/partner/qc', { method: 'POST', body: qf })); const qpath = j.docs?.license?.[0]; ok('qc doc uploaded with token', j.ok && !!qpath, j.error);
  ok('qc file 401 without token', (await fetch(B + `/api/partner/file?path=${encodeURIComponent(qpath)}`)).status === 401);
  ok('qc file 200 with ?t= token', (await fetch(B + `/api/partner/file?path=${encodeURIComponent(qpath)}&t=${encodeURIComponent(tok)}`)).status === 200);

  // ผ่าน QC → เปิดแสดงอัตโนมัติ (มีแผนที่จ่ายแล้ว)
  j = await J(await fetch(B + `/api/admin/partners/${p.id}`, { method: 'PATCH', headers: ADM, body: JSON.stringify({ qc_status: 'passed' }) }));
  ok('QC passed → active', j.ok && j.row.account_status === 'active' && j.row.status === 'active', j.error);
  spas = (await J(await fetch(B + '/api/spas'))).spas; const mine = spas.find((s) => s.id === p.id);
  ok('spa variant listed in /api/spas with services', !!mine && mine.services.length === 2 && mine.price === 800, JSON.stringify(mine).slice(0, 120));
  t = (await (await fetch(B + `/spas/${p.id}`)).text()).replace(/<!-- -->/g, '');
  ok('venue page uses listing contact (not applicant phone)', t.includes('ซอยอารีย์') && !t.includes('0811112222'));
  const pk = /เหลือ (\d+) \/ (\d+) วัน/.exec((await (await fetch(B + '/partner/portal/package', { headers: PC })).text()).replace(/<!-- -->/g, ''));
  ok('days left ≤ plan length', !!pk && Number(pk[1]) <= Number(pk[2]), pk && pk[0]);
  ok('/spas lists เดย์สปา', (await (await fetch(B + '/spas')).text()).includes('เดย์สปาทดสอบ'));

  // จอง: ต้องเลือกบริการ · ค่าห้อง = ราคาบริการ (ฝั่งเซิร์ฟเวอร์)
  const C = { cookie: 'hamoo_session=' + sign({ sub: 'demo:dayspa-c@test.local', email: 'dayspa-c@test.local', exp: Date.now() + 3600e3 }), 'content-type': 'application/json' };
  const fd = new FormData(); fd.set('amount', '20000'); fd.set('slip', new File([img], 's.jpg', { type: 'image/jpeg' }));
  await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { cookie: C.cookie }, body: fd });
  const a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  const tp = a.topups.find((x) => x.customer_email === 'dayspa-c@test.local' && x.status === 'pending');
  if (tp) await post('/api/admin/wallet', ADM, { action: 'approve', id: tp.id });
  const pid = (/\/p\/(r[0-9a-f]{10})/.exec(await (await fetch(B + '/')).text()) || [])[1];
  const d = new Date(Date.now() + 11 * 86400e3); d.setHours(11, 0, 0, 0);
  j = await J(await post('/api/bookings', C, { pid, hours: 3, starts_at: d.toISOString(), place: { type: 'spa', spa_id: p.id }, note: '' }));
  ok('spa booking without service refused', !j.ok && /บริการ/.test(j.error || ''), j.error);
  j = await J(await post('/api/bookings', C, { pid, hours: 3, starts_at: d.toISOString(), place: { type: 'spa', spa_id: p.id, service_id: 'nope' }, note: '' }));
  ok('unknown service refused', !j.ok);
  j = await J(await post('/api/bookings', C, { pid, hours: 3, starts_at: d.toISOString(), place: { type: 'spa', spa_id: p.id, service_id: svc.id, price: 1 }, note: 'มาตรงเวลา' }));
  ok('book with chosen service', j.ok, j.error); const bid = j.id;
  const bk = (await J(await fetch(B + `/api/bookings/${bid}`, { headers: C }))).booking;
  ok('room fee = service price (server-side)', bk?.room_fee_satang === 80000 && bk.place.spa_service === svc.name, `${bk?.room_fee_satang}`);
  // เพื่อนตอบรับ → พอร์ทัลมียอดจริง + % ที่แอดมินตั้ง
  await fetch(B + `/api/admin/partners/${p.id}`, { method: 'PATCH', headers: ADM, body: JSON.stringify({ platform_pct: 15 }) });
  await fetch(B + `/api/pt/bookings/${bid}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, accept: true }) });
  t = (await (await fetch(B + '/partner/portal/bookings', { headers: PC })).text()).replace(/\\"/g, '"');
  ok('portal row has amount 800 + pct 15 + service', new RegExp(`"booking_ref":"${bk.code}"[^}]*"addon":"${svc.name}"[^}]*"amount":800,"platform_pct":15`).test(t));

  // ลิงก์รีเซ็ตรหัสผ่าน (แอดมิน) — ใช้ได้ครั้งเดียว
  j = await J(await post(`/api/admin/partners/${p.id}`, ADM, { action: 'reset_link' })); ok('admin reset link', j.ok && /\/partner\/register\?t=/.test(j.link || ''));
  const rt = decodeURIComponent(j.link.split('t=')[1]);
  j = await J(await post('/api/partner/auth/register', H, { token: rt, password: 'demo-new-' + crypto.randomBytes(4).toString('hex') })); ok('reset password via link', j.ok, j.error);
  j = await J(await post('/api/partner/auth/register', H, { token: rt, password: 'demo-again-12345' })); ok('reset link single-use', !j.ok);
  // แก้ชื่อ/ประเภทโดยแอดมิน
  j = await J(await fetch(B + `/api/admin/partners/${p.id}`, { method: 'PATCH', headers: ADM, body: JSON.stringify({ business_name: 'เดย์สปาทดสอบ (แก้)', type: 'สปาเพื่อสุขภาพ' }) })); ok('admin edits name + type', j.ok && j.row.type === 'สปาเพื่อสุขภาพ', j.error);

  // Sale Man: ต้องมีบัญชี · แก้ได้ · แดชบอร์ดเห็นบัญชีแบบปิด · ออกจากระบบลบ cookie
  r = await post('/api/admin/sales', ADM, { action: 'rep_create', name: 'เซลส์ไม่มีบัญชี', phone: '0890000000' }); ok('rep without bank refused', r.status === 409);
  j = await J(await post('/api/admin/sales', ADM, { action: 'rep_create', name: 'เซลส์ทดสอบ', phone: '0890000001', bank: { bank: 'กสิกรไทย', account: '111-2-33333-4', name: 'เซลส์ ทดสอบ' } }));
  ok('rep with bank created', j.ok && j.rep.bank.account === '1112333334', j.error); const rep = j.rep;
  j = await J(await post('/api/admin/sales', ADM, { action: 'rep_update', id: rep.id, phone: '0890000009', bank: { bank: 'ไทยพาณิชย์', account: '9998887776', name: 'เซลส์ ทดสอบ' } }));
  ok('admin edits rep phone/bank', j.ok && j.rep.phone === '0890000009' && j.rep.bank.bank === 'ไทยพาณิชย์', j.error);
  const st = (await J(await post('/api/admin/sales', ADM, { action: 'rep_link', id: rep.id }))).link.split('t=')[1];
  const g = await fetch(B + `/recruit/go?t=${st}`, { redirect: 'manual' });
  const SC = (g.headers.get('set-cookie') || '').split(';')[0]; ok('sales link sets cookie', SC.startsWith('mb_sales='));
  t = (await (await fetch(B + '/recruit/me', { headers: { cookie: SC } })).text()).replace(/<!-- -->/g, '');
  ok('/recruit/me shows masked bank + logout', t.includes('••••••7776') && !t.includes('9998887776') && t.includes('ออกจากระบบ Recruit'));
  r = await fetch(B + '/api/sales/logout', { method: 'POST', headers: { cookie: SC, origin: B }, redirect: 'manual' });
  ok('logout clears mb_sales', /mb_sales=;/.test(r.headers.get('set-cookie') || '') && /max-age=0/i.test(r.headers.get('set-cookie') || ''), r.headers.get('set-cookie'));

  const lw = await J(await fetch(B + '/api/admin/wallet', { headers: ADM })); ok('ledger balanced', lw.sum === 0, String(lw.sum));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
