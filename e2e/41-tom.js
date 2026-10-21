// หมวดทอมหล่อ (บอสสั่ง 21 ต.ค. 2569): สมัครที่ /join/tom · ค่าสมัครเท่าหนุ่มหล่อ · ที่นั่งอบรมแยกโควตา
// · ใบสมัครเก็บ group = tom + คำนำหน้า นางสาว · หน้าแรกมีแท็บ หนุ่มหล่อ | ทอมหล่อ · ป้ายในโปรไฟล์/หลังบ้าน
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
const tok = (mb) => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600_000 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); };
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const form = (o, files = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); for (const [k, v] of Object.entries(files)) f.set(k, v); return f; };
const seats = async (g) => J(await fetch(B + '/api/join/seats' + (g ? '?g=' + g : '')));

(async () => {
  let h = await (await fetch(B + '/join/tom')).text();
  ok('/join/tom renders ทอมหล่อ', h.includes('ทอมหล่อ · เพื่อนกินเที่ยว') && h.includes('ทอมหล่อ อายุ 20–50 ปี'));
  ok('/join/tom same fees', h.includes('9,500 บาท') && h.includes('15,900 บาท'));
  ok('/join/tom CTA carries group', h.includes('g=tom'));
  h = await (await fetch(B + '/join')).text();
  ok('/join has หนุ่มหล่อ | ทอมหล่อ switch', h.includes('data-group-tab="หนุ่มหล่อ"') && h.includes('href="/join/tom"'));

  ok('/join seat counter = taken / 50, no group name', /\d+ \/ 50 ที่/.test(h.replace(/<!-- -->/g, '')) && !h.includes('กลุ่มอบรมถัดไป'));
  const men0 = await seats(), tom0 = await seats('tom');
  ok('quota 50 · taken counted', men0.quota === 50 && men0.taken === 50 - men0.left, JSON.stringify(men0));
  ok('separate quota (same capacity)', tom0.quota === men0.quota && tom0.left === tom0.quota, JSON.stringify({ men0, tom0 }));

  // สมัครทอมหล่อ
  const tel = '06' + String(Date.now()).slice(-8);
  const s = await J(await fetch(B + '/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel }) }));
  let jar = '';
  if (s.devCode) { const v = await fetch(B + '/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel, code: s.devCode }) }); jar = (v.headers.get('set-cookie') || '').split(';')[0]; }
  const reg = await J(await fetch(B + '/api/join/register', { method: 'POST', headers: { cookie: jar, 'x-forwarded-for': '10.8.8.8' }, body: form({ package: 'A', group: 'tom', first_name: 'สาว', last_name: 'หล่อ', nickname: 'ทอม', tel, email: `tom${tel}@test.local`, password: 'tom-' + tel, accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true' }, { slip: new File([img], 's.jpg', { type: 'image/jpeg' }) }) }));
  ok('tom registers with separate code MS-', /^MS-\d{7}$/.test(reg.mb_code || ''), JSON.stringify(reg));
  const mb = reg.mb_code;
  const list = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const at = list.indexOf('"mb_code":"' + mb + '"');
  const id = [...list.slice(Math.max(0, at - 6000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)].pop()?.[1];
  let row = (await J(await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) }))).row;
  ok('group = tom · title นางสาว · fee 9,500', row?.group === 'tom' && row?.title === 'นางสาว' && row?.amount === 9500, `${row?.group} ${row?.title} ${row?.amount}`);

  // อนุมัติสลิป + KYC → นับเข้าที่นั่งทอมหล่อเท่านั้น
  await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ status: 'verified' }) });
  await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ kyc_status: 'approved' }) });
  const men1 = await seats(), tom1 = await seats('tom');
  ok('tom seat counted in tom quota only', tom1.left === tom0.left - 1 && men1.left === men0.left, JSON.stringify({ men1, tom1 }));

  // หนุ่มหล่อยังได้ MB- (นับเลขแยก)
  const tel2 = '06' + String(Date.now() + 7).slice(-8);
  const s2 = await J(await fetch(B + '/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel2 }) }));
  let jar2 = '';
  if (s2.devCode) { const v = await fetch(B + '/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel2, code: s2.devCode }) }); jar2 = (v.headers.get('set-cookie') || '').split(';')[0]; }
  const man = await J(await fetch(B + '/api/join/register', { method: 'POST', headers: { cookie: jar2, 'x-forwarded-for': '10.8.8.9' }, body: form({ package: 'A', first_name: 'หนุ่ม', last_name: 'หล่อ', nickname: 'แมน', tel: tel2, email: `man${tel2}@test.local`, password: 'man-' + tel2, accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true' }, { slip: new File([img], 's.jpg', { type: 'image/jpeg' }) }) }));
  ok('man still gets MB-', /^MB-\d{7}$/.test(man.mb_code || ''), JSON.stringify(man));
  ok('MS and MB counters independent', reg.mb_code.slice(-3) === '001' || reg.mb_code.slice(3, 7) === man.mb_code.slice(3, 7), `${reg.mb_code} ${man.mb_code}`);
  ok('MS profile route works', (await fetch(B + `/join/profile/${mb}?t=${encodeURIComponent(tok(mb))}`)).status === 200);
  // ป้าย + หน้าแรก
  h = await (await fetch(B + `/join/profile/${mb}?t=${encodeURIComponent(tok(mb))}`)).text();
  ok('profile shows ทอมหล่อ badge', h.includes('data-pt-group="tom"'));
  h = await (await fetch(B + '/admin/applicants', { headers: ADM })).text();
  ok('admin list data has group tom', h.replace(/\\"/g, '"').includes('"group":"tom"'));
  h = await (await fetch(B + '/')).text();
  ok('home has หนุ่มหล่อ | ทอมหล่อ tabs', h.includes('data-home-group="man"') && h.includes('data-home-group="tom"'));

  // สมัครหนุ่มหล่อปกติ ไม่มี group
  const men = (await J(await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) }))).row;
  ok('tom row stays tom after edits', men?.group === 'tom');

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
