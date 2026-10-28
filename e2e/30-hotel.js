// จองห้องพักโรงแรมในแอป: สมัครโรงแรม → QC ผ่าน → ตั้งประเภทห้อง → ลูกค้าจองจ่ายจากกระเป๋า → กันห้องเต็ม → โรงแรมยืนยัน
// → เลื่อนวันจนเช็กเอาต์ → กระเป๋าโรงแรมได้ยอดหัก % · ปฏิเสธ/หมดเวลา/ยกเลิกฟรี = คืนเต็ม · ยกเลิกช้า = ไม่คืน · ทีมงานคืนเงิน · ledger = 0
// โหมดเดโม (ไม่มี SUPABASE_URL) · ใช้อีเมลใหม่ทุกรอบ
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
const { ceoCookie } = require('./_ceo'); // อนุมัติเงิน = ห้อง CEO (/ceo · รหัสแยก)
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const H = { 'content-type': 'application/json', origin: B };
const post = (u, h, b) => fetch(B + u, { method: 'POST', headers: { origin: B, ...h }, body: JSON.stringify(b) });
const bkk = (n = 0) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const run = Date.now() % 1e7;

const customer = (tag) => { const email = `stay-${tag}-${run}@test.local`; return { email, sub: 'demo:' + email, h: { cookie: 'hamoo_session=' + sign({ sub: 'demo:' + email, email, exp: Date.now() + 3600e3 }), 'content-type': 'application/json' } }; };
async function topup(c, baht) {
  const fd = new FormData(); fd.set('amount', String(baht)); fd.set('slip', new File([img], 's.jpg', { type: 'image/jpeg' }));
  await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { cookie: c.h.cookie, origin: B }, body: fd });
  const a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  const tp = (a.topups || []).find((x) => x.customer_email === c.email && x.status === 'pending');
  if (tp) await post('/api/admin/wallet', ADM, { action: 'approve', id: tp.id });
}
const bal = async (c) => (await J(await fetch(B + '/api/wallet', { headers: c.h }))).available;

