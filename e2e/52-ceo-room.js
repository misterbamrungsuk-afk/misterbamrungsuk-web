// ห้อง CEO ลิงก์แยก (28 ต.ค. 2569): /ceo + รหัส CEO (แยกจากรหัสแอดมิน) · อนุมัติเงินได้ที่นี่เท่านั้น
// · แอดมินอื่นดูข้อมูลชุดเดียวกันที่ /admin/ceo-view (ไม่มีปุ่ม) · /admin/payroll เดิม → พาไปหน้าที่ถูก
const { adm, sup } = require('./_tok');
const { ceoCookie, CEO_PW } = require('./_ceo');
const B = 'http://localhost:3210';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const SUP = { cookie: 'mord_admin=' + sup, 'content-type': 'application/json' };
const un = (h) => h.replace(/<!-- -->/g, '').replace(/\\"/g, '"');
const page = async (u, h = {}) => { const r = await fetch(B + u, { headers: h, redirect: 'manual' }); return { r, h: r.status === 200 ? un(await r.text()) : '' }; };
const xff = () => '10.52.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250);
const P = (u, b, h = {}) => fetch(B + u, { method: 'POST', headers: { 'content-type': 'application/json', origin: B, 'x-forwarded-for': xff(), ...h }, body: JSON.stringify(b) });

(async () => {
  const CEO = await ceoCookie(); // ตั้งรหัสครั้งแรก (ถ้ายังไม่ตั้ง) + เข้าห้อง
  // หน้าเข้า
  let { r, h } = await page('/ceo');
  ok('/ceo without session = password gate', r.status === 200 && h.includes('data-ceo-gate="login"') && !h.includes('data-ceo-summary'));
  ok('setup refused once set', (await P('/api/ceo/password', { password: 'another-pass-123' }, { cookie: 'mord_admin=' + adm })).status === 401);
  ok('wrong CEO password → 401', (await P('/api/ceo/login', { password: 'wrong-pass-999' })).status === 401);
  ok('admin password is not the CEO password', (await P('/api/ceo/login', { password: 'demo1234' })).status === 401);
  r = await P('/api/ceo/login', { password: CEO_PW });
  ok('right CEO password → session cookie', r.status === 200 && (r.headers.get('set-cookie') || '').startsWith('mb_ceo='));
  ok('cross-site login refused', (await fetch(B + '/api/ceo/login', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body: JSON.stringify({ password: CEO_PW }) })).status === 403);

  // ในห้อง CEO
  ({ r, h } = await page('/ceo', { cookie: CEO }));
  ok('CEO room opens with CEO cookie only (no admin login)', r.status === 200 && h.includes('data-ceo-bar') && h.includes('data-ceo-summary'));
  ok('summary cards', ['income', 'waiting', 'requested', 'approved', 'available'].every((k) => h.includes(`data-ceo-card="${k}"`)));
  ok('people table with 4 tabs', h.includes('data-ceo-people') && ['parttime', 'sales', 'partner', 'vendor'].every((k) => h.includes(`data-ceo-people-tab="${k}"`)));
  ok('queues + approve buttons', h.includes('1 · อนุมัติเงินเข้ากระเป๋า') && h.includes('data-stay-queue') && h.includes('2 · อนุมัติคำขอถอนเงิน') && h.includes('data-ceo-approve'));
  ok('no admin menu inside CEO room', !h.includes('href="/admin/applicants"'));

  // อนุมัติ: ต้องมีคุกกี้ห้อง CEO
  ok('admin CEO account cannot approve', (await P('/api/admin/payroll', { all: true }, { cookie: 'mord_admin=' + adm })).status === 403);
  ok('CEO room can approve', (await (await P('/api/admin/payroll', { all: true }, { cookie: CEO })).json()).ok === true);
  ok('admin CEO account cannot approve withdrawal', (await P('/api/admin/withdrawals', { action: 'approve', id: 'x' }, { cookie: 'mord_admin=' + adm })).status === 403);
  ok('admin CEO account cannot approve payout', (await P('/api/admin/payout-requests', { action: 'approve', id: 'x' }, { cookie: 'mord_admin=' + adm })).status === 403);
  ok('admin CEO account cannot approve bonus', (await P('/api/admin/recruit-bonus', { action: 'approve', id: 'x' }, { cookie: 'mord_admin=' + adm })).status === 403);
  ok('admin CEO account cannot approve recruit payout', (await P('/api/admin/sales', { action: 'payout_approve', id: 'x' }, { cookie: 'mord_admin=' + adm })).status === 403);

  // ลิงก์เดิม / แอดมินอื่น
  ({ r } = await page('/admin/payroll', ADM));
  ok('admin CEO: /admin/payroll → /ceo', [307, 308].includes(r.status) && (r.headers.get('location') || '').endsWith('/ceo'), `${r.status} ${r.headers.get('location')}`);
  ({ r } = await page('/admin/payroll', SUP));
  ok('super: /admin/payroll → view-only', [307, 308].includes(r.status) && (r.headers.get('location') || '').endsWith('/admin/ceo-view'), `${r.status} ${r.headers.get('location')}`);
  ({ r, h } = await page('/admin/ceo-view', SUP));
  ok('super opens view-only room', r.status === 200 && h.includes('data-ceo-readonly') && h.includes('data-ceo-summary') && h.includes('data-ceo-people'));
  ok('view-only: no approve buttons', !h.includes('data-ceo-approve') && !h.includes('data-recruit-bonus-compute'));
  ok('super nav: view-only, not CEO link', h.includes('href="/admin/ceo-view"') && !h.includes('href="/ceo"'));
  ({ h } = await page('/admin', ADM));
  ok('admin CEO nav links to /ceo', h.includes('href="/ceo"'));
  ok('super cannot approve', (await P('/api/admin/payroll', { all: true }, { cookie: 'mord_admin=' + sup })).status === 403);

  // ออก
  r = await P('/api/ceo/logout', {}, { cookie: CEO });
  ok('logout clears cookie', r.status === 200 && /mb_ceo=;|mb_ceo=\s*;|Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(r.headers.get('set-cookie') || ''));

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
