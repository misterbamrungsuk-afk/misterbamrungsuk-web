// ค่าสมัครหักจากงาน (บอสกำหนด 24 ต.ค. 2569 · แทนเงินประกันงาน): สมัครฟรี (เชิญ/ทอมหล่อ) → ปล่อยรายได้แต่ละงานหัก ฿500 จนครบ ฿10,000
// · หมอกรอกเลขแนะนำ Recruit ตอนสมัคร → งานแรก ฿500 ที่หักเข้ากระเป๋า Recruit (ไม่ได้ตอนสมัคร) · งานถัดไปเข้ารายได้บริษัท · สายจ่ายเงินไม่ถูกหัก · ledger รวม = 0
// ต้องรันหลัง 01–06 (ลูกค้า buyer@test.local มีเงิน · ปล่อยรายได้แบบ auto releaseHours=0 จาก 06)
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json();
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const JSONH = { 'content-type': 'application/json' };
const sess = (sub, email) => { const b = Buffer.from(JSON.stringify({ sub, email, exp: Date.now() + 3600e3 })).toString('base64url'); return 'hamoo_session=' + b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const C1 = { cookie: sess('demo:buyer@test.local', 'buyer@test.local'), 'content-type': 'application/json' };
const tok = (mb) => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600_000 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); };
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const form = (o, files = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); for (const [k, v] of Object.entries(files)) f.set(k, v); return f; };
const publicId = (mb) => 'r' + crypto.createHash('sha256').update(`mb-public:${mb}`).digest('hex').slice(0, 10);
const DAY = 86400e3;
const strip = (h) => h.replace(/<!-- -->/g, '');

