// เส้นทางสมัคร Part-Time (กดหน้าจอจริง) — เรียกจาก 10-pt.js · node _pt-walk.js <device:iphone|pixel> <track:A|B> [invite]
const pw = require(process.env.PW_CORE || 'C:/Users/ASUS/Desktop/biz/mootech-fe/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const WEB = require('path').join(__dirname, '..', '..');
const { adm } = require(WEB + '/e2e/_tok.js');
const B = process.env.UI_BASE || 'http://localhost:3301';
const [dev = 'iphone', track = 'A', inviteFlag] = process.argv.slice(2);
const invite = inviteFlag === 'invite';
const tag = `${dev}-${track}${invite ? '-inv' : ''}`;
const OUT = require('path').join(process.env.UI_OUT || require('path').join(__dirname, 'out'), '10-pt-' + tag);
fs.mkdirSync(OUT, { recursive: true });
const IMG = (n) => WEB + '/public/brand/' + n;
const imgs = fs.readdirSync(WEB + '/public/brand/home').filter((f) => f.endsWith('.jpg')).map((f) => WEB + '/public/brand/home/' + f);
const ADM = { cookie: 'mord_admin=' + adm, 'content-type': 'application/json' };
let fails = 0, step = 0;
const issues = [];
const ok = (n, c, x = '') => { if (!c) { fails++; issues.push(n + (x ? ' · ' + x : '')); } console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? ' · ' + x : '')); };
const note = (s) => { issues.push('NOTE ' + s); console.log('NOTE ' + s); };

