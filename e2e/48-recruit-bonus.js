// Recruit (โปสเตอร์ Recruiter Program · 27 ต.ค. 2569): ค่าแนะนำ ฿500 เข้ากระเป๋าเมื่อผู้สมัครได้งานแรก (รวมแบบจ่ายเงิน)
// · โบนัสรายเดือนต่อผู้สมัคร 1 คน: 15 งาน ฿1,000 · 20 งาน ฿2,000 (แทน) → คิวรอ CEO อนุมัติ → อนุมัติแล้วเข้ากระเป๋า · ไม่สร้าง/จ่ายซ้ำ
// ต้องรันหลัง 01–06 (ปล่อยรายได้ตั้งค่าจาก 06)
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
const JSONH = { 'content-type': 'application/json' };
const ORIGIN = { 'content-type': 'application/json', origin: B };
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const form = (o, files = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); for (const [k, v] of Object.entries(files)) f.set(k, v); return f; };
const sess = (sub, email) => { const b = Buffer.from(JSON.stringify({ sub, email, exp: Date.now() + 3600e3 })).toString('base64url'); return 'hamoo_session=' + b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const tok = (mb) => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600_000 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); };
const publicId = (mb) => 'r' + crypto.createHash('sha256').update(`mb-public:${mb}`).digest('hex').slice(0, 10);
const strip = (h) => h.replace(/<!-- -->/g, '');
const monthTH = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7);

