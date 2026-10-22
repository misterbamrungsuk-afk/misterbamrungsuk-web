// พาร์ทเนอร์ (สปา + โรงแรม) กดหน้าจอจริง: สมัคร → ชำระแผน (QR+สลิป) → หน้าสมัครสำเร็จ → นัด QC + แนบเอกสาร → แอดมินอนุมัติ (API)
// → ตั้งรหัสผ่าน → ออก/เข้าสู่ระบบ → พอร์ทัล (สถานะ/วันคงเหลือ) → หน้าร้าน → การจอง (ยืนยัน/ห้องเต็ม) → กระเป๋า + ขอถอน → แจ้งเตือน → แผน/ใบเสร็จ
// โรงแรม: ห้องพัก (ประเภทห้อง+รูป+ราคา) → ลูกค้าจอง (API) → ยืนยัน/ปฏิเสธ → เลื่อนวันจนเช็กเอาต์ (demo_shift) → กระเป๋าได้ยอด
// node e2e/ui/30-partner.js <iphone|pixel>  (รันผ่าน run.js · โหมดสาธิตเท่านั้น)
const fs = require('fs');
const { start, api, customerCookie, adminToken, IMGS, uniq } = require('./_lib');
const dev = process.argv[2] || 'pixel';
const ADM = 'mord_admin=' + adminToken('ceo');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const IMG = fs.readFileSync(IMGS[0]);
const PW = 'Ui-' + Math.random().toString(36).slice(2, 10) + '9x';
const bkk = (n = 0) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const cookieOf = (c) => `${c.name}=${c.value}`;
// Part-Time ที่เปิดรับงานอยู่ (หน้าแรก) — โหมดสาธิตใช้ร่วมกับชุดอื่น จึงหาเองทุกรอบ แทนการผูก MBM-2610001
const pubId = (mb) => 'r' + require('crypto').createHash('sha256').update('mb-public:' + mb).digest('hex').slice(0, 10);
async function livePt() {
  const ids = [...new Set(((await api('/')).text.match(/\/p\/(r[0-9a-f]{10})/g) || []).map((x) => x.slice(3)))];
  for (let n = 1; n < 400; n++) { const mb = 'MBM-26' + String(10000 + n).padStart(5, '0'); if (ids.includes(pubId(mb))) return { pid: pubId(mb), mb }; }
  return { pid: ids[0], mb: 'MBM-2610001' };
}
const { ptToken } = require('./_lib');
// รอ React hydrate ก่อนกด/กรอก (เครื่องสาธิตใช้ร่วมกันหลายคน คอมไพล์ช้า — กดก่อน hydrate = ฟอร์มส่งแบบ HTML เปล่า)
const ready = (page, sel = 'form, button') => page.waitForFunction((s) => [...document.querySelectorAll(s)].some((e) => Object.keys(e).some((k) => k.startsWith('__reactFiber') || k.startsWith('__reactProps'))), sel, { timeout: 60000 }).catch(() => {});
const nav = (page, name) => page.getByRole('navigation', { name: 'เมนูพาร์ทเนอร์' }).getByRole('link', { name, exact: true });

async function topup(email, baht) {
  const C = cookieOf(customerCookie(email));
  const fd = new FormData(); fd.set('amount', String(baht)); fd.set('slip', new File([IMG], 's.jpg', { type: 'image/jpeg' }));
  await api('/api/wallet/topup', { method: 'POST', cookie: C, form: fd });
  const a = (await api('/api/admin/wallet', { cookie: ADM })).json;
  const tp = (a?.topups || []).find((x) => x.customer_email === email && x.status === 'pending');
  if (tp) await api('/api/admin/wallet', { method: 'POST', cookie: ADM, body: { action: 'approve', id: tp.id } });
  return C;
}
const bal = async (C) => (await api('/api/wallet', { cookie: C })).json?.available ?? -1;

