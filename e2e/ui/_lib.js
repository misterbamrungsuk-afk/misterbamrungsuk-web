// เครื่องมือกลางของชุดทดสอบ "กดหน้าจอจริง" (UI) — ใช้ร่วมกันทุกบทบาท
// รันผ่าน e2e/ui/run.js (เปิด production build โหมดสาธิต + พร็อกซีตัด Secure ให้ WebKit) · ห้ามชี้เว็บจริง
const pw = require(process.env.PW_CORE || 'C:/Users/ASUS/Desktop/biz/mootech-fe/node_modules/playwright-core');
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const WEB = path.join(__dirname, '..', '..');
const BASE = process.env.UI_BASE || 'http://localhost:3301';
if (/misterbamrungsuk\.com/.test(BASE)) throw new Error('UI tests must not run against the live site');
const OUT_ROOT = process.env.UI_OUT || path.join(__dirname, 'out');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const ENV = (() => { try { return fs.readFileSync(path.join(WEB, '.env.local'), 'utf8'); } catch { return ''; } })();
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
const { adm, sup } = require(path.join(WEB, 'e2e', '_tok.js'));
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = (p) => { const b = b64(p); return b + '.' + crypto.createHmac('sha256', KEY).update(b).digest('base64url'); };
/** cookie ลูกค้า (เหมือน e2e เดิม) */
const customerCookie = (email) => ({ name: 'hamoo_session', value: sign({ sub: 'demo:' + email, email, exp: Date.now() + 3600e3 }) });
/** cookie แอดมิน ตามบทบาท (ceo | super | finance | cs | kyc) */
const AKEY = KEY.length >= 32 ? KEY : 'mord-demo-only-admin-session-secret-not-for-production';
const adminToken = (role = 'ceo', email = `ui-${role}@local.test`) => { const p = b64({ email, role, exp: Date.now() + 3600e3 }); return p + '.' + Buffer.from(crypto.createHmac('sha256', AKEY).update(p).digest()).toString('base64url'); };
/** โทเคนเข้าโปรไฟล์ Part-Time */
const ptToken = (mb) => { const b = b64({ mb, iat: Date.now(), exp: Date.now() + 3600e3 }); return b + '.' + crypto.createHmac('sha256', KEY).update('resume:' + b).digest('base64url'); };

const IMGS = fs.readdirSync(path.join(WEB, 'public/brand/home')).filter((f) => f.endsWith('.jpg')).map((f) => path.join(WEB, 'public/brand/home', f));
const DEVICES = {
  iphone: { engine: 'webkit', desc: pw.devices['iPhone 15'], label: 'iPhone 15 (Safari)' },
  pixel: { engine: 'chromium', desc: pw.devices['Pixel 7'], label: 'Pixel 7 (Chrome)' },
  desktop: { engine: 'chromium', desc: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, userAgent: pw.devices['Desktop Chrome'].userAgent }, label: 'Desktop 1440' },
};