(async () => {
  // Recruit + ID
  const S = (body) => fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify(body) }).then(J);
  const rep = (await S({ action: 'rep_create', name: 'โบนัส เดือน', phone: '0866666666', bank: { bank: 'กสิกร', account: '1234567822', name: 'โบนัส' } })).rep;
  const uname = 'mbonus' + String(Date.now()).slice(-6);
  const li = await S({ action: 'rep_login', id: rep.id, username: uname });
  const lr = await fetch(B + '/api/sales/login', { method: 'POST', headers: ORIGIN, body: JSON.stringify({ username: uname, password: li.login.password }) });
  const sc = (lr.headers.get('set-cookie') || '').split(';')[0];
  const bal = async () => { const w = await J(await fetch(B + '/api/sales/me', { headers: { cookie: sc } })); return w.summary?.available ?? w.available; };

  // ผู้สมัครแบบจ่ายเงิน ผ่านลิงก์ Recruit → ชำระแล้ว → เปิดรับงาน
  const tel = '06' + String(Date.now()).slice(-8);
  const s = await J(await fetch(B + '/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel }) }));
  let jar = '';
  if (s.devCode) { const v = await fetch(B + '/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel, code: s.devCode }) }); jar = (v.headers.get('set-cookie') || '').split(';')[0]; }
  const reg = await J(await fetch(B + '/api/join/register', { method: 'POST', headers: { cookie: [jar, 'mb_sm=' + rep.code].join('; '), 'x-forwarded-for': '10.48.0.1' }, body: form({ package: 'A', first_name: 'งาน', last_name: 'เยอะ', nickname: 'ขยัน', tel, email: `busy${tel}@test.local`, password: 'busy-' + tel, accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true' }, { slip: new File([img], 's.jpg', { type: 'image/jpeg' }) }) }));
  const mb = reg.mb_code, T = tok(mb);
  const list = strip(await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const at = list.indexOf('"mb_code":"' + mb + '"');
  const id = [...list.slice(Math.max(0, at - 8000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)].pop()?.[1];
  let row = (await J(await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ status: 'verified' }) }))).row;
  ok('paid signup linked · not paid at verification', row?.sales_ref?.code === rep.code && !row?.recruit_at && (await bal()) === 0);
  await fetch(B + '/api/join/photos', { method: 'POST', body: form({ mb, t: T }, { file: new File([img], 'p.jpg', { type: 'image/jpeg' }) }) });
  await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ listed: true }) });

  // ลูกค้า 2 คน (โควตาจอง 10/ชม./คน) เติมเงิน
  const custs = [];
  for (let c = 0; c < 2; c++) {
    const em = `bonus${c}${tel}@test.local`;
    const C = { cookie: sess('demo:' + em, em), 'content-type': 'application/json' };
    await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { cookie: C.cookie }, body: form({ amount: '40000' }, { slip: new File([img], 't.jpg', { type: 'image/jpeg' }) }) });
    const tp = (await J(await fetch(B + '/api/admin/wallet', { headers: ADM }))).topups.find((t) => t.status === 'pending' && t.customer_email === em);
    if (tp) await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'approve', id: tp.id }) });
    custs.push(C);
  }
  // 16 งานจบในเดือนนี้
  let done = 0;
  for (let n = 1; n <= 16; n++) {
    const CU = custs[n % 2];
    const soon = new Date(Date.now() + (65 + n * 300) * 60_000).toISOString();
    const j = await J(await fetch(B + '/api/bookings', { method: 'POST', headers: CU, body: JSON.stringify({ pid: publicId(mb), hours: 3, starts_at: soon, place: { type: 'cafe', detail: 'คาเฟ่ ' + n }, note: '' }) }));
    if (!j.ok) { console.log('book fail', n, j.error); continue; }
    const PT = (action) => fetch(B + `/api/pt/bookings/${j.id}`, { method: 'POST', headers: JSONH, body: JSON.stringify({ mb, t: T, action }) });
    await PT('accept'); await PT('checkin');
    await fetch(B + '/api/admin/bookings', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'demo_shift', id: j.id, minutes: 240 + n * 300 }) });
    const c = await J(await fetch(B + `/api/bookings/${j.id}/complete`, { method: 'POST', headers: CU, body: JSON.stringify({ rating: 5 }) }));
    if (c.ok) done++;
    if (n === 1) {
      await fetch(B + '/api/admin/payroll', { method: 'POST', headers: ADM, body: JSON.stringify({ all: true }) });
      await fetch(B + `/api/pt/bookings?mb=${mb}&t=${encodeURIComponent(T)}`);
      ok('first job → recruit ฿500 (paid signup)', (await bal()) === 50000, String(await bal()));
    }
  }
  ok('16 jobs completed', done === 16, String(done));
  await fetch(B + '/api/admin/payroll', { method: 'POST', headers: ADM, body: JSON.stringify({ all: true }) });
  ok('only one ฿500 for many jobs', (await bal()) === 50000, String(await bal()));
  let h = strip(await (await fetch(B + '/sales/me', { headers: { cookie: sc } })).text());
  ok('dashboard: this-month jobs + reached ฿1,000', h.includes('เดือนนี้ 16 งาน') && h.includes('ถึงโบนัส ฿1,000'));

  // คำนวณโบนัส (เดือนนี้ในการทดสอบ) → รอ CEO
  const BON = (body) => fetch(B + '/api/admin/recruit-bonus', { method: 'POST', headers: ADM, body: JSON.stringify(body) }).then(J);
  let r = await BON({ action: 'compute', month: monthTH() });
  ok('compute creates 1 pending bonus', r.ok && r.created >= 1, JSON.stringify(r));
  r = await BON({ action: 'compute', month: monthTH() });
  ok('compute again creates none', r.ok && r.created === 0);
  ok('not paid before CEO approves', (await bal()) === 50000);
  h = strip(await (await fetch(B + '/admin/payroll', { headers: ADM })).text());
  ok('CEO page shows bonus queue', h.includes('data-recruit-bonus-queue') && h.includes('ขยัน') && h.includes('ทำ 16 งาน'));
  h = strip(await (await fetch(B + '/sales/me', { headers: { cookie: sc } })).text());
  ok('recruit sees bonus pending CEO', h.includes('data-recruit-bonus-history') && h.includes('รอ CEO อนุมัติ'));
  const bid = `${id}:${monthTH()}`;
  r = await BON({ action: 'reject', id: bid });
  ok('reject needs a reason', !r.ok);
  r = await BON({ action: 'approve', id: bid });
  ok('CEO approves ฿1,000', r.ok && r.bonus?.amount_satang === 100000 && r.bonus?.status === 'approved', JSON.stringify(r).slice(0, 160));
  ok('recruit wallet ฿500 + ฿1,000', (await bal()) === 150000, String(await bal()));
  r = await BON({ action: 'approve', id: bid });
  ok('approve twice refused · no double pay', !r.ok && (await bal()) === 150000);
  const lw = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  ok('ledger balanced', lw.sum === 0, String(lw.sum));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
