// Active / Non Active (SIRI ขอ 24 ต.ค. 2569): แอดมินกด Non Active พร้อมเหตุผลลาออก + วันที่ลาออก
// · รหัสเดิมคงอยู่ (เลขรันต่อ ไม่นำกลับมาใช้) แสดง "Non Active" · ซ่อนจากหน้าแรก เปิดแสดงไม่ได้จนกว่าจะ Active · มีประวัติ
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
const tok = (mb) => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600_000 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); };
const img = fs.readFileSync(WEB + '/public/brand/home/p-benz.jpg');
const form = (o, files = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); for (const [k, v] of Object.entries(files)) f.set(k, v); return f; };
const publicId = (mb) => 'r' + crypto.createHash('sha256').update(`mb-public:${mb}`).digest('hex').slice(0, 10);

async function register(nick) {
  const exp = new Date(Date.now() + 7 * 86400e3).toISOString().slice(0, 10);
  const inv = (await J(await fetch(B + '/api/admin/invites', { method: 'POST', headers: ADM, body: JSON.stringify({ name: 'e2e active ' + nick, limit: 1, expires: exp }) }))).data;
  const tel = '06' + String(Date.now() + Math.floor(Math.random() * 1e5)).slice(-8);
  const s = await J(await fetch(B + '/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel }) }));
  let jar = '';
  if (s.devCode) { const v = await fetch(B + '/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel, code: s.devCode }) }); jar = (v.headers.get('set-cookie') || '').split(';')[0]; }
  return J(await fetch(B + '/api/join/register', { method: 'POST', headers: { cookie: jar, 'x-forwarded-for': '10.1.' + (Math.random() * 200 | 0) + '.9' }, body: form({ package: 'B', invite: inv.code, first_name: nick, last_name: 'ทดสอบ', nickname: nick, tel, email: `ac${tel}@test.local`, password: 'ac-' + tel, accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true' }) }));
}
async function idOf(mb) {
  const l = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const at = l.indexOf('"mb_code":"' + mb + '"');
  return [...l.slice(Math.max(0, at - 6000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)].pop()?.[1];
}

(async () => {
  const r1 = await register('แอค');
  const mb = r1.mb_code, T = tok(mb), id = await idOf(mb);
  const P = (body) => fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify(body) });
  await fetch(B + '/api/join/photos', { method: 'POST', body: form({ mb, t: T }, { file: new File([img], 'p.jpg', { type: 'image/jpeg' }) }) });
  let row = (await J(await P({ kyc_status: 'approved' }))).row;
  ok('PT live (listed)', row?.listed === true && !row?.inactive);
  const pid = publicId(mb);
  ok('profile public (live)', (await fetch(B + `/p/${pid}`)).status === 200);

  // Non Active ต้องมีเหตุผล + วันที่
  let res = await P({ active: false, resign_reason: '', resigned_at: '2026-10-24' });
  ok('Non Active needs reason', res.status === 400);
  res = await P({ active: false, resign_reason: 'ลาออกเอง', resigned_at: 'bad' });
  ok('Non Active needs date', res.status === 400);
  row = (await J(await P({ active: false, resign_reason: 'ลาออกเอง · ย้ายไปต่างจังหวัด', resigned_at: '2026-10-24' }))).row;
  ok('Non Active saved with reason + date, unlisted', row?.inactive?.reason === 'ลาออกเอง · ย้ายไปต่างจังหวัด' && row?.inactive?.at === '2026-10-24' && row?.listed === false && row?.mb_code === mb, JSON.stringify(row?.inactive));
  ok('hidden: public profile gone', (await fetch(B + `/p/${pid}`)).status === 404);
  res = await P({ listed: true });
  ok('cannot re-list while Non Active', res.status === 400);
  let h = await (await fetch(B + `/join/profile/${mb}?t=${encodeURIComponent(T)}`)).text();
  ok('PT hub shows Non Active', h.replace(/<!-- -->/g, '').includes('Non Active · ลาออก 2026-10-24'));
  h = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  ok('admin: Non Active tab + data', h.includes('Non Active') && h.includes('"inactive":{"reason":"ลาออกเอง'));

  // รหัสไม่ถูกนำกลับมาใช้: คนใหม่ได้เลขถัดไป
  const r2 = await register('ใหม่');
  const n = (c) => Number(c.slice(-3));
  ok('next applicant gets next code (no reuse)', n(r2.mb_code) > n(mb) && r2.mb_code !== mb, `${mb} → ${r2.mb_code}`);

  // กลับมา Active · ประวัติ 2 รายการ · เปิดแสดงได้อีก
  row = (await J(await P({ active: true }))).row;
  ok('back to Active · history kept', !row?.inactive && row?.active_log?.length === 2 && row.active_log[0].active === true && row.active_log[1].reason.startsWith('ลาออกเอง'), JSON.stringify(row?.active_log));
  res = await P({ listed: true });
  ok('can list again after Active', res.status === 200);
  ok('public again', (await fetch(B + `/p/${pid}`)).status === 200);

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
