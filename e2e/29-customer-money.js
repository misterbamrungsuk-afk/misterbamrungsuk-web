// เงินลูกค้า + เปลี่ยนแปลงนัด (โหมดสาธิต):
// 1) ลูกค้าถอนเงิน: ขอ → super อนุมัติไม่ได้ → CEO อนุมัติ → แอดมินโอนแล้ว → ยอด · โอนไม่สำเร็จ = คืนยอด · เครดิตโบนัสเมมเบอร์ถอนไม่ได้
// 2) เปลี่ยนเวลา: เพื่อนรับ = เวลาใหม่ · ไม่รับ = เวลาเดิม · ใกล้เวลานัดเกินไป = ปฏิเสธ · ชนนัดอื่น = ปฏิเสธ · 1 ครั้งต่อการจอง
// 3) ต่อเวลา +1 ชม.: เพื่อนรับ → ตัดเงินเข้า escrow → จบงานแบ่งส่วนของชั่วโมงที่ต่อให้เพื่อน · ยอดไม่พอ = แจ้งชัด · ledger = 0
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
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const cust = (email) => ({ cookie: 'hamoo_session=' + sign({ sub: 'demo:' + email, email, exp: Date.now() + 3600e3 }), 'content-type': 'application/json' });
const T = (() => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600e3 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); })();
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const post = (u, h, b) => fetch(B + u, { method: 'POST', headers: h, body: JSON.stringify(b) });
const wallet = (C) => fetch(B + '/api/wallet', { headers: C }).then(J);
const notices = (C) => fetch(B + '/api/notifications', { headers: C }).then(J).then((d) => d.notices || []);
const ptNotices = () => fetch(B + `/api/pt/notifications?mb=${mb}&t=${encodeURIComponent(T)}`).then(J).then((d) => d.notices || []);
const PT = (id, action, extra = {}) => fetch(B + `/api/pt/bookings/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, action, ...extra }) }).then(async (r) => ({ status: r.status, ...(await r.json()) }));
const ptJobs = () => fetch(B + `/api/pt/bookings?mb=${mb}&t=${encodeURIComponent(T)}`).then(J).then((d) => d.bookings || []);
const ptw = () => fetch(B + `/api/pt/wallet?mb=${mb}&t=${encodeURIComponent(T)}`).then(J);
const bk = (C, id) => fetch(B + `/api/bookings/${id}`, { headers: C }).then(J);
const shift = (id, minutes) => post('/api/admin/bookings', ADM, { action: 'demo_shift', id, minutes }).then(J);
const ledger = () => fetch(B + '/api/admin/wallet', { headers: ADM }).then(J).then((d) => d.sum);
const far = (d) => { const x = new Date(Date.now() + d * 86400e3); x.setMinutes(37, 0, 0); return x.toISOString(); };
const BANK = { bank: 'กสิกรไทย', account: '123-4-56789-0', name: 'ลูกค้า ทดสอบ' };
let pid;

// เติมเงินด้วยสลิป + แอดมินอนุมัติ (โหมดสาธิตไม่ตรวจ Slip2Go)
async function fund(C, email, baht) {
  const fd = new FormData(); fd.set('amount', String(baht)); fd.set('slip', new File([img], `s${Date.now()}.jpg`, { type: 'image/jpeg' }));
  await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { cookie: C.cookie }, body: fd });
  const a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  const tp = (a.topups || []).find((x) => x.customer_email === email && x.status === 'pending');
  if (tp) await post('/api/admin/wallet', ADM, { action: 'approve', id: tp.id });
}
const book = (C, starts_at) => post('/api/bookings', C, { pid, hours: 3, starts_at, place: { type: 'cafe', detail: 'คาเฟ่ทดสอบเงินลูกค้า' }, note: '' }).then(async (r) => ({ status: r.status, ...(await r.json()) }));
async function bookAccepted(C, starts_at, label) {
  const j = await book(C, starts_at); ok(`book ${label}`, j.ok, j.error);
  if (!j.ok) return null;
  const a = await PT(j.id, 'accept'); ok(`pt accepts ${label}`, a.ok, a.error);
  return j.id;
}

(async () => {
  pid = (/\/p\/(r[0-9a-f]{10})/.exec(await (await fetch(B + '/')).text()) || [])[1];
  ok('found live PT', !!pid);

  // ══ 1) ลูกค้าถอนเงิน ══
  const wE = 'cm-wd@test.local', W = cust(wE);
  ok('withdraw needs login', (await post('/api/wallet/withdraw', { 'content-type': 'application/json' }, { amount: 100, bank: BANK })).status === 401);
  await fund(W, wE, 5000);
  let w = await wallet(W);
  ok('funded ฿5,000 · all withdrawable', w.available === 500000 && w.withdraw?.withdrawable === 500000 && w.withdraw?.locked === 0, JSON.stringify(w.withdraw).slice(0, 120));
  let j = await J(await post('/api/wallet/withdraw', W, { amount: 1000, bank: { ...BANK, account: '123456789' } })); ok('account < 10 digits refused', !j.ok, j.error);
  j = await J(await post('/api/wallet/withdraw', W, { amount: 1000, bank: { ...BANK, account: '1234567890123456' } })); ok('account > 15 digits refused', !j.ok, j.error);
  j = await J(await post('/api/wallet/withdraw', W, { amount: 1000, bank: { ...BANK, name: '' } })); ok('account name required', !j.ok, j.error);
  j = await J(await post('/api/wallet/withdraw', W, { amount: 50, bank: BANK })); ok('below minimum refused', !j.ok && /ขั้นต่ำ/.test(j.error || ''), j.error);
  j = await J(await post('/api/wallet/withdraw', W, { amount: 6000, bank: BANK })); ok('more than withdrawable refused', !j.ok, j.error);
  j = await J(await post('/api/wallet/withdraw', W, { amount: 2000, bank: BANK })); ok('request ฿2,000', j.ok && j.request.status === 'requested', j.error); const r1 = j.request?.id;
  j = await J(await post('/api/wallet/withdraw', W, { amount: 500, bank: BANK })); ok('one open request at a time', !j.ok, j.error);
  w = await wallet(W); ok('available → withdrawing', w.available === 300000 && w.withdrawing === 200000, `${w.available} ${w.withdrawing}`);
  ok('history shows withdraw request', w.history.some((h) => h.kind === 'payout' && h.bucket === 'available' && h.amount === -200000));
  let t = (await (await fetch(B + '/admin/payroll', { headers: ADM })).text()).replace(/<!-- -->/g, ''); ok('CEO page lists customer request', t.includes('ถอนเงินลูกค้า') && t.includes(wE));
  ok('super cannot approve', (await post('/api/admin/payout-requests', SUP, { action: 'approve', id: r1 })).status === 403);
  ok('cannot mark paid before CEO approves', (await post('/api/admin/payout-requests', SUP, { action: 'paid', id: r1 })).status === 409);
  j = await J(await post('/api/admin/payout-requests', ADM, { action: 'approve', id: r1 })); ok('CEO approves', j.ok, j.error);
  ok('customer told approved', (await notices(W)).some((n) => n.kind === 'withdraw' && /อนุมัติ/.test(n.title)));
  j = await J(await post('/api/admin/payout-requests', SUP, { action: 'paid', id: r1 })); ok('admin marks paid', j.ok, j.error);
  ok('paid twice refused', (await post('/api/admin/payout-requests', SUP, { action: 'paid', id: r1 })).status === 409);
  w = await wallet(W); ok('paid: withdrawing 0 · available ฿3,000', w.withdrawing === 0 && w.available === 300000 && w.withdraw.requests[0].status === 'paid', `${w.available} ${w.withdrawing}`);
  ok('customer told paid', (await notices(W)).some((n) => n.kind === 'withdraw' && /เข้าบัญชีแล้ว/.test(n.title)));
  // โอนไม่สำเร็จ → คืนยอด
  j = await J(await post('/api/wallet/withdraw', W, { amount: 1000, bank: BANK })); const r2 = j.request?.id; ok('request ฿1,000', j.ok, j.error);
  await post('/api/admin/payout-requests', ADM, { action: 'approve', id: r2 });
  j = await J(await post('/api/admin/payout-requests', SUP, { action: 'failed', id: r2, note: 'เลขบัญชีผิด' })); ok('transfer failed', j.ok, j.error);
  w = await wallet(W); ok('failed → refunded to available', w.available === 300000 && w.withdrawing === 0 && w.withdraw.requests[0].status === 'failed', `${w.available} ${w.withdrawing}`);
  ok('customer told failed + refunded', (await notices(W)).some((n) => n.kind === 'withdraw' && /ไม่สำเร็จ/.test(n.title)));
  // CEO ไม่อนุมัติ → คืนยอด
  j = await J(await post('/api/wallet/withdraw', W, { amount: 500, bank: BANK })); const r3 = j.request?.id;
  j = await J(await post('/api/admin/payout-requests', ADM, { action: 'reject', id: r3, note: 'ทดสอบ' })); ok('CEO rejects → refunded', j.ok && (await wallet(W)).available === 300000, j.error);

  // เครดิตโบนัสเมมเบอร์ถอนไม่ได้
  const mE = 'cm-bonus@test.local', M = cust(mE);
  const ms = await J(await fetch(B + '/api/membership'));
  if (ms.enabled && ms.tiers?.gold) {
    const pay = ms.tiers.gold.pay * 100, credit = ms.tiers.gold.credit * 100, bonus = credit - pay;
    const fd = new FormData(); fd.append('tier', 'gold'); fd.append('slip', new File([img], 'm.jpg', { type: 'image/jpeg' }));
    j = await J(await fetch(B + '/api/membership', { method: 'POST', headers: { cookie: M.cookie }, body: fd })); ok('buy gold', j.ok, j.error);
    if (j.ok && j.status === 'pending') { const a = await J(await post('/api/admin/sales', ADM, { action: 'approve', id: j.id })); ok('admin approves membership', a.ok, a.error); }
    w = await wallet(M);
    ok('membership credit in wallet', w.available === credit, `${w.available} vs ${credit}`);
    ok('bonus is locked, only paid amount withdrawable', w.withdraw.locked === bonus && w.withdraw.withdrawable === pay, JSON.stringify(w.withdraw).slice(0, 120));
    j = await J(await post('/api/wallet/withdraw', M, { amount: credit / 100, bank: BANK })); ok('withdraw incl. bonus refused', !j.ok && /โบนัส/.test(j.error || ''), j.error);
    j = await J(await post('/api/wallet/withdraw', M, { amount: pay / 100 + 1, bank: BANK })); ok('withdraw ฿1 over paid amount refused', !j.ok, j.error);
    j = await J(await post('/api/wallet/withdraw', M, { amount: pay / 100, bank: BANK })); ok('withdraw exactly paid amount ok', j.ok, j.error);
    await post('/api/admin/payout-requests', ADM, { action: 'reject', id: j.request?.id, note: 'ทดสอบ' });
  } else console.log('SKIP bonus test (membership disabled)');
  ok('ledger sum 0 (withdraw)', (await ledger()) === 0);

  // ══ 2) เปลี่ยนเวลา ══
  const rE = 'cm-rs@test.local', R = cust(rE);
  await fund(R, rE, 60000);
  // รับเวลาใหม่
  const b1 = await bookAccepted(R, far(50), 'reschedule happy');
  if (b1) {
    let d = await bk(R, b1); ok('can reschedule accepted booking', d.change?.can_reschedule === '', d.change?.can_reschedule);
    const w0 = await wallet(R);
    const to = far(57);
    j = await J(await post(`/api/bookings/${b1}/reschedule`, R, { starts_at: to, reason: 'ติดประชุม' })); ok('request reschedule', j.ok && j.change.status === 'pending', j.error);
    j = await J(await post(`/api/bookings/${b1}/reschedule`, R, { starts_at: far(56) })); ok('second request while pending refused', !j.ok, j.error);
    d = await bk(R, b1); ok('order page shows pending reschedule', d.change?.pending?.kind === 'reschedule' && d.booking.starts_at !== to);
    const job = (await ptJobs()).find((x) => x.id === b1); ok('PT job card has pending change', job?.pending_change?.kind === 'reschedule' && job.pending_change.new_starts_at === to);
    ok('PT notified', (await ptNotices()).some((n) => n.kind === 'booking_reschedule'));
    let p = await PT(b1, 'reschedule_accept'); ok('PT accepts new time', p.ok && p.starts_at === to, p.error);
    d = await bk(R, b1); ok('booking time changed', d.booking.starts_at === to && d.booking.status === 'accepted' && !d.change.pending);
    ok('customer notified accept', (await notices(R)).some((n) => n.kind === 'booking_reschedule' && /รับเวลาใหม่/.test(n.title)));
    const w1 = await wallet(R); ok('no money change', w1.available === w0.available && w1.held === w0.held);
    j = await J(await post(`/api/bookings/${b1}/reschedule`, R, { starts_at: far(58) })); ok('only once per booking', !j.ok && j.code === 'limit', j.error);
    await post(`/api/bookings/${b1}/cancel`, R, { reason: 'ทดสอบ' });
  }
  // เพื่อนไม่รับ → เวลาเดิม
  const b2 = await bookAccepted(R, far(51), 'reschedule decline');
  if (b2) {
    const before = (await bk(R, b2)).booking.starts_at;
    j = await J(await post(`/api/bookings/${b2}/reschedule`, R, { starts_at: far(58) })); ok('request reschedule (decline path)', j.ok, j.error);
    let p = await PT(b2, 'reschedule_decline', { reason: 'ไม่ว่าง' }); ok('PT declines', p.ok, p.error);
    const d = await bk(R, b2); ok('booking keeps original time', d.booking.starts_at === before && d.change.changes[0].status === 'declined');
    ok('customer notified decline', (await notices(R)).some((n) => n.kind === 'booking_reschedule' && /ไม่สะดวก/.test(n.title)));
    p = await PT(b2, 'reschedule_accept'); ok('accept after decline refused', !p.ok, p.error);
    await post(`/api/bookings/${b2}/cancel`, R, { reason: 'ทดสอบ' });
  }
  // ใกล้เวลานัดเกินไป
  const b3 = await bookAccepted(R, far(52), 'reschedule too late');
  if (b3) {
    const st = Date.parse((await bk(R, b3)).booking.starts_at);
    await shift(b3, Math.round((st - Date.now()) / 60000) - 120); // เหลือ ~2 ชม.ก่อนนัด
    const d = await bk(R, b3); ok('order page says too late', /ก่อนเวลานัด/.test(d.change?.can_reschedule || ''), d.change?.can_reschedule);
    const r = await post(`/api/bookings/${b3}/reschedule`, R, { starts_at: far(53) }); j = await J(r);
    ok('reschedule < N hours before start refused', r.status === 409 && j.code === 'too_late', j.error);
    await post(`/api/bookings/${b3}/cancel`, R, { reason: 'ทดสอบ' });
  }
  // ชนนัดอื่น
  const bA = await bookAccepted(R, far(54), 'clash A'), bB = await bookAccepted(R, far(55), 'clash B');
  if (bA && bB) {
    const aAt = (await bk(R, bA)).booking.starts_at;
    const r = await post(`/api/bookings/${bB}/reschedule`, R, { starts_at: aAt }); j = await J(r);
    ok('reschedule onto another booking refused (clash)', r.status === 409 && j.code === 'clash', j.error);
    ok('clash refusal does not use up the one change', (await bk(R, bB)).change?.can_reschedule === '');
  }
  for (const id of [bA, bB]) if (id) await post(`/api/bookings/${id}/cancel`, R, { reason: 'ทดสอบ' });
  ok('ledger sum 0 (reschedule)', (await ledger()) === 0);

  // ══ 3) ต่อเวลา ══
  const xE = 'cm-ext@test.local', X = cust(xE);
  await fund(X, xE, 60000);
  // นัดที่ชุดก่อนหน้าทิ้งไว้ใกล้ "ตอนนี้" (เรียกด่วน · วงจรการจอง) จะชนชั่วโมงที่ต่อ → เลื่อนออกไป 30 วัน (demo_shift ค่าติดลบ = เลื่อนไปข้างหน้า · โหมดสาธิตเท่านั้น)
  for (const x of (await J(await fetch(B + '/api/admin/bookings', { headers: ADM }))).bookings ?? [])
    if (x.parttime_mb === mb && ["requested", "accepted", "checked_in"].includes(x.status) && Math.abs(Date.parse(x.starts_at) - Date.now()) < 12 * 3600e3)
      await fetch(B + '/api/admin/bookings', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'demo_shift', id: x.id, minutes: -30 * 1440 }) });
  const b4 = await bookAccepted(X, far(56), 'extend');
  if (b4) {
    const st = Date.parse((await bk(X, b4)).booking.starts_at);
    await shift(b4, Math.round((st - Date.now()) / 60000) - 30); // อีก 30 นาทีถึงเวลานัด → เช็กอินได้
    let p = await PT(b4, 'checkin', { gps: { lat: 13.7563, lng: 100.5018, accuracy: 15 } }); ok('PT checks in', p.ok, p.error);
    let d = await bk(X, b4); const price0 = d.booking.price_satang, total0 = d.booking.total_satang, rate = d.change?.hourly_satang;
    ok('extend allowed during session', d.change?.can_extend === '' && rate === Math.round(price0 / 3), `${d.change?.can_extend} ${rate}`);
    const w0 = await wallet(X);
    j = await J(await post(`/api/bookings/${b4}/extend`, X, {})); ok('request +1 hour', j.ok && j.change.amount_satang === rate, j.error);
    j = await J(await post(`/api/bookings/${b4}/extend`, X, {})); ok('one extension request at a time', !j.ok, j.error);
    const job = (await ptJobs()).find((x) => x.id === b4); ok('PT job card shows extension request', job?.pending_change?.kind === 'extend');
    ok('PT notified extension', (await ptNotices()).some((n) => n.kind === 'booking_extend'));
    ok('no charge before PT accepts', (await wallet(X)).available === w0.available);
    p = await PT(b4, 'extend_accept'); ok('PT accepts extension', p.ok && p.price_satang === price0 + rate, p.error);
    p = await PT(b4, 'extend_accept'); ok('double accept refused', !p.ok);
    d = await bk(X, b4); ok('booking price/total/hours updated', d.booking.price_satang === price0 + rate && d.booking.total_satang === total0 + rate && d.change.extra_hours === 1, `${d.booking.price_satang} ${d.change?.extra_hours}`);
    const w1 = await wallet(X); ok('customer charged hourly rate once', w1.available === w0.available - rate, `${w0.available}→${w1.available}`);
    ok('customer notified extension', (await notices(X)).some((n) => n.kind === 'booking_extend' && /แล้ว/.test(n.title)));
    ok('ledger sum 0 (extend)', (await ledger()) === 0);
    // เพื่อนไม่รับครั้งที่สอง → ไม่ตัดเงิน
    j = await J(await post(`/api/bookings/${b4}/extend`, X, {})); ok('second extension request', j.ok, j.error);
    p = await PT(b4, 'extend_decline'); ok('PT declines second extension', p.ok, p.error);
    ok('declined extension not charged', (await wallet(X)).available === w1.available);
    // จบงาน → แบ่งเงินจากค่าบริการที่รวมชั่วโมงที่ต่อ
    await shift(b4, 60);
    const pw0 = await ptw();
    j = await J(await post(`/api/bookings/${b4}/complete`, X, { rating: 5, tags: [], again: 'yes', body: '', tip: 0 })); ok('customer completes', j.ok && j.status === 'completed', j.error);
    d = await bk(X, b4);
    const share = Math.round(d.booking.price_satang * (d.booking.share_pct ?? 0) / 100);
    ok('PT share computed on extended price', d.booking.pt_pending_satang === share && share > Math.round(price0 * (d.booking.share_pct ?? 0) / 100), `${d.booking.pt_pending_satang} vs ${share}`);
    const pw1 = await ptw(); // ชุดก่อนหน้าอาจตั้งปล่อยเงินอัตโนมัติ → ส่วนแบ่งอาจเข้า available ทันที · นับรวม pending + available
    const tot = (x) => (x.pending ?? 0) + (x.available ?? 0);
    ok('PT earned share incl. extra hour', tot(pw1) - tot(pw0) === share, `${tot(pw0)}→${tot(pw1)} vs ${share}`);
    j = await J(await post(`/api/bookings/${b4}/extend`, X, {})); ok('cannot extend after completion', !j.ok, j.error);
    ok('ledger sum 0 (after split)', (await ledger()) === 0);
  }
  // ยอดไม่พอ → ข้อความชัด + ลิงก์เติมเงิน
  const pE = 'cm-poor@test.local', P = cust(pE);
  let r = await book(P, far(57)); const need = r.need;
  ok('poor customer sees price needed', r.status === 402 && need > 0, r.error);
  if (need > 0) {
    await post('/api/admin/wallet', ADM, { action: 'adjust', owner_type: 'customer', owner_id: 'demo:' + pE, bucket: 'available', amount_baht: need / 100 + 10, reason: 'ทดสอบต่อเวลา', idem: 'e2e-cm-poor-' + Date.now() });
    const b5 = await bookAccepted(P, far(57), 'extend (low funds)');
    if (b5) {
      const st = Date.parse((await bk(P, b5)).booking.starts_at);
      await shift(b5, Math.round((st - Date.now()) / 60000) - 30);
      await PT(b5, 'checkin', { gps: { lat: 13.7563, lng: 100.5018, accuracy: 15 } });
      const x = await post(`/api/bookings/${b5}/extend`, P, {}); j = await J(x);
      ok('insufficient funds → 402 + Thai error + top-up link', x.status === 402 && j.code === 'funds' && /ไม่พอ/.test(j.error || '') && j.topup === '/wallet', j.error);
      await shift(b5, 60);
      await post(`/api/bookings/${b5}/complete`, P, { rating: 5, tags: [], again: 'yes', body: '', tip: 0 });
    }
  }
  ok('ledger sum 0 (end)', (await ledger()) === 0);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
