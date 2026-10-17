// Security hardening: headers · CSRF · image proxy · สิทธิ์การเงิน=CEO · แยกหน้าที่ KYC · ตรวจไฟล์จริง · ยกเลิกโทเคน · สิทธิ์หน้าแอดมินแบบเข้ารหัส URL (โหมดเดโม)
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210', mb = 'MB-2610001';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
let KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '');
const AKEY = KEY.length >= 32 ? KEY : 'mord-demo-only-admin-session-secret-not-for-production';
KEY = KEY || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const b64 = (b) => Buffer.from(b).toString('base64url');
const adminTok = (role) => { const p = b64(JSON.stringify({ email: `qa-${role}@local.test`, role, exp: Date.now() + 3600e3 })); return p + '.' + b64(crypto.createHmac('sha256', AKEY).update(p).digest()); };
const H = (role) => ({ cookie: 'mord_admin=' + adminTok(role), 'content-type': 'application/json' });
const sess = (e) => { const b = b64(JSON.stringify({ sub: 'demo:' + e, email: e, exp: Date.now() + 3600e3 })); return 'hamoo_session=' + b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const resume = (iat) => { const b = b64(JSON.stringify({ mb, iat, exp: iat + 30 * 86400e3 })); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); };
const J = (r) => r.json();
(async () => {
  // ── HTTP headers ──
  const h = await fetch(B + '/');
  ok('CSP set (frame-ancestors none, object-src none)', /frame-ancestors 'none'/.test(h.headers.get('content-security-policy') || '') && /object-src 'none'/.test(h.headers.get('content-security-policy') || ''));
  ok('X-Frame-Options DENY + nosniff + HSTS', h.headers.get('x-frame-options') === 'DENY' && h.headers.get('x-content-type-options') === 'nosniff' && /max-age=/.test(h.headers.get('strict-transport-security') || ''));
  ok('no X-Powered-By', !h.headers.get('x-powered-by'));
  ok('API not cacheable', /no-store/.test((await fetch(B + '/api/membership')).headers.get('cache-control') || ''));
  // ── CSRF ──
  ok('cross-site POST blocked', (await fetch(B + '/api/membership', { method: 'POST', headers: { origin: 'https://evil.example' } })).status === 403);
  ok('cross-site (sec-fetch-site) blocked', (await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { 'sec-fetch-site': 'cross-site' } })).status === 403);
  ok('same-origin POST passes to auth', (await fetch(B + '/api/membership', { method: 'POST', headers: { origin: B } })).status === 401);
  // ── open image proxy ──
  ok('/_next/image refuses foreign host', (await fetch(B + '/_next/image?url=' + encodeURIComponent('https://evil.example/x.png') + '&w=64&q=75')).status === 400);
  // ── เงิน: เฉพาะ CEO ──
  ok('finance cannot adjust wallets', (await fetch(B + '/api/admin/wallet', { method: 'POST', headers: H('finance'), body: JSON.stringify({ action: 'adjust', owner_type: 'customer', owner_id: 'demo:x@test.local', bucket: 'available', amount_baht: 1000, reason: 'x' }) })).status === 403);
  ok('finance cannot change money settings', (await fetch(B + '/api/admin/wallet', { method: 'POST', headers: H('finance'), body: JSON.stringify({ action: 'settings', money: {} }) })).status === 403);
  ok('finance cannot mint big promo', (await fetch(B + '/api/admin/promos', { method: 'POST', headers: H('finance'), body: JSON.stringify({ action: 'create', amount: 1000, max_uses: 100 }) })).status === 403);
  // ── KYC: ฝ่ายการเงินตัดสินไม่ได้ · คนออกลิงก์อนุมัติเองไม่ได้ ──
  const list = (await (await fetch(B + '/admin/applicants', { headers: { cookie: 'mord_admin=' + adm } })).text()).replace(/\\"/g, '"');
  const at = list.indexOf('"mb_code":"' + mb + '"'); const ids = [...list.slice(Math.max(0, at - 6000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)]; const app = { id: ids[ids.length - 1]?.[1] };
  ok('finance cannot decide KYC', (await fetch(B + `/api/admin/applicants/${app.id}`, { method: 'PATCH', headers: H('finance'), body: JSON.stringify({ kyc_status: 'approved' }) })).status === 403);
  await fetch(B + `/api/admin/applicants/${app.id}/link`, { method: 'POST', headers: H('super') });
  let r = await fetch(B + `/api/admin/applicants/${app.id}`, { method: 'PATCH', headers: H('super'), body: JSON.stringify({ kyc_status: 'approved' }) });
  ok('link minter cannot approve own KYC', r.status === 403, String(r.status));
  // ── ไฟล์ปลอม (ข้อความที่อ้างว่าเป็นรูป) ถูกปฏิเสธ ──
  const fd = new FormData(); fd.set('as', 'customer'); fd.set('file', new File([Buffer.from('<svg onload=alert(1)>')], 'x.png', { type: 'image/png' }));
  r = await fetch(B + '/api/avatar', { method: 'POST', headers: { cookie: sess('hard@test.local') }, body: fd });
  ok('fake image refused (magic bytes)', r.status === 400, String(r.status));
  // ── เสิร์ฟไฟล์ปลอดภัย ──
  const fd2 = new FormData(); fd2.set('as', 'customer'); fd2.set('file', new File([fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg')], 'a.jpg', { type: 'image/jpeg' }));
  await fetch(B + '/api/avatar', { method: 'POST', headers: { cookie: sess('hard@test.local') }, body: fd2 });
  r = await fetch(B + '/api/avatar?as=customer&img=1', { headers: { cookie: sess('hard@test.local') } });
  ok('file served with nosniff + sandbox CSP', r.headers.get('x-content-type-options') === 'nosniff' && /sandbox/.test(r.headers.get('content-security-policy') || ''));
  // ── โทเคน Part-Time: ออกจากระบบทุกเครื่อง → โทเคนเก่าใช้ไม่ได้ ──
  const old = resume(Date.now() - 60_000);
  ok('old token works before revoke', (await fetch(B + `/api/pt/wallet?mb=${mb}&t=${encodeURIComponent(old)}`)).status === 200);
  await fetch(B + '/api/join/logout', { method: 'POST', headers: { cookie: 'mb_resume=' + old, 'content-type': 'application/json' }, body: JSON.stringify({ all: true }) });
  ok('old token rejected after logout-all', (await fetch(B + `/api/pt/wallet?mb=${mb}&t=${encodeURIComponent(old)}`)).status !== 200);
  ok('fresh token still works', (await fetch(B + `/api/pt/wallet?mb=${mb}&t=${encodeURIComponent(resume(Date.now() + 1000))}`)).status === 200);
  // ── สิทธิ์หน้าแอดมิน: URL เข้ารหัสไม่หลุด ──
  r = await fetch(B + '/admin/w%61llet', { headers: { cookie: 'mord_admin=' + adminTok('cs') }, redirect: 'manual' });
  ok('cs cannot reach encoded /admin/w%61llet', r.status >= 300 && r.status < 400 && /denied=1/.test(r.headers.get('location') || ''), r.status + ' ' + r.headers.get('location'));
  // ── อื่น ๆ ──
  ok('legacy vendor monthly payout disabled', (await fetch(B + '/api/market/admin/payouts', { method: 'POST', headers: { cookie: 'mord_admin=' + adm }, body: new FormData() })).status === 410);
  const pj = await J(await fetch(B + '/api/market/partners'));
  ok('public partner list has no tel/LINE', !JSON.stringify(pj).includes('"tel"') && !JSON.stringify(pj).includes('"line_id"'));
  ok('push unsubscribe needs device key', (await J(await fetch(B + '/api/push', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: 'https://fcm.googleapis.com/x' }) }))).ok === true);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
