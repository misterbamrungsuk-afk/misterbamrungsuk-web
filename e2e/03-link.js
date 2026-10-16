// #35 ลิงก์เข้าโปรไฟล์: แอดมินสร้างลิงก์ → เครื่องใหม่ (ไม่มีคุกกี้) เปิด /join/go → ได้คุกกี้ → เข้าโปรไฟล์ได้ (โหมดเดโม · ต้องมี MB-2610001 จาก fix-e2e)
const WEB = require('path').join(__dirname, '..');
const { adm } = require('./_tok');
const B = 'http://localhost:3210', mb = 'MB-2610001';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
(async () => {
  const l = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const at = l.indexOf('"mb_code":"' + mb + '"');
  const id = [...l.slice(Math.max(0, at - 6000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)].pop()[1];
  let r = await fetch(B + `/api/admin/applicants/${id}/link`, { method: 'POST' }); ok('no admin → 401', r.status === 401);
  r = await fetch(B + `/api/admin/applicants/${id}/link`, { method: 'POST', headers: ADM }); const j = await r.json();
  ok('admin gets link', r.status === 200 && j.url.includes('/join/go?t='), j.url.slice(0, 60));
  // เครื่องใหม่: ไม่มีคุกกี้
  r = await fetch(B + '/join/profile/' + mb); ok('new device blocked without link', (await r.text()).includes('ไม่มีสิทธิ์'));
  r = await fetch(j.url.replace(/^https?:\/\/[^/]+/, B), { redirect: 'manual' });
  const ck = (r.headers.getSetCookie?.() || []).find((c) => c.startsWith('mb_resume='));
  ok('go → redirect profile + cookie', r.status >= 300 && r.status < 400 && (r.headers.get('location') || '').includes('/join/profile/' + mb) && !!ck, r.headers.get('location'));
  const cookie = ck.split(';')[0];
  r = await fetch(B + '/join/profile/' + mb, { headers: { cookie } }); const h = await r.text(); ok('profile opens with new cookie', !h.includes('ไม่มีสิทธิ์') && h.includes(mb));
  // ตีกลับ → ลิงก์ไปหน้าแก้ไข
  await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ kyc_status: 'rejected', kyc_reason: { selfie: 'รูปไม่ชัด' } }) });
  const j2 = await (await fetch(B + `/api/admin/applicants/${id}/link`, { method: 'POST', headers: ADM })).json();
  ok('fix link → rejected page', j2.fix && j2.url.includes('to=rejected'));
  r = await fetch(j2.url.replace(/^https?:\/\/[^/]+/, B), { redirect: 'manual' }); ok('go → /join/rejected', (r.headers.get('location') || '').includes('/join/rejected/' + mb));
  r = await fetch(B + '/join/go?t=forged.token', { redirect: 'manual' }); ok('bad token → expired page', (r.headers.get('location') || '').includes('/join/go/expired'));
  r = await fetch(B + '/join/go/expired'); ok('expired page renders', (await r.text()).includes('ลิงก์หมดอายุ'));
  await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ kyc_status: 'approved' }) });
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