(async () => {
  ADM.cookie += '; ' + (await ceoCookie());
  // ── สมัครโรงแรม → ชำระแผน → อนุมัติ → QC ผ่าน ──
  const email = `hotel${run}@test.local`;
  const apply = { business_name: 'โรงแรมทดสอบห้องพัก', type: 'โรงแรม', province: 'กรุงเทพมหานคร', contact_name: 'คุณเจ้าของ', tel: '0822223333', email, line_id: '', links: '', package: '3m', message: '', consent: true };
  let j = await J(await post('/api/partner/apply', H, apply)); ok('apply as โรงแรม', j.ok && !!j.token, j.error); const tok = j.token;
  j = await J(await post('/api/partner/auth/register', H, { token: tok, password: 'demo-' + crypto.randomBytes(6).toString('hex') })); ok('set password', j.ok, j.error);
  const p = (await J(await fetch(B + '/api/admin/partners', { headers: ADM }))).rows.find((x) => x.email === email); ok('partner row is hotel', !!p && p.type === 'โรงแรม');
  const PC = { cookie: 'mb_partner=' + sign({ k: 'ps', pid: p.id, exp: Date.now() + 3600e3 }), 'content-type': 'application/json' };
  const fd = new FormData(); fd.set('package', '3m'); fd.set('token', tok); fd.set('slip', new File([img], 's.jpg', { type: 'image/jpeg' }));
  j = await J(await fetch(B + '/api/partner/purchase', { method: 'POST', headers: { origin: B }, body: fd })); ok('plan slip sent', j.ok, j.error);
  const pur = (await J(await fetch(B + `/api/admin/partners/purchases?partner=${p.id}`, { headers: ADM }))).rows;
  await post(`/api/admin/partners/purchases/${pur[0].id}`, ADM, { action: 'approve' });
  // ยังไม่ผ่าน QC = จองไม่ได้
  ok('availability 404 before QC', (await fetch(B + `/api/hotels/${p.id}/availability?in=${bkk(3)}&out=${bkk(5)}`)).status === 404);
  j = await J(await fetch(B + `/api/admin/partners/${p.id}`, { method: 'PATCH', headers: ADM, body: JSON.stringify({ qc_status: 'passed', platform_pct: 15 }) }));
  ok('QC passed → active, platform 15%', j.ok && j.row.account_status === 'active', j.error);
  await fetch(B + '/api/partner/listing', { method: 'PUT', headers: PC, body: JSON.stringify({ type: 'โรงแรม', description: 'ทดสอบ', hours: [], rooms: 2, amenities: [], area: 'สีลม', services: [], contact: { address: '1 สีลม' }, published: true }) });

  // ── ประเภทห้อง (รูปผ่าน file-guard) ──
  const ff = new FormData(); ff.set('file', new File([img], 'r.jpg', { type: 'image/jpeg' }));
  j = await J(await fetch(B + '/api/partner/listing/image', { method: 'POST', headers: { cookie: PC.cookie, origin: B }, body: ff })); ok('room photo uploaded', j.ok && !!j.path, j.error); const photo = j.path;
  const fake = new FormData(); fake.set('file', new File([Buffer.from('<script>alert(1)</script>')], 'x.jpg', { type: 'image/jpeg' }));
  ok('fake image refused', !(await J(await fetch(B + '/api/partner/listing/image', { method: 'POST', headers: { cookie: PC.cookie, origin: B }, body: fake }))).ok);
  let r = await fetch(B + '/api/partner/rooms', { method: 'PUT', headers: { ...PC, origin: B }, body: JSON.stringify({ rooms: [{ name: 'ห้องราคาผิด', price_baht: 0, capacity: 2, rooms: 1 }] }) });
  ok('room with price 0 refused', r.status === 400);
  j = await J(await fetch(B + '/api/partner/rooms', { method: 'PUT', headers: { ...PC, origin: B }, body: JSON.stringify({ rooms: [
    { name: 'Deluxe เตียงคู่', price_baht: 1500, capacity: 2, rooms: 2, photos: [photo, 'someone-else/listing/x.jpg'], description: '32 ตร.ม.' },
    { name: 'Suite', price_baht: 4000, capacity: 4, rooms: 1, photos: [] },
  ] }) }));
  ok('room types saved', j.ok && j.rooms.length === 2 && j.rooms[0].price_satang === 150000 && j.rooms[0].photos.length === 1, j.error);
  const deluxe = j.rooms[0], suite = j.rooms[1];
  let t = (await (await fetch(B + `/hotels/${p.id}`)).text()).replace(/<!-- -->/g, '');
  ok('venue page shows room + in-app booking', t.includes('Deluxe เตียงคู่') && t.includes('จองห้อง'));
  ok('portal has rooms tab', (await (await fetch(B + '/partner/portal/rooms', { headers: PC })).text()).includes('Deluxe เตียงคู่'));
  j = await J(await fetch(B + `/api/hotels/${p.id}/availability?in=${bkk(3)}&out=${bkk(5)}`));
  ok('availability: 2 deluxe left, 2 nights', j.ok && j.nights === 2 && j.rooms.find((x) => x.id === deluxe.id)?.left === 2, JSON.stringify(j).slice(0, 160));

  // ── ลูกค้า ──
  const C = customer('a'), C2 = customer('b');
  await topup(C, 20000);
  const start = await bal(C); ok('customer topped up', start >= 2000000, String(start));
  const book = (c, x) => post('/api/hotels/bookings', c.h, { hotel_id: p.id, room_type_id: deluxe.id, rooms: 1, guests: 2, guest_name: 'สมชาย ใจดี', note: '', ...x });
  r = await fetch(B + '/api/hotels/bookings', { method: 'POST', headers: H, body: JSON.stringify({ hotel_id: p.id, room_type_id: deluxe.id, check_in: bkk(3), check_out: bkk(5), rooms: 1, guests: 1, guest_name: 'ไม่ล็อกอิน' }) });
  ok('booking needs login', r.status === 401);
  // ตรวจข้อมูล (ลูกค้าคนที่ 2 — ไม่มีเงิน)
  r = await book(C2, { check_in: bkk(-1), check_out: bkk(1) }); ok('past check-in refused', r.status === 400);
  r = await book(C2, { check_in: bkk(3), check_out: bkk(18) }); ok('15 nights refused', r.status === 400);
  r = await book(C2, { check_in: bkk(3), check_out: bkk(4), guests: 3 }); ok('guests over capacity refused', r.status === 400);
  r = await book(C2, { check_in: bkk(3), check_out: bkk(4) }); j = await J(r); ok('no money → 402 funds (top-up link)', r.status === 402 && j.code === 'funds', j.error);

  // A: 2 ห้อง × 2 คืน = 6,000 บาท
  j = await J(await book(C, { check_in: bkk(3), check_out: bkk(5), rooms: 2, guests: 4 }));
  ok('book 2 rooms × 2 nights', j.ok && j.row.status === 'pending' && j.row.total_satang === 600000 && j.row.platform_pct === 15, j.error); const A = j.row;
  ok('wallet charged 6,000', (await bal(C)) === start - 600000);
  r = await book(C, { check_in: bkk(4), check_out: bkk(6) }); j = await J(r); ok('overbooking refused (409)', r.status === 409 && j.code === 'full', j.error);
  j = await J(await fetch(B + `/api/hotels/${p.id}/availability?in=${bkk(4)}&out=${bkk(6)}`)); ok('availability shows 0 left on overlap', j.rooms.find((x) => x.id === deluxe.id)?.left === 0);
  // B: วันเช็กเอาต์ของ A = วันเช็กอินของ B ได้
  j = await J(await book(C, { check_in: bkk(5), check_out: bkk(6) })); ok('back-to-back booking ok', j.ok, j.error); const Bk = j.row;

  // โรงแรมเห็น + ยืนยัน A / ปฏิเสธ B
  t = (await (await fetch(B + '/partner/portal/bookings', { headers: PC })).text()).replace(/\\"/g, '"');
  ok('portal lists room bookings', t.includes(A.code) && t.includes('การจองห้องพัก'));
  j = await J(await fetch(B + `/api/partner/stays/${A.id}`, { method: 'PATCH', headers: { ...PC, origin: B }, body: JSON.stringify({ action: 'confirm' }) }));
  ok('hotel confirms', j.ok && j.row.status === 'confirmed', j.error);
  j = await J(await fetch(B + `/api/partner/stays/${A.id}`, { method: 'PATCH', headers: { ...PC, origin: B }, body: JSON.stringify({ action: 'decline' }) }));
  ok('cannot decline after confirm', !j.ok);
  const before = await bal(C);
  j = await J(await fetch(B + `/api/partner/stays/${Bk.id}`, { method: 'PATCH', headers: { ...PC, origin: B }, body: JSON.stringify({ action: 'decline', reason: 'ปิดปรับปรุง' }) }));
  ok('hotel declines → refunded', j.ok && j.row.status === 'declined' && j.row.refund_satang === 150000, j.error);
  ok('decline refund in wallet', (await bal(C)) === before + 150000);

  // เลยเช็กเอาต์ → รอ CEO อนุมัติ (ห้อง CEO · 28 ต.ค. 2569) → completed · โรงแรมได้ 85%
  // โหมด manual (ค่าเริ่มต้นจริง · ชุด 06 สลับเป็น auto ไว้) → ค่าห้องรอ CEO
  const money0 = (await J(await fetch(B + '/api/admin/wallet', { headers: ADM }))).money;
  await post('/api/admin/wallet', ADM, { action: 'settings', money: { ...money0, releaseMode: 'manual' }, note: 'ทดสอบห้อง CEO' });
  const pw0 = (await J(await fetch(B + '/api/partner/wallet', { headers: PC }))).available;
  await post('/api/admin/stays', ADM, { action: 'demo_shift', id: A.id, days: 6 });
  j = await J(await fetch(B + '/api/hotels/bookings', { headers: C.h }));
  ok('after check-out → still confirmed (waits for CEO)', j.rows.find((x) => x.id === A.id)?.status === 'confirmed');
  ok('partner wallet unchanged before CEO', (await J(await fetch(B + '/api/partner/wallet', { headers: PC }))).available === pw0);
  { const h = (await (await fetch(B + '/ceo', { headers: ADM })).text()).replace(/<!-- -->/g, ''); ok('CEO room lists stay awaiting approval', h.includes(`data-stay-row="${A.code}"`)); }
  ok('super cannot settle stay', (await post('/api/admin/payroll', { cookie: 'mord_admin=' + sup, 'content-type': 'application/json' }, { action: 'stay_settle', id: A.id })).status === 403);
  { const sj = await J(await post('/api/admin/payroll', ADM, { action: 'stay_settle', id: A.id })); ok('CEO settles stay', sj.ok && sj.amount === 510000, JSON.stringify(sj)); }
  ok('settle twice refused', (await post('/api/admin/payroll', ADM, { action: 'stay_settle', id: A.id })).status === 400);
  await post('/api/admin/wallet', ADM, { action: 'settings', money: money0, note: 'คืนค่า' });
  j = await J(await fetch(B + '/api/hotels/bookings', { headers: C.h }));
  const a2 = j.rows.find((x) => x.id === A.id); ok('after check-out → completed', a2?.status === 'completed' && a2.partner_net_satang === 510000 && a2.platform_fee_satang === 90000, a2 && a2.status);
  const pw1 = (await J(await fetch(B + '/api/partner/wallet', { headers: PC }))).available;
  ok('partner wallet +5,100 (net of 15%)', pw1 - pw0 === 510000, `${pw0} → ${pw1}`);

  // ยกเลิกฟรีตอนรอยืนยัน
  j = await J(await book(C, { room_type_id: suite.id, check_in: bkk(10), check_out: bkk(11), guests: 3 })); const D = j.row;
  let b1 = await bal(C);
  j = await J(await post(`/api/hotels/bookings/${D.id}`, C.h, { action: 'cancel', expect_refund: true }));
  ok('pending cancel → full refund', j.ok && j.booking.status === 'cancelled' && j.booking.refund_satang === 400000 && (await bal(C)) === b1 + 400000, j.error);

  // ยกเลิกช้า (ภายใน 24 ชม. ก่อนเช็กอิน) = ไม่คืน · โรงแรมได้ค่าห้องหัก %
  j = await J(await book(C, { check_in: bkk(8), check_out: bkk(9) })); const L = j.row; ok('book for late-cancel', j.ok, j.error);
  await fetch(B + `/api/partner/stays/${L.id}`, { method: 'PATCH', headers: { ...PC, origin: B }, body: JSON.stringify({ action: 'confirm' }) });
  const hourBkk = new Date(Date.now() + 7 * 3600e3).getUTCHours();
  await post('/api/admin/stays', ADM, { action: 'demo_shift', id: L.id, days: hourBkk < 14 ? 8 : 7 }); // เช็กอิน 14:00 วันนี้ (ยังไม่ถึง) หรือพรุ่งนี้
  j = await J(await fetch(B + `/api/hotels/bookings/${L.id}`, { headers: C.h }));
  ok('late: can cancel, no refund', j.ok && j.cancel.can && !j.cancel.refund, JSON.stringify(j.cancel));
  r = await post(`/api/hotels/bookings/${L.id}`, C.h, { action: 'cancel', expect_refund: true }); ok('stale "free cancel" confirm refused', r.status === 409);
  b1 = await bal(C); const pw2 = (await J(await fetch(B + '/api/partner/wallet', { headers: PC }))).available;
  j = await J(await post(`/api/hotels/bookings/${L.id}`, C.h, { action: 'cancel', expect_refund: false }));
  ok('late cancel → cancelled, refund 0', j.ok && j.booking.status === 'cancelled' && j.booking.refund_satang === 0, j.error);
  ok('late cancel: customer not refunded', (await bal(C)) === b1);
  const pw3 = (await J(await fetch(B + '/api/partner/wallet', { headers: PC }))).available;
  ok('late cancel: partner gets 1,275', pw3 - pw2 === 127500, `${pw2} → ${pw3}`);

  // หมดเวลายืนยัน → คืนอัตโนมัติ
  j = await J(await book(C, { check_in: bkk(20), check_out: bkk(21) })); const E = j.row;
  b1 = await bal(C);
  await post('/api/admin/stays', ADM, { action: 'demo_shift', id: E.id, minutes: 13 * 60 });
  j = await J(await fetch(B + `/api/hotels/bookings/${E.id}`, { headers: C.h }));
  ok('no reply in 12h → expired + refunded', j.booking?.status === 'expired' && (await bal(C)) === b1 + 150000, j.booking?.status);

  // ทีมงานคืนเงิน (ยืนยันแล้ว)
  j = await J(await book(C, { check_in: bkk(30), check_out: bkk(32) })); const F = j.row;
  await fetch(B + `/api/partner/stays/${F.id}`, { method: 'PATCH', headers: { ...PC, origin: B }, body: JSON.stringify({ action: 'confirm' }) });
  r = await post('/api/admin/stays', ADM, { action: 'refund', id: F.id, note: '' }); ok('admin refund needs reason', r.status === 400);
  b1 = await bal(C);
  j = await J(await post('/api/admin/stays', ADM, { action: 'refund', id: F.id, note: 'โรงแรมแจ้งน้ำไม่ไหล' }));
  ok('admin refund → refunded', j.ok && j.row.status === 'refunded' && (await bal(C)) === b1 + 300000, j.error);
  r = await post('/api/admin/stays', ADM, { action: 'refund', id: A.id, note: 'ซ้ำ' }); ok('cannot refund completed', r.status === 409);
  ok('admin stays 401 without session', (await fetch(B + '/api/admin/stays')).status === 401);

  // หน้าลูกค้า + หลังบ้าน
  t = (await (await fetch(B + '/stays/bookings', { headers: C.h })).text()).replace(/<!-- -->/g, '');
  ok('/stays/bookings lists my stays', t.includes(A.code) && t.includes('โรงแรมทดสอบห้องพัก'));
  t = (await (await fetch(B + `/stays/bookings/${A.id}`, { headers: C.h })).text()).replace(/<!-- -->/g, '');
  ok('detail has receipt summary', t.includes('ใบสรุปการจอง') && t.includes(A.code));
  ok('other customer cannot open detail', (await fetch(B + `/api/hotels/bookings/${A.id}`, { headers: C2.h })).status === 404);
  ok('/admin/stays page', (await (await fetch(B + '/admin/stays', { headers: ADM })).text()).includes(A.code));
  j = await J(await fetch(B + '/api/admin/stays', { headers: ADM })); ok('hotel escrow reconciles', j.ok && j.recon.ok, JSON.stringify(j.recon));

  // ยอดลูกค้าสุดท้าย = ตั้งต้น − A (6,000) − L (1,500)
  ok('customer net spend = 7,500', (await bal(C)) === start - 750000, String(await bal(C)));
  const lw = await J(await fetch(B + '/api/admin/wallet', { headers: ADM })); ok('ledger balanced', lw.sum === 0, String(lw.sum));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
