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
  ok('/recruit/apply form renders', h.includes('data-recruit-apply') && h.includes('บัญชีรับค่าตอบแทน') && h.includes('ส่งใบสมัคร Recruit'));

  // ── สมัคร ──
  const tag = String(Date.now()).slice(-6);
  const body = { name: 'สมใจ แนะนำเก่ง', phone: '08' + tag + '12', email: `rc${tag}@test.local`, line_id: 'somjai' + tag, channel: 'กลุ่มเพื่อน', bank: 'กสิกรไทย (KBank)', account: '1234567890', account_name: 'สมใจ แนะนำเก่ง' };
  const A = (b) => fetch(B + '/api/recruit/apply', { method: 'POST', headers: { ...ORIGIN, 'x-forwarded-for': '10.50.' + tag.slice(-2) + '.1' }, body: JSON.stringify(b) });
  let r = await A({ ...body });
  ok('no consent → refused', r.status === 400);
  r = await A({ ...body, consent: true, phone: '123' });
  ok('bad phone → refused', r.status === 400);
  r = await A({ ...body, consent: true });
  ok('valid application accepted', r.status === 200 && (await J(r)).ok);
  r = await A({ ...body, consent: true });
  ok('duplicate pending refused', r.status === 400);

  // ── แอดมินอนุมัติ → ID/รหัสผ่าน → เข้าแดชบอร์ดได้ ──
  h = un(await (await fetch(B + '/admin/sales', { headers: ADM })).text());
  ok('admin sees application', h.includes('data-recruit-apps') && h.includes('สมใจ แนะนำเก่ง'));
  const appId = (h.match(new RegExp(`"id":"([0-9a-f-]{36})","name":"สมใจ แนะนำเก่ง"`)) || [])[1];
  ok('application id found', !!appId);
  const S = (b) => fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify(b) }).then(J);
  let j = await S({ action: 'app_reject', id: appId });
  ok('reject needs reason', !j.ok);
  j = await S({ action: 'app_approve', id: appId });
  const ap = j;
  ok('approve → recruit code + login issued', j.ok && /^[A-Z0-9]{4,12}$/.test(j.code || '') && j.login?.username === `rc${tag}` && (j.login?.password || '').length === 10, JSON.stringify(j).slice(0, 200));
  j = await S({ action: 'app_approve', id: appId });
  ok('approve twice refused', !j.ok);
  r = await fetch(B + '/api/sales/login', { method: 'POST', headers: ORIGIN, body: JSON.stringify({ username: `rc${tag}`, password: 'wrong-pass-00' }) });
  ok('wrong password refused', r.status === 401);
  r = await fetch(B + '/api/sales/login', { method: 'POST', headers: ORIGIN, body: JSON.stringify({ username: `rc${tag}`, password: ap.login?.password }) });
  const sc = (r.headers.get('set-cookie') || '').split(';')[0];
  ok('new recruit logs in', r.status === 200 && sc.startsWith('mb_sales='), String(r.status));
  h = un(await (await fetch(B + '/recruit/me', { headers: { cookie: sc } })).text());
  ok('dashboard at /recruit/me with own code', h.includes(ap.code) && h.includes('data-recruit-link="rlink"'));
  const approved = await S({ action: 'app_reject', id: appId, reason: 'x' });
  ok('decided app cannot be rejected', !approved.ok);
  h = un(await (await fetch(B + '/admin/sales', { headers: ADM })).text());
  ok('approved app leaves pending queue', !h.includes('data-recruit-app=""') && h.includes('สมใจ แนะนำเก่ง'));

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