(async () => {
  // Recruit ภายนอก + ID/รหัสผ่าน
  const rep = (await J(await fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'rep_create', name: 'รีครูท ค่าสมัคร', phone: '0833333333', bank: { bank: 'กสิกร', account: '1234567899', name: 'รีครูท' } }) }))).rep;
  const uname = 'rcf' + String(Date.now()).slice(-6);
  const li = await J(await fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'rep_login', id: rep.id, username: uname }) }));
  const lr = await fetch(B + '/api/sales/login', { method: 'POST', headers: { ...JSONH, origin: B }, body: JSON.stringify({ username: uname, password: li.login.password }) });
  const salesC = (lr.headers.get('set-cookie') || '').split(';')[0];
  ok('recruit created + logged in', !!rep?.code && salesC.startsWith('mb_sales='));

  // ── สมัครผ่านลิงก์เชิญ (ฟรี · TOP) + กรอกเลขแนะนำเอง (ไม่ผ่านลิงก์ Recruit) ──
  const exp = new Date(Date.now() + 7 * DAY).toISOString().slice(0, 10);
  const inv = (await J(await fetch(B + '/api/admin/invites', { method: 'POST', headers: ADM, body: JSON.stringify({ name: 'e2e fee', limit: 1, expires: exp }) }))).data;
  const tel = '06' + String(Date.now()).slice(-8);
  const s = await J(await fetch(B + '/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel }) }));
  let jar = '';
  if (s.devCode) { const v = await fetch(B + '/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel, code: s.devCode }) }); jar = (v.headers.get('set-cookie') || '').split(';')[0]; }
  const body = (extra) => form({ package: 'A', first_name: 'ค่าสมัคร', last_name: 'งาน', nickname: 'ฟี', tel, email: `fee${tel}@test.local`, password: 'fee-' + tel, accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true', invite: inv.code, ...extra });
  let reg = await J(await fetch(B + '/api/join/register', { method: 'POST', headers: { cookie: jar, 'x-forwarded-for': '10.7.7.8' }, body: body({ recruit_code: 'ZZZZ9999' }) }));
  ok('wrong recruit code refused (field)', !reg.ok && (reg.fields || []).includes('recruit_code'), JSON.stringify(reg));
  reg = await J(await fetch(B + '/api/join/register', { method: 'POST', headers: { cookie: jar, 'x-forwarded-for': '10.7.7.8' }, body: body({ recruit_code: rep.code.toLowerCase() }) }));
  ok('invite PT registered (free) with typed recruit code', !!reg.mb_code, JSON.stringify(reg));
  const mb = reg.mb_code, T = tok(mb);
  const list = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const at = list.indexOf('"mb_code":"' + mb + '"');
  const id = [...list.slice(Math.max(0, at - 6000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)].pop()?.[1];
  let row = (await J(await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ kyc_status: 'approved' }) }))).row;
  ok('linked to recruit · not paid at signup', row?.sales_ref?.code === rep.code && !row?.recruit_at, JSON.stringify(row?.sales_ref) + ' ' + row?.recruit_at);
  let me = strip(await (await fetch(B + '/recruit/me', { headers: { cookie: salesC } })).text());
  ok('recruit sees doctor: no job yet, paid on first job', me.includes(mb) && me.includes('ได้เมื่อผู้สมัครได้งานแรก') && me.includes('data-recruit-code') && me.includes('฿500 / คน'));
  let r = await fetch(B + '/api/join/photos', { method: 'POST', body: form({ mb, t: T }, { file: new File([img], 'p.jpg', { type: 'image/jpeg' }) }) });
  r = await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ listed: true }) });
  ok('invite PT listed', r.status === 200, String(r.status));

  // ── จอง → รับ → เช็กอิน → จบ → ปล่อยรายได้ ──
  const pid = publicId(mb);
  // ลูกค้าคนที่ 2 (โควตาจอง 10 ครั้ง/ชม. ต่อคน · buyer ใช้ไปแล้วใน 05/06) → เติมเงินผ่านสลิป + แอดมินอนุมัติ
  const em2 = `fee2${tel}@test.local`;
  const C2 = { cookie: sess('demo:' + em2, em2), 'content-type': 'application/json' };
  await fetch(B + '/api/wallet/topup', { method: 'POST', headers: { cookie: C2.cookie }, body: form({ amount: '30000' }, { slip: new File([img], 't.jpg', { type: 'image/jpeg' }) }) });
  const tp = (await J(await fetch(B + '/api/admin/wallet', { headers: ADM }))).topups.find((t) => t.status === 'pending' && (t.customer_email === em2 || t.customer_id === 'demo:' + em2));
  if (tp) await fetch(B + '/api/admin/wallet', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'approve', id: tp.id }) });
  const job = async (n, CU = C1) => {
    const soon = new Date(Date.now() + (65 + n * 300) * 60_000).toISOString();
    const j = await J(await fetch(B + '/api/bookings', { method: 'POST', headers: CU, body: JSON.stringify({ pid, hours: 3, starts_at: soon, place: { type: 'cafe', detail: 'คาเฟ่ทดสอบค่าสมัคร ' + n }, note: '' }) }));
    if (!j.ok) return { err: j.error };
    const PT = (action) => fetch(B + `/api/pt/bookings/${j.id}`, { method: 'POST', headers: JSONH, body: JSON.stringify({ mb, t: T, action }) });
    await PT('accept'); await PT('checkin');
    await fetch(B + '/api/admin/bookings', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'demo_shift', id: j.id, minutes: 240 + n * 300 }) });
    const c = await J(await fetch(B + `/api/bookings/${j.id}/complete`, { method: 'POST', headers: CU, body: JSON.stringify({ rating: 5 }) }));
    await fetch(B + '/api/admin/payroll', { method: 'POST', headers: ADM, body: JSON.stringify({ all: true }) });
    await fetch(B + `/api/pt/bookings?mb=${mb}&t=${encodeURIComponent(T)}`);
    return { ok: c.ok, id: j.id };
  };
  const j1 = await job(1);
  ok('job 1 completed', j1.ok, j1.err);
  const w = await J(await fetch(B + `/api/pt/wallet?mb=${mb}&t=${encodeURIComponent(T)}`));
  const hist = w.history.find((h) => h.kind === 'mature' && h.bucket === 'available');
  const sp = w.history.find((h) => h.kind === 'split' && h.bucket === 'pending');
  ok('job 1: PT gets share − ฿500 · no bond', w.pending === 0 && hist && sp && hist.amount === sp.amount - 50000 && (w.bond ?? 0) === 0, `${sp?.amount} → ${hist?.amount} bond ${w.bond}`);
  row = (await J(await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) }))).row;
  ok('fee paid ฿500 · recruit credited ฿500', row?.fee_paid_satang === 50000 && row?.recruit_satang === 50000 && !!row?.recruit_at, `${row?.fee_paid_satang} ${row?.recruit_satang}`);
  let sw = await J(await fetch(B + '/api/sales/me', { headers: { cookie: salesC } }));
  ok('recruit wallet +฿500 (from first job)', (sw.summary?.available ?? sw.available) === 50000, JSON.stringify(sw).slice(0, 160));
  me = strip(await (await fetch(B + '/recruit/me', { headers: { cookie: salesC } })).text());
  ok('recruit dashboard: doctor got job', me.includes('ได้งานแล้ว 1 งาน') && me.includes('ได้รับแล้ว'));

  // ── งานที่ 2: หักอีก ฿500 เข้าบริษัท · Recruit ไม่ได้เพิ่ม ──
  const j2 = await job(2, C2);
  ok('job 2 completed', j2.ok, j2.err);
  row = (await J(await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) }))).row;
  ok('fee paid ฿1,000 · recruit still ฿500', row?.fee_paid_satang === 100000 && row?.recruit_satang === 50000, `${row?.fee_paid_satang} ${row?.recruit_satang}`);
  sw = await J(await fetch(B + '/api/sales/me', { headers: { cookie: salesC } }));
  ok('recruit wallet unchanged', (sw.summary?.available ?? sw.available) === 50000);
  // Recruit ขอเบิกค่าแนะนำ (ขั้นต่ำ ฿100 · รอ CEO อนุมัติ)
  const pr = await J(await fetch(B + '/api/sales/me', { method: 'POST', headers: { cookie: salesC, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 500 }) }));
  ok('recruit requests payout ฿500', pr.ok, JSON.stringify(pr));
  me = strip(await (await fetch(B + '/recruit/me', { headers: { cookie: salesC } })).text());
  ok('recruit dashboard: payout pending CEO', me.includes('รอ CEO อนุมัติ') && me.includes('กำลังโอน ฿500'));

  // ── หน้า + สายปกติไม่ถูกหัก + ledger ──
  let h = strip(await (await fetch(B + `/join/profile/${mb}/earnings?t=${encodeURIComponent(T)}`)).text());
  ok('earnings page: fee progress ฿1,000 / ฿10,000', h.includes('data-fee-card') && h.includes('฿1,000') && h.includes('฿10,000') && !h.includes('data-bond-card'));
  const T0 = tok('MBM-2610001');
  h = await (await fetch(B + `/join/profile/MBM-2610001/earnings?t=${encodeURIComponent(T0)}`)).text();
  ok('free signup (men) also shows fee card', h.includes('data-fee-card'));
  h = await (await fetch(B + '/join/terms')).text();
  ok('terms: fee ฿500/job up to ฿10,000', h.includes('10,000 บาท') && h.includes('งานละ 500 บาท'));
  const a = await J(await fetch(B + '/api/admin/wallet', { headers: ADM }));
  ok('ledger balanced', a.sum === 0, String(a.sum));

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
