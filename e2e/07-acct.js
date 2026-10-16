// ช่วง 6: บัญชี · ถูกใจ · ลบบัญชี · โพสต์หาเพื่อน · รีวิวบนโปรไฟล์ (โหมดเดโม · รันหลัง day-e2e)
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const B = 'http://localhost:3210', mb = 'MB-2610001';
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const sess = (sub, email) => { const b = Buffer.from(JSON.stringify({ sub, email, exp: Date.now() + 3600e3 })).toString('base64url'); return 'hamoo_session=' + b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
const C1 = { cookie: sess('demo:buyer@test.local', 'buyer@test.local'), 'content-type': 'application/json' };
const C3 = { cookie: sess('demo:fresh@test.local', 'fresh@test.local'), 'content-type': 'application/json' };
const body = Buffer.from(JSON.stringify({ mb, exp: Date.now() + 3600_000 })).toString('base64url');
const T = body + '.' + crypto.createHmac('sha256', KEY).update('resume:' + body).digest('base64url');
const J = (r) => r.json();
(async () => {
  const h = await (await fetch(B + '/')).text();
  const pid = (/\/p\/(r[0-9a-f]{10})/.exec(h) || [])[1];
  let j = await J(await fetch(B + '/api/me', { headers: C1 })); ok('me', j.ok && j.counts.bookings >= 5, JSON.stringify(j.counts));
  let r = await fetch(B + '/api/me', { method: 'POST', headers: C1, body: JSON.stringify({ name: 'คุณทดสอบ', emergency: { name: 'พี่ดาว', tel: '0812345678', relation: 'พี่' } }) }); j = await J(r); ok('edit profile', j.ok && j.profile.emergency.tel === '0812345678');
  r = await fetch(B + '/api/me', { method: 'POST', headers: C1, body: JSON.stringify({ emergency: { name: 'x', tel: '12' } }) }); ok('bad emergency tel refused', r.status === 400);
  r = await fetch(B + '/api/me', { method: 'POST', headers: C1, body: JSON.stringify({ favorite: pid, on: true }) }); ok('favorite on', (await J(r)).profile.favorites.includes(pid));
  r = await fetch(B + '/api/me', { method: 'POST', headers: C1, body: JSON.stringify({ favorite: 'ton', on: true }) });
  let t = await (await fetch(B + '/favorites', { headers: C1 })).text(); ok('favorites page (real only, sample hidden once live PT exist)', t.includes('ตีกลับ') && !t.includes('/p/ton'));
  t = await (await fetch(B + '/profile', { headers: C1 })).text(); ok('account page', t.includes('คุณทดสอบ') && t.includes('กระเป๋าเงิน') && t.includes('ลบบัญชี'));
  r = await fetch(B + '/api/me/delete', { method: 'POST', headers: C1 }); j = await J(r); ok('delete blocked with open bookings', r.status === 409 || j.ok, j.error || 'no open');
  r = await fetch(B + '/api/me/delete', { method: 'POST', headers: C3 }); ok('delete request (fresh)', (await J(r)).ok);
  // โพสต์หาเพื่อน
  const when = new Date(Date.now() + 5 * 3600_000).toISOString();
  r = await fetch(B + '/api/posts', { method: 'POST', headers: C1, body: JSON.stringify({ activity: 'คาเฟ่', starts_at: when, hours: 3, area: 'โทร 0812345678', note: '' }) }); ok('contact in post refused', r.status === 400);
  r = await fetch(B + '/api/posts', { method: 'POST', headers: C1, body: JSON.stringify({ activity: 'คาเฟ่', starts_at: when, hours: 3, area: 'ทองหล่อ', note: 'คุยเก่ง' }) }); j = await J(r); ok('create post', j.ok); const postId = j.id;
  j = await J(await fetch(B + `/api/pt/posts?mb=${mb}&t=${encodeURIComponent(T)}`)); ok('pt sees open post', j.posts.some((p) => p.id === postId && !p.interested));
  r = await fetch(B + '/api/pt/posts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mb, t: T, post_id: postId, message: 'ชอบคาเฟ่ย่านนี้' }) }); ok('pt interest', (await J(r)).ok);
  t = await (await fetch(B + `/jobs/interested?id=${postId}`, { headers: C1 })).text(); ok('customer sees interested pt', t.includes('ชอบคาเฟ่ย่านนี้') && t.includes(`/book/${pid}`));
  r = await fetch(B + `/jobs/interested?id=${postId}`, { headers: C3, redirect: 'manual' }); ok('other customer cannot view post', r.status >= 300 && r.status < 400 && !(await r.text()).includes('ชอบคาเฟ่ย่านนี้'));
  r = await fetch(B + `/api/posts/${postId}`, { method: 'POST', headers: C1 }); ok('close post', (await J(r)).ok);
  j = await J(await fetch(B + `/api/pt/posts?mb=${mb}&t=${encodeURIComponent(T)}`)); ok('closed post hidden from pt', !j.posts.some((p) => p.id === postId));
  // รีวิวจริงบนโปรไฟล์
  t = await (await fetch(B + `/p/${pid}`)).text(); ok('profile shows real review', t.includes('ดีมาก') && t.includes('รีวิว'));
  for (const p of ['/search?q=วัฒนา', '/quick', '/jobs', '/jobs/create', '/page/terms', '/membership', '/membership/redeem', '/profile/edit', '/profile/delete']) { r = await fetch(B + p, { headers: C1 }); ok('page ' + p, r.status === 200); }
  for (const p of ['/home', '/provider', '/provider/earnings', '/matching', '/post/abc', '/profile/verify']) { r = await fetch(B + p, { headers: C1, redirect: 'manual' }); ok('redirect ' + p, r.status >= 300 && r.status < 400, r.headers.get('location')); }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
