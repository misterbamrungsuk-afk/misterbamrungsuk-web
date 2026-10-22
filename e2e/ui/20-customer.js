// ลูกค้า (กดหน้าจอจริง) ชุดที่ 1: สมัคร → เริ่มใช้งาน → หน้าแรก · ออก/เข้าระบบ · แก้โปรไฟล์ + ผู้ติดต่อฉุกเฉิน · ที่อยู่ เพิ่ม/ลบ (ยืนยันในหน้า)
// · รูปโปรไฟล์ อัป + ปรับตำแหน่ง · กระเป๋า เติมเงิน QR+สลิป (แอดมินอนุมัติผ่าน API) → ยอดขึ้น · ถอนเงิน (ตรวจช่อง + ข้อความเครดิตโบนัส) → รออนุมัติ
// · หน้าแรก/ค้นหา/ตัวกรอง/แผนที่ · โปรไฟล์เพื่อน · ถูกใจ/เลิกถูกใจ · "สนใจ" ประกาศวันนี้ว่าง
// node e2e/ui/run.js 20  (iphone + pixel)
const { start, api, BASE, IMGS, uniq } = require('./_lib');
const { livePT, ADMC } = require('./_cust');
const dev = process.argv[2] || 'pixel';

(async () => {
  const S = await start('20-customer', dev);
  const { page, ctx, step, ok, note, go } = S;
  const body = () => page.locator('body').innerText();
  const pt = await livePT().catch((e) => { ok('seed live Part-Time', false, e.message); return null; });
  const email = uniq('c20' + dev[0]) + '@test.local';
  const tel = '08' + String(Date.now()).slice(-8);
  const name = 'คุณทดสอบ ' + dev;
  const cookie = async () => (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
  const closePromo = async () => { const b = page.getByRole('button', { name: 'ไว้ทีหลัง' }); if (await b.isVisible().catch(() => false)) await b.click(); };

  // ── 1. onboarding → สมัคร ──
  await go('/onboarding', 'onboarding');
  const startBtn = page.getByRole('button', { name: 'เริ่มใช้งาน' });
  ok('onboarding: start disabled until age/terms ticked', await startBtn.isDisabled());
  await page.locator('label:has-text("อายุ 20 ปีขึ้นไป") input[type=checkbox]').check();
  await startBtn.click();
  await page.waitForURL(/\/auth\/register/); await page.waitForLoadState('networkidle');
  await step('register-empty');
  // ตรวจช่อง: ยังไม่ติ๊ก = ปุ่มกดไม่ได้ · เบอร์ผิด → ข้อความไทย
  const regBtn = page.getByRole('button', { name: 'สมัครสมาชิก', exact: true });
  ok('register: submit disabled before consent', await regBtn.isDisabled());
  await page.getByPlaceholder('เช่น คุณกฤษดา ส.').fill(name);
  await page.getByPlaceholder('08x-xxx-xxxx').fill('12345');
  await page.getByPlaceholder('you@email.com').fill(email);
  await page.getByPlaceholder('อย่างน้อย 8 ตัวอักษร').fill('Passw0rd!x');
  ok('register: password strength hint', /แข็งแรงดี/.test(await body()));
  await page.getByRole('button', { name: /ฉันอายุ 20 ปีขึ้นไป/ }).click();
  await regBtn.click();
  ok('register: bad phone → Thai error', /เบอร์มือถือไม่ถูกต้อง/.test(await page.locator('p[role=alert]').first().innerText().catch(() => '')));
  await page.getByPlaceholder('08x-xxx-xxxx').fill(tel);
  await regBtn.click();
  await page.getByText('สมัครสำเร็จ').waitFor({ timeout: 20000 }).catch(() => {});
  await step('register-done');
  ok('register → สมัครสำเร็จ', /สมัครสำเร็จ/.test(await body()), (await page.locator('p[role=alert]').first().innerText().catch(() => '')));
  ok('session cookie set', /hamoo_session=/.test(await cookie()));
  await page.getByRole('button', { name: 'เริ่มใช้งาน' }).click();
  await page.waitForURL(/\/notifications\/permission/).catch(() => {});
  await page.waitForLoadState('networkidle');
  await step('push-permission');
  await page.getByRole('button', { name: 'ไว้ทีหลัง' }).click().catch(() => {});
  await page.getByRole('link', { name: /ไปหน้าหลัก|ข้าม/ }).first().click();
  await page.waitForURL((u) => new URL(u).pathname === '/'); await page.waitForLoadState('networkidle');
  await closePromo();
  await step('home-new');
  ok('home greets new customer by name', (await body()).includes('สวัสดี คุณทดสอบ'), (await body()).match(/สวัสดี[^\n]*/)?.[0]);
  let me = await api('/api/me', { cookie: await cookie() });
  ok('API: profile saved name + phone', me.json?.profile?.name === name && String(me.json?.profile?.phone || '').replace(/\D/g, '').endsWith(tel.slice(-8)), JSON.stringify(me.json?.profile || me.json).slice(0, 160));

  // ── ออก / เข้าระบบ ──
  await go('/profile', 'account');
  ok('account shows name + wallet ฿0', (await body()).includes(name) && /กระเป๋าเงิน\s*฿0/.test(await body()));
  await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
  await page.waitForURL(/\/login/); await page.waitForLoadState('networkidle');
  await step('logged-out');
  ok('logout → /login, profile API 401', (await api('/api/me', { cookie: await cookie() })).status === 401);
  await page.getByPlaceholder('you@email.com').fill(email);
  await page.getByPlaceholder('อย่างน้อย 8 ตัวอักษร').fill('Passw0rd!x');
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await page.waitForURL((u) => !/\/login/.test(u)); await page.waitForLoadState('networkidle');
  await closePromo();
  ok('login → back in, greeted by name', (await body()).includes('สวัสดี คุณทดสอบ'), page.url());

  // ── แก้โปรไฟล์ + ผู้ติดต่อฉุกเฉิน ──
  await go('/profile/edit', 'profile-edit');
  const nm = page.locator('label:has-text("ชื่อที่แสดง") input');
  await nm.waitFor(); await page.waitForFunction(() => [...document.querySelectorAll('input[readonly]')].some((i) => i.value.includes('@')));
  ok('edit: email shown read-only', (await page.locator('label:has-text("อีเมล") input').inputValue()) === email);
  await nm.fill(name + ' แก้');
  await page.getByPlaceholder('ชื่อผู้ติดต่อฉุกเฉิน').fill('แม่ ทดสอบ');
  await page.getByPlaceholder('เบอร์ผู้ติดต่อ').fill('0891112222');
  await page.getByLabel('ความสัมพันธ์').selectOption('แม่');
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await page.getByRole('status').waitFor({ timeout: 10000 }).catch(() => {});
  await step('profile-saved');
  ok('edit: บันทึกแล้ว', /บันทึกแล้ว/.test(await page.getByRole('status').innerText().catch(() => '')));
  me = await api('/api/me', { cookie: await cookie() });
  ok('API: name + emergency contact saved', me.json?.profile?.name === name + ' แก้' && me.json?.profile?.emergency?.tel === '0891112222' && me.json?.profile?.emergency?.relation === 'แม่', JSON.stringify(me.json?.profile?.emergency));
  // รูปโปรไฟล์: อัป → ปรับตำแหน่ง → บันทึก
  await page.locator('input[type=file]').first().setInputFiles(IMGS[1]);
  await page.waitForTimeout(1500);
  const posBtn = page.getByRole('button', { name: 'บันทึกตำแหน่ง' });
  if (!(await posBtn.isVisible().catch(() => false))) await page.getByRole('button', { name: 'ปรับตำแหน่ง' }).click().catch(() => {});
  await page.getByLabel('ซูมรูป').fill('1.6').catch(() => {});
  await step('avatar-adjust');
  await posBtn.click().catch((e) => ok('avatar: save-position button', false, e.message));
  await page.waitForTimeout(1200);
  let av = await api('/api/avatar?as=customer', { cookie: await cookie() });
  ok('API: avatar uploaded + zoom saved', av.json?.ok && av.json.avatar && Math.abs((av.json.avatar.zoom ?? 1) - 1.6) < 0.06, JSON.stringify(av.json).slice(0, 160));
  await step('avatar-saved');

  // ── ที่อยู่: เพิ่ม 2 → ลบ 1 (ยืนยันในหน้า) ──
  await go('/profile/addresses', 'addresses');
  ok('addresses: empty hint', /ยังไม่มีที่อยู่/.test(await body()));
  for (const [l, d] of [['คอนโด', 'สุขุมวิท 21 อโศก'], ['ออฟฟิศ', 'สีลม ซอย 5']]) {
    await page.getByLabel('ชื่อสถานที่').fill(l); await page.getByLabel('รายละเอียดที่อยู่').fill(d);
    await page.getByRole('button', { name: 'บันทึกที่อยู่ใหม่' }).click();
    await page.getByText('บันทึกที่อยู่ใหม่แล้ว').waitFor({ timeout: 8000 }).catch(() => {});
  }
  ok('addresses: 2 shown, first is หลัก', (await body()).includes('คอนโด · หลัก') && (await body()).includes('ออฟฟิศ'));
  await page.getByRole('button', { name: 'ลบ', exact: true }).nth(1).click();
  await step('address-confirm');
  ok('addresses: in-page confirm shown (no browser dialog)', await page.getByRole('button', { name: 'ยืนยันลบ' }).isVisible());
  await page.getByRole('button', { name: 'ยืนยันลบ' }).click();
  await page.getByText('ลบที่อยู่แล้ว').waitFor({ timeout: 8000 }).catch(() => {});
  me = await api('/api/me', { cookie: await cookie() });
  ok('API: one address left (คอนโด)', me.json?.profile?.addresses?.length === 1 && me.json.profile.addresses[0].label === 'คอนโด', JSON.stringify(me.json?.profile?.addresses));
  await step('address-deleted');

  // ── 2. กระเป๋า: เติมเงิน QR + สลิป → แอดมินอนุมัติ ──
  await go('/wallet', 'wallet-empty');
  await page.getByRole('button', { name: 'เติมเงิน', exact: true }).click();
  await page.getByRole('button', { name: '฿5,000' }).click();
  const qrAlt = await page.locator('img[alt^="QR พร้อมเพย์"]').getAttribute('alt', { timeout: 8000 }).catch(() => '');
  ok('top-up: QR shows chosen amount', qrAlt.includes('5,000'), qrAlt);
  const sendSlip = page.getByRole('button', { name: 'ส่งสลิปเติมเงิน' });
  ok('top-up: send disabled until slip attached', await sendSlip.isDisabled());
  await page.locator('input[type=file]').setInputFiles(IMGS[0]);
  await step('topup-slip');
  await sendSlip.click();
  await page.getByRole('status').waitFor({ timeout: 15000 }).catch(() => {});
  const tmsg = await page.getByRole('status').innerText().catch(() => '');
  ok('top-up: slip sent message', /ส่งสลิปแล้ว|เข้ากระเป๋าแล้ว/.test(tmsg), tmsg);
  await step('topup-pending');
  if (/ส่งสลิปแล้ว/.test(tmsg)) {
    ok('top-up: pending row (รอตรวจ ฿5,000)', /คำขอเติมเงิน[\s\S]*฿5,000[\s\S]*รอตรวจ/.test(await body()));
    const a = await api('/api/admin/wallet', { cookie: ADMC });
    const tp = (a.json?.topups || []).find((x) => x.customer_email === email && x.status === 'pending');
    ok('admin sees pending top-up', !!tp);
    if (tp) { const r = await api('/api/admin/wallet', { method: 'POST', cookie: ADMC, body: { action: 'approve', id: tp.id } }); ok('admin approves', r.json?.ok, JSON.stringify(r.json)); }
    await page.reload({ waitUntil: 'networkidle' });
  }
  await page.getByText('฿5,000').first().waitFor({ timeout: 8000 }).catch(() => {});
  await step('wallet-funded');
  ok('wallet: balance ฿5,000 shown', /ยอดใช้ได้\s*฿5,000/.test(await body()), (await body()).match(/ยอดใช้ได้[^\n]*\n?[^\n]*/)?.[0]);
  ok('wallet: history row เติมเงิน +฿5,000', /เติมเงิน[\s\S]{0,80}\+฿5,000/.test(await body()));
  let w = await api('/api/wallet', { cookie: await cookie() });
  ok('API: wallet available = 500000 satang', w.json?.available === 500000, w.json?.available);

  // ── ถอนเงิน: ตรวจช่อง → แผ่นยืนยัน → รออนุมัติ ──
  ok('withdraw: bonus/code credit lock text shown', /เครดิตโบนัส[\s\S]*ถอนเป็นเงินสดไม่ได้/.test(await body()));
  await page.getByRole('button', { name: 'ถอนเงิน', exact: true }).first().click();
  await page.getByLabel('จำนวนที่ถอน (บาท)').fill('9000');
  ok('withdraw: over-limit message', /ถอนได้สูงสุด/.test(await body()));
  await page.getByLabel('จำนวนที่ถอน (บาท)').fill('1000');
  ok('withdraw: needs bank → เลือกธนาคาร', /เลือกธนาคาร/.test(await page.locator('span.text-\\[\\#ff8a9a\\]').first().innerText().catch(() => '')));
  await page.getByLabel('ธนาคาร').selectOption('กสิกรไทย');
  await page.getByLabel('เลขบัญชี').fill('123456');
  ok('withdraw: short account → 10–15 หลัก', /10–15 หลัก/.test(await body()));
  await page.getByLabel('เลขบัญชี').fill('123-4-56789-0');
  await page.getByLabel('ชื่อบัญชี').fill('ทดสอบ ลูกค้า');
  await step('withdraw-form');
  await page.locator('section').getByRole('button', { name: 'ถอนเงิน', exact: true }).last().click();
  const dlg = page.getByRole('dialog', { name: 'ยืนยันถอนเงิน' });
  ok('withdraw: confirm sheet shows amount + account', /฿1,000/.test(await dlg.innerText().catch(() => '')) && /1234567890/.test(await dlg.innerText().catch(() => '')));
  await step('withdraw-confirm');
  await dlg.getByRole('button', { name: 'ยืนยันถอน' }).click();
  await page.getByText(/ส่งคำขอถอน/).waitFor({ timeout: 10000 }).catch(() => {});
  await step('withdraw-pending');
  ok('withdraw: pending row รอทีมงานอนุมัติ', /ขอถอน ฿1,000[\s\S]*รอทีมงานอนุมัติ/.test(await body()));
  w = await api('/api/wallet', { cookie: await cookie() });
  ok('API: ฿1,000 moved to withdrawing', w.json?.available === 400000 && (w.json?.withdrawing ?? w.json?.withdraw?.withdrawing) === 100000, `${w.json?.available}/${w.json?.withdrawing}`);

  // ── 3. เลือกดู: หน้าแรก · ค้นหา · ตัวกรอง · แผนที่ · โปรไฟล์เพื่อน ──
  await go('/', 'home'); await closePromo();
  if (pt) {
    ok('home lists the live Part-Time', await page.locator(`a[href="/p/${pt.pid}"]`).count() > 0);
    await page.getByRole('button', { name: 'แนะนำ · TOP ก่อน' }).click().catch(() => {});
    await page.getByRole('button', { name: 'ราคา' }).click().catch(() => {});
    await step('home-sorted');
  }
  await page.getByLabel('ค้นหา').fill('วัฒนา');
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/search/).catch(() => {});
  await page.waitForLoadState('networkidle');
  if (!/\/search/.test(page.url())) await go('/search?q=' + encodeURIComponent('วัฒนา'), 'search');
  await step('search');
  ok('search: วัฒนา finds the Part-Time', pt ? await page.locator(`a[href="/p/${pt.pid}"]`).count() > 0 : true);
  await page.getByLabel('ค้นหา').fill('ไม่มีคนนี้แน่นอน');
  ok('search: no-match message', /ไม่พบเพื่อนที่ตรงกับคำค้น/.test(await body()));
  await page.getByLabel('ค้นหา').fill('');
  await page.getByRole('button', { name: 'ตัวกรอง' }).click();
  const fdlg = page.getByRole('dialog', { name: 'ตัวกรอง' });
  await fdlg.waitFor({ timeout: 5000 }).catch(() => {});
  await step('filter-sheet');
  await fdlg.getByRole('button', { name: /แสดงผล \d+ คน/ }).click();
  ok('filter: sheet closes after แสดงผล', !(await fdlg.isVisible().catch(() => false)));
  await go('/map', 'map');
  await page.waitForTimeout(1500);
  ok('map: page has map + people', await page.locator('.leaflet-container').count() > 0);

  if (pt) {
    // ประกาศ "วันนี้ว่าง" ของ PT (ทำแทน PT ผ่าน API)
    const fd = new FormData(); fd.set('mb', pt.mb); fd.set('t', pt.t); fd.set('step', 'post'); fd.set('text', 'ว่างไปคาเฟ่แถวอโศก'); fd.set('time', '18:00–22:00'); fd.set('zone', 'อโศก');
    const pr = await fetch(BASE + `/api/join/profile?mb=${pt.mb}&t=${encodeURIComponent(pt.t)}`, { method: 'POST', body: fd, headers: { 'x-forwarded-for': '10.5.1.' + Math.floor(Math.random() * 250) } });
    ok('seed: PT posts วันนี้ว่าง', pr.status === 200, pr.status);
    await go(`/p/${pt.pid}`, 'pt-profile');
    ok('profile: price + จองเลย', /฿[\d,]+/.test(await body()) && await page.getByRole('link', { name: 'จองเลย' }).count() > 0);
    ok('profile: report/block link', await page.getByRole('link', { name: /รายงานผู้ใช้/ }).count() > 0);
    // ถูกใจ / เลิกถูกใจ
    const heart = page.getByRole('button', { name: 'บันทึกเป็นคนโปรด' });
    await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/me') && r.request().method() === 'POST'), heart.click()]);
    ok('favorite: heart pressed', (await heart.getAttribute('aria-pressed')) === 'true');
    me = await api('/api/me', { cookie: await cookie() });
    ok('API: favorite saved', (me.json?.profile?.favorites || []).includes(pt.pid));
    await go('/favorites', 'favorites');
    ok('favorites page lists the Part-Time', await page.locator(`a[href="/p/${pt.pid}"]`).count() > 0);
    await page.locator(`a[href="/p/${pt.pid}"]`).first().click();
    await page.waitForURL(new RegExp(`/p/${pt.pid}`)); await page.waitForLoadState('networkidle');
    await page.locator('button[aria-label="บันทึกเป็นคนโปรด"][aria-pressed=true]').waitFor({ timeout: 15000 }).catch(() => {});
    ok('favorite: heart shows saved state on reload', (await page.getByRole('button', { name: 'บันทึกเป็นคนโปรด' }).getAttribute('aria-pressed')) === 'true');
    await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/me') && r.request().method() === 'POST'), page.getByRole('button', { name: 'บันทึกเป็นคนโปรด' }).click()]);
    me = await api('/api/me', { cookie: await cookie() });
    ok('API: favorite removed', !(me.json?.profile?.favorites || []).includes(pt.pid));
    // สนใจ
    const like = page.getByRole('button', { name: 'สนใจ', exact: true });
    if (await like.count()) {
      await like.click(); await page.getByRole('button', { name: '✓ สนใจแล้ว' }).waitFor({ timeout: 8000 }).catch(() => {});
      await step('interest');
      ok('สนใจ → ✓ สนใจแล้ว', await page.getByRole('button', { name: '✓ สนใจแล้ว' }).count() > 0);
      const st = await api(`/api/posts/interest?pid=${pt.pid}`, { cookie: await cookie() });
      ok('API: interest recorded', st.json?.interested === true, JSON.stringify(st.json));
    } else note('no วันนี้ว่าง post on profile');
  }
  S.res.errors = S.res.errors.filter((e) => !/due to access control checks/.test(e)); // WebKit: fetch ที่ถูกยกเลิกตอนเปลี่ยนหน้า (ไม่ใช่บั๊ก)
  await S.done();
})().catch((e) => { console.log('ERR ' + (e.stack || e.message).split('\n').slice(0, 3).join(' ')); process.exit(1); });
