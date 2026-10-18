// เปลี่ยนแปลงนัดเพิ่มเติม + บล็อกลูกค้า (โหมดสาธิต · ระดับ API · เสียงเรียกเข้าข้าม — ทดสอบในเบราว์เซอร์เท่านั้น)
// 1) ลูกค้ายกเลิกคำขอเปลี่ยนเวลา/ต่อเวลาที่รอตอบ → เพื่อนได้แจ้ง · การ์ดงานเพื่อนไม่มีคำขอค้าง · ไม่ใช้สิทธิ์เปลี่ยนเวลา
// 2) เปลี่ยนเวลานัดที่สปาพาร์ทเนอร์ (สปาแจ้งห้องเต็มไว้) → เพื่อนรับ → พอร์ทัลย้ายเวลา + กลับเป็นรอยืนยัน
// 3) หน้าระหว่างนัดเปิดได้ (ปุ่มต่อเวลาใช้ข้อมูล change เดียวกับหน้าการจอง)
// 4) แข่งกัน: เพื่อนรับต่อเวลา "ระหว่าง" ลูกค้ากดจบ (demo_race_extend) → คืนค่าต่อเวลาอัตโนมัติ ไม่ค้าง escrow · จบก่อนแล้วรับ = ปฏิเสธ ไม่ตัดเงิน
// 5) เพื่อนบล็อกลูกค้า → โทร/แชทไม่ได้ทั้งสองฝั่ง · จองใหม่ไม่ได้ · ตั้งค่าเห็นรายการ + เลิกบล็อกได้
//    + สายที่ดังอยู่ถูกวาง (blocked) · คำขอที่ยังไม่ตอบถูกปฏิเสธ/คืนเงิน · แจ้งทีมงานนัดที่ยืนยันแล้ว (ครั้งเดียว)
// 6) เรียกด่วน: จำนวนเพื่อนบนฟอร์มไม่นับเพื่อนที่บล็อกลูกค้าคนนี้ และตรงกับตอนเรียกจริง
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210', mb = 'MB-2610001';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json();
const res = async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) });
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const cust = (email) => ({ cookie: 'hamoo_session=' + sign({ sub: 'demo:' + email, email, exp: Date.now() + 3600e3 }), 'content-type': 'application/json' });
// โทเคน Part-Time ต้องมี iat (ตรวจกับ "ออกจากระบบทุกเครื่อง")
const T = (() => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600e3 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); })();
const PTQ = `mb=${mb}&t=${encodeURIComponent(T)}`;
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const post = (u, h, b) => fetch(B + u, { method: 'POST', headers: h, body: JSON.stringify(b) });
const del = (u, h) => fetch(B + u, { method: 'DELETE', headers: h }).then(res);
const wallet = (C) => fetch(B + '/api/wallet', { headers: C }).then(J);
const notices = (C) => fetch(B + '/api/notifications', { headers: C }).then(J).then((d) => d.notices || []);
const ptNotices = () => fetch(B + `/api/pt/notifications?${PTQ}`).then(J).then((d) => d.notices || []);
const PT = (id, action, extra = {}) => post(`/api/pt/bookings/${id}`, { 'content-type': 'application/json' }, { mb, t: T, action, ...extra }).then(res);
const ptJobs = () => fetch(B + `/api/pt/bookings?${PTQ}`).then(J).then((d) => d.bookings || []);
const bk = (C, id) => fetch(B + `/api/bookings/${id}`, { headers: C }).then(J);
const shift = (id, minutes) => post('/api/admin/bookings', ADM, { action: 'demo_shift', id, minutes }).then(J);
const admW = () => fetch(B + '/api/admin/wallet', { headers: ADM }).then(J);
const ledger = () => admW().then((d) => d.sum);
const escrow = () => admW().then((d) => (d.accounts || []).filter((a) => a.owner_type === 'platform' && a.bucket === 'escrow').reduce((s, a) => s + a.balance, 0));
const far = (d, m = 41) => { const x = new Date(Date.now() + d * 86400e3); x.setMinutes(m, 0, 0); return x.toISOString(); };
let pid;

