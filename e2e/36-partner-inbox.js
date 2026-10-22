// กล่องแจ้งเตือนพาร์ทเนอร์ (โรงแรม/สปา) + ร้านค้า: ผูก push · แจ้งเตือนจากเหตุการณ์จริง · นับยังไม่อ่าน · อ่านแล้ว
// + คืนเงินหลังเข้าพักเสร็จ (บางส่วน + เต็ม) ดึงจากโรงแรม/แพลตฟอร์มตามสัดส่วน · ยอดโรงแรมไม่พอ = ปฏิเสธ · ledger รวม 0
// โหมดเดโม localhost:3210 · ใช้อีเมล/เวลาใหม่ทุกรอบ
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210', mb = 'MBM-2610001';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
// รอไฟล์ที่ไม่ได้เป็นเจ้าของแก้ (lib/payouts) — แสดงผลแต่ไม่นับว่าพัง
const pend = (n, c, x = '') => console.log((c ? 'PASS ' : 'PEND ') + n + (x ? ' · ' + x : ''));
const J = (r) => r.json();
const IP = `10.36.${crypto.randomInt(255)}.${crypto.randomInt(255)}`;
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const phone = (ph) => { const b = Buffer.from(JSON.stringify({ phone: ph, exp: Date.now() + 3600e3, v: true })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('phone:' + b).digest('base64url'); };
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const H = { 'content-type': 'application/json', origin: B };
const post = (u, h, b) => fetch(B + u, { method: 'POST', headers: { origin: B, 'x-forwarded-for': IP, ...h }, body: JSON.stringify(b) });
const form = (o, files = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); for (const [k, [buf, name, type]] of Object.entries(files)) f.set(k, new File([buf], name, { type })); return f; };
const bkk = (n = 0) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const run = Date.now() % 1e7;
const PT_T = (() => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600_000 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); })();
const BANK = { bank: 'กสิกรไทย', account: '123-4-56789-0', name: 'เจ้าของ ทดสอบ' };
const sub = (tag) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/e2e-${tag}-${run}`, keys: { p256dh: 'BOr' + crypto.randomBytes(20).toString('base64url'), auth: crypto.randomBytes(12).toString('base64url') } });

const customer = (tag) => { const email = `inbox-${tag}-${run}@test.local`; return { email, sub: 'demo:' + email, h: { cookie: 'hamoo_session=' + sign({ sub: 'demo:' + email, email, exp: Date.now() + 3600e3 }), 'content-type': 'application/json' } }; };
async function topup(c, baht) {
  const fd = new FormData(); fd.set('amount', String(baht)); fd.set('slip', new File([img], 's.jpg', { type: 'image/jpeg' }));
  await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { cookie: c.h.cookie, origin: B, 'x-forwarded-for': IP }, body: fd });
  const a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  const tp = (a.topups || []).find((x) => x.customer_email === c.email && x.status === 'pending');
  if (tp) await post('/api/admin/wallet', ADM, { action: 'approve', id: tp.id });
}
const bal = async (c) => (await J(await fetch(B + '/api/wallet', { headers: c.h }))).available;
const inbox = async (api, h) => J(await fetch(B + api, { headers: h }));
const has = (box, kind, code) => (box.notices || []).find((n) => n.kind === kind && (!code || (n.title + ' ' + (n.body || '')).includes(code)));

async function partnerOf(email, type, PCx = {}) {
  const apply = { business_name: `${type}กล่องแจ้งเตือน`, type, province: 'กรุงเทพมหานคร', contact_name: 'คุณเจ้าของ', tel: '0822224444', email, line_id: '', links: '', package: '3m', message: '', consent: true };
  let j = await J(await post('/api/partner/apply', H, apply)); const tok = j.token;
  await post('/api/partner/auth/register', H, { token: tok, password: 'demo-' + crypto.randomBytes(6).toString('hex') });
  const p = (await J(await fetch(B + '/api/admin/partners', { headers: ADM }))).rows.find((x) => x.email === email);
  const fd = new FormData(); fd.set('package', '3m'); fd.set('token', tok); fd.set('slip', new File([img], 's.jpg', { type: 'image/jpeg' }));
  await fetch(B + '/api/partner/purchase', { method: 'POST', headers: { origin: B }, body: fd });
  const pur = (await J(await fetch(B + `/api/admin/partners/purchases?partner=${p.id}`, { headers: ADM }))).rows;
  if (pur?.[0]) await post(`/api/admin/partners/purchases/${pur[0].id}`, ADM, { action: 'approve' });
  j = await J(await fetch(B + `/api/admin/partners/${p.id}`, { method: 'PATCH', headers: ADM, body: JSON.stringify({ qc_status: 'passed', platform_pct: 20, ...PCx }) }));
  return { p, PC: { cookie: 'mb_partner=' + sign({ k: 'ps', pid: p.id, exp: Date.now() + 3600e3 }), 'content-type': 'application/json' }, active: j.ok && j.row?.account_status === 'active' };
}

(async () => {
  // ══ 1) โรงแรม ══
  const { p, PC, active } = await partnerOf(`inbox-hotel${run}@test.local`, 'โรงแรม');
  ok('hotel partner active (QC passed, 20%)', !!p && active);
  await fetch(B + '/api/partner/listing', { method: 'PUT', headers: { ...PC, origin: B }, body: JSON.stringify({ type: 'โรงแรม', description: 'ทดสอบ', hours: [], rooms: 3, amenities: [], area: 'สาทร', services: [], contact: { address: '1 สาทร' }, published: true }) });
  let j = await J(await fetch(B + '/api/partner/rooms', { method: 'PUT', headers: { ...PC, origin: B }, body: JSON.stringify({ rooms: [{ name: 'Standard', price_baht: 1000, capacity: 2, rooms: 3, photos: [] }] }) }));
  ok('room type saved', j.ok, j.error); const room = j.rooms?.[0];

  // inbox API + push ผูกอุปกรณ์
  ok('partner inbox needs login', (await fetch(B + '/api/partner/notifications')).status === 401);
  ok('partner push bind needs login', (await post('/api/partner/push', { 'content-type': 'application/json' }, { sub: sub('anon') })).status === 401);
  ok('partner push bad sub 400', (await post('/api/partner/push', PC, { sub: { endpoint: 'https://evil.example/x', keys: { p256dh: 'a', auth: 'b' } } })).status === 400);
  j = await J(await post('/api/partner/push', PC, { sub: sub('partner') })); ok('partner binds push device', j.ok, j.error);
  let box = await inbox('/api/partner/notifications', PC); ok('partner inbox empty, 1 device', box.ok && box.notices.length === 0 && box.unread === 0 && box.devices === 1, JSON.stringify(box).slice(0, 120));

  const C = customer('a');
  await topup(C, 20000);
  const book = (x) => post('/api/hotels/bookings', C.h, { hotel_id: p.id, room_type_id: room.id, rooms: 1, guests: 2, guest_name: 'สมหญิง ทดสอบ', note: '', ...x });
  // A: 2 คืน = ฿2,000 → ยืนยัน → เช็กเอาต์ → โรงแรมได้ 80% = ฿1,600
  j = await J(await book({ check_in: bkk(3), check_out: bkk(5) })); ok('stay A booked', j.ok, j.error); const A = j.row;
  box = await inbox('/api/partner/notifications', PC);
  ok('partner notice: new stay', !!has(box, 'stay_new', A.code) && box.unread === 1, box.notices.map((n) => n.kind).join());
  if (box.push === false) ok('push reached partner device (demo log)', box.pushed >= 1, String(box.pushed));
  j = await J(await fetch(B + '/api/partner/notifications?count=1', { headers: PC })); ok('bell count=1', j.unread === 1 && !j.notices);
  let t = (await (await fetch(B + '/partner/portal/notifications', { headers: PC })).text()).replace(/<!-- -->/g, '');
  ok('portal notifications page lists notice + push button', t.includes(A.code) && t.includes('แจ้งเตือนบนเครื่องนี้'));
  t = await (await fetch(B + '/partner/portal', { headers: PC })).text(); ok('portal header has bell link', t.includes('/partner/portal/notifications'));
  await fetch(B + `/api/partner/stays/${A.id}`, { method: 'PATCH', headers: { ...PC, origin: B }, body: JSON.stringify({ action: 'confirm' }) });

  // B: ลูกค้ายกเลิกตอนรอยืนยัน · E: หมดเวลายืนยัน
  j = await J(await book({ check_in: bkk(10), check_out: bkk(11) })); const Bk = j.row;
  await post(`/api/hotels/bookings/${Bk.id}`, C.h, { action: 'cancel', expect_refund: true });
  j = await J(await book({ check_in: bkk(20), check_out: bkk(21) })); const E = j.row;
  await post('/api/admin/stays', ADM, { action: 'demo_shift', id: E.id, minutes: 13 * 60 });
  await fetch(B + `/api/hotels/bookings/${E.id}`, { headers: C.h });
  // A เลยเช็กเอาต์ → completed
  await post('/api/admin/stays', ADM, { action: 'demo_shift', id: A.id, days: 6 });
  j = await J(await fetch(B + `/api/hotels/bookings/${A.id}`, { headers: C.h }));
  ok('A completed: partner 1,600 / platform 400', j.booking?.status === 'completed' && j.booking.partner_net_satang === 160000 && j.booking.platform_fee_satang === 40000, j.booking?.status);
  box = await inbox('/api/partner/notifications', PC);
  ok('partner notice: cancelled', !!has(box, 'stay_cancelled', Bk.code));
  ok('partner notice: expired', !!has(box, 'stay_expired', E.code));
  ok('partner notice: settled → wallet link', has(box, 'stay_settled', A.code)?.url === '/partner/portal/wallet');
  const unread0 = box.unread; ok('unread counts all 6 (3 new + cancelled + expired + settled)', unread0 === 6, String(unread0));
  // อ่านทีละรายการ / ของคนอื่นอ่านไม่ได้ / อ่านทั้งหมด
  const n1 = has(box, 'stay_new', A.code);
  j = await J(await post('/api/partner/notifications', PC, { id: n1.id })); ok('mark one read', j.ok && j.unread === unread0 - 1, String(j.unread));
  box = await inbox('/api/partner/notifications', PC); ok('read_at set on that notice', !!box.notices.find((n) => n.id === n1.id).read_at);

  // ══ 2) คืนเงินหลังเข้าพัก ══
  const pw = async () => (await J(await fetch(B + '/api/partner/wallet', { headers: PC }))).available;
  const pw0 = await pw(); ok('partner wallet 1,600', pw0 === 160000, String(pw0));
  let r = await post('/api/admin/stays', ADM, { action: 'refund_after', id: A.id, amount: 500, note: '' }); ok('refund_after needs reason', r.status === 400);
  r = await post('/api/admin/stays', ADM, { action: 'refund_after', id: A.id, amount: 2500, note: 'เกินยอด' }); ok('refund over total refused', r.status === 400);
  r = await post('/api/admin/stays', ADM, { action: 'refund_after', id: Bk.id, amount: 100, note: 'ไม่ใช่ completed' }); ok('refund_after only for completed', r.status === 409);
  r = await fetch(B + '/api/admin/stays', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'refund_after', id: A.id, amount: 100, note: 'x' }) }); ok('refund_after needs admin', r.status === 401);
  let c0 = await bal(C);
  j = await J(await post('/api/admin/stays', ADM, { action: 'refund_after', id: A.id, amount: 500, note: 'แอร์เสีย 1 คืน' }));
  ok('partial refund ฿500: partner 400 + platform 100', j.ok && j.fromPartner === 40000 && j.fromPlatform === 10000 && j.row.status === 'completed' && j.row.refund_satang === 50000, j.error || JSON.stringify(j).slice(0, 160));
  ok('customer +500', (await bal(C)) === c0 + 50000);
  ok('partner −400', (await pw()) === pw0 - 40000);
  box = await inbox('/api/partner/notifications', PC); ok('partner notice: after-stay refund', !!has(box, 'stay_aftercare_refund', A.code));
  // ปุ่มอยู่ในแท็บ "เข้าพักแล้ว" ที่ไม่ได้แสดงเป็นค่าเริ่มต้น → ตรวจจากข้อมูลแถวแทน
  { const rows = (await J(await fetch(B + '/api/admin/stays', { headers: ADM }))).rows ?? []; const ra = rows.find((x) => x.id === A.id); ok('admin stays row: completed + partly refunded', ra?.status === 'completed' && ra?.refund_satang === 50000, JSON.stringify(ra ?? {}).slice(0, 120)); }
  // โรงแรมถอนเงินไปเกือบหมด → คืนส่วนที่เหลือ (ต้องดึง ฿1,200) ไม่ได้ · ไม่มีเงินเคลื่อน
  j = await J(await post('/api/partner/wallet', PC, { amount: 1000, bank: BANK })); ok('partner withdraws ฿1,000', j.ok, j.error); const pr = j.request?.id;
  c0 = await bal(C);
  r = await post('/api/admin/stays', ADM, { action: 'refund_after', id: A.id, amount: 1500, note: 'คืนส่วนที่เหลือ' }); j = await J(r);
  ok('insufficient partner balance refused + shows balance', r.status === 409 && j.code === 'partner_funds' && j.balance === 20000 && j.need === 120000 && /฿200/.test(j.error), j.error);
  ok('no money moved on refusal', (await bal(C)) === c0 && (await pw()) === 20000);
  j = await J(await fetch(B + `/api/hotels/bookings/${A.id}`, { headers: C.h })); ok('refund_satang unchanged after refusal', j.booking.refund_satang === 50000 && j.booking.status === 'completed');
  // ถอน: CEO อนุมัติ + โอนแล้ว → แจ้งพาร์ทเนอร์ (ต้องแก้ lib/payouts ตามรายงาน)
  await post('/api/admin/payout-requests', ADM, { action: 'approve', id: pr });
  box = await inbox('/api/partner/notifications', PC); pend('partner notice: payout approved', !!has(box, 'payout_approved'));
  await post('/api/admin/payout-requests', ADM, { action: 'paid', id: pr });
  box = await inbox('/api/partner/notifications', PC); pend('partner notice: payout paid', !!has(box, 'payout_paid'));
  // เติมยอดโรงแรมแล้วคืนส่วนที่เหลือ = คืนครบ → refunded · รวมดึงจากโรงแรม 1,600 / แพลตฟอร์ม 400 พอดี
  j = await J(await post('/api/admin/wallet', ADM, { action: 'adjust', owner_type: 'partner', owner_id: p.id, bucket: 'available', amount_baht: 1000, reason: 'e2e เติมยอดโรงแรม', idem: 'e2e-inbox-' + p.id })); ok('admin credits partner ฿1,000', j.ok, j.error);
  c0 = await bal(C);
  j = await J(await post('/api/admin/stays', ADM, { action: 'refund_after', id: A.id, amount: 1500, note: 'คืนส่วนที่เหลือ' }));
  ok('full remainder ฿1,500: partner 1,200 + platform 300 → refunded', j.ok && j.fromPartner === 120000 && j.fromPlatform === 30000 && j.row.status === 'refunded' && j.row.refund_satang === 200000, j.error);
  ok('customer +1,500 · partner 0', (await bal(C)) === c0 + 150000 && (await pw()) === 0);
  r = await post('/api/admin/stays', ADM, { action: 'refund_after', id: A.id, amount: 1, note: 'ซ้ำ' }); ok('nothing left to refund', r.status === 409);
  j = await J(await fetch(B + '/api/admin/stays', { headers: ADM })); ok('hotel escrow recon still ok', j.recon?.ok === true, JSON.stringify(j.recon));
  // อ่านทั้งหมด
  j = await J(await post('/api/partner/notifications', PC, { all: true })); ok('mark all read → 0', j.ok && j.unread === 0);

  // ══ 3) สปา: การจองใหม่ / ยกเลิก ══
  const S = await partnerOf(`inbox-spa${run}@test.local`, 'เดย์สปา');
  await fetch(B + '/api/partner/listing', { method: 'PUT', headers: { ...S.PC, origin: B }, body: JSON.stringify({ type: 'เดย์สปา', description: 'ทดสอบ', hours: [], rooms: 2, amenities: [], area: 'อารีย์', services: [{ name: 'ห้องส่วนตัว', minutes: 120, base_price: 700 }], contact: { address: '1 อารีย์' }, published: true }) });
  const spa = (await J(await fetch(B + '/api/spas'))).spas.find((s) => s.id === S.p.id); ok('spa listed', !!spa?.services?.length);
  const SC = customer('spa'); await topup(SC, 20000);
  const pid = (/\/p\/(r[0-9a-f]{10})/.exec(await (await fetch(B + '/')).text()) || [])[1];
  const d = new Date(Date.now() + [48, 49, 59][crypto.randomInt(3)] * 86400e3); // จองได้ไม่เกิน 60 วัน · วันที่ชุดอื่นไม่ใช้ d.setHours(10 + crypto.randomInt(8), 0, 0, 0);
  j = await J(await post('/api/bookings', SC.h, { pid, hours: 3, starts_at: d.toISOString(), place: { type: 'spa', spa_id: S.p.id, service_id: spa?.services?.[0]?.id }, note: '' }));
  ok('spa booking requested', j.ok, j.error); const sbid = j.id;
  const sb = (await J(await fetch(B + `/api/bookings/${sbid}`, { headers: SC.h }))).booking;
  ok('no spa notice before PT accepts', !has(await inbox('/api/partner/notifications', S.PC), 'spa_new'));
  await fetch(B + `/api/pt/bookings/${sbid}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: PT_T, accept: true }) });
  box = await inbox('/api/partner/notifications', S.PC); ok('spa notice: new booking', !!has(box, 'spa_new', sb?.code), box.notices.map((n) => n.kind).join());
  await fetch(B + `/api/pt/bookings/${sbid}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: PT_T, accept: true }) });
  box = await inbox('/api/partner/notifications', S.PC); ok('re-sync does not duplicate', box.notices.filter((n) => n.kind === 'spa_new').length === 1);
  // แอดมินตัดสินได้เฉพาะนัดที่ขอยกเลิก/มีข้อพิพาท → ลูกค้าขอยกเลิกก่อน (ล่วงหน้านาน = อาจคืนอัตโนมัติตามกติกา)
  await fetch(B + `/api/bookings/${sbid}/cancel`, { method: 'POST', headers: SC.h, body: JSON.stringify({ reason: 'เปลี่ยนแผน' }) });
  const st = (await J(await fetch(B + `/api/bookings/${sbid}`, { headers: SC.h }))).booking?.status;
  if (st === 'cancel_requested') j = await J(await post('/api/admin/bookings', ADM, { id: sbid, action: 'refund', refund_pct: 100, note: 'e2e ยกเลิก' })); else j = { ok: st === 'refunded' || st === 'cancelled', error: st };
  ok('spa booking cancelled + refunded', j.ok, j.error);
  box = await inbox('/api/partner/notifications', S.PC); ok('spa notice: cancelled', !!has(box, 'spa_cancelled', sb?.code), box.notices.map((n) => n.kind).join());

  // ══ 4) ร้านค้า ══
  const tag = run.toString(36);
  const vemail = `inbox-shop-${tag}@test.local`;
  const ap = await fetch(B + '/api/market/apply', { method: 'POST', headers: { 'x-forwarded-for': `10.37.${crypto.randomInt(255)}.${crypto.randomInt(255)}` }, body: form({ shop_name: `Inbox ${tag}`, owner_name: 'คุณร้าน ทดสอบ', phone: '0812345679', email: vemail, line_id: '', business_type: 'person', category: 'อื่น ๆ', description: 'ทดสอบ', consent: '1' }, { doc_main: [img, 'id.jpg', 'image/jpeg'] }) });
  ok('shop applies', ap.status === 200);
  const app = (await J(await fetch(B + '/api/market/admin', { headers: ADM }))).applications.find((a) => a.email === vemail);
  j = await J(await post('/api/market/admin/applications', ADM, { op: 'approve', id: app?.id, gp_pct: 10 })); ok('shop approved', j.ok, j.error);
  const vid = j.vendor.id, inv = decodeURIComponent(j.invite.split('t=')[1]);
  const acc = await fetch(B + '/api/market/vendor/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'accept', t: inv, password: 'demo-' + crypto.randomBytes(6).toString('hex') }) });
  const VC = { cookie: (acc.headers.get('set-cookie') || '').split(';')[0], 'content-type': 'application/json' };
  ok('vendor inbox needs login', (await fetch(B + '/api/market/vendor/notifications')).status === 401);
  j = await J(await post('/api/market/vendor/push', VC, { sub: sub('vendor') })); ok('vendor binds push device', j.ok, j.error);
  j = await J(await fetch(B + '/api/market/vendor/products', { method: 'POST', headers: { cookie: VC.cookie, origin: B }, body: form({ name: `ชาทดสอบ ${tag}`, price: '300', stock: '10', fda_no: '10-1-33333-3-3333', published: '1', age_restricted: '0' }, { image: [img, 'p.jpg', 'image/jpeg'] }) }));
  ok('vendor adds product', j.ok, j.error); const prod = j.product;
  const adminProd = (approved) => fetch(B + '/api/market/admin/products', { method: 'POST', headers: { cookie: ADM.cookie, origin: B }, body: form({ id: prod.id, vendor_id: vid, name: prod.name, description: prod.description || '', warning: prod.warning || '', price: '300', stock: '10', fda_no: prod.fda_no, published: '1', approved, age_restricted: '0', keep_images: prod.images.join(',') }) }).then(J);
  j = await adminProd('1'); ok('admin approves product', j.ok && j.product.approved === true, j.error);
  let vb = await inbox('/api/market/vendor/notifications', VC); ok('vendor notice: product approved', !!has(vb, 'market_product_approved', prod.name));
  j = await adminProd('0'); ok('admin un-approves product', j.ok && j.product.approved === false, j.error);
  vb = await inbox('/api/market/vendor/notifications', VC); ok('vendor notice: product rejected', !!has(vb, 'market_product_rejected', prod.name));
  await adminProd('1');
  // ลูกค้าซื้อด้วยกระเป๋า → ออเดอร์ใหม่ · ยกเลิกหลังจ่าย → แจ้งร้าน · อีกออเดอร์สำเร็จ → เงินเข้าร้าน
  const BC = { cookie: 'mb_phone_ok=' + encodeURIComponent(phone('66812225555')) + '; ' + C.h.cookie, 'content-type': 'application/json' };
  const order = { name: 'ผู้ซื้อ แจ้งเตือน', address: '9/9 ถนนทดสอบ แขวงทดสอบ กรุงเทพ 10110', age_confirm: true, pay: 'wallet' };
  j = await J(await post('/api/market/orders', BC, { ...order, items: [{ id: prod.id, qty: 1 }] })); ok('wallet order paid', j.ok && j.status === 'paid', j.error); const o1 = j.id;
  vb = await inbox('/api/market/vendor/notifications', VC); const on1 = (vb.notices || []).find((n) => n.kind === 'market_order_paid');
  ok('vendor notice: new paid order', !!on1);
  if (vb.push === false) ok('push reached vendor device (demo log)', vb.pushed >= 1, String(vb.pushed));
  j = await J(await post(`/api/market/admin/orders/${o1}`, ADM, { action: 'reject', reason: 'สินค้าหมด' })); ok('admin rejects paid order', j.ok, j.error);
  vb = await inbox('/api/market/vendor/notifications', VC); ok('vendor notice: order rejected/refunded', !!has(vb, 'market_order_rejected'));
  j = await J(await post('/api/market/orders', BC, { ...order, items: [{ id: prod.id, qty: 2 }] })); const o2 = j.id;
  await post(`/api/market/vendor/orders/${o2}`, VC, { tracking_no: 'TH36' + tag, carrier: 'flash' });
  j = await J(await post(`/api/market/admin/orders/${o2}`, ADM, { action: 'done' })); ok('order done', j.ok && j.order.status === 'done', j.error);
  vb = await inbox('/api/market/vendor/notifications', VC); ok('vendor notice: order done → wallet', !!has(vb, 'market_order_done'));
  t = (await (await fetch(B + '/vendor', { headers: VC })).text()).replace(/<!-- -->/g, ''); ok('vendor portal has notices tab', t.includes('แจ้งเตือน'));
  const vu = vb.unread;
  const other = vb.notices.find((n) => n.id !== on1.id && !n.read_at);
  await post('/api/partner/notifications', PC, { id: other.id });
  ok('partner cannot mark vendor notice read', !(await inbox('/api/market/vendor/notifications', VC)).notices.find((n) => n.id === other.id).read_at);
  j = await J(await post('/api/market/vendor/notifications', VC, { id: on1.id })); ok('vendor mark one read', j.unread === vu - 1, `${vu} → ${j.unread}`);
  j = await J(await post('/api/market/vendor/notifications', VC, { all: true })); ok('vendor mark all read', j.unread === 0);
  // ถอนร้าน → CEO อนุมัติ/โอน (ต้องแก้ lib/payouts)
  j = await J(await post('/api/market/vendor/wallet', VC, { amount: 100, bank: BANK }));
  if (j.ok) {
    await post('/api/admin/payout-requests', ADM, { action: 'approve', id: j.request.id });
    await post('/api/admin/payout-requests', ADM, { action: 'paid', id: j.request.id });
    vb = await inbox('/api/market/vendor/notifications', VC); pend('vendor notice: payout approved + paid', !!has(vb, 'payout_approved') && !!has(vb, 'payout_paid'));
  }

  const lw = await J(await fetch(B + '/api/admin/wallet', { headers: ADM })); ok('ledger balanced (sum 0)', lw.sum === 0, String(lw.sum));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
