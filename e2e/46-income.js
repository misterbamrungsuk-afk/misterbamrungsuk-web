// หลังบ้านแบ่ง 4 ระบบ + ยอดเงินเข้า (บอส/SIRI 24 ต.ค. 2569): เมนูมีหัวข้อระบบ · หน้า /admin/income บอกว่าใครโอน จากระบบไหน
const WEB = require('path').join(__dirname, '..');
const fs = require('fs');
const { adm } = require('./_tok');
const B = 'http://localhost:3210';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json();
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const JSONH = { 'content-type': 'application/json' };
const img = fs.readFileSync(WEB + '/public/brand/home/p-benz.jpg');
const form = (o, files = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); for (const [k, v] of Object.entries(files)) f.set(k, v); return f; };

(async () => {
  // สมัครฟรีทุกสาย (28 ต.ค. 2569): ผู้สมัครไม่มีเงินเข้า → ไม่ขึ้นในยอดเงินเข้า
  const tel = '06' + String(Date.now()).slice(-8);
  const s = await J(await fetch(B + '/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel }) }));
  let jar = '';
  if (s.devCode) { const v = await fetch(B + '/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel, code: s.devCode }) }); jar = (v.headers.get('set-cookie') || '').split(';')[0]; }
  const reg = await J(await fetch(B + '/api/join/register', { method: 'POST', headers: { cookie: jar, 'x-forwarded-for': '10.6.6.1' }, body: form({ package: 'A', first_name: 'โอนเงิน', last_name: 'ทดสอบ', nickname: 'โอน', tel, email: `in${tel}@test.local`, password: 'in-' + tel, accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true' }, { slip: new File([img], 's.jpg', { type: 'image/jpeg' }) }) }));
  ok('applicant registered (free)', !!reg.mb_code, JSON.stringify(reg));

  let h = (await (await fetch(B + '/admin/income', { headers: ADM })).text()).replace(/<!-- -->/g, '');
  ok('income page: summary per system', h.includes('data-income-summary') && ['parttime', 'partner', 'collab', 'market', 'customer'].every((k) => h.includes(`data-income-system="${k}"`)));
  ok('income: free signup not listed (no money in)', !h.includes(reg.mb_code));
  ok('income: customer top-ups listed (from earlier suites)', h.includes('data-income-row="customer"') || !h.includes('เติมเงินกระเป๋า'));

  // เติมเงินลูกค้า (จากชุดก่อน) ที่อนุมัติแล้ว = เข้าแล้ว
  ok('approved top-up shows เข้าแล้ว', !h.includes('data-income-row="customer"') || h.includes('เข้าแล้ว'));

  // เมนูแบ่งระบบ + ปุ่มระบบที่หน้าภาพรวม + Collab
  h = await (await fetch(B + '/admin', { headers: ADM })).text();
  ok('nav grouped by system', ['ระบบ Part-Time', 'ระบบ Partner สปา · โรงแรม', 'ระบบ Collab · MB x Bars', 'ระบบร้านค้า Marketplace'].every((g) => h.includes(g)) && h.includes('data-nav-group'));
  ok('overview: system buttons', h.includes('data-admin-systems') && h.includes('href="/admin/income"') && h.includes('href="/admin/collab"'));
  ok('collab page exists', (await fetch(B + '/admin/collab', { headers: ADM })).status === 200);
  ok('income needs admin', (await fetch(B + '/admin/income', { redirect: 'manual' })).status !== 200);

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