async function fund(C, email, baht) {
  const fd = new FormData(); fd.set('amount', String(baht)); fd.set('slip', new File([img], `s${Date.now()}.jpg`, { type: 'image/jpeg' }));
  await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { cookie: C.cookie }, body: fd });
  const tp = ((await admW()).topups || []).find((x) => x.customer_email === email && x.status === 'pending');
  if (tp) await post('/api/admin/wallet', ADM, { action: 'approve', id: tp.id });
  // รายการเติมเงินในหลังบ้านแสดงจำนวนจำกัด (ชุดท้าย ๆ หาไม่เจอ) → เติมด้วยการปรับยอดของ CEO
  else await post('/api/admin/wallet', ADM, { action: 'adjust', owner_type: 'customer', owner_id: 'demo:' + email, bucket: 'available', amount_baht: baht, reason: 'e2e', idem: 'e2e35-' + email + '-' + Date.now() });
}
const book = (C, starts_at, place = { type: 'cafe', detail: 'คาเฟ่ทดสอบชุด 35' }) => post('/api/bookings', C, { pid, hours: 3, starts_at, place, note: '' }).then(res);
async function bookAccepted(C, starts_at, label, place) {
  const j = await book(C, starts_at, place); ok(`book ${label}`, j.ok, j.error);
  if (!j.ok) return null;
  const a = await PT(j.id, 'accept'); ok(`pt accepts ${label}`, a.ok, a.error);
  return j.id;
}
/** นัดที่ไกล → เลื่อนให้เริ่มในอีก ~30 นาที แล้วเพื่อนเช็กอิน (ระหว่างนัด) */
async function inSession(C, id, label) {
  const st = Date.parse((await bk(C, id)).booking.starts_at);
  await shift(id, Math.round((st - Date.now()) / 60000) - 30);
  const p = await PT(id, 'checkin', { gps: { lat: 13.7563, lng: 100.5018, accuracy: 15 } }); ok(`PT checks in ${label}`, p.ok, p.error);
}
// นัดเปิดอยู่ของเพื่อนคนนี้ใกล้ "ตอนนี้" (จากชุดก่อนหน้า) ชนชั่วโมงที่ต่อ → เลื่อนออกไป 30 วัน
async function clearNow() {
  for (const x of (await J(await fetch(B + '/api/admin/bookings', { headers: ADM }))).bookings ?? [])
    if (x.parttime_mb === mb && ['requested', 'accepted', 'checked_in'].includes(x.status) && Math.abs(Date.parse(x.starts_at) - Date.now()) < 12 * 3600e3)
      await shift(x.id, -30 * 1440);
}

