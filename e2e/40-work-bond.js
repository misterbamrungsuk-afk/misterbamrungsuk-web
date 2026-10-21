// เงินประกันงาน (สายคำเชิญพิเศษ · บอสกำหนด 21 ต.ค. 2569): จบงาน → ปล่อยรายได้หัก ฿500 เข้า PT.bond
// · ครบ 90 วัน (ก้อนต่อก้อน) ย้ายเข้ายอดถอนได้ · ก่อนครบย้ายไม่ได้ · สายปกติไม่ถูกหัก · ledger รวม = 0
// ต้องรันหลัง 01–06 (ลูกค้า buyer@test.local มีเงิน · ปล่อยรายได้แบบ auto releaseHours=0 จาก 06)
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
const sess = (sub, email) => { const b = Buffer.from(JSON.stringify({ sub, email, exp: Date.now() + 3600e3 })).toString('base64url'); return 'hamoo_session=' + b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const C1 = { cookie: sess('demo:buyer@test.local', 'buyer@test.local'), 'content-type': 'application/json' };
const tok = (mb) => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600_000 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); };
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const form = (o, files = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); for (const [k, v] of Object.entries(files)) f.set(k, v); return f; };
const publicId = (mb) => 'r' + crypto.createHash('sha256').update(`mb-public:${mb}`).digest('hex').slice(0, 10);
const DAY = 86400e3;

