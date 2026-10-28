// คุกกี้ห้อง CEO (/ceo · รหัสแยก) สำหรับชุดทดสอบ — ตั้งรหัส CEO ครั้งแรกด้วยบัญชีแอดมิน CEO (ถ้ายังไม่ตั้ง) แล้วเข้าห้อง
// แคชไว้ในไฟล์ชั่วคราว (ใช้ซ้ำได้ตลอดอายุเซิร์ฟเวอร์สาธิต · กันชนเพดานลองรหัส)
const fs = require('fs'), path = require('path'), os = require('os');
const { adm } = require('./_tok');
const B = 'http://localhost:3210';
const PW = 'e2e-ceo-room-pass';
const CACHE = path.join(os.tmpdir(), 'mb-e2e-ceo-cookie.txt');
const H = (extra = {}) => ({ 'content-type': 'application/json', origin: B, 'x-forwarded-for': '10.77.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250), ...extra });
const cookieOf = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
async function valid(c) { if (!c) return false; const h = await (await fetch(B + '/ceo', { headers: { cookie: c } })).text(); return h.includes('data-ceo-bar'); }
async function ceoCookie() {
  let c = ''; try { c = fs.readFileSync(CACHE, 'utf8').trim(); } catch {}
  if (await valid(c)) return c;
  let r = await fetch(B + '/api/ceo/login', { method: 'POST', headers: H(), body: JSON.stringify({ password: PW }) });
  if (r.status === 401) r = await fetch(B + '/api/ceo/password', { method: 'POST', headers: H({ cookie: 'mord_admin=' + adm }), body: JSON.stringify({ password: PW }) }); // ยังไม่ตั้งรหัส → ตั้งครั้งแรก
  c = cookieOf(r);
  if (!c.startsWith('mb_ceo=')) throw new Error('ceo login failed ' + r.status);
  fs.writeFileSync(CACHE, c);
  return c;
}
module.exports = { ceoCookie, CEO_PW: PW };
