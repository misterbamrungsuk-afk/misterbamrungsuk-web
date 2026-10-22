// เตรียมข้อมูลผ่าน API สำหรับชุดทดสอบหลังบ้านแอดมิน (40/41/42) — โหมดสาธิตเท่านั้น
// แต่ละชุดสร้างข้อมูลของตัวเอง (ชื่อ/อีเมลไม่ซ้ำ) เพื่อไม่ชนชุดของคนอื่นที่รันพร้อมกันบนเซิร์ฟเวอร์เดียวกัน
const fs = require('fs'), path = require('path');
const { BASE, WEB, adminToken, ptToken, sign, uniq } = require('./_lib');

const img = fs.readFileSync(path.join(WEB, 'public/brand/home/p-n04.jpg'));
const IMG = (n = 'x.jpg') => new File([img], n, { type: 'image/jpeg' });
const rip = () => '10.6.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250);
const AH = (role = 'ceo', email) => ({ cookie: 'mord_admin=' + adminToken(role, email), 'content-type': 'application/json', origin: BASE });
const J = async (r) => { try { return await r.json(); } catch { return {}; } };
const req = (p, o = {}) => fetch(BASE + p, { redirect: 'manual', ...o, headers: { origin: BASE, 'x-forwarded-for': rip(), ...(o.headers || {}) } });
const post = (p, h, b) => req(p, { method: 'POST', headers: h, body: JSON.stringify(b) }).then(J);
const form = (o, files = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) [].concat(v).forEach((x) => f.append(k, x)); for (const [k, v] of Object.entries(files)) f.set(k, v); return f; };
const custH = (email) => ({ cookie: 'hamoo_session=' + sign({ sub: 'demo:' + email, email, exp: Date.now() + 3600e3 }), 'content-type': 'application/json' });
const shiftBooking = (id, minutes) => post('/api/admin/bookings', AH(), { action: 'demo_shift', id, minutes });

