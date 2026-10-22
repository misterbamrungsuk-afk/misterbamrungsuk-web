// ร้านค้า Marketplace กดหน้าจอจริง: /market/sell สมัคร (แนบเอกสาร) → แอดมินอนุมัติ (API) → ลิงก์เชิญตั้งรหัสผ่าน → พอร์ทัล /vendor
// ข้อมูลร้าน + ค่าส่ง → ลงสินค้า (รูป + อย.) → แอดมินอนุมัติสินค้า → ลูกค้าสั่งจ่ายกระเป๋า (API) → ร้านใส่เลขพัสดุ → สำเร็จ → กระเป๋า + ขอถอน → แจ้งเตือน → ออก/เข้า
// node e2e/ui/31-vendor.js <iphone|pixel>  (รันผ่าน run.js · โหมดสาธิตเท่านั้น)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { start, api, customerCookie, adminToken, IMGS, uniq, WEB } = require('./_lib');
const dev = process.argv[2] || 'pixel';
const ADM = 'mord_admin=' + adminToken('ceo');
const IMG = fs.readFileSync(IMGS[0]);
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const PW = 'Vd-' + Math.random().toString(36).slice(2, 10) + '7q';
const ENV = (() => { try { return fs.readFileSync(path.join(WEB, '.env.local'), 'utf8'); } catch { return ''; } })();
const KEY = (/^ADMIN_SESSION_SECRET=(.*)$/m.exec(ENV)?.[1] || '').trim().replace(/^["']|["']$/g, '') || 'hamoo-demo-secret';
const phoneTok = (ph) => { const b = Buffer.from(JSON.stringify({ phone: ph, exp: Date.now() + 3600e3, v: true })).toString('base64url'); return b + '.' + crypto.createHmac('sha256', KEY).update('phone:' + b).digest('base64url'); };
// รอ React hydrate ก่อนกด/กรอก (เครื่องสาธิตใช้ร่วมกันหลายคน คอมไพล์ช้า — กดก่อน hydrate = ฟอร์มส่งแบบ HTML เปล่า)
const ready = (page, sel = 'form, button') => page.waitForFunction((s) => [...document.querySelectorAll(s)].some((e) => Object.keys(e).some((k) => k.startsWith('__reactFiber') || k.startsWith('__reactProps'))), sel, { timeout: 60000 }).catch(() => {});
const vendorApi = async (VC) => (await api('/api/market/vendor', { cookie: VC })).json;

(async () => {
  const t = await start('31-vendor', dev);
  const { page, ctx, ok, step, go } = t;
  page.setDefaultTimeout(60000);
  try {
    const tag = uniq('');
    const email = `ui-shop-${tag}@test.local`, shop = `ร้านยูไอ ${tag}`;
    // ── 1) สมัคร ──
    await go('/market/sell', 'sell'); await ready(page);
    ok('sell: no "แพ็กเกจ" in copy', !/แพ็กเกจ/.test(await page.locator('body').innerText()));
    await page.getByRole('button', { name: 'ส่งใบสมัคร' }).click();
    ok('sell: missing ID doc → Thai error', /แนบ/.test(await page.locator('p[role=alert]').innerText().catch(() => '')));
    await page.getByLabel(/ชื่อร้าน \/ แบรนด์/).fill(shop);
    await page.getByLabel(/หมวดสินค้าหลัก/).selectOption({ index: 1 });
    await page.getByLabel(/เกี่ยวกับร้าน/).fill('ชาสมุนไพรออร์แกนิก');
    await page.getByLabel(/ชื่อเจ้าของร้าน/).fill('คุณเจ้าของ ยูไอ');
    await page.getByLabel(/เบอร์มือถือ/).fill('0812345678');
    await page.getByLabel(/อีเมล \*/).fill(email);
    await page.getByLabel('LINE ID').fill('uishop');
    const files = page.locator('input[type=file]');
    await files.nth(0).setInputFiles(IMGS[1]);
    await files.nth(1).setInputFiles({ name: 'fda.pdf', mimeType: 'application/pdf', buffer: PDF });
    ok('sell: both documents attached', await page.getByText(/✓ .* · แตะเพื่อเปลี่ยน/).count() === 2);
    await page.getByRole('checkbox').click();
    await step('sell-filled');
    await page.getByRole('button', { name: 'ส่งใบสมัคร' }).click();
    await page.getByText('ได้รับใบสมัครแล้ว').waitFor({ timeout: 45000 }).catch(() => {});
    await step('sell-done');
    ok('sell: application received', await page.getByText('ได้รับใบสมัครแล้ว').count() > 0, await page.locator('p[role=alert]').innerText().catch(() => ''));
    const app = ((await api('/api/market/admin', { cookie: ADM })).json?.applications || []).find((a) => a.email === email);
    ok('data: application pending with 2 docs', app?.status === 'pending' && app.docs?.length === 2, JSON.stringify(app || {}).slice(0, 120));
    if (!app) return;
    // ── 2) แอดมินอนุมัติ → ลิงก์เชิญ ──
    const ap = (await api('/api/market/admin/applications', { method: 'POST', cookie: ADM, body: { op: 'approve', id: app.id, gp_pct: 20 } })).json;
    ok('admin: approve → invite link', ap?.ok && /^\/vendor\/invite\?t=/.test(ap.invite || ''), ap?.error);
    await go(ap.invite, 'invite'); await ready(page);
    ok('invite: shows shop + email', (await page.locator('body').innerText()).includes(email));
    await page.locator('#p1').fill(PW); await page.locator('#p2').fill(PW + 'z');
    await page.getByRole('button', { name: 'บันทึกและเข้าสู่ระบบ' }).click();
    ok('invite: mismatch → Thai error', /ไม่ตรงกัน/.test(await page.locator('p[role=alert]').innerText({ timeout: 45000 }).catch(() => '')));
    await page.locator('#p2').fill(PW);
    await page.getByRole('button', { name: 'บันทึกและเข้าสู่ระบบ' }).click();
    await page.waitForURL(/\/vendor$/, { timeout: 60000 }).catch(() => {}); await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'คำสั่งซื้อ' }).waitFor({ timeout: 45000 }).catch(() => {});
    await step('portal');
    ok('invite → vendor portal', await page.getByRole('button', { name: 'คำสั่งซื้อ' }).count() > 0, page.url());
    const VC = (await ctx.cookies()).filter((c) => c.name === 'mb_vendor').map((c) => `${c.name}=${c.value}`).join('; ');
    ok('vendor session cookie', VC.startsWith('mb_vendor='));
    const tab = (n) => page.getByRole('button', { name: n, exact: false }).first();

    // ── 3) ข้อมูลร้าน + ค่าส่ง ──
    await tab('ข้อมูลร้าน / โลโก้').click();
    await page.locator('#vs-desc').fill('ชาสมุนไพรคัดพิเศษ ส่งทั่วประเทศ');
    await page.locator('#vs-contact').fill('LINE @uishop');
    await page.getByRole('button', { name: 'บันทึกข้อมูลร้าน' }).click();
    await page.getByText('บันทึกข้อมูลร้านแล้ว').waitFor({ timeout: 45000 }).catch(() => {});
    ok('shop info saved', await page.getByText('บันทึกข้อมูลร้านแล้ว').count() > 0);
    await page.locator('#vs-fee').fill('50'); await page.locator('#vs-free').fill('5000');
    await page.getByRole('button', { name: 'บันทึกค่าส่ง' }).click();
    await page.getByText('บันทึกค่าส่งแล้ว').waitFor({ timeout: 45000 }).catch(() => {});
    await step('profile');
    let vd = await vendorApi(VC);
    ok('data: shipping 50 / free 5000 + contact', vd?.vendor?.shipping_fee === 50 && vd.vendor.free_threshold === 5000 && vd.vendor.contact === 'LINE @uishop', JSON.stringify(vd?.vendor || {}).slice(0, 160));

    // ── 4) ลงสินค้า ──
    await tab('สินค้า').click();
    await page.locator('#vp-name').fill(`ชาสมุนไพร ${tag}`);
    await page.locator('#vp-price').fill('500'); await page.locator('#vp-stock').fill('10');
    await page.locator('#vp-desc').fill('ชาสมุนไพรอบแห้ง 50 กรัม');
    await page.getByLabel('ขอเผยแพร่บนหน้าเว็บ').check();
    await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
    ok('product: publish without อย. refused', /อย\./.test(await page.locator('[role=status]').first().innerText().catch(() => '')));
    await page.locator('#vp-fda').fill('10-1-12345-1-0001');
    await page.locator('input[type=file][multiple]').setInputFiles([IMGS[2], IMGS[3]]);
    await step('product-form');
    await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await page.getByText(/รอทีมงานตรวจและอนุมัติ/).waitFor({ timeout: 45000 }).catch(() => {});
    await step('product-saved');
    ok('product: saved, awaiting approval', await page.getByText(/รอทีมงานตรวจและอนุมัติ/).count() > 0 && await page.getByText('รออนุมัติ', { exact: true }).count() > 0);
    vd = await vendorApi(VC);
    const prod = vd?.products?.find((p) => p.name === `ชาสมุนไพร ${tag}`);
    ok('data: product 2 images, อย., not approved', prod && prod.images.length === 2 && prod.fda_no === '10-1-12345-1-0001' && prod.approved === false, JSON.stringify(prod || {}).slice(0, 120));
    if (!prod) return;
    const fd = new FormData(); for (const [k, v] of Object.entries({ id: prod.id, vendor_id: vd.vendor.id, name: prod.name, price: '500', stock: '10', fda_no: prod.fda_no, published: '1', approved: '1', age_restricted: '0' })) fd.set(k, v);
    const pa = (await api('/api/market/admin/products', { method: 'POST', cookie: ADM, form: fd })).json;
    ok('admin approves product', pa?.ok && pa.product.approved === true, pa?.error);
    await page.reload({ waitUntil: 'networkidle' });
    await tab('สินค้า').click();
    ok('product status → แสดงบนเว็บ', await page.getByText('แสดงบนเว็บ', { exact: true }).count() > 0);
    const sp = (await api(`/shop/${vd.vendor.slug}`)).text.replace(/<!-- -->/g, '');
    ok('public shop page lists product', sp.includes(`ชาสมุนไพร ${tag}`));

    // ── 5) ลูกค้าสั่งซื้อจ่ายกระเป๋า (API) ──
    const cEmail = `ui-buyer-${tag}@test.local`;
    const C = `${customerCookie(cEmail).name}=${customerCookie(cEmail).value}`;
    const tf = new FormData(); tf.set('amount', '3000'); tf.set('slip', new File([IMG], 's.jpg', { type: 'image/jpeg' }));
    await api('/api/wallet/topup', { method: 'POST', cookie: C, form: tf });
    const tp = ((await api('/api/admin/wallet', { cookie: ADM })).json?.topups || []).find((x) => x.customer_email === cEmail && x.status === 'pending');
    await api('/api/admin/wallet', { method: 'POST', cookie: ADM, body: { action: 'approve', id: tp?.id } });
    const od = (await api('/api/market/orders', { method: 'POST', cookie: `mb_phone_ok=${encodeURIComponent(phoneTok('66812225555'))}; ${C}`, body: { name: 'ผู้ซื้อ ยูไอ', address: '88/8 ถนนทดสอบ แขวงทดสอบ กรุงเทพ 10110', age_confirm: true, pay: 'wallet', items: [{ id: prod.id, qty: 2 }] } })).json;
    ok('seed: customer buys 2 × ฿500 + ฿50 ship with wallet', od?.ok && od.status === 'paid' && od.total === 1050, od?.error);

    // ── 6) ร้านส่งของ ──
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    ok('orders tab shows 1 to ship', await page.getByRole('button', { name: /คำสั่งซื้อ \(1 รอส่ง\)/ }).count() > 0);
    const card = page.locator('section', { hasText: 'ผู้ซื้อ ยูไอ' }).first();
    ok('order card: net payout ฿850', /รับสุทธิ[\s\S]*850/.test(await card.innerText().catch(() => '')));
    await card.getByLabel('ขนส่ง').selectOption('flash');
    await card.getByLabel('เลขพัสดุ').fill('TH' + tag.toUpperCase());
    await step('order-ship');
    await card.getByRole('button', { name: 'บันทึกเลขพัสดุ' }).click();
    await page.getByText(/บันทึกเลขพัสดุแล้ว/).waitFor({ timeout: 45000 }).catch(() => {});
    await step('order-shipped');
    ok('ship: confirmation message', await page.getByText(/บันทึกเลขพัสดุแล้ว/).count() > 0, await page.locator('[role=status]').first().innerText().catch(() => ''));
    vd = await vendorApi(VC);
    ok('data: order shipped with tracking', vd?.orders?.find((o) => o.id === od.id)?.status === 'shipped');
    const tr = (await api(`/api/market/track?id=${od.id}&t=${encodeURIComponent(od.token)}`)).json;
    ok('data: buyer tracking shows shipped', tr?.order?.status === 'shipped', JSON.stringify(tr?.order?.status));
    const dn = (await api(`/api/market/admin/orders/${od.id}`, { method: 'POST', cookie: ADM, body: { action: 'done' } })).json;
    ok('admin marks order done', dn?.ok, dn?.error);

    // ── 7) กระเป๋า + ขอถอน ──
    await tab('กระเป๋าเงิน / ถอน').click();
    await page.getByText('ยอดถอนได้').waitFor({ timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(600);
    await step('wallet');
    ok('wallet shows ฿850', (await page.locator('body').innerText()).includes('฿850'));
    await page.getByRole('button', { name: 'ทั้งหมด' }).click();
    await page.getByPlaceholder('xxx-x-xxxxx-x').fill('123-4-56789-0');
    await page.getByLabel(/ชื่อบัญชี/).fill('คุณเจ้าของ ยูไอ');
    await page.getByRole('button', { name: 'ส่งคำขอถอน' }).click();
    await page.getByText('ส่งคำขอถอนแล้ว').waitFor({ timeout: 45000 }).catch(() => {});
    await step('wallet-requested');
    const w = (await api('/api/market/vendor/wallet', { cookie: VC })).json;
    ok('data: ฿850 moved to withdrawing', w?.available === 0 && w.withdrawing === 85000 && w.requests?.[0]?.status === 'requested', JSON.stringify({ a: w?.available, w: w?.withdrawing }));

    // ── 8) รายงาน + แจ้งเตือน ──
    await tab('รายงานยอดขาย').click();
    await step('report');
    ok('report: month row with payout', /850/.test(await page.locator('table').innerText().catch(() => '')));
    const bell = await page.locator('header button[aria-label^="แจ้งเตือน"]').getAttribute('aria-label');
    ok('bell shows unread count', /แจ้งเตือน \d+ รายการ/.test(bell || ''), bell);
    await page.locator('header button[aria-label^="แจ้งเตือน"]').click();
    await page.getByRole('heading', { name: /แจ้งเตือน/ }).waitFor({ timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(800);
    await step('notices');
    const nt = await page.locator('main, body').first().innerText();
    ok('notices: order/money notices listed', /คำสั่งซื้อ|ออเดอร์|สินค้า|เงิน/.test(nt.split('แจ้งเตือน').slice(1).join(' ')), nt.slice(0, 120));
    const all = page.getByRole('button', { name: 'อ่านทั้งหมดแล้ว' });
    if (await all.count()) { await all.click(); await page.waitForTimeout(800); const un = (await api('/api/market/vendor/notifications?count=1', { cookie: VC })).json; ok('mark all read → unread 0', un?.unread === 0, JSON.stringify(un)); ok('bell cleared after read all', (await page.locator('header button[aria-label^="แจ้งเตือน"]').getAttribute('aria-label')) === 'แจ้งเตือน'); }

    // ── 9) ออก → เข้าสู่ระบบ ──
    await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
    await page.getByRole('heading', { name: 'เข้าสู่ระบบร้านค้า' }).waitFor({ timeout: 45000 }).catch(() => {}); await page.waitForLoadState('networkidle'); await ready(page);
    ok('logout → login form', await page.getByRole('heading', { name: 'เข้าสู่ระบบร้านค้า' }).count() > 0);
    await page.locator('#em').fill(email); await page.locator('#pw').fill('wrong-pass-123');
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    ok('login: wrong password → Thai error', /ไม่ถูกต้อง/.test(await page.locator('p[role=alert]').innerText({ timeout: 45000 }).catch(() => '')));
    await page.locator('#pw').fill(PW);
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    await page.getByRole('button', { name: /คำสั่งซื้อ/ }).waitFor({ timeout: 45000 }).catch(() => {});
    await step('relogin');
    ok('login → portal again', await page.getByRole('button', { name: /คำสั่งซื้อ/ }).count() > 0);
  } catch (e) { ok('vendor flow threw', false, e.message.split('\n')[0]); await step('error').catch(() => {}); }
  await t.done();
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
