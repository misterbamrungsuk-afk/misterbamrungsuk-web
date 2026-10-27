// QA ฝั่ง Part-Time (ส่วนเซิร์ฟเวอร์): ผู้สมัครที่ยังไม่อนุมัติถอน/โปรโมท/ประกาศ/ชวนเปิดเมมไม่ได้ (409) · กล่องแจ้งเตือน + อ่านแล้ว
// · เวลาทำงาน เลิก ≤ เริ่ม ไม่รับ · การ์ดตัดนวดถ้าไม่มีใบรับรอง · เบอร์โทรตัดตัวอักษรก่อนตรวจ · ยกเลิกคำขอลบบัญชี (โหมดเดโม · รันหลังชุดอื่น)
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210', mb0 = 'MBM-2610001';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json();
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const body = Buffer.from(JSON.stringify({ mb: mb0, iat: Date.now(), exp: Date.now() + 3600_000 })).toString('base64url');
const T = body + '.' + crypto.createHmac('sha256', KEY).update('resume:' + body).digest('base64url');
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const F = (n) => new File([img], n, { type: 'image/jpeg' });
// คุกกี้ของผู้สมัครใหม่ (mb_resume ได้มาตอนสมัคร)
let jar = '';
const keep = (r) => { for (const x of r.headers.getSetCookie?.() || []) { const kv = x.split(';')[0]; jar = jar.split('; ').filter((y) => y && !y.startsWith(kv.split('=')[0] + '=')).concat(kv).join('; '); } return r; };
const req = async (p, o = {}) => keep(await fetch(B + p, { ...o, redirect: 'manual', headers: { ...(o.headers || {}), cookie: jar } }));
const form = (o, files = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) [].concat(v).forEach((x) => f.append(k, x)); for (const [k, v] of Object.entries(files)) f.set(k, v); return f; };
const JSONH = { 'content-type': 'application/json' };

