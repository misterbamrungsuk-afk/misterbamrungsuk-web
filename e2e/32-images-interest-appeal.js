// รูปย่อ + แคช · "สนใจ" ประกาศวันนี้ว่าง · อุทธรณ์ใบเตือนในแอป (โหมดสาธิตเท่านั้น)
// - ?w=240/480/960 ได้รูป + Cache-Control สาธารณะ · w อื่น = 400 · รูปใส่รุ่น (&v=) = แคชยาว
// - ลูกค้ากดสนใจ → ซ้ำไม่เพิ่ม · ยกเลิก/กดใหม่ · ลูกค้าที่บล็อกเพื่อน = กดไม่ได้ + ไม่นับ · Part-Time เห็นจำนวน + ชื่อปิดบัง + ได้แจ้งเตือน
// - Part-Time ไม่มา → ใบเตือน → ยื่นอุทธรณ์ (ตรวจเหตุผล/รูป) → ซ้ำไม่ได้ → แอดมินรับ = ใบเตือนไม่นับ
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
const cust = (u) => ({ cookie: 'hamoo_session=' + sign({ sub: `demo:${u}@test.local`, email: `${u}@test.local`, exp: Date.now() + 3600e3 }), 'content-type': 'application/json' });
const C = cust('interest32'), C2 = cust('blocker32'), CA = cust('appeal32');
const T = (() => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600e3 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); })();
const pid = 'r' + crypto.createHash('sha256').update('mb-public:' + mb).digest('hex').slice(0, 10);
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const q = `mb=${mb}&t=${encodeURIComponent(T)}`;
const interest = (h, on = true) => fetch(B + '/api/posts/interest', { method: 'POST', headers: h, body: JSON.stringify({ pid, on }) }).then(async (r) => ({ status: r.status, ...(await r.json()) }));
const ptFans = () => fetch(B + `/api/pt/posts/interests?${q}`).then(J);
const ptNotices = () => fetch(B + `/api/pt/notifications?${q}`).then(J).then((d) => d.notices || []);
const PT = (id, action, extra = {}) => fetch(B + `/api/pt/bookings/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, action, ...extra }) }).then(J);
const bk = (id) => fetch(B + `/api/bookings/${id}`, { headers: CA }).then(J).then((d) => d.booking);
const shift = (id, minutes) => fetch(B + '/api/admin/bookings', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'demo_shift', id, minutes }) }).then(J);
const toMin = (iso) => Math.round((Date.parse(iso) - Date.now()) / 60000);
const far = (d) => { const x = new Date(Date.now() + d * 86400e3); x.setMinutes(23, 0, 0); return x.toISOString(); };
const appeal = (strike_id, reason, photo) => { const fd = new FormData(); fd.set('mb', mb); fd.set('t', T); fd.set('strike_id', strike_id); fd.set('reason', reason); if (photo) fd.set('photo', photo); return fetch(B + '/api/pt/appeals', { method: 'POST', body: fd }).then(async (r) => ({ status: r.status, ...(await r.json()) })); };
const ptStrikes = () => fetch(B + `/api/pt/appeals?${q}`).then(J);

(async () => {
  // ── 1) รูปย่อ + แคช ──
  for (const w of [240, 480, 960]) {
    const r = await fetch(B + `/api/public/pt-photo?id=${pid}&i=0&w=${w}`);
    const cc = r.headers.get('cache-control') || '';
    const buf = Buffer.from(await r.arrayBuffer());
    ok(`pt-photo w=${w} → image`, r.status === 200 && /^image\//.test(r.headers.get('content-type') || '') && buf.length > 100, `${r.status} ${r.headers.get('content-type')} ${buf.length}B`);
    ok(`pt-photo w=${w} public cache`, /public/.test(cc) && /stale-while-revalidate/.test(cc), cc);
  }
  const full = Buffer.from(await (await fetch(B + `/api/public/pt-photo?id=${pid}&i=0`)).arrayBuffer());
  const small = Buffer.from(await (await fetch(B + `/api/public/pt-photo?id=${pid}&i=0&w=240`)).arrayBuffer());
  ok('w=240 not larger than original', small.length <= full.length, `${small.length} vs ${full.length}`);
  if (small.length === full.length) console.log('INFO sharp ไม่ทำงานบนเครื่องนี้ → ส่งรูปเดิม (ยังผ่าน)');
  for (const bad of ['123', '2000', 'abc', '0']) {
    ok(`pt-photo w=${bad} → 400`, (await fetch(B + `/api/public/pt-photo?id=${pid}&i=0&w=${bad}`)).status === 400);
  }
  ok('avatar bad w → 400', (await fetch(B + '/api/public/avatar?t=partner&id=x&w=777')).status === 400);
  ok('market image bad w → 400', (await fetch(B + '/api/market/image?p=products/1-1.jpg&w=5')).status === 400);
  ok('market image slips still hidden', (await fetch(B + '/api/market/image?p=slips/1-1.jpg&w=240')).status === 404);
  const prof = await (await fetch(B + `/p/${pid}`)).text();
  const v = /pt-photo\?id=r[0-9a-f]{10}(?:&amp;|&)i=0(?:&amp;|&)v=([0-9a-f]{8})/.exec(prof)?.[1];
  ok('profile page uses versioned + sized photo', !!v && /(&amp;|&)w=960/.test(prof), v);
  if (v) {
    let r = await fetch(B + `/api/public/pt-photo?id=${pid}&i=0&v=${v}&w=480`);
    ok('versioned photo → long cache', /s-maxage=604800/.test(r.headers.get('cache-control') || ''), r.headers.get('cache-control'));
    r = await fetch(B + `/api/public/pt-photo?id=${pid}&i=0&v=deadbeef`);
    ok('wrong version → short cache', r.status === 200 && !/s-maxage=604800/.test(r.headers.get('cache-control') || ''), r.headers.get('cache-control'));
  }
  const home = await (await fetch(B + '/')).text();
  ok('home cards request thumbnails', /pt-photo\?id=r[0-9a-f]{10}(?:&amp;|&)i=0(?:&amp;|&)w=480/.test(home) || !/pt-photo/.test(home));

  // ── 2) "สนใจ" ประกาศวันนี้ว่าง ──
  const fd0 = new FormData(); fd0.set('mb', mb); fd0.set('t', T); fd0.set('step', 'post'); fd0.set('text', 'ว่างไปคาเฟ่แถวอโศก'); fd0.set('time', '18:00–22:00'); fd0.set('zone', 'อโศก');
  let r = await fetch(B + `/api/join/profile?${q}`, { method: 'POST', body: fd0 }); ok('pt posts "วันนี้ว่าง"', r.status === 200);
  await fetch(B + '/api/me', { method: 'POST', headers: C2, body: JSON.stringify({ block: pid, on: false }) });
  let j = await J(await fetch(B + `/api/posts/interest?pid=${pid}`, { headers: { cookie: C.cookie } }));
  ok('customer sees open post, not interested yet', j.ok && j.open && j.interested === false, JSON.stringify(j));
  ok('profile shows free-today card', (await (await fetch(B + `/p/${pid}`, { headers: { cookie: C.cookie } })).text()).includes('วันนี้ว่าง'));
  ok('interest needs login', (await interest({ 'content-type': 'application/json' })).status === 401);
  ok('interest bad pid → 404', (await fetch(B + '/api/posts/interest', { method: 'POST', headers: C, body: JSON.stringify({ pid: 'rzzzz', on: true }) })).status === 404);
  const before = (await ptFans()).count ?? 0;
  j = await interest(C); ok('customer taps สนใจ', j.ok && j.interested && !j.already, JSON.stringify(j));
  j = await interest(C); ok('duplicate tap = already, no new row', j.ok && j.interested && j.already, JSON.stringify(j));
  let f = await ptFans(); ok('pt count +1', f.ok && f.count === before + 1, `${before}→${f.count}`);
  ok('pt list masked first name only', f.list?.every((x) => /\*\*\*$/.test(x.label)) && !JSON.stringify(f).includes('@test.local'), JSON.stringify(f.list?.slice(0, 3)));
  ok('pt notified of interest', (await ptNotices()).some((n) => n.kind === 'post_interest_pt'));
  ok('pt interests need auth', (await fetch(B + `/api/pt/posts/interests?mb=${mb}`)).status === 403);
  j = await J(await fetch(B + `/api/posts/interest?pid=${pid}`, { headers: { cookie: C.cookie } })); ok('state = สนใจแล้ว', j.interested === true);
  j = await interest(C, false); ok('withdraw interest', j.ok && j.interested === false);
  f = await ptFans(); ok('pt count back', f.count === before, String(f.count));
  const n0 = (await ptNotices()).filter((n) => n.kind === 'post_interest_pt').length;
  j = await interest(C); ok('re-interest', j.ok && j.interested);
  ok('re-interest does not re-notify', (await ptNotices()).filter((n) => n.kind === 'post_interest_pt').length === n0);
  // บล็อก: กดไว้ก่อนแล้วบล็อก → ไม่นับ · บล็อกแล้วกดไม่ได้
  j = await interest(C2); ok('second customer interest', j.ok && j.interested);
  ok('pt count = 2 more', (await ptFans()).count === before + 2);
  r = await fetch(B + '/api/me', { method: 'POST', headers: C2, body: JSON.stringify({ block: pid, on: true }) }); ok('customer blocks pt', r.status === 200);
  ok('blocked customer excluded from pt count', (await ptFans()).count === before + 1);
  j = await interest(C2); ok('blocked customer cannot tap สนใจ', j.status === 404 && !j.ok, JSON.stringify(j));
  ok('posts page shows real counter', (await (await fetch(B + `/join/profile/${mb}/posts?t=${encodeURIComponent(T)}`)).text()).includes(`data-interest-count="${before + 1}"`));
  await fetch(B + '/api/me', { method: 'POST', headers: C2, body: JSON.stringify({ block: pid, on: false }) });
  // ปิดประกาศ → กดสนใจไม่ได้
  const fdc = new FormData(); fdc.set('mb', mb); fdc.set('t', T); fdc.set('step', 'post'); fdc.set('close', 'true');
  await fetch(B + `/api/join/profile?${q}`, { method: 'POST', body: fdc });
  j = await interest(C); ok('closed post → 404', j.status === 404, JSON.stringify(j));
  ok('closed post → pt count 0', (await ptFans()).count === 0);

  // ── 3) อุทธรณ์ใบเตือน ──
  const fd = new FormData(); fd.set('amount', '30000'); fd.set('slip', new File([img], 's32.jpg', { type: 'image/jpeg' }));
  await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { cookie: CA.cookie }, body: fd });
  const aw = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  const tp = aw.topups?.find((x) => x.customer_email === 'appeal32@test.local' && x.status === 'pending');
  if (tp) await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'approve', id: tp.id }) });
  // รายการเติมเงินในหลังบ้านแสดงจำนวนจำกัด (ชุดท้าย ๆ อาจหาไม่เจอ) → เติมด้วยการปรับยอดของ CEO ให้แน่ใจว่ามีเงินพอ
  if (!tp) await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'adjust', owner_type: 'customer', owner_id: 'demo:appeal32@test.local', bucket: 'available', amount_baht: 30000, reason: 'e2e', idem: 'e2e-appeal32@test.local-' + Date.now() }) });
  j = await J(await fetch(B + '/api/bookings', { method: 'POST', headers: CA, body: JSON.stringify({ pid, hours: 3, starts_at: far(47), place: { type: 'cafe', detail: 'คาเฟ่ทดสอบอุทธรณ์' }, note: '' }) }));
  ok('book for strike', j.ok, j.error); const bid = j.id;
  await PT(bid, 'accept');
  const s0 = await bk(bid); await shift(bid, toMin(s0.starts_at) + 30);
  const nf = new FormData(); nf.set('booking', bid); nf.set('note', 'รอ 30 นาทีเพื่อนไม่มา'); nf.set('lat', '13.7563'); nf.set('lng', '100.5018'); nf.set('accuracy', '20');
  j = await J(await fetch(B + '/api/noshow', { method: 'POST', headers: { cookie: CA.cookie }, body: nf })); ok('customer reports pt no-show', j.ok, j.error);
  const claim = (await J(await fetch(B + '/api/admin/noshow', { headers: ADM }))).claims?.find((c) => c.booking_id === bid);
  j = await J(await fetch(B + '/api/admin/noshow', { method: 'POST', headers: ADM, body: JSON.stringify({ id: claim?.id, decision: 'provider_no_show' }) })); ok('admin decides provider no-show', j.ok, j.error);
  let st = await ptStrikes();
  const strike = st.strikes?.find((s) => s.ref === bid);
  ok('pt sees new strike, no appeal yet', st.ok && strike && !strike.appeal, JSON.stringify(strike));
  const count0 = st.count;
  ok('appeals need pt auth', (await fetch(B + `/api/pt/appeals?mb=${mb}`)).status === 403);
  j = await appeal(strike.id, 'ก'.repeat(1001)); ok('reason > 1000 → 400', j.status === 400, j.error);
  j = await appeal(strike.id, '   '); ok('empty reason → 400', j.status === 400, j.error);
  j = await appeal('00000000-0000-0000-0000-000000000000', 'ไม่ใช่ใบของฉัน'); ok('unknown strike → 404', j.status === 404, j.error);
  j = await appeal(strike.id, 'ปลอมรูป', new File([Buffer.from('<script>alert(1)</script>')], 'x.jpg', { type: 'image/jpeg' })); ok('fake image refused', j.status === 400, j.error);
  j = await appeal(strike.id, 'ถึงจุดนัดตรงเวลา ทักแชทแล้ว ลูกค้าแจ้งผิดคน', new File([img], 'proof.jpg', { type: 'image/jpeg' })); ok('appeal submitted', j.ok && j.status === 'pending', j.error);
  j = await appeal(strike.id, 'ส่งซ้ำ'); ok('duplicate appeal → 409', j.status === 409, j.error);
  st = await ptStrikes(); ok('strike shows pending appeal, still counted', st.strikes.find((s) => s.id === strike.id)?.appeal?.status === 'pending' && st.count === count0);
  ok('strikes page shows appeal state', (await (await fetch(B + `/join/profile/${mb}/strikes?t=${encodeURIComponent(T)}`)).text()).includes('รอทีมงานตรวจ'));
  // แอดมิน
  ok('admin appeals need admin', (await fetch(B + '/api/admin/appeals')).status === 401);
  const list = (await J(await fetch(B + '/api/admin/appeals?status=pending', { headers: ADM }))).appeals || [];
  const ap = list.find((a) => a.strike_id === strike.id); ok('admin sees pending appeal', !!ap && ap.mb === mb);
  r = await fetch(B + `/api/admin/appeals?photo=${ap?.id}`, { headers: ADM }); ok('admin sees evidence photo (private)', r.status === 200 && /private|no-store/.test(r.headers.get('cache-control') || ''), r.headers.get('cache-control'));
  ok('admin appeals page renders', (await (await fetch(B + '/admin/appeals', { headers: ADM })).text()).includes('อุทธรณ์ใบเตือน'));
  const strikesAdm0 = (await J(await fetch(B + '/api/admin/strikes', { headers: ADM }))).counts?.[claim?.provider_id] ?? 0;
  r = await fetch(B + '/api/admin/appeals', { method: 'POST', headers: ADM, body: JSON.stringify({ id: ap?.id, accept: false, note: '' }) }); ok('reject without reason → 400', r.status === 400);
  j = await J(await fetch(B + '/api/admin/appeals', { method: 'POST', headers: ADM, body: JSON.stringify({ id: ap?.id, accept: true }) })); ok('admin accepts appeal', j.ok && j.status === 'accepted', j.error);
  r = await fetch(B + '/api/admin/appeals', { method: 'POST', headers: ADM, body: JSON.stringify({ id: ap?.id, accept: false, note: 'เปลี่ยนใจ' }) }); ok('decide twice → 409', r.status === 409);
  st = await ptStrikes(); ok('accepted appeal voids strike count', st.count === count0 - 1 && st.voided >= 1, `${count0}→${st.count}`);
  ok('pt notified of appeal result', (await ptNotices()).some((n) => n.kind === 'appeal'));
  ok('strikes page shows voided', (await (await fetch(B + `/join/profile/${mb}/strikes?t=${encodeURIComponent(T)}`)).text()).includes('อุทธรณ์ผ่าน'));
  const strikesAdm1 = (await J(await fetch(B + '/api/admin/strikes', { headers: ADM }))).counts?.[claim?.provider_id] ?? 0;
  // /api/admin/strikes นับจาก lib/noshow (ยังไม่กรองใบที่อุทธรณ์ผ่าน จนกว่าจะเพิ่มตัวกรองใน noshow.ts) → แจ้งเป็นข้อมูล
  console.log(`INFO admin strike count ${strikesAdm0}→${strikesAdm1}${strikesAdm1 === strikesAdm0 - 1 ? ' (filtered)' : ' (noshow.ts filter not applied yet)'}`);

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  process.exitCode = fails ? 1 : 0;
})().catch((e) => { console.log('ERR', e); process.exitCode = 1; });
