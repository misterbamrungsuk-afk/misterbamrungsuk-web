// เครื่องมือเตรียมข้อมูลของชุดทดสอบลูกค้า (20-/21-/22-) — สร้าง Part-Time ที่เปิดแสดงอยู่ (ถ้ายังไม่มี) · เติมเงินลูกค้า · ฝั่ง PT ตอบรับ
// ใช้ API เฉพาะสิ่งที่แอดมิน/PT ทำ — ฝั่งลูกค้ากดหน้าจอจริงในตัวชุดทดสอบ
const fs = require('fs'), path = require('path');
const { BASE, WEB, adm, ptToken, api, customerCookie } = require('./_lib');

const SEED = path.join(__dirname, 'out', '_cust-seed.json');
const IMG = fs.readFileSync(path.join(WEB, 'public/brand/home/p-n04.jpg'));
const F = (n) => new File([IMG], n, { type: 'image/jpeg' });
const ADMC = 'mord_admin=' + adm;
const form = (o, files = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) [].concat(v).forEach((x) => f.append(k, x)); for (const [k, v] of Object.entries(files)) f.set(k, v); return f; };
const publicId = (mb) => 'r' + require('crypto').createHash('sha256').update('mb-public:' + mb).digest('hex').slice(0, 10);
const ip = () => '10.6.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250);

