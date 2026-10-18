// ยืนยันตัวตน 2 ชั้นของแอดมิน (TOTP) — ตั้งค่า · ล็อกอินต้องใส่รหัส · รหัสผิดถูกปฏิเสธ · จำกัดจำนวนครั้ง
// · รหัสกู้คืนใช้ได้ครั้งเดียว · ปิดต้องใช้รหัส · เปิดบังคับแล้วถูกพาไปหน้าตั้งค่า
// ใช้บัญชี CEO จาก ADMIN_EMAIL/ADMIN_PASSWORD ใน .env.local (ไม่มี = บัญชีสาธิต ceo@mord.demo)
// หมายเหตุ: ล็อกอินด้วยรหัสผ่าน 6 ครั้ง — เพดานต่อบัญชี 8 ครั้ง/30 นาที รันซ้ำติดกันให้เปิดเซิร์ฟเวอร์สาธิตใหม่
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const B = 'http://localhost:3210';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const env = (k) => (new RegExp('^' + k + '=(.*)$', 'm').exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '');
const KEY = env('ADMIN_SESSION_SECRET');
const AKEY = KEY.length >= 32 ? KEY : 'mord-demo-only-admin-session-secret-not-for-production';
const PW = env('ADMIN_PASSWORD') || env('ADMIN_DEMO_PASSWORD') || 'mord-demo';
const EMAIL = env('ADMIN_PASSWORD') ? (env('ADMIN_EMAIL') || 'admin@misterbamrungsuk.com').toLowerCase() : 'ceo@mord.demo';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const b64 = (b) => Buffer.from(b).toString('base64url');
const tok = (role, email, mfa) => { const body = { email, role, exp: Date.now() + 3600e3 }; if (mfa) body.mfa = true; const p = b64(JSON.stringify(body)); return p + '.' + b64(crypto.createHmac('sha256', AKEY).update(p).digest()); };
const ip = () => `10.37.${crypto.randomInt(255)}.${crypto.randomInt(255)}`;
const J = async (r) => r.json().catch(() => ({}));
const cookieOf = (r, name) => { for (const c of r.headers.getSetCookie?.() ?? []) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (kv.slice(0, i) === name) return kv.slice(i + 1); } return null; };
const claims = (t) => { try { return JSON.parse(Buffer.from(t.split('.')[0], 'base64url').toString()); } catch { return {}; } };
const sec = (cookie, body, h = {}) => fetch(B + '/api/admin/security', { method: body ? 'POST' : 'GET', headers: { cookie: 'mord_admin=' + cookie, 'content-type': 'application/json', 'x-forwarded-for': h.ip || ip() }, body: body ? JSON.stringify(body) : undefined });
const login = (IP) => fetch(B + '/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': IP }, body: JSON.stringify({ email: EMAIL, password: PW }) });
const verify = (pending, code, IP) => fetch(B + '/api/admin/login/verify', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': IP, cookie: pending ? 'mord_admin_mfa=' + pending : '' }, body: JSON.stringify({ code }) });

// ── TOTP (RFC 6238 · SHA-1 · 30s · 6 หลัก) ──
const b32dec = (s) => { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = 0, val = 0; const out = []; for (const ch of s.replace(/[\s=]/g, '').toUpperCase()) { val = (val << 5) | A.indexOf(ch); bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); };
const hotp = (key, n) => { const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(n)); const h = crypto.createHmac('sha1', key).update(c).digest(); const o = h[19] & 15; return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0'); };
let secretKey = null, lastStep = -1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// รหัสช่วงถัดไปที่ยังไม่เคยใช้ (เซิร์ฟเวอร์ปฏิเสธรหัสช่วงเดิม) — รอขึ้นช่วงใหม่ถ้าจำเป็น
async function freshCode() {
  for (;;) {
    const s = Math.floor(Date.now() / 30000);
    const use = Math.max(s, lastStep + 1);
    if (use <= s + 1) { lastStep = use; return hotp(secretKey, use); }
    await sleep(30000 - (Date.now() % 30000) + 300);
  }
}
const wrongCode = () => { const s = Math.floor(Date.now() / 30000); const bad = new Set([-2, -1, 0, 1, 2].map((d) => hotp(secretKey, s + d))); let c; do c = String(crypto.randomInt(1e6)).padStart(6, '0'); while (bad.has(c)); return c; };

(async () => {
  const QA_CEO_MFA = tok('ceo', 'qa-2fa-ceo@local.test', true);
  // เคลียร์ของค้างจากรอบก่อน (ไม่บังคับ + ล้าง 2 ชั้นของบัญชี CEO)
  await sec(QA_CEO_MFA, { action: 'enforce', on: false });
  await sec(QA_CEO_MFA, { action: 'reset', email: EMAIL });
  await fetch(B + '/api/admin/security/policy', { headers: { cookie: 'mord_admin=' + QA_CEO_MFA } }); // อุ่น route ที่ middleware โหมดเดโมเรียก

  try {
    // ── ไม่ได้ตั้ง 2 ชั้น = ล็อกอินเหมือนเดิม (ได้ session ทันที) ──
    let r = await login(ip());
    let j = await J(r);
    ok('no 2FA: password login issues session directly', r.status === 200 && !j.mfa && !!cookieOf(r, 'mord_admin'), r.status + ' ' + JSON.stringify(j));

    // ── ตั้งค่า ──
    const T0 = tok('ceo', EMAIL);
    j = await J(await sec(T0));
    ok('status: not enrolled', j.ok && j.enrolled === false && j.mfa_session === false, JSON.stringify(j).slice(0, 160));
    ok('security page opens for cs role', (await fetch(B + '/admin/security', { headers: { cookie: 'mord_admin=' + tok('cs', 'qa-2fa-cs@local.test') }, redirect: 'manual' })).status === 200);
    j = await J(await sec(T0, { action: 'start' }));
    ok('start: secret + otpauth uri + QR', j.ok && /^[A-Z2-7]{32}$/.test(j.secret || '') && /^otpauth:\/\/totp\//.test(j.uri || '') && j.uri.includes('secret=' + j.secret) && /^data:image\/png/.test(j.qr || ''), JSON.stringify(j).slice(0, 120));
    secretKey = b32dec(j.secret);
    r = await sec(T0, { action: 'confirm', code: wrongCode() });
    ok('confirm: wrong code refused', r.status === 401, String(r.status));
    r = await sec(T0, { action: 'confirm', code: await freshCode() });
    j = await J(r);
    const recovery = j.recovery || [];
    ok('confirm: 8 recovery codes shown once', r.status === 200 && recovery.length === 8 && new Set(recovery).size === 8, r.status + ' ' + JSON.stringify(j).slice(0, 100));
    const T1 = cookieOf(r, 'mord_admin');
    ok('confirm: session upgraded with mfa claim', !!T1 && claims(T1).mfa === true);
    j = await J(await sec(T1));
    ok('status: enrolled, mfa session, 8 recovery left', j.enrolled === true && j.mfa_session === true && j.recovery_left === 8, JSON.stringify(j).slice(0, 160));
    ok('start again while enrolled → 409', (await sec(T1, { action: 'start' })).status === 409);

    // ── ล็อกอินต้องใส่รหัส ──
    const ip1 = ip();
    r = await login(ip1);
    j = await J(r);
    const pend = cookieOf(r, 'mord_admin_mfa');
    ok('login with 2FA: no session yet, asks for code', r.status === 200 && j.mfa === true && !cookieOf(r, 'mord_admin') && !!pend, r.status + ' ' + JSON.stringify(j));
    r = await fetch(B + '/admin', { headers: { cookie: 'mord_admin=' + pend }, redirect: 'manual' });
    ok('pending token is not an admin session', r.status >= 300 && r.status < 400 && /admin-login/.test(r.headers.get('location') || ''), r.status + ' ' + r.headers.get('location'));
    r = await verify(pend, wrongCode(), ip1);
    ok('verify: wrong code refused', r.status === 401, String(r.status));
    r = await verify(null, await freshCode(), ip1);
    ok('verify: without pending cookie → 401', r.status === 401, String(r.status));
    lastStep--; // รหัสข้างบนไม่ถูกใช้จริง
    r = await verify(pend, await freshCode(), ip1);
    j = await J(r);
    const T2 = cookieOf(r, 'mord_admin');
    ok('verify: right code → session with mfa', r.status === 200 && !!T2 && claims(T2).mfa === true && claims(T2).role === 'ceo', r.status + ' ' + JSON.stringify(j));
    r = await fetch(B + '/admin', { headers: { cookie: 'mord_admin=' + T2 }, redirect: 'manual' });
    ok('mfa session opens /admin', r.status === 200, String(r.status));
    r = await verify(pend, hotp(secretKey, lastStep), ip());
    ok('verify: same code cannot be replayed', r.status === 401, String(r.status));

    // ── จำกัดจำนวนครั้ง (5 / 15 นาที ต่อบัญชี+IP) ──
    const ip2 = ip();
    r = await login(ip2);
    const pend2 = cookieOf(r, 'mord_admin_mfa');
    const st = [];
    for (let i = 0; i < 6; i++) st.push((await verify(pend2, wrongCode(), ip2)).status);
    ok('rate limit: 5 wrong → 6th is 429', st.slice(0, 5).every((s) => s === 401) && st[5] === 429, st.join(','));

    // ── รหัสกู้คืนใช้ได้ครั้งเดียว ──
    const ip3 = ip();
    r = await login(ip3);
    const pend3 = cookieOf(r, 'mord_admin_mfa');
    r = await verify(pend3, recovery[0].toUpperCase(), ip3);
    j = await J(r);
    ok('recovery code logs in', r.status === 200 && j.recovery === true && claims(cookieOf(r, 'mord_admin') || '').mfa === true, r.status + ' ' + JSON.stringify(j));
    const ip4 = ip();
    r = await login(ip4);
    const pend4 = cookieOf(r, 'mord_admin_mfa');
    r = await verify(pend4, recovery[0], ip4);
    ok('same recovery code refused 2nd time', r.status === 401, String(r.status));
    j = await J(await sec(T2));
    ok('recovery left = 7', j.recovery_left === 7, String(j.recovery_left));

    // ── ปิด 2 ชั้นต้องใช้รหัส ──
    r = await sec(T2, { action: 'disable' });
    ok('disable without code refused', r.status === 401, String(r.status));
    r = await sec(T2, { action: 'disable', code: wrongCode() });
    ok('disable with wrong code refused', r.status === 401, String(r.status));
    j = await J(await sec(T2));
    ok('still enrolled after refused disable', j.enrolled === true);
    r = await sec(T2, { action: 'disable', code: await freshCode() });
    ok('disable with current code', r.status === 200, String(r.status));
    j = await J(await sec(T2));
    ok('status: not enrolled after disable', j.enrolled === false);

    // ── บังคับทุกบัญชี ──
    r = await sec(tok('super', 'qa-2fa-super@local.test', true), { action: 'enforce', on: true });
    ok('enforce: non-CEO refused', r.status === 403, String(r.status));
    r = await sec(tok('ceo', 'qa-2fa-ceo@local.test'), { action: 'enforce', on: true });
    ok('enforce: CEO without mfa session refused', r.status === 409, String(r.status));
    r = await sec(QA_CEO_MFA, { action: 'enforce', on: true });
    ok('enforce: CEO with mfa turns on', r.status === 200 && (await J(r)).enforce === true, String(r.status));
    const CS = tok('cs', 'qa-2fa-cs@local.test'), CSM = tok('cs', 'qa-2fa-cs@local.test', true);
    r = await fetch(B + '/admin/orders', { headers: { cookie: 'mord_admin=' + CS }, redirect: 'manual' });
    ok('enforced: no-mfa admin redirected to /admin/security', r.status >= 300 && r.status < 400 && /\/admin\/security/.test(r.headers.get('location') || ''), r.status + ' ' + r.headers.get('location'));
    r = await fetch(B + '/admin/security', { headers: { cookie: 'mord_admin=' + CS }, redirect: 'manual' });
    ok('enforced: security page still opens', r.status === 200, String(r.status));
    r = await fetch(B + '/api/admin/members', { headers: { cookie: 'mord_admin=' + CS } });
    ok('enforced: admin API blocked for no-mfa session', r.status === 403 && (await J(r)).mfa_required === true, String(r.status));
    r = await fetch(B + '/admin/orders', { headers: { cookie: 'mord_admin=' + CSM }, redirect: 'manual' });
    ok('enforced: mfa session opens pages', r.status === 200, String(r.status));
    r = await fetch(B + '/api/admin/members', { headers: { cookie: 'mord_admin=' + CSM } });
    ok('enforced: mfa session can call admin API', r.status !== 403, String(r.status));
    r = await login(ip());
    j = await J(r);
    ok('enforced: login without 2FA → sent to /admin/security', r.status === 200 && j.enroll === true && j.home === '/admin/security', JSON.stringify(j));
    r = await sec(QA_CEO_MFA, { action: 'enforce', on: false });
    ok('enforce off', r.status === 200);
    r = await fetch(B + '/admin/orders', { headers: { cookie: 'mord_admin=' + CS }, redirect: 'manual' });
    ok('not enforced: no-mfa session works as before', r.status === 200, String(r.status));
  } finally {
    await sec(QA_CEO_MFA, { action: 'enforce', on: false });
    await sec(QA_CEO_MFA, { action: 'reset', email: EMAIL });
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