/** สมัคร → ชำระ → done → (QC) — คืน { email, token, pid, code } */
async function applyAndPay(t, { type, name, doQc }) {
  const { page, ok, step, go } = t;
  page.setDefaultTimeout(60000);
  const email = `${uniq('ui-' + (type === 'โรงแรม' ? 'hotel' : 'spa') + '-')}@test.local`;
  await go('/partner', 'sale'); await ready(page);
  ok('sale: hero + packages visible', /ขายบริการของคุณ/.test(await page.locator('h1').first().innerText()) && (await page.locator('#packages button[aria-pressed]').count()) === 2);
  ok('sale: no "แพ็กเกจ" in copy', !/แพ็กเกจ/.test(await page.locator('body').innerText()));
  // ส่งฟอร์มว่าง/ไม่ติ๊ก PDPA → แจ้งเตือนภาษาไทย
  const form = page.locator('#apply form');
  await form.locator('button[type=submit]').click();
  ok('sale: submit without consent → Thai error', /PDPA/.test(await form.locator('[role=alert]').innerText().catch(() => '')));
  await form.getByPlaceholder('ชื่อธุรกิจ').fill(name);
  await form.getByRole('radio', { name: type, exact: true }).click();
  ok('sale: business type selected', (await form.getByRole('radio', { name: type, exact: true }).getAttribute('aria-checked')) === 'true');
  await form.getByPlaceholder('ชื่อผู้ติดต่อ').fill('คุณทดสอบ ยูไอ');
  await form.getByPlaceholder('08x-xxx-xxxx').fill('08' + String(Date.now()).slice(-8));
  await form.getByPlaceholder('(ถ้ามี)').fill('uitest');
  await form.getByPlaceholder('name@example.com').fill(email);
  await form.getByPlaceholder('จังหวัด / ย่าน').fill('กรุงเทพฯ · สีลม');
  await form.locator('input[type=checkbox]').check();
  await step('sale-form-filled');
  await form.locator('button[type=submit]').click();
  await page.getByText('ได้รับใบสมัครแล้ว').waitFor({ timeout: 45000 }).catch(() => {});
  await step('sale-applied');
  ok('sale: application received', await page.getByText('ได้รับใบสมัครแล้ว').count() > 0, await page.locator('#apply [role=alert]').innerText().catch(() => ''));
  const rows = (await api('/api/admin/partners', { cookie: ADM })).json?.rows || [];
  const p0 = rows.find((r) => r.email === email);
  ok('data: partner row created with type', p0 && p0.type === type, p0 && p0.type);
  // ไปชำระ
  await page.locator('#apply a', { hasText: 'ไปชำระแผนโปรโมท' }).click();
  await page.waitForURL(/\/partner\/pay\?t=/, { timeout: 45000 }); await page.waitForLoadState('networkidle');
  await ready(page); await step('pay');
  const token = decodeURIComponent(/[?&]t=([^&]+)/.exec(page.url())[1]);
  ok('pay: shows business + type', (await page.locator('body').innerText()).includes(name));
  await page.getByRole('radio', { name: /3 เดือน/ }).click();
  const alt = await page.locator('img[alt^="QR พร้อมเพย์"]').getAttribute('alt').catch(() => '');
  ok('pay: QR carries 3-month amount 45000', /45000/.test(alt || ''), alt);
  const btn = page.getByRole('button', { name: /ยืนยันการชำระ/ });
  ok('pay: submit disabled before slip', await btn.isDisabled());
  await page.locator('input[type=file]').setInputFiles(IMGS[1]);
  await page.getByAltText('สลิปที่แนบ').waitFor({ timeout: 45000 }).catch(() => {});
  ok('pay: still disabled until terms accepted', await btn.isDisabled());
  await page.getByRole('checkbox').click();
  await step('pay-filled');
  await btn.click();
  await page.getByText('ได้รับสลิปแล้ว').waitFor({ timeout: 45000 }).catch(() => {});
  await step('pay-sent');
  const sent = await page.locator('body').innerText();
  ok('pay: slip received + invoice number', /ได้รับสลิปแล้ว/.test(sent) && /PI-/.test(sent), sent.slice(0, 160));
  const pur = (await api(`/api/admin/partners/purchases?partner=${p0?.id}`, { cookie: ADM })).json?.rows || [];
  ok('data: pending purchase 3m ฿45,000', pur[0]?.status === 'pending' && pur[0].package === '3m' && pur[0].amount === 45000, JSON.stringify(pur[0] || {}).slice(0, 120));
  // หน้าสถานะ
  await page.getByRole('link', { name: 'ดูสถานะการสมัคร' }).click();
  await page.waitForURL(/\/partner\/done/); await page.waitForLoadState('networkidle');
  await step('done');
  const dt = await page.locator('body').innerText();
  const code = (/P-?[A-Z0-9]{4,}[-A-Z0-9]*/.exec(dt) || [])[0];
  ok('done: partner code + timeline + slip waiting', /รหัสพาร์ทเนอร์ของคุณ/.test(dt) && /สถานะการสมัคร/.test(dt) && /รอตรวจสลิป/.test(dt), dt.slice(0, 200));
  if (doQc) {
    await page.getByRole('link', { name: 'นัด QC สถานที่' }).click();
    await page.waitForURL(/\/partner\/qc/); await page.waitForLoadState('networkidle');
    await step('qc');
    const hidden = page.locator('input[type=file]');
    await hidden.nth(0).setInputFiles({ name: 'license.pdf', mimeType: 'application/pdf', buffer: PDF });
    await page.getByText('✓ อัปโหลดแล้ว').first().waitFor({ timeout: 45000 }).catch(() => {});
    await hidden.nth(1).setInputFiles([IMGS[2], IMGS[3]]);
    await page.getByText(/รูปสถานที่ \(2\)/).waitFor({ timeout: 45000 }).catch(() => {});
    await hidden.nth(2).setInputFiles(IMGS[4]);
    await page.getByText('3 / 3 รายการ').waitFor({ timeout: 45000 }).catch(() => {});
    ok('qc: 3 / 3 documents uploaded', await page.getByText('3 / 3 รายการ').count() > 0, await page.locator('p[role=alert]').innerText().catch(() => ''));
    await page.getByRole('radiogroup', { name: 'วันนัด' }).getByRole('radio').nth(2).click();
    await page.getByRole('radio', { name: '13:00' }).click();
    await step('qc-filled');
    await page.getByRole('button', { name: /ยืนยันนัด QC/ }).click();
    await page.getByText('ยืนยันนัด QC แล้ว').waitFor({ timeout: 45000 }).catch(() => {});
    await step('qc-booked');
    ok('qc: booking confirmed', await page.getByText('ยืนยันนัด QC แล้ว').count() > 0);
    const p1 = ((await api('/api/admin/partners', { cookie: ADM })).json?.rows || []).find((r) => r.email === email);
    ok('data: qc_slot + docs stored', !!p1?.qc_slot && p1.qc_status === 'booked' && (p1.qc_docs?.photos?.length ?? 0) === 2 && (p1.qc_docs?.license?.length ?? 0) === 1, JSON.stringify({ s: p1?.qc_slot, st: p1?.qc_status, d: p1?.qc_docs && Object.keys(p1.qc_docs) }));
  }
  return { email, token, pid: p0?.id, code, purchase: pur[0]?.id };
}

