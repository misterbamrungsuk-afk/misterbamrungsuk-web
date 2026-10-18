// งานหลังบ้าน (ops): ตั้งค่ากติกาลูกค้า/เปลี่ยนแปลงนัด (CEO เท่านั้น + ตรวจขอบเขต) · รอบรายวันกวาดทุกระบบ + สรุปผล
// · กระทบยอดมีช่องเงินพักร้านค้า (market_escrow) + ห้องพัก (hotel_escrow) · โหมดเดโม (ไม่มี SUPABASE_URL)
const WEB = require('path').join(__dirname, '..');
const fs = require('fs');
const { adm, sup } = require('./_tok');
const B = 'http://localhost:3210';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const env = (k) => (new RegExp('^' + k + '=(.*)$', 'm').exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '');
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json().catch(() => ({}));
const CEO = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json', origin: B };
const SUP = { cookie: 'mord_admin=' + sup, 'content-type': 'application/json', origin: B };
const post = (h, b) => fetch(B + '/api/admin/wallet', { method: 'POST', headers: h, body: JSON.stringify(b) });
const CRON = { authorization: 'Bearer ' + env('CRON_SECRET') };
const NEW = ['custMinWithdraw', 'rescheduleMinHours', 'rescheduleWaitHours', 'extendMaxHours', 'extendWaitMinutes'];

(async () => {
  // ── ตั้งค่า ──
  let j = await J(await fetch(B + '/api/admin/wallet', { headers: CEO }));
  ok('GET wallet (CEO)', j.ok && j.money, JSON.stringify(j).slice(0, 120));
  const orig = j.money;
  ok('money has new rule fields with defaults', NEW.every((k) => typeof orig[k] === 'number'), NEW.map((k) => k + '=' + orig[k]).join(' '));
  const base = { ...orig }; delete base.history;

  let r = await post(SUP, { action: 'settings', money: { ...base, custMinWithdraw: 200 }, note: 'e2e' });
  ok('non-CEO settings → 403', r.status === 403, String(r.status));

  const bad = [['custMinWithdraw', 0], ['custMinWithdraw', 100001], ['rescheduleMinHours', -1], ['rescheduleMinHours', 169], ['rescheduleWaitHours', 0], ['rescheduleWaitHours', 73], ['extendMaxHours', 0], ['extendMaxHours', 7], ['extendMaxHours', 1.5], ['extendWaitMinutes', 4], ['extendWaitMinutes', 121]];
  for (const [k, v] of bad) {
    r = await post(CEO, { action: 'settings', money: { ...base, [k]: v }, note: 'e2e bad' });
    const e = await J(r);
    ok(`reject ${k}=${v}`, r.status === 400 && !!e.error, e.error);
  }

  const next = { ...base, custMinWithdraw: 150, rescheduleMinHours: 4, rescheduleWaitHours: 6, extendMaxHours: 2, extendWaitMinutes: 20 };
  j = await J(await post(CEO, { action: 'settings', money: next, note: 'e2e ops' }));
  ok('CEO saves new rules', j.ok && NEW.every((k) => j.money?.[k] === next[k]), j.error);
  j = await J(await fetch(B + '/api/admin/wallet', { headers: CEO }));
  ok('saved rules read back', NEW.every((k) => j.money?.[k] === next[k]));

  // ฟอร์มเก่าที่ไม่ส่งช่องใหม่ = คงค่าเดิม
  const old = { ...base }; for (const k of NEW) delete old[k];
  j = await J(await post(CEO, { action: 'settings', money: old, note: 'e2e legacy form' }));
  ok('legacy payload keeps new rules', j.ok && NEW.every((k) => j.money?.[k] === next[k]), j.error);

  // คืนค่าเดิม
  j = await J(await post(CEO, { action: 'settings', money: base, note: 'e2e restore' }));
  ok('restore original settings', j.ok, j.error);

  // ── รอบรายวัน ──
  ok('cron without secret → 401', (await fetch(B + '/api/cron/money')).status === 401);
  ok('cron "Bearer undefined" → 401', (await fetch(B + '/api/cron/money', { headers: { authorization: 'Bearer undefined' } })).status === 401);
  if (!env('CRON_SECRET')) {
    console.log('SKIP cron summary · .env.local ไม่มี CRON_SECRET (route ปิดเมื่อไม่ตั้ง secret)');
  } else {
    r = await fetch(B + '/api/cron/money', { headers: CRON });
    j = await J(r);
    ok('cron ok', r.status === 200 && j.ok, String(r.status));
    const s = j.sweeps || {};
    for (const k of ['bookings', 'quick', 'hotels', 'calls', 'changes', 'market']) ok(`sweep summary has ${k}`, s[k] && typeof s[k].ok === 'boolean', JSON.stringify(s[k]));
    ok('every sweep ok', Object.values(s).every((x) => x.ok), JSON.stringify(s));
    const f = j.recon?.figures || {};
    ok('recon has market_escrow figures', typeof f.marketEscrow === 'number' && typeof f.expMarket === 'number', JSON.stringify(j.recon?.skipped));
    ok('recon has hotel_escrow figures', typeof f.hotelEscrow === 'number' && typeof f.expHotel === 'number', JSON.stringify(j.recon?.skipped));
    ok('market escrow matches', f.marketEscrow === f.expMarket, `${f.marketEscrow} vs ${f.expMarket}`);
    ok('hotel escrow matches', f.hotelEscrow === f.expHotel, `${f.hotelEscrow} vs ${f.expHotel}`);
    ok('recon ok', j.recon?.ok, JSON.stringify(j.recon?.issues));
  }

  // ── หน้าแอดมิน ──
  r = await fetch(B + '/admin', { headers: { cookie: CEO.cookie } });
  const html = await r.text();
  ok('admin overview renders escrow rows', r.status === 200 && html.includes('เงินพักร้านค้า') && html.includes('เงินพักห้องพัก'), String(r.status));
  r = await fetch(B + '/admin/wallet', { headers: { cookie: CEO.cookie } });
  const w = await r.text();
  ok('admin wallet shows new rule inputs', r.status === 200 && w.includes('ลูกค้าถอนขั้นต่ำ') && w.includes('ต่อเวลารวมสูงสุด'), String(r.status));

  console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
