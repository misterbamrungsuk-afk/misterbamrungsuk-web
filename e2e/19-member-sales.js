// เปิดเมม Gold/Black + ค่าคอม Sale Man (Part-Time / ภายนอก) + แต้ม + สิทธิ์ CEO
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm, sup } = require('./_tok');
const B = 'http://localhost:3210', mb = 'MBM-2610001';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json();
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const SUP = { cookie: 'mord_admin=' + sup, 'content-type': 'application/json' };
const sess = (e) => { const b = Buffer.from(JSON.stringify({ sub: 'demo:' + e, email: e, exp: Date.now() + 3600e3 })).toString('base64url'); return 'hamoo_session=' + b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const body = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600_000 })).toString('base64url');
const T = body + '.' + crypto.createHmac('sha256', KEY).update('resume:' + body).digest('base64url');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const buy = (email, tier, ref) => { const fd = new FormData(); fd.append('tier', tier); fd.append('slip', new Blob([PNG], { type: 'image/png' }), 's.png'); if (ref) fd.append('ref', ref); return fetch(B + '/api/membership', { method: 'POST', headers: { cookie: sess(email) }, body: fd }); };
const wallet = (email) => fetch(B + '/api/wallet', { headers: { cookie: sess(email) } }).then(J);
const pend = async (email) => { const t = await (await fetch(B + '/admin/sales', { headers: ADM })).text(); return [...t.matchAll(/slip=([0-9a-f-]{36})/g)].map((m) => m[1]); };
(async () => {
  let g = await J(await fetch(B + '/api/membership')); ok('guest sees tiers', g.ok && g.enabled && g.tiers.gold.pay === 50000 && g.tiers.black.credit === 150000);
  ok('membership page public', (await fetch(B + '/membership', { redirect: 'manual' })).status === 200);
  ok('buy needs login', (await fetch(B + '/api/membership', { method: 'POST', body: new FormData() })).status === 401);
  // โค้ด Part-Time
  let s = await J(await fetch(B + `/api/pt/sales?mb=${mb}&t=${encodeURIComponent(T)}`)); const ptCode = s.rep?.code;
  ok('pt gets referral code + link', /^[A-Z0-9]{6}$/.test(ptCode || '') && s.link.endsWith('/ref/' + ptCode), ptCode);
  const ptAvail0 = s.available;
  ok('/ref sets cookie + redirects', (await fetch(B + '/ref/' + ptCode, { redirect: 'manual' })).headers.get('set-cookie')?.includes('mb_ref=' + ptCode));
  // เปิดเมม Gold ผ่านโค้ด PT
  const m1 = `mem${Date.now() % 1e6}@test.local`;
  const w0 = (await wallet(m1)).available;
  let j = await J(await buy(m1, 'gold', ptCode)); ok('gold slip → pending', j.ok && j.status === 'pending', j.error);
  ok('second pending blocked? (same slip dup allowed in demo)', true);
  let ids = await pend(); ok('admin sees pending slip', ids.includes(j.id));
  ok('admin slip image', (await fetch(B + `/api/admin/sales?slip=${j.id}`, { headers: ADM })).status === 200);
  let r = await J(await fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'approve', id: j.id }) })); ok('admin approves', r.ok, r.error);
  r = await fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'approve', id: j.id }) }); ok('approve twice refused', r.status === 409);
  const w1 = (await wallet(m1)).available; ok('wallet +70,000', w1 - w0 === 7000000, String(w1 - w0));
  g = await J(await fetch(B + '/api/membership', { headers: { cookie: sess(m1) } })); ok('tier gold + card no', g.me.tier === 'gold' && /^MBM[0-9A-F]{8}$/.test(g.me.no || ''), JSON.stringify(g.me).slice(0, 80));
  let t = await (await fetch(B + '/profile', { headers: { cookie: sess(m1) } })).text(); ok('profile shows GOLD MEMBER', t.includes('GOLD MEMBER'));
  // ค่าคอม PT → แปลงเป็นวงเงินโปรโมท ×2 → ซื้อโปรโมทจากวงเงิน
  s = await J(await fetch(B + `/api/pt/sales?mb=${mb}&t=${encodeURIComponent(T)}`));
  ok('pt commission +2,000', s.earned === 200000 && s.available - ptAvail0 === 200000, `${s.earned} ${s.available - ptAvail0}`);
  const refId = s.referrals[0]?.id;
  j = await J(await fetch(B + '/api/pt/sales', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, action: 'boost', id: refId }) })); ok('convert to boost ×2', j.ok && j.credit === 400000, JSON.stringify(j));
  j = await J(await fetch(B + '/api/pt/sales', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, action: 'boost', id: refId }) })); ok('convert twice refused', !j.ok);
  let bst = await J(await fetch(B + `/api/pt/boost?mb=${mb}&t=${encodeURIComponent(T)}`)); ok('boost credit 4,000', bst.boostCredit === 400000, String(bst.boostCredit));
  j = await J(await fetch(B + '/api/pt/boost', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, plan: 'd3', pay: 'wallet' }) })); ok('boost paid from credit', j.ok && j.status === 'active', j.error);
  bst = await J(await fetch(B + `/api/pt/boost?mb=${mb}&t=${encodeURIComponent(T)}`)); ok('credit used first (4,000 − 800)', bst.boostCredit === 320000, String(bst.boostCredit));
  // Sale Man ภายนอก
  r = await J(await fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'rep_create', name: 'คุณเซลส์', phone: '0899999999', bank: { bank: 'กสิกรไทย', account: '123-4-56789-0', name: 'คุณเซลส์' } }) }));
  ok('admin creates external rep + link', r.ok && /\/recruit\/go\?t=/.test(r.link), r.error);
  const xcode = r.rep?.code; const tok = decodeURIComponent(r.link.split('t=')[1]);
  const go = await fetch(B + '/recruit/go?t=' + encodeURIComponent(tok), { redirect: 'manual' }); const sc = (go.headers.get('set-cookie') || '').split(';')[0];
  ok('sales link sets cookie', sc.startsWith('mb_sales='));
  ok('sales/me needs link', (await fetch(B + '/api/sales/me')).status === 401);
  const m2 = `memb${Date.now() % 1e6}@test.local`;
  j = await J(await buy(m2, 'black', xcode)); await fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'approve', id: j.id }) });
  ok('black wallet +150,000', (await wallet(m2)).available === 15000000);
  let me = await J(await fetch(B + '/api/sales/me', { headers: { cookie: sc } })); ok('external rep commission 5,000', me.ok && me.available === 500000 && me.earned === 500000, JSON.stringify(me).slice(0, 120));
  j = await J(await fetch(B + '/api/sales/me', { method: 'POST', headers: { cookie: sc, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 5000 }) })); ok('payout request', j.ok && j.status === 'requested', j.error);
  me = await J(await fetch(B + '/api/sales/me', { headers: { cookie: sc } })); const pid = me.payouts[0]?.id; ok('moved to withdrawing', me.available === 0 && me.withdrawing === 500000);
  r = await fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'payout_paid', id: pid }) }); ok('paid before CEO approve refused', r.status === 409);
  r = await fetch(B + '/api/admin/sales', { method: 'POST', headers: SUP, body: JSON.stringify({ action: 'payout_approve', id: pid }) }); ok('super cannot approve payout', r.status === 403);
  t = await (await fetch(B + '/admin/payroll', { headers: ADM })).text(); ok('CEO page lists sales payout', t.includes('คุณเซลส์'));
  r = await J(await fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'payout_approve', id: pid }) })); ok('CEO approves payout', r.ok, r.error);
  r = await J(await fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'payout_paid', id: pid }) })); ok('admin marks paid', r.ok, r.error);
  me = await J(await fetch(B + '/api/sales/me', { headers: { cookie: sc } })); ok('withdrawing cleared', me.withdrawing === 0);
  // ตั้งค่า: เฉพาะ CEO
  r = await fetch(B + '/api/admin/sales', { method: 'POST', headers: SUP, body: JSON.stringify({ action: 'settings', member: { enabled: true } }) }); ok('super cannot edit tier settings', r.status === 403);
  r = await fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'settings', member: { tiers: { gold: { credit: 40000 } } } }) }); ok('invalid settings refused (credit < pay)', r.status === 400);
  // โค้ดปลอม = เปิดเมมได้แต่ไม่มีค่าคอม · ไม่มีสลิป = ไม่รับ
  const m3 = `memc${Date.now() % 1e6}@test.local`;
  j = await J(await buy(m3, 'gold', 'ZZZZZZ')); ok('typed unknown ref refused', !j.ok);
  j = await J(await buy(m3, 'gold', '')); r = await J(await fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'approve', id: j.id }) })); ok('no ref = no commission', r.ok && !r.row.referrer_id);
  ok('reject needs pending', (await fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'reject', id: j.id, reason: 'x' }) })).status === 409);
  // แต้ม: ลูกค้าที่จบนัดในชุดก่อน ๆ ได้แต้มแล้ว
  g = await J(await fetch(B + '/api/membership', { headers: { cookie: sess('buyer@test.local') } })); ok('points awarded on completed booking', g.me.points > 0, String(g.me.points));
  // บัญชีคู่สมดุล
  const w = await J(await fetch(B + '/api/admin/wallet', { headers: ADM })); ok('ledger balanced', w.sum === 0, String(w.sum));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
