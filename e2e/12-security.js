// ผลตรวจความปลอดภัย 16 ต.ค.: route เดโมถูกลบ · SOS จริง · แจ้งเตือนแอดมิน · ปิดถอนซ้ำ · แอดมินกำหนดยอดเติม · push host · ภาพรวมจริง
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
const C1 = { cookie: 'hamoo_session=' + sign({ sub: 'demo:sec@test.local', email: 'sec@test.local', exp: Date.now() + 3600e3 }), 'content-type': 'application/json' };
const T = (() => { const b = Buffer.from(JSON.stringify({ mb, exp: Date.now() + 3600e3 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); })();
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
(async () => {
  // route เดโมเดิมถูกลบ
  for (const p of ['/api/notify/booking', '/api/noshow', '/api/interest', '/api/report', '/api/review', '/api/kyc', '/api/escrow/x', '/api/chat/x/messages', '/api/jobs/x/arrive', '/api/provider/strikes']) {
    const r = await fetch(B + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    ok('removed ' + p, r.status === 404 || r.status === 405, String(r.status));
  }
  // cron: ไม่มี secret = 401
  ok('cron no auth', (await fetch(B + '/api/cron/money')).status === 401);
  ok('cron "Bearer undefined"', (await fetch(B + '/api/cron/money', { headers: { authorization: 'Bearer undefined' } })).status === 401);
  // push: endpoint ต้องเป็นบริการ push จริง
  const keys = { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' };
  let r = await fetch(B + '/api/push', { method: 'POST', headers: C1, body: JSON.stringify({ sub: { endpoint: 'https://evil.example.com/x', keys } }) }); ok('push foreign host refused', r.status === 400);
  r = await fetch(B + '/api/push', { method: 'POST', headers: ADM, body: JSON.stringify({ admin: true, sub: { endpoint: 'https://fcm.googleapis.com/fcm/send/admin-' + Date.now(), keys } }) }); ok('admin push subscribe', (await J(r)).ok);
  // SOS จริง → แจ้งเตือนแอดมิน
  r = await fetch(B + '/api/sos', { method: 'POST', headers: C1, body: JSON.stringify({ lat: 13.7563, lng: 100.5018 }) }); let j = await J(r);
  ok('sos ok + hotline', j.ok && j.hotline?.police === '191');
  j = await J(await fetch(B + '/api/admin/alerts', { headers: ADM }));
  const sos = j.items?.find((n) => n.kind === 'sos' && /sec@test.local/.test(n.title));
  ok('sos reaches admin alerts', !!sos && /maps\.google\.com/.test(sos.body), sos?.title);
  ok('alerts need admin', (await fetch(B + '/api/admin/alerts')).status === 401);
  r = await fetch(B + '/api/admin/alerts', { method: 'POST', headers: ADM, body: JSON.stringify({ id: sos.id }) }); ok('ack alert', (await J(r)).ok);
  j = await J(await fetch(B + '/api/admin/alerts', { headers: ADM })); ok('alert marked read', !!j.items.find((n) => n.id === sos.id).read_at);
  // หน้าแอดมิน: ข้อมูลจริง ไม่มีตัวเลขตัวอย่าง
  let t = await (await fetch(B + '/admin', { headers: ADM })).text();
  ok('admin home real', t.includes('ความพร้อมระบบ') && t.includes('งานที่ต้องทำ') && !t.includes('ตัวเลขตัวอย่าง'));
  t = await (await fetch(B + '/admin/audit', { headers: ADM })).text(); ok('alerts page', t.includes('SOS · แจ้งเตือนระบบ'));
  for (const p of ['/admin/reports', '/admin/cs', '/admin/promos', '/admin/members']) { r = await fetch(B + p, { headers: ADM, redirect: 'manual' }); ok('mock page redirected ' + p, r.status >= 300 && r.status < 400 || r.status === 200 && !(await r.text()).includes('ตัวอย่าง')); }
  // เติมเงิน: แอดมินกำหนดยอดที่เข้ากระเป๋าได้ · อนุมัติซ้ำไม่ได้
  const fd = new FormData(); fd.set('amount', '1500'); fd.set('slip', new File([img], 's.jpg', { type: 'image/jpeg' }));
  j = await J(await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { cookie: C1.cookie }, body: fd })); ok('topup pending (no Slip2Go)', j.ok && j.status === 'pending');
  let a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  const tp = a.topups.find((x) => x.customer_email === 'sec@test.local' && x.status === 'pending');
  r = await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'approve', id: tp.id, amount_baht: 1200 }) }); j = await J(r);
  ok('approve with corrected amount', j.ok && j.row.amount_satang === 120000);
  let w = await J(await fetch(B + '/api/wallet', { headers: C1 })); ok('wallet got corrected amount', w.available === 120000, String(w.available));
  r = await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'approve', id: tp.id }) }); ok('approve twice refused', r.status === 409);
  r = await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'reject', id: tp.id, reason: 'x' }) }); ok('reject after credit refused', r.status === 409);
  // ถอน: โอนแล้ว + โอนไม่สำเร็จ ซ้อนกันไม่ได้
  const p = await J(await fetch(`${B}/api/pt/wallet?mb=${mb}&t=${encodeURIComponent(T)}`));
  if (p.available >= 50000) {
    r = await fetch(B + '/api/pt/wallet', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, amount: 500 }) }); j = await J(r); ok('withdraw req', j.ok, j.error);
    const wid = j.withdrawal?.id ?? (await J(await fetch(`${B}/api/pt/wallet?mb=${mb}&t=${encodeURIComponent(T)}`))).withdrawals[0].id;
    const [x1, x2] = await Promise.all([
      fetch(B + '/api/admin/withdrawals', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'paid', id: wid }) }),
      fetch(B + '/api/admin/withdrawals', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'failed', id: wid, note: 'ทดสอบ' }) }),
    ]);
    ok('paid vs failed: only one wins', [x1.status, x2.status].filter((s) => s === 200).length === 1, `${x1.status}/${x2.status}`);
  } else ok('withdraw race (skipped: ยอดถอนได้ไม่พอ)', true);
  // 16 ต.ค.: ปิดขั้น OTP (OTP_ENABLED ไม่ตั้ง) · ปุ่ม "สมัครทันที" = สมัครลูกค้า
  j = await J(await fetch(B + '/api/otp/verify')); ok('otp step off', j.required === false);
  const em = `reg${Date.now()}@test.local`;
  r = await fetch(B + '/api/otp/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '0891234567', skip: true }) });
  const ck = (r.headers.get('set-cookie') || '').split(';')[0];
  r = await fetch(B + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json', cookie: ck }, body: JSON.stringify({ name: 'ทดสอบ', phone: '0891234567', email: em, password: 'demo-pass-1234', accept_terms: true }) });
  ok('register without OTP', (await J(r)).ok);
  t = await (await fetch(B + '/')).text();
  ok('สมัครทันที → /auth/register', /href="\/auth\/register"[^>]*>สมัครทันที/.test(t) && !/href="\/join"[^>]*>สมัครทันที/.test(t));
  // ขอลบบัญชี = ออกจากระบบ (ล้าง cookie)
  const C9 = { cookie: 'hamoo_session=' + sign({ sub: 'demo:del@test.local', email: 'del@test.local', exp: Date.now() + 3600e3 }) };
  r = await fetch(B + '/api/me/delete', { method: 'POST', headers: C9 }); j = await J(r);
  ok('delete request signs out', j.ok && j.signedOut && /hamoo_session=;/.test(r.headers.get('set-cookie') || ''));
  // กระทบยอดยังตรงหลังทุกอย่าง
  const CRON = (/^CRON_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '');
  j = await J(await fetch(B + '/api/cron/money', { headers: { authorization: 'Bearer ' + CRON } })); ok('recon ok', j.recon?.ok, JSON.stringify(j.recon?.issues));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
