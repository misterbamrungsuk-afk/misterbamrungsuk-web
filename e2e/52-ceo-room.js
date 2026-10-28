// ห้อง CEO (28 ต.ค. 2569): /admin/payroll เข้าได้เฉพาะ CEO · สรุปเงินเข้า + เงินแต่ละคน + คิวอนุมัติ
// · แอดมินอื่นดูข้อมูลชุดเดียวกันที่ /admin/ceo-view แต่ไม่มีปุ่มอนุมัติ (API ปฏิเสธ 403)
const { adm, sup } = require('./_tok');
const B = 'http://localhost:3210';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const SUP = { cookie: 'mord_admin=' + sup, 'content-type': 'application/json' };
const un = (h) => h.replace(/<!-- -->/g, '').replace(/\\"/g, '"');
const page = async (u, h) => { const r = await fetch(B + u, { headers: h, redirect: 'manual' }); return { r, h: r.status === 200 ? un(await r.text()) : '' }; };

(async () => {
  // CEO
  let { r, h } = await page('/admin/payroll', ADM);
  ok('CEO opens CEO room', r.status === 200 && h.includes('ห้อง CEO'));
  ok('summary cards', ['income', 'waiting', 'requested', 'approved', 'available'].every((k) => h.includes(`data-ceo-card="${k}"`)) && h.includes('data-ceo-summary'));
  ok('people table with 4 tabs', h.includes('data-ceo-people') && ['parttime', 'sales', 'partner', 'vendor'].every((k) => h.includes(`data-ceo-people-tab="${k}"`)));
  ok('people rows present (seeded money)', h.includes('data-ceo-person="parttime"'));
  ok('queues: earnings + stays + withdrawals', h.includes('1 · อนุมัติเงินเข้ากระเป๋า') && h.includes('data-stay-queue') && h.includes('2 · อนุมัติคำขอถอนเงิน'));
  ok('CEO nav: CEO room only (no view-only page)', h.includes('href="/admin/payroll"') && !h.includes('href="/admin/ceo-view"'));

  // super / finance
  ({ r } = await page('/admin/payroll', SUP));
  ok('super cannot open CEO room', r.status >= 300 && r.status < 400 && (r.headers.get('location') || '').includes('denied=1'), `${r.status} ${r.headers.get('location')}`);
  ({ r, h } = await page('/admin/ceo-view', SUP));
  ok('super opens view-only room', r.status === 200 && h.includes('data-ceo-readonly') && h.includes('data-ceo-summary') && h.includes('data-ceo-people'));
  ok('view-only: no approve buttons', !h.includes('data-ceo-approve') && !h.includes('data-recruit-bonus-compute'));
  ok('super nav: view-only link, no CEO room link', h.includes('href="/admin/ceo-view"') && !h.includes('href="/admin/payroll"'));
  const dash = un(await (await fetch(B + '/admin', { headers: SUP })).text());
  ok('super dashboard queues link to view-only', !dash.includes('href="/admin/payroll"'));
  const P = (u, b) => fetch(B + u, { method: 'POST', headers: SUP, body: JSON.stringify(b) }).then((x) => x.status);
  ok('super approve earnings → 403', (await P('/api/admin/payroll', { all: true })) === 403);
  ok('super approve withdrawal → 403', [401, 403].includes(await P('/api/admin/withdrawals', { action: 'approve', id: 'x' })));
  ok('super approve owner payout → 403', [401, 403].includes(await P('/api/admin/payout-requests', { action: 'approve', id: 'x' })));
  ok('super approve bonus → 403', (await P('/api/admin/recruit-bonus', { action: 'approve', id: 'x' })) === 403);

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
