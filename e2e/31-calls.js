// โทรผ่านแอป (WebRTC ระยะ 1) — ระดับ API: สิทธิ์ (คนนอก/นัดยังไม่ตอบรับ/นอกช่วงเวลา/ยกเลิก/บล็อก) · เปิดสาย → อีกฝั่งเห็นสายเข้า → รับ
// → แลก SDP (ข้อความปลอม) → วางสาย → บันทึกความยาว · ไม่รับ 45 วิ = สายที่ไม่ได้รับ + แจ้งเตือน · ครบ 10 นาทีตัดสาย · สายซ้อนถูกปฏิเสธ
// · ICE: STUN เมื่อไม่ตั้งคีย์ Cloudflare + ต้องเป็นคู่สาย · จำกัดเปิดสาย 6 ครั้ง/นัด/ชม. · หลังบ้านเห็นประวัติ (ไม่มี SDP)
// โหมดสาธิตเท่านั้น — demo_shift (/api/admin/bookings) เลื่อนเวลานัด · demo_age (/api/calls/[id]) ย้อนเวลาสาย
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210', mb = 'MBM-2610001';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
const HAS_TURN = /^CLOUDFLARE_TURN_KEY_ID=.+$/m.test(ENV) && /^CLOUDFLARE_TURN_KEY_API_TOKEN=.+$/m.test(ENV);
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json();
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const cust = (email) => ({ cookie: 'hamoo_session=' + sign({ sub: 'demo:' + email, email, exp: Date.now() + 3600e3 }), 'content-type': 'application/json' });
const C = cust('calls@test.local'), X = cust('calls-stranger@test.local');
// โทเคน Part-Time ต้องมี iat (ตรวจกับ "ออกจากระบบทุกเครื่อง")
const T = (() => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600e3 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); })();
const PTQ = `as=pt&mb=${mb}&t=${encodeURIComponent(T)}`;
const PTB = { as: 'pt', mb, t: T };
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');

