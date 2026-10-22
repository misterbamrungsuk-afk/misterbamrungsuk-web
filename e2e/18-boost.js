// โปรโมทโปรไฟล์ Part-Time: จ่ายจากกระเป๋า → ขึ้นอันดับต้น + ป้ายแนะนำ · ยอดไม่พอ = ไม่ตัดเงิน · โอน QR+สลิป (ไม่มี Slip2Go = รอแอดมิน) → แอดมินเปิด · ลงบัญชีคู่สมดุล
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210', mb = 'MBM-2610001';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json();
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const body = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600_000 })).toString('base64url');
const T = body + '.' + crypto.createHmac('sha256', KEY).update('resume:' + body).digest('base64url');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
(async () => {
  ok('boost api needs pt token', (await fetch(B + `/api/pt/boost?mb=${mb}`)).status === 403);
  let g = await J(await fetch(B + `/api/pt/boost?mb=${mb}&t=${encodeURIComponent(T)}`));
  ok('plans listed', g.ok && g.plans.length === 3, JSON.stringify(g).slice(0, 80));
  const avail0 = g.available;
  // ให้มียอดพอ: แอดมินปรับยอด PT +฿1,000 (มีเหตุผล)
  const pt = (await J(await fetch(B + '/api/admin/wallet', { headers: ADM }))).accounts?.find?.((r) => r.owner_type === 'parttime')?.owner_id;
  if (pt) await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'adjust', owner_type: 'parttime', owner_id: pt, bucket: 'available', amount_baht: 2000, reason: 'ทดสอบโปรโมท', id: 'boost-test-' + Date.now() }) });
  g = await J(await fetch(B + `/api/pt/boost?mb=${mb}&t=${encodeURIComponent(T)}`));
  let r = await fetch(B + '/api/pt/boost', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, plan: 'd7', pay: 'wallet' }) });
  let j = await J(r);
  ok('has balance after adjust', g.available >= 150000, String(g.available));
  if (g.available >= 150000) ok('wallet pay 7 days', j.ok && j.status === 'active' && j.until, j.error);
  else ok('wallet not enough refused', r.status === 400 && /ไม่พอ/.test(j.error), j.error);
  r = await fetch(B + '/api/pt/boost', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, plan: 'd1', pay: 'wallet' }) }); j = await J(r);
  const g2 = await J(await fetch(B + `/api/pt/boost?mb=${mb}&t=${encodeURIComponent(T)}`));
  ok('wallet deducted exactly (7d ฿1,500 + 1d ฿300)', g.available - g2.available === 180000, `${g.available} → ${g2.available}`);
  ok('bad plan refused', (await fetch(B + '/api/pt/boost', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, plan: 'zz', pay: 'wallet' }) })).status === 400);
  // โอน QR + สลิป (โหมดสาธิตไม่มี Slip2Go → รอแอดมิน)
  const fd = new FormData(); fd.append('mb', mb); fd.append('t', T); fd.append('plan', 'd3'); fd.append('slip', new Blob([PNG], { type: 'image/png' }), 'slip.png');
  j = await J(await fetch(B + '/api/pt/boost', { method: 'POST', body: fd })); ok('slip pay → pending', j.ok && j.status === 'pending', j.error);
  let t = await (await fetch(B + '/admin/boosts', { headers: ADM })).text(); ok('admin sees pending slip', t.includes(mb) && /สลิปรอตรวจ \((<!-- -->)?1(<!-- -->)?\)/.test(t));
  const id = (/slip=([0-9a-f-]{36})/.exec(t) || [])[1];
  ok('admin slip image', id && (await fetch(B + `/api/admin/boosts?slip=${id}`, { headers: ADM })).status === 200);
  ok('boost admin needs login', (await fetch(B + '/api/admin/boosts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, approve: true }) })).status === 401);
  j = await J(await fetch(B + '/api/admin/boosts', { method: 'POST', headers: ADM, body: JSON.stringify({ id, approve: true }) })); ok('admin approves slip', j.ok && j.status === 'active', j.error);
  j = await J(await fetch(B + '/api/admin/boosts', { method: 'POST', headers: ADM, body: JSON.stringify({ id, approve: true }) })); ok('approve twice refused', !j.ok);
  // หน้าแรก: ป้ายแนะนำ + ขึ้นก่อน
  const h = await (await fetch(B + '/')).text(); ok('home shows แนะนำ badge', h.includes('★ แนะนำ'));
  g = await J(await fetch(B + `/api/pt/boost?mb=${mb}&t=${encodeURIComponent(T)}`)); ok('active until in future', g.until && Date.parse(g.until) > Date.now());
  // บัญชีคู่ยังสมดุล
  const w = await J(await fetch(B + '/api/admin/wallet', { headers: ADM })); ok('ledger balanced', w.sum === 0, String(w.sum));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS', avail0);
})().catch((e) => console.log('ERR', e));
