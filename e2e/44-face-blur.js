// เปิดเผยใบหน้า / เบลอหน้า (บอสสั่ง 24 ต.ค. 2569): ใบสมัครต้องเลือก ยอมรับเปิดเผย / ไม่สามารถเปิดเผย
// · ไม่เปิดเผยต้องติ๊กรับทราบ "มีผลต่อจำนวนงาน" · รูปสาธารณะถูกเบลอที่เซิร์ฟเวอร์ตามจุดที่ตั้ง · เปลี่ยนจุด/เปิดปิด = URL รุ่นใหม่
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const sharp = require(WEB + '/node_modules/sharp');
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
const img = fs.readFileSync(WEB + '/public/brand/home/p-ton.jpg');
const form = (o, files = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); for (const [k, v] of Object.entries(files)) f.set(k, v); return f; };
const publicId = (mb) => 'r' + crypto.createHash('sha256').update(`mb-public:${mb}`).digest('hex').slice(0, 10);
/** ความต่างของพิกเซลเฉลี่ยในกรอบ (สัดส่วน) ระหว่างสองรูป — ย่อให้เท่ากันก่อน */
async function diff(a, b, box) {
  const W = 200;
  const raw = async (buf) => sharp(buf).rotate().resize(W, W, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const [x, y] = await Promise.all([raw(a), raw(b)]);
  const [x0, y0, x1, y1] = box.map((v) => Math.round(v * W));
  let s = 0, n = 0;
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * W + xx) * 3; s += Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2]); n += 3; }
  return s / n;
}