const res = async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) });
const PTact = (id, action, extra = {}) => fetch(B + `/api/pt/bookings/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, action, ...extra }) }).then(J);
const bk = (id) => fetch(B + `/api/bookings/${id}`, { headers: C }).then(J).then((d) => d.booking);
const shift = (id, minutes) => fetch(B + '/api/admin/bookings', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'demo_shift', id, minutes }) }).then(J);
const toMin = (iso) => Math.round((Date.parse(iso) - Date.now()) / 60000);
const far = (d) => { const x = new Date(Date.now() + d * 86400e3); x.setMinutes(13, 0, 0); return x.toISOString(); };
// เรียกในนามลูกค้า (h = headers) หรือ Part-Time (h = 'pt')
const start = (booking_id, h) => fetch(B + '/api/calls', { method: 'POST', headers: h === 'pt' ? { 'content-type': 'application/json' } : h, body: JSON.stringify({ booking_id, ...(h === 'pt' ? PTB : { as: 'customer' }) }) }).then(res);
const can = (booking_id, h) => fetch(B + `/api/calls?booking_id=${booking_id}&${h === 'pt' ? PTQ : 'as=customer'}`, { headers: h === 'pt' ? {} : h }).then(res);
const act = (id, h, action, extra = {}) => fetch(B + `/api/calls/${id}`, { method: 'POST', headers: h === 'pt' ? { 'content-type': 'application/json' } : h, body: JSON.stringify({ action, ...extra, ...(h === 'pt' ? PTB : { as: 'customer' }) }) }).then(res);
const get = (id, h) => fetch(B + `/api/calls/${id}?${h === 'pt' ? PTQ : 'as=customer'}`, { headers: h === 'pt' ? {} : h || {} }).then(res);
const ice = (id, h) => fetch(B + `/api/calls/${id}/ice?${h === 'pt' ? PTQ : h ? 'as=customer' : ''}`, { headers: h === 'pt' || !h ? {} : h }).then(res);
const incoming = (h) => fetch(B + `/api/calls/incoming?${h === 'pt' ? PTQ : 'as=customer'}`, { headers: h === 'pt' ? {} : h }).then(J).then((d) => d.calls || []);
const ptNotices = () => fetch(B + `/api/pt/notifications?mb=${mb}&t=${encodeURIComponent(T)}`).then(J).then((d) => d.notices || []);
const custNotices = () => fetch(B + '/api/notifications', { headers: C }).then(J).then((d) => d.notices || []);
const age = (id, h, seconds) => act(id, h, 'demo_age', { seconds });
let pid;

(async () => {
  pid = (/\/p\/(r[0-9a-f]{10})/.exec(await (await fetch(B + '/')).text()) || [])[1];
  ok('found a live PT', !!pid);
  // เติมเงินลูกค้า
  const fd = new FormData(); fd.set('amount', '30000'); fd.set('slip', new File([img], 'call.jpg', { type: 'image/jpeg' }));
  await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { cookie: C.cookie }, body: fd });
  const w = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  const tp = w.topups.find((x) => x.customer_email === 'calls@test.local' && x.status === 'pending');
  if (tp) await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'approve', id: tp.id }) });

  const book = (d) => fetch(B + '/api/bookings', { method: 'POST', headers: C, body: JSON.stringify({ pid, hours: 3, starts_at: far(d), place: { type: 'cafe', detail: 'คาเฟ่ทดสอบโทร' }, note: '' }) }).then(J);
  let j = await book(43); ok('book', j.ok, j.error); const id = j.id;

  // ── นัดยังไม่ตอบรับ (ยังไม่ได้จ่ายเข้า escrow) = โทรไม่ได้ ──
  let r = await start(id, C); ok('requested booking refused', r.status === 409 && r.code === 'status', r.error);
  // ── คนนอก ──
  r = await start(id, X); ok('stranger refused', r.status === 403, r.error);
  r = await start(id, { 'content-type': 'application/json' }); ok('anonymous refused', r.status === 403);

  ok('pt accept', (await PTact(id, 'accept')).ok);
  // ── นอกช่วงเวลา (เกิน 2 ชม. ก่อนนัด) ──
  r = await start(id, C); ok('too early refused', r.status === 409 && r.code === 'early', r.error);
  r = await can(id, 'pt'); ok('pt sees reason (early)', r.ok && !r.can && /2 ชม/.test(r.reason || ''), r.reason);

  const s0 = await bk(id); await shift(id, toMin(s0.starts_at) - 30); // เริ่มในอีก 30 นาที
  r = await can(id, C); ok('customer can call in window', r.ok && r.can, r.reason);
  r = await can(id, 'pt'); ok('pt can call in window', r.ok && r.can, r.reason);

  // ── เปิดสาย: ลูกค้า → Part-Time ──
  r = await start(id, C); ok('customer starts call', r.ok && r.call?.status === 'ringing' && r.call.me === 'caller', r.error);
  const c1 = r.call?.id;
  r = await start(id, 'pt'); ok('second simultaneous call refused (pt)', r.status === 409 && r.code === 'busy', r.error);
  r = await start(id, C); ok('second simultaneous call refused (customer)', r.status === 409 && r.code === 'busy', r.error);

  // ── ICE ──
  r = await ice(c1, null); ok('ice requires auth', r.status === 404);
  r = await ice(c1, X); ok('ice refused for stranger', r.status === 404);
  r = await ice(c1, C);
  const urls = (r.iceServers || []).flatMap((s) => [].concat(s.urls));
  ok('ice returns google stun', r.ok && urls.some((u) => /^stun:stun\.l\.google\.com/.test(u)), JSON.stringify(urls));
  if (!HAS_TURN) ok('no TURN without env', r.turn === false && !urls.some((u) => /^turns?:/.test(u)));
  ok('ice never leaks api token', !JSON.stringify(r).includes('Bearer'));
  r = await ice(c1, 'pt'); ok('ice for pt participant', r.ok);

  // ── สายเข้า ──
  let inc = await incoming('pt'); ok('pt sees incoming', inc.some((c) => c.id === c1), JSON.stringify(inc));
  ok('incoming has caller name + code', inc.find((c) => c.id === c1)?.code?.length > 0);
  inc = await incoming(C); ok('caller has no incoming', !inc.some((c) => c.id === c1));
  inc = await incoming(X); ok('stranger has no incoming', !inc.length);
  r = await get(c1, X); ok('stranger cannot read call', r.status === 404);

  // ── แลก SDP ครั้งเดียวต่อฝั่ง ──
  r = await get(c1, 'pt'); ok('callee sees no offer yet', r.ok && r.call.offer === null && r.call.me === 'callee');
  r = await act(c1, 'pt', 'signal', { kind: 'offer', sdp: 'v=0 fake' }); ok('callee cannot send offer', r.status === 403);
  r = await act(c1, C, 'signal', { kind: 'offer', sdp: 'v=0 fake-offer' }); ok('caller sends offer', r.ok, r.error);
  r = await act(c1, C, 'signal', { kind: 'offer', sdp: 'v=0 again' }); ok('offer only once', r.status === 409);
  r = await act(c1, C, 'signal', { kind: 'offer', sdp: 'x'.repeat(30000) }); ok('oversized sdp rejected', r.status === 400 || r.status === 409);
  r = await get(c1, 'pt'); ok('callee reads offer', r.call?.offer === 'v=0 fake-offer');
  r = await act(c1, 'pt', 'signal', { kind: 'answer', sdp: 'v=0 early' }); ok('answer before accept refused', r.status === 409);
  r = await act(c1, C, 'accept'); ok('caller cannot accept own call', r.status === 403);
  r = await act(c1, 'pt', 'accept'); ok('pt accepts', r.ok && r.call.status === 'active' && !!r.call.max_ends_at, r.error);
  r = await act(c1, 'pt', 'signal', { kind: 'answer', sdp: 'v=0 fake-answer' }); ok('callee sends answer', r.ok, r.error);
  r = await get(c1, C); ok('caller reads answer', r.call?.answer === 'v=0 fake-answer' && r.call.offer === null && r.call.status === 'active');
  inc = await incoming('pt'); ok('accepted call no longer incoming', !inc.some((c) => c.id === c1));

  // ── วางสาย → บันทึกความยาว ──
  await age(c1, C, 75); // คุยไป 75 วิ
  r = await act(c1, 'pt', 'hangup'); ok('hangup', r.ok && r.call.status === 'ended' && r.call.end_reason === 'callee', r.error);
  ok('duration recorded', r.call?.duration_s >= 74 && r.call.duration_s <= 80, String(r.call?.duration_s));
  r = await get(c1, C); ok('sdp cleared after end', r.call?.answer === null && r.call?.status === 'ended');
  r = await ice(c1, C); ok('ice refused after end', r.status === 409);
  r = await act(c1, C, 'hangup'); ok('hangup twice is harmless', r.ok && r.call.status === 'ended');

  // ── ไม่รับสาย 45 วิ = สายที่ไม่ได้รับ (Part-Time โทร → ลูกค้าได้แจ้งเตือน) ──
  r = await start(id, 'pt'); ok('pt starts call', r.ok && r.call?.status === 'ringing', r.error); const c2 = r.call?.id;
  inc = await incoming(C); ok('customer sees incoming', inc.some((c) => c.id === c2));
  await age(c2, 'pt', 50);
  r = await get(c2, C); ok('ring timeout → missed', r.call?.status === 'missed' && r.call.end_reason === 'timeout', r.call?.status);
  ok('missed call has no duration', r.call?.duration_s === null);
  ok('customer notified of missed call', (await custNotices()).some((n) => n.kind === 'call_missed'));
  inc = await incoming(C); ok('missed call gone from incoming', !inc.some((c) => c.id === c2));
  r = await act(c2, C, 'accept'); ok('cannot accept missed call', r.status === 409);

  // ── ปฏิเสธสาย ──
  r = await start(id, C); const c3 = r.call?.id; ok('start #3', r.ok, r.error);
  r = await act(c3, 'pt', 'decline'); ok('pt declines', r.ok && r.call.status === 'declined');

  // ── ครบ 10 นาที = ตัดสาย ──
  r = await start(id, C); const c4 = r.call?.id; ok('start #4', r.ok, r.error);
  await act(c4, C, 'signal', { kind: 'offer', sdp: 'v=0 o' });
  await act(c4, 'pt', 'accept', { sdp: 'v=0 a' });
  await age(c4, C, 601);
  r = await get(c4, 'pt'); ok('max duration auto-ends', r.call?.status === 'ended' && r.call.end_reason === 'max' && r.call.duration_s === 600, `${r.call?.status} ${r.call?.end_reason} ${r.call?.duration_s}`);

  // ── ผู้โทรยกเลิกก่อนรับ = สายที่ไม่ได้รับ (แจ้ง Part-Time) ──
  r = await start(id, C); const c5 = r.call?.id; ok('start #5', r.ok, r.error);
  r = await act(c5, C, 'hangup'); ok('caller cancel while ringing → missed', r.call?.status === 'missed' && r.call.end_reason === 'cancelled');
  ok('pt notified of missed call', (await ptNotices()).some((n) => n.kind === 'call_missed'));

  // ── บล็อก ──
  await fetch(B + '/api/me', { method: 'POST', headers: C, body: JSON.stringify({ block: pid, on: true }) });
  r = await start(id, C); ok('blocked: customer cannot call', r.status === 409 && r.code === 'blocked', r.error);
  r = await start(id, 'pt'); ok('blocked: pt cannot call', r.status === 409 && r.code === 'blocked', r.error);
  await fetch(B + '/api/me', { method: 'POST', headers: C, body: JSON.stringify({ block: pid, on: false }) });

  // ── จำกัดความถี่: 6 สาย/นัด/ชม. ──
  r = await start(id, C); ok('start #6', r.ok, r.error);
  await act(r.call?.id, C, 'hangup');
  r = await start(id, C); ok('7th call in an hour rate-limited', r.status === 429 && r.code === 'rate', JSON.stringify(r).slice(0,200));

  // ── หลังบ้าน ──
  r = await fetch(B + `/api/calls/admin?booking_id=${id}`).then(res); ok('admin log requires admin', r.status === 401);
  r = await fetch(B + `/api/calls/admin?booking_id=${id}`, { headers: ADM }).then(res);
  ok('admin sees call log', r.ok && r.calls?.length >= 6, String(r.calls?.length));
  const row = r.calls?.find((c) => c.id === c1);
  ok('admin log has duration + result', row?.status === 'ended' && row.duration_s >= 74 && row.caller_type === 'customer');
  ok('admin log has no sdp', !r.calls?.some((c) => 'offer' in c || 'answer' in c));

  // ── เลยเวลานัด ──
  await shift(id, 30 + 180 + 10); // เวลานัดผ่านไป 3 ชม. 10 นาที (นัด 3 ชม.)
  r = await start(id, 'pt'); ok('after booking end refused', r.status === 409 && (r.code === 'late' || r.code === 'status'), r.code + ' ' + r.error);

  // ── นัดที่ยกเลิก ──
  j = await book(44); const id2 = j.id; ok('book #2', j.ok, j.error);
  await fetch(B + `/api/bookings/${id2}/cancel`, { method: 'POST', headers: C, body: JSON.stringify({ reason: 'ทดสอบโทร' }) });
  r = await start(id2, C); ok('cancelled booking refused', r.status === 409 && r.code === 'status', r.error);

  console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
