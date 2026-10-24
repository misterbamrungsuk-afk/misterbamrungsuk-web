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
  ok('/join/tom: no track cards, free note', !h.includes('data-fee=') && h.includes('data-tom-free') && h.includes('สมัครฟรี') && !h.includes('15,900 บาท'));
  ok('/join/tom CTA = free profile (pkg B, g=tom)', h.includes('pkg=B&amp;g=tom') && h.includes('เริ่มสร้างโปรไฟล์'));
  h = await (await fetch(B + '/join')).text();
  ok('/join has หนุ่มหล่อ | ทอมหล่อ switch', h.includes('data-group-tab="หนุ่มหล่อ"') && h.includes('href="/join/tom"'));

  ok('/join seat counter = เหลือ N ที่, no group name', /เหลือ \d+ ที่/.test(h.replace(/<!-- -->/g, '')) && !h.includes('กลุ่มอบรมถัดไป'));
  const men0 = await seats(), tom0 = await seats('tom');
  ok('quota 50 · taken counted', men0.quota === 50 && men0.taken === 50 - men0.left, JSON.stringify(men0));
  ok('separate quota (same capacity)', tom0.quota === men0.quota && tom0.left === tom0.quota, JSON.stringify({ men0, tom0 }));

  // สมัครทอมหล่อ
  const tel = '06' + String(Date.now()).slice(-8);
  const s = await J(await fetch(B + '/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel }) }));
  let jar = '';
  if (s.devCode) { const v = await fetch(B + '/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel, code: s.devCode }) }); jar = (v.headers.get('set-cookie') || '').split(';')[0]; }
  const reg = await J(await fetch(B + '/api/join/register', { method: 'POST', headers: { cookie: jar, 'x-forwarded-for': '10.8.8.8' }, body: form({ package: 'A', group: 'tom', first_name: 'สาว', last_name: 'หล่อ', nickname: 'ทอม', tel, email: `tom${tel}@test.local`, password: 'tom-' + tel, accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true' }, { slip: new File([img], 's.jpg', { type: 'image/jpeg' }) }) }));
  ok('tom registers with separate code MBT-', /^MBT-\d{7}$/.test(reg.mb_code || ''), JSON.stringify(reg));
  const mb = reg.mb_code;
  const list = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const at = list.indexOf('"mb_code":"' + mb + '"');
  const id = [...list.slice(Math.max(0, at - 6000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)].pop()?.[1];
  let row = (await J(await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) }))).row;
  ok('tom: group tom · นางสาว · free · forced massage track B · verified · no INV', row?.group === 'tom' && row?.title === 'นางสาว' && row?.amount === 0 && row?.package === 'B' && row?.status === 'verified' && !row?.inv_no, `${row?.group} ${row?.title} ${row?.amount} ${row?.package} ${row?.status} ${row?.inv_no}`);

  // สมัครฟรี = ยืนยันทันที → นับลงที่นั่งทอมหล่อเท่านั้น
  const men1 = await seats(), tom1 = await seats('tom');
  ok('tom seat counted in tom quota only', tom1.left === tom0.left - 1 && men1.left === men0.left, JSON.stringify({ men1, tom1 }));

  // หนุ่มหล่อยังได้ MB- (นับเลขแยก)
  const tel2 = '06' + String(Date.now() + 7).slice(-8);
  const s2 = await J(await fetch(B + '/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel2 }) }));
  let jar2 = '';
  if (s2.devCode) { const v = await fetch(B + '/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel2, code: s2.devCode }) }); jar2 = (v.headers.get('set-cookie') || '').split(';')[0]; }
  const man = await J(await fetch(B + '/api/join/register', { method: 'POST', headers: { cookie: jar2, 'x-forwarded-for': '10.8.8.9' }, body: form({ package: 'A', first_name: 'หนุ่ม', last_name: 'หล่อ', nickname: 'แมน', tel: tel2, email: `man${tel2}@test.local`, password: 'man-' + tel2, accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true' }, { slip: new File([img], 's.jpg', { type: 'image/jpeg' }) }) }));
  ok('man still gets MBM-', /^MBM-\d{7}$/.test(man.mb_code || ''), JSON.stringify(man));
  ok('MS and MB counters independent', reg.mb_code.slice(-3) === '001' || reg.mb_code.slice(4, 8) === man.mb_code.slice(4, 8), `${reg.mb_code} ${man.mb_code}`);
  ok('MS profile route works', (await fetch(B + `/join/profile/${mb}?t=${encodeURIComponent(tok(mb))}`)).status === 200);
  // ลิงก์เชิญ: เลือกทอมหล่อได้ → ฟรี + TOP + รหัส MS- + หมวดทอมหล่อ
  const exp = new Date(Date.now() + 7 * 86400e3).toISOString().slice(0, 10);
  const inv = (await J(await fetch(B + '/api/admin/invites', { method: 'POST', headers: ADM, body: JSON.stringify({ name: 'e2e tom invite', limit: 1, expires: exp }) }))).data;
  let ih = await (await fetch(B + '/join/i/' + inv.code)).text();
  ok('invite page has หนุ่มหล่อ | ทอมหล่อ choice', ih.includes('data-invite-group="man"') && ih.includes('data-invite-group="tom"'));
  const tel3 = '06' + String(Date.now() + 13).slice(-8);
  const s3 = await J(await fetch(B + '/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel3 }) }));
  let jar3 = '';
  if (s3.devCode) { const v = await fetch(B + '/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel3, code: s3.devCode }) }); jar3 = (v.headers.get('set-cookie') || '').split(';')[0]; }
  const it = await J(await fetch(B + '/api/join/register', { method: 'POST', headers: { cookie: jar3, 'x-forwarded-for': '10.8.8.10' }, body: form({ package: 'A', group: 'tom', invite: inv.code, first_name: 'เชิญ', last_name: 'ทอม', nickname: 'ทอมเชิญ', tel: tel3, email: `tinv${tel3}@test.local`, password: 'tinv-' + tel3, accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true' }) }));
  ok('invite tom gets MBT- code', /^MBT-\d{7}$/.test(it.mb_code || ''), JSON.stringify(it));
  const l3 = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const a3 = l3.indexOf('"mb_code":"' + it.mb_code + '"');
  const id3 = [...l3.slice(Math.max(0, a3 - 6000), a3).matchAll(/"id":"([0-9a-f-]{36})"/g)].pop()?.[1];
  const r3 = (await J(await fetch(B + '/api/admin/applicants/' + id3, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) }))).row;
  ok('invite tom: free, TOP, verified, group tom', r3?.amount === 0 && r3?.tier === 'top' && r3?.status === 'verified' && r3?.group === 'tom' && r3?.invite === inv.code, `${r3?.amount} ${r3?.tier} ${r3?.status} ${r3?.group}`);

  // ป้าย + หน้าแรก
  h = await (await fetch(B + `/join/profile/${mb}?t=${encodeURIComponent(tok(mb))}`)).text();
  ok('profile shows ทอมหล่อ badge', h.includes('data-pt-group="tom"'));
  ok('tom (free = paid) sees ทอมหล่อ LINE group button', h.includes('data-line-group="tom"') && h.includes('line.me/ti/g/XAyQXejkUc') && !h.includes('t2xMQBRyuN'));
  const mh = await (await fetch(B + `/join/profile/${man.mb_code}?t=${encodeURIComponent(tok(man.mb_code))}`)).text();
  ok('man: no tom group link (หนุ่มหล่อ group only once paid)', !mh.includes('XAyQXejkUc') && (!mh.includes('data-line-group') || mh.includes('t2xMQBRyuN')));
  const lm = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const am = lm.indexOf('"mb_code":"' + man.mb_code + '"');
  const idm = [...lm.slice(Math.max(0, am - 6000), am).matchAll(/"id":"([0-9a-f-]{36})"/g)].pop()?.[1];
  await fetch(B + '/api/admin/applicants/' + idm, { method: 'PATCH', headers: ADM, body: JSON.stringify({ status: 'verified' }) });
  const mh2 = await (await fetch(B + `/join/profile/${man.mb_code}?t=${encodeURIComponent(tok(man.mb_code))}`)).text();
  ok('man after slip approved sees หนุ่มหล่อ LINE group', mh2.includes('data-line-group="man"') && mh2.includes('t2xMQBRyuN') && !mh2.includes('XAyQXejkUc'));
  // ใบสมัคร: ทอมหล่อมีช่องติ๊ก Trans · หนุ่มหล่อไม่มี
  let fh = await (await fetch(B + `/join/form/${mb}?t=${encodeURIComponent(tok(mb))}`)).text();
  ok('tom form has Trans checkbox', fh.includes('data-trans-check') && fh.includes('Trans (แปลงเพศแล้ว)'));
  fh = await (await fetch(B + `/join/form/${man.mb_code}?t=${encodeURIComponent(tok(man.mb_code))}`)).text();
  ok('man form has no Trans checkbox', !fh.includes('data-trans-check'));
  const pf = (trans) => fetch(B + '/api/join/profile', { method: 'POST', body: form({ mb, t: tok(mb), step: '1', disclose: 'yes', first_name: 'สาว', last_name: 'หล่อ', nickname: 'ทอม', birthdate: '1999-03-03', line_id: 'x', address: 'อโศก', areas: 'กรุงเทพฯ › วัฒนา', trans: String(trans) }, { photo: new File([img], 'a.jpg', { type: 'image/jpeg' }), other_doc: new File([img], 'b.jpg', { type: 'image/jpeg' }) }) }).then(J);
  let pr = await pf(true);
  let tr = (await J(await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) }))).row;
  ok('tom ticks Trans → saved', pr.ok && tr?.trans === true, JSON.stringify(pr) + ' ' + tr?.trans);
  pr = await pf(false);
  tr = (await J(await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) }))).row;
  ok('untick → ทอมปกติ', pr.ok && tr?.trans === false, String(tr?.trans));
  // อนุมัติ KYC (ชำระแล้ว + มีรูปจากใบสมัคร) → เปิดแสดงบนหน้าแรกอัตโนมัติ
  let kr = (await J(await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ kyc_status: 'approved' }) }))).row;
  ok('KYC approve → auto listed', kr?.listed === true && !!kr?.listed_at, `${kr?.listed} ${kr?.listed_at}`);
  await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ listed: false }) });
  kr = (await J(await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ kyc_status: 'approved' }) }))).row;
  ok('re-approve does not re-list after admin hid', kr?.listed === false, String(kr?.listed));
  h = await (await fetch(B + '/admin/applicants', { headers: ADM })).text();
  ok('admin has หนุ่มหล่อ | ทอมหล่อ tabs', h.includes('data-admin-group="man"') && h.includes('data-admin-group="tom"'));
  const ih2 = await (await fetch(B + `/join/profile/${it.mb_code}?t=${encodeURIComponent(tok(it.mb_code))}`)).text();
  ok('invite tom sees ทอมหล่อ group', ih2.includes('XAyQXejkUc'));
  const bd = await J(await fetch(B + `/api/pt/bond?mb=${mb}&t=${encodeURIComponent(tok(mb))}`));
  ok('work bond applies to ทอมหล่อ', bd.ok && bd.applies === true, JSON.stringify(bd));
  h = await (await fetch(B + '/admin/applicants', { headers: ADM })).text();
  ok('admin list data has group tom', h.replace(/\\"/g, '"').includes('"group":"tom"'));
  h = await (await fetch(B + '/')).text();
  ok('home has หนุ่มหล่อ | ทอมหล่อ tabs', h.includes('data-home-group="man"') && h.includes('data-home-group="tom"'));

  // สมัครหนุ่มหล่อปกติ ไม่มี group
  const men = (await J(await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) }))).row;
  ok('tom row stays tom after edits', men?.group === 'tom');

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
