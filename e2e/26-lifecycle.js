// วงจรการจอง (QA รอบจริง): ผิดนัด → แอดมินตัดสิน → เงินย้ายจริง + ledger = 0 + ใบเตือน · ยกคำร้องหลังเช็กอิน = กลับเป็นระหว่างนัด
// · Part-Time ได้แจ้งเตือนข้อพิพาท/ผลตัดสิน · ชม.=4 ถูกปฏิเสธ · เรียกด่วนรับไม่สำเร็จ = คำขอยังเปิด · ตัวกรองแชทจับคำเลี่ยง · ใบกำกับภาษีเฉพาะนัดที่จบแล้ว
// โหมดสาธิตเท่านั้น — ใช้ action demo_shift ของ /api/admin/bookings เลื่อนเวลานัดย้อนหลัง (แทนการรอ 15 นาทีจริง)
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210', mb = 'MB-2610001';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json();
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const C = { cookie: 'hamoo_session=' + sign({ sub: 'demo:life@test.local', email: 'life@test.local', exp: Date.now() + 3600e3 }), 'content-type': 'application/json' };
const T = (() => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600e3 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); })();
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const PT = (id, action, extra = {}) => fetch(B + `/api/pt/bookings/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, action, ...extra }) }).then(J);
const ptw = () => fetch(B + `/api/pt/wallet?mb=${mb}&t=${encodeURIComponent(T)}`).then(J);
const ptNotices = () => fetch(B + `/api/pt/notifications?mb=${mb}&t=${encodeURIComponent(T)}`).then(J).then((d) => d.notices || []);
const wallet = () => fetch(B + '/api/wallet', { headers: C }).then(J);
const bk = (id) => fetch(B + `/api/bookings/${id}`, { headers: C }).then(J).then((d) => d.booking);
const shift = (id, minutes) => fetch(B + '/api/admin/bookings', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'demo_shift', id, minutes }) }).then(J);
const ledger = () => fetch(B + '/api/admin/wallet', { headers: ADM }).then(J).then((d) => d.sum);
const nsGet = (id, pt) => fetch(B + `/api/noshow?booking=${id}${pt ? `&mb=${mb}&t=${encodeURIComponent(T)}` : ''}`, { headers: pt ? {} : { cookie: C.cookie } }).then(J);
const nsPost = (id, pt, note, photo) => { const fd = new FormData(); fd.set('booking', id); fd.set('note', note); if (pt) { fd.set('mb', mb); fd.set('t', T); } fd.set('lat', '13.7563'); fd.set('lng', '100.5018'); fd.set('accuracy', '20'); if (photo) fd.set('photo', new File([img], 'spot.jpg', { type: 'image/jpeg' })); return fetch(B + '/api/noshow', { method: 'POST', headers: pt ? {} : { cookie: C.cookie }, body: fd }).then(async (r) => ({ status: r.status, ...(await r.json()) })); };
const claims = () => fetch(B + '/api/admin/noshow', { headers: ADM }).then(J).then((d) => d.claims || []);
const decide = (id, decision) => fetch(B + '/api/admin/noshow', { method: 'POST', headers: ADM, body: JSON.stringify({ id, decision }) });
// เวลานัดไกล ๆ ที่ไม่ชนชุดทดสอบอื่น → จองแล้วค่อยเลื่อนให้ใกล้ (กันชนเวลา)
const far = (d) => { const x = new Date(Date.now() + d * 86400e3); x.setMinutes(7, 0, 0); return x.toISOString(); };
const book = (starts_at, hours = 3) => fetch(B + '/api/bookings', { method: 'POST', headers: C, body: JSON.stringify({ pid, hours, starts_at, place: { type: 'cafe', detail: 'คาเฟ่ทดสอบวงจร' }, note: '' }) });
const toMin = (iso) => Math.round((Date.parse(iso) - Date.now()) / 60000);
let pid;

(async () => {
  pid = (/\/p\/(r[0-9a-f]{10})/.exec(await (await fetch(B + '/')).text()) || [])[1];
  // เติมเงินลูกค้า 2 รอบ (หลายนัด + เรียกด่วน)
  for (let i = 0; i < 2; i++) {
    const fd = new FormData(); fd.set('amount', '30000'); fd.set('slip', new File([img], `s${i}.jpg`, { type: 'image/jpeg' }));
    await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { cookie: C.cookie }, body: fd });
    const a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
    const tp = a.topups.find((x) => x.customer_email === 'life@test.local' && x.status === 'pending');
    if (tp) await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'approve', id: tp.id }) });
  }
  ok('customer funded', (await wallet()).available >= 3000000);

  // ── ระยะเวลาต้องเป็น 3/5 ชม. (ไม่แปลงเอง) ──
  let r = await book(far(39), 4); let j = await J(r); ok('hours=4 rejected', r.status === 400 && j.code === 'hours', j.error);

  // ── เรียกด่วน: รับไม่สำเร็จ (นัดชนเวลา) = คำขอยังเปิด เงินยังกันไว้ ──
  const fd0 = new FormData(); fd0.set('mb', mb); fd0.set('t', T); fd0.set('step', 'post'); fd0.set('text', 'ว่างไปคาเฟ่'); fd0.set('time', 'ทั้งวัน'); fd0.set('zone', 'อโศก');
  await fetch(B + `/api/join/profile?mb=${mb}&t=${encodeURIComponent(T)}`, { method: 'POST', body: fd0 });
  j = await J(await fetch(B + '/api/quick', { method: 'POST', headers: C, body: JSON.stringify({ activity: 'คาเฟ่', hours: 3, place: { type: 'cafe', detail: 'อโศก', lat: 13.7373, lng: 100.5602 }, note: '' }) }));
  if (j.ok) {
    const qid = j.quick.id, hold = j.quick.hold_satang;
    ok('quick keeps customer pin', j.quick.place.lat === 13.7373, JSON.stringify(j.quick.place));
    // ลูกค้าจองเพื่อนคนเดียวกันตรงช่วงเวลาเรียกด่วน → ตอนเพื่อนกดรับ สร้างนัดชนเวลา
    r = await book(new Date(Date.now() + 2 * 3600e3).toISOString()); const clashB = await J(r);
    ok('direct booking in quick window', clashB.ok, clashB.error);
    const w0 = await wallet();
    r = await fetch(B + '/api/pt/quick', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, id: qid }) }); j = await J(r);
    ok('quick accept failure → clear error', r.status === 409 && /รับนัดไม่สำเร็จ/.test(j.error || ''), j.error);
    j = await J(await fetch(B + `/api/quick/${qid}`, { headers: C })); ok('quick call still open for others', j.quick.status === 'open' && !j.quick.booking_id, j.quick.status);
    const w1 = await wallet(); ok('hold untouched after failed accept', w1.held === w0.held && w1.available === w0.available, `${w0.held}→${w1.held} (hold ${hold})`);
    j = await J(await fetch(`${B}/api/pt/quick?mb=${mb}&t=${encodeURIComponent(T)}`)); ok('pt still sees open invite', j.calls?.some((c) => c.id === qid));
    r = await fetch(B + `/api/quick/${qid}`, { method: 'POST', headers: C, body: JSON.stringify({ action: 'cancel' }) }); ok('cancel quick', (await J(r)).ok);
    ok('pt told quick closed', (await ptNotices()).some((n) => n.kind === 'quick_closed'));
    if (clashB.id) await fetch(B + `/api/bookings/${clashB.id}/cancel`, { method: 'POST', headers: C, body: JSON.stringify({ reason: 'ทดสอบ' }) });
  } else console.log('SKIP quick accept failure (no free PT now: ' + j.error + ')');
  ok('ledger sum 0 (after quick)', (await ledger()) === 0);

  // ── ลูกค้าไม่มา: PT เช็กอิน → รอ 15 นาที → แจ้ง (รูป) → ลูกค้าโต้แย้ง → แอดมินตัดสิน → PT ได้ 85% ──
  j = await J(await book(far(40))); ok('book #1', j.ok, j.error); const id1 = j.id;
  ok('pt accept #1', (await PT(id1, 'accept')).ok);
  const s1 = await bk(id1); await shift(id1, toMin(s1.starts_at) - 30); // เริ่มในอีก 30 นาที
  ok('pt check-in #1', (await PT(id1, 'checkin', { gps: { lat: 13.7563, lng: 100.5018, accuracy: 15 } })).ok);
  j = await nsGet(id1, true); ok('pt no-show before wait refused', j.ok && !j.can && !!j.at, j.reason);
  ok('customer cannot claim pt no-show after check-in', !(await nsGet(id1, false)).can);
  await shift(id1, 60); // เวลานัดผ่านไป 30 นาที · มาถึงเมื่อ 60 นาทีก่อน
  j = await nsGet(id1, true); ok('pt can report after wait', j.can, j.reason);
  j = await nsPost(id1, true, 'รอหน้าร้าน 20 นาที ทักแชทไม่ตอบ', true); ok('pt reports customer no-show', j.ok, j.error);
  ok('booking frozen (disputed)', (await bk(id1)).status === 'disputed');
  ok('pt report twice refused', (await nsPost(id1, true, 'ซ้ำ', false)).status === 409);
  j = await nsGet(id1, false); ok('customer can send counter evidence', j.can && j.counter, j.reason);
  j = await nsPost(id1, false, 'ติดรถ แจ้งในแชทแล้ว', false); ok('customer counter evidence', j.ok, j.error);
  let c1 = (await claims()).find((c) => c.booking_id === id1);
  ok('claim has both sides + arrival gps', c1 && c1.provider_evidence && c1.customer_evidence && c1.provider_evidence.arrival && c1.provider_evidence.photo, JSON.stringify(c1?.provider_evidence?.arrival));
  r = await fetch(B + '/api/admin/bookings', { method: 'POST', headers: ADM, body: JSON.stringify({ id: id1, action: 'refund', refund_pct: 100, note: 'ไม่ควรได้' }) }); ok('orders resolve refused for no-show claim', r.status === 409);
  const price1 = s1.price_satang;
  const p0 = await ptw();
  r = await decide(c1.id, 'customer_no_show'); j = await J(r); ok('admin decides customer no-show', j.ok, j.error);
  // pending + available (โหมดปล่อยเงินอัตโนมัติอาจย้าย pending → available ทันที)
  const p1 = await ptw(); const got = (p1.pending + p1.available) - (p0.pending + p0.available);
  ok('pt earns 85% of price', got === Math.round(price1 * 85 / 100), `${got} vs ${Math.round(price1 * 85 / 100)}`);
  let b1 = await bk(id1); ok('booking completed with no-show resolution', b1.status === 'completed' && b1.resolution.decided === 'noshow:customer_no_show');
  ok('ledger sum 0 (after no-show decide)', (await ledger()) === 0);
  ok('decide twice refused', (await decide(c1.id, 'provider_no_show')).status === 409);
  ok('pt notified of decision', (await ptNotices()).some((n) => n.kind === 'noshow_decided'));

  // ── ใบกำกับภาษี: นัดที่จบแล้วเท่านั้น + หลักตรวจสอบเลขผู้เสียภาษี ──
  const inv = (id, tax) => fetch(B + `/api/bookings/${id}/invoice`, { method: 'POST', headers: C, body: JSON.stringify({ kind: 'corp', name: 'บจก. ทดสอบ', tax_id: tax, branch: 'สำนักงานใหญ่', address: 'กทม 10110', email: 'tax@test.local' }) });
  ok('invoice bad check digit refused', (await inv(id1, '0105561234567')).status === 400);
  r = await inv(id1, '0105561234560'); ok('invoice ok on completed booking', (await J(r)).ok);

  // ── Part-Time ไม่มา: ลูกค้าแจ้ง → คืน 100% + ใบเตือน +1 ──
  j = await J(await book(far(41))); ok('book #2', j.ok, j.error); const id2 = j.id;
  await PT(id2, 'accept');
  const s2 = await bk(id2); await shift(id2, toMin(s2.starts_at) + 30); // เลยเวลานัด 30 นาที เพื่อนยังไม่เช็กอิน
  j = await nsGet(id2, false); ok('customer can report pt no-show', j.can && !j.counter, j.reason);
  j = await nsPost(id2, false, 'รอ 30 นาทีเพื่อนไม่มา', true); ok('customer reports pt no-show', j.ok, j.error);
  ok('pt told about claim', (await ptNotices()).some((n) => n.kind === 'noshow'));
  const c2 = (await claims()).find((c) => c.booking_id === id2);
  const st0 = (await J(await fetch(B + '/api/admin/strikes', { headers: ADM }))).counts?.[c2.provider_id] ?? 0;
  const w2 = await wallet();
  r = await decide(c2.id, 'provider_no_show'); j = await J(r); ok('admin decides provider no-show', j.ok, j.error);
  const w3 = await wallet(); ok('customer refunded 100%', w3.available - w2.available === s2.total_satang, `${w3.available - w2.available}`);
  ok('booking refunded', (await bk(id2)).status === 'refunded');
  const st1 = (await J(await fetch(B + '/api/admin/strikes', { headers: ADM }))).counts?.[c2.provider_id] ?? 0;
  ok('strike counted', st1 === st0 + 1, `${st0}→${st1}`);
  ok('ledger sum 0 (after refund)', (await ledger()) === 0);

  // ── ข้อพิพาท: ก่อนเวลานัดใช้ยกเลิก · หลังเช็กอิน ยกคำร้อง = กลับเป็นระหว่างนัด · PT ได้แจ้งเตือน ──
  j = await J(await book(far(42))); const id3 = j.id; await PT(id3, 'accept');
  r = await fetch(B + `/api/bookings/${id3}/dispute`, { method: 'POST', headers: C, body: JSON.stringify({ text: 'ก่อนเวลานัด' }) }); ok('dispute before start refused', r.status === 409);
  r = await inv(id3, '0105561234560'); ok('invoice refused for non-completed booking', r.status === 409);
  const s3 = await bk(id3); await shift(id3, toMin(s3.starts_at) - 30);
  ok('pt check-in #3', (await PT(id3, 'checkin')).ok);
  r = await fetch(B + `/api/bookings/${id3}/dispute`, { method: 'POST', headers: C, body: JSON.stringify({ topic: 'อื่นๆ', text: 'ทดสอบข้อพิพาทหลังเช็กอิน' }) }); ok('dispute after check-in', (await J(r)).status === 'disputed');
  ok('pt notified of dispute', (await ptNotices()).some((n) => n.kind === 'booking_disputed'));
  r = await fetch(B + '/api/admin/bookings', { method: 'POST', headers: ADM, body: JSON.stringify({ id: id3, action: 'reject', note: 'ตรวจแล้วนัดดำเนินต่อได้' }) }); ok('admin rejects dispute', (await J(r)).ok);
  ok('back to checked_in (check-in kept)', (await bk(id3)).status === 'checked_in');
  ok('pt notified of resolution', (await ptNotices()).some((n) => n.kind === 'booking_resolved'));

  // ── ตัวกรองแชท: คำเลี่ยงถูกกัน · ประโยคปกติผ่าน ──
  const send = (body) => fetch(B + `/api/bookings/${id3}/messages`, { method: 'POST', headers: C, body: JSON.stringify({ body }) }).then(J);
  for (const s of ['ศูนย์แปดหนึ่ง สองสามสี่ ห้าหกเจ็ดแปด', 'zero eight one two three four five six seven eight', '081 two three four 5678', '08l2345678', 'O8I2345678', 'ลาย ไอดี: nongmay', 'ไลน์ ไอดี nong', 'เข้าเว็บ mysite dot com', 'ทักมาที่ เพจ ดอทคอม']) {
    j = await send(s); ok('chat blocks: ' + s, j.ok && j.message.blocked, JSON.stringify(j.warning || j.error));
  }
  for (const s of ['สวัสดีค่ะ นัดเจอกันสองทุ่มที่ศูนย์การค้าสยามนะคะ', 'มากันสามสี่คน ไม่เกินห้าโมงเย็น', 'เจอกัน 19.00 น. ที่ BTS อโศก ทางออก 3', 'someone said hello to everyone', 'ขอบคุณมากครับ วันนี้สนุกมาก']) {
    j = await send(s); ok('chat allows: ' + s, j.ok && !j.message.blocked, JSON.stringify(j.warning || j.error));
  }
  ok('ledger sum 0 (end)', (await ledger()) === 0);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
