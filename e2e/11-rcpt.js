// #21 ใบเสร็จรับเงินตอนถอน (ไม่มี 50 ทวิ) — รันหลัง 06-day (มีการถอนที่โอนแล้ว)
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const B = 'http://localhost:3210', mb = 'MB-2610001';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const body = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600e3 })).toString('base64url');
const T = body + '.' + crypto.createHmac('sha256', KEY).update('resume:' + body).digest('base64url');
const q = '?t=' + encodeURIComponent(T);
(async () => {
  let r = await fetch(`${B}/join/profile/${mb}/docs${q}`); let t = await r.text();
  ok('docs page', r.status === 200);
  ok('no 50 ทวิ', !t.includes('50 ทวิ'));
  const ids = [...t.matchAll(/docs\/([0-9a-f-]{36})/g)].map((m) => m[1]);
  ok('receipt listed', ids.length > 0, String(ids.length));
  if (ids[0]) {
    r = await fetch(`${B}/join/profile/${mb}/docs/${ids[0]}${q}`); t = (await r.text()).replace(/<!-- -->/g, '');
    ok('receipt page', r.status === 200 && t.includes('ใบเสร็จรับเงิน') && t.includes('ค่าธรรมเนียมการใช้แพลตฟอร์ม'));
    ok('amount in words', /\(([^()<]*(?:สตางค์|ถ้วน))\)/.test(t));
    ok('receipt number', /WR-[0-9A-F]{8}/.test(t));
  }
  t = await (await fetch(`${B}/join/profile/${mb}/docs/00000000-0000-0000-0000-000000000000`)).text();
  ok('no token → forbidden', /ไม่มีสิทธิ์|ลิงก์หมดอายุ|Forbidden/.test(t));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
