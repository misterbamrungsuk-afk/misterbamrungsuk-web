// โบนัส Recruit (24 ต.ค. 2569): ได้ค่าแนะนำครบทุก ๆ 5 คน → +฿1,000 (ซ้ำทุกรอบ · ไม่จ่ายซ้ำ)
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json();
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const JSONH = { 'content-type': 'application/json' };
const ORIGIN = { 'content-type': 'application/json', origin: B };
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const form = (o, files = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); for (const [k, v] of Object.entries(files)) f.set(k, v); return f; };
const S = (body) => fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify(body) }).then(J);

async function register(salesCookie, extra) {
  const tel = '06' + String(Date.now() + Math.floor(Math.random() * 1e6)).slice(-8);
  const s = await J(await fetch(B + '/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel }) }));
  let jar = '';
  if (s.devCode) { const v = await fetch(B + '/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel, code: s.devCode }) }); jar = (v.headers.get('set-cookie') || '').split(';')[0]; }
  const cookie = [jar, salesCookie].filter(Boolean).join('; ');
  return J(await fetch(B + '/api/join/register', { method: 'POST', headers: { cookie, 'x-forwarded-for': '10.5.' + (Math.random() * 200 | 0) + '.1' }, body: form({ first_name: 'หมอ', last_name: 'ชวน', nickname: 'หมอ' + tel.slice(-3), tel, email: `rc${tel}@test.local`, password: 'rc-' + tel, accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true', ...extra }, extra.invite ? {} : { slip: new File([img], 's.jpg', { type: 'image/jpeg' }) }) }));
}
async function idOf(mb) {
  const l = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const at = l.indexOf('"mb_code":"' + mb + '"');
  return [...l.slice(Math.max(0, at - 6000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)].pop()?.[1];
}

(async () => {
  const a = (await S({ action: 'rep_create', name: 'โบนัส รีครูท', phone: '0844444444', bank: { bank: 'กสิกร', account: '1234567800', name: 'โบนัส' } })).rep;
  const uname = 'bonus' + String(Date.now()).slice(-6);
  const li = await S({ action: 'rep_login', id: a.id, username: uname });
  const lr = await fetch(B + '/api/sales/login', { method: 'POST', headers: ORIGIN, body: JSON.stringify({ username: uname, password: li.login.password }) });
  const salesA = (lr.headers.get('set-cookie') || '').split(';')[0];
  const sm = 'mb_sm=' + a.code;
  const bal = async () => { const w = await J(await fetch(B + '/api/sales/me', { headers: { cookie: salesA } })); return w.summary?.available ?? w.available; };
  for (let i = 1; i <= 6; i++) {
    const r = await register(sm, { package: 'A' });
    const id = await idOf(r.mb_code);
    await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ status: 'verified' }) });
    if (i === 4) ok('4 people: 4 × ฿500, no bonus yet', (await bal()) === 200000, String(await bal()));
    if (i === 5) ok('5th person: + ฿500 + bonus ฿1,000', (await bal()) === 350000, String(await bal()));
    if (i === 6) ok('6th person: + ฿500 only', (await bal()) === 400000, String(await bal()));
  }
  // อนุมัติซ้ำไม่จ่ายโบนัสซ้ำ
  const h = (await (await fetch(B + '/sales/me', { headers: { cookie: salesA } })).text()).replace(/<!-- -->/g, '');
  ok('dashboard shows bonus progress', h.includes('data-recruit-bonus') && h.includes('โบนัสครบทุก 5 คน') && h.includes('ได้โบนัสแล้ว 1 ครั้ง'), (h.match(/ได้ค่าแนะนำแล้ว[^<]*/) || [])[0]);
  ok('history has bonus line', h.includes('โบนัส Recruit ครบ 5 คน'));
  const lw = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  ok('ledger balanced', lw.sum === 0, String(lw.sum));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
