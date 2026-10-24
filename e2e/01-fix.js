// ตีกลับเอกสาร: แอดมินตีกลับ สลิป+รูปหน้าตรง+หน้าบัตร → ผู้สมัครเห็น → แก้ทีละรายการ → กลับเป็นรอตรวจ (โหมดเดโม localhost:3210)
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const env = fs.readFileSync(WEB + '/.env.local', 'utf8');
let key = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(env)?.[1] || '').trim().replace(/^["']|["']$/g, '');
if (key.length < 32) key = 'mord-demo-only-admin-session-secret-not-for-production';
const b64 = (b) => Buffer.from(b).toString('base64url');
const atok = (role) => { const p = b64(JSON.stringify({ email: 'qa-demo@local.test', role, exp: Date.now() + 3600e3 })); return p + '.' + b64(crypto.createHmac('sha256', key).update(p).digest()); };
const ADM = { cookie: 'mord_admin=' + atok('super'), 'content-type': 'application/json' };
const B = 'http://localhost:3210';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const F = (n) => new File([img], n, { type: 'image/jpeg' });
let jar = '';
const keep = (r) => { for (const x of r.headers.getSetCookie?.() || []) { const kv = x.split(';')[0]; jar = jar.split('; ').filter((y) => y && !y.startsWith(kv.split('=')[0] + '=')).concat(kv).join('; '); } return r; };
const req = async (p, o = {}) => keep(await fetch(B + p, { ...o, redirect: 'manual', headers: { ...(o.headers || {}), cookie: jar } }));
const form = (o, files = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) [].concat(v).forEach((x) => f.append(k, x)); for (const [k, v] of Object.entries(files)) f.set(k, v); return f; };
const txt = async (p) => (await (await req(p)).text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
(async () => {
  const tel = '09' + String(Date.now()).slice(-8);
  const s = await (await req('/api/otp/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: tel }) })).json();
  await req('/api/otp/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: tel, code: s.devCode }) });
  const j = await (await req('/api/join/register', { method: 'POST', body: form({ package: 'A', first_name: 'แก้', last_name: 'ทดสอบ', nickname: 'ตีกลับ', tel, email: 'pt' + tel + '@test.local', password: 'test-pass-1234', accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true' }, { slip: F('s.jpg') }) })).json();
  const mb = j.mb_code; ok('register', !!mb, mb);
  await req('/api/join/profile', { method: 'POST', body: form({ mb, step: '1', disclose: 'yes', first_name: 'แก้', last_name: 'ทดสอบ', nickname: 'ตีกลับ', birthdate: '1999-03-03', line_id: 'x', address: 'อโศก', areas: ['กรุงเทพฯ › วัฒนา'] }, { photo: F('a.jpg'), other_doc: F('b.jpg') }) });
  await req('/api/join/profile', { method: 'POST', body: form({ mb, step: '2', hours_band: '5–6 ชม.', ack_hours: 'true', ack_no_refuse: 'true', week_days: ['ศ'], periods: ['กลางคืน'] }) });
  await req('/api/join/kyc', { method: 'POST', body: form({ mb }, { id_card: F('i.jpg'), id_copy: F('c.jpg'), selfie: F('f.jpg') }) });
  const list = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const at = list.indexOf('"mb_code":"' + mb + '"'); const ids = [...list.slice(Math.max(0, at - 6000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)]; const id = ids[ids.length - 1]?.[1];
  ok('admin list has queue tabs', list.includes('รอตรวจ') && list.includes('ตีกลับ · รอแก้'));

  let r = await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ kyc_status: 'rejected', kyc_reason: { slip: '' } }) });
  ok('reject needs a reason', r.status === 400);
  r = await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ kyc_status: 'rejected', kyc_reason: { slip: 'ยอดไม่ตรง', photo: 'รูปไม่ชัด', id_card: 'บัตรหมดอายุ', bogus: 'x' } }) });
  const rj = await r.json(); ok('admin sends back 3 items', r.status === 200 && Object.keys(rj.row.kyc_reason).length === 3, Object.keys(rj.row.kyc_reason).join(','));

  let h = await txt('/join/profile/' + mb); ok('profile banner', h.includes('ทีมงานขอให้แก้ไข 3 รายการ'));
  h = await txt('/join/rejected/' + mb); ok('rejected page lists reasons', h.includes('ยอดไม่ตรง') && h.includes('รูปไม่ชัด') && h.includes('บัตรหมดอายุ') && h.includes('แก้ไขรายการนี้'));
  h = await (await req('/join/rejected/' + mb)).text(); ok('fix links', h.includes(`/join/slip/${mb}?fix=1`) && h.includes(`/join/form/${mb}?fix=1`) && h.includes(`/join/kyc/${mb}?fix=1`));
  h = await txt(`/join/slip/${mb}`); ok('slip page shows reason', h.includes('ยอดไม่ตรง') && h.includes('ส่งสลิปให้ทีมงานตรวจ'));

  // แก้สลิป
  r = await req('/api/join/slip', { method: 'POST', body: form({ mb }, { slip: F('s2.jpg') }) }); ok('resend slip', r.status === 200);
  h = await txt('/join/profile/' + mb); ok('banner now 2', h.includes('ทีมงานขอให้แก้ไข 2 รายการ'));
  // แก้บัตร — ส่งแค่หน้าบัตร (เซลฟี/สำเนามีแล้ว)
  r = await req('/api/join/kyc', { method: 'POST', body: form({ mb }, { selfie: F('f.jpg') }) }); ok('kyc without the rejected id_card refused', r.status === 400);
  r = await req('/api/join/kyc', { method: 'POST', body: form({ mb }, { id_card: F('i2.jpg') }) }); ok('kyc only id_card accepted', r.status === 200, await r.text());
  // แก้รูปหน้าตรง
  r = await req('/api/join/profile', { method: 'POST', body: form({ mb, step: '1', disclose: 'yes', first_name: 'แก้', last_name: 'ทดสอบ', nickname: 'ตีกลับ', birthdate: '1999-03-03', line_id: 'x', address: 'อโศก', areas: ['กรุงเทพฯ › วัฒนา'] }, { photo: F('a2.jpg') }) });
  ok('photo fixed', r.status === 200);
  h = await txt('/join/rejected/' + mb); ok('all fixed page', h.includes('ส่งแก้ไขครบแล้ว'));
  h = await txt('/join/profile/' + mb); ok('banner gone', !h.includes('ทีมงานขอให้แก้ไข'));
  const row = (await (await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) })).json()).row;
  ok('status back to pending (no bank yet → none)', row.kyc_status === 'none' && !row.kyc_reason, row.kyc_status);

  // ตีกลับบัญชี + ข้อมูล หลังส่งบัญชีแล้ว → แก้บัญชีอย่างเดียวยังค้างข้อมูล
  r = await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ kyc_status: 'rejected', kyc_reason: { bank: 'ชื่อไม่ตรง', info: 'วันเกิดผิด' } }) });
  r = await req('/api/join/bank', { method: 'POST', body: form({ mb, bank: 'กสิกรไทย (KBank)', bank_account: '1234567890', bank_account_name: 'แก้ ทดสอบ', ck_terms: 'true', ck_pdpa: 'true', ck_profile: 'true' }, { bankbook: F('bb.jpg') }) });
  ok('bank save', r.status === 200, await r.text());
  h = await txt('/join/profile/' + mb); ok('bank fix keeps info pending', h.includes('ทีมงานขอให้แก้ไข 1 รายการ'));
  await req('/api/join/profile', { method: 'POST', body: form({ mb, step: '1', disclose: 'yes', first_name: 'แก้', last_name: 'ทดสอบ', nickname: 'ตีกลับ', birthdate: '1999-04-04', line_id: 'x', address: 'อโศก', areas: ['กรุงเทพฯ › วัฒนา'] }) });
  const row2 = (await (await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) })).json()).row;
  ok('all fixed with bank → submitted', row2.kyc_status === 'submitted', row2.kyc_status);
  r = await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ kyc_status: 'approved' }) }); ok('approve', r.status === 200);
  // สลิปผ่านแล้ว → ส่งสลิปใหม่ไม่ได้
  await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ status: 'verified' }) });
  r = await req('/api/join/slip', { method: 'POST', body: form({ mb }, { slip: F('s3.jpg') }) }); ok('slip resend blocked after verify', r.status === 409);
  // คนอื่นไม่มีสิทธิ์
  r = await fetch(B + '/api/join/slip', { method: 'POST', body: form({ mb }, { slip: F('s3.jpg') }) }); ok('no cookie → 403', r.status === 403);
  h = await (await fetch(B + '/join/rejected/' + mb)).text(); ok('rejected page needs cookie', h.includes('ไม่มีสิทธิ์'));
  console.log(fails ? `${fails} FAILED` : 'ALL PASS', mb);
})().catch((e) => console.log('ERR', e));