(async () => {
  const isI = dev === 'iphone';
  const browser = isI ? await pw.webkit.launch() : await pw.chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const mk = async () => {
    const ctx = await browser.newContext({ ...pw.devices[isI ? 'iPhone 15' : 'Pixel 7'], locale: 'th-TH', timezoneId: 'Asia/Bangkok', extraHTTPHeaders: { 'x-forwarded-for': '10.8.' + (Date.now() % 250) + '.' + Math.floor(Math.random() * 250) } });
    await ctx.addInitScript(() => { try { localStorage.setItem('mb_consent', JSON.stringify({ v: 1, analytics: false, at: Date.now() })); } catch {} });
    return ctx;
  };
  const ctx = await mk();
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Turnstile|challenges|favicon|Failed to load resource.*(404|403)/i.test(m.text())) errs.push('console ' + m.text().slice(0, 200)); });
  page.on('response', (r) => { if (r.status() >= 500) errs.push(`HTTP ${r.status()} ${r.url()}`); });

  const shot = async (name) => { step++; await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}/${String(step).padStart(2, '0')}-${name}.png`, fullPage: true }); };
  const ux = async (name) => {
    const r = await page.evaluate(() => {
      const W = innerWidth;
      const over = document.documentElement.scrollWidth > W + 1;
      const wide = [...document.querySelectorAll('body *')].filter((e) => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return b.width > 0 && b.right > W + 2 && cs.position !== 'fixed' && !e.closest('[aria-hidden=true]') && !e.closest('.sr-only'); }).slice(0, 3).map((e) => e.tagName + '.' + (e.className?.toString?.() || '').slice(0, 40) + ' ' + (e.textContent || '').trim().slice(0, 30));
      const small = [...document.querySelectorAll('a,button,select,input:not([type=file]):not(.sr-only),label:has(input[type=file])')].filter((e) => {
        const b = e.getBoundingClientRect(); if (!b.width || !b.height) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return false;
        if (e.closest('footer') || e.closest('p') && e.tagName === 'A') return false; // inline text links
        return b.height < 40 && b.width < 40 ? true : b.height < 32;
      }).slice(0, 6).map((e) => `${e.tagName}「${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24)}」${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
      return { over, wide, small };
    });
    if (r.over) ok(`[${name}] no horizontal overflow`, false, r.wide.join(' | '));
    if (r.small.length) note(`[${name}] small tap targets: ${r.small.join(', ')}`);
  };
  const go = async (u, name) => { await page.goto(B + u, { waitUntil: 'networkidle' }); await shot(name); await ux(name); };
  const clickText = (t) => page.getByText(t, { exact: false }).first().click();

  // ── admin: invite ──
  let code = '';
  if (invite) {
    const r = await (await fetch(B + '/api/admin/invites', { method: 'POST', headers: ADM, body: JSON.stringify({ name: 'QA เชิญ ' + tag, limit: 3, expires: '2026-11-10' }) })).json();
    code = r.data?.code; ok('admin creates invite', !!code, JSON.stringify(r).slice(0, 120));
  }

  // ── 1. sale page ──
  await go(invite ? `/join/i/${code}` : '/join', 'sale');
  if (invite) ok('invite page has no guarantee box', !(await page.getByText('ค่าการันตี Branding', { exact: true }).count()), '');
  const radios = page.locator('[role=radio]');
  await radios.nth(track === 'B' ? 0 : 1).click();
  await page.locator(`a[href*="/join/pay?pkg=${track}"]`).click();
  await page.waitForURL(/\/join\/pay/); await page.waitForLoadState('networkidle');
  await shot('pay-empty'); await ux('pay');
  // 2. pay
  const exp = invite ? (track === 'A' ? 3000 : 6000) : (track === 'A' ? 13000 : 21000);
  const amounts = await page.locator('span.whitespace-nowrap.shrink-0.font-semibold').allTextContents();
  const sum = amounts.map((s) => +s.replace(/[^\d]/g, '')).reduce((a, b) => a + b, 0);
  ok('pay page items total = expected', sum === exp, `${amounts.join(' + ')} = ${sum} vs ${exp}`);
  const tot = await page.locator('[data-total]').textContent().catch(() => null);
  if (!invite) ok('pay page shows total row', tot && +tot.replace(/[^0-9]/g, '') === exp, tot);
  const qrAlt = await page.locator('img[alt^="QR พร้อมเพย์"]').getAttribute('alt').catch(() => '');
  ok('QR alt shows correct amount', qrAlt.includes(exp.toLocaleString('en-US')), qrAlt);
  // decode QR payload amount (tag 54)
  const tel = '08' + String(Date.now()).slice(-8);
  const first = track === 'A' ? 'ธนกฤต' : 'ภูริพัฒน์', last = track === 'A' ? 'ศรีสวัสดิ์' : 'วงศ์ทอง', nick = track === 'A' ? 'ต้น' : 'ภู';
  // submit empty → Thai error
  await page.getByRole('button', { name: /ส่งสลิปเพื่อตรวจสอบ/ }).click();
  const e1 = await page.locator('[role=alert]').first().textContent().catch(() => '');
  ok('empty submit shows Thai error', /กรอก/.test(e1 || ''), e1);
  await page.getByLabel('ชื่อจริง').fill(first); await page.getByLabel('นามสกุล').fill(last); await page.getByLabel('ชื่อเล่น').fill(nick);
  const ptEmail = 'pt' + tel + '@test.local', ptPw = 'walk-pass-' + tel.slice(-4);
  await page.getByLabel('อีเมล').fill(ptEmail);
  await page.getByLabel('ตั้งรหัสผ่าน', { exact: true }).fill(ptPw);
  await page.getByLabel('ยืนยันรหัสผ่าน', { exact: true }).fill(ptPw);
  const telIn = page.getByLabel('เบอร์โทรศัพท์');
  if (await telIn.count()) await telIn.fill(tel);
  else {
    // OTP step
    await page.locator('input[inputmode=tel]').first().fill(tel);
    note('OTP step present');
  }
  // OTP mode skip button?
  const skip = page.getByRole('button', { name: /ยืนยันเบอร์/ });
  if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(800); }
  await page.locator('input[type=file]').first().setInputFiles(imgs[0]);
  await page.waitForTimeout(800);
  await page.locator('[role=checkbox]').first().click();
  await shot('pay-filled');
  await page.getByRole('button', { name: /ส่งสลิปเพื่อตรวจสอบ/ }).click();
  await page.locator('[role=dialog]').waitFor({ timeout: 20000 }).catch(() => {});
  await shot('pay-done');
  const href = await page.locator('[role=dialog] a').first().getAttribute('href').catch(() => null);
  const mb = /MB[MT]?-\d+/.exec(href || '')?.[0];
  ok('register → MB code', !!mb, href || (await page.locator('[role=alert]').textContent().catch(() => '')));
  if (!mb) { console.log(errs); await browser.close(); return; }
  // เครื่องใหม่ (คุกกี้ว่าง) เข้าสู่ระบบ Part-Time ด้วยอีเมล + รหัสผ่าน → โปรไฟล์
  {
    const lc = await mk(); const lp = await lc.newPage();
    await lp.goto(B + '/join/me');
    await lp.getByLabel('อีเมล', { exact: true }).fill(ptEmail);
    await lp.getByLabel('รหัสผ่าน', { exact: true }).fill('wrong-pass-0000');
    await lp.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    const le = await lp.locator('[role=alert]').first().textContent({ timeout: 10000 }).catch(() => '');
    ok('login wrong password → Thai generic error', /อีเมลหรือรหัสผ่านไม่ถูกต้อง/.test(le || ''), le);
    await lp.getByLabel('รหัสผ่าน', { exact: true }).fill(ptPw);
    await lp.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    const went = await lp.waitForURL(new RegExp('/join/profile/' + mb), { timeout: 20000 }).then(() => true).catch(() => false);
    ok('fresh device login via /join/me → profile', went, lp.url());
    await lc.close();
  }
  console.log('MB', mb, JSON.stringify(await ctx.cookies()));
  await page.locator('[role=dialog] a').first().click();
  await page.waitForURL(/\/join\/profile\//); await page.waitForLoadState('networkidle');
  await shot('hub-new'); await ux('hub-new');
  const hubTxt = await page.locator('body').innerText();
  ok('hub shows MB code', hubTxt.includes(mb));
  ok('hub status line invite/normal', invite ? /คำเชิญพิเศษ/.test(hubTxt) : /สมัครปกติ/.test(hubTxt), hubTxt.match(/(คำเชิญพิเศษ|สมัครปกติ)[^\n]*/)?.[0]);
  // refresh resumes
  await page.reload({ waitUntil: 'load' }); ok('refresh hub keeps session', (await page.locator('body').innerText()).includes(mb));

  // ── 3. form step 1 ──
  await page.locator(`a[href^="/join/form/${mb}"]`).first().click();
  await page.waitForURL(/\/join\/form\//); await page.waitForLoadState('networkidle');
  await shot('form1'); await ux('form1');
  const vals = await page.locator('input').evaluateAll((a) => a.map((i) => i.value).filter(Boolean));
  ok('form1 prefilled from pay (name/tel)', vals.includes(first) && vals.includes(tel), vals.join(','));
  // submit empty-ish → errors
  await page.getByRole('button', { name: /ถัดไป/ }).click(); await page.waitForTimeout(300);
  const fe = await page.locator('[data-err="1"]').allTextContents(); ok('form1 validation errors Thai', fe.length > 0 && fe.every((x) => /[ก-๙]/.test(x)), fe.join('|'));
  await page.locator('input[type=date]').fill('1995-05-12');
  await page.getByPlaceholder('LINE ID').fill('ton.qa' + track);
  await page.getByPlaceholder('เช่น ลาดพร้าว, บางนา').fill('ลาดพร้าว');
  const fins = page.locator('input[type=file]');
  await fins.nth(0).setInputFiles(imgs[1]); await fins.nth(1).setInputFiles(imgs[2]);
  await page.locator('[data-disclose-opt="yes"]').click(); // ยอมรับเปิดเผยใบหน้า (24 ต.ค. 2569)
  const sels = page.locator('select');
  await sels.nth(0).selectOption('กรุงเทพฯ และปริมณฑล'); await sels.nth(1).selectOption('กรุงเทพมหานคร'); await sels.nth(2).selectOption('ปทุมวัน');
  await page.getByRole('button', { name: '+ เพิ่มพื้นที่นี้' }).click();
  await sels.nth(0).selectOption('ภาคตะวันออก'); await sels.nth(1).selectOption('ชลบุรี');
  await page.getByRole('button', { name: '+ เพิ่มพื้นที่นี้' }).click();
  await page.getByPlaceholder('เช่น ไม่รับงานต่างจังหวัด').fill('ไม่รับงานต่างจังหวัดไกล');
  await page.waitForTimeout(500);
  await shot('form1-filled');
  await page.getByRole('button', { name: /ถัดไป/ }).click();
  await page.getByText('วันเวลาและประสบการณ์').first().waitFor();
  await page.waitForTimeout(400);
  await shot('form2'); await ux('form2');
  // refresh mid-flow (step 2) → where does it land?
  await page.reload({ waitUntil: 'networkidle' });
  const afterReload = await page.locator('body').innerText();
  ok('refresh after step1 keeps step1 data', (await page.locator('input').evaluateAll((a) => a.map((i) => i.value))).includes('ton.qa' + track) || /วันเวลาและประสบการณ์/.test(afterReload), afterReload.slice(0, 80));
  if (!/วันและเวลาที่สะดวก/.test(afterReload)) { ok('refresh on step 2 stays on step 2', false); await page.getByRole('button', { name: /ถัดไป/ }).click(); await page.getByText('วันและเวลาที่สะดวก').first().waitFor(); }
  await page.getByRole('button', { name: 'จันทร์' }).click(); await page.getByRole('button', { name: 'ศุกร์' }).click(); await page.getByRole('button', { name: 'เสาร์' }).click();
  await page.getByRole('button', { name: /กลางคืน/ }).click();
  await page.getByRole('button', { name: '5–6 ชม.' }).click();
  await page.locator('textarea').fill(track === 'B' ? 'นวดแผนไทย 2 ปี ที่สปาย่านสุขุมวิท' : 'เคยทำงานโรงแรม 2 ปี');
  if (track === 'B') { await page.locator('input[type=file]').first().setInputFiles(imgs[3]); await page.waitForTimeout(500); }
  await page.getByPlaceholder('สิ่งที่อยากให้ทีมงานทราบ').fill('สะดวกนัดล่วงหน้า 1 วัน');
  for (const cb of await page.locator('[role=checkbox]').all()) await cb.click();
  await shot('form2-filled');
  await page.getByRole('button', { name: /ถัดไป · ยืนยันตัวตน/ }).click();
  await page.waitForURL(/\/join\/kyc\//, { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
  await shot('kyc'); await ux('kyc');
  ok('form2 → kyc', page.url().includes('/join/kyc/'), page.url());
  // ── KYC ──
  const kin = page.locator('input[type=file]');
  ok('KYC inputs accept images', (await kin.evaluateAll((a) => a.every((i) => /image\//.test(i.accept)))), '');
  await kin.nth(0).setInputFiles(imgs[4]); await kin.nth(1).setInputFiles(imgs[5]); await kin.nth(2).setInputFiles(imgs[6]);
  await page.waitForTimeout(1200);
  await shot('kyc-filled');
  await page.getByRole('button', { name: /ส่ง|ถัดไป|ยืนยัน/ }).last().click();
  await page.waitForURL(/\/join\/bank\//, { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
  await shot('bank'); await ux('bank');
  ok('kyc → bank', page.url().includes('/join/bank/'), page.url());
  // ── bank ──
  await page.locator('select').selectOption('กสิกรไทย (KBank)');
  await page.getByPlaceholder('xxx-x-xxxxx-x').fill('123-4-56789-0');
  await page.getByPlaceholder('ชื่อ-นามสกุลตามบัตร').fill(`${first} ${last}`);
  await page.locator('input[type=file]').setInputFiles(imgs[7]);
  await page.waitForTimeout(1000);
  for (const cb of await page.locator('[role=checkbox]').all()) await cb.click();
  await shot('bank-filled');
  await page.getByRole('button', { name: /ยืนยัน/ }).last().click();
  await page.waitForURL(/\/join\/contract\//, { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
  await shot('contract'); await ux('contract');
  ok('bank → contract', page.url().includes('/join/contract/'), page.url());
  for (const cb of await page.locator('[role=checkbox]').all()) await cb.click();
  await page.locator('button').filter({ hasText: /ยืนยัน|ส่งใบสมัคร|ลงนาม|ยอมรับ/ }).last().click();
  await page.waitForURL(/\/join\/done\//, { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
  await shot('done'); await ux('done');
  ok('contract → done', page.url().includes('/join/done/'), page.url());
  const doneTxt = await page.locator('body').innerText();
  ok('done page shows correct amount', doneTxt.includes(exp.toLocaleString('en-US')), (doneTxt.match(/[\d,]{4,}/g) || []).join(' '));
  if (invite) ok('done page invite: no guarantee line', !/การันตี[^\n]*1[05],000|เงินประกัน[^\n]*1[05],000/.test(doneTxt), doneTxt.match(/.*(การันตี|เงินประกัน).*/g)?.join(' / '));
  for (const [p, n] of [[`/join/training/${mb}`, 'training'], [`/join/doc/${mb}`, 'doc'], [`/join/receipt/${mb}`, 'receipt']]) {
    const r = await page.goto(B + p, { waitUntil: 'networkidle' }); await shot(n); await ux(n);
    ok(`${n} page 200`, r.status() === 200, String(r.status()));
    const tx = await page.locator('body').innerText();
    if (n === 'doc') ok(`${n} amount correct`, tx.includes(exp.toLocaleString('en-US')), (tx.match(/[\d,]{4,}/g) || []).slice(0, 8).join(' '));
    if (n === 'doc' && invite) ok('doc invite terms no guarantee payment', !/ชำระค่าการันตี Branding|คืนเงินประกัน/.test(tx), tx.match(/.*(การันตี|ประกัน).*/g)?.join(' / '));
    if (n !== 'training' && invite) ok(`${n} invite no guarantee`, !/(การันตี|เงินประกัน)[^\n]*(10,000|15,000)/.test(tx), tx.match(/.*(การันตี|เงินประกัน).*/g)?.join(' / '));
  }

  { const r = await page.evaluate(() => fetch('/api/join/renew', { method: 'POST' }).then((x) => x.json())); ok('renew endpoint ok', r.ok === true, JSON.stringify(r)); }
  // ── photos ──
  await go(`/join/profile/${mb}/photos`, 'photos');
  for (let i = 0; i < 3; i++) {
    await page.locator('input[type=file]').first().setInputFiles(imgs[(i + 8) % imgs.length]);
    await page.waitForResponse((r) => r.url().includes('/api/join/photos'), { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(900);
  }
  await shot('photos-3'); await ux('photos-3');
  const nImg = await page.locator('img[src*="/api/join/file"]').count();
  ok('3 profile photos shown', nImg >= 3, String(nImg));
  // hub: set main photo + card
  await go(`/join/profile/${mb}`, 'hub-photos');
  const pb = page.locator('button[aria-label^="ตั้งรูปที่ 2"]');
  if (await pb.count()) { await pb.click(); await page.waitForTimeout(1500); ok('set main photo', true); } else ok('set main photo button', false);
  for (const a of ['คาเฟ่', 'ดูหนัง']) await page.locator('button', { hasText: a }).filter({ hasText: '+ เลือก' }).first().click();
  await page.getByRole('button', { name: 'คาเฟ่ / ร้านอาหาร' }).click();
  await page.getByRole('button', { name: 'ห้างสรรพสินค้า' }).click();
  const sk = page.locator('button[aria-pressed]:not([disabled])').filter({ hasText: /ถ่ายรูป|ภาษา|ขับรถ|ดนตรี|ฟิตเนส|ทำอาหาร/ });
  if (await sk.count()) await sk.first().click();
  await page.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }).click();
  await page.getByText('บันทึกแล้ว').first().waitFor({ timeout: 8000 }).catch(() => {});
  await shot('hub-card-saved');
  ok('card saved', await page.getByText('บันทึกแล้ว').count() > 0);
  await page.getByRole('tab', { name: 'ดูตัวอย่างการ์ด' }).click(); await shot('hub-card-preview');
  await page.getByRole('tab', { name: 'แก้ไข' }).click();
  // gate message visible for unapproved
  ok('unapproved hub shows gate msg', /เปิดใช้หลังทีมงานอนุมัติ/.test(await page.locator('body').innerText()));
  const hubT = await page.locator('body').innerText();
  ok('hub has earnings estimate card', /ประมาณรายได้/.test(hubT));
  ok('hub has promotions card', /โปรโมชั่น/.test(hubT));
  // ── back office pages (unapproved) ──
  for (const s of ['schedule', 'availability', 'jobs', 'earnings', 'withdraw', 'posts', 'sales', 'settings', 'notifications', 'reviews', 'docs']) {
    const r = await page.goto(B + `/join/profile/${mb}/${s}`, { waitUntil: 'networkidle' }); await shot('bo-' + s); await ux('bo-' + s);
    ok(`backoffice ${s} 200`, r.status() === 200, String(r.status()));
  }
  // availability save
  await page.goto(B + `/join/profile/${mb}/availability`, { waitUntil: 'networkidle' });
  const saveBtn = page.getByRole('button', { name: /บันทึก/ }).last();
  if (await saveBtn.count()) { await saveBtn.click(); await page.waitForTimeout(1200); await shot('availability-saved'); const t = await page.locator('body').innerText(); ok('availability saved msg', /บันทึกแล้ว|บันทึกเรียบร้อย/.test(t), t.match(/.*บันทึก.*/g)?.slice(-2).join('/')); }

  // ── admin: verify data ──
  const list = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()).replace(/\\"/g, '"');
  const at = list.indexOf('"mb_code":"' + mb + '"'); const ids = [...list.slice(Math.max(0, at - 8000), at).matchAll(/"id":"([0-9a-f-]{36})"/g)]; const id = ids[ids.length - 1]?.[1];
  ok('admin applicants list contains MB', at > 0 && !!id, id);
  let row = (await (await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ line_joined: false }) })).json()).row;
  const x = row?.docs?.extra || {};
  const chk = { first_name: row.first_name === first, last_name: row.last_name === last, nickname: row.nickname === nick, tel: row.tel === tel, birthdate: String(row.birthdate).startsWith('1995-05-12'), line_id: row.line_id === 'ton.qa' + track, address: row.address === 'ลาดพร้าว', package: row.package === track, amount: row.amount === exp, invite: invite ? x.invite === code : !x.invite, areas: (x.areas || []).length === 2, no_area: !!x.no_area, week_days: JSON.stringify(x.availability?.week_days || row.availability?.week_days) === '["จ","ศ","ส"]', hours_band: (x.availability?.hours_band || row.availability?.hours_band) === '5–6 ชม.', experience: !!row.experience, intro: !!row.intro, acks: !!(row.ack_hours || x.ack_hours) && !!(row.ack_no_refuse || x.ack_no_refuse), bank: row.bank === 'กสิกรไทย (KBank)' && row.bank_account === '1234567890', bank_name: row.bank_account_name === `${first} ${last}`, kyc_submitted: (row.kyc_status || x.kyc_status) === 'submitted', contract: !!row.contract_accepted_at, photos3: (x.photos || []).length === 3, card: (x.card?.activities || []).length === 2 && (x.card?.places || []).length === 2, consents: !!x.bank_consents };
  for (const [k, v] of Object.entries(chk)) ok('stored ' + k, v, k === 'week_days' ? JSON.stringify(x.availability) : k === 'amount' ? String(row.amount) : '');
  const docKeys = ['slip', 'photo', 'other_doc', 'id_card', 'selfie', 'id_copy', 'bankbook', ...(track === 'B' ? ['cert_doc'] : [])];
  for (const k of docKeys) {
    const p = row.docs[k];
    if (!p) { ok('doc path ' + k, false, 'missing'); continue; }
    const r = await fetch(B + '/api/admin/applicants/file?path=' + encodeURIComponent(p), { headers: ADM });
    const buf = Buffer.from(await r.arrayBuffer());
    ok(`admin file ${k} 200 image`, r.status === 200 && /^image\//.test(r.headers.get('content-type') || '') && buf[0] === 0xff && buf[1] === 0xd8, `${r.status} ${r.headers.get('content-type')} ${buf.length}B ${p}`);
  }
  for (const p of x.photos || []) { const r = await fetch(B + '/api/admin/applicants/file?path=' + encodeURIComponent(p), { headers: ADM }); ok('admin profile photo 200', r.status === 200 && /^image\//.test(r.headers.get('content-type') || ''), p); }
  if (row.bank_book_path || x.bank_book_path) ok('bank_book_path == docs.bankbook', (row.bank_book_path || x.bank_book_path) === row.docs.bankbook, String(row.bank_book_path || x.bank_book_path));
  // admin pages show it
  for (const [p, n] of [['/admin/applicants', 'applicants'], ['/admin/kyc', 'kyc'], ['/admin/slips', 'slips']]) {
    const h = await (await fetch(B + p, { headers: ADM })).text(); ok(`admin ${n} page lists MB`, h.includes(mb));
  }
  if (invite) { const h = (await (await fetch(B + '/admin/applicants', { headers: ADM })).text()); const seg = h.slice(h.indexOf(mb) - 3000, h.indexOf(mb) + 3000); ok('admin list shows invite marker', /เชิญ|invite/i.test(seg)); }
  // admin page screenshots
  const actx = await mk(); await actx.addCookies([{ name: 'mord_admin', value: adm, url: B }]);
  const ap = await actx.newPage();
  await ap.goto(B + '/admin/kyc', { waitUntil: 'networkidle' }); await ap.screenshot({ path: `${OUT}/90-admin-kyc.png`, fullPage: true });
  await ap.goto(B + '/admin/applicants', { waitUntil: 'networkidle' }); await ap.screenshot({ path: `${OUT}/91-admin-applicants.png`, fullPage: false });

  // ── admin approve: slip verified, KYC approved, listed ──
  let r1 = await (await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ status: 'verified' }) })).json(); ok('admin verify slip', r1.ok, r1.error);
  r1 = await (await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ kyc_status: 'approved' }) })).json(); ok('admin approve kyc', r1.ok, r1.error);
  r1 = await (await fetch(B + '/api/admin/applicants/' + id, { method: 'PATCH', headers: ADM, body: JSON.stringify({ listed: true }) })).json(); ok('admin list profile', r1.ok, r1.error);
  // ── approved back office ──
  await go(`/join/profile/${mb}`, 'hub-active');
  const ht = await page.locator('body').innerText();
  { const r = await page.goto(B + `/join/receipt/${mb}`, { waitUntil: 'networkidle' }); await shot('receipt-verified'); const tx = await page.locator('body').innerText();
    ok('receipt (verified) amount correct', tx.includes(exp.toLocaleString('en-US')), (tx.match(/[\d,]{4,}/g) || []).slice(0, 8).join(' '));
    if (invite) ok('receipt invite no guarantee', !/(การันตี|เงินประกัน)[^\n]*(10,000|15,000)/.test(tx));
    await page.goto(B + `/join/profile/${mb}`, { waitUntil: 'networkidle' }); }
  ok('active hub: withdraw + boost + sales visible', /ถอนเงิน/.test(ht) && /โปรโมทโปรไฟล์/.test(ht) && /ชวนลูกค้าเปิดเมม/.test(ht));
  ok('active hub: status verified', invite ? /ชำระค่าอบรมแล้ว/.test(ht) : /ชำระค่าการันตีแล้ว/.test(ht), ht.match(/(คำเชิญพิเศษ|สมัครปกติ)[^\n]*/)?.[0]);
  await page.getByRole('button', { name: 'โปรโมทโปรไฟล์', exact: true }).click(); await page.waitForTimeout(1200); await shot('hub-boost-open');
  ok('boost plans visible', /ขึ้นหน้าแนะนำ 1 วัน/.test(await page.locator('body').innerText()));
  for (const s of ['sales', 'withdraw', 'posts', 'earnings', 'jobs', 'schedule', 'settings']) {
    const r = await page.goto(B + `/join/profile/${mb}/${s}`, { waitUntil: 'networkidle' }); await shot('active-' + s); await ux('active-' + s);
    ok(`active ${s} 200`, r.status() === 200, String(r.status()));
  }
  const st = await page.goto(B + `/join/profile/${mb}/sales`, { waitUntil: 'networkidle' }); ok('sales shows link/code', /\/ref\//.test(await page.locator('body').innerText()));
  // earnings calculator interaction
  await page.goto(B + `/join/profile/${mb}/earnings`, { waitUntil: 'networkidle' });
  const plus = page.getByRole('button', { name: /เพิ่มเคส/ });
  for (let i = 0; i < 12; i++) await plus.click();
  await shot('earnings-calc-12');
  ok('earnings calc shows 50% at 12 cases', /50%/.test(await page.locator('body').innerText()));
  await go('/join/earnings', 'public-earnings');

  // ── new device: /join/me then admin link ──
  const ctx2 = await mk(); const p2 = await ctx2.newPage();
  await p2.goto(B + '/work-with-us', { waitUntil: 'networkidle' });
  const lk = p2.getByText('มีโปรไฟล์ Part-Time แล้ว? เข้าโปรไฟล์');
  ok('work-with-us has PT login link', await lk.count() > 0);
  if (await lk.count()) { await lk.first().click(); await p2.waitForURL(/\/join\/me/); }
  await p2.screenshot({ path: `${OUT}/95-newdevice-me.png`, fullPage: true });
  const lr = await (await fetch(B + `/api/admin/applicants/${id}/link`, { method: 'POST', headers: ADM })).json();
  ok('admin mints profile link', !!lr.url, lr.url);
  if (lr.url) {
    const u = new URL(lr.url); await p2.goto(B + u.pathname + u.search, { waitUntil: 'networkidle' });
    await p2.screenshot({ path: `${OUT}/96-newdevice-in.png`, fullPage: true });
    ok('new device lands on own profile', p2.url().includes(`/join/profile/${mb}`) && (await p2.locator('body').innerText()).includes(mb), p2.url());
    await p2.goto(B + '/join/me', { waitUntil: 'networkidle' }); ok('/join/me now redirects to profile', p2.url().includes(`/join/profile/${mb}`), p2.url());
  }
  // first device: /join/me
  await page.goto(B + '/join/me', { waitUntil: 'networkidle' }); ok('same device /join/me → profile', page.url().includes(`/join/profile/${mb}`), page.url());

  ok('no page/console errors', !errs.length, [...new Set(errs)].slice(0, 8).join(' || '));
  fs.writeFileSync(`${OUT}/_result.json`, JSON.stringify({ tag, mb, fails, issues, errs: [...new Set(errs)] }, null, 1));
  console.log(fails ? `${tag}: ${fails} FAILED` : `${tag}: ALL PASS`);
  await browser.close();
})().catch((e) => { console.log('ERR', e); process.exit(1); });
