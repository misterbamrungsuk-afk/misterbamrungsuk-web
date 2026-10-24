// Recruit ชวนหมอ (บอสสั่ง 24 ต.ค. 2569 · รอบ 2): ลิงก์ /join/s/<โค้ด> → สมัครแล้วผูก Recruit · สมัครจ่ายเงิน ชำระแล้วได้ ฿500 · สมัครฟรีได้ตอนงานแรก (40-work-bond)
// · ทีมงานออก ID/รหัสผ่าน · Sale Man เข้าหลังบ้านของตัวเอง เห็นเฉพาะหมอที่ตัวเองชวน · ค่าตอบแทนครั้งเดียว · ledger สมดุล
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
  // CEO ตั้งค่าตอบแทนชวนหมอ
  let r;

  // สร้าง Sale Man 2 คน + ออก ID/รหัสผ่าน
  const a = (await S({ action: 'rep_create', name: 'เซลล์ เอ', phone: '0811111111', bank: { bank: 'กสิกร', account: '1234567890', name: 'เซลล์ เอ' } })).rep;
  const b2 = (await S({ action: 'rep_create', name: 'เซลล์ บี', phone: '0822222222', bank: { bank: 'กสิกร', account: '1234567891', name: 'เซลล์ บี' } })).rep;
  ok('2 Sale Man created', !!a?.code && !!b2?.code);
  const uname = 'sale' + String(Date.now()).slice(-6);
  const li = await S({ action: 'rep_login', id: a.id, username: uname });
  ok('admin issues ID/password (shown once)', li.ok && li.login?.username === uname && (li.login?.password || '').length === 10, JSON.stringify(li).slice(0, 120));
  const dup = await S({ action: 'rep_login', id: b2.id, username: uname });
  ok('duplicate ID refused', !dup.ok);
  const lb = await S({ action: 'rep_login', id: b2.id, username: uname + 'b' });

  // ล็อกอิน
  let res = await fetch(B + '/api/sales/login', { method: 'POST', headers: ORIGIN, body: JSON.stringify({ username: uname, password: 'wrong-pass' }) });
  ok('wrong password refused', res.status === 401);
  res = await fetch(B + '/api/sales/login', { method: 'POST', headers: ORIGIN, body: JSON.stringify({ username: uname.toUpperCase(), password: li.login.password }) });
  const salesA = (res.headers.get('set-cookie') || '').split(';')[0];
  ok('login with ID/password → session cookie', res.status === 200 && salesA.startsWith('mb_sales='), String(res.status));
  res = await fetch(B + '/api/sales/login', { method: 'POST', headers: ORIGIN, body: JSON.stringify({ username: uname + 'b', password: lb.login.password }) });
  const salesB = (res.headers.get('set-cookie') || '').split(';')[0];

  // ลิงก์ชวนหมอ → คุกกี้ mb_sm
  res = await fetch(B + '/join/s/' + a.code, { redirect: 'manual' });
  const sm = (res.headers.get('set-cookie') || '').split(';')[0];
  ok('recruit link sets mb_sm + goes to /join', res.status === 303 && sm === 'mb_sm=' + a.code && /\/join$/.test(res.headers.get('location') || ''), `${res.status} ${sm} ${res.headers.get('location')}`);
  res = await fetch(B + '/join/s/' + a.code + '?g=tom', { redirect: 'manual' });
  ok('recruit link ?g=tom → /join/tom', /\/join\/tom$/.test(res.headers.get('location') || ''));
  res = await fetch(B + '/join/s/ZZZZ9999', { redirect: 'manual' });
  ok('unknown code: no cookie', !(res.headers.get('set-cookie') || '').includes('mb_sm='));

  // หมอ 1: สาย B จ่ายเงิน → รอตรวจสลิป (ยังไม่ได้ค่าตอบแทน) → แอดมินอนุมัติ → ได้ ฿2,000
  const r1 = await register(sm, { package: 'B' });
  ok('doctor 1 registers via Sale Man link', !!r1.mb_code, JSON.stringify(r1));
  const id1 = await idOf(r1.mb_code);
  let me = await (await fetch(B + '/sales/me', { headers: { cookie: salesA } })).text();
  ok('Sale Man dashboard lists doctor (pending)', me.includes(r1.mb_code) && me.includes('data-recruit') && me.includes('ได้เมื่อหมอชำระค่าสมัคร'));
  const row1 = (await J(await fetch(B + '/api/admin/applicants/' + id1, { method: 'PATCH', headers: ADM, body: JSON.stringify({ status: 'verified' }) }))).row;
  ok('slip approved → recruit paid ฿500', row1?.recruit_satang === 50000 && !!row1?.recruit_at, `${row1?.recruit_satang} ${row1?.recruit_at}`);
  await fetch(B + '/api/admin/applicants/' + id1, { method: 'PATCH', headers: ADM, body: JSON.stringify({ status: 'verified' }) });
  const again = (await J(await fetch(B + '/api/admin/applicants/' + id1, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) }))).row;
  ok('re-approve does not pay twice', again?.recruit_satang === 50000);

  // หมอ 2: ลิงก์เชิญ (ฟรี) ผ่านลิงก์ Recruit → ผูกไว้ · ยังไม่จ่าย (ได้ตอนงานแรก)
  const exp = new Date(Date.now() + 7 * 86400e3).toISOString().slice(0, 10);
  const inv = (await J(await fetch(B + '/api/admin/invites', { method: 'POST', headers: ADM, body: JSON.stringify({ name: 'e2e recruit inv', limit: 1, expires: exp }) }))).data;
  const r2 = await register(sm, { package: 'A', invite: inv.code });
  const row2 = (await J(await fetch(B + '/api/admin/applicants/' + (await idOf(r2.mb_code)), { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) }))).row;
  ok('free signup → linked, paid later (first job)', !row2?.recruit_at && row2?.sales_ref?.code === a.code, `${row2?.recruit_satang}`);

  // หมอ 3: ไม่ผ่านลิงก์ → ไม่ผูก
  const r3 = await register('', { package: 'A' });
  const row3 = (await J(await fetch(B + '/api/admin/applicants/' + (await idOf(r3.mb_code)), { method: 'PATCH', headers: ADM, body: JSON.stringify({ status: 'verified' }) }))).row;
  ok('no link → no Sale Man', !row3?.sales_ref && !row3?.recruit_satang);

  // หลังบ้าน Sale Man: เห็นเฉพาะของตัวเอง · ยอดขอรับได้ = 2,500
  me = await (await fetch(B + '/sales/me', { headers: { cookie: salesA } })).text();
  ok('A sees own 2 doctors + amounts', me.includes(r1.mb_code) && me.includes(r2.mb_code) && !me.includes(r3.mb_code) && me.includes('ได้รับแล้ว') && me.includes('ได้เมื่อหมอได้งานแรก') && me.includes('/join/s/' + a.code));
  const meB = (await (await fetch(B + '/sales/me', { headers: { cookie: salesB } })).text()).replace(/<!-- -->/g, '');
  ok('B does not see A\'s doctors', !meB.includes(r1.mb_code) && !meB.includes(r2.mb_code) && meB.includes('สวัสดี เซลล์ บี'));
  const w = await J(await fetch(B + '/api/sales/me', { headers: { cookie: salesA } }));
  const avail = w.summary?.available ?? w.available;
  ok('A wallet available = ฿500', avail === 50000, JSON.stringify(w).slice(0, 200));
  const dash = (await (await fetch(B + '/sales/me', { headers: { cookie: salesA } })).text()).replace(/<!-- -->/g, '');
  ok('dashboard: summary (2 doctors) + wallet + withdraw-all + history', dash.includes('data-sales-summary') && dash.includes('2 คน') && dash.includes('data-sales-wallet') && dash.includes('เบิกทั้งหมด ฿500') && dash.includes('data-sales-history') && dash.includes('ค่าแนะนำ Recruit'));
  const pr = await J(await fetch(B + '/api/sales/me', { method: 'POST', headers: { cookie: salesA, ...JSONH }, body: JSON.stringify({ amount: 500 }) }));
  ok('A requests payout of recruit earnings', pr.ok, JSON.stringify(pr));

  const dash2 = (await (await fetch(B + '/sales/me', { headers: { cookie: salesA } })).text()).replace(/<!-- -->/g, '');
  ok('after withdraw: shows pending request, available ฿0', dash2.includes('รอ CEO อนุมัติ') && dash2.includes('กำลังโอน ฿500'));
  const av = await fetch(B + '/api/avatar', { method: 'POST', headers: { cookie: salesA, origin: B }, body: form({ as: 'sales' }, { file: new File([img], 'me.jpg', { type: 'image/jpeg' }) }) });
  const avg = await J(await fetch(B + '/api/avatar?as=sales', { headers: { cookie: salesA } }));
  ok('Sale Man uploads own profile photo', av.status === 200 && !!avg.avatar, `${av.status} ${JSON.stringify(avg)}`);
  // แอดมิน
  let h = (await (await fetch(B + '/admin/sales', { headers: ADM })).text()).replace(/<!-- -->/g, '');
  ok('admin sales: recruit counts + ID + rate inputs', h.includes('data-recruit-count') && h.includes('ID: ' + uname) && h.includes('data-recruit-rate') && h.includes('฿500 / คน ทุกแผน'));
  h = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text());
  ok('admin applicants: Sale badge (or sales_ref data)', h.includes('data-sales-ref') || h.replace(/\\"/g, '"').includes('"sales_ref":{"rep_id"'));
  h = await (await fetch(B + '/sales')).text();
  ok('/sales has ID/password login', h.includes('data-sales-login'));

  // ปิดโค้ด → ล็อกอินไม่ได้ · ลิงก์ไม่ผูก
  await S({ action: 'rep_toggle', id: a.id });
  res = await fetch(B + '/api/sales/login', { method: 'POST', headers: ORIGIN, body: JSON.stringify({ username: uname, password: li.login.password }) });
  ok('disabled Sale Man cannot log in', res.status === 401);
  await S({ action: 'rep_toggle', id: a.id });

  const lw = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  ok('ledger balanced', lw.sum === 0, String(lw.sum));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
