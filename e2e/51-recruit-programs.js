// โปรแกรม Recruit แยกส่วน (28 ต.ค. 2569): แท็บแบบเป๋าตัง (กระเป๋าเงิน · Part-time · Partner · Collab · Member) · รายได้รวมใต้ชื่อ
// · CEO กำหนดราคาที่ /admin/recruit-programs (แอดมินอื่นดูอย่างเดียว) · ดูผลงานแยกส่วน
const { adm, sup } = require('./_tok');
const B = 'http://localhost:3210';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const J = (r) => r.json();
const ORIGIN = { 'content-type': 'application/json', origin: B };
const un = (h) => h.replace(/<!-- -->/g, '').replace(/\\"/g, '"');
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const SUP = { cookie: 'mord_admin=' + sup, 'content-type': 'application/json' };

(async () => {
  const tag = String(Date.now()).slice(-6);
  let r = await fetch(B + '/api/recruit/apply', { method: 'POST', headers: { ...ORIGIN, 'x-forwarded-for': '10.61.' + tag.slice(-2) + '.1' }, body: JSON.stringify({ name: 'แท็บ ทดสอบ', phone: '08' + tag + '55', email: `tab${tag}@test.local`, bank: 'กสิกรไทย (KBank)', account: '1234567890', account_name: 'แท็บ ทดสอบ', consent: true }) });
  const j = await J(r);
  const sc = (r.headers.get('set-cookie') || '').split(';')[0];
  ok('recruit created', j.ok && sc.startsWith('mb_sales='));
  const page = async (q = '') => un(await (await fetch(B + '/recruit/me' + q, { headers: { cookie: sc } })).text());

  // ── แท็บ ──
  let h = await page();
  ok('header: name + total earnings', h.includes('แท็บ ทดสอบ') && h.includes('data-recruit-total') && h.includes('รายได้รวมทั้งหมด'));
  ok('5 tabs in order', ['wallet', 'parttime', 'partner', 'collab', 'member'].every((k) => h.includes(`data-tab="${k}"`)) && h.indexOf('data-tab="wallet"') < h.indexOf('data-tab="member"'));
  ok('default tab = wallet (no recruit link)', h.includes('data-sales-wallet') && !h.includes('data-recruit-link'));
  ok('closed tabs marked "เร็ว ๆ นี้"', (h.match(/data-soon="1"/g) || []).length === 3);
  h = await page('?tab=parttime');
  ok('Part-time tab: link + ฿500', h.includes('data-recruit-link="rfree"') && h.includes('รับ ฿500 / คน') && !h.includes('data-sales-wallet'));
  for (const k of ['partner', 'collab', 'member']) { h = await page('?tab=' + k); ok(`${k} tab: not open yet`, h.includes(`data-recruit-soon="${k}"`) && h.includes('ยังไม่เปิด')); }

  // ── หลังบ้าน ──
  h = un(await (await fetch(B + '/admin/recruit-programs', { headers: ADM })).text());
  ok('admin page: tabs + price form + list', h.includes('data-program-tabs') && h.includes('data-program-price="parttime"') && h.includes('data-program-list="parttime"') && h.includes('data-program-save'));
  h = un(await (await fetch(B + '/admin/recruit-programs?p=partner', { headers: SUP })).text());
  ok('super: view only (no save)', h.includes('data-program-price="partner"') && h.includes('แก้ได้เฉพาะ CEO') && !h.includes('data-program-save'));
  ok('nav has programs page', un(await (await fetch(B + '/admin', { headers: ADM })).text()).includes('href="/admin/recruit-programs"'));
  const P = (b, H = ADM) => fetch(B + '/api/admin/recruit-programs', { method: 'POST', headers: H, body: JSON.stringify({ programs: b }) });
  ok('price edit needs admin', (await fetch(B + '/api/admin/recruit-programs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status === 401);
  ok('super cannot edit price', (await P({ parttime: { amount_satang: 70_000 } }, SUP)).status === 403);
  ok('enable without price refused', (await P({ partner: { enabled: true, amount_satang: 0, bonus: [] } })).status === 400);
  ok('negative price refused', (await P({ parttime: { amount_satang: -1 } })).status === 400);
  r = await P({ parttime: { enabled: true, amount_satang: 70_000, note: 'จ่ายเมื่อได้งานแรก', bonus: [{ jobs: 10, satang: 50_000 }, { jobs: 25, satang: 300_000 }] }, partner: { enabled: true, amount_satang: 100_000, note: 'ร้านเปิดบัญชีแล้ว' } });
  const pj = await J(r);
  ok('CEO sets prices', r.status === 200 && pj.programs?.parttime?.amount_satang === 70_000 && pj.programs.parttime.bonus[0].jobs === 25, JSON.stringify(pj).slice(0, 160));
  h = await page('?tab=parttime');
  ok('recruit sees new Part-time price + bonus', h.includes('รับ ฿700 / คน') && h.includes('ครบ 10 งาน / เดือน') && h.includes('+฿3,000') && h.includes('จ่ายเมื่อได้งานแรก'));
  h = await page('?tab=partner');
  ok('opened Partner tab shows its price', h.includes('data-recruit-soon="partner"') && h.includes('฿1,000 / ร้าน'));
  h = await page();
  ok('opened tab loses "soon" badge', (h.match(/data-soon="1"/g) || []).length === 2);
  ok('GET programs (admin)', (await J(await fetch(B + '/api/admin/recruit-programs', { headers: SUP }))).programs?.partner?.enabled === true);

  // คืนค่าเดิม
  r = await P({ parttime: { enabled: true, amount_satang: 50_000, note: 'เงินเข้า Wallet เมื่อผู้สมัครได้งานแรก (ทุกแผน)', bonus: [{ jobs: 20, satang: 200_000 }, { jobs: 15, satang: 100_000 }] }, partner: { enabled: false, amount_satang: 0, note: '' } });
  ok('reset to defaults', r.status === 200);
  h = await page('?tab=parttime');
  ok('back to ฿500', h.includes('รับ ฿500 / คน') && h.includes('+฿2,000'));

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
