// เปิดรับสมัคร Part-Time รอบ 20 ต.ค. 2569: ค่าสมัครยอดเดียว (A 9,500 · B 15,900 · สายเชิญพิเศษฟรี + TOP) ไม่มีคำว่าการันตี
// · ความยินยอม 3 ข้อ (ข้อมูลอ่อนไหวแยก) · เลขเอกสาร INV ตอนสมัคร → RI ตอนอนุมัติ (ครั้งเดียว · รันต่อเนื่อง)
// · โค้ดโปรโมทฟรี 3 วัน (แอดมินออก / รอบ 30 วันแรกงานไม่ถึง 5 เคส · คนละครั้ง) · เอกสาร PDPA ใหม่
// ต้องรันหลัง 01–05 (ใช้ Part-Time ที่เปิดรับงานแล้ว MBM-2610001) · โหมดสาธิต :3210
const WEB = require('path').join(__dirname, '..');
const fs = require('fs'), crypto = require('crypto');
const { adm } = require('./_tok');
const B = 'http://localhost:3210', mb0 = 'MBM-2610001';
let fails = 0;
const ok = (n, c, x = '') => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
const JSONH = { 'content-type': 'application/json' };
const ENV = fs.readFileSync(WEB + '/.env.local', 'utf8');
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
const tok = (mb) => { const b = Buffer.from(JSON.stringify({ mb, iat: Date.now(), exp: Date.now() + 3600_000 })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); };
const img = fs.readFileSync(WEB + '/public/brand/home/p-n04.jpg');
const F = (n) => new File([img], n, { type: 'image/jpeg' });
const form = (o, files = {}) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); for (const [k, v] of Object.entries(files)) f.set(k, v); return f; };
const rip = () => `10.${(Math.random() * 250) | 0}.${(Math.random() * 250) | 0}.${1 + ((Math.random() * 250) | 0)}`;
const device = (ip = rip()) => {
  let jar = '';
  const keep = (r) => { for (const x of r.headers.getSetCookie?.() || []) { const kv = x.split(';')[0]; jar = jar.split('; ').filter((y) => y && !y.startsWith(kv.split('=')[0] + '=')).concat(kv).join('; '); } return r; };
  return { req: async (p, o = {}) => keep(await fetch(B + p, { ...o, redirect: 'manual', headers: { 'x-forwarded-for': ip, ...(o.headers || {}), cookie: jar } })) };
};
const rowOf = async (mb) => {
  const list = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const at = list.indexOf('"mb_code":"' + mb + '"');
  const id = [...list.slice(Math.max(0, at - 6000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)].pop()?.[1];
  const row = id && (await (await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) })).json()).row;
  return { id, row };
};
const patch = async (id, body) => (await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify(body) })).json();
const NO_GUARANTEE = (h) => !/การันตี|เงินประกัน(?!งาน)|Refundable|คืนเมื่อครบ 1 ปี/.test(h);