/** API ตรง (เตรียมข้อมูล/ตรวจผล) */
async function api(pathname, { method = 'GET', body, cookie, headers = {}, form } = {}) {
  const h = { ...headers, origin: BASE, 'x-forwarded-for': '10.7.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250) };
  if (cookie) h.cookie = cookie;
  let payload;
  if (form) payload = form; else if (body !== undefined) { payload = JSON.stringify(body); h['content-type'] = 'application/json'; }
  const r = await fetch(BASE + pathname, { method, headers: h, body: payload, redirect: 'manual' });
  let j = null; try { j = await r.clone().json(); } catch {}
  return { status: r.status, ok: r.ok, json: j, text: j ? '' : await r.text().catch(() => '') };
}

/**
 * เริ่มหนึ่งรอบทดสอบ: suite = ชื่อชุด, dev = iphone|pixel|desktop
 * คืน { page, ctx, step, ok, note, ux, go, done } — step(name) ถ่ายภาพ+ตรวจ UX, ok(name, cond, extra) บันทึกผล
 */
async function start(suite, dev = 'pixel', { cookies = [] } = {}) {
  const D = DEVICES[dev];
  const browser = D.engine === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({ ...D.desc, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await ctx.addInitScript(() => { try { localStorage.setItem('mb_consent', JSON.stringify({ v: 1, analytics: false, at: Date.now() })); } catch {} });
  if (cookies.length) await ctx.addCookies(cookies.map((c) => ({ ...c, url: BASE })));
  const page = await ctx.newPage();
  const OUT = path.join(OUT_ROOT, `${suite}-${dev}`);
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  const res = { suite, dev: D.label, pass: 0, fail: 0, fails: [], notes: [], errors: [] };
  page.on('pageerror', (e) => res.errors.push('pageerror ' + e.message.slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Turnstile|challenges\.cloudflare|favicon|Failed to load resource.*(401|403|404)|Download the React DevTools/i.test(m.text())) res.errors.push('console ' + m.text().slice(0, 200)); });
  page.on('response', (r) => { if (r.status() >= 500) res.errors.push(`HTTP ${r.status()} ${r.url().replace(BASE, '')}`); });
  let n = 0;
  const ok = (name, cond, extra = '') => { if (cond) res.pass++; else { res.fail++; res.fails.push(name + (extra ? ' · ' + String(extra).slice(0, 200) : '')); } console.log(`${cond ? 'PASS' : 'FAIL'} [${suite}/${dev}] ${name}${extra && !cond ? ' · ' + String(extra).slice(0, 200) : ''}`); return cond; };
  const note = (s) => { res.notes.push(s); console.log(`NOTE [${suite}/${dev}] ${s}`); };
  const ux = async (name) => {
    const r = await page.evaluate(() => {
      const W = innerWidth;
      const over = document.documentElement.scrollWidth > W + 1;
      const wide = over ? [...document.querySelectorAll('body *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > W + 2 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 3).map((e) => e.tagName + '.' + String(e.className || '').slice(0, 30)) : [];
      const small = [...document.querySelectorAll('a,button,select,input:not([type=file]):not([type=hidden])')].filter((e) => {
        const b = e.getBoundingClientRect(); if (!b.width || !b.height) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) return false;
        if (e.closest('footer') || (e.tagName === 'A' && e.closest('p'))) return false;
        return b.height < 32;
      }).slice(0, 5).map((e) => `「${(e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 20)}」${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
      return { over, wide, small, err: /Application error|Unhandled Runtime Error/.test(document.body.innerText) };
    }).catch(() => ({ over: false, wide: [], small: [], err: false }));
    ok(`[${name}] page renders`, !r.err);
    if (r.over) ok(`[${name}] no horizontal overflow`, false, r.wide.join(' | '));
    if (r.small.length) note(`[${name}] small tap targets: ${r.small.join(', ')}`);
  };
  const step = async (name) => { n++; await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, `${String(n).padStart(2, '0')}-${name.replace(/[^\w\u0E00-\u0E7F-]+/g, '_')}.png`), fullPage: true }).catch(() => {}); await ux(name); };
  const go = async (u, name) => { const r = await page.goto(BASE + u, { waitUntil: 'networkidle', timeout: 90000 }).catch((e) => { ok(`[${name}] open ${u}`, false, e.message); return null; }); if (r) ok(`[${name}] open ${u} → ${r.status()}`, r.status() < 400, String(r.status())); await step(name); return r; };
  const done = async () => {
    ok('no page errors / 5xx during run', res.errors.length === 0, [...new Set(res.errors)].slice(0, 5).join(' | '));
    fs.writeFileSync(path.join(OUT, '_result.json'), JSON.stringify(res, null, 1));
    await browser.close();
    console.log(`${res.fail ? 'FAILED' : 'ALL PASS'} [${suite}/${dev}] ${res.pass} pass · ${res.fail} fail`);
    return res;
  };
  return { page, ctx, browser, step, ok, note, ux, go, done, OUT, res };
}

/** แบบจำลองกดสั้น ๆ: หาปุ่ม/ลิงก์จากข้อความแล้วกด */
const clickText = (page, t, opts = {}) => page.getByText(t, { exact: false, ...opts }).first().click();
const uniq = (p) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

module.exports = { pw, BASE, WEB, IMGS, DEVICES, start, api, sign, customerCookie, adminToken, ptToken, adm, sup, clickText, uniq };