(async () => {
  pid = (/\/p\/(r[0-9a-f]{10})/.exec(await (await fetch(B + '/')).text()) || [])[1];
  ok('found live PT', !!pid);
  const E = 'bm35@test.local', C = cust(E);
  await fund(C, E, 80000);

  // ══ 1) ยกเลิกคำขอเปลี่ยนเวลาที่รอตอบ ══
  const b1 = await bookAccepted(C, far(31), 'reschedule-cancel');
  if (b1) {
    const to = far(32);
    let j = await res(await post(`/api/bookings/${b1}/reschedule`, C, { starts_at: to }));
    ok('request reschedule', j.ok && j.change.status === 'pending', j.error);
    ok('PT card shows pending change', (await ptJobs()).find((x) => x.id === b1)?.pending_change?.kind === 'reschedule');
    ok('anonymous cannot cancel', (await del(`/api/bookings/${b1}/reschedule`, { 'content-type': 'application/json' })).status === 401);
    ok('other customer cannot cancel', (await del(`/api/bookings/${b1}/reschedule`, cust('bm35-x@test.local'))).status === 404);
    j = await del(`/api/bookings/${b1}/reschedule`, C);
    ok('customer cancels pending reschedule', j.ok && j.change.status === 'cancelled', j.error);
    j = await del(`/api/bookings/${b1}/reschedule`, C); ok('cancel twice refused', j.status === 409, j.error);
    ok('PT notified of cancel', (await ptNotices()).some((n) => n.kind === 'booking_reschedule' && /ยกเลิกคำขอเปลี่ยนเวลา/.test(n.title)));
    ok('PT card cleared', (await ptJobs()).find((x) => x.id === b1)?.pending_change == null);
    const p = await PT(b1, 'reschedule_accept'); ok('PT accept after cancel refused', !p.ok && p.status === 409, p.error);
    const d = await bk(C, b1);
    ok('time unchanged + change shows cancelled', d.booking.starts_at !== to && d.change.changes[0].status === 'cancelled');
    ok('cancelled request does not use up the one change', d.change.can_reschedule === '', d.change.can_reschedule);
    await post(`/api/bookings/${b1}/cancel`, C, { reason: 'ทดสอบ' });
  }

  // ══ 2) เปลี่ยนเวลานัดสปาพาร์ทเนอร์ ══
  let j = await res(await post('/api/partner/apply', { 'content-type': 'application/json' }, { business_name: 'สปาทดสอบเปลี่ยนเวลา', type: 'สปา', province: 'กรุงเทพ', contact_name: 'คุณสปา', tel: '0812345678', email: 'spa35-' + Date.now() + '@test.local', package: '3m', consent: true }));
  ok('partner apply', j.ok, j.error);
  await post('/api/partner/auth/register', { 'content-type': 'application/json' }, { token: j.token, password: 'demo-test-' + crypto.randomBytes(6).toString('hex') });
  const plist = await J(await fetch(B + '/api/admin/partners', { headers: ADM }));
  const sp = (plist.rows || plist.partners || plist).find?.((x) => x.email.startsWith('spa35-') && x.business_name === 'สปาทดสอบเปลี่ยนเวลา');
  ok('partner found', !!sp);
  if (sp) {
    await fetch(B + `/api/admin/partners/${sp.id}`, { method: 'PATCH', headers: ADM, body: JSON.stringify({ account_status: 'active', status: 'active', qc_status: 'passed' }) });
    const PC = { cookie: 'mb_partner=' + sign({ k: 'ps', pid: sp.id, exp: Date.now() + 3600e3 }), 'content-type': 'application/json' };
    const portal = async () => (await (await fetch(B + '/partner/portal/bookings', { headers: PC })).text()).replace(/<!-- -->/g, '').replace(/\\"/g, '"');
    const b2 = await bookAccepted(C, far(33, 0), 'spa', { type: 'spa', spa_id: sp.id });
    if (b2) {
      const code = (await bk(C, b2)).booking.code;
      let t = await portal(); ok('portal shows spa booking', t.includes(code));
      const pb = new RegExp('"booking_ref":"' + code + '"[^}]*"id":"([0-9a-f-]{36})"').exec(t)?.[1];
      const full = await res(await fetch(B + `/api/partner/bookings/${pb}`, { method: 'PATCH', headers: PC, body: JSON.stringify({ action: 'full' }) }));
      ok('spa marks room full', full.ok, full.error);
      let d = await bk(C, b2); ok('spa booking can be rescheduled now', d.change?.can_reschedule === '', d.change?.can_reschedule);
      const to = far(34, 0);
      j = await res(await post(`/api/bookings/${b2}/reschedule`, C, { starts_at: to, reason: 'ห้องเต็ม ขอวันใหม่' }));
      ok('request spa reschedule', j.ok, j.error);
      const p = await PT(b2, 'reschedule_accept'); ok('PT accepts spa reschedule', p.ok && p.starts_at === to, p.error);
      t = await portal();
      ok('portal row moved to new time', new RegExp(`"booking_ref":"${code}"[^}]*"start_time":"${to.replace(/[.]/g, '\\.')}"`).test(t), to);
      ok('portal row back to pending (re-confirm room)', new RegExp(`"booking_ref":"${code}"[^}]*"status":"pending"`).test(t));
      ok('customer told spa will re-check room', (await notices(C)).some((n) => n.kind === 'booking_reschedule' && /ตรวจห้อง/.test(n.body || '')));
      await post(`/api/bookings/${b2}/cancel`, C, { reason: 'ทดสอบ' });
    }
  }
  ok('ledger sum 0 (reschedule)', (await ledger()) === 0);

  // ══ 3) + 4) ต่อเวลา: หน้าระหว่างนัด · ยกเลิกคำขอ · แข่งกับการจบนัด ══
  await clearNow();
  const b3 = await bookAccepted(C, far(35), 'race');
  if (b3) {
    await inSession(C, b3, 'race');
    ok('session page renders', (await fetch(B + `/order/${b3}/session`, { headers: C })).status === 200);
    let d = await bk(C, b3); ok('session data: extend allowed', d.change?.can_extend === '', d.change?.can_extend);
    const total0 = d.booking.total_satang, price0 = d.booking.price_satang;
    const w0 = await wallet(C), e0 = await escrow();
    // ยกเลิกคำขอต่อเวลา
    j = await res(await post(`/api/bookings/${b3}/extend`, C, {})); ok('request extend', j.ok, j.error);
    j = await del(`/api/bookings/${b3}/extend`, C); ok('customer cancels pending extend', j.ok && j.change.status === 'cancelled', j.error);
    ok('PT notified extend cancel', (await ptNotices()).some((n) => n.kind === 'booking_extend' && /ยกเลิกคำขอต่อเวลา/.test(n.title)));
    let p = await PT(b3, 'extend_accept'); ok('PT accept after cancel refused', !p.ok, p.error);
    ok('no charge after cancelled extend', (await wallet(C)).available === w0.available);
    // แข่งกัน: เพื่อนรับระหว่างที่ระบบจบงาน
    j = await res(await post(`/api/bookings/${b3}/extend`, C, {})); ok('request extend again', j.ok, j.error);
    const rate = j.change?.amount_satang;
    await shift(b3, 60);
    j = await res(await post(`/api/bookings/${b3}/complete`, C, { rating: 5, tags: [], again: 'yes', body: '', tip: 0, demo_race_extend: true }));
    ok('complete with simultaneous extend-accept', j.ok && j.status === 'completed', j.error);
    d = await bk(C, b3);
    ok('booking total/price back to pre-extension', d.booking.total_satang === total0 && d.booking.price_satang === price0, `${d.booking.total_satang} vs ${total0}`);
    ok('PT share on original price', d.booking.pt_pending_satang === Math.round(price0 * (d.booking.share_pct ?? 0) / 100));
    ok('late extension refunded to customer', (await wallet(C)).available === w0.available, `${w0.available} → ${(await wallet(C)).available} (rate ${rate})`);
    ok('nothing stuck in escrow', (await escrow()) === e0 - total0, `${e0} → ${await escrow()} (−${total0})`);
    ok('extension marked failed (refunded)', d.change.changes.some((c) => c.kind === 'extend' && c.status === 'failed' && /คืนเงิน/.test(c.reason || '')));
    ok('customer told extension refunded', (await notices(C)).some((n) => n.kind === 'booking_extend' && /คืนค่าต่อเวลา/.test(n.title)));
    ok('ledger sum 0 (race)', (await ledger()) === 0);
  }
  // ลำดับกลับกัน: จบก่อน แล้วเพื่อนกดรับต่อเวลา
  const b4 = await bookAccepted(C, far(36), 'complete-first');
  if (b4) {
    await inSession(C, b4, 'complete-first');
    j = await res(await post(`/api/bookings/${b4}/extend`, C, {})); ok('request extend (complete-first)', j.ok, j.error);
    const w1 = await wallet(C), e1 = await escrow(), tot = (await bk(C, b4)).booking.total_satang;
    await shift(b4, 60);
    j = await res(await post(`/api/bookings/${b4}/complete`, C, { rating: 5, tags: [], again: 'yes', body: '', tip: 0 })); ok('customer completes first', j.ok, j.error);
    const p = await PT(b4, 'extend_accept'); ok('extend accept after completion refused', !p.ok && p.status === 409, p.error);
    ok('no charge after completion', (await wallet(C)).available === w1.available);
    ok('escrow released fully', (await escrow()) === e1 - tot);
    ok('ledger sum 0 (complete-first)', (await ledger()) === 0);
  }

  // ══ 5) เพื่อนบล็อกลูกค้า ══
  await clearNow();
  const b5 = await bookAccepted(C, far(37), 'block');
  if (b5) {
    const st = Date.parse((await bk(C, b5)).booking.starts_at);
    await shift(b5, Math.round((st - Date.now()) / 60000) - 30); // อยู่ในช่วงโทรได้ (2 ชม. ก่อนนัด)
    const can = (h) => fetch(B + `/api/calls?booking_id=${b5}&${h === 'pt' ? 'as=pt&' + PTQ : 'as=customer'}`, { headers: h === 'pt' ? {} : h }).then(res);
    ok('call allowed before block', (await can(C)).can === true, (await can(C)).reason);
    const msgC = (body) => post(`/api/bookings/${b5}/messages`, C, { body }).then(res);
    const msgP = (body) => post(`/api/bookings/${b5}/messages`, { 'content-type': 'application/json' }, { body, mb, t: T }).then(res);
    ok('chat works before block', (await msgC('สวัสดีครับ')).ok);
    // ก่อนบล็อก: มีคำขอที่ยังไม่ตอบอีก 1 นัด + ลูกค้ากำลังโทรหาเพื่อน (สายดังอยู่)
    const rq = await book(C, far(39)); ok('pending request before block', rq.ok, rq.error);
    const rqTotal = rq.ok ? (await bk(C, rq.id)).booking.total_satang : 0;
    const wPre = await wallet(C);
    const cl = await post('/api/calls', C, { booking_id: b5, as: 'customer' }).then(res); ok('customer is ringing PT', cl.ok && cl.call?.status === 'ringing', cl.error);
    const pv = await PT(b5, 'block_preview'); ok('block sheet preview counts upcoming bookings', pv.ok && pv.requested >= 1 && pv.accepted >= 1, JSON.stringify(pv));
    ok('preview changes nothing', rq.ok && (await bk(C, rq.id)).booking.status === 'requested');
    const code5a = (await bk(C, b5)).booking.code;
    let p = await PT(b5, 'block_customer'); ok('PT blocks customer from chat header', p.ok && p.blocked, p.error);
    ok('block ends the ringing call', p.calls_ended === 1, String(p.calls_ended));
    if (cl.ok) { const cv = await fetch(B + `/api/calls/${cl.call.id}?as=customer`, { headers: C }).then(J); ok('call closed with reason blocked', cv.call?.status === 'declined' && cv.call?.end_reason === 'blocked', JSON.stringify(cv.call && { s: cv.call.status, r: cv.call.end_reason })); }
    ok('block auto-declined the pending request', p.declined >= 1, String(p.declined));
    if (rq.ok) {
      const rb = (await bk(C, rq.id)).booking;
      ok('request declined with normal reason', rb.status === 'declined' && rb.decline_reason === 'เพื่อนไม่สะดวกรับนัดนี้', rb.status + ' ' + rb.decline_reason);
      ok('declined request refunded to wallet', (await wallet(C)).available === wPre.available + rqTotal);
    }
    const ptAlerts = async () => ((await fetch(B + '/api/admin/alerts', { headers: ADM }).then(J)).items || []).filter((n) => n.kind === 'pt_block' && (n.body || '').includes(code5a));
    ok('admin told about upcoming accepted booking', (await ptAlerts()).length === 1);
    p = await PT(b5, 'block_customer'); ok('block twice is idempotent', p.ok);
    ok('no duplicate admin notice on second block', (await ptAlerts()).length === 1);
    ok('PT booking view says blocked', (await fetch(B + `/api/bookings/${b5}?${PTQ}`).then(J)).blocked_customer === true);
    let r = await can(C); ok('customer cannot call', r.can === false && r.code === 'blocked', r.reason);
    r = await can('pt'); ok('PT cannot call', r.can === false && r.code === 'blocked', r.reason);
    r = await post('/api/calls', C, { booking_id: b5, as: 'customer' }).then(res); ok('start call refused', !r.ok && r.code === 'blocked', r.error);
    r = await msgC('ยังอยู่ไหม'); ok('customer chat refused', r.status === 403 && r.code === 'blocked', r.error);
    r = await msgP('ข้อความจากเพื่อน'); ok('PT chat refused', r.status === 403 && r.code === 'blocked', r.error);
    r = await book(C, far(38)); ok('new booking to this PT refused', !r.ok && r.code === 'blocked' && r.error === 'เพื่อนคนนี้ไม่รับนัดจากบัญชีของคุณ', r.error);
    const other = cust('bm35-other@test.local'); await fund(other, 'bm35-other@test.local', 20000);
    r = await book(other, far(43)); ok('other customers still book', r.ok, r.error);
    if (r.ok) await post(`/api/bookings/${r.id}/cancel`, other, { reason: 'ทดสอบ' });
    // ตั้งค่า: รายการบล็อก + เลิกบล็อก
    let bl = await fetch(B + `/api/pt/bookings/blocks?${PTQ}`).then(J);
    const code5 = (await bk(C, b5)).booking.code;
    const row = (bl.blocks || []).find((x) => x.code === code5);
    ok('settings lists blocked customer', bl.ok && bl.blocks.length >= 1 && !!row?.h);
    ok('list does not expose customer id/email', !JSON.stringify(bl).includes(E) && !JSON.stringify(bl).includes('demo:'));
    ok('settings page renders list', (await (await fetch(B + `/join/profile/${mb}/settings?t=${encodeURIComponent(T)}`)).text()).includes('ลูกค้าที่บล็อก'));
    ok('stranger cannot read list', (await fetch(B + `/api/pt/bookings/blocks?mb=${mb}&t=bad`)).status === 403);
    r = await post('/api/pt/bookings/blocks', { 'content-type': 'application/json' }, { mb, t: T, action: 'unblock', h: row?.h }).then(res); ok('PT unblocks from settings', r.ok, r.error);
    ok('call allowed after unblock', (await can(C)).can === true);
    ok('chat works after unblock', (await msgC('กลับมาคุยได้แล้ว')).ok);
    r = await book(C, far(44)); ok('can book again after unblock', r.ok, r.error);
    if (r.ok) await post(`/api/bookings/${r.id}/cancel`, C, { reason: 'ทดสอบ' });
    // บล็อก/เลิกบล็อกจากหัวแชทอีกรอบ
    p = await PT(b5, 'block_customer'); p = await PT(b5, 'unblock_customer'); ok('unblock from chat header', p.ok && p.blocked === false);
    ok('blocked list empty again', !((await fetch(B + `/api/pt/bookings/blocks?${PTQ}`).then(J)).blocks || []).some((x) => x.h === row?.h));
    await post(`/api/bookings/${b5}/cancel`, C, { reason: 'ทดสอบ' });
  }

  // ══ 6) เรียกด่วน: ตัวเลขบนฟอร์มไม่นับเพื่อนที่บล็อกลูกค้าคนนี้ (ตัวกรองเดียวกับตอนเรียกจริง) ══
  await clearNow();
  const E6 = 'bm35-quick@test.local', C6 = cust(E6);
  await fund(C6, E6, 20000);
  const q6 = await book(C6, far(47)); ok('book (quick-preview test)', q6.ok, q6.error);
  if (q6.ok) {
    const preview = async (H) => { const h = (await (await fetch(B + '/quick', { headers: H })).text()).replace(/\\"/g, '"'); const m = /"free":\{"3":(\d+),"5":(\d+)\}/.exec(h); return m ? { c3: Number(m[1]), listed: h.includes(`/p/${pid}`) } : null; };
    const before = await preview(C6);
    const p6 = await PT(q6.id, 'block_customer'); ok('PT blocks quick-test customer', p6.ok && p6.declined === 1, JSON.stringify(p6));
    const after = await preview(C6), other = await preview(cust('bm35-other@test.local'));
    ok('quick preview parsed', !!before && !!after && !!other);
    if (before && after && other) {
      ok('blocked customer: PT not in free list', after.listed === false);
      ok('preview count drops the PT who blocked me', before.c3 - after.c3 === (before.listed ? 1 : 0) || (!before.listed && before.c3 === after.c3), `${before.c3} → ${after.c3} (listed ${before.listed})`);
      ok('other customers still see the same count', other.c3 === before.c3, `${other.c3} vs ${before.c3}`);
      const qr = await post('/api/quick', C6, { activity: 'คาเฟ่', hours: 3, place: { type: 'cafe', detail: 'อโศก' }, note: '' }).then(res);
      ok('create quick agrees with preview', after.c3 === 0 ? qr.code === 'none' : qr.ok && qr.quick?.invited === after.c3, `${after.c3} · ${qr.code ?? qr.quick?.invited}`);
      if (qr.ok) await post(`/api/quick/${qr.quick.id}`, C6, { action: 'cancel' });
    }
    const code6 = (await bk(C6, q6.id)).booking.code;
    const row6 = ((await fetch(B + `/api/pt/bookings/blocks?${PTQ}`).then(J)).blocks || []).find((x) => x.code === code6);
    const un = await post('/api/pt/bookings/blocks', { 'content-type': 'application/json' }, { mb, t: T, action: 'unblock', h: row6?.h }).then(res); ok('unblock quick-test customer', un.ok, un.error);
  }
  ok('ledger sum 0 (end)', (await ledger()) === 0);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
