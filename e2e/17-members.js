// แอดมินสมาชิกลูกค้า (A-Members): รายชื่อ · ระงับ = ออกทุกเครื่อง + ล็อกอินไม่ได้ · คืนสิทธิ์ · ลบข้อมูลตามคำขอ (PDPA) · ไม่มีคำต้องห้าม "แพ็กเกจ"
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json();
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const cust = (e) => ({ cookie: 'hamoo_session=' + sign({ sub: 'demo:' + e, email: e, exp: Date.now() + 3600e3 }), 'content-type': 'application/json' });
const A = cust('memb-a@test.local'), D = cust('memb-del@test.local');
const act = (body) => fetch(B + '/api/admin/members', { method: 'POST', headers: ADM, body: JSON.stringify(body) });
(async () => {
  await fetch(B + '/api/me', { headers: A }); await fetch(B + '/api/me', { headers: D });
  let t = await (await fetch(B + '/admin/members', { headers: ADM })).text();
  ok('members page lists customers', t.includes('memb-a@test.local') && t.includes('memb-del@test.local'));
  ok('members api needs admin', (await fetch(B + '/api/admin/members', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status === 401);
  let r = await act({ action: 'suspend', id: 'demo:memb-a@test.local', reason: '' }); ok('suspend needs reason', r.status === 400);
  r = await act({ action: 'suspend', id: 'demo:memb-a@test.local', reason: 'ทดสอบระงับ' }); ok('suspend', (await J(r)).ok);
  ok('suspended session rejected', (await fetch(B + '/api/wallet', { headers: A })).status === 401);
  r = await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'memb-a@test.local', password: 'whatever-123' }) }); ok('suspended login refused', r.status === 403);
  r = await act({ action: 'unsuspend', id: 'demo:memb-a@test.local' }); ok('unsuspend', (await J(r)).ok);
  ok('session works again', (await fetch(B + '/api/wallet', { headers: A })).status === 200);
  r = await act({ action: 'erase', id: 'demo:memb-a@test.local' }); ok('erase requires delete request', r.status === 400);
  await fetch(B + '/api/me/delete', { method: 'POST', headers: D });
  r = await act({ action: 'erase', id: 'demo:memb-del@test.local' }); ok('erase after request (PDPA)', (await J(r)).ok);
  t = await (await fetch(B + '/admin/members', { headers: ADM })).text(); ok('erased email anonymized', t.includes('@deleted.invalid') && t.includes('ลบข้อมูลแล้ว'));
  ok('erased session dead', (await fetch(B + '/api/wallet', { headers: D })).status === 401);
  // คำต้องห้ามในหน้าพาร์ทเนอร์
  for (const p of ['/partner', '/partner/register', '/admin/partners']) { t = await (await fetch(B + p, { headers: ADM })).text(); ok('no "แพ็กเกจ" on ' + p, !/แพ็กเกจ|แพคเกจ/.test(t)); }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
