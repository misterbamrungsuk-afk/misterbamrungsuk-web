// สถิติผู้เข้าชม (ของเราเอง · 24 ต.ค. 2569): /api/t นับเปิดหน้า + เวลาอยู่หน้า · ไม่ยินยอม = ไม่ระบุตัวตน
// · ยินยอม + ล็อกอิน = เห็นว่าใคร (เซิร์ฟเวอร์อ่านจากคุกกี้เอง) · บอท/หน้าแอดมินไม่นับ · หน้า /admin/traffic สรุปครบ
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const ADM = { cookie: 'mord_admin=' + adm };
const sess = (sub, email) => { const b = Buffer.from(JSON.stringify({ sub, email, exp: Date.now() + 3600e3 })).toString('base64url'); return 'hamoo_session=' + b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const T = (body, extra = {}) => fetch(B + '/api/t', { method: 'POST', headers: { 'content-type': 'text/plain', origin: B, 'user-agent': UA, 'x-forwarded-for': '10.44.0.' + (Math.random() * 200 | 0), ...extra }, body: JSON.stringify(body) });
const sid = () => crypto.randomBytes(8).toString('hex');
const strip = (h) => h.replace(/<!-- -->/g, '');

(async () => {
  // รอบที่ 1: ไม่ยินยอม · มาจาก facebook (utm) · 3 หน้า
  const s1 = sid(); const v1 = crypto.randomUUID(), v2 = crypto.randomUUID(), v3 = crypto.randomUUID();
  let r = await T({ t: 'v', v: v1, sid: s1, p: '/join', a: 0, us: 'facebook', uc: 'tom-oct' });
  ok('view accepted (204)', r.status === 204, String(r.status));
  await T({ t: 'd', v: v1, sid: s1, ms: 42000 });
  await T({ t: 'v', v: v2, sid: s1, p: '/join/tom', a: 0 }); await T({ t: 'd', v: v2, sid: s1, ms: 65000 });
  await T({ t: 'v', v: v3, sid: s1, p: '/join/pay', a: 0 }); await T({ t: 'd', v: v3, sid: s1, ms: 30000 });

  // รอบที่ 2: ลูกค้าล็อกอิน + ยินยอมวิเคราะห์ + การตลาด
  const s2 = sid(); const w1 = crypto.randomUUID();
  await T({ t: 'v', v: w1, sid: s2, p: '/', a: 1, m: 1, vid: sid() }, { cookie: sess('demo:traffic@test.local', 'traffic@test.local') });
  await T({ t: 'd', v: w1, sid: s2, ms: 90000 });
  // รอบที่ 3: ล็อกอินแต่ไม่ยินยอม → ต้องไม่ระบุตัว
  const s3 = sid(); const x1 = crypto.randomUUID();
  await T({ t: 'v', v: x1, sid: s3, p: '/', a: 0 }, { cookie: sess('demo:hidden@test.local', 'hidden@test.local') });

  // ไม่นับ: บอท · หน้าแอดมิน · ข้อมูลผิดรูป
  await T({ t: 'v', v: crypto.randomUUID(), sid: sid(), p: '/', a: 0 }, { 'user-agent': 'Googlebot/2.1' });
  await T({ t: 'v', v: crypto.randomUUID(), sid: sid(), p: '/admin/traffic', a: 0 });
  r = await T({ t: 'v', v: 'not-a-uuid', sid: s1, p: '/' });
  ok('bad payload refused', r.status === 400, String(r.status));

  let h = strip(await (await fetch(B + '/admin/traffic?d=1', { headers: ADM })).text());
  ok('admin page renders KPIs + daily + hours', h.includes('data-traffic-kpi') && h.includes('data-daily') && h.includes('data-hours'));
  ok('counts sessions (3) and views (5)', h.includes('3 รอบการเข้าชม') && /เปิดหน้าทั้งหมด<\/div><div[^>]*>5</.test(h), (h.match(/\d+ รอบการเข้าชม/) || [])[0]);
  ok('source facebook + campaign', h.includes('facebook') && h.includes('tom-oct'));
  ok('ad insights shown', h.includes('data-ad-insights') && h.includes('9:16'));
  ok('page names + time on page', h.includes('รับสมัคร (ทอมหล่อ)') && h.includes('1 นาที 5 วิ'));
  ok('admin page itself not counted', !h.includes('/admin/traffic</div>'));
  ok('bot not counted', !h.includes('Googlebot'));
  const hu = h.replace(/\\"/g, '"'); ok('who: consented customer listed with marketing consent', /"label":"traffic@test\.local"[^}]*"mk":true/.test(hu), (hu.match(/"label":"traffic@test\.local".{0,160}/) || [])[0]);
  ok('who: non-consented customer not identified', !h.includes('hidden@test.local'));
  ok('range links', h.includes('data-range="30"'));
  ok('needs admin', (await fetch(B + '/admin/traffic', { redirect: 'manual' })).status !== 200);
  h = await (await fetch(B + '/admin', { headers: ADM })).text();
  ok('nav has traffic page', h.includes('href="/admin/traffic"'));

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
