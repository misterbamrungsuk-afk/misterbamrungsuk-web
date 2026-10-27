// Sale Man ภายนอก กดหน้าจอจริง: แอดมินสร้างบัญชี + บัญชีธนาคาร (API) → ลิงก์ /recruit/go → แดชบอร์ด /sales/me (โค้ด · คัดลอกลิงก์ · บัญชีปิดเลข)
// → ลูกค้าเปิดเมม Gold ผ่านลิงก์ /ref (กดจริง) + สลิป (API) → แอดมินอนุมัติ → ค่าคอมขึ้น → ขอรับค่าคอม → ออกจากระบบ
// node e2e/ui/32-sales.js <iphone|pixel>  (รันผ่าน run.js · โหมดสาธิตเท่านั้น)
const fs = require('fs');
const { start, api, customerCookie, adminToken, IMGS, uniq, BASE } = require('./_lib');
const dev = process.argv[2] || 'pixel';
const ADM = 'mord_admin=' + adminToken('ceo');
const IMG = fs.readFileSync(IMGS[0]);

(async () => {
  const t = await start('32-sales', dev);
  const { page, ctx, ok, step, go, note } = t;
  page.setDefaultTimeout(60000);
  try {
    if (dev !== 'iphone') await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE }).catch(() => {});
    const name = 'เซลส์ยูไอ ' + uniq('');
    const ACC = '987-6-54321-0';
    // ── แอดมินสร้าง Sale Man ──
    let r = (await api('/api/admin/sales', { method: 'POST', cookie: ADM, body: { action: 'rep_create', name, phone: '0891234567', bank: { bank: 'กสิกรไทย', account: ACC, name } } })).json;
    ok('admin creates rep with bank → link', r?.ok && /\/recruit\/go\?t=/.test(r.link || ''), r?.error);
    const code = r?.rep?.code, link = r?.link?.replace(/^https?:\/\/[^/]+/, '');
    // ── หน้าขาย + ลิงก์ผิด ──
    await go('/recruit', 'landing');
    const lt = await page.locator('main').innerText();
    ok('landing: commission per tier shown', /รับ ฿/.test(lt) && /Gold|โกลด์/i.test(lt), lt.slice(0, 160));
    ok('landing: no "แพ็กเกจ"', !/แพ็กเกจ/.test(lt));
    await go('/recruit/go?t=bad.token', 'bad-link');
    ok('bad link → expired message', /\/recruit\?expired=1/.test(page.url()) && /หมดอายุ/.test(await page.locator('main').innerText()), page.url());
    // ── เข้าแดชบอร์ด ──
    await go(link, 'dashboard');
    ok('link → /sales/me', /\/recruit\/me$/.test(page.url()), page.url());
    const d0 = await page.locator('main').innerText();
    ok('dashboard: greeting + code', d0.includes(name) && d0.includes(code), d0.slice(0, 160));
    ok('dashboard: referral link /ref/CODE', d0.includes('/ref/' + code));
    ok('dashboard: bank masked (full number hidden)', d0.includes('กสิกรไทย') && !d0.includes(ACC) && /•|\*|x{2,}/i.test(d0.split('บัญชีรับค่าคอม')[1]?.slice(0, 80) || ''), d0.split('บัญชีรับค่าคอม')[1]?.slice(0, 80));
    ok('dashboard: no referrals yet', /ยังไม่มี/.test(d0));
    await page.getByRole('button', { name: 'คัดลอกลิงก์' }).click();
    const copied = await page.getByRole('button', { name: 'คัดลอกแล้ว' }).waitFor({ timeout: 1400 }).then(() => 1, () => 0);
    if (dev === 'iphone') note(`copy link on WebKit (headless, no clipboard permission): ${copied ? 'copied' : 'not confirmed'}`);
    else ok('copy link → "คัดลอกแล้ว"', copied > 0);
    const S = (await ctx.cookies()).filter((c) => c.name === 'mb_sales').map((c) => `${c.name}=${c.value}`).join('; ');
    ok('sales session cookie', S.startsWith('mb_sales='));
    const me0 = (await api('/api/sales/me', { cookie: S })).json;
    ok('data: me starts at 0', me0?.ok && me0.earned === 0 && me0.available === 0, JSON.stringify(me0).slice(0, 100));

    // ── ลูกค้าเปิดลิงก์ /ref (กดจริงในแท็บใหม่) → เปิดเมม Gold ──
    const cEmail = `${uniq('ui-salecust-')}@test.local`;
    const cc = customerCookie(cEmail);
    const cust = await ctx.browser().newContext({ locale: 'th-TH' });
    await cust.addCookies([{ ...cc, url: BASE }]);
    const cp = await cust.newPage();
    await cp.goto(BASE + '/ref/' + code, { waitUntil: 'networkidle' });
    const ref = (await cust.cookies()).find((c) => c.name === 'mb_ref');
    ok('customer opens /ref link → mb_ref cookie', ref?.value === code, ref?.value);
    await cust.close();
    const fd = new FormData(); fd.append('tier', 'gold'); fd.append('ref', code); fd.append('slip', new File([IMG], 's.jpg', { type: 'image/jpeg' }));
    const buy = (await api('/api/membership', { method: 'POST', cookie: `${cc.name}=${cc.value}; mb_ref=${code}`, form: fd })).json;
    ok('seed: customer buys Gold with ref', buy?.ok, buy?.error);
    await page.reload({ waitUntil: 'networkidle' });
    ok('dashboard: referral pending slip', /รอตรวจสลิป/.test(await page.locator('main').innerText()));
    const apv = (await api('/api/admin/sales', { method: 'POST', cookie: ADM, body: { action: 'approve', id: buy?.id } })).json;
    ok('admin approves membership', apv?.ok, apv?.error);
    const me1 = (await api('/api/sales/me', { cookie: S })).json;
    ok('data: commission credited', me1?.earned > 0 && me1.available === me1.earned, JSON.stringify(me1).slice(0, 120));
    await page.reload({ waitUntil: 'networkidle' });
    await step('dashboard-commission');
    const d1 = await page.locator('main').innerText();
    const bahtTxt = '฿' + (me1.earned / 100).toLocaleString('th-TH');
    ok('dashboard: commission shown', d1.includes(bahtTxt) && /เปิดเมมแล้ว/.test(d1) && /คนที่คุณชวน \(1\)/.test(d1), d1.slice(0, 300));
    ok('dashboard: customer name masked', !d1.includes(cEmail));

    // ── ขอรับค่าคอม ──
    const ask = page.getByRole('button', { name: 'ขอรับ', exact: true });
    ok('payout button disabled when empty', await ask.isDisabled());
    const over = await api('/api/sales/me', { method: 'POST', cookie: S, body: { amount: me1.available / 100 + 1 } });
    ok('over-balance request refused (Thai)', over.status === 400 && /[ก-๙]/.test(over.json?.error || ''), over.json?.error);
    await page.getByPlaceholder('จำนวนเงิน (บาท)').fill(String(me1.available / 100));
    await ask.click();
    await page.getByText('ส่งคำขอแล้ว').waitFor({ timeout: 45000 }).catch(() => {});
    await page.waitForLoadState('networkidle');
    await step('payout-requested');
    ok('payout: confirmation', await page.getByText('ส่งคำขอแล้ว').count() > 0);
    const me2 = (await api('/api/sales/me', { cookie: S })).json;
    ok('data: moved to withdrawing', me2?.available === 0 && me2.withdrawing === me1.earned && me2.payouts?.[0]?.status === 'requested');
    await page.reload({ waitUntil: 'networkidle' });
    ok('dashboard: payout row waiting CEO', /รอ CEO อนุมัติ/.test(await page.locator('main').innerText()));

    // ── ออกจากระบบ ──
    await page.getByRole('button', { name: 'ออกจากระบบ Sale Man' }).click();
    await page.waitForURL(/\/recruit\?out=1/, { timeout: 45000 }).catch(() => {}); await page.waitForLoadState('networkidle');
    await step('logged-out');
    ok('logout → /sales?out=1 message', /ออกจากระบบ Recruit แล้ว/.test(await page.locator('main').innerText()), page.url());
    await go('/recruit/me', 'after-logout');
    ok('/recruit/me after logout → expired', /\/recruit\?expired=1/.test(page.url()), page.url());
  } catch (e) { ok('sales flow threw', false, e.message.split('\n')[0]); await step('error').catch(() => {}); }
  await t.done();
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
