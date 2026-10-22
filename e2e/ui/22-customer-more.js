// ลูกค้า (กดหน้าจอจริง) ชุดที่ 3: เมมเบอร์ Gold (สลิป → แอดมินอนุมัติ → บัตรสมาชิก) · ใช้โค้ดโปรโมชัน · บัตรของขวัญ
// · โรงแรม: /stay → โรงแรม → จองห้องจากกระเป๋า → /stays/bookings → ยกเลิก · ตลาด: สินค้า → ตะกร้า → จ่ายจากกระเป๋า → ติดตาม · จ่ายสลิป → รอตรวจ
// · การแจ้งเตือน · SOS (นับถอยหลัง/ยกเลิก/ส่งในโหมดสาธิต) · รายงาน + บล็อกเพื่อน · ผู้ใช้ที่บล็อก/เลิกบล็อก · ช่วยเหลือ/นโยบาย · 404
const { start, api, BASE, IMGS, uniq, customerCookie } = require('./_lib');
const { livePT, fund, ADMC, seedHotel, seedProduct } = require('./_cust');
const dev = process.argv[2] || 'pixel';

(async () => {
  const email = uniq('c22' + dev[0]) + '@test.local';
  const S = await start('22-customer-more', dev, { cookies: [customerCookie(email)] });
  const { page, ctx, step, ok, note, go } = S;
  await ctx.grantPermissions(['geolocation'], { origin: BASE });
  await ctx.setGeolocation({ latitude: 13.7377, longitude: 100.5603 });
  const body = () => page.locator('body').innerText();
  const bad400 = []; page.on('response', (r) => { if (r.status() === 400) bad400.push(r.url().replace(BASE, '')); });
  page.on('response', (r) => { if (r.url().includes('/api/otp/verify') && r.request().method() === 'POST') r.text().then((x) => note('otp verify POST ' + r.status() + ' ' + x.slice(0, 120))).catch(() => {}); });
  const C = (({ name, value }) => `${name}=${value}`)(customerCookie(email));
  const wallet = () => api('/api/wallet', { cookie: C }).then((r) => r.json || {});
  const [pt, hotel, prod] = await Promise.all([livePT(), seedHotel().catch((e) => { ok('seed hotel', false, e.message); return null; }), seedProduct().catch((e) => { ok('seed product', false, e.message); return null; })]);

  // ══ 7. เมมเบอร์ Gold ══
  await go('/membership', 'membership');
  ok('membership: Gold/Black offer', /Gold/.test(await body()) && /Black/.test(await body()));
  const goldBtn = page.getByRole('button', { name: /^Gold · ฿/ });
  if (await goldBtn.count()) await goldBtn.click();
  const joinBtn = page.getByRole('button', { name: /ยืนยันเปิดเมม Gold/ });
  ok('membership: confirm disabled until slip', await joinBtn.isDisabled());
  await page.locator('section input[type=file]').first().setInputFiles(IMGS[0]);
  await step('membership-slip');
  const mr = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/membership') && r.request().method() === 'POST').then((r) => r.json()).catch(() => ({})), joinBtn.click()]).then((x) => x[0]);
  await page.getByRole('status').first().waitFor({ timeout: 10000 }).catch(() => {});
  ok('membership: slip sent message', /ส่งสลิปแล้ว|ยินดีต้อนรับ/.test(await body()), JSON.stringify(mr).slice(0, 120));
  if (mr.status !== 'credited' && mr.id) {
    const a = await api('/api/admin/sales', { method: 'POST', cookie: ADMC, body: { action: 'approve', id: mr.id } });
    ok('admin approves membership', a.json?.ok, JSON.stringify(a.json).slice(0, 120));
  }
  await go('/membership', 'membership-gold');
  const me = (await api('/api/membership', { cookie: C })).json?.me;
  ok('API: tier gold + card number', me?.tier === 'gold' && /^MBM/.test(me?.no || ''), JSON.stringify(me).slice(0, 120));
  ok('membership page shows member card (not sample)', /MBM\s*[0-9A-F•]/.test(await body()) && !/ตัวอย่าง/.test((await page.locator('main').innerText().catch(() => '')).slice(0, 400)));
  let w = await wallet(); ok('Gold credit ฿70,000 in wallet', w.available >= 7000000, w.available);
  await go('/profile', 'account-gold');
  ok('account shows GOLD tier', /GOLD|Gold/.test(await body()));

  // โค้ดโปรโมชัน
  const code = ('UI' + Date.now().toString(36)).toUpperCase().slice(0, 12);
  await api('/api/admin/promos', { method: 'POST', cookie: ADMC, body: { action: 'create', code, amount: 300, max_uses: 5, note: 'ui e2e' } });
  await go('/membership/redeem', 'redeem');
  const codeIn = page.locator('form input').first();
  await codeIn.fill('NOPE' + Date.now().toString(36).slice(-4).toUpperCase());
  await page.locator('form button[type=submit]').click();
  await page.locator('form [role=alert]').first().waitFor({ timeout: 8000 }).catch(() => {});
  ok('redeem: unknown code → error', await page.locator('form [role=alert]').count() > 0);
  const w0 = (await wallet()).available;
  await codeIn.fill(code.toLowerCase());
  const rr = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/codes/redeem')).then((r) => r.json()).catch(() => ({})), page.locator('form button[type=submit]').click()]).then((x) => x[0]);
  await page.getByText('ใช้โค้ดสำเร็จ').waitFor({ timeout: 8000 }).catch(() => {});
  ok('redeem: API ok', rr.ok, JSON.stringify(rr).slice(0, 120));
  await step('redeem-ok');
  ok('redeem: +฿300 shown', /300/.test(await body()));
  ok('API: wallet +฿300', (await wallet()).available - w0 === 30000);

  // ══ 8. โรงแรม ══
  if (hotel) {
    await go('/stay', 'stay');
    await go(`/hotels/${hotel.id}`, 'hotel');
    ok('hotel page lists rooms', /Deluxe เตียงคู่/.test(await body()) && /Suite/.test(await body()));
    await page.getByRole('button', { name: 'จองห้อง', exact: true }).click();
    const dlg = page.getByRole('dialog', { name: 'จองห้องพัก' });
    await dlg.waitFor();
    await dlg.getByRole('radio', { name: /Deluxe/ }).first().click().catch(() => {});
    await page.waitForTimeout(800);
    const nameIn = dlg.locator('input:not([type=date])').first();
    if (await nameIn.count() && !(await nameIn.inputValue())) await nameIn.fill('คุณทดสอบ ผู้เข้าพัก');
    await step('hotel-book');
    const payBtn = dlg.getByRole('button', { name: /ชำระ|จอง/ }).last();
    await payBtn.click();
    const conf = page.getByRole('alertdialog', { name: 'ยืนยันชำระเงิน' });
    if (await conf.isVisible().catch(() => false)) await conf.getByRole('button', { name: 'ยืนยันชำระ' }).click();
    else ok('hotel: confirm-pay box shown', false, await dlg.innerText().catch(() => ''));
    await page.waitForURL(/\/stays\/bookings\//, { timeout: 20000 }).catch(() => {});
    await page.waitForLoadState('networkidle');
    await step('stay-booked');
    const sid = /\/stays\/bookings\/([^/?#]+)/.exec(page.url())?.[1];
    ok('hotel: booked → stay detail', !!sid, page.url());
    if (sid) {
      ok('stay: pending/confirmed status', /รอโรงแรมยืนยัน|ยืนยันแล้ว|รอ/.test(await body()));
      await go('/stays/bookings', 'stays-list');
      ok('stays list shows booking', await page.locator(`a[href="/stays/bookings/${sid}"]`).count() > 0);
      await page.locator(`a[href="/stays/bookings/${sid}"]`).first().click();
      await page.waitForURL(new RegExp(sid)); await page.waitForLoadState('networkidle');
      const wb = (await wallet()).available;
      await page.getByRole('button', { name: /ยกเลิกการจอง/ }).click();
      const cc = page.getByRole('alertdialog', { name: 'ยืนยันยกเลิกการจอง' });
      ok('stay: cancel confirm explains refund', /คืน/.test(await cc.innerText().catch(() => '')));
      await step('stay-cancel-confirm');
      await Promise.all([page.waitForResponse((r) => r.url().includes('/api/hotels/bookings/') && r.request().method() === 'POST', { timeout: 20000 }).catch(() => null), cc.getByRole('button').last().click()]);
      await page.waitForTimeout(500);
      await step('stay-cancelled');
      const wa = await wallet(); ok('stay: cancelled + refunded ฿1,500', /ยกเลิกแล้ว/.test(await body()) && /คืนเข้ากระเป๋า/.test(await body()) && wa.available + (wa.held || 0) >= wb + 150000 - 1, `${wb} → ${wa.available}/${wa.held}`);
    }
  }

  // ══ 9. ตลาด ══
  if (prod) {
    await go('/market', 'market');
    await go(`/products/${prod.id}`, 'product');
    await page.getByRole('button', { name: 'เพิ่มจำนวน' }).click();
    await page.getByRole('button', { name: /ใส่ตะกร้า/ }).first().click();
    await page.waitForTimeout(600);
    await go('/cart', 'cart');
    ok('cart: product ×2 + shipping ฿50', (await body()).includes(prod.name) && /฿?1,050/.test(await body()), (await body()).match(/รวม[^\n]*/)?.[0]);
    const fillShip = async () => {
      for (const [ph, v] of [['แตะเพื่อกรอกชื่อผู้รับ', 'คุณทดสอบ ผู้รับ'], ['บ้านเลขที่ ซอย ถนน แขวง', '99/9 ซอยสุขุมวิท 21'], [/เขต · จังห/, 'วัฒนา กรุงเทพฯ 10110']]) { const i = page.getByPlaceholder(ph); if (await i.count() && !(await i.inputValue())) await i.fill(v); }
      const tel = page.locator('input[type=tel], input[inputmode=tel]').first(); if (await tel.count() && !(await tel.inputValue())) await tel.fill('0812224444');
      if (!(await page.getByText(/ยืนยันเบอร์ .* แล้ว/).count())) { const useTel = page.getByRole('button', { name: 'ใช้เบอร์นี้', exact: true }); await useTel.waitFor({ timeout: 8000 }).catch(() => {}); await useTel.click({ timeout: 10000 }).catch((e) => note('useTel click: ' + e.message.replace(/s+/g, ' ').slice(0, 400))); await page.getByText(/ยืนยันเบอร์ .* แล้ว/).waitFor({ timeout: 8000 }).catch(() => {}); }
      ok('cart: phone confirmed (OTP off)', await page.getByText(/ยืนยันเบอร์ .* แล้ว/).count() > 0);
      const age = page.getByRole('checkbox').first(); if (await age.count() && (await age.getAttribute('aria-checked')) === 'false') await age.click();
    };
    await fillShip();
    await page.getByRole('radio', { name: /จ่ายจากกระเป๋าเงิน/ }).click();
    await step('cart-filled');
    const wb = (await wallet()).available;
    await page.getByRole('button', { name: /จ่ายจากกระเป๋าเงิน · ฿/ }).click();
    const ask = page.getByRole('alertdialog', { name: 'ยืนยันชำระจากกระเป๋าเงิน' });
    await ask.waitFor({ timeout: 8000 }).catch(() => {});
    await ask.getByRole('button', { name: 'ยืนยันชำระ' }).click().catch(async (e) => ok('cart: wallet confirm shown', false, (e.message || '').slice(0, 80) + ' ' + (await page.locator('p[role=alert]').first().innerText().catch(() => ''))));
    await page.waitForURL(/\/orders\/track|\/cart\?/, { timeout: 20000 }).catch(() => {});
    await page.waitForLoadState('networkidle'); await page.waitForTimeout(800);
    await step('market-paid');
    ok('market: wallet charged ฿1,050', wb - (await wallet()).available === 105000, `${wb}→${(await wallet()).available}`);
    ok('market: order paid page', /ชำระแล้ว|ชำระเงินแล้ว|รอร้านจัดส่ง|ติดตาม/.test(await body()));
    // จ่ายด้วยสลิป
    await go(`/products/${prod.id}`, 'product-2');
    await page.getByRole('button', { name: /ใส่ตะกร้า/ }).first().click();
    await go('/cart', 'cart-2');
    await fillShip();
    await page.getByRole('radio', { name: /สแกน QR พร้อมเพย์/ }).click();
    await page.getByRole('button', { name: /ไปชำระเงิน · ฿/ }).click();
    await page.locator('input[type=file]').first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
    await page.locator('input[type=file]').first().setInputFiles(IMGS[1]);
    await step('market-slip');
    await page.getByRole('button', { name: /ส่งสลิป · ยืนยันคำสั่งซื้อ/ }).click();
    await page.waitForTimeout(2500); await page.waitForLoadState('networkidle');
    await step('market-slip-sent');
    ok('market: slip order pending review', /รอตรวจ|ตรวจสลิป|ได้รับสลิป|รอยืนยัน/.test(await body()));
  }

  // ══ 10. การแจ้งเตือน · SOS · รายงาน/บล็อก · นโยบาย · 404 ══
  // หน้านี้มีตัวถามสายเรียกเข้าทุก 4 วิ → บนเซิร์ฟเวอร์ dev ที่ช้า networkidle อาจไม่มา · รอเนื้อหาแทน
  const rn = await page.goto(BASE + '/notifications', { waitUntil: 'domcontentloaded' });
  ok('[notifications] open → ' + rn.status(), rn.status() < 400);
  await page.waitForFunction(() => !document.body.innerText.includes('กำลังโหลด…'), null, { timeout: 30000 }).catch(() => {});
  await step('notifications');
  ok('notifications list has items', /เมมเบอร์|เติมเงิน|ห้องพัก|สั่งซื้อ|โรงแรม/.test(await body()));
  await go('/sos', 'sos');
  await page.getByRole('button', { name: 'Send SOS' }).click();
  await page.waitForTimeout(400);
  ok('SOS: countdown with cancel', /ยกเลิก SOS/.test(await body()));
  await page.getByRole('button', { name: 'ยกเลิก SOS' }).click();
  await page.waitForTimeout(3500);
  ok('SOS: cancelled, nothing sent', /ขอความช่วยเหลือฉุกเฉิน/.test(await body()));
  await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/sos'), { timeout: 15000 }).catch(() => null), page.getByRole('button', { name: 'Send SOS' }).click()]);
  await page.getByText('แจ้งทีมงานแล้ว').waitFor({ timeout: 8000 }).catch(() => {});
  await step('sos-sent');
  ok('SOS: sent (demo) → แจ้งทีมงานแล้ว', /แจ้งทีมงานแล้ว/.test(await body()));

  if (pt) {
    await go(`/p/${pt.pid}`, 'pt-profile');
    await page.getByRole('link', { name: /รายงานผู้ใช้/ }).click();
    await page.waitForURL(/\/report\?pid=/); await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'ส่งรายงาน' }).click();
    ok('report: needs reason', /เลือกเหตุผลก่อนส่ง/.test(await body()));
    await page.getByRole('radio', { name: 'ข้อมูลโปรไฟล์ไม่ตรง' }).click();
    await page.locator('textarea').fill('รูปไม่ตรงกับตัวจริง (ทดสอบ)');
    ok('report: block switch on by default', (await page.getByRole('switch').getAttribute('aria-checked')) === 'true');
    await step('report-form');
    await page.getByRole('button', { name: 'ส่งรายงาน' }).click();
    await page.getByText(/ส่งรายงานแล้ว/).waitFor({ timeout: 10000 }).catch(() => {});
    ok('report: sent with number', /ส่งรายงานแล้ว · หมายเลข/.test(await body()));
    const prof = (await api('/api/me', { cookie: C })).json?.profile;
    ok('API: PT blocked', (prof?.blocked || []).includes(pt.pid));
    await go('/', 'home-blocked');
    ok('blocked PT hidden from home', !(await page.locator(`a[href="/p/${pt.pid}"]`).count()));
    await go('/profile/blocked', 'blocked-list');
    const ub = page.getByRole('button', { name: 'ยกเลิกบล็อก' });
    ok('blocked list shows PT', await ub.count() > 0);
    if (await ub.count()) {
      await ub.first().click();
      ok('unblock: in-page confirm', await page.getByRole('button', { name: 'ยืนยันเลิกบล็อก' }).isVisible());
      await page.getByRole('button', { name: 'ยืนยันเลิกบล็อก' }).click();
      await page.waitForTimeout(1500);
      const p2 = (await api('/api/me', { cookie: C })).json?.profile;
      ok('API: unblocked', !(p2?.blocked || []).includes(pt.pid));
    }
  }
  await go('/page/terms', 'help-terms');
  ok('help page renders text', (await body()).length > 300);
  await go('/policy', 'policy');
  ok('shop policy page: returns/shipping text', /คืนสินค้า/.test(await body()) && /จัดส่ง/.test(await body()));
  await go('/policy/returns', 'policy-returns');
  ok('policy detail page renders', /คืนสินค้า/.test(await body()));
  const r404 = await page.goto(BASE + '/this-page-does-not-exist-' + Date.now(), { waitUntil: 'networkidle' });
  await step('404');
  ok('404 page: status 404 + Thai text + way home', r404.status() === 404 && /ไม่พบ/.test(await body()) && await page.locator('a[href="/"]').count() > 0, String(r404.status()));
  ok('no "แพ็กเกจ" wording seen', !/แพ็กเกจ|แพคเกจ/.test(await body()));

  ok('only expected 400s (unknown promo code)', bad400.every((u) => u.endsWith('/api/codes/redeem')), bad400.join(' '));
  S.res.errors = S.res.errors.filter((e) => !/due to access control checks|status of 400/.test(e));
  await S.done();
})().catch((e) => { console.log('ERR ' + (e.stack || e.message).split('\n').slice(0, 3).join(' ')); process.exit(1); });
