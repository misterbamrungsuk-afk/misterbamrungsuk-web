// Marketplace หลายร้าน: ร้านสมัครเอง → แอดมินอนุมัติ → ร้านตั้งค่าส่ง + ลงสินค้า → ลูกค้าจ่ายจากกระเป๋า (รวมค่าส่ง) → ร้านส่ง → สำเร็จ → ร้านได้เงิน
// + ออเดอร์กระเป๋าที่ถูกปฏิเสธ → คืนเงินเข้ากระเป๋าอัตโนมัติ · ledger รวม 0 (โหมดเดโม localhost:3210)
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json();
const IP = `10.28.${crypto.randomInt(255)}.${crypto.randomInt(255)}`; // แยกตัวนับ rate limit ของชุดนี้
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const phone = (ph) => { const b = Buffer.from(JSON.stringify({ phone: ph, exp: Date.now() + 3600e3, v: true })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('phone:' + b).digest('base64url'); };
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const post = (u, h, b) => fetch(B + u, { method: 'POST', headers: { 'x-forwarded-for': IP, ...h }, body: JSON.stringify(b) });
const form = (o, files = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); for (const [k, [buf, name, type]] of Object.entries(files)) f.set(k, new File([buf], name, { type })); return f; };
// สมัครแต่ละครั้งใช้ IP ต่างกัน (เพดาน 5 ครั้ง/15 นาที/IP)
const apply = (o, files) => fetch(B + '/api/market/apply', { method: 'POST', headers: { 'x-forwarded-for': `10.29.${crypto.randomInt(255)}.${crypto.randomInt(255)}` }, body: form(o, files) });
const adminData = async () => J(await fetch(B + '/api/market/admin', { headers: ADM }));
const custBal = async (C) => (await J(await fetch(B + '/api/wallet', { headers: C }))).available;
(async () => {
  const tag = Date.now().toString(36);
  const email = `brand-${tag}@test.local`;
  const base = { shop_name: `Brand ${tag}`, owner_name: 'คุณเจ้าของ ทดสอบ', phone: '0812345678', email, line_id: 'brandline', business_type: 'person', category: 'อื่น ๆ', description: 'ขายชาสมุนไพร', consent: '1' };

  // ── 1) ร้านสมัครเอง ──
  ok('sell page renders', (await fetch(B + '/market/sell')).status === 200);
  ok('market links to sell page', (await (await fetch(B + '/market')).text()).includes('/market/sell'));
  let r = await apply({ ...base, consent: '' }, { doc_main: [img, 'id.jpg', 'image/jpeg'] }); ok('consent required', r.status === 400);
  r = await apply(base, {}); ok('ID document required', r.status === 400);
  r = await apply({ ...base, email: `fake-${tag}@test.local` }, { doc_main: [Buffer.from('not an image'), 'id.jpg', 'image/jpeg'] }); ok('fake document refused (magic bytes)', r.status === 400, String(r.status));
  r = await apply(base, { doc_main: [img, 'id.jpg', 'image/jpeg'], doc_fda: [pdf, 'fda.pdf', 'application/pdf'] }); let j = await J(r); ok('apply ok (ID + อย. PDF)', r.status === 200 && j.ok, j.error);
  r = await apply(base, { doc_main: [img, 'id.jpg', 'image/jpeg'] }); ok('duplicate email → 409', r.status === 409);
  r = await apply({ ...base, email: `other-${tag}@test.local`, shop_name: `Other ${tag}`, business_type: 'company' }, { doc_main: [pdf, 'cert.pdf', 'application/pdf'] }); ok('company applies with cert PDF', r.status === 200);

  // ── 2) แอดมินตรวจ ──
  let d = await adminData();
  const app = d.applications.find((a) => a.email === email), app2 = d.applications.find((a) => a.email === `other-${tag}@test.local`);
  ok('admin queue lists pending applications', app?.status === 'pending' && app2?.status === 'pending' && app.docs.length === 2);
  ok('application ip not exposed', app && !('ip' in app));
  ok('doc needs admin', (await fetch(B + `/api/market/admin/apply-doc?id=${app.id}&i=0`)).status === 401);
  r = await fetch(B + `/api/market/admin/apply-doc?id=${app.id}&i=1`, { headers: ADM }); ok('admin opens อย. PDF (download)', r.status === 200 && r.headers.get('content-type') === 'application/pdf' && /attachment/.test(r.headers.get('content-disposition') || ''));
  j = await J(await post('/api/market/admin/applications', ADM, { op: 'reject', id: app2.id })); ok('reject needs reason', !j.ok);
  j = await J(await post('/api/market/admin/applications', ADM, { op: 'reject', id: app2.id, reason: 'เอกสารไม่ชัด' })); ok('reject with reason', j.ok && j.application.status === 'rejected');
  r = await apply({ ...base, email: `other-${tag}@test.local`, shop_name: `Other ${tag}`, business_type: 'company' }, { doc_main: [pdf, 'cert.pdf', 'application/pdf'] }); ok('rejected applicant may re-apply', r.status === 200);
  ok('apply API needs admin', (await post('/api/market/admin/applications', {}, { op: 'approve', id: app.id })).status === 401);
  j = await J(await post('/api/market/admin/applications', ADM, { op: 'approve', id: app.id, gp_pct: 20 })); ok('approve → vendor + invite link', j.ok && j.vendor?.gp_pct === 20 && /^\/vendor\/invite\?t=/.test(j.invite || ''), j.error);
  const vid = j.vendor.id, inv = decodeURIComponent(j.invite.split('t=')[1]);
  r = await post('/api/market/admin/applications', ADM, { op: 'approve', id: app.id, gp_pct: 20 }); ok('approve twice → 409', r.status === 409);
  r = await apply(base, { doc_main: [img, 'id.jpg', 'image/jpeg'] }); ok('approved email cannot apply again', r.status === 409);

  // ── 3) ร้านรับคำเชิญ → ตั้งค่าส่ง → ลงสินค้า → แอดมินอนุมัติสินค้า ──
  const acc = await fetch(B + '/api/market/vendor/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'accept', t: inv, password: 'demo-' + crypto.randomBytes(6).toString('hex') }) });
  const VC = { cookie: (acc.headers.get('set-cookie') || '').split(';')[0], 'content-type': 'application/json' };
  ok('vendor accepts invite', VC.cookie.startsWith('mb_vendor='));
  j = await J(await post('/api/market/vendor', VC, { op: 'shipping', shipping_fee: -5 })); ok('negative shipping refused', !j.ok);
  j = await J(await post('/api/market/vendor', VC, { op: 'shipping', shipping_fee: 50, free_threshold: 5000 })); ok('vendor sets shipping ฿50 (free ≥ ฿5,000)', j.ok && j.vendor.shipping_fee === 50 && j.vendor.free_threshold === 5000, j.error);
  const pf = form({ name: `ชาสมุนไพร ${tag}`, price: '500', stock: '10', fda_no: '10-1-22222-2-2222', published: '1', age_restricted: '0' }, { image: [img, 'p.jpg', 'image/jpeg'] });
  j = await J(await fetch(B + '/api/market/vendor/products', { method: 'POST', headers: { cookie: VC.cookie }, body: pf })); ok('vendor adds product (awaits approval)', j.ok && j.product.approved === false, j.error);
  const prod = j.product;
  let pub = await J(await fetch(B + '/api/market/products')); ok('unapproved product hidden', !(pub.products || []).some((p) => p.id === prod.id));
  j = await J(await fetch(B + '/api/market/admin/products', { method: 'POST', headers: { cookie: ADM.cookie }, body: form({ id: prod.id, vendor_id: vid, name: prod.name, price: '500', stock: '10', fda_no: prod.fda_no, published: '1', approved: '1', age_restricted: '0' }) })); ok('admin approves product', j.ok && j.product.approved === true, j.error);
  pub = await J(await fetch(B + '/api/market/products')); ok('approved product public', (pub.products || []).some((p) => p.id === prod.id));
  r = await fetch(B + `/products/${prod.id}`); ok('product page shows vendor shipping', (await r.text()).replace(/<!-- -->/g, '').includes('฿50'));

  // ── 4) ลูกค้าเติมเงิน (แอดมินอนุมัติ) → ซื้อด้วยกระเป๋า ──
  const sub = `demo:buyer-${tag}@test.local`;
  const sess = 'hamoo_session=' + sign({ sub, email: `buyer-${tag}@test.local`, exp: Date.now() + 3600e3 });
  const CC = { cookie: sess };
  const BC = { cookie: 'mb_phone_ok=' + encodeURIComponent(phone('66812224444')) + '; ' + sess, 'content-type': 'application/json' };
  r = await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { ...CC, 'x-forwarded-for': IP }, body: form({ amount: '3000' }, { slip: [img, 's.jpg', 'image/jpeg'] }) }); j = await J(r); ok('customer top-up request', j.ok, j.error);
  const tp = (await J(await fetch(B + '/api/admin/wallet', { headers: ADM }))).topups.find((t) => t.customer_id === sub && t.status === 'pending');
  j = await J(await post('/api/admin/wallet', ADM, { action: 'approve', id: tp?.id })); ok('admin approves top-up', j.ok, j.error);
  ok('balance ฿3,000', (await custBal(CC)) === 300000);
  j = await J(await post('/api/market/promo', {}, { items: [{ id: prod.id, qty: 2 }] })); ok('cart price: per-shop shipping ฿50', j.shipping_fee === 50 && j.total === 1050 && j.groups?.[0]?.vendor_id === vid && j.groups[0].shipping_fee === 50, JSON.stringify(j).slice(0, 160));
  const order = { name: 'ผู้ซื้อ กระเป๋า', address: '88/8 ถนนทดสอบ แขวงทดสอบ กรุงเทพ 10110', age_confirm: true, pay: 'wallet' };
  r = await post('/api/market/orders', { 'content-type': 'application/json', cookie: 'mb_phone_ok=' + encodeURIComponent(phone('66812224444')) }, { ...order, items: [{ id: prod.id, qty: 1 }] }); ok('wallet pay needs login', r.status === 401);
  r = await post('/api/market/orders', BC, { ...order, items: [{ id: prod.id, qty: 7 }] }); ok('not enough balance → refused, no order', r.status === 402);
  j = await J(await post('/api/market/orders', BC, { ...order, items: [{ id: prod.id, qty: 2 }] })); ok('buy 2 × ฿500 with wallet → paid', j.ok && j.status === 'paid' && j.pay_method === 'wallet' && j.total === 1050, j.error);
  const oid = j.id;
  ok('balance deducted incl. shipping (฿1,950 left)', (await custBal(CC)) === 195000);
  j = await J(await fetch(B + `/api/market/track?id=${oid}&t=${encodeURIComponent(j.token)}`)); ok('buyer track shows paid by wallet', j.order?.status === 'paid' && j.order.pay_method === 'wallet');
  d = await adminData(); let o = d.orders.find((x) => x.id === oid);
  ok('order split: shipping ฿50 to shop, GP 20% of goods', o?.vendor_split?.[0]?.shipping === 50 && o.vendor_split[0].gp === 200 && o.vendor_split[0].payout === 850, JSON.stringify(o?.vendor_split));
  ok('stock reduced', d.products.find((p) => p.id === prod.id)?.stock === 8);

  // ── 5) ร้านส่งของ → ปิดงาน → เงินเข้ากระเป๋าร้าน ──
  const vo = (await J(await fetch(B + '/api/market/vendor', { headers: VC }))).orders.find((x) => x.id === oid);
  ok('vendor sees paid order', vo?.status === 'paid' && vo.split?.payout === 850);
  j = await J(await post(`/api/market/vendor/orders/${oid}`, VC, { tracking_no: 'TH28' + tag, carrier: 'flash' })); ok('vendor ships', j.ok && j.status === 'shipped', j.error);
  ok('vendor wallet 0 before done', (await J(await fetch(B + '/api/market/vendor/wallet', { headers: VC }))).available === 0);
  j = await J(await post(`/api/market/admin/orders/${oid}`, ADM, { action: 'done' })); ok('admin marks done', j.ok && j.order.status === 'done', j.error);
  ok('vendor credited 1,000 − GP 200 + ship 50 = ฿850', (await J(await fetch(B + '/api/market/vendor/wallet', { headers: VC }))).available === 85000);
  const pts = (await J(await fetch(B + '/api/membership', { headers: CC }))).me?.points ?? 0; ok('buyer earns points', pts > 0, String(pts));

  // ── 6) ออเดอร์กระเป๋าใบที่ 2 ถูกปฏิเสธ → คืนเงินอัตโนมัติ ──
  j = await J(await post('/api/market/orders', BC, { ...order, items: [{ id: prod.id, qty: 1 }] })); ok('second wallet order paid', j.ok && j.status === 'paid', j.error);
  const oid2 = j.id;
  ok('balance ฿1,400', (await custBal(CC)) === 140000);
  j = await J(await post(`/api/market/admin/orders/${oid2}`, ADM, { action: 'reject', reason: 'สินค้าหมดชั่วคราว' })); ok('admin rejects wallet order', j.ok && j.order.status === 'rejected' && j.order.admin_note?.startsWith('[คืนเงินผู้ซื้อแล้ว'), j.error || j.order?.admin_note);
  ok('customer refunded to ฿1,950', (await custBal(CC)) === 195000);
  j = await J(await post(`/api/market/admin/orders/${oid2}`, ADM, { action: 'refunded' })); ok('no double refund', !j.ok && (await custBal(CC)) === 195000);
  d = await adminData(); ok('stock restored after reject', d.products.find((p) => p.id === prod.id)?.stock === 8);
  const w = await J(await fetch(B + '/api/wallet', { headers: CC })); ok('wallet history has purchase + refund', w.history.some((h) => h.kind === 'market_sale' && h.amount === -55000) && w.history.some((h) => h.kind === 'refund' && h.amount === 55000));
  const lw = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  ok('market escrow empty (only shipped-not-done would hold)', (lw.accounts.find((a) => a.owner_type === 'platform' && a.bucket === 'market_escrow')?.balance ?? 0) === 0);
  ok('ledger sum 0', lw.sum === 0, String(lw.sum));

  // ── 7) ออเดอร์โอนเงินที่ไม่ชำระภายใน 24 ชม. → ยกเลิก "หมดเวลาชำระ" (กวาดตอนเปิดหน้าภาพรวมแอดมิน / cron) ──
  const slipOrder = { ...order, pay: 'slip' };
  const ex = await J(await post('/api/market/orders', BC, { ...slipOrder, items: [{ id: prod.id, qty: 1 }] })); ok('slip order (no slip) created', ex.ok && ex.status === 'pending', ex.error);
  const ws = await J(await post('/api/market/orders', BC, { ...slipOrder, items: [{ id: prod.id, qty: 1 }] })); ok('slip order (slip attached) created', ws.ok, ws.error);
  r = await fetch(B + `/api/market/orders/${ws.id}/slip`, { method: 'POST', headers: { 'x-forwarded-for': IP }, body: form({ token: ws.token }, { slip: [img, 'slip.jpg', 'image/jpeg'] }) }); ok('slip attached (awaits admin)', (await J(r)).ok);
  const fresh = await J(await post('/api/market/orders', BC, { ...slipOrder, items: [{ id: prod.id, qty: 1 }] })); ok('fresh slip order created', fresh.ok, fresh.error);
  const age = async (id, hours) => J(await post(`/api/market/admin/orders/${id}`, ADM, { action: 'demo_age', hours }));
  ok('demo_age needs admin', (await post(`/api/market/admin/orders/${ex.id}`, {}, { action: 'demo_age', hours: 25 })).status === 401);
  ok('age unpaid order 25 h', (await age(ex.id, 25)).ok);
  ok('age slip-attached order 25 h', (await age(ws.id, 25)).ok);
  ok('age paid wallet order 25 h', (await age(oid, 25)).ok);
  const stock0 = (await adminData()).products.find((p) => p.id === prod.id)?.stock;
  await fetch(B + '/admin', { headers: ADM }); // sweepLight → sweepOrders
  const track = async (x) => (await J(await fetch(B + `/api/market/track?id=${x.id}&t=${encodeURIComponent(x.token)}`))).order;
  let te = await track(ex);
  for (let i = 0; i < 10 && te?.status === 'pending'; i++) { await new Promise((s) => setTimeout(s, 500)); te = await track(ex); }
  ok('unpaid order expired after 24 h', te?.status === 'rejected' && te.reject_reason === 'หมดเวลาชำระ', te?.status + ' ' + te?.reject_reason);
  ok('slip-attached order untouched (admin decides)', (await track(ws))?.status === 'pending');
  ok('fresh order untouched', (await track(fresh))?.status === 'pending');
  ok('wallet order never expired', (await adminData()).orders.find((x) => x.id === oid)?.status === 'done');
  ok('stock unchanged (pending never reserved stock)', (await adminData()).products.find((p) => p.id === prod.id)?.stock === stock0);
  // หน้าติดตามโหลดข้อมูลฝั่งเบราว์เซอร์ → ตรวจจาก API ที่หน้านั้นเรียก (id + t จากลิงก์ติดตาม)
  { const q = new URL(B + ex.track).searchParams; const tj = await J(await fetch(B + `/api/market/track?id=${encodeURIComponent(q.get('id') || '')}&t=${encodeURIComponent(q.get('t') || '')}`)); const o = tj.order ?? tj.orders?.[0]; ok('track API: rejected · หมดเวลาชำระ', o?.status === 'rejected' && o?.reject_reason === 'หมดเวลาชำระ', JSON.stringify(tj).slice(0, 160)); }
  const nts = (await J(await fetch(B + '/api/notifications', { headers: CC }))).notices || [];
  ok('buyer notified (logged-in order)', nts.some((n) => n.kind === 'market_order_expired' && n.title.includes(ex.order_no)));
  r = await fetch(B + `/api/market/orders/${ex.id}/slip`, { method: 'POST', headers: { 'x-forwarded-for': IP }, body: form({ token: ex.token }, { slip: [img, 'late.jpg', 'image/jpeg'] }) }); ok('late slip refused', r.status === 409);
  for (const x of [ws, fresh]) await post(`/api/market/admin/orders/${x.id}`, ADM, { action: 'reject', reason: 'ทดสอบ e2e' });
  ok('ledger sum 0 (after expiry)', (await J(await fetch(B + '/api/admin/wallet', { headers: ADM }))).sum === 0);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