(async () => {
  // สมัครผ่านลิงก์เชิญ (ฟรี · ยืนยันทันที)
  const exp = new Date(Date.now() + 7 * 86400e3).toISOString().slice(0, 10);
  const inv = (await J(await fetch(B + '/api/admin/invites', { method: 'POST', headers: ADM, body: JSON.stringify({ name: 'e2e blur', limit: 1, expires: exp }) }))).data;
  const tel = '06' + String(Date.now()).slice(-8);
  const s = await J(await fetch(B + '/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel }) }));
  let jar = '';
  if (s.devCode) { const v = await fetch(B + '/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel, code: s.devCode }) }); jar = (v.headers.get('set-cookie') || '').split(';')[0]; }
  const reg = await J(await fetch(B + '/api/join/register', { method: 'POST', headers: { cookie: jar, 'x-forwarded-for': '10.3.3.3' }, body: form({ package: 'B', invite: inv.code, first_name: 'เบลอ', last_name: 'หน้า', nickname: 'บลู', tel, email: `bl${tel}@test.local`, password: 'bl-' + tel, accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true' }) }));
  const mb = reg.mb_code, T = tok(mb);
  ok('registered', !!mb, JSON.stringify(reg));

  let h = await (await fetch(B + `/join/form/${mb}?t=${encodeURIComponent(T)}`)).text();
  ok('form step 1 has disclose choice', h.includes('data-disclose') && h.includes('ยอมรับเปิดเผยข้อมูล') && h.includes('ไม่สามารถเปิดเผยข้อมูล'));
  const step1 = (extra) => fetch(B + '/api/join/profile', { method: 'POST', body: form({ mb, t: T, step: '1', first_name: 'เบลอ', last_name: 'หน้า', nickname: 'บลู', birthdate: '1996-01-01', line_id: 'x', address: 'อโศก', areas: 'กรุงเทพฯ › วัฒนา', ...extra }, { photo: new File([img], 'a.jpg', { type: 'image/jpeg' }), other_doc: new File([img], 'b.jpg', { type: 'image/jpeg' }) }) });
  let r = await step1({});
  ok('no choice → refused', r.status === 400 && (await J(r)).fields?.includes('disclose'));
  r = await step1({ disclose: 'no', blur_ack: 'false' });
  ok('ไม่เปิดเผย without ack → refused', r.status === 400);
  r = await step1({ disclose: 'no', blur_ack: 'true' });
  ok('ไม่เปิดเผย + ack → saved', r.status === 200, String(r.status));

  const list = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const at = list.indexOf('"mb_code":"' + mb + '"');
  const id = [...list.slice(Math.max(0, at - 6000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)].pop()?.[1];
  let row = (await J(await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ kyc_status: 'approved' }) }))).row;
  ok('row: disclose no + ack · listed', row?.disclose === 'no' && row?.blur_ack === true && row?.listed === true, `${row?.disclose} ${row?.blur_ack} ${row?.listed}`);

  const up = await J(await fetch(B + '/api/join/photos', { method: 'POST', body: form({ mb, t: T }, { file: new File([img], 'p.jpg', { type: 'image/jpeg' }) }) }));
  ok('profile photo added', up.ok, JSON.stringify(up));
  // รูปสาธารณะเบลอ (กรอบหน้า default x50 y28 r24) · นอกกรอบเหมือนเดิม
  const pid = publicId(mb);
  const P = () => fetch(B + `/api/public/pt-photo?id=${pid}&i=0`).then((x) => x.arrayBuffer()).then((x) => Buffer.from(x));
  const blurred = await P();
  const face = [0.4, 0.2, 0.6, 0.36], corner = [0.0, 0.85, 0.15, 1.0];
  const dFace = await diff(img, blurred, face), dCorner = await diff(img, blurred, corner);
  ok('public photo: face area blurred, corner untouched', dFace > 6 && dCorner < 4, `face ${dFace.toFixed(1)} corner ${dCorner.toFixed(1)}`);
  h = await (await fetch(B + '/')).text();
  const v1 = new RegExp(`pt-photo\\?id=${pid}&amp;i=0&amp;v=([0-9a-f]{8})`).exec(h)?.[1];
  ok('home card URL carries version', !!v1, String(v1));

  // ตั้งจุดเบลอใหม่ (มุมล่างซ้าย) → กรอบหน้าไม่เบลอแล้ว · URL รุ่นเปลี่ยน
  h = await (await fetch(B + `/join/profile/${mb}/photos?t=${encodeURIComponent(T)}`)).text();
  ok('photos page: disclose panel + blur edit button', h.includes('data-disclose-panel') && h.includes('data-edit-blur'));
  const bl = await J(await fetch(B + '/api/join/photos', { method: 'POST', headers: JSONH, body: JSON.stringify({ mb, t: T, action: 'blur', index: 0, box: { x: 10, y: 90, r: 12 } }) }));
  ok('blur box saved', bl.ok && Object.values(bl.face_blur || {})[0]?.x === 10, JSON.stringify(bl).slice(0, 160));
  const moved = await P();
  ok('blur follows the box (face clear, corner blurred)', (await diff(img, moved, face)) < 4 && (await diff(img, moved, corner)) > 4);
  h = await (await fetch(B + '/')).text();
  const v2 = new RegExp(`pt-photo\\?id=${pid}&amp;i=0&amp;v=([0-9a-f]{8})`).exec(h)?.[1];
  ok('version changes with blur box', v2 && v2 !== v1, `${v1} → ${v2}`);

  // ยอมรับเปิดเผย → รูปเดิม
  let d = await J(await fetch(B + '/api/join/photos', { method: 'POST', headers: JSONH, body: JSON.stringify({ mb, t: T, action: 'disclose', value: 'no' }) }));
  ok('switch to blur needs ack', !d.ok);
  d = await J(await fetch(B + '/api/join/photos', { method: 'POST', headers: JSONH, body: JSON.stringify({ mb, t: T, action: 'disclose', value: 'yes' }) }));
  const clear = await P();
  ok('disclose yes → no blur anywhere', d.ok && (await diff(img, clear, face)) < 4 && (await diff(img, clear, corner)) < 4);

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