(async () => {
  // ── สมัครใหม่ด้วยเบอร์ที่มีตัวอักษรปน → ระบบตัดเหลือตัวเลข 10 หลัก ──
  const tel = '09' + String(Date.now()).slice(-8);
  const s = await (await req('/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel }) })).json();
  await req('/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel, code: s.devCode }) });
  const dirty = 'abc' + tel.slice(0, 3) + '-' + tel.slice(3, 6) + ' ' + tel.slice(6);
  const j = await (await req('/api/join/register', { method: 'POST', body: form({ package: 'A', first_name: 'ยูเอ็กซ์', last_name: 'ทดสอบ', nickname: 'ยูเอ็กซ์', tel: dirty, email: 'pt' + tel + '@test.local', password: 'test-pass-1234', accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true' }, { slip: F('s.jpg') }) })).json();
  const mb = j.mb_code; ok('register with non-digit phone accepted', !!mb, j.error || mb);
  const list = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const at = list.indexOf('"mb_code":"' + mb + '"'); const ids = [...list.slice(Math.max(0, at - 6000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)]; const id = ids[ids.length - 1]?.[1];
  let row = (await (await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) })).json()).row;
  ok('phone stored as digits only', row?.tel === tel, row?.tel);

  // ── ยังไม่อนุมัติ → 409 ทุกทางที่ทำตัวเป็น Part-Time จริง ──
  let r = await req('/api/pt/wallet', { method: 'POST', headers: JSONH, body: JSON.stringify({ mb, amount: 500 }) }); ok('unapproved withdraw → 409', r.status === 409, String(r.status));
  r = await req('/api/pt/boost', { method: 'POST', headers: JSONH, body: JSON.stringify({ mb, plan: 'd1', pay: 'wallet' }) }); ok('unapproved boost → 409', r.status === 409, String(r.status));
  r = await req('/api/pt/sales?mb=' + mb); ok('unapproved sales code → 409', r.status === 409, String(r.status));
  r = await req('/api/pt/sales', { method: 'POST', headers: JSONH, body: JSON.stringify({ mb, action: 'boost', id: 'x' }) }); ok('unapproved sales convert → 409', r.status === 409, String(r.status));
  r = await req('/api/join/profile', { method: 'POST', body: form({ mb, step: 'post', text: 'ว่างดินเนอร์', time: '18:00–22:00', zone: 'อโศก' }) }); ok('unapproved "วันนี้ว่าง" post → 409', r.status === 409, String(r.status));
  r = await req('/api/join/profile', { method: 'POST', body: form({ mb, step: 'listing', title: 'เพื่อนกินเที่ยว', rules: 'สุภาพ' }) }); ok('unapproved listing → 409', r.status === 409, String(r.status));
  r = await req('/api/pt/posts', { method: 'POST', headers: JSONH, body: JSON.stringify({ mb, post_id: 'x', message: '' }) }); ok('unapproved post interest → 409', r.status === 409, String(r.status));
  const msg409 = await J(r); ok('409 has Thai message', /เปิดใช้หลังทีมงาน/.test(msg409.error || ''), msg409.error);
  r = await req('/api/join/profile', { method: 'POST', body: form({ mb, step: 'post', close: 'true' }) }); ok('closing post still allowed', r.status === 200);

  // ── เวลาทำงาน: เลิก ≤ เริ่ม ไม่รับ · 24:00 ได้ ──
  r = await req('/api/join/profile', { method: 'POST', body: form({ mb, step: 'work', days: JSON.stringify({ 'จ': { on: true, from: '18:00', to: '17:30' } }), radius_km: '8', paused: 'false' }) });
  let jj = await J(r); ok('availability end before start → 400', r.status === 400 && /เวลาเลิก/.test(jj.error || ''), jj.error);
  r = await req('/api/join/profile', { method: 'POST', body: form({ mb, step: 'work', days: JSON.stringify({ 'จ': { on: true, from: '18:00', to: '18:00' } }), radius_km: '8', paused: 'false' }) }); ok('availability end == start → 400', r.status === 400);
  r = await req('/api/join/profile', { method: 'POST', body: form({ mb, step: 'work', days: JSON.stringify({ 'อ': { on: false, from: '20:00', to: '10:00' } }), radius_km: '8', paused: 'false' }) }); ok('day off ignores times', r.status === 200);
  r = await req('/api/join/profile', { method: 'POST', body: form({ mb, step: 'work', days: JSON.stringify({ 'จ': { on: true, from: '18:00', to: '24:00' }, 'ศ': { on: true, from: '10:30', to: '22:00' } }), radius_km: '8', paused: 'false' }) }); ok('availability valid (to 24:00) → 200', r.status === 200);

  // ── การ์ด: ไม่มีใบรับรองการนวด → ตัด "นวด" ออก ──
  r = await req('/api/join/profile', { method: 'POST', body: form({ mb, step: 'card', activities: ['คาเฟ่', 'นวดผ่อนคลาย'], places: ['คาเฟ่ / ร้านอาหาร'], skills: ['massage', 'photo'] }) });
  jj = await J(r);
  ok('card saved', r.status === 200 && jj.ok);
  ok('card drops massage activity without cert', jj.card && !jj.card.activities.some((a) => /นวด/.test(a)) && jj.card.activities.includes('คาเฟ่'), JSON.stringify(jj.card));
  ok('card drops massage skill without cert', jj.card && !jj.card.skills.includes('massage') && jj.card.skills.includes('photo'));
  ok('card tells why', (jj.dropped || []).length === 2 && /ใบรับรอง/.test(jj.warning || ''), jj.warning);

  // ── คำขอลบบัญชี → ยกเลิกได้ ──
  r = await req('/api/join/profile', { method: 'POST', body: form({ mb, step: 'delete_request' }) }); ok('delete request', r.status === 200);
  row = (await (await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) })).json()).row;
  ok('delete requested flag set', !!row?.delete_requested_at);
  r = await req('/api/join/profile', { method: 'POST', body: form({ mb, step: 'delete_cancel' }) }); ok('cancel delete request', r.status === 200);
  row = (await (await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) })).json()).row;
  ok('delete flag cleared', !row?.delete_requested_at);

  // ── กล่องแจ้งเตือน (Part-Time ที่ใช้งานจริง MBM-2610001 มีแจ้งเตือนจากชุดก่อนหน้า) ──
  ok('notifications need pt auth', (await fetch(B + `/api/pt/notifications?mb=${mb0}`)).status === 403);
  let n = await J(await fetch(B + `/api/pt/notifications?mb=${mb0}&t=${encodeURIComponent(T)}`));
  ok('notifications list', n.ok && Array.isArray(n.notices) && n.notices.length > 0, `${n.notices?.length} · unread ${n.unread}`);
  ok('notice links mapped to PT pages', n.notices?.every((x) => x.href.startsWith(`/join/profile/${mb0}`)), n.notices?.map((x) => x.href).find((h) => !h.startsWith(`/join/profile/${mb0}`)));
  ok('notice links keep token', n.notices?.every((x) => x.href.includes('t=')));
  r = await fetch(B + '/api/pt/notifications', { method: 'POST', headers: JSONH, body: JSON.stringify({ mb: mb0, t: T }) }); ok('mark read', (await J(r)).ok);
  n = await J(await fetch(B + `/api/pt/notifications?mb=${mb0}&t=${encodeURIComponent(T)}&count=1`)); ok('unread = 0 after read', n.ok && n.unread === 0, String(n.unread));
  const page = await (await fetch(B + `/join/profile/${mb0}/notifications?t=${encodeURIComponent(T)}`)).text(); ok('notifications page renders', page.includes('แจ้งเตือน'));

  // ── Part-Time ที่อนุมัติ + เปิดโปรไฟล์แล้วยังลงโพสต์ได้ ──
  r = await fetch(B + '/api/join/profile', { method: 'POST', body: form({ mb: mb0, t: T, step: 'listing', title: 'เพื่อนกินเที่ยว คาเฟ่', rules: 'สุภาพ ตรงเวลา' }) }); ok('active PT listing saves', r.status === 200, String(r.status));

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