(async () => {
  // ── สมัครผ่านลิงก์เชิญ (ฟรี · TOP) → อนุมัติ KYC + รูป → เปิดรับงาน ──
  const exp = new Date(Date.now() + 7 * DAY).toISOString().slice(0, 10);
  const inv = (await J(await fetch(B + '/api/admin/invites', { method: 'POST', headers: ADM, body: JSON.stringify({ name: 'e2e bond', limit: 1, expires: exp }) }))).data;
  const tel = '06' + String(Date.now()).slice(-8);
  const s = await J(await fetch(B + '/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel }) }));
  let jar = '';
  if (s.devCode) { const v = await fetch(B + '/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel, code: s.devCode }) }); jar = (v.headers.get('set-cookie') || '').split(';')[0]; }
  const reg = await J(await fetch(B + '/api/join/register', { method: 'POST', headers: { cookie: jar, 'x-forwarded-for': '10.7.7.7' }, body: form({ package: 'A', first_name: 'ประกัน', last_name: 'งาน', nickname: 'บอนด์', tel, email: `bond${tel}@test.local`, password: 'bond-' + tel, accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true', invite: inv.code }) }));
  ok('invite PT registered (free)', !!reg.mb_code, JSON.stringify(reg));
  const mb = reg.mb_code, T = tok(mb);
  const list = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const at = list.indexOf('"mb_code":"' + mb + '"');
  const id = [...list.slice(Math.max(0, at - 6000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)].pop()?.[1];
  await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ kyc_status: 'approved' }) });
  let r = await fetch(B + '/api/join/photos', { method: 'POST', body: form({ mb, t: T }, { file: new File([img], 'p.jpg', { type: 'image/jpeg' }) }) });
  ok('profile photo added', r.status === 200, String(r.status));
  r = await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ listed: true }) });
  ok('invite PT listed', r.status === 200, String(r.status));

  // สถานะเงินประกันเริ่มต้น
  let g = await J(await fetch(B + `/api/pt/bond?mb=${mb}&t=${encodeURIComponent(T)}`));
  ok('bond applies to invite PT · empty', g.ok && g.applies === true && g.balance === 0, JSON.stringify(g));

  // ── ลูกค้าจอง → รับงาน → เช็กอิน → จบงาน → ปล่อยรายได้ (auto · 06) ──
  const pid = publicId(mb);
  const soon = new Date(Date.now() + 65 * 60_000).toISOString();
  let j = await J(await fetch(B + '/api/bookings', { method: 'POST', headers: C1, body: JSON.stringify({ pid, hours: 3, starts_at: soon, place: { type: 'cafe', detail: 'คาเฟ่ทดสอบประกัน' }, note: '' }) }));
  ok('customer books invite PT', j.ok, j.error); const bid = j.id;
  const PT = (action) => fetch(B + `/api/pt/bookings/${bid}`, { method: 'POST', headers: JSONH, body: JSON.stringify({ mb, t: T, action }) });
  await PT('accept');
  ok('pt checkin', (await J(await PT('checkin'))).ok);
  await fetch(B + '/api/admin/bookings', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'demo_shift', id: bid, minutes: 240 }) });
  j = await J(await fetch(B + `/api/bookings/${bid}/complete`, { method: 'POST', headers: C1, body: JSON.stringify({ rating: 5 }) }));
  ok('customer completes', j.ok && j.status === 'completed', j.error);
  await fetch(B + '/api/admin/payroll', { method: 'POST', headers: ADM, body: JSON.stringify({ all: true }) }); // manual mode = แอดมินอนุมัติ · auto = ปล่อยแล้ว
  await fetch(B + `/api/pt/bookings?mb=${mb}&t=${encodeURIComponent(T)}`);
  const w = await J(await fetch(B + `/api/pt/wallet?mb=${mb}&t=${encodeURIComponent(T)}`));
  ok('earnings matured', w.pending === 0 && w.available > 0, `${w.pending} ${w.available}`);
  ok('฿500 held in bond', w.bond === 50000, String(w.bond));
  const hist = w.history.find((h) => h.kind === 'mature' && h.bucket === 'available');
  ok('available = share − 500', hist && w.available === hist.amount, `${hist?.amount}`);

  // ── ก่อนครบ 90 วัน ย้ายไม่ได้ · ครบแล้วย้ายได้ ──
  g = await J(await fetch(B + `/api/pt/bond?mb=${mb}&t=${encodeURIComponent(T)}`));
  ok('locked 90 days', g.balance === 50000 && g.matured === 0 && g.locked === 50000 && g.next && Math.abs(Date.parse(g.next.at) - Date.now() - 90 * DAY) < 2 * DAY, JSON.stringify(g));
  r = await fetch(B + '/api/pt/bond', { method: 'POST', headers: JSONH, body: JSON.stringify({ mb, t: T }) });
  ok('release before 90 days refused', r.status === 409, String(r.status));
  const later = new Date(Date.now() + 91 * DAY).toISOString();
  g = await J(await fetch(B + `/api/pt/bond?mb=${mb}&t=${encodeURIComponent(T)}&at=${later}`));
  ok('after 90 days: matured', g.matured === 50000 && g.locked === 0, JSON.stringify(g));
  j = await J(await fetch(B + '/api/pt/bond', { method: 'POST', headers: JSONH, body: JSON.stringify({ mb, t: T, at: later }) }));
  ok('release moves ฿500 to available', j.ok && j.moved === 50000 && j.balance === 0, JSON.stringify(j));
  const w2 = await J(await fetch(B + `/api/pt/wallet?mb=${mb}&t=${encodeURIComponent(T)}`));
  ok('available +500, bond 0', w2.available === w.available + 50000 && w2.bond === 0, `${w2.available} ${w2.bond}`);
  r = await fetch(B + '/api/pt/bond', { method: 'POST', headers: JSONH, body: JSON.stringify({ mb, t: T, at: later }) });
  ok('release again refused', r.status === 409);

  // ── หน้า + สายปกติไม่ถูกหัก + ledger ──
  let h = await (await fetch(B + `/join/profile/${mb}/earnings?t=${encodeURIComponent(T)}`)).text();
  ok('earnings page shows bond card', h.includes('data-bond-card') && h.includes('เงินประกันงาน'));
  const T0 = tok('MB-2610001');
  g = await J(await fetch(B + `/api/pt/bond?mb=MB-2610001&t=${encodeURIComponent(T0)}`));
  ok('normal PT: bond not applied', g.ok && g.applies === false && g.balance === 0, JSON.stringify(g));
  h = await (await fetch(B + `/join/profile/MB-2610001/earnings?t=${encodeURIComponent(T0)}`)).text();
  ok('normal PT: no bond card', !h.includes('data-bond-card'));
  h = await (await fetch(B + '/join/terms')).text();
  ok('terms mention work bond', h.includes('เงินประกันงาน') && h.includes('90 วัน'));
  const a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  ok('ledger balanced', a.sum === 0, String(a.sum));

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