const FIRST = ['ธนกฤต', 'ภูริพัฒน์', 'ณัฐชา', 'กนกวรรณ', 'ศิริพร', 'วรเมธ', 'พิมพ์ชนก', 'อรอุมา'];
const LAST = ['ศรีสวัสดิ์', 'วงศ์ทอง', 'แก้วมณี', 'บุญมา', 'ทองดี'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/** หา id ผู้สมัครจากรหัส MB (อ่านจากหน้า /admin/applicants แบบชุดเดิม) */
async function applicantId(mb) {
  const html = (await (await req('/admin/applicants', { headers: AH() })).text()).replace(/\\"/g, '"');
  const at = html.indexOf('"mb_code":"' + mb + '"');
  if (at < 0) return null;
  const ids = [...html.slice(Math.max(0, at - 8000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)];
  return ids[ids.length - 1]?.[1] ?? null;
}
const patchApp = (id, body, role = 'ceo', email) => req('/api/admin/applicants/' + id, { method: 'PATCH', headers: AH(role, email), body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, ...(await J(r)) }));

/**
 * ผู้สมัคร Part-Time ใหม่: สมัคร + สลิป → (profile) ข้อมูล+รูป → (kyc) เอกสาร → (bank) บัญชี = ส่ง KYC
 * invite = รหัสลิงก์เชิญ · คืน { mb, id, tel, first, last, nick, t }
 */
async function newApplicant({ pkg = 'A', profile = true, kyc = true, bank = true, invite, tag = '' } = {}) {
  let jar = '';
  const keep = (r) => { for (const x of r.headers.getSetCookie?.() || []) { const kv = x.split(';')[0]; jar = jar.split('; ').filter((y) => y && !y.startsWith(kv.split('=')[0] + '=')).concat(kv).join('; '); } return r; };
  const jreq = async (p, o = {}) => keep(await req(p, { ...o, headers: { ...(o.headers || {}), cookie: jar } }));
  const tel = '06' + String(Date.now()).slice(-7) + Math.floor(Math.random() * 10);
  const s = await J(await jreq('/api/otp/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: tel }) }));
  if (s.devCode) await jreq('/api/otp/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: tel, code: s.devCode }) });
  const first = pick(FIRST), last = pick(LAST) + tag, nick = 'ยูไอ' + Math.floor(Math.random() * 900 + 100);
  const reg = await J(await jreq('/api/join/register', { method: 'POST', body: form({ package: pkg, first_name: first, last_name: last, nickname: nick, tel, email: `ui${tel}@test.local`, password: 'UiTest-' + tel, password: 'test-pass-1234', accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true', ...(invite ? { invite } : {}) }, { slip: IMG('slip.jpg') }) }));
  const mb = reg.mb_code;
  if (!mb) throw new Error('register failed: ' + JSON.stringify(reg));
  const t = ptToken(mb);
  if (profile) {
    await jreq('/api/join/profile', { method: 'POST', body: form({ mb, t, step: '1', first_name: first, last_name: last, nickname: nick, birthdate: '1998-05-05', line_id: 'line' + nick, address: 'อโศก', areas: ['กรุงเทพฯ › วัฒนา'] }, { photo: IMG('a.jpg'), other_doc: IMG('b.jpg') }) });
    await jreq('/api/join/profile', { method: 'POST', body: form({ mb, t, step: '2', hours_band: '5–6 ชม.', ack_hours: 'true', ack_no_refuse: 'true', week_days: ['ศ', 'ส'], periods: ['กลางคืน'] }) });
  }
  if (kyc) await jreq('/api/join/kyc', { method: 'POST', body: form({ mb, t }, { id_card: IMG('i.jpg'), id_copy: IMG('c.jpg'), selfie: IMG('f.jpg') }) });
  if (bank) await jreq('/api/join/bank', { method: 'POST', body: form({ mb, t, bank: 'กสิกรไทย (KBank)', bank_account: '12345' + String(Date.now()).slice(-5), bank_account_name: `${first} ${last}`, ck_terms: 'true', ck_pdpa: 'true', ck_profile: 'true' }, { bankbook: IMG('bb.jpg') }) });
  const id = await applicantId(mb);
  return { mb, id, tel, first, last, nick, t, jar };
}

/** Part-Time พร้อมรับงาน: ชำระแล้ว · KYC ผ่าน · แสดงบนหน้าแรก */
async function activePT(o = {}) {
  const a = await newApplicant(o);
  await patchApp(a.id, { status: 'verified' });
  await patchApp(a.id, { kyc_status: 'approved' }, 'kyc', 'seed-kyc@local.test');
  const l = await patchApp(a.id, { listed: true });
  if (!l.ok) throw new Error('listing failed ' + JSON.stringify(l));
  const { createHash } = require('crypto');
  a.pid = 'r' + createHash('sha256').update('mb-public:' + a.mb).digest('hex').slice(0, 10);
  return a;
}

/** ลูกค้าส่งสลิปเติมเงิน (รอแอดมินตรวจ) → คืน topup */
async function topupRequest(email, baht = 3000) {
  const h = custH(email);
  await req('/api/wallet/topup', { method: 'POST', headers: { cookie: h.cookie }, body: form({ amount: String(baht) }, { slip: IMG('t.jpg') }) });
  const w = await J(await req('/api/admin/wallet', { headers: AH() }));
  return (w.topups || []).find((x) => x.customer_email === email && x.status === 'pending') || null;
}
/** เติมเงินลูกค้าให้พร้อมจอง (API) */
async function fundCustomer(email, baht = 30000) {
  const tp = await topupRequest(email, baht);
  if (tp) return post('/api/admin/wallet', AH(), { action: 'approve', id: tp.id });
  return post('/api/admin/wallet', AH(), { action: 'adjust', owner_type: 'customer', owner_id: 'demo:' + email, bucket: 'available', amount_baht: baht, reason: 'seed', idem: uniq('seed-') });
}
/** เวลานัดไกล ๆ (กันชนเวลากับชุดอื่น) */
const far = (d, min = 13) => { const x = new Date(Date.now() + d * 86400e3); x.setMinutes(min, 0, 0); return x.toISOString(); };
async function book(email, pid, { days = 20, hours = 3, detail = 'คาเฟ่ทดสอบแอดมิน' } = {}) {
  return post('/api/bookings', custH(email), { pid, hours, starts_at: far(days), place: { type: 'cafe', detail }, note: '' });
}
const ptAct = (pt, id, action, extra = {}) => post(`/api/pt/bookings/${id}`, { 'content-type': 'application/json' }, { mb: pt.mb, t: pt.t, action, ...extra });
const getBooking = (email, id) => req(`/api/bookings/${id}`, { headers: custH(email) }).then(J).then((d) => d.booking);
const toMin = (iso) => Math.round((Date.parse(iso) - Date.now()) / 60000);

/** นัดที่จบงานแล้ว (เงินรอ CEO อนุมัติเข้ากระเป๋า PT) */
async function completedBooking(pt, email, days) {
  const b = await book(email, pt.pid, { days });
  if (!b.ok) throw new Error('book ' + JSON.stringify(b));
  await ptAct(pt, b.id, 'accept');
  const s = await getBooking(email, b.id);
  await shiftBooking(b.id, toMin(s.starts_at) - 10);
  await ptAct(pt, b.id, 'checkin', { gps: { lat: 13.7563, lng: 100.5018, accuracy: 15 } });
  await shiftBooking(b.id, 200);
  const done = await post(`/api/bookings/${b.id}/complete`, custH(email), {});
  return { id: b.id, done };
}

/** ใบเตือน (Part-Time ไม่มาตามนัด) → Part-Time ยื่นอุทธรณ์ · คืน { booking, strike, appeal } */
async function strikeAndAppeal(pt, email, days, reason) {
  const b = await book(email, pt.pid, { days });
  if (!b.ok) throw new Error('book ' + JSON.stringify(b));
  await ptAct(pt, b.id, 'accept');
  const s = await getBooking(email, b.id);
  await shiftBooking(b.id, toMin(s.starts_at) + 30);
  const nf = form({ booking: b.id, note: 'รอ 30 นาทีเพื่อนไม่มา', lat: '13.7563', lng: '100.5018', accuracy: '20' });
  const ns = await J(await req('/api/noshow', { method: 'POST', headers: { cookie: custH(email).cookie }, body: nf }));
  if (!ns.ok) throw new Error('noshow ' + JSON.stringify(ns));
  const claim = (await J(await req('/api/admin/noshow', { headers: AH() }))).claims?.find((c) => c.booking_id === b.id);
  await post('/api/admin/noshow', AH(), { id: claim?.id, decision: 'provider_no_show' });
  const st = await J(await req(`/api/pt/appeals?mb=${pt.mb}&t=${encodeURIComponent(pt.t)}`));
  const strike = st.strikes?.find((x) => x.ref === b.id);
  if (!strike) throw new Error('no strike ' + JSON.stringify(st).slice(0, 200));
  const ap = await J(await req('/api/pt/appeals', { method: 'POST', body: form({ mb: pt.mb, t: pt.t, strike_id: strike.id, reason }, { photo: IMG('proof.jpg') }) }));
  return { booking: b.id, strike: strike.id, appeal: ap };
}

const partnerH = (pid) => ({ cookie: 'mb_partner=' + sign({ k: 'ps', pid, exp: Date.now() + 3600e3 }), 'content-type': 'application/json' });
const bkkDay = (n = 0) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
/** พาร์ทเนอร์สมัคร + ส่งสลิปแผน (รอแอดมินตรวจ) · คืน { id, email, name, PC, purchase } */
async function newPartner({ type = 'สปา', name } = {}) {
  const email = `ui-partner-${Date.now()}${Math.floor(Math.random() * 1e3)}@test.local`;
  name = name || `${type}ทดสอบUI ${Date.now().toString(36).slice(-4)}`;
  const j = await post('/api/partner/apply', { 'content-type': 'application/json' }, { business_name: name, type, province: 'กรุงเทพมหานคร', contact_name: 'คุณเจ้าของ', tel: '08' + String(Date.now()).slice(-8), email, line_id: '', links: '', package: '3m', message: '', consent: true });
  if (!j.ok) throw new Error('partner apply ' + JSON.stringify(j));
  await post('/api/partner/auth/register', { 'content-type': 'application/json' }, { token: j.token, password: 'demo-' + Math.random().toString(36).slice(2, 12) });
  const p = (await J(await req('/api/admin/partners', { headers: AH() }))).rows.find((x) => x.email === email);
  await req('/api/partner/purchase', { method: 'POST', body: form({ package: '3m', token: j.token }, { slip: IMG('ps.jpg') }) });
  const purchase = (await J(await req(`/api/admin/partners/purchases?partner=${p.id}`, { headers: AH() }))).rows?.[0];
  return { id: p.id, email, name, PC: partnerH(p.id), purchase, token: j.token };
}
/** โรงแรมพร้อมรับจอง (อนุมัติแผน + QC ผ่าน + ห้อง) · คืน partner + room */
async function hotelReady() {
  const p = await newPartner({ type: 'โรงแรม' });
  await post(`/api/admin/partners/purchases/${p.purchase.id}`, AH(), { action: 'approve' });
  await req(`/api/admin/partners/${p.id}`, { method: 'PATCH', headers: AH(), body: JSON.stringify({ qc_status: 'passed', platform_pct: 15 }) });
  await req('/api/partner/listing', { method: 'PUT', headers: p.PC, body: JSON.stringify({ type: 'โรงแรม', description: 'ทดสอบ', hours: [], rooms: 2, amenities: [], area: 'สีลม', services: [], contact: { address: '1 สีลม' }, published: true }) });
  const j = await J(await req('/api/partner/rooms', { method: 'PUT', headers: p.PC, body: JSON.stringify({ rooms: [{ name: 'Deluxe UI', price_baht: 1500, capacity: 2, rooms: 5, photos: [] }] }) }));
  p.room = j.rooms?.[0];
  return p;
}
const bookStay = (email, p, inDays, nights = 1) => post('/api/hotels/bookings', custH(email), { hotel_id: p.id, room_type_id: p.room.id, check_in: bkkDay(inDays), check_out: bkkDay(inDays + nights), rooms: 1, guests: 2, guest_name: 'สมชาย ใจดี', note: '' });
/** ร้านค้า + บัญชีเข้าพอร์ทัล · คืน { id, name, VC } */
async function vendorWithLogin() {
  const name = 'ร้านUI ' + Date.now().toString(36).slice(-5);
  const v = (await post('/api/market/admin/vendors', AH(), { name, contact: '', gp_pct: 20 })).vendor;
  const a = await post('/api/market/admin/accounts', AH(), { vendor_id: v.id, email: `shop-ui${Date.now()}@test.local` });
  const inv = decodeURIComponent(a.invite.split('t=')[1]);
  const acc = await req('/api/market/vendor/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'accept', t: inv, password: 'demo-' + Math.random().toString(36).slice(2, 12) }) });
  return { id: v.id, name, VC: { cookie: (acc.headers.get('set-cookie') || '').split(';')[0], 'content-type': 'application/json' } };
}
/** คุกกี้ "ยืนยันเบอร์แล้ว" สำหรับสั่งซื้อในตลาด */
function phoneCookie(ph) {
  const crypto = require('crypto');
  const env = (() => { try { return fs.readFileSync(path.join(WEB, '.env.local'), 'utf8'); } catch { return ''; } })();
  const key = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(env)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
  const b = Buffer.from(JSON.stringify({ phone: ph, exp: Date.now() + 3600e3, v: true })).toString('base64url');
  return 'mb_phone_ok=' + encodeURIComponent(b + '.' + crypto.createHmac('sha256', key).update('phone:' + b).digest('base64url'));
}
/** สินค้าที่แอดมินสร้าง (เผยแพร่ + อนุมัติ) ของร้าน vid */
async function adminProduct(vid, name, price = 300) {
  const fd = form({ vendor_id: vid, name, price: String(price), stock: '20', published: '1', approved: '1', fda_no: '10-1-11111-1-1111', age_restricted: '0' }, { image: IMG('p.jpg') });
  return (await J(await req('/api/market/admin/products', { method: 'POST', headers: { cookie: AH().cookie }, body: fd }))).product;
}
/** คำสั่งซื้อ QR + แนบสลิป (รอแอดมินยืนยัน) */
async function marketOrder(email, prodId, qty = 1) {
  const h = { 'content-type': 'application/json', cookie: phoneCookie('6681' + String(Date.now()).slice(-7)) + '; ' + custH(email).cookie };
  const j = await post('/api/market/orders', h, { name: 'ผู้ซื้อ ทดสอบUI', address: '99/1 ถนนทดสอบ แขวงทดสอบ กรุงเทพ 10110', items: [{ id: prodId, qty }], age_confirm: true });
  const oid = j.id || j.order?.id;
  if (oid && j.token) await req(`/api/market/orders/${oid}/slip`, { method: 'POST', body: form({ token: j.token }, { slip: IMG('ms.jpg') }) });
  return { id: oid, order_no: j.order_no || j.order?.order_no, ...j };
}
/** ร้านสมัครขายเอง (/market/sell) */
async function marketApply(shop) {
  const email = `apply-ui-${Date.now()}${Math.floor(Math.random() * 1e3)}@test.local`;
  const r = await req('/api/market/apply', { method: 'POST', body: form({ shop_name: shop, owner_name: 'คุณเจ้าของ ทดสอบ', phone: '0812345678', email, line_id: 'brandline', business_type: 'person', category: 'อื่น ๆ', description: 'ขายชาสมุนไพร', consent: '1' }, { doc_main: IMG('id.jpg') }) });
  return { email, ...(await J(r)) };
}
const msg = (bid, h, body, extra = {}) => post(`/api/bookings/${bid}/messages`, h, { body, ...extra });
const chatAct = (bid, h, body) => post(`/api/bookings/${bid}/chat`, h, body);

const BANK = { bank: 'กสิกรไทย', account: '123-4-56789-0', name: 'บจก. ทดสอบ' };

module.exports = { phoneCookie, adminProduct, marketOrder, marketApply, msg, chatAct, partnerH, bkkDay, newPartner, hotelReady, bookStay, vendorWithLogin, BANK, strikeAndAppeal, IMG, AH, J, req, post, form, custH, applicantId, patchApp, newApplicant, activePT, topupRequest, fundCustomer, far, book, ptAct, getBooking, shiftBooking, toMin, completedBooking };
