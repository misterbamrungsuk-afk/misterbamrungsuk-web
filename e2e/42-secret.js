// ระดับ Secret (บอสสั่ง 22 ต.ค. 2569): ลิงก์เชิญ Secret แยก · ปกลิงก์ "คำเชิญพิเศษสำหรับ Secret เท่านั้น" · สมัครฟรี
// · tier = secret · ราคา 3 ชม. แอดมินตั้งรายคน · หน้าแรก/โปรไฟล์ป้าย SECRET กรอบดำเรืองแสง ขึ้นก่อน TOP · ราคาจองใช้ราคา Secret
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
const sess = (sub, email) => { const b = Buffer.from(JSON.stringify({ sub, email, exp: Date.now() + 3600e3 })).toString('base64url'); return 'hamoo_session=' + b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const form = (o, files = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); for (const [k, v] of Object.entries(files)) f.set(k, v); return f; };
const publicId = (mb) => 'r' + crypto.createHash('sha256').update(`mb-public:${mb}`).digest('hex').slice(0, 10);

(async () => {
  const exp = new Date(Date.now() + 7 * 86400e3).toISOString().slice(0, 10);
  const sec = (await J(await fetch(B + '/api/admin/invites', { method: 'POST', headers: ADM, body: JSON.stringify({ name: 'e2e secret', limit: 2, expires: exp, kind: 'secret' }) }))).data;
  const nor = (await J(await fetch(B + '/api/admin/invites', { method: 'POST', headers: ADM, body: JSON.stringify({ name: 'e2e normal', limit: 2, expires: exp }) }))).data;
  ok('admin creates Secret invite', sec?.kind === 'secret' && !nor?.kind, JSON.stringify({ sec: sec?.kind, nor: nor?.kind }));

  // ปกลิงก์ + หน้าเชิญ
  let h = await (await fetch(B + '/join/i/' + sec.code)).text();
  ok('Secret invite: cover says Secret only', h.includes('og-secret.jpg') && h.includes('คำเชิญพิเศษสำหรับ Secret เท่านั้น') && h.includes('data-secret-hero'));
  h = await (await fetch(B + '/join/i/' + nor.code)).text();
  ok('normal invite keeps its own cover', h.includes('og-invite.jpg') && !h.includes('og-secret.jpg') && !h.includes('data-secret-hero'));
  const iv = await J(await fetch(B + '/api/join/invite?code=' + sec.code));
  ok('invite API flags secret', iv.ok && iv.secret === true, JSON.stringify(iv));

  // สมัครผ่านลิงก์ Secret → ฟรี · tier secret
  const tel = '06' + String(Date.now()).slice(-8);
  const s = await J(await fetch(B + '/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel }) }));
  let jar = '';
  if (s.devCode) { const v = await fetch(B + '/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel, code: s.devCode }) }); jar = (v.headers.get('set-cookie') || '').split(';')[0]; }
  const reg = await J(await fetch(B + '/api/join/register', { method: 'POST', headers: { cookie: jar, 'x-forwarded-for': '10.9.9.9' }, body: form({ package: 'A', invite: sec.code, first_name: 'ลับ', last_name: 'สุด', nickname: 'ซีเคร็ต', tel, email: `sec${tel}@test.local`, password: 'sec-' + tel, accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true' }) }));
  ok('Secret registers (MBM-)', /^MBM-\d{7}$/.test(reg.mb_code || ''), JSON.stringify(reg));
  const mb = reg.mb_code, T = tok(mb);
  const list = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const at = list.indexOf('"mb_code":"' + mb + '"');
  const id = [...list.slice(Math.max(0, at - 6000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)].pop()?.[1];
  const P = (body) => fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify(body) }).then(J);
  let row = (await P({ line_joined: false })).row;
  ok('Secret: free · verified · tier secret · track B', row?.package === 'B' && row?.amount === 0 && row?.status === 'verified' && row?.tier === 'secret' && row?.invite === sec.code, `${row?.amount} ${row?.status} ${row?.tier}`);

  // ใบสมัคร (รูป) → KYC อนุมัติ → ขึ้นหน้าแรกอัตโนมัติ
  const pf = await J(await fetch(B + '/api/join/profile', { method: 'POST', body: form({ mb, t: T, step: '1', disclose: 'yes', first_name: 'ลับ', last_name: 'สุด', nickname: 'ซีเคร็ต', birthdate: '1995-05-05', line_id: 'x', address: 'อโศก', areas: 'กรุงเทพฯ › วัฒนา' }, { photo: new File([img], 'a.jpg', { type: 'image/jpeg' }), other_doc: new File([img], 'b.jpg', { type: 'image/jpeg' }) }) }));
  ok('Secret fills form with photos (same docs as others)', pf.ok, JSON.stringify(pf));
  // ลิงก์เชิญ (สาย A) แนบใบนวดได้ในใบสมัครขั้น 2 → เลือกสกิลนวดได้ → หน้าแรกขึ้น "นวดผ่อนคลาย"
  let fh = await (await fetch(B + `/join/form/${mb}?step=2&t=${encodeURIComponent(T)}`)).text();
  ok('invite (A) form step 2 has massage cert upload', fh.includes('data-cert-upload'));
  const s2 = await J(await fetch(B + '/api/join/profile', { method: 'POST', body: form({ mb, t: T, step: '2', hours_band: '5–6 ชม.', ack_hours: 'true', ack_no_refuse: 'true', week_days: 'ศ', periods: 'กลางคืน' }, { cert_doc: new File([img], 'c.jpg', { type: 'image/jpeg' }) }) }));
  ok('cert uploaded on A track', s2.ok, JSON.stringify(s2));
  const cd = await J(await fetch(B + '/api/join/profile', { method: 'POST', body: (() => { const f = form({ mb, t: T, step: 'card' }); for (const v of ['คาเฟ่', 'นวดผ่อนคลาย']) f.append('activities', v); for (const v of ['massage', 'photo']) f.append('skills', v); f.append('places', 'คาเฟ่ / ร้านอาหาร'); return f; })() }));
  ok('massage skill kept with cert', cd.ok && !(cd.dropped || []).length, JSON.stringify(cd));
  h = await (await fetch(B + '/join/i/' + sec.code)).text();
  ok('invite page shows เพื่อนกินเที่ยว · พร้อมทักษะการนวด', h.includes('data-invite-tracks') && h.includes('เพื่อนกินเที่ยว · พร้อมทักษะการนวด'));
  row = (await P({ kyc_status: 'approved' })).row;
  ok('Secret without price: KYC approve does NOT list yet', row?.listed === false && row?.secret_price == null, `${row?.listed} ${row?.secret_price}`);
  const lst = await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ listed: true }) });
  ok('manual list refused until price set', lst.status === 400, String(lst.status));
  // แอดมินตั้งราคา Secret
  row = (await P({ tier: 'secret', secret_price: 12000 })).row;
  ok('admin sets Secret price', row?.tier === 'secret' && row?.secret_price === 12000, `${row?.tier} ${row?.secret_price}`);
  const bad = await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ tier: 'secret', secret_price: -5 }) });
  ok('bad price refused', bad.status === 400, String(bad.status));

  ok('price set → auto listed', row?.listed === true, String(row?.listed));


  const pid = publicId(mb);
  h = await (await fetch(B + '/')).text();
  const cardAt = h.indexOf(`/p/${pid}`);
  ok('home: Secret card with glow frame', cardAt > 0 && /data-secret="1"/.test(h.slice(Math.max(0, cardAt - 400), cardAt + 400)), String(cardAt));
  ok('home: certified A-track PT listed with นวดผ่อนคลาย', /นวดผ่อนคลาย/.test(h.slice(cardAt, cardAt + 3000)), h.slice(cardAt, cardAt + 3000).match(/[ก-๙ &·]+ · [ก-๙ &·]+/)?.[0]);
  ok('home: SECRET badge + price 12,000', h.includes('>SECRET<') && h.includes('12,000'));
  // Secret ขึ้นก่อนคนจริงที่ไม่ใช่ Secret (เช่น MBM-2610001 จาก 01–06)
  const other = h.indexOf(`/p/${publicId('MBM-2610001')}`);
  ok('home: Secret before other real PTs', other < 0 || cardAt < other, `${cardAt} vs ${other}`);
  h = await (await fetch(B + `/p/${pid}`)).text();
  ok('profile: Secret shows silhouette, no real photos', /s-[mt][12]\.jpg/.test(h) && !h.includes(`pt-photo?id=${pid}`));
  ok('real Secret photo not public', (await fetch(B + `/api/public/pt-photo?id=${pid}&i=0`)).status === 404);
  ok('profile: SECRET badge + Secret tier + glow', h.includes('data-tier="secret"') && h.includes('>Secret<') && h.includes('secret-glow'));

  // PT hub + ราคาจอง
  h = await (await fetch(B + `/join/profile/${mb}?t=${encodeURIComponent(T)}`)).text();
  ok('PT hub: SECRET badge + status line', h.includes('data-tier="secret"') && h.includes('ระดับ Secret'));
  const C1 = { cookie: sess('demo:buyer@test.local', 'buyer@test.local'), 'content-type': 'application/json' };
  const soon = new Date(Date.now() + 26 * 3600e3).toISOString();
  const bk = await J(await fetch(B + '/api/bookings', { method: 'POST', headers: C1, body: JSON.stringify({ pid, hours: 3, starts_at: soon, place: { type: 'cafe', detail: 'คาเฟ่ทดสอบ Secret' }, note: '' }) }));
  // ลูกค้าทดสอบเงินอาจไม่พอ → ดูยอดที่ระบบคิด (need · สตางค์) แทน: ราคา Secret 12,000 ต้องถูกใช้ (ไม่ใช่ราคา TOP/Silver)
  const need = bk.need ?? bk.data?.need;
  if (/บ่อยเกินไป/.test(bk.error || '')) console.log('SKIP booking price check (customer rate-limited in long runs)'); else ok('booking priced at Secret rate', bk.ok || (typeof need === 'number' && need >= 1200000 && need < 1400000), JSON.stringify(bk).slice(0, 240));

  // แอดมินย้ายสาย A ↔ B เองได้
  row = (await P({ package: 'A' })).row;
  ok('admin moves track → A', row?.package === 'A', row?.package);
  row = (await P({ package: 'B' })).row;
  ok('admin moves track → B', row?.package === 'B', row?.package);
  ok('bad track refused', (await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ package: 'C' }) })).status === 400);
  h = await (await fetch(B + '/admin/applicants', { headers: ADM })).text();
  ok('admin drawer has track buttons', h.includes('data-set-package="B"'));
  // แอดมินเปลี่ยนกลับเป็น TOP ได้
  row = (await P({ tier: 'top' })).row;
  ok('admin can switch Secret → TOP', row?.tier === 'top');
  h = await (await fetch(B + '/admin/invites', { headers: ADM })).text();
  ok('admin invites shows SECRET tag + kind picker', h.includes('SECRET') && h.includes('data-invite-kind="secret"'));

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