/** แอดมินอนุมัติสลิป + QC ผ่าน (API) → ตั้งรหัสผ่านจากหน้าสมัครสำเร็จ → ออก → เข้าสู่ระบบ */
async function approveAndLogin(t, a, { pct } = {}) {
  const { page, ok, step, go } = t;
  page.setDefaultTimeout(60000);
  let j = (await api(`/api/admin/partners/purchases/${a.purchase}`, { method: 'POST', cookie: ADM, body: { action: 'approve' } })).json;
  ok('admin: approve plan slip', j?.ok && j.row.status === 'paid', j?.error);
  j = (await api(`/api/admin/partners/${a.pid}`, { method: 'PATCH', cookie: ADM, body: { qc_status: 'passed', ...(pct != null ? { platform_pct: pct } : {}) } })).json;
  ok('admin: QC passed → account active', j?.ok && j.row.account_status === 'active', j?.error || j?.row?.account_status);
  // ลิงก์ตั้งรหัสผ่านในหน้าสมัครสำเร็จ (token เดิม)
  await go(`/partner/done?t=${encodeURIComponent(a.token)}`, 'done-approved');
  ok('done: timeline shows paid', !/รอตรวจสลิป/.test(await page.locator('body').innerText()));
  await page.getByRole('link', { name: 'ตั้งรหัสผ่าน / เข้าสู่ระบบพอร์ทัล' }).click();
  await page.waitForURL(/\/partner\/register/); await page.waitForLoadState('networkidle');
  await ready(page); await step('register');
  ok('register: email prefilled', (await page.locator('input[readonly]').inputValue()) === a.email);
  await page.locator('#pw').fill('short'); await page.locator('#pw2').fill('short');
  await page.getByRole('button', { name: 'สร้างบัญชีพาร์ทเนอร์' }).click();
  ok('register: short password → Thai error', /อย่างน้อย 8/.test(await page.locator('p[role=alert]').innerText().catch(() => '')));
  await page.locator('#pw').fill(PW); await page.locator('#pw2').fill(PW + 'x');
  await page.getByRole('button', { name: 'สร้างบัญชีพาร์ทเนอร์' }).click();
  ok('register: mismatch → Thai error', /ไม่ตรงกัน/.test(await page.locator('p[role=alert]').innerText().catch(() => '')));
  await page.locator('#pw2').fill(PW);
  await page.getByRole('button', { name: 'สร้างบัญชีพาร์ทเนอร์' }).click();
  await page.waitForURL(/\/partner\/portal/, { timeout: 60000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
  ok('register → portal', /\/partner\/portal$/.test(page.url()), page.url());
  // ลิงก์ใบสมัครใช้ซ้ำไม่ได้
  const re = await api('/api/partner/auth/register', { method: 'POST', body: { token: a.token, password: PW } });
  ok('data: apply link cannot set password twice', re.status === 409);
  // ออก → เข้าสู่ระบบ
  await page.getByRole('button', { name: 'ออก', exact: true }).click();
  await page.waitForURL(/\/partner\/login/, { timeout: 45000 }).catch(() => {}); await page.waitForLoadState('networkidle');
  await ready(page); await step('login');
  ok('logout → login page', /\/partner\/login/.test(page.url()), page.url());
  await page.locator('#em').fill(a.email); await page.locator('#pw').fill('wrong-password-1');
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  ok('login: wrong password → Thai error', /ไม่ถูกต้อง/.test(await page.locator('p[role=alert]').innerText({ timeout: 45000 }).catch(() => '')));
  await page.locator('#pw').fill(PW);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await page.waitForURL(/\/partner\/portal/, { timeout: 60000 }).catch(() => {}); await page.waitForLoadState('networkidle');
  await step('portal-home');
  ok('login → portal', /\/partner\/portal/.test(page.url()), page.url());
  const home = await page.locator('main').innerText();
  ok('portal home: plan days left 3 เดือน', /แผนโปรโมท 3 เดือน/.test(home) && /เหลือ \d+ \/ \d+ วัน/.test(home), home.slice(0, 200));
  ok('portal home: account / storefront status shown', /บัญชี|เปิดหน้าร้าน/.test(home), home.slice(0, 120));
}

async function walletPayout(t, PC, expectAvail) {
  const { page, ok, step } = t;
  page.setDefaultTimeout(60000);
  await nav(page, 'กระเป๋าเงิน').click();
  await page.waitForURL(/\/portal\/wallet/); await page.getByText('ยอดถอนได้').waitFor({ timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(800);
  await step('wallet');
  const w0 = (await api('/api/partner/wallet', { cookie: PC })).json;
  ok('wallet: balance shown = API', w0?.available === expectAvail && (await page.locator('body').innerText()).includes('฿' + (expectAvail / 100).toLocaleString('th-TH')), `${w0?.available} vs ${expectAvail}`);
  const amt = Math.floor(expectAvail / 100 / 2);
  await page.getByPlaceholder(/สูงสุด/).fill(String(amt));
  await page.getByPlaceholder('xxx-x-xxxxx-x').fill('123-4-56789-0');
  await page.getByLabel(/ชื่อบัญชี/).fill('บจก. ทดสอบยูไอ');
  await page.getByRole('button', { name: 'ส่งคำขอถอน' }).click();
  await page.getByText('ส่งคำขอถอนแล้ว').waitFor({ timeout: 45000 }).catch(() => {});
  await step('wallet-requested');
  ok('wallet: payout requested message', await page.getByText('ส่งคำขอถอนแล้ว').count() > 0, await page.locator('[role=status]').innerText().catch(() => ''));
  const w1 = (await api('/api/partner/wallet', { cookie: PC })).json;
  ok('data: moved to withdrawing', w1?.withdrawing === amt * 100 && w1.requests?.[0]?.status === 'requested', JSON.stringify({ a: w1?.available, w: w1?.withdrawing }));
  ok('wallet: request listed as waiting CEO', await page.getByText('รอ CEO อนุมัติ').count() > 0);
}

async function spa() {
  const t = await start('30-spa', dev);
  const { page, ctx, ok, step, note } = t;
  page.setDefaultTimeout(60000);
  try {
    const a = await applyAndPay(t, { type: 'เดย์สปา', name: 'สปายูไอ ' + dev, doQc: true });
    if (!a.pid) return t.done();
    await approveAndLogin(t, a, { pct: 20 });
    const PC = (await ctx.cookies()).filter((c) => c.name === 'mb_partner').map(cookieOf).join('; ');
    ok('partner session cookie', PC.startsWith('mb_partner='));

    // ── หน้าร้าน ──
    await nav(page, 'หน้าร้าน').click();
    await page.waitForURL(/\/portal\/listing/); await page.waitForLoadState('networkidle');
    await step('listing');
    await page.locator('label:has-text("ภาพปก") input[type=file], label:has-text("เลือกภาพปก") input[type=file]').first().setInputFiles(IMGS[5]);
    await page.getByAltText('ภาพปก').waitFor({ timeout: 45000 }).catch(() => {});
    ok('listing: cover uploaded + preview', await page.getByAltText('ภาพปก').count() > 0, await page.locator('[role=status]').innerText().catch(() => ''));
    await page.locator('input[type=file][multiple]').first().setInputFiles([IMGS[6], IMGS[7]]);
    await page.getByText('แกลเลอรี (2/12)').waitFor({ timeout: 45000 }).catch(() => {});
    ok('listing: gallery 2 photos', await page.getByText('แกลเลอรี (2/12)').count() > 0);
    await page.locator('#area').fill('สีลม');
    await page.locator('#cphone').fill('02-111-2222'); await page.locator('#cline').fill('@uispa');
    await page.locator('#caddr').fill('1 ถนนสีลม บางรัก กรุงเทพ 10500');
    await page.locator('#desc').fill('สปาทดสอบระบบ ห้องส่วนตัว');
    await page.getByRole('button', { name: 'เพิ่มห้อง' }).click(); await page.getByRole('button', { name: 'เพิ่มห้อง' }).click();
    await page.getByRole('button', { name: '+ เพิ่มบริการ' }).click();
    await page.getByLabel('ชื่อบริการ').last().fill('นวดอโรมา');
    await page.getByLabel('เวลา (นาที)').last().fill('90');
    await page.getByLabel('ราคาฐานของสปา').last().fill('1200');
    const pub = page.locator('label:has-text("เปิดแสดงหน้าร้าน") input[type=checkbox]');
    ok('listing: publish toggle enabled (active account)', !(await pub.isDisabled()));
    if (!(await pub.isChecked())) await pub.check();
    await step('listing-filled');
    await page.getByRole('button', { name: 'บันทึกหน้าร้าน' }).click();
    await page.getByText('บันทึกแล้ว ✓').waitFor({ timeout: 45000 }).catch(() => {});
    ok('listing: saved', await page.getByText('บันทึกแล้ว ✓').count() > 0, await page.locator('[role=status]').innerText().catch(() => ''));
    const lt = (await api('/partner/portal/listing', { cookie: PC })).text.replace(/\\"/g, '"');
    const svc = /"id":"([^"]+)","name":"นวดอโรมา"/.exec(lt)?.[1];
    ok('data: listing saved (service id, published)', !!svc && /"published":true/.test(lt) && lt.includes('02-111-2222'));
    // หน้าร้านสาธารณะ
    const spaPage = await api(`/spas/${a.pid}`);
    if (spaPage.status === 200) ok('public spa page shows service', spaPage.text.replace(/<!-- -->/g, '').includes('นวดอโรมา'));
    else note(`/spas/${a.pid} → ${spaPage.status} (public spa page path differs)`);

    // ── การจอง: ลูกค้า 2 คนจองที่สปานี้ (API) → เพื่อนรับ → พอร์ทัล ──
    const cEmail = `${uniq('ui-spacust-')}@test.local`;
    const C = await topup(cEmail, 20000);
    const codes = [];
    const PT = await livePt();
    ok('seed: found a live Part-Time profile', !!PT.pid, JSON.stringify(PT));
    for (let i = 0; i < 2; i++) {
      const d = new Date(Date.now() + (20 + Math.floor(Math.random() * 40) + i) * 86400e3); d.setUTCHours(6 + i * 4, 0, 0, 0);
      const r = (await api('/api/bookings', { method: 'POST', cookie: C, body: { pid: PT.pid, hours: 3, starts_at: d.toISOString(), place: { type: 'spa', spa_id: a.pid, service_id: svc }, note: 'ขอห้องเงียบ' } })).json;
      ok(`seed: customer booking ${i + 1} at spa`, r?.ok, r?.error);
      if (!r?.ok) continue;
      const acc = (await api(`/api/pt/bookings/${r.id}`, { method: 'POST', body: { mb: PT.mb, t: ptToken(PT.mb), accept: true } })).json;
      ok(`seed: PT accepts booking ${i + 1}`, acc?.ok, acc?.error);
      codes.push((await api(`/api/bookings/${r.id}`, { cookie: C })).json?.booking?.code);
    }
    // กระดิ่งแจ้งเตือน (การจองใหม่)
    await nav(page, 'การจอง').click();
    await page.waitForURL(/\/portal\/bookings/); await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await step('bookings');
    const bell = await page.locator('header a[aria-label^="แจ้งเตือน"]').getAttribute('aria-label');
    ok('bell shows unread count', /แจ้งเตือน \d+ รายการ/.test(bell || ''), bell);
    ok('bookings: pending tab count = 2', await page.getByRole('tab', { name: /รอยืนยัน · 2/ }).count() > 0, (await page.getByRole('tab').allInnerTexts()).join(' | '));
    const row0 = page.locator('ul li button', { hasText: codes[0] || 'zz' });
    ok('bookings: row shows service + room fee', (await row0.innerText().catch(() => '')).includes('นวดอโรมา') && (await row0.innerText().catch(() => '')).includes('1,200'));
    await row0.click();
    await page.getByRole('dialog').waitFor({ timeout: 45000 }).catch(() => {});
    await page.getByRole('radio', { name: 'ห้อง 2' }).click();
    await step('booking-sheet');
    const sheet = await page.getByRole('dialog').innerText().catch(() => '');
    ok('sheet: split 20% shown', /หักแพลตฟอร์ม 20%/.test(sheet) && /960/.test(sheet), sheet.slice(0, 200));
    ok('sheet: customer note shown', sheet.includes('ขอห้องเงียบ'));
    await page.getByRole('button', { name: /ยืนยัน · ห้อง 2/ }).click();
    await page.getByRole('tab', { name: /ยืนยันแล้ว · 1/ }).waitFor({ timeout: 45000 }).catch(() => {});
    ok('confirm → tab ยืนยันแล้ว · 1', await page.getByRole('tab', { name: /ยืนยันแล้ว · 1/ }).count() > 0);
    // ห้องเต็ม: ยืนยันในหน้า
    await page.locator('ul li button', { hasText: codes[1] || 'zz' }).click();
    await page.getByRole('button', { name: 'แจ้งห้องเต็ม' }).click();
    await page.getByRole('alertdialog', { name: 'ยืนยันแจ้งห้องเต็ม' }).waitFor({ timeout: 45000 }).catch(() => {});
    await step('booking-full-ask');
    ok('mark full asks in-page confirm', await page.getByRole('alertdialog').count() > 0);
    await page.getByRole('button', { name: 'ยืนยัน ห้องเต็ม' }).click();
    await page.getByRole('tab', { name: /ห้องเต็ม.* · 1/ }).waitFor({ timeout: 45000 }).catch(() => {});
    await step('bookings-after');
    ok('full → tab count 1', await page.getByRole('tab', { name: / · 1/ }).count() >= 2, (await page.getByRole('tab').allInnerTexts()).join(' | '));
    const n = JSON.stringify((await api('/api/notifications', { cookie: C })).json || {});
    ok('data: customer notified spa full', n.includes('ห้องเต็ม'));
    // รีเฟรชแล้วสถานะยังอยู่ (เก็บฝั่งเซิร์ฟเวอร์)
    await page.reload({ waitUntil: 'networkidle' });
    ok('refresh keeps confirmed booking', await page.getByRole('tab', { name: /ยืนยันแล้ว · 1/ }).count() > 0);

    // ── แจ้งเตือน ──
    await page.locator('header a[aria-label^="แจ้งเตือน"]').click();
    await page.waitForURL(/\/portal\/notifications/); await page.waitForLoadState('networkidle');
    await step('notifications');
    ok('notifications: new-booking notice listed', /การจอง|นัด/.test(await page.locator('main').innerText()));
    const mark = page.getByRole('button', { name: 'อ่านทั้งหมดแล้ว' });
    if (await mark.count()) {
      await mark.click(); await page.waitForTimeout(800);
      ok('mark all read → bell cleared', (await page.locator('header a[aria-label^="แจ้งเตือน"]').getAttribute('aria-label')) === 'แจ้งเตือน');
      ok('data: unread 0', (await api('/api/partner/notifications?count=1', { cookie: PC })).json?.unread === 0);
    } else ok('notifications: has unread to mark', false);

    // ── กระเป๋าเงิน: ค่าห้องเข้าหลังนัดจบ — โหมดสาธิตเติมผ่านแอดมิน ──
    const cr = (await api('/api/admin/wallet', { method: 'POST', cookie: ADM, body: { action: 'adjust', owner_type: 'partner', owner_id: a.pid, bucket: 'available', amount_baht: 3000, reason: 'ค่าห้องทดสอบ UI', idem: 'ui-pw-' + a.pid } })).json;
    ok('seed: admin credits partner ฿3,000', cr?.ok, cr?.error);
    await walletPayout(t, PC, 300000);

    // ── แผนโปรโมท / ใบเสร็จ ──
    await nav(page, 'แผนโปรโมท').click();
    await page.waitForURL(/\/portal\/package/); await page.waitForLoadState('networkidle');
    await step('package');
    const pk = await page.locator('main').innerText();
    ok('package: current plan + QC passed + 20%', /3 เดือน/.test(pk) && /QC ผ่าน/.test(pk) && /20%/.test(pk), pk.slice(0, 200));
    ok('package: renew options', await page.getByRole('radiogroup', { name: 'แผนโปรโมท' }).getByRole('radio').count() === 2);
    await page.getByRole('link', { name: 'ใบเสร็จ / PDF' }).first().click();
    await page.waitForURL(/\/receipt\//); await page.waitForLoadState('networkidle');
    await step('receipt');
    const rc = await page.locator('#receipt-doc').innerText().catch(() => '');
    ok('receipt: RC number + amount 45,000', /RC-/.test(rc) && /45,000/.test(rc) && rc.includes('สปายูไอ'), rc.slice(0, 160));
    ok('receipt: save PDF button', await page.getByRole('button', { name: /PDF/ }).count() > 0);
  } catch (e) { ok('spa flow threw', false, e.message.split('\n')[0]); await step('error').catch(() => {}); }
  return t.done();
}

async function hotel() {
  const t = await start('30-hotel', dev);
  const { page, ctx, ok, step, note } = t;
  page.setDefaultTimeout(60000);
  page.on('console', (m) => { if (/hydrat/i.test(m.text())) note('HYDRATION @' + new URL(page.url()).pathname + ' ' + m.text().replace(/\s+/g, ' ').slice(0, 900)); });
  try {
    const a = await applyAndPay(t, { type: 'โรงแรม', name: 'โรงแรมยูไอ ' + dev, doQc: false });
    if (!a.pid) return t.done();
    await approveAndLogin(t, a, { pct: 15 });
    const PC = (await ctx.cookies()).filter((c) => c.name === 'mb_partner').map(cookieOf).join('; ');
    ok('hotel nav has ห้องพัก tab', await nav(page, 'ห้องพัก').count() > 0);
    // เปิดหน้าร้าน (ต้องเปิดแสดงก่อนลูกค้าจองได้)
    await nav(page, 'หน้าร้าน').click();
    await page.waitForURL(/\/portal\/listing/); await page.waitForLoadState('networkidle');
    await page.locator('#area').fill('สาทร');
    await page.locator('#caddr').fill('9 ถนนสาทร กรุงเทพ');
    const pub = page.locator('label:has-text("เปิดแสดงหน้าร้าน") input[type=checkbox]');
    if (!(await pub.isChecked())) await pub.check();
    await page.getByRole('button', { name: 'บันทึกหน้าร้าน' }).click();
    await page.getByText('บันทึกแล้ว ✓').waitFor({ timeout: 45000 }).catch(() => {});
    ok('hotel listing published', await page.getByText('บันทึกแล้ว ✓').count() > 0);

    // ── ห้องพัก ──
    await nav(page, 'ห้องพัก').click();
    await page.waitForURL(/\/portal\/rooms/); await page.waitForLoadState('networkidle');
    await step('rooms');
    await page.locator('#rn0').fill('Deluxe เตียงคู่'); await page.locator('#rp0').fill('1500'); await page.locator('#rc0').fill('2'); await page.locator('#rr0').fill('2');
    await page.locator('#rd0').fill('32 ตร.ม. วิวเมือง');
    await page.locator('section').filter({ hasText: 'ประเภทห้องที่ 1' }).locator('input[type=file]').setInputFiles([IMGS[8 % IMGS.length], IMGS[9 % IMGS.length]]);
    await page.locator('section').filter({ hasText: 'ประเภทห้องที่ 1' }).locator('img').nth(1).waitFor({ timeout: 45000 }).catch(() => {});
    ok('rooms: 2 photos on room 1', await page.locator('section').filter({ hasText: 'ประเภทห้องที่ 1' }).locator('img').count() === 2);
    await page.getByRole('button', { name: '+ เพิ่มประเภทห้อง' }).click();
    await page.locator('#rn1').fill('Suite'); await page.locator('#rp1').fill('4000'); await page.locator('#rc1').fill('4'); await page.locator('#rr1').fill('1');
    // ราคา 0 ห้องที่ 3 → นำออกด้วยการยืนยันในหน้า
    await page.getByRole('button', { name: '+ เพิ่มประเภทห้อง' }).click();
    await page.locator('#rn2').fill('ห้องทดลอง');
    await page.locator('section').filter({ hasText: 'ประเภทห้องที่ 3' }).getByRole('button', { name: 'นำออก' }).click();
    ok('rooms: remove asks in-page confirm', await page.getByRole('alertdialog', { name: 'ยืนยันนำห้องออก' }).count() > 0);
    await page.getByRole('button', { name: 'ใช่ นำออก' }).click();
    await step('rooms-filled');
    await page.getByRole('button', { name: 'บันทึกห้องพัก' }).click();
    await page.getByText('บันทึกแล้ว · ลูกค้าเห็นห้อง').waitFor({ timeout: 45000 }).catch(() => {});
    await step('rooms-saved');
    ok('rooms: saved', await page.getByText('บันทึกแล้ว · ลูกค้าเห็นห้อง').count() > 0, await page.locator('p[role=alert]').innerText().catch(() => ''));
    const rooms = (await api('/api/partner/rooms', { cookie: PC })).json?.rooms || [];
    const deluxe = rooms.find((r) => r.name === 'Deluxe เตียงคู่'), suite = rooms.find((r) => r.name === 'Suite');
    ok('data: 2 room types, price + photos', rooms.length === 2 && deluxe?.price_satang === 150000 && deluxe.photos.length === 2 && suite?.capacity === 4, JSON.stringify(rooms.map((r) => [r.name, r.price_satang, r.photos.length])));
    const pubPage = (await api(`/hotels/${a.pid}`)).text.replace(/<!-- -->/g, '');
    ok('public hotel page shows room', pubPage.includes('Deluxe เตียงคู่'));

    // ── ลูกค้าจอง (API) ──
    const cEmail = `${uniq('ui-staycust-')}@test.local`;
    const C = await topup(cEmail, 20000);
    const b0 = await bal(C);
    const off = 5 + Math.floor(Math.random() * 20);
    const book = async (room, ci, co, x = {}) => (await api('/api/hotels/bookings', { method: 'POST', cookie: C, body: { hotel_id: a.pid, room_type_id: room.id, check_in: bkk(ci), check_out: bkk(co), rooms: 1, guests: 2, guest_name: 'สมชาย ยูไอ', note: 'เช็กอินดึก', ...x } })).json;
    let A = await book(deluxe, off, off + 2);
    ok('seed: customer books Deluxe 2 nights (฿3,000)', A?.ok && A.row.total_satang === 300000, A?.error); A = A?.row;
    let D = await book(suite, off + 3, off + 4, { guests: 3 });
    ok('seed: customer books Suite 1 night', D?.ok, D?.error); D = D?.row;
    ok('data: wallet charged ฿7,000', (await bal(C)) === b0 - 700000);

    await nav(page, 'การจอง').click();
    await page.waitForURL(/\/portal\/bookings/); await page.waitForLoadState('networkidle');
    await step('stays');
    ok('stays: pending tab 2', await page.getByRole('tab', { name: 'รอยืนยัน · 2' }).count() > 0, (await page.getByRole('tab').allInnerTexts()).join(' | '));
    await page.locator('ul li button', { hasText: A?.code || 'zz' }).click();
    await page.getByRole('dialog').waitFor({ timeout: 45000 }).catch(() => {});
    await step('stay-sheet');
    const sh = await page.getByRole('dialog').innerText().catch(() => '');
    ok('stay sheet: price × nights, 15% fee, net 2,550', /หักแพลตฟอร์ม 15%/.test(sh) && /2,550/.test(sh) && sh.includes('เช็กอินดึก'), sh.slice(0, 240));
    await page.getByRole('button', { name: 'ยืนยันการจอง' }).click();
    await page.getByRole('tab', { name: 'ยืนยันแล้ว · 1' }).waitFor({ timeout: 45000 }).catch(() => {});
    ok('confirm → ยืนยันแล้ว · 1', await page.getByRole('tab', { name: 'ยืนยันแล้ว · 1' }).count() > 0);
    // ปฏิเสธ Suite (ยืนยันในหน้า + เหตุผล)
    const b1 = await bal(C);
    await page.locator('ul li button', { hasText: D?.code || 'zz' }).click();
    await page.getByRole('button', { name: 'ปฏิเสธ', exact: true }).click();
    await page.getByRole('alertdialog', { name: 'ยืนยันปฏิเสธการจอง' }).waitFor({ timeout: 45000 }).catch(() => {});
    await page.locator('#dr').fill('ปิดปรับปรุงห้อง Suite');
    await step('stay-decline-ask');
    await page.getByRole('button', { name: 'ยืนยัน ปฏิเสธ' }).click();
    await page.getByRole('tab', { name: 'ยกเลิก/คืนเงิน · 1' }).waitFor({ timeout: 45000 }).catch(() => {});
    ok('decline → ยกเลิก/คืนเงิน · 1', await page.getByRole('tab', { name: 'ยกเลิก/คืนเงิน · 1' }).count() > 0);
    ok('data: customer refunded ฿4,000', (await bal(C)) === b1 + 400000);
    // เลยเช็กเอาต์ → เข้าพักแล้ว + กระเป๋าโรงแรม
    const sh6 = (await api('/api/admin/stays', { method: 'POST', cookie: ADM, body: { action: 'demo_shift', id: A?.id, days: off + 3 } })).json;
    ok('seed: admin demo_shift past check-out', sh6?.ok, JSON.stringify(sh6).slice(0, 100));
    await api('/api/hotels/bookings', { cookie: C }); // sweep
    await page.reload({ waitUntil: 'networkidle' });
    await step('stays-completed');
    ok('stays: เข้าพักแล้ว · 1', await page.getByRole('tab', { name: 'เข้าพักแล้ว · 1' }).count() > 0, (await page.getByRole('tab').allInnerTexts()).join(' | '));
    await walletPayout(t, PC, 255000);
    // แจ้งเตือน
    await page.locator('header a[aria-label^="แจ้งเตือน"]').click();
    await page.waitForURL(/\/portal\/notifications/); await page.waitForLoadState('networkidle');
    await step('hotel-notifications');
    const nt = await page.locator('main').innerText();
    ok('hotel notifications: booking + money notices', /จอง/.test(nt) && /เงิน|ถอน|เข้ากระเป๋า/.test(nt), nt.slice(0, 200));
  } catch (e) { ok('hotel flow threw', false, e.message.split('\n')[0]); await step('error').catch(() => {}); }
  return t.done();
}

(async () => { await spa(); await hotel(); })().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
