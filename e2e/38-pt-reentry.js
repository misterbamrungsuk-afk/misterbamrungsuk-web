// Part-Time กลับเข้าโปรไฟล์เอง (LINE ↔ Chrome คุกกี้แยกกัน · ปิด OTP): สมัครต้องมีอีเมล + รหัสผ่าน · อีเมลซ้ำ 409
// · เข้าสู่ระบบ /api/join/login (ผิด = ข้อความเดียว · จำกัดต่ออีเมล) · ตั้ง/เปลี่ยนรหัสผ่าน · อีเมลลิงก์หลังจ่าย
// · ลืมรหัสผ่าน /api/join/link-request (เบอร์ / รหัส MB) ตอบข้อความเดียวกันเสมอ · จำกัดต่อ IP + ต่อคน
// · แอดมินยกเลิกลิงก์ → ลิงก์/คุกกี้เก่าใช้ไม่ได้ แต่เข้าสู่ระบบใหม่ได้ · ออกจากระบบแล้วเข้าใหม่ได้
// โหมดเดโม (:3210) — อ่านอีเมลที่ "ส่ง" ผ่าน /api/admin/demo-outbox (มีเฉพาะไม่มี RESEND_API_KEY และไม่ใช่ Vercel)
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const JSONH = { 'content-type': 'application/json' };
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const F = (n) => new File([img], n, { type: 'image/jpeg' });
const form = (o, files = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) [].concat(v).forEach((x) => f.append(k, x)); for (const [k, v] of Object.entries(files)) f.set(k, v); return f; };
const rip = () => `10.${(Math.random() * 250) | 0}.${(Math.random() * 250) | 0}.${1 + ((Math.random() * 250) | 0)}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
// โทเคนเข้าโปรไฟล์ที่ออกมานานแล้ว (iat เก่า) — ใช้ทดสอบ "ต้องใส่รหัสเดิม"
const oldTok = (mb, ageMs) => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now() - ageMs, exp: Date.now() + 86400e3 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); };
const GENERIC = 'ถ้าข้อมูลตรงกับใบสมัคร เราส่งลิงก์ไปที่อีเมลที่ใช้สมัครแล้ว · ตรวจกล่องจดหมายและสแปม';
const BAD = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';

// คุกกี้แยกต่อ "เครื่อง"
const device = (ip = rip()) => {
  let jar = '';
  const keep = (r) => { for (const x of r.headers.getSetCookie?.() || []) { const kv = x.split(';')[0]; jar = jar.split('; ').filter((y) => y && !y.startsWith(kv.split('=')[0] + '=')).concat(kv).join('; '); } return r; };
  const req = async (p, o = {}) => keep(await fetch(B + p, { ...o, redirect: 'manual', headers: { 'x-forwarded-for': ip, ...(o.headers || {}), cookie: jar } }));
  return { req, jar: () => jar };
};
const outbox = async (to) => ((await (await fetch(B + '/api/admin/demo-outbox?to=' + encodeURIComponent(to), { headers: ADM })).json()).mails || []);
const waitMails = async (to, n) => { let m = []; for (let i = 0; i < 20; i++) { m = await outbox(to); if (m.length >= n) break; await sleep(150); } return m; };
const linkOf = (m) => (/href="([^"]*\/join\/go\?t=[^"]+)"/.exec(m?.html || '')?.[1] || '').replace(/&amp;/g, '&');
const path = (u) => u.replace(/^https?:\/\/[^/]+/, '');
const linkReq = (d, q) => d.req('/api/join/link-request', { method: 'POST', headers: JSONH, body: JSON.stringify({ q }) });
const login = (d, email, password) => d.req('/api/join/login', { method: 'POST', headers: JSONH, body: JSON.stringify({ email, password }) });
const setPw = (d, o) => d.req('/api/join/password', { method: 'POST', headers: JSONH, body: JSON.stringify(o) });

(async () => {
  const A = device();
  const tel = '07' + String(Date.now()).slice(-8);
  const email = `reentry${tel}@test.local`;
  const PW = 'pass-' + tel;
  const s = await (await A.req('/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel }) })).json();
  if (s.devCode) await A.req('/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel, code: s.devCode }) });
  const base = { package: 'A', first_name: 'กลับเข้า', last_name: 'ทดสอบ', nickname: 'รีเอนทรี', tel, password: PW, accept_terms: 'true', consent_pdpa: 'true' };

  // ── สมัครต้องมีอีเมล + รหัสผ่าน ──
  let r = await A.req('/api/join/register', { method: 'POST', body: form(base, { slip: F('s.jpg') }) });
  let j = await r.json();
  ok('register without email → 400', r.status === 400 && (j.fields || []).includes('email') && /อีเมล/.test(j.error || ''), r.status + ' ' + j.error);
  r = await A.req('/api/join/register', { method: 'POST', body: form({ ...base, email: 'not-an-email' }, { slip: F('s.jpg') }) });
  ok('register with bad email → 400', r.status === 400, String(r.status));
  r = await A.req('/api/join/register', { method: 'POST', body: form({ ...base, email, password: '' }, { slip: F('s.jpg') }) }); j = await r.json();
  ok('register without password → 400 Thai', r.status === 400 && (j.fields || []).includes('password') && /รหัสผ่าน/.test(j.error || ''), r.status + ' ' + j.error);
  r = await A.req('/api/join/register', { method: 'POST', body: form({ ...base, email, password: 'short7c' }, { slip: F('s.jpg') }) });
  ok('register with 7-char password → 400', r.status === 400, String(r.status));
  r = await A.req('/api/join/register', { method: 'POST', body: form({ ...base, email: '  ' + email.toUpperCase() + ' ' }, { slip: F('s.jpg') }) });
  j = await r.json();
  const mb = j.mb_code;
  ok('register with email + password → MB + link', !!mb && /\/join\/go\?t=/.test(j.link || ''), j.error || mb);
  if (!mb) { console.log(fails + ' FAILED'); return; }

  const list = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const at = list.indexOf('"mb_code":"' + mb + '"'); const ids = [...list.slice(Math.max(0, at - 6000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)]; const id = ids[ids.length - 1]?.[1];
  const row = (await (await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) })).json()).row;
  ok('email stored lowercased + trimmed', row?.email === email, row?.email);
  ok('password hash never returned to admin', !!row && !JSON.stringify(row).includes('pw_hash') && !list.includes('pw_hash'));
  r = await device().req('/api/join/register', { method: 'POST', body: form({ ...base, email: email.toUpperCase() }, { slip: F('s.jpg') }) }); j = await r.json();
  ok('duplicate email → 409 + login link', r.status === 409 && j.error === 'อีเมลนี้สมัครไว้แล้ว · เข้าสู่ระบบ Part-Time' && j.login === '/join/me', r.status + ' ' + j.error);

  // ── อีเมลหลังจ่าย มีลิงก์เข้าโปรไฟล์ ──
  let mails = await waitMails(email, 1);
  const first = mails[0];
  ok('post-payment email sent with profile link', !!first && first.subject.includes('ลิงก์เข้าโปรไฟล์ Part-Time ของคุณ · ' + mb) && !!linkOf(first), first?.subject);
  ok('link has no phone/email in URL', !linkOf(first).includes(tel) && !linkOf(first).includes('%40'));

  // ── เข้าสู่ระบบด้วยอีเมล + รหัสผ่าน ──
  const L1 = device();
  r = await login(L1, email, 'wrong-password'); j = await r.json();
  ok('login wrong password → 401 generic', r.status === 401 && j.error === BAD, r.status + ' ' + j.error);
  r = await login(device(), 'nobody' + tel + '@test.local', PW); j = await r.json();
  ok('login unknown email → same 401 generic', r.status === 401 && j.error === BAD);
  r = await login(L1, email.toUpperCase(), PW); j = await r.json();
  ok('login ok → cookie + profile path', r.status === 200 && j.to === '/join/profile/' + mb && L1.jar().includes('mb_resume='), r.status + ' ' + j.to);
  r = await L1.req('/join/profile/' + mb); let h = await r.text();
  ok('logged-in device opens profile 200', r.status === 200 && !h.includes('ไม่มีสิทธิ์') && h.includes(mb), String(r.status));
  r = await L1.req('/join/me'); ok('/join/me after login → profile', (r.headers.get('location') || '').includes('/join/profile/' + mb));
  const RL = device(); let rl = 0;
  for (let i = 0; i < 6; i++) rl = (await login(RL, 'ratelimit' + tel + '@test.local', 'x-wrong-' + i)).status;
  ok('login per-email limit → 429 on 6th', rl === 429, String(rl));

  // ── ตั้ง/เปลี่ยนรหัสผ่าน ──
  r = await L1.req('/api/join/password?mb=' + mb); j = await r.json();
  ok('settings: has password + fresh session', j.ok && j.has === true && j.fresh === true, JSON.stringify(j));
  const stale = oldTok(mb, 2 * 3600e3);
  const PW2 = 'new-pass-' + tel;
  r = await setPw(device(), { mb, t: stale, password: PW2 }); ok('change password on old session without current → 403', r.status === 403, String(r.status));
  r = await setPw(device(), { mb, t: stale, current: 'nope-nope', password: PW2 }); ok('change password wrong current → 403', r.status === 403, String(r.status));
  r = await setPw(device(), { mb, t: stale, current: PW, password: 'short' }); ok('change password too short → 400', r.status === 400, String(r.status));
  r = await setPw(device(), { mb, t: stale, current: PW, password: PW2 }); ok('change password with current → 200', r.status === 200, String(r.status));
  r = await setPw(device(), { mb, password: 'hack-pass-1234' }); ok('set password without session → 401', r.status === 401, String(r.status));
  r = await login(device(), email, PW2); ok('login with new password', r.status === 200, String(r.status));

  // ── เจ้าของโปรไฟล์: ออกลิงก์ / ส่งอีเมลซ้ำ ──
  r = await A.req('/api/join/link?mb=' + mb); j = await r.json();
  ok('hub: GET link with cookie', r.status === 200 && /\/join\/go\?t=/.test(j.url || '') && /\*\*/.test(j.email || '') && !j.email.includes(email.split('@')[0]), j.email);
  r = await device().req('/api/join/link?mb=' + mb); ok('hub: GET link without cookie → 401', r.status === 401, String(r.status));
  r = await A.req('/api/join/link', { method: 'POST', headers: JSONH, body: JSON.stringify({ mb }) }); j = await r.json();
  mails = await waitMails(email, 2);
  ok('hub: resend email', r.status === 200 && j.ok && mails.length === 2, r.status + ' mails=' + mails.length);

  // ── ลืมรหัสผ่าน: เครื่องใหม่ขอลิงก์ทางอีเมลด้วยเบอร์ ──
  const Bdev = device();
  r = await linkReq(Bdev, tel.slice(0, 3) + '-' + tel.slice(3, 6) + '-' + tel.slice(6)); j = await r.json();
  ok('link-request by phone → generic 200', r.status === 200 && j.message === GENERIC, r.status + ' ' + j.message);
  mails = await waitMails(email, 3);
  ok('link-request by phone → email sent', mails.length === 3, 'mails=' + mails.length);
  const L = linkOf(mails[mails.length - 1]);
  r = await Bdev.req(path(L));
  const loc = r.headers.get('location') || '';
  ok('open emailed link → redirect to profile + cookie', r.status >= 300 && r.status < 400 && loc.includes('/join/profile/' + mb) && Bdev.jar().includes('mb_resume='), r.status + ' ' + loc);
  r = await Bdev.req('/join/profile/' + mb); h = await r.text();
  ok('new device opens profile', !h.includes('ไม่มีสิทธิ์') && h.includes(mb));
  r = await setPw(Bdev, { mb, password: 'forgot-pass-' + tel });
  ok('forgot password: emailed-link session sets new password without current', r.status === 200, String(r.status));
  const PW3 = 'forgot-pass-' + tel;

  // ── รหัส MB (พิมพ์เล็ก) ──
  r = await linkReq(device(), mb.toLowerCase()); j = await r.json();
  mails = await waitMails(email, 4);
  ok('link-request by MB → generic 200 + email', r.status === 200 && j.message === GENERIC && mails.length === 4, 'mails=' + mails.length);

  // ── ไม่พบ = ข้อความเดียวกัน ──
  r = await linkReq(device(), '06' + String(Date.now() + 7).slice(-8)); j = await r.json();
  ok('unknown phone → same generic 200', r.status === 200 && j.message === GENERIC, r.status + ' ' + j.message);
  r = await linkReq(device(), 'MB-9999999'); j = await r.json();
  ok('unknown MB → same generic 200', r.status === 200 && j.message === GENERIC);
  r = await linkReq(device(), 'hello'); ok('garbage input → 400 Thai', r.status === 400 && /เบอร์/.test((await r.json()).error || ''));

  // ── จำกัดต่อคน (3/ชม.): ครั้งที่ 3 ส่ง · ครั้งที่ 4 ไม่ส่งแต่ตอบเหมือนเดิม ──
  await linkReq(device(), tel); mails = await waitMails(email, 5);
  ok('3rd request in hour still sends', mails.length === 5, 'mails=' + mails.length);
  r = await linkReq(device(), tel); j = await r.json(); await sleep(800); mails = await outbox(email);
  ok('4th request: same generic 200, no email', r.status === 200 && j.message === GENERIC && mails.length === 5, 'mails=' + mails.length);

  // ── จำกัดต่อ IP (5 / 15 นาที) ──
  const C = device(); let last = 0;
  for (let i = 0; i < 6; i++) last = (await linkReq(C, 'MB-99999' + String(10 + i))).status;
  ok('per-IP limit → 429 on 6th', last === 429, String(last));

  // ── แอดมินยกเลิกลิงก์ → ลิงก์ในอีเมลเก่า + คุกกี้เก่าใช้ไม่ได้ ──
  await sleep(5);
  r = await fetch(B + `/api/admin/applicants/${id}/link`, { method: 'DELETE', headers: ADM }); ok('admin revoke links', r.status === 200, String(r.status));
  r = await device().req(path(linkOf(first))); ok('old emailed link → expired after revoke', (r.headers.get('location') || '').includes('/join/go/expired'), r.headers.get('location'));
  r = await device().req(path(L)); ok('newer emailed link also revoked', (r.headers.get('location') || '').includes('/join/go/expired'));
  r = await Bdev.req('/join/profile/' + mb); h = await r.text(); ok('old cookie blocked after revoke', h.includes('ไม่มีสิทธิ์'));
  r = await Bdev.req('/api/join/link?mb=' + mb); ok('old cookie cannot mint new link', r.status === 401, String(r.status));
  r = await Bdev.req('/join/me'); h = await r.text(); ok('/join/me with revoked cookie shows login + forgot form', r.status === 200 && h.includes('Part-Time เข้าสู่ระบบ') && h.includes('ลืมรหัสผ่าน? ส่งลิงก์ไปอีเมล'), String(r.status));
  // เข้าสู่ระบบได้อีกหลังแอดมินยกเลิกลิงก์ทั้งหมด
  await sleep(5);
  r = await login(Bdev, email, PW3); ok('login after admin revoke works', r.status === 200, String(r.status));
  r = await Bdev.req('/join/profile/' + mb); h = await r.text(); ok('profile opens after re-login', !h.includes('ไม่มีสิทธิ์') && h.includes(mb));
  // ออกจากระบบ → เข้าสู่ระบบใหม่ได้
  await Bdev.req('/api/join/logout', { method: 'POST', headers: JSONH, body: '{}' });
  r = await Bdev.req('/join/profile/' + mb); h = await r.text(); ok('after logout profile blocked', h.includes('ไม่มีสิทธิ์'));
  r = await login(Bdev, email, PW3); ok('login after logout works', r.status === 200, String(r.status));

  // ── สายคำเชิญ (ไม่จ่ายการันตี) — สมัครต้องมีอีเมล + รหัสผ่านเหมือนกัน แล้วเข้าสู่ระบบได้ ──
  const exp = new Date(Date.now() + 7 * 86400e3).toISOString().slice(0, 10);
  const inv = (await (await fetch(B + '/api/admin/invites', { method: 'POST', headers: ADM, body: JSON.stringify({ name: 'e2e invite reentry', limit: 2, expires: exp }) })).json()).data;
  ok('admin creates invite', !!inv?.code, JSON.stringify(inv));
  h = await (await fetch(B + '/join/i/' + inv.code)).text(); ok('invite page opens (no guarantee)', !/ลิงก์เชิญนี้/.test(h) && h.includes(inv.code));
  const I = device();
  const itel = '06' + String(Date.now()).slice(-8), iemail = `invite${itel}@test.local`, IPW = 'inv-' + itel;
  const is = await (await I.req('/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: itel }) })).json();
  if (is.devCode) await I.req('/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: itel, code: is.devCode }) });
  const ibase = { ...base, tel: itel, first_name: 'คำเชิญ', nickname: 'อินไวต์', invite: inv.code };
  r = await I.req('/api/join/register', { method: 'POST', body: form({ ...ibase, password: '' , email: iemail }, { slip: F('s.jpg') }) });
  ok('invite register without password → 400', r.status === 400, String(r.status));
  r = await I.req('/api/join/register', { method: 'POST', body: form({ ...ibase, email: iemail, password: IPW }, { slip: F('s.jpg') }) }); j = await r.json();
  ok('invite register with email + password', r.status === 200 && !!j.mb_code && /\/join\/go\?t=/.test(j.link || ''), r.status + ' ' + JSON.stringify(j));
  const imb = j.mb_code;
  const ilist = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const iat = ilist.indexOf('"mb_code":"' + imb + '"'); const iid = [...ilist.slice(Math.max(0, iat - 6000), iat).matchAll(/"id":"([0-9a-f-]{36})"/g)].pop()?.[1];
  const irow = iid && (await (await fetch(B + '/api/admin/applicants/' + iid, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) })).json()).row;
  ok('invite pays training only (no guarantee)', irow && irow.amount === 3000 && irow.invite === inv.code, `${irow?.amount} ${irow?.invite}`);
  ok('invite applicant gets profile-link email', (await waitMails(iemail, 1)).some((m) => linkOf(m)));
  const I2 = device();
  r = await login(I2, iemail, IPW); ok('invite applicant logs in on another device', r.status === 200, String(r.status));
  r = await I2.req('/join/profile/' + imb); h = await r.text(); ok('invite applicant profile opens after login', !h.includes('ไม่มีสิทธิ์') && h.includes(imb));
  r = await login(device(), iemail, 'wrong-password'); ok('invite wrong password → generic', r.status === 401 || r.status === 400, String(r.status));

  // ── หน้า ──
  h = await (await fetch(B + '/join/me')).text();
  ok('/join/me has login + forgot + LINE fallback', h.includes('Part-Time เข้าสู่ระบบ') && h.includes('ลืมรหัสผ่าน? ส่งลิงก์ไปอีเมล') && h.includes('ขอลิงก์ใหม่ทาง LINE'));
  h = await (await fetch(B + '/login')).text(); ok('/login has Part-Time login button', h.includes('href="/join/me"') && h.includes('Part-Time เข้าสู่ระบบ'));
  h = await (await fetch(B + '/join')).text(); ok('/join sale page has PT login link', h.includes('สมัครแล้ว? เข้าสู่ระบบ Part-Time'));
  h = await (await fetch(B + '/work-with-us')).text(); ok('/work-with-us links to PT login', h.includes('href="/join/me"') && h.includes('เข้าสู่ระบบ'));
  r = await fetch(B + '/api/admin/demo-outbox'); ok('demo outbox needs admin', r.status === 401 || r.status === 404, String(r.status));

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