async function register(pkg, extra = {}) {
  const d = device();
  const tel = '09' + String(Date.now()).slice(-8);
  const s = await (await d.req('/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel }) })).json();
  if (s.devCode) await d.req('/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel, code: s.devCode }) });
  const base = { package: pkg, first_name: 'เปิดรับ', last_name: 'ทดสอบ' + pkg, nickname: 'ลอนช์', tel, email: `launch${tel}@test.local`, password: 'launch-' + tel, accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true', ...extra };
  for (const k of Object.keys(base)) if (base[k] === undefined) delete base[k];
  const r = await d.req('/api/join/register', { method: 'POST', body: form(base, { slip: F('s.jpg') }) });
  return { d, r, j: await r.json(), tel };
}

(async () => {
  // ── หน้าสาธารณะ: ราคาใหม่ · ไม่มีการันตี ──
  let h = await (await fetch(B + '/join')).text();
  ok('/join shows 9,500 and 15,900', h.includes('9,500 บาท') && h.includes('15,900 บาท'));
  ok('/join has no guarantee wording', NO_GUARANTEE(h), (/.{20}(การันตี|เงินประกัน).{20}/.exec(h) || [])[0]);
  ok('/join says non-refundable', h.includes('ไม่คืนเงิน'));
  h = await (await fetch(B + '/join/terms')).text();
  ok('/join/terms: new fee + non-refundable, no guarantee', h.includes('9,500') && h.includes('15,900') && h.includes('ไม่คืนเงินทุกกรณี') && NO_GUARANTEE(h));
  h = await (await fetch(B + '/join/privacy')).text();
  ok('/join/privacy = new notice (company · sensitive data · no draft)', h.includes('บริษัท มิสเตอร์บำรุงสุข บาย มาดามกอ จำกัด') && h.includes('ประวัติอาชญากรรม') && !h.includes('ร่าง') && !h.includes('ํา'));
  h = await (await fetch(B + '/privacy')).text();
  ok('/privacy customer notice', h.includes('ลูกค้า (ผู้ใช้บริการ)') && h.includes('บริษัท มิสเตอร์บำรุงสุข บาย มาดามกอ จำกัด'));
  h = await (await fetch(B + '/join/consent')).text();
  ok('/join/consent partner consent form (6 purposes)', h.includes('(๖)') && h.includes('ผลตรวจสุขภาพ'));
  ok('/privacy/consent customer consent form', (await (await fetch(B + '/privacy/consent')).text()).includes('(๕)'));

  // ── ความยินยอม 3 ข้อ (ข้อมูลอ่อนไหวแยก บังคับ) ──
  let x = await register('A', { consent_criminal: undefined });
  ok('register without sensitive-data consent → 400', x.r.status === 400 && (x.j.fields || []).includes('consent_criminal'), x.r.status + ' ' + JSON.stringify(x.j.fields));

  // ── ค่าสมัคร + INV ──
  const A = await register('A');
  ok('register A', A.r.status === 200 && !!A.j.mb_code, JSON.stringify(A.j));
  const Bp = await register('B');
  ok('register B', Bp.r.status === 200 && !!Bp.j.mb_code, JSON.stringify(Bp.j));
  const a = await rowOf(A.j.mb_code), b = await rowOf(Bp.j.mb_code);
  ok('A pays 9,500', a.row?.amount === 9500, String(a.row?.amount));
  ok('B pays 15,900', b.row?.amount === 15900, String(b.row?.amount));
  ok('criminal/health consent recorded', a.row?.consent_criminal === true && /consent-1\.0/.test(a.row?.consent_version || ''), `${a.row?.consent_criminal} ${a.row?.consent_version}`);
  ok('INV number at signup', /^INV-\d{4}-\d{4}$/.test(a.row?.inv_no || '') && /^INV-\d{4}-\d{4}$/.test(b.row?.inv_no || ''), `${a.row?.inv_no} ${b.row?.inv_no}`);
  ok('INV numbers run in sequence', +b.row.inv_no.slice(-4) === +a.row.inv_no.slice(-4) + 1, `${a.row.inv_no} → ${b.row.inv_no}`);
  ok('no RI before approval', !a.row?.ri_no);
  h = await (await A.d.req('/join/receipt/' + A.j.mb_code)).text();
  ok('receipt page before approval = invoice (INV)', h.includes('data-doc-title="invoice"') && h.includes(a.row.inv_no) && h.includes('ใบแจ้งหนี้') && h.includes('9,500.00'));
  ok('invoice has no guarantee wording', NO_GUARANTEE(h));

  // ── อนุมัติ → RI (ครั้งเดียว) ──
  let r = await patch(a.id, { status: 'verified' });
  const ri = r.row?.ri_no;
  ok('approve → RI number', /^RI-\d{4}-\d{4}$/.test(ri || ''), JSON.stringify(r.row?.ri_no));
  r = await patch(a.id, { status: 'verified' });
  ok('approve again → same RI', r.row?.ri_no === ri, `${ri} vs ${r.row?.ri_no}`);
  r = await patch(b.id, { status: 'verified' });
  ok('next approval → next RI', +String(r.row?.ri_no).slice(-4) === +ri.slice(-4) + 1, `${ri} → ${r.row?.ri_no}`);
  h = await (await A.d.req('/join/receipt/' + A.j.mb_code)).text();
  ok('receipt after approval = RI + references INV', h.includes('data-doc-title="receipt"') && h.includes(ri) && h.includes(a.row.inv_no) && h.includes('ใบเสร็จรับเงิน'));
  h = await (await A.d.req('/join/profile/' + A.j.mb_code)).text();
  ok('profile: paid wording, no guarantee', h.includes('ชำระค่าสมัครแล้ว') && NO_GUARANTEE(h));

  // ── สายเชิญจ่ายเต็ม ──
  const exp = new Date(Date.now() + 7 * 86400e3).toISOString().slice(0, 10);
  const inv = (await (await fetch(B + '/api/admin/invites', { method: 'POST', headers: ADM, body: JSON.stringify({ name: 'e2e launch', limit: 1, expires: exp }) })).json()).data;
  h = await (await fetch(B + '/join/i/' + inv.code)).text();
  ok('invite page: free + TOP, no guarantee', h.includes('ฟรี') && h.includes('TOP') && NO_GUARANTEE(h));
  // สายเชิญพิเศษ: ไม่ต้องแนบสลิป · ยอด 0 · ชำระแล้วทันที · ระดับ TOP · ไม่มีใบแจ้งหนี้/ใบเสร็จ
  const I = await (async () => {
    const d = device(); const tel = '09' + String(Date.now()).slice(-8);
    const s = await (await d.req('/api/otp/send', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel }) })).json();
    if (s.devCode) await d.req('/api/otp/verify', { method: 'POST', headers: JSONH, body: JSON.stringify({ phone: tel, code: s.devCode }) });
    const r = await d.req('/api/join/register', { method: 'POST', body: form({ package: 'B', first_name: 'เชิญ', last_name: 'ฟรี', nickname: 'ท็อป', tel, email: `free${tel}@test.local`, password: 'free-' + tel, accept_terms: 'true', consent_pdpa: 'true', consent_criminal: 'true', invite: inv.code }) });
    return { d, r, j: await r.json() };
  })();
  ok('invite registers without slip', I.r.status === 200 && !!I.j.mb_code, JSON.stringify(I.j));
  const ir = await rowOf(I.j.mb_code);
  ok('invite: amount 0, verified, TOP', ir.row?.amount === 0 && ir.row?.status === 'verified' && ir.row?.tier === 'top' && ir.row?.invite === inv.code, `${ir.row?.amount} ${ir.row?.status} ${ir.row?.tier}`);
  ok('invite: no INV/RI numbers', !ir.row?.inv_no && !ir.row?.ri_no);
  h = await (await I.d.req('/join/receipt/' + I.j.mb_code)).text();
  ok('invite receipt page: no document', h.includes('ไม่มีค่าสมัคร') && !h.includes('data-doc-title'));
  h = await (await I.d.req('/join/profile/' + I.j.mb_code)).text();
  ok('invite profile: TOP + free status', h.includes('ระดับ TOP') && h.includes('สายคำเชิญ'));

  // ── โค้ดโปรโมทฟรี ──
  const T0 = tok(mb0);
  r = await (await fetch(B + '/api/admin/boosts', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'issue_code', mb: mb0, days: 3 }) })).json();
  const code = r.code?.code;
  ok('admin issues free code', r.ok && /^FREE[A-Z0-9]{6}$/.test(code || ''), JSON.stringify(r));
  let g = await (await fetch(B + `/api/pt/boost?mb=${mb0}&t=${encodeURIComponent(T0)}`)).json();
  ok('PT sees unused code', (g.codes || []).some((c) => c.code === code && c.days === 3), JSON.stringify(g.codes));
  h = await (await fetch(B + `/join/profile/${mb0}?t=${encodeURIComponent(T0)}`)).text();
  ok('profile promo card shows free code', h.includes('data-free-codes='));
  const other = (await register('A')).j.mb_code;
  r = await (await fetch(B + '/api/pt/boost', { method: 'POST', headers: JSONH, body: JSON.stringify({ mb: other, t: tok(other), code }) })).json();
  ok("other PT can't use someone else's code", !r.ok, JSON.stringify(r));
  r = await (await fetch(B + '/api/pt/boost', { method: 'POST', headers: { ...JSONH, 'x-forwarded-for': rip() }, body: JSON.stringify({ mb: mb0, t: T0, code: code.toLowerCase() }) })).json();
  ok('redeem → boost active ~3 days', r.ok && r.status === 'active' && Date.parse(r.until) - Date.now() > 2.9 * 86400e3, JSON.stringify(r));
  r = await (await fetch(B + '/api/pt/boost', { method: 'POST', headers: { ...JSONH, 'x-forwarded-for': rip() }, body: JSON.stringify({ mb: mb0, t: T0, code }) })).json();
  ok('redeem twice refused', !r.ok && /ใช้ไปแล้ว/.test(r.error || ''), JSON.stringify(r));
  g = await (await fetch(B + `/api/pt/boost?mb=${mb0}&t=${encodeURIComponent(T0)}`)).json();
  ok('code gone after use', !(g.codes || []).some((c) => c.code === code));
  h = await (await fetch(B + '/')).text();
  ok('home shows boosted badge', h.includes('แนะนำ'));

  // รอบอัตโนมัติ: เปิดรับงานครบ 30 วัน + งานไม่ถึง 5 เคส → โค้ดคนละครั้ง
  const sweep = async (days) => (await (await fetch(B + '/api/admin/boosts', { method: 'POST', headers: ADM, body: JSON.stringify({ action: 'sweep_free', at: new Date(Date.now() + days * 86400e3).toISOString() }) })).json());
  await sweep(0); // เติม listed_at ให้คนที่เปิดรับงานก่อนมีระบบ
  r = await sweep(100); // ช่วง 30 วันแรก (อนาคต) ไม่มีงาน → ได้โค้ดทุกคนที่ยังไม่เคยได้
  ok('30-day sweep issues codes', r.ok && r.issued >= 1, JSON.stringify(r));
  const again = await sweep(100);
  ok('sweep again → no duplicates', again.ok && again.issued === 0, JSON.stringify(again));
  g = await (await fetch(B + `/api/pt/boost?mb=${mb0}&t=${encodeURIComponent(T0)}`)).json();
  // MBM-2610001 มีงานจริงจากชุดก่อน (ถ้าเปิดรับงานหลังมีระบบ listed_at = วันนี้ → 30 วันแรกนับงานจริง) → มีหรือไม่มีโค้ดก็ได้ · ตรวจว่าไม่เกิน 1 ใบจากรอบอัตโนมัติ
  ok('PT has at most 1 auto code', (g.codes || []).filter((c) => c.reason === 'low_jobs_30d').length <= 1);
  const n = await (await fetch(B + `/api/pt/notifications?mb=${mb0}&t=${encodeURIComponent(T0)}`)).json();
  ok('free-code notification sent', (n.notices || []).some((x) => /โค้ดโปรโมทฟรี/.test(x.title)), (n.notices || []).map((x) => x.title).slice(0, 3).join(' | '));

  // ── หลังบ้าน: ยอดจริง ไม่มีการันตี ──
  h = await (await fetch(B + '/admin/applicants', { headers: ADM })).text();
  ok('admin applicants: no guarantee tiles', !h.includes('ค่าการันตี Branding') && h.includes('ค่าสมัครรวม'));
  h = await (await fetch(B + '/admin/boosts', { headers: ADM })).text();
  ok('admin boosts: free code section', h.includes('โค้ดโปรโมทฟรี') && h.includes(code));

  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
})().catch((e) => console.log('ERR', e));