/** Part-Time ที่จองได้: { mb, pid, t } — ใช้ของเดิมถ้ายังแสดงอยู่บนเซิร์ฟเวอร์นี้ ไม่งั้นสมัคร+อนุมัติใหม่ */
async function livePT() {
  try {
    const s = JSON.parse(fs.readFileSync(SEED, 'utf8'));
    {
      const h = await (await fetch(BASE + '/book/' + s.pid, { headers: { 'x-forwarded-for': ip(), cookie: (({ name, value }) => name + '=' + value)(customerCookie('seed@test.local')) } })).text();
      if (h.includes('ระยะเวลา') && !h.includes('ข้อมูลตัวอย่าง')) return { ...s, t: ptToken(s.mb) };
    }
  } catch {}
  let jar = '';
  const keep = (r) => { for (const x of r.headers.getSetCookie?.() || []) { const kv = x.split(';')[0]; jar = jar.split('; ').filter((y) => y && !y.startsWith(kv.split('=')[0] + '=')).concat(kv).join('; '); } return r; };
  const xff = ip();
  const req = async (p, o = {}) => keep(await fetch(BASE + p, { ...o, redirect: 'manual', headers: { ...(o.headers || {}), cookie: jar, 'x-forwarded-for': xff, origin: BASE } }));
  const tel = '09' + String(Date.now()).slice(-8);
  await req('/api/otp/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: tel, skip: true }) });
  const j = await (await req('/api/join/register', { method: 'POST', body: form({ package: 'A', first_name: 'ลูกค้า', last_name: 'ทดสอบ', nickname: 'มายด์', tel, email: 'pt' + tel + '@test.local', password: 'test-pass-1234', accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true' }, { slip: F('s.jpg') }) })).json();
  const mb = j.mb_code; if (!mb) throw new Error('seed register failed ' + JSON.stringify(j));
  const t = ptToken(mb);
  await req('/api/join/profile', { method: 'POST', body: form({ mb, step: '1', disclose: 'yes', first_name: 'ลูกค้า', last_name: 'ทดสอบ', nickname: 'มายด์', birthdate: '1998-03-03', line_id: 'x', address: 'อโศก', areas: ['กรุงเทพฯ › วัฒนา'] }, { photo: F('a.jpg'), other_doc: F('b.jpg') }) });
  await req('/api/join/profile', { method: 'POST', body: form({ mb, step: '2', hours_band: '5–6 ชม.', ack_hours: 'true', ack_no_refuse: 'true', week_days: ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'], periods: ['กลางวัน', 'กลางคืน'] }) });
  await req('/api/join/kyc', { method: 'POST', body: form({ mb }, { id_card: F('i.jpg'), id_copy: F('c.jpg'), selfie: F('f.jpg') }) });
  await req('/api/join/bank', { method: 'POST', body: form({ mb, bank: 'กสิกรไทย (KBank)', bank_account: '1234567890', bank_account_name: 'ลูกค้า ทดสอบ', ck_terms: 'true', ck_pdpa: 'true', ck_profile: 'true' }, { bankbook: F('bb.jpg') }) });
  const list = (await (await fetch(BASE + '/admin/applicants', { headers: { cookie: ADMC } })).text()).replace(/\\"/g, '"');
  const at = list.indexOf('"mb_code":"' + mb + '"');
  const id = [...list.slice(Math.max(0, at - 6000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)].pop()?.[1];
  if (!id) throw new Error('seed: applicant id not found');
  const P = (b) => fetch(BASE + '/api/admin/applicants/' + id, { method: 'PATCH', headers: { cookie: ADMC, 'content-type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json());
  await P({ status: 'verified' }); await P({ kyc_status: 'approved' });
  const l = await P({ listed: true }); if (!l.ok) throw new Error('seed list failed ' + JSON.stringify(l));
  const pid = publicId(mb);
  const s = { base: BASE, mb, pid, id };
  fs.mkdirSync(path.dirname(SEED), { recursive: true }); fs.writeFileSync(SEED, JSON.stringify(s));
  return { ...s, t };
}

/** เติมเงินกระเป๋าลูกค้าแบบที่ CEO ปรับยอด (ไม่ผ่านหน้าจอ) */
async function fund(email, baht) {
  const r = await api('/api/admin/wallet', { method: 'POST', cookie: ADMC, body: { action: 'adjust', owner_type: 'customer', owner_id: 'demo:' + email, bucket: 'available', amount_baht: baht, reason: 'e2e', idem: 'e2e-' + Date.now() + Math.random() } });
  return r;
}
const ptAccept = (id, mb, t) => api(`/api/pt/bookings/${id}`, { method: 'POST', body: { mb, t, accept: true } });
const shift = (id, minutes) => api('/api/admin/bookings', { method: 'POST', cookie: ADMC, body: { action: 'demo_shift', id, minutes } });


const J = (r) => r.json();
const H = (h = {}) => ({ 'x-forwarded-for': ip(), origin: BASE, ...h });
const bkkDay = (n = 0) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const AH = { cookie: ADMC, 'content-type': 'application/json' };

/** โรงแรมพาร์ทเนอร์ที่จองในแอปได้ (สมัคร → ชำระแผน → อนุมัติ → QC → ห้อง 2 ประเภท) — คืน { id, name } */
async function seedHotel() {
  const crypto = require('crypto');
  const tag = Date.now().toString(36), email = `uihotel-${tag}@test.local`, name = 'โรงแรมทดสอบ UI ' + tag;
  let j = await J(await fetch(BASE + '/api/partner/apply', { method: 'POST', headers: H({ 'content-type': 'application/json' }), body: JSON.stringify({ business_name: name, type: 'โรงแรม', province: 'กรุงเทพมหานคร', contact_name: 'คุณเจ้าของ', tel: '0822223333', email, line_id: '', links: '', package: '3m', message: '', consent: true }) }));
  if (!j.ok) throw new Error('hotel apply ' + j.error);
  const tok = j.token;
  await fetch(BASE + '/api/partner/auth/register', { method: 'POST', headers: H({ 'content-type': 'application/json' }), body: JSON.stringify({ token: tok, password: 'demo-' + crypto.randomBytes(6).toString('hex') }) });
  const row = (await J(await fetch(BASE + '/api/admin/partners', { headers: AH }))).rows.find((x) => x.email === email);
  const PC = 'mb_partner=' + require('./_lib').sign({ k: 'ps', pid: row.id, exp: Date.now() + 3600e3 });
  const fd = new FormData(); fd.set('package', '3m'); fd.set('token', tok); fd.set('slip', F('s.jpg'));
  await fetch(BASE + '/api/partner/purchase', { method: 'POST', headers: H(), body: fd });
  const pur = (await J(await fetch(BASE + `/api/admin/partners/purchases?partner=${row.id}`, { headers: AH }))).rows;
  await fetch(BASE + `/api/admin/partners/purchases/${pur[0].id}`, { method: 'POST', headers: AH, body: JSON.stringify({ action: 'approve' }) });
  await fetch(BASE + `/api/admin/partners/${row.id}`, { method: 'PATCH', headers: AH, body: JSON.stringify({ qc_status: 'passed', platform_pct: 15 }) });
  await fetch(BASE + '/api/partner/listing', { method: 'PUT', headers: H({ cookie: PC, 'content-type': 'application/json' }), body: JSON.stringify({ type: 'โรงแรม', description: 'โรงแรมทดสอบ', hours: [], rooms: 3, amenities: [], area: 'สีลม', services: [], contact: { address: '1 สีลม' }, published: true }) });
  j = await J(await fetch(BASE + '/api/partner/rooms', { method: 'PUT', headers: H({ cookie: PC, 'content-type': 'application/json' }), body: JSON.stringify({ rooms: [{ name: 'Deluxe เตียงคู่', price_baht: 1500, capacity: 2, rooms: 2, photos: [], description: '32 ตร.ม.' }, { name: 'Suite', price_baht: 4000, capacity: 4, rooms: 1, photos: [] }] }) }));
  if (!j.ok) throw new Error('hotel rooms ' + j.error);
  return { id: row.id, name };
}

/** สินค้าในตลาดที่ซื้อได้ (ร้านใหม่ ค่าส่ง ฿50 · สินค้า ฿500 สต็อก 20) — คืน { id, name } */
async function seedProduct() {
  const crypto = require('crypto');
  const tag = Date.now().toString(36), email = `uibrand-${tag}@test.local`;
  const fa = form({ shop_name: `ร้านทดสอบ UI ${tag}`, owner_name: 'คุณเจ้าของ ทดสอบ', phone: '0812345678', email, line_id: 'x', business_type: 'person', category: 'อื่น ๆ', description: 'ขายชาสมุนไพร', consent: '1' }, { doc_main: F('id.jpg') });
  let j = await J(await fetch(BASE + '/api/market/apply', { method: 'POST', headers: H(), body: fa }));
  if (!j.ok) throw new Error('vendor apply ' + j.error);
  const app = (await J(await fetch(BASE + '/api/market/admin', { headers: AH }))).applications.find((a) => a.email === email);
  j = await J(await fetch(BASE + '/api/market/admin/applications', { method: 'POST', headers: AH, body: JSON.stringify({ op: 'approve', id: app.id, gp_pct: 20 }) }));
  const vid = j.vendor.id, inv = decodeURIComponent(j.invite.split('t=')[1]);
  const acc = await fetch(BASE + '/api/market/vendor/auth', { method: 'POST', headers: H({ 'content-type': 'application/json' }), body: JSON.stringify({ op: 'accept', t: inv, password: 'demo-' + crypto.randomBytes(6).toString('hex') }) });
  const VC = (acc.headers.get('set-cookie') || '').split(';')[0];
  await fetch(BASE + '/api/market/vendor', { method: 'POST', headers: H({ cookie: VC, 'content-type': 'application/json' }), body: JSON.stringify({ op: 'shipping', shipping_fee: 50, free_threshold: 5000 }) });
  const name = `ชาสมุนไพร UI ${tag}`;
  j = await J(await fetch(BASE + '/api/market/vendor/products', { method: 'POST', headers: H({ cookie: VC }), body: form({ name, price: '500', stock: '20', fda_no: '10-1-22222-2-2222', published: '1', age_restricted: '0' }, { image: F('p.jpg') }) }));
  const prod = j.product; if (!prod) throw new Error('product add ' + j.error);
  j = await J(await fetch(BASE + '/api/market/admin/products', { method: 'POST', headers: H({ cookie: ADMC }), body: form({ id: prod.id, vendor_id: vid, name, price: '500', stock: '20', fda_no: prod.fda_no, published: '1', approved: '1', age_restricted: '0' }) }));
  if (!j.ok) throw new Error('product approve ' + j.error);
  return { id: prod.id, name, vendorCookie: VC };
}

module.exports = { seedHotel, seedProduct, bkkDay, publicId, livePT, fund, ptAccept, shift, ADMC, form, F };
