// กระเป๋าแยกพาร์ทเนอร์ / ร้านค้า + ถอน 2 ชั้น (CEO อนุมัติ → แอดมินโอน) · ออเดอร์สำเร็จ → ส่วนของร้านเข้ากระเป๋า (โหมดเดโม · รันหลัง 09-partner)
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm, sup } = require('./_tok');
const B = 'http://localhost:3210';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json();
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const SUP = { cookie: 'mord_admin=' + sup, 'content-type': 'application/json' };
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const phone = (ph) => { const b = Buffer.from(JSON.stringify({ phone: ph, exp: Date.now() + 3600e3, v: true })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('phone:' + b).digest('base64url'); };
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const BANK = { bank: 'กสิกรไทย', account: '123-4-56789-0', name: 'บจก. ทดสอบ' };
const post = (u, h, b) => fetch(B + u, { method: 'POST', headers: h, body: JSON.stringify(b) });
(async () => {
  // ── พาร์ทเนอร์ ──
  const list = await J(await fetch(B + '/api/admin/partners', { headers: ADM }));
  const p = (list.rows || list.partners || list).find?.((x) => x.email.startsWith('spa-owner'));
  ok('partner from 09 exists', !!p);
  const PC = { cookie: 'mb_partner=' + sign({ k: 'ps', pid: p.id, exp: Date.now() + 3600e3 }), 'content-type': 'application/json' };
  ok('wallet needs partner login', (await fetch(B + '/api/partner/wallet')).status === 401);
  let w = await J(await fetch(B + '/api/partner/wallet', { headers: PC })); ok('partner wallet starts 0', w.ok && w.available === 0, JSON.stringify(w).slice(0, 80));
  ok('portal wallet page', (await fetch(B + '/partner/portal/wallet', { headers: PC })).status === 200);
  let j = await J(await post('/api/partner/wallet', PC, { amount: 500, bank: BANK })); ok('cannot withdraw more than balance', !j.ok);
  j = await J(await post('/api/admin/wallet', ADM, { action: 'adjust', owner_type: 'partner', owner_id: p.id, bucket: 'available', amount_baht: 3000, reason: 'ค่าห้องทดสอบ', idem: 'e2e-pw-' + p.id })); ok('admin credits partner', j.ok, j.error);
  j = await J(await post('/api/partner/wallet', PC, { amount: 1000, bank: { bank: 'x', account: '12', name: '' } })); ok('bad bank refused', !j.ok);
  j = await J(await post('/api/partner/wallet', PC, { amount: 1000, bank: BANK })); ok('partner requests ฿1,000', j.ok && j.request.status === 'requested', j.error); const pr = j.request?.id;
  j = await J(await post('/api/partner/wallet', PC, { amount: 500, bank: BANK })); ok('one open request at a time', !j.ok);
  w = await J(await fetch(B + '/api/partner/wallet', { headers: PC })); ok('moved to withdrawing', w.available === 200000 && w.withdrawing === 100000, `${w.available} ${w.withdrawing}`);
  let t = (await (await fetch(B + '/admin/payroll', { headers: ADM })).text()).replace(/<!-- -->/g, ''); ok('CEO page lists partner request', t.includes('สปาทดสอบพอร์ทัล') && t.includes('ถอนเงินพาร์ทเนอร์'));
  ok('super cannot approve', (await post('/api/admin/payout-requests', SUP, { action: 'approve', id: pr })).status === 403);
  ok('cannot pay before CEO approves', (await post('/api/admin/payout-requests', ADM, { action: 'paid', id: pr })).status === 409);
  j = await J(await post('/api/admin/payout-requests', ADM, { action: 'approve', id: pr })); ok('CEO approves', j.ok, j.error);
  const ad = await J(await fetch(B + '/api/admin/payout-requests', { headers: SUP })); ok('admin sees approved + wallet list', ad.requests.some((r) => r.id === pr && r.status === 'approved') && ad.wallets.some((x) => x.owner_id === p.id));
  j = await J(await post('/api/admin/payout-requests', SUP, { action: 'paid', id: pr })); ok('admin (super) marks paid', j.ok, j.error);
  ok('paid twice refused', (await post('/api/admin/payout-requests', SUP, { action: 'paid', id: pr })).status === 409);
  w = await J(await fetch(B + '/api/partner/wallet', { headers: PC })); ok('withdrawing cleared, history shows paid', w.withdrawing === 0 && w.requests[0].status === 'paid' && w.lastBank?.account === '123-4-56789-0');
  // CEO ไม่อนุมัติ → คืนยอด
  j = await J(await post('/api/partner/wallet', PC, { amount: 2000, bank: BANK })); const pr2 = j.request?.id;
  j = await J(await post('/api/admin/payout-requests', ADM, { action: 'reject', id: pr2, note: 'ทดสอบ' })); ok('CEO rejects → refunded', j.ok);
  w = await J(await fetch(B + '/api/partner/wallet', { headers: PC })); ok('balance back to ฿2,000', w.available === 200000 && w.withdrawing === 0, String(w.available));

  // ── ร้านค้า: ออเดอร์สำเร็จ → ส่วนของร้านเข้ากระเป๋า ──
  j = await J(await post('/api/market/admin/vendors', ADM, { name: 'ร้านทดสอบกระเป๋า', contact: '', gp_pct: 20 })); ok('create vendor GP 20%', j.ok, j.error); const vid = j.vendor.id;
  const fd = new FormData(); for (const [k, v] of Object.entries({ vendor_id: vid, name: 'ชาสมุนไพรทดสอบ', price: '500', stock: '10', published: '1', fda_no: '10-1-11111-1-1111', age_restricted: '0' })) fd.set(k, v); fd.append('image', new File([img], 'p.jpg', { type: 'image/jpeg' }));
  j = await J(await fetch(B + '/api/market/admin/products', { method: 'POST', headers: { cookie: ADM.cookie }, body: fd })); ok('create product ฿500', j.ok, j.error); const prod = j.product.id;
  j = await J(await fetch(B + '/api/market/admin/accounts', { method: 'POST', headers: ADM, body: JSON.stringify({ vendor_id: vid, email: `shop${Date.now()}@test.local` }) })); ok('vendor account', j.ok, j.error);
  const inv = decodeURIComponent(j.invite.split('t=')[1]);
  const acc = await fetch(B + '/api/market/vendor/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'accept', t: inv, password: 'demo-' + crypto.randomBytes(6).toString('hex') }) });
  const VC = { cookie: (acc.headers.get('set-cookie') || '').split(';')[0], 'content-type': 'application/json' };
  ok('vendor accepts invite (demo)', VC.cookie.startsWith('mb_vendor='));
  w = await J(await fetch(B + '/api/market/vendor/wallet', { headers: VC })); ok('vendor wallet 0', w.ok && w.available === 0, JSON.stringify(w).slice(0, 60));
  const BC = { cookie: 'mb_phone_ok=' + encodeURIComponent(phone('66812223333')), 'content-type': 'application/json' };
  j = await J(await post('/api/market/orders', BC, { name: 'ผู้ซื้อ ทดสอบ', address: '99/1 ถนนทดสอบ แขวงทดสอบ กรุงเทพ 10110', items: [{ id: prod, qty: 2 }], age_confirm: true })); ok('buyer orders 2 × ฿500', j.ok, j.error);
  const oid = j.id || j.order?.id, tok = j.token;
  const sf = new FormData(); sf.set('token', tok); sf.set('slip', new File([img], 's.jpg', { type: 'image/jpeg' }));
  j = await J(await fetch(B + `/api/market/orders/${oid}/slip`, { method: 'POST', body: sf })); ok('slip attached', j.ok, j.error);
  for (const [a, x] of [['confirm', {}], ['ship', { tracking_no: 'TH123', carrier: 'flash' }]]) { j = await J(await post(`/api/market/admin/orders/${oid}`, ADM, { action: a, ...x })); ok('order ' + a, j.ok, j.error); }
  w = await J(await fetch(B + '/api/market/vendor/wallet', { headers: VC })); ok('not credited before done', w.available === 0);
  const o = (await J(await post(`/api/market/admin/orders/${oid}`, ADM, { action: 'done' }))).order; const ship = Number(o.shipping_fee || 0);
  w = await J(await fetch(B + '/api/market/vendor/wallet', { headers: VC })); const want = Math.round((1000 - 200 + ship) * 100);
  ok('done → vendor gets 1,000 − GP 200 + shipping', w.available === want, `${w.available} vs ${want}`);
  await post(`/api/market/admin/orders/${oid}`, ADM, { action: 'regp' }); w = await J(await fetch(B + '/api/market/vendor/wallet', { headers: VC })); ok('regp does not double-credit', w.available === want);
  j = await J(await post('/api/market/vendor/wallet', VC, { amount: want / 100, bank: BANK })); ok('vendor requests full amount', j.ok, j.error); const vr = j.request?.id;
  t = (await (await fetch(B + '/admin/payroll', { headers: ADM })).text()).replace(/<!-- -->/g, ''); ok('CEO page lists vendor request', t.includes('ร้านทดสอบกระเป๋า') && t.includes('ถอนเงินร้านค้า Marketplace'));
  await post('/api/admin/payout-requests', ADM, { action: 'approve', id: vr });
  j = await J(await post('/api/admin/payout-requests', ADM, { action: 'failed', id: vr, note: 'เลขบัญชีผิด' })); ok('transfer failed → refunded', j.ok);
  w = await J(await fetch(B + '/api/market/vendor/wallet', { headers: VC })); ok('vendor balance restored', w.available === want && w.requests[0].status === 'failed');
  ok('vendor portal page', (await fetch(B + '/vendor', { headers: VC })).status === 200);
  // บัญชีคู่สมดุล
  const lw = await J(await fetch(B + '/api/admin/wallet', { headers: ADM })); ok('ledger balanced', lw.sum === 0, String(lw.sum));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
