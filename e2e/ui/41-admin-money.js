// หลังบ้าน: เงิน (CEO / การเงิน) — กดหน้าจอจริง
// กระเป๋า (เติมเงินผ่าน/ไม่ผ่าน · CEO ปรับยอด · ตั้งค่า · กระทบยอด) → CEO อนุมัติรายได้/ถอน (PT · พาร์ทเนอร์ · ร้านค้า · ลูกค้า)
// → โอนเงิน (โอนแล้ว/ไม่สำเร็จ) → ห้องพัก (คืนเต็ม · คืนหลังเข้าพัก) → เมมเบอร์ (สลิป · Sale Man) → โปรโมท → โค้ดโปรโมชัน
const { start, BASE } = require('./_lib');
const S = require('./_seed');
const { as, adminCookie, confirmDlg, waitMsg, bodyText, reload, poll } = require('./_adm');
const dev = process.argv[2] || 'pixel';
const stamp = Date.now().toString(36).slice(-5);
const em = (k) => `ui41-${k}-${dev}-${stamp}@test.local`;
const wallet = () => S.req('/api/admin/wallet', { headers: S.AH() }).then(S.J);
const custW = (email) => S.req('/api/wallet', { headers: S.custH(email) }).then(S.J);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

(async () => {
  // ── เตรียมข้อมูล (API) ──
  const C1 = em('c1'), C2 = em('c2'), C3 = em('c3'), C4 = em('c4'), C5 = em('c5');
  const T1 = await S.topupRequest(C1, 1200), T2 = await S.topupRequest(C1, 700);
  await S.fundCustomer(C2, 30000); await S.fundCustomer(C3, 3000); await S.fundCustomer(C4, 20000);
  const P = await S.activePT({ tag: dev === 'iphone' ? 'ไอ' : 'พิก' });
  const job = await S.completedBooking(P, C2, dev === 'iphone' ? 30 : 35);
  const spa = await S.newPartner({ type: 'สปา' });
  await S.post('/api/admin/wallet', S.AH(), { action: 'adjust', owner_type: 'partner', owner_id: spa.id, bucket: 'available', amount_baht: 3000, reason: 'ค่าห้องทดสอบ', idem: 'ui41-p-' + spa.id });
  const pr = await S.post('/api/partner/wallet', spa.PC, { amount: 1000, bank: S.BANK });
  const V = await S.vendorWithLogin();
  await S.post('/api/admin/wallet', S.AH(), { action: 'adjust', owner_type: 'vendor', owner_id: V.id, bucket: 'available', amount_baht: 2000, reason: 'ส่วนของร้านทดสอบ', idem: 'ui41-v-' + V.id });
  const vr = await S.post('/api/market/vendor/wallet', V.VC, { amount: 1500, bank: S.BANK });
  const cr = await S.post('/api/wallet/withdraw', S.custH(C3), { amount: 1000, bank: { bank: 'กรุงเทพ', account: '1112223334', name: 'ลูกค้า ทดสอบ' } });
  const H = await S.hotelReady();
  const st1 = await S.bookStay(C4, H, dev === 'iphone' ? 10 : 12);
  const st2 = await S.bookStay(C4, H, dev === 'iphone' ? 20 : 22, 2);
  await S.req(`/api/partner/stays/${st2.row?.id}`, { method: 'PATCH', headers: H.PC, body: JSON.stringify({ action: 'confirm' }) });
  await S.post('/api/admin/stays', S.AH(), { action: 'demo_shift', id: st2.row?.id, days: 25 });
  const bf = new FormData(); bf.append('tier', 'gold'); bf.append('slip', new Blob([PNG], { type: 'image/png' }), 's.png');
  const mem = await S.J(await S.req('/api/membership', { method: 'POST', headers: { cookie: S.custH(C5).cookie }, body: bf }));
  const bo = new FormData(); bo.append('mb', P.mb); bo.append('t', P.t); bo.append('plan', 'd3'); bo.append('slip', new Blob([PNG], { type: 'image/png' }), 'slip.png');
  const boost = await S.J(await S.req('/api/pt/boost', { method: 'POST', body: bo }));

  const T = await start('41-admin-money', dev, { cookies: [adminCookie('ceo')] });
  const { page, ctx, step, ok, note, go, done } = T;
  page.setDefaultTimeout(45000); page.setDefaultNavigationTimeout(90000);
  page.on('console', (m) => { if (/hydrated but|did not match/i.test(m.text())) note('hydration @ ' + page.url() + ' · ' + m.text().replace(/s+/g, ' ').slice(200, 900)); });
  ok('seed: topups + job + withdraw requests + stays + membership + boost', !!(T1 && T2 && job.done?.ok && pr.ok && vr.ok && cr.ok && st1.ok && st2.ok && mem.ok && boost.ok), JSON.stringify({ T1: !!T1, T2: !!T2, job: job.done?.error, pr: pr.error, vr: vr.error, cr: cr.error, st1: st1.error, st2: st2.error, mem: mem.error, boost: boost.error }));
  const askOk = async (name = 'ยืนยัน') => page.locator('[role=alertdialog]').getByRole('button', { name, exact: true }).click();
  try {
    // ── 1. กระเป๋าเงิน (CEO) ──
    await go('/admin/wallet', 'wallet');
    ok('reconcile box ✓', /✓ กระทบยอดตรง/.test(await bodyText(page)), (await bodyText(page)).match(/⚠ กระทบยอดไม่ตรง[^]{0,300}/)?.[0]);
    ok('ledger balanced badge', /ผลรวม ledger = 0/.test(await bodyText(page)));
    const card1 = page.locator('div.rounded-2xl.p-3', { hasText: C1 }).filter({ hasText: '1,200' }).first();
    ok('topup card shows slip image', await card1.locator('img[alt="สลิป"]').evaluate((e) => e.complete && e.naturalWidth > 0).catch(() => false));
    await card1.locator('input[type=number]').fill('1150');
    await card1.getByRole('button', { name: 'เข้ากระเป๋า' }).click();
    ok('approve asks inline confirm with amount', /฿1,150/.test(await page.locator('[role=alertdialog]').innerText()));
    await askOk();
    await waitMsg(page, /บันทึกแล้ว/);
    let w = await wallet();
    ok('CEO approves topup with edited amount (API)', w.topups.find((x) => x.id === T1.id)?.status === 'credited' && (await custW(C1)).available === 115000, String((await custW(C1)).available));
    const card2 = page.locator('div.rounded-2xl.p-3', { hasText: C1 }).filter({ hasText: '700' }).first();
    ok('reject disabled without reason', await card2.getByRole('button', { name: 'ไม่ผ่าน' }).isDisabled());
    await card2.getByPlaceholder(/เหตุผลถ้าไม่ผ่าน/).fill('ยอดในสลิปไม่ตรง');
    await card2.getByRole('button', { name: 'ไม่ผ่าน' }).click();
    await askOk();
    await waitMsg(page, /บันทึกแล้ว/);
    w = await wallet();
    ok('topup rejected with reason (API)', w.topups.find((x) => x.id === T2.id)?.status === 'rejected' && w.topups.find((x) => x.id === T2.id)?.reason === 'ยอดในสลิปไม่ตรง');
    await step('wallet-topups');
    // CEO ปรับยอด
    const adj = page.locator('form', { hasText: 'ปรับยอดพร้อมเหตุผล' });
    await adj.getByLabel('ค้นหาเจ้าของบัญชี').fill(C1);
    const opt = await adj.getByLabel('เจ้าของบัญชี', { exact: true }).locator('option').nth(1).getAttribute('value');
    await adj.getByLabel('เจ้าของบัญชี', { exact: true }).selectOption(opt);
    await adj.getByPlaceholder('จำนวนเงิน (บาท)').fill('50');
    const adjBtn = adj.getByRole('button', { name: 'บันทึกการปรับยอด' });
    ok('adjust needs a reason', await adjBtn.isDisabled());
    await adj.getByPlaceholder('เหตุผล (บังคับ)').fill('ชดเชยเติมเงินล่าช้า');
    await adjBtn.click();
    ok('adjust confirm shows reason', /ชดเชยเติมเงินล่าช้า/.test(await page.locator('[role=alertdialog]').innerText()));
    await askOk();
    await waitMsg(page, /บันทึกแล้ว/);
    ok('CEO adjust +฿50 lands (API)', (await custW(C1)).available === 120000, String((await custW(C1)).available));
    // ตั้งค่า (บันทึกค่าเดิม ไม่กระทบชุดอื่น)
    const before = (await wallet()).money;
    await page.getByRole('button', { name: 'บันทึกตั้งค่า' }).click();
    await askOk();
    await waitMsg(page, /บันทึกแล้ว/);
    const after = (await wallet()).money;
    ok('settings saved by CEO (history added, values unchanged)', after.history?.[0]?.by === 'ui-ceo@local.test' && after.minWithdraw === before.minWithdraw && after.releaseMode === before.releaseMode, JSON.stringify(after.history?.[0]));
    await step('wallet-ceo');

    // การเงิน: ดูได้ ตัดสินเติมเงินได้ แต่ตั้งค่า/ปรับยอด/แก้ยอดไม่ได้
    await as(ctx, 'finance', `ui-fin-${dev}@local.test`);
    await go('/admin/wallet', 'wallet-finance');
    ok('finance: settings read-only note', /แก้ได้เฉพาะ CEO/.test(await bodyText(page)));
    ok('finance: no settings save / adjust form', !(await page.getByRole('button', { name: 'บันทึกตั้งค่า' }).count()) && !(await page.getByRole('button', { name: 'บันทึกการปรับยอด' }).count()));
    const r = await S.post('/api/admin/wallet', S.AH('finance'), { action: 'settings', money: before });
    ok('finance settings API → 403', r.ok === false && /CEO/.test(r.error || ''), JSON.stringify(r));

    // ── 2. CEO อนุมัติรายได้ / ถอน ──
    await go('/admin/ceo-view', 'payroll-finance');
    const prow = page.locator('div.border-t', { hasText: P.mb }).first();
    ok('finance: approve buttons disabled', await prow.getByRole('button', { name: /^อนุมัติ ฿/ }).isDisabled().catch(() => false));
    await as(ctx, 'ceo');
    await go('/admin/payroll', 'payroll');
    const prow2 = page.locator('div.border-t', { hasText: P.mb }).first();
    await prow2.getByRole('button', { name: /^อนุมัติ ฿/ }).click();
    await confirmDlg(page, 'อนุมัติ');
    ok('earnings approve msg', /เข้ากระเป๋าแล้ว/.test(await waitMsg(page, /เข้ากระเป๋าแล้ว/)));
    const ptw = await S.req(`/api/pt/wallet?mb=${P.mb}&t=${encodeURIComponent(P.t)}`).then(S.J);
    ok('PT earnings now available (API)', ptw.available > 0, JSON.stringify(ptw).slice(0, 160));
    const wq = await S.post('/api/pt/wallet', { 'content-type': 'application/json' }, { mb: P.mb, t: P.t, amount: Math.floor(ptw.available / 100) });
    ok('PT requests withdraw', wq.ok, wq.error);
    await reload(page);
    const wrow = page.locator('div.grid', { hasText: P.mb }).filter({ has: page.getByRole('button', { name: 'อนุมัติถอน' }) }).first();
    ok('PT withdraw shows first-time flag', /ถอนครั้งแรก/.test(await wrow.innerText()));
    await wrow.getByRole('button', { name: 'อนุมัติถอน' }).click();
    await confirmDlg(page, 'อนุมัติ');
    ok('PT withdraw approved msg', /ส่งให้แอดมินโอน/.test(await waitMsg(page, /ส่งให้แอดมินโอน/)));
    for (const [label, name] of [['partner', spa.name], ['vendor', V.name]]) {
      const row = page.locator('div.flex-wrap', { hasText: name }).filter({ has: page.getByRole('button', { name: 'อนุมัติถอน' }) }).first();
      ok(`${label} request shows new-bank flag`, /บัญชีใหม่/.test(await row.innerText()));
      await row.getByRole('button', { name: 'อนุมัติถอน' }).click();
      await confirmDlg(page, 'อนุมัติ');
      ok(`${label} withdraw approved`, /ส่งให้แอดมินโอน/.test(await waitMsg(page, new RegExp(`อนุมัติถอน ${name}`))));
    }
    const crow = page.locator('section', { hasText: 'ถอนเงินลูกค้า' }).locator('div.flex-wrap').filter({ has: page.getByRole('button', { name: 'อนุมัติถอน' }) }).first();
    await crow.getByPlaceholder('เหตุผลถ้าไม่อนุมัติ').fill('ชื่อบัญชีไม่ตรงกับชื่อลูกค้า');
    await crow.getByRole('button', { name: 'ไม่อนุมัติ' }).click();
    await confirmDlg(page, 'ไม่อนุมัติ');
    ok('customer withdraw rejected → refunded msg', /คืนยอด/.test(await waitMsg(page, /คืนยอด/)));
    ok('customer balance restored (API)', (await custW(C3)).available === 300000, String((await custW(C3)).available));
    await step('payroll-done');

    // ── 3. โอนเงิน: PT โอนแล้ว · พาร์ทเนอร์โอนแล้ว · ร้านค้าโอนไม่สำเร็จ (คืนยอด) ──
    await go('/admin/payouts', 'payouts');
    const prw = page.locator('div.grid', { hasText: P.mb }).filter({ has: page.getByRole('button', { name: '✓ โอนแล้ว' }) }).first();
    await prw.getByRole('button', { name: '✓ โอนแล้ว' }).click();
    await confirmDlg(page, 'โอนแล้ว');
    await waitMsg(page, /บันทึกแล้ว/);
    const wd = (await S.req('/api/admin/withdrawals', { headers: S.AH() }).then(S.J)).withdrawals.find((x) => x.parttime_mb === P.mb);
    ok('PT withdrawal paid (API)', wd?.status === 'paid', wd?.status);
    const sp = page.locator('div.flex-wrap', { hasText: spa.name }).filter({ has: page.getByRole('button', { name: '✓ โอนแล้ว' }) }).first();
    await sp.getByRole('button', { name: '✓ โอนแล้ว' }).click();
    await confirmDlg(page, 'โอนแล้ว');
    ok('partner paid msg', /บันทึกโอนแล้ว/.test(await waitMsg(page, /บันทึกโอนแล้ว/)));
    const vp = page.locator('div.flex-wrap', { hasText: V.name }).filter({ has: page.getByRole('button', { name: 'โอนไม่สำเร็จ' }) }).first();
    ok('failed needs reason', await vp.getByRole('button', { name: 'โอนไม่สำเร็จ' }).isDisabled());
    await vp.getByPlaceholder('เหตุผลถ้าโอนไม่สำเร็จ').fill('เลขบัญชีผิด');
    await vp.getByRole('button', { name: 'โอนไม่สำเร็จ' }).click();
    await confirmDlg(page, 'โอนไม่สำเร็จ');
    ok('vendor failed msg', /คืนยอด/.test(await waitMsg(page, /คืนยอด/)));
    const reqs = (await S.req('/api/admin/payout-requests', { headers: S.AH() }).then(S.J)).requests;
    ok('partner request paid (API)', reqs.find((x) => x.id === pr.request.id)?.status === 'paid');
    ok('vendor request failed + note (API)', reqs.find((x) => x.id === vr.request.id)?.status === 'failed' && /เลขบัญชีผิด/.test(reqs.find((x) => x.id === vr.request.id)?.note || ''));
    const vw = await S.req('/api/market/vendor/wallet', { headers: V.VC }).then(S.J);
    ok('vendor balance restored after failed transfer', vw.available === 200000 && vw.withdrawing === 0, `${vw.available} ${vw.withdrawing}`);
    await step('payouts-done');

    // ── 4. ห้องพัก: คืนเต็ม (เงินพักอยู่) · คืนหลังเข้าพัก (บางส่วน) ──
    const c4a = (await custW(C4)).available;
    await go('/admin/stays', 'stays');
    const r1 = page.locator('tr', { hasText: st1.row.code });
    await r1.getByRole('button', { name: 'คืนเงิน' }).click();
    const dlg = page.locator('[role=dialog][aria-modal=true]');
    await dlg.locator('input').fill('โรงแรมปิดปรับปรุงกะทันหัน');
    await dlg.getByRole('button', { name: 'คืนเงิน', exact: true }).click();
    ok('stay refund msg', new RegExp(`คืนเงิน ${st1.row.code} แล้ว`).test(await waitMsg(page, /คืนเงิน .* แล้ว/)));
    ok('customer got full stay refund (API)', (await custW(C4)).available === c4a + st1.row.total_satang, `${c4a}→${(await custW(C4)).available}`);
    await page.getByRole('button', { name: /^เข้าพักแล้ว/ }).click();
    await page.locator('tr', { hasText: st2.row.code }).getByRole('button', { name: 'คืนเงินหลังเข้าพัก' }).click();
    const box = page.locator('div.rounded-2xl', { hasText: 'คืนเงินหลังเข้าพัก ' + st2.row.code }).first();
    await box.getByLabel(/ยอดคืน/).fill('500');
    await box.getByLabel(/เหตุผล/).fill('แอร์เสีย 1 คืน');
    ok('split preview shown', /ดึงจากโรงแรม/.test(await box.innerText()));
    await box.getByRole('button', { name: 'ตรวจยอดและคืนเงิน' }).click();
    await confirmDlg(page, 'คืนเงิน');
    ok('after-stay refund msg', /฿500/.test(await waitMsg(page, /฿500 แล้ว/)));
    const sts = (await S.req('/api/admin/stays', { headers: S.AH() }).then(S.J));
    ok('after-stay refund recorded (API)', sts.rows.find((x) => x.id === st2.row.id)?.refund_satang === 50000);
    ok('hotel escrow reconciles', sts.recon?.ok, JSON.stringify(sts.recon));
    await step('stays-done');

    // ── 5. เมมเบอร์ · Sale Man ──
    await go('/admin/sales', 'sales');
    const mc = page.locator('div.rounded-xl', { hasText: C5 }).filter({ has: page.getByRole('button', { name: 'อนุมัติเปิดเมม' }) }).first();
    await mc.getByRole('button', { name: 'อนุมัติเปิดเมม' }).click();
    await askOk();
    ok('membership approve msg', /เปิดเมมแล้ว/.test(await waitMsg(page, /เปิดเมมแล้ว/)));
    ok('member credit in customer wallet (API)', (await custW(C5)).available > 0);
    const rn = 'เซลส์UI ' + stamp;
    await page.getByPlaceholder('ชื่อ Sale Man').fill(rn);
    await page.getByPlaceholder('เบอร์โทร').first().fill('0891112222');
    await page.getByPlaceholder('ธนาคาร').first().fill('กสิกรไทย');
    await page.getByPlaceholder('เลขบัญชี (10–15 หลัก)').fill('1234567890');
    await page.getByPlaceholder('ชื่อบัญชี').first().fill('เซลส์ ทดสอบ');
    await page.getByRole('button', { name: 'สร้าง Sale Man' }).click();
    ok('rep created msg', /สร้าง Sale Man แล้ว/.test(await waitMsg(page, /Sale Man/)));
    ok('rep dashboard link shown', /ลิงก์เข้าแดชบอร์ด/.test(await bodyText(page)));
    const repRow = page.locator('div.grid', { hasText: rn }).first();
    await repRow.getByRole('button', { name: 'แก้ไข' }).click();
    await page.getByLabel('ชื่อ', { exact: true }).fill(rn + ' แก้');
    await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
    ok('rep edit msg', /บันทึก Sale Man แล้ว/.test(await waitMsg(page, /บันทึก Sale Man แล้ว/)));
    ok('rep name updated in list', await poll(async () => (await bodyText(page)).includes(rn + ' แก้')));
    await step('sales-done');

    // ── 6. โปรโมทโปรไฟล์ ──
    await go('/admin/boosts', 'boosts');
    const bc = page.locator('div.rounded-2xl', { hasText: P.mb }).filter({ has: page.getByRole('button', { name: 'เปิดโปรโมท' }) }).first();
    await bc.getByRole('button', { name: 'เปิดโปรโมท' }).click();
    await confirmDlg(page, 'เปิดโปรโมท');
    ok('boost approve msg', /เปิดโปรโมทแล้ว/.test(await waitMsg(page, /เปิดโปรโมทแล้ว/)));
    ok('PT listed under กำลังโปรโมท', await poll(async () => (await page.locator('div.grid', { hasText: P.mb }).count()) > 0));
    await step('boosts-done');

    // ── 7. โค้ดโปรโมชัน ──
    await go('/admin/promos', 'promos');
    const code = ('UI' + stamp + dev.slice(0, 2)).toUpperCase();
    await page.getByPlaceholder('MBGIFT2026').fill(code);
    await page.locator('label', { hasText: 'เครดิต (บาท)' }).locator('input').fill('100');
    await page.locator('label', { hasText: 'จำนวนสิทธิ์' }).locator('input').fill('5');
    await page.getByRole('button', { name: 'สร้างโค้ด' }).click();
    ok('promo created msg', new RegExp(`สร้างโค้ด ${code} แล้ว`).test(await waitMsg(page, /สร้างโค้ด/)));
    const pc = page.locator('div.rounded-xl', { hasText: code });
    await pc.getByRole('button', { name: 'ปิดโค้ด' }).click();
    ok('promo toggled off', await poll(async () => (await pc.getByRole('button', { name: 'เปิดโค้ด' }).count()) === 1));
    const past = await S.post('/api/admin/promos', S.AH(), { action: 'create', amount: 10, max_uses: 1, expires_at: '2020-01-01', note: '' });
    ok('past expiry refused', past.ok === false, JSON.stringify(past));
    const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
    const td = await S.post('/api/admin/promos', S.AH(), { action: 'create', amount: 10, max_uses: 1, expires_at: today, note: 'ui' });
    ok('expiry = today valid until end of day (Bangkok)', td.ok && Date.parse(td.code.expires_at) > Date.now(), JSON.stringify(td).slice(0, 160));
    await as(ctx, 'finance', `ui-fin-${dev}@local.test`);
    await go('/admin/promos', 'promos-finance');
    await page.getByRole('button', { name: 'สร้างโค้ด' }).click();
    ok('finance: big promo (฿500×100) needs CEO', /ต้องให้ CEO/.test(await waitMsg(page, /CEO|สร้าง/)));
    await step('promos-done');
  } catch (e) {
    ok('suite ran to the end', false, e.message.split('\n')[0]);
    await step('crash');
  }
  const lw = await wallet();
  ok('ledger still balanced', lw.sum === 0, String(lw.sum));
  note(`PT ${P.mb} · hotel ${H.name} · vendor ${V.name}`);
  void BASE;
  await done();
})();
