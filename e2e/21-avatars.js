// รูปโปรไฟล์ทุกบัญชี (ลูกค้า / พาร์ทเนอร์ / ร้านค้า / Sale Man): อัป · ปรับตำแหน่ง+ซูม · เห็นได้เฉพาะเจ้าของ (โหมดเดโม · รันหลัง 09-partner)
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
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const up = (cookie, as, extra = {}, file = new File([img], 'a.jpg', { type: 'image/jpeg' })) => { const fd = new FormData(); fd.set('as', as); if (file) fd.set('file', file); for (const [k, v] of Object.entries(extra)) fd.set(k, v); return fetch(B + '/api/avatar', { method: 'POST', headers: { cookie }, body: fd }).then(J); };
(async () => {
  // ลูกค้า
  const C = 'hamoo_session=' + sign({ sub: 'demo:avatar@test.local', email: 'avatar@test.local', exp: Date.now() + 3600e3 });
  ok('no login = 401', (await fetch(B + '/api/avatar?as=customer')).status === 401);
  let j = await J(await fetch(B + '/api/avatar?as=customer', { headers: { cookie: C } })); ok('customer starts without avatar', j.ok && j.avatar === null);
  j = await up(C, 'customer'); ok('customer uploads', j.ok && j.avatar.pos === '50% 50%' && j.avatar.zoom === 1, j.error);
  let r = await fetch(B + `/api/avatar?as=customer&img=1&v=${j.avatar.v}`, { headers: { cookie: C } }); ok('image served to owner', r.status === 200 && r.headers.get('content-type') === 'image/jpeg');
  j = await up(C, 'customer', { pos: '20% 80%', zoom: '1.6' }, null); ok('adjust position + zoom', j.ok && j.avatar.pos === '20% 80%' && j.avatar.zoom === 1.6, JSON.stringify(j));
  j = await up(C, 'customer', { pos: 'x', zoom: '9' }, null); ok('bad values clamped', j.ok && j.avatar.pos === '50% 50%' && j.avatar.zoom === 3);
  j = await up(C, 'customer', {}, new File([Buffer.from('hello')], 'a.txt', { type: 'text/plain' })); ok('non-image refused', !j.ok);
  const t = (await (await fetch(B + '/profile', { headers: { cookie: C } })).text()).replace(/&amp;/g, '&'); ok('profile header uses avatar', t.includes('/api/avatar?as=customer&img=1'));
  ok('edit page loads', (await fetch(B + '/profile/edit', { headers: { cookie: C } })).status === 200);
  // คนอื่นดูรูปลูกค้าคนนี้ไม่ได้ (ได้แต่ของตัวเอง)
  const C2 = 'hamoo_session=' + sign({ sub: 'demo:other@test.local', email: 'other@test.local', exp: Date.now() + 3600e3 });
  ok('other customer gets own (none)', (await fetch(B + '/api/avatar?as=customer&img=1', { headers: { cookie: C2 } })).status === 404);
  // พาร์ทเนอร์
  const list = await J(await fetch(B + '/api/admin/partners', { headers: ADM }));
  const p = (list.rows || list.partners || list).find?.((x) => x.email.startsWith('spa-owner'));
  const PC = 'mb_partner=' + sign({ k: 'ps', pid: p.id, exp: Date.now() + 3600e3 });
  j = await up(PC, 'partner'); ok('partner uploads logo', j.ok, j.error);
  ok('partner listing page has editor', (await (await fetch(B + '/partner/portal/listing', { headers: { cookie: PC } })).text()).includes('รูปโปรไฟล์ / โลโก้'));
  ok('customer cannot act as partner', (await up(C, 'partner')).ok !== true);
  ok('partner logo is public', (await fetch(B + `/api/public/avatar?t=partner&id=${p.id}`)).status === 200);
  ok('customer photo is NOT public', (await fetch(B + `/api/public/avatar?t=customer&id=demo:avatar@test.local`)).status === 404);
  ok('spa list shows logo', (await (await fetch(B + '/spas')).text()).includes(`/api/public/avatar?t=partner&amp;id=${p.id}`));
  // ร้านค้า
  const v = await J(await fetch(B + '/api/market/admin/vendors', { method: 'POST', headers: ADM, body: JSON.stringify({ name: 'ร้านรูปโปรไฟล์', gp_pct: 10 }) }));
  const a = await J(await fetch(B + '/api/market/admin/accounts', { method: 'POST', headers: ADM, body: JSON.stringify({ vendor_id: v.vendor.id, email: `logo${Date.now()}@test.local` }) }));
  const acc = await fetch(B + '/api/market/vendor/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'accept', t: decodeURIComponent(a.invite.split('t=')[1]), password: 'demo-' + crypto.randomBytes(6).toString('hex') }) });
  const VC = (acc.headers.get('set-cookie') || '').split(';')[0];
  j = await up(VC, 'vendor', { pos: '60% 40%' }); ok('vendor uploads logo with position', j.ok && j.avatar.pos === '60% 40%', j.error);
  // Sale Man ภายนอก
  const rep = await J(await fetch(B + '/api/admin/sales', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'rep_create', name: 'เซลส์รูป', phone: '0811111111', bank: { bank: 'กสิกรไทย', account: '123-4-56789-1', name: 'เซลส์รูป' } }) }));
  const go = await fetch(B + '/sales/go?t=' + encodeURIComponent(decodeURIComponent(rep.link.split('t=')[1])), { redirect: 'manual' });
  const SC = (go.headers.get('set-cookie') || '').split(';')[0];
  j = await up(SC, 'sales'); ok('sale man uploads', j.ok, j.error);
  ok('sales dashboard has editor', (await fetch(B + '/sales/me', { headers: { cookie: SC } })).status === 200);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
