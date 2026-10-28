// หน้า Recruit ย้าย /sales → /recruit (ลิงก์เก่า + /Recruit เด้งมาที่ใหม่) · สมัครเป็น Recruit เอง /recruit/apply → แอดมินอนุมัติ = ID/รหัสผ่าน (27 ต.ค. 2569)
const { adm } = require('./_tok');
const B = 'http://localhost:3210';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json();
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const ORIGIN = { 'content-type': 'application/json', origin: B };
const un = (h) => h.replace(/<!-- -->/g, '').replace(/\\"/g, '"');

(async () => {
  // ── /sales → /recruit ──
  for (const [from, to] of [['/sales', '/recruit'], ['/sales/me', '/recruit/me'], ['/Recruit', '/recruit']]) {
    const r = await fetch(B + from, { redirect: 'manual' });
    ok(`${from} → ${to}`, [301, 308].includes(r.status) && new URL(r.headers.get('location') || '', B).pathname === to, `${r.status} ${r.headers.get('location')}`);
  }
  let h = un(await (await fetch(B + '/recruit')).text());
  ok('/recruit landing: offer + apply CTA + login', h.includes('RECRUITER PROGRAM') && h.includes('data-recruit-offer') && h.includes('href="/recruit/apply"') && h.includes('data-sales-login') && !h.includes('ลูกค้าเปิดเมม Gold'));
  h = un(await (await fetch(B + '/recruit/apply')).text());
  ok('/recruit/apply form renders', h.includes('data-recruit-apply') && h.includes('บัญชีรับค่าตอบแทน') && h.includes('สมัครเป็น Recruit'));

  // ── สมัคร → เป็น Recruit ทันที + เข้าระบบอัตโนมัติ → ตั้งรหัสผ่านเองในแดชบอร์ด (28 ต.ค. 2569) ──
  const tag = String(Date.now()).slice(-6);
  const body = { name: 'สมใจ แนะนำเก่ง', phone: '08' + tag + '12', email: `rc${tag}@test.local`, line_id: 'somjai' + tag, channel: 'กลุ่มเพื่อน', bank: 'กสิกรไทย (KBank)', account: '1234567890', account_name: 'สมใจ แนะนำเก่ง' };
  const A = (b) => fetch(B + '/api/recruit/apply', { method: 'POST', headers: { ...ORIGIN, 'x-forwarded-for': '10.50.' + tag.slice(-2) + '.1' }, body: JSON.stringify(b) });
  let r = await A({ ...body });
  ok('no consent → refused', r.status === 400);
  r = await A({ ...body, consent: true, phone: '123' });
  ok('bad phone → refused', r.status === 400);
  r = await A({ ...body, consent: true });
  let j = await J(r);
  const sc = (r.headers.get('set-cookie') || '').split(';')[0];
  ok('apply → recruit at once + logged in', r.status === 200 && j.ok && /^[A-Z0-9]{4,12}$/.test(j.code || '') && j.username === `rc${tag}` && sc.startsWith('mb_sales='), JSON.stringify(j).slice(0, 160));
  r = await A({ ...body, consent: true });
  ok('same email/phone again refused', r.status === 400);
  h = un(await (await fetch(B + '/recruit/me?welcome=1', { headers: { cookie: sc } })).text());
  ok('dashboard: own code + welcome + set-password card', h.includes(j.code) && h.includes('data-recruit-link="rlink"') && h.includes('data-recruit-welcome') && h.includes('data-recruit-password="unset"') && h.includes(`rc${tag}@test.local`));
  const PW = (b, c = sc) => fetch(B + '/api/sales/password', { method: 'POST', headers: { ...ORIGIN, cookie: c }, body: JSON.stringify(b) });
  r = await fetch(B + '/api/sales/login', { method: 'POST', headers: ORIGIN, body: JSON.stringify({ username: `rc${tag}@test.local`, password: '' }) });
  ok('no password yet → cannot log in', r.status === 401);
  ok('set password needs login', (await PW({ password: 'newpass-123' }, '')).status === 401);
  ok('short password refused', (await PW({ password: 'short' })).status === 400);
  r = await PW({ password: 'first-pass-1' });
  ok('first password set without current', r.status === 200 && (await J(r)).ok);
  h = un(await (await fetch(B + '/recruit/me', { headers: { cookie: sc } })).text());
  ok('card now shows password set', h.includes('data-recruit-password="set"') && !h.includes('data-recruit-welcome'));
  ok('change needs current password', (await PW({ password: 'second-pass-2', current: 'wrong-one' })).status === 400);
  ok('change with current password', (await PW({ password: 'second-pass-2', current: 'first-pass-1' })).status === 200);
  for (const [u, pw, want, name] of [[`RC${tag}@test.local`, 'second-pass-2', 200, 'login with email'], [`rc${tag}`, 'second-pass-2', 200, 'login with ID'], [`rc${tag}`, 'first-pass-1', 401, 'old password refused']]) {
    r = await fetch(B + '/api/sales/login', { method: 'POST', headers: ORIGIN, body: JSON.stringify({ username: u, password: pw }) });
    ok(name, r.status === want, String(r.status));
  }
  h = un(await (await fetch(B + '/admin/sales', { headers: ADM })).text());
  ok('admin sees auto-approved recruit', h.includes('สมใจ แนะนำเก่ง') && !h.includes('data-recruit-app=""'));
  const S = (b) => fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify(b) }).then(J);
  const appId = (h.match(new RegExp(`"id":"([0-9a-f-]{36})","name":"สมใจ แนะนำเก่ง"`)) || [])[1];
  ok('auto-approved app cannot be approved again', !!appId && !(await S({ action: 'app_approve', id: appId })).ok);

  // ── โปสเตอร์ · แอดมินดูหน้า Recruit · กระเป๋าเงินทุกคน (28 ต.ค. 2569) ──
  h = un(await (await fetch(B + '/recruit/apply')).text());
  ok('apply page shows poster', h.includes('data-recruit-poster') && (await fetch(B + '/brand/recruit-poster.webp')).status === 200);
  const repId = (un(await (await fetch(B + '/admin/sales', { headers: ADM })).text()).match(/\/recruit\/me\?rep=([0-9a-f-]{36})/) || [])[1];
  ok('admin sales: view-profile link per recruit', !!repId);
  h = un(await (await fetch(B + `/recruit/me?rep=${repId}`, { headers: { cookie: 'mord_admin=' + adm } })).text());
  ok('admin views recruit dashboard (read-only)', h.includes('data-admin-view') && h.includes('data-recruit-link="rlink"'));
  r = await fetch(B + `/recruit/me?rep=${repId}`, { redirect: 'manual' });
  ok('?rep= without admin → not shown', r.status !== 200 || !(await r.text()).includes('data-admin-view'));
  h = un(await (await fetch(B + '/admin/wallets', { headers: ADM })).text());
  ok('wallets page lists owners', h.includes('data-wallets') && h.includes('กระเป๋าเงินทุกคน') && h.includes('"type":"parttime"'));
  const pt = (h.match(/"key":"parttime:([0-9a-f-]{36})"/) || [])[1];
  const wj = pt ? await J(await fetch(B + `/api/admin/wallets?type=parttime&id=${pt}`, { headers: ADM })) : {};
  ok('wallet history API (admin)', wj.ok && Array.isArray(wj.history) && wj.history.length > 0, JSON.stringify(wj).slice(0, 120));
  ok('wallet history needs admin', (await fetch(B + `/api/admin/wallets?type=parttime&id=${pt}`)).status === 401);
  h = un(await (await fetch(B + '/admin', { headers: ADM })).text());
  ok('nav has wallets page', h.includes('href="/admin/wallets"'));

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
