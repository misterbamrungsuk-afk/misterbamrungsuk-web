// แก้ตาม Canva "Update MB" (26 ต.ค. 2569): เอกสารไม่ครบเปิดรับงานได้แต่ถอนไม่ได้ · ลิงก์ Recruit ฟรี/เสียเงิน
// · ยอดเงินเข้า กดแถว → ผู้สมัครคนนั้น + ดูสลิป · การ์ดผู้สมัครมีชื่อเล่น + สถานะขึ้นหน้าแรก · แอดมินดูหน้าโปรไฟล์ผู้สมัคร
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
const tok = (mb) => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600_000 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); };
const publicId = (mb) => 'r' + crypto.createHash('sha256').update(`mb-public:${mb}`).digest('hex').slice(0, 10);
const un = (h) => h.replace(/<!-- -->/g, '').replace(/\\"/g, '"');

(async () => {
  // ── ลิงก์ Recruit 2 แบบ ──
  const S = (body) => fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify(body) }).then(J);
  const rep = (await S({ action: 'rep_create', name: 'ลิงก์ สองแบบ', phone: '0855555555', bank: { bank: 'กสิกร', account: '1234567811', name: 'ลิงก์' } })).rep;
  const uname = 'twolink' + String(Date.now()).slice(-6);
  const li = await S({ action: 'rep_login', id: rep.id, username: uname });
  const lr = await fetch(B + '/api/sales/login', { method: 'POST', headers: ORIGIN, body: JSON.stringify({ username: uname, password: li.login.password }) });
  const sc = (lr.headers.get('set-cookie') || '').split(';')[0];
  let h = un(await (await fetch(B + '/sales/me', { headers: { cookie: sc } })).text());
  ok('recruit: paid + free links', h.includes('data-recruit-link="rlink"') && h.includes('data-recruit-link="rfree"') && h.includes(`/join/s/${rep.code}?g=tom`) && h.includes('ลิงก์สมัครฟรี') && h.includes('ลิงก์สมัครแบบเสียเงิน'));
  let r = await fetch(B + `/join/s/${rep.code}?g=tom`, { redirect: 'manual' });
  ok('free link → /join/tom + recruit cookie', /\/join\/tom$/.test(r.headers.get('location') || '') && (r.headers.get('set-cookie') || '').includes('mb_sm=' + rep.code));

  // ── ผู้สมัครจ่ายเงิน · เอกสาร KYC ยังไม่ส่ง · มีรูป → เปิดรับงานได้ ──
  const tel = '06' + String(Date.now()).slice(-8);
  const s = await J(await fetch(B + '/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel }) }));
  let jar = '';
  if (s.devCode) { const v = await fetch(B + '/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel, code: s.devCode }) }); jar = (v.headers.get('set-cookie') || '').split(';')[0]; }
  const reg = await J(await fetch(B + '/api/join/register', { method: 'POST', headers: { cookie: jar, 'x-forwarded-for': '10.49.0.1' }, body: form({ package: 'A', first_name: 'เอกสาร', last_name: 'ไม่ครบ', nickname: 'ต้นกล้า', tel, email: `nokyc${tel}@test.local`, password: 'nokyc-' + tel, accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true' }, { slip: new File([img], 's.jpg', { type: 'image/jpeg' }) }) }));
  ok('registered', !!reg.mb_code, JSON.stringify(reg));
  const mb = reg.mb_code, T = tok(mb);
  const list = un(await (await fetch(B + '/admin/applicants', { headers: ADM })).text());
  const at = list.indexOf('"mb_code":"' + mb + '"');
  const id = [...list.slice(Math.max(0, at - 8000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)].pop()?.[1];
  await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ status: 'verified' }) });
  await fetch(B + '/api/join/photos', { method: 'POST', body: form({ mb, t: T }, { file: new File([img], 'p.jpg', { type: 'image/jpeg' }) }) });
  r = await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ listed: true }) });
  const lj = await J(r);
  ok('listing allowed without KYC', r.status === 200 && lj.row?.listed === true && lj.row?.kyc_status !== 'approved', JSON.stringify(lj).slice(0, 160));
  h = await (await fetch(B + '/')).text();
  ok('appears on home page', h.includes(publicId(mb)));
  h = un(await (await fetch(B + `/join/profile/${mb}?t=${encodeURIComponent(T)}`)).text());
  ok('PT hub: active + warns cannot withdraw', h.includes('data-kyc-pay-warn') && h.includes('เบิก/ถอนเงินไม่ได้'));
  r = await fetch(B + '/api/pt/wallet', { method: 'POST', headers: JSONH, body: JSON.stringify({ mb, t: T, amount: 500 }) });
  const wj = await J(r);
  ok('withdraw refused until documents pass', !wj.ok && /เอกสาร/.test(wj.error || ''), `${r.status} ${wj.error}`);

  // ── หน้าผู้สมัคร: ?q= · ชื่อเล่น · สถานะขึ้นหน้าแรก · หมายเหตุถอนไม่ได้ ──
  h = un(await (await fetch(B + `/admin/applicants?q=${mb}`, { headers: ADM })).text());
  ok('?q= prefills search', h.includes(`value="${mb}"`) || h.includes(`"initialQ":"${mb}"`));
  ok('card shows nickname + listed state', h.includes('data-nick') && h.includes('(ต้นกล้า)') && h.includes('data-listed="1"') && h.includes('เปิดรับงาน'));
  ok('panel notes no withdraw before KYC', h.includes('data-kyc-pay-note'));
  ok('panel has view-profile button', h.includes(`/api/admin/applicants/${id}/preview`));

  // ── ดูหน้าโปรไฟล์ผู้สมัคร (แอดมิน · ไม่ตั้งคุกกี้ · ไม่บันทึกผู้ออกลิงก์) ──
  r = await fetch(B + `/api/admin/applicants/${id}/preview`, { headers: ADM, redirect: 'manual' });
  const loc = r.headers.get('location') || '';
  ok('preview → applicant profile page with token', r.status === 303 && loc.includes(`/join/profile/${mb}?t=`) && !(r.headers.get('set-cookie') || '').includes('mb_resume'), `${r.status} ${loc.slice(0, 60)}`);
  h = un(await (await fetch(new URL(loc, B))).text());
  ok('preview page renders the PT profile', h.includes(mb) && h.includes('ต้นกล้า'));
  ok('preview needs admin', (await fetch(B + `/api/admin/applicants/${id}/preview`, { redirect: 'manual' })).status === 401);
  const row = (await J(await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) }))).row;
  ok('preview does not record link minter', !row?.link_by);

  // ── ยอดเงินเข้า: กดแถว → ผู้สมัครคนนั้น · ดูสลิป ──
  h = un(await (await fetch(B + '/admin/income', { headers: ADM })).text());
  ok('income row → applicant (?q=MB)', h.includes(`"href":"/admin/applicants?q=${mb}"`));
  ok('income row has slip link', h.includes('data-income-slip') && h.includes('/api/admin/applicants/file?path='));
  const slipUrl = (h.match(/"slip":"(\/api\/admin\/applicants\/file\?path=[^"]+)"/) || [])[1];
  r = slipUrl ? await fetch(B + slipUrl.replace(/\\u0026/g, '&'), { headers: ADM }) : null;
  ok('slip image opens for admin', !!r && r.status === 200 && /^image\//.test(r.headers.get('content-type') || ''), r ? String(r.status) : 'no url');

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
