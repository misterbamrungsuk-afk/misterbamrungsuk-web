// (รันก่อนชุดการจอง 05+ เพื่อให้ช่วงเวลาใกล้ ๆ ว่าง) ตำแหน่ง: Part-Time ตั้งย่านเอง (ปัดช่อง ~1 กม.) · ลูกค้าปักหมุดจุดนัด · เพื่อนกดเริ่มเดินทาง → ลูกค้าเห็นตำแหน่ง/ระยะ/เวลาถึง · Part-Time ดูตำแหน่งลูกค้าไม่ได้ (โหมดเดโม)
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
const sess = (e) => { const b = Buffer.from(JSON.stringify({ sub: 'demo:' + e, email: e, exp: Date.now() + 3600e3 })).toString('base64url'); return 'hamoo_session=' + b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const body = Buffer.from(JSON.stringify({ mb, exp: Date.now() + 3600_000 })).toString('base64url');
const T = body + '.' + crypto.createHmac('sha256', KEY).update('resume:' + body).digest('base64url');
const geo = (fill, tok = T) => { const fd = new FormData(); fd.set('mb', mb); if (tok) fd.set('t', tok); fd.set('step', 'geo'); for (const [k, v] of Object.entries(fill)) fd.set(k, v); return fetch(B + '/api/join/profile', { method: 'POST', body: fd }); };
const C = { cookie: sess('trk@test.local'), 'content-type': 'application/json' };
const PTJ = { 'content-type': 'application/json' };
const track = (id, lat, lng) => fetch(B + `/api/pt/bookings/${id}/track`, { method: 'POST', headers: PTJ, body: JSON.stringify({ mb, t: T, lat, lng, accuracy: 15 }) });
const ptAct = (id, extra) => fetch(B + `/api/pt/bookings/${id}`, { method: 'POST', headers: PTJ, body: JSON.stringify({ mb, t: T, ...extra }) });
(async () => {
  // ── ย่านที่ Part-Time ตั้งเอง ──
  let j = await J(await geo({ lat: '13.73162', lng: '100.58531', src: 'gps', accuracy: '30' }));
  ok('PT sets area from GPS (snapped ~1 km)', j.ok && j.geo.lat === 13.735 && j.geo.lng === 100.585, JSON.stringify(j.geo));
  const label = j.geo?.label || '';
  ok('area label = nearest district', /ทองหล่อ|เอกมัย|วัฒนา|คลองเตย/.test(label), label);
  ok('inaccurate GPS refused', !(await J(await geo({ lat: '13.7', lng: '100.5', src: 'gps', accuracy: '5000' }))).ok);
  ok('outside Thailand refused', !(await J(await geo({ lat: '35.6', lng: '139.7', src: 'pin' }))).ok);
  ok('no token refused', (await geo({ lat: '13.7', lng: '100.5' }, null)).status >= 400);
  const t = await (await fetch(B + '/map')).text();
  ok('map shows area label', t.includes('แถว' + label));
  const m = new RegExp('"area":"แถว' + label + '"[^}]*?"lat":([0-9.]+),"lng":([0-9.]+)').exec(t.replace(/\\"/g, '"'));
  ok('public pin near cell centre, not exact GPS', !!m && Math.abs(+m[1] - 13.735) < 0.0035 && +m[1] !== 13.73162, m ? m[1] : 'no match');
  ok('availability page has area card', (await (await fetch(B + `/join/profile/${mb}/availability?t=${encodeURIComponent(T)}`)).text()).includes('ฉันอยู่แถวไหน'));
  // ── นัด + ปักหมุด + ติดตาม ──
  await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'adjust', owner_type: 'customer', owner_id: 'demo:trk@test.local', bucket: 'available', amount_baht: 20000, reason: 'e2e', idem: 'e2e-trk-' + Date.now() }) });
  const pid = (/\/p\/(r[0-9a-f]{10})/.exec(await (await fetch(B + '/')).text()) || [])[1];
  const dest = { lat: 13.7466, lng: 100.5393 };
  const soon = new Date(Date.now() + 65 * 60_000); soon.setMinutes(Math.ceil(soon.getMinutes() / 30) * 30, 0, 0);
  j = await J(await fetch(B + '/api/bookings', { method: 'POST', headers: C, body: JSON.stringify({ pid, hours: 3, starts_at: soon.toISOString(), place: { type: 'cafe', detail: 'คาเฟ่สยาม', ...dest }, note: '' }) }));
  ok('book with meeting pin', j.ok, j.error); const id = j.id;
  const bk = (await J(await fetch(B + `/api/bookings/${id}`, { headers: C }))).booking;
  ok('pin saved in place', bk.place.lat === dest.lat && bk.place.lng === dest.lng);
  ok('no track before accept', (await J(await fetch(B + `/api/bookings/${id}/track`, { headers: C }))).state === 'off');
  ok('PT cannot track before accept', (await track(id, 13.75, 100.55)).status === 409);
  await ptAct(id, { accept: true });
  j = await J(await fetch(B + `/api/bookings/${id}/track`, { headers: C }));
  ok('accepted → waiting for PT to start', j.state === 'waiting' && j.dest?.lat === dest.lat);
  ok('PT list includes meeting pin (navigation)', JSON.stringify(await J(await fetch(B + `/api/pt/bookings?mb=${mb}&t=${encodeURIComponent(T)}`))).includes('"lat":13.7466'));
  j = await J(await track(id, 13.7563, 100.5018));
  ok('PT starts travelling', j.ok && j.track.km > 3 && j.track.km < 6 && j.track.eta[0] >= 5, JSON.stringify(j.track || j));
  j = await J(await fetch(B + `/api/bookings/${id}/track`, { headers: C }));
  ok('customer sees PT position + ETA', j.state === 'moving' && j.track.lat === 13.7563 && j.track.eta[1] > j.track.eta[0], JSON.stringify(j).slice(0, 140));
  const n = await J(await fetch(B + '/api/notifications', { headers: C }));
  ok('customer notified "on the way"', JSON.stringify(n).includes('กำลังเดินทางมาหาคุณ'));
  ok('PT cannot read customer track endpoint', (await fetch(B + `/api/bookings/${id}/track?mb=${mb}&t=${encodeURIComponent(T)}`)).status === 404);
  ok('stranger cannot read track', (await fetch(B + `/api/bookings/${id}/track`, { headers: { cookie: sess('x@test.local') } })).status === 404);
  ok('order page renders', (await fetch(B + `/order/${id}`, { headers: { cookie: C.cookie } })).status === 200);
  // ถึงจุดนัด → หยุดแชร์ + ลบตำแหน่ง
  await ptAct(id, { action: 'checkin', gps: { lat: 13.7468, lng: 100.5395, accuracy: 12 } });
  const ar = await J(await fetch(B + `/api/admin/bookings?arrival=${id}`, { headers: ADM }));
  ok('admin sees arrival GPS + distance to pin', ar.ok && ar.arrival?.gps?.lat === 13.7468 && ar.arrival.dist_m < 60 && ar.pin?.lat === dest.lat, JSON.stringify(ar).slice(0, 160));
  j = await J(await fetch(B + `/api/bookings/${id}/track`, { headers: C }));
  ok('after check-in: arrived, position removed', j.state === 'arrived' && j.track === null, JSON.stringify(j).slice(0, 80));
  ok('PT cannot send after check-in', (await track(id, 13.7466, 100.5393)).status === 409);
  // นัดไกล (> 2 ชม.) เริ่มเดินทางไม่ได้
  const far = new Date(Date.now() + 3 * 86400_000); far.setHours(13, 0, 0, 0);
  j = await J(await fetch(B + '/api/bookings', { method: 'POST', headers: C, body: JSON.stringify({ pid, hours: 3, starts_at: far.toISOString(), place: { type: 'mall', detail: 'ห้าง', ...dest }, note: '' }) }));
  const id2 = j.id;
  await ptAct(id2, { accept: true });
  j = await J(await track(id2, 13.75, 100.55));
  ok('cannot start more than 2 h before', !j.ok && /2 ชม/.test(j.error || ''), j.error);
  ok('PT clears area', (await J(await geo({ clear: '1' }))).geo === null);
  // เก็บกวาด: ปิดนัดทั้งสองให้พ้นสถานะ "ไม่ว่าง" (ชุดถัดไปจองช่วงเวลาเดียวกันได้)
  await ptAct(id, { action: 'done' });
  j = await J(await fetch(B + `/api/bookings/${id}/complete`, { method: 'POST', headers: C, body: JSON.stringify({ rating: 5 }) })); ok('cleanup: complete near booking', j.ok, j.error);
  await fetch(B + `/api/bookings/${id2}/cancel`, { method: 'POST', headers: C, body: JSON.stringify({ reason: 'ทดสอบ' }) });
  j = await J(await fetch(B + '/api/admin/bookings', { method: 'POST', headers: ADM, body: JSON.stringify({ id: id2, action: 'refund', refund_pct: 100, note: 'e2e' }) })); ok('cleanup: refund far booking', j.ok, j.error);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
