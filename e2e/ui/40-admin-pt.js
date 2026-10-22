// หลังบ้าน: เส้นทางผู้สมัคร Part-Time (กดหน้าจอจริง) — ภาพรวม → ตรวจสลิป → ผู้สมัคร → KYC (แยกหน้าที่) → เปลี่ยนบัญชี → กลุ่มอบรม → ลิงก์เชิญ → แสดงหน้าแรก → อุทธรณ์
// node e2e/ui/40-admin-pt.js <iphone|pixel>   (เรียกผ่าน run.js) · ข้อมูลของชุดนี้สร้างใหม่ทุกครั้ง (ไม่ชนชุดอื่น)
const { start, BASE, uniq } = require('./_lib');
const S = require('./_seed');
const { as, adminCookie, confirmDlg, waitMsg, imgsLoaded, bodyText, reload, poll } = require('./_adm');
const dev = process.argv[2] || 'pixel';
const row = async (id) => (await S.patchApp(id, { line_joined: false })).row || {};

(async () => {
  // ── เตรียมข้อมูล (API) ──
  const tag = dev === 'iphone' ? 'ไอ' : 'พิก';
  const A1 = await S.newApplicant({ tag }), A2 = await S.newApplicant({ tag }), A3 = await S.newApplicant({ tag }), A4 = await S.newApplicant({ tag, pkg: 'B' });
  for (const a of [A3, A4]) await S.patchApp(a.id, { status: 'verified' });
  const T = await start('40-admin-pt', dev, { cookies: [adminCookie('ceo')] });
  const { page, ctx, step, ok, note, go, done } = T;
  page.setDefaultTimeout(45000); page.setDefaultNavigationTimeout(90000);
  page.on('console', (m) => { if (/hydrated but|did not match/i.test(m.text())) note('hydration @ ' + page.url() + ' · ' + m.text().replace(/s+/g, ' ').slice(200, 900)); });
  if (dev === 'pixel') await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE }).catch(() => {});
  try {
    // ── 1. ภาพรวม: คิวผู้สมัคร ──
    await go('/admin', 'overview');
    const q = async (label) => Number((await page.locator('a', { hasText: label }).first().locator('span').last().textContent().catch(() => '0')) || 0);
    ok('overview: slips queue ≥ 2', (await q('สลิปผู้สมัครรอตรวจ')) >= 2, String(await q('สลิปผู้สมัครรอตรวจ')));
    ok('overview: KYC queue ≥ 2', (await q('KYC รอตรวจ')) >= 2, String(await q('KYC รอตรวจ')));
    ok('overview queue links to /admin/slips', (await page.locator('a', { hasText: 'สลิปผู้สมัครรอตรวจ' }).first().getAttribute('href')) === '/admin/slips');
    await go('/admin/slips', 'slips-open');

    // ── 2. ตรวจสลิป: ยืนยัน A1 · ปฏิเสธ A2 พร้อมเหตุผล ──
    await step('slips');
    await page.getByRole('button', { name: new RegExp(A1.mb) }).first().click();
    const aside = page.locator('aside').first();
    ok('slip aside shows A1', (await aside.innerText()).includes(A1.mb));
    const sl = await imgsLoaded(page, `aside img[alt="สลิปของ ${A1.mb}"]`);
    ok('slip image loads', sl.n === 1 && sl.ok === 1, JSON.stringify(sl));
    await aside.getByRole('button', { name: 'ยืนยันรับเงิน' }).click();
    const t1 = await confirmDlg(page, 'ยืนยันรับเงิน');
    ok('confirm dialog asked before verify', /ยืนยันรับเงิน/.test(t1), t1);
    ok('verify flash', /ยืนยันรับเงินแล้ว/.test(await waitMsg(page, /ยืนยันรับเงินแล้ว/)));
    ok('A1 slip verified (API)', (await row(A1.id)).status === 'verified');
    await page.getByRole('button', { name: new RegExp(A2.mb) }).first().click();
    const rej = aside.getByRole('button', { name: 'ปฏิเสธ · แจ้งส่งใหม่' });
    ok('reject disabled without reason', await rej.isDisabled());
    await aside.getByRole('button', { name: 'ยอดไม่ตรง', exact: true }).click();
    await page.locator('#slip-why').fill('ยอดไม่ตรง ขาด ฿500');
    await rej.click();
    await confirmDlg(page, 'ปฏิเสธสลิป');
    ok('reject flash', /ปฏิเสธสลิปแล้ว/.test(await waitMsg(page, /ปฏิเสธสลิปแล้ว/)));
    const r2 = await row(A2.id);
    ok('A2 slip rejected + reason saved', r2.status === 'rejected' && /ขาด ฿500/.test(r2.slip_reject?.reason || ''), JSON.stringify(r2.slip_reject));
    await step('slips-done');
    await page.waitForLoadState('networkidle'); await page.waitForTimeout(2000); // router.refresh หลังตัดสินสลิปต้องจบก่อนเปลี่ยนหน้า

    // ── 3. กลุ่มอบรม: สร้าง + แก้ไข (ใช้จัดกลุ่มในหน้าผู้สมัคร) ──
    const cname = 'กลุ่มUI ' + uniq('').slice(-5);
    await go('/admin/cohorts', 'cohorts');
    await page.getByRole('button', { name: 'สร้างกลุ่มใหม่' }).click();
    const cf = page.locator('label', { hasText: 'ชื่อกลุ่ม' }).locator('input').first();
    await cf.fill(cname);
    await page.locator('label', { hasText: 'สถานที่' }).locator('input').first().fill('MB Studio ทดสอบ');
    await page.getByRole('button', { name: 'บันทึกกลุ่ม' }).click();
    await page.getByRole('button', { name: new RegExp(cname) }).first().waitFor({ timeout: 10000 }).catch(() => {});
    let cs = (await S.req('/api/admin/cohorts', { headers: S.AH() }).then(S.J)).cohorts || [];
    const coh = cs.find((c) => c.name === cname);
    ok('cohort created (API)', !!coh && coh.venue === 'MB Studio ทดสอบ', JSON.stringify(coh));
    await page.getByRole('button', { name: 'แก้ไขกลุ่มนี้' }).click();
    const ed = page.locator('label', { hasText: 'สถานที่' }).locator('input').last();
    await ed.fill('MB Studio ทองหล่อ ชั้น 2');
    await page.getByRole('button', { name: 'บันทึกการแก้ไข' }).click();
    await page.getByRole('button', { name: 'แก้ไขกลุ่มนี้' }).waitFor({ timeout: 10000 }).catch(() => {});
    cs = (await S.req('/api/admin/cohorts', { headers: S.AH() }).then(S.J)).cohorts || [];
    ok('cohort edited (API)', cs.find((c) => c.key === coh?.key)?.venue === 'MB Studio ทองหล่อ ชั้น 2');
    await step('cohort-edited');

    // ── 4. ผู้สมัคร: ค้นหา · รายละเอียด · เอกสาร · จัดกลุ่ม ──
    await go('/admin/applicants', 'applicants');
    await page.getByRole('tab', { name: /ทั้งหมด/ }).click();
    await page.getByLabel('ค้นหาผู้สมัคร').fill(A1.mb);
    const rows = page.locator('button', { hasText: /^MB[MT]?-\d+/ });
    await page.waitForTimeout(300);
    ok('search narrows to one applicant', (await page.locator('button', { hasText: A1.mb }).count()) >= 1 && !(await page.locator('button', { hasText: A2.mb }).count()));
    await page.locator('button', { hasText: A1.mb }).first().click();
    const ap = page.locator('aside').first();
    ok('detail panel shows A1', (await ap.innerText()).includes(A1.mb));
    await ap.getByRole('button', { name: 'ดูสลิปและเอกสาร' }).click();
    const docs = await imgsLoaded(page, 'aside img[src*="/api/admin/applicants/file"]');
    ok('uploaded docs load (all images 200)', docs.n >= 6 && docs.ok === docs.n, JSON.stringify(docs));
    const fr = await S.req(`/api/admin/applicants/file?path=${encodeURIComponent((await row(A1.id)).docs.id_card)}`);
    ok('doc file 401 without admin', fr.status === 401 || fr.status === 403, String(fr.status));
    await step('applicant-docs');
    await ap.getByRole('button', { name: cname }).click();
    ok('cohort assign flash', new RegExp('จัดเข้า').test(await waitMsg(page, /จัดเข้า/)));
    ok('A1 cohort saved (API)', (await row(A1.id)).cohort === coh?.key);
    void rows;

    // ── 5. เช็กชื่อ ──
    await go('/admin/cohorts', 'cohorts-att');
    await page.getByRole('button', { name: new RegExp(cname) }).first().click();
    const cell = page.getByRole('button', { name: /รอบ 1$/ }).first();
    await cell.waitFor({ timeout: 10000 });
    await cell.click();
    await poll(async () => (await cell.getAttribute('aria-pressed')) === 'true');
    await page.waitForTimeout(1500);
    await reload(page);
    await page.getByRole('button', { name: new RegExp(cname) }).first().click();
    ok('attendance round 1 saved (after reload)', (await page.getByRole('button', { name: /รอบ 1$/ }).first().getAttribute('aria-pressed')) === 'true');
    await page.getByRole('button', { name: 'เช็กชื่อทั้งหมดรอบล่าสุด' }).click();
    await page.waitForTimeout(2500);
    await reload(page);
    await page.getByRole('button', { name: new RegExp(cname) }).first().click();
    ok('mark-all latest round (round 2) saved', (await page.getByRole('button', { name: /รอบ 2$/ }).first().getAttribute('aria-pressed')) === 'true');
    await step('cohort-attendance');

    // ── 6. KYC: แยกหน้าที่ — super ออกลิงก์แล้วอนุมัติเองไม่ได้ ──
    const SUPER = `ui-super-${dev}@local.test`;
    await as(ctx, 'super', SUPER);
    await go('/admin/kyc', 'kyc-super');
    await page.locator('button', { hasText: A3.mb }).first().click();
    const kp = page.locator('aside').first();
    await kp.getByRole('button', { name: 'คัดลอกลิงก์เข้าโปรไฟล์' }).click();
    const cp = await waitMsg(page, /คัดลอกลิงก์เข้าโปรไฟล์แล้ว|\/join\/go\?t=/);
    ok('copy profile link → copied / link shown', /คัดลอกลิงก์เข้าโปรไฟล์แล้ว|\/join\/go\?t=/.test(cp), cp);
    await kp.getByRole('button', { name: 'อนุมัติเอกสาร' }).click();
    await confirmDlg(page, 'อนุมัติเอกสาร');
    const sod = await waitMsg(page, /ออกลิงก์/);
    ok('SoD: link minter cannot approve KYC (UI message)', /คุณเป็นคนออกลิงก์/.test(sod), sod);
    ok('A3 still submitted (API)', (await row(A3.id)).kyc_status === 'submitted');
    await step('kyc-sod-blocked');

    // ── 7. KYC role: ไม่มีปุ่มคัดลอกลิงก์ · อนุมัติ A3 · ตีกลับ A4 พร้อมเหตุผล ──
    await as(ctx, 'kyc', `ui-kyc-${dev}@local.test`);
    await go('/admin/kyc', 'kyc-role');
    ok('kyc role: no copy-link button', !(await page.getByRole('button', { name: /คัดลอกลิงก์เข้าโปรไฟล์|คัดลอกข้อความแจ้งแก้ไข/ }).count()));
    await page.locator('button', { hasText: A3.mb }).first().click();
    const kdocs = await imgsLoaded(page, 'aside img[src*="/api/admin/applicants/file"]');
    ok('KYC docs load', kdocs.n >= 6 && kdocs.ok === kdocs.n, JSON.stringify(kdocs));
    await page.locator('aside').first().getByRole('button', { name: 'อนุมัติเอกสาร' }).click();
    await confirmDlg(page, 'อนุมัติเอกสาร');
    ok('kyc approve flash', /อนุมัติเอกสารแล้ว/.test(await waitMsg(page, /อนุมัติเอกสารแล้ว/)));
    ok('A3 KYC approved (API)', (await row(A3.id)).kyc_status === 'approved');
    await page.getByRole('button', { name: /รอตรวจเอกสาร/ }).first().click();
    await page.locator('button', { hasText: A4.mb }).first().click();
    const k4 = page.locator('aside').first();
    await k4.getByRole('button', { name: 'ตีกลับให้แก้' }).click();
    const sendRej = k4.getByRole('button', { name: /^ตีกลับ/ }).last();
    await k4.locator('label', { hasText: 'บัตรประชาชน' }).first().locator('input[type=checkbox]').check();
    ok('reject needs a reason first', await sendRej.isDisabled());
    await k4.getByRole('button', { name: 'บัตรหมดอายุ' }).click();
    await sendRej.click();
    ok('kyc reject flash', /ตีกลับแล้ว/.test(await waitMsg(page, /ตีกลับแล้ว/)));
    const r4 = await row(A4.id);
    ok('A4 KYC rejected with reason (API)', r4.kyc_status === 'rejected' && Object.values(r4.kyc_reason || {}).includes('บัตรหมดอายุ'), JSON.stringify(r4.kyc_reason));
    const n4 = (await S.req(`/api/pt/notifications?mb=${A4.mb}&t=${encodeURIComponent(A4.t)}`).then(S.J)).notices || [];
    ok('applicant notified of KYC fixes (inbox)', n4.some((n) => n.kind === 'kyc_rejected' && /บัตรหมดอายุ/.test(n.body || '')), JSON.stringify(n4.map((n) => n.kind)));
    ok('kyc role sees no copy-link hint', !/คัดลอกข้อความแจ้งแก้ไข/.test(await waitMsg(page, /ตีกลับแล้ว/)));
    await step('kyc-decided');

    // ── 8. super: คัดลอกข้อความแจ้งแก้ไข (ผู้สมัครที่ถูกตีกลับ) ──
    await as(ctx, 'super', SUPER);
    await go('/admin/kyc', 'kyc-fix-link');
    await page.getByRole('button', { name: /ตีกลับ · รอแก้/ }).first().click();
    await page.locator('button', { hasText: A4.mb }).first().click();
    await page.locator('aside').first().getByRole('button', { name: 'คัดลอกข้อความแจ้งแก้ไข + ลิงก์' }).click();
    const fx = await waitMsg(page, /คัดลอกข้อความแจ้งแก้ไข|join\/go/);
    ok('fix message + link copied', /คัดลอกข้อความแจ้งแก้ไข|join\/go/.test(fx), fx);

    // ── 9. เปลี่ยนบัญชีรับเงิน (หลังอนุมัติ) → KYC ตรวจบัญชีใหม่ ──
    const bf = S.form({ mb: A3.mb, t: A3.t, bank: 'ไทยพาณิชย์ (SCB)', bank_account: '9876543210', bank_account_name: `${A3.first} ${A3.last}`, ck_terms: 'true', ck_pdpa: 'true', ck_profile: 'true' }, { bankbook: S.IMG('bb2.jpg') });
    const bj = await S.J(await S.req('/api/join/bank', { method: 'POST', body: bf }));
    ok('PT changes bank (API)', bj.ok !== false, JSON.stringify(bj).slice(0, 120));
    ok('bank_review pending', !!(await row(A3.id)).bank_review);
    await as(ctx, 'kyc', `ui-kyc-${dev}@local.test`);
    await go('/admin/kyc', 'bank-review');
    const brCard = page.locator('section', { hasText: 'เปลี่ยนบัญชีรับเงิน' }).locator('div.rounded-xl', { hasText: A3.mb });
    ok('bank review card lists A3 with new account', (await brCard.innerText().catch(() => '')).includes('9876543210'));
    await brCard.getByRole('button', { name: 'อนุมัติบัญชีใหม่' }).click();
    await confirmDlg(page, 'อนุมัติบัญชีใหม่');
    ok('bank review approve msg', /อนุมัติบัญชีใหม่แล้ว/.test(await waitMsg(page, /อนุมัติบัญชีใหม่แล้ว/)));
    const r3 = await row(A3.id);
    ok('bank_review cleared, new bank kept (API)', !r3.bank_review && r3.bank_account === '9876543210');
    await step('bank-review-done');

    // ── 10. ลิงก์เชิญ (ไม่มีค่าการันตี) ──
    await as(ctx, 'ceo');
    await go('/admin/invites', 'invites');
    const iname = 'ทีมUI ' + dev + ' ' + Date.now().toString(36).slice(-4);
    await page.getByPlaceholder('เช่น ทีมนวด รุ่น 1').fill(iname);
    await page.getByRole('button', { name: 'สร้างลิงก์' }).click();
    const im = await waitMsg(page, /สร้างแล้ว/);
    const code = /\/join\/i\/([A-Z0-9]+)/.exec(im)?.[1];
    ok('invite created with link', !!code, im);
    if (dev === 'pixel') { await page.locator('tr', { hasText: iname }).getByRole('button', { name: 'คัดลอก' }).click(); await page.waitForTimeout(300); ok('copy invite → copied or link shown', (await page.locator('tr', { hasText: iname }).innerText()).includes('คัดลอกแล้ว') || /คัดลอกอัตโนมัติไม่ได้/.test(await waitMsg(page, /คัดลอก/))); }
    await step('invite-created');
    const pub = await ctx.newPage();
    await pub.goto(BASE + '/join/i/' + code, { waitUntil: 'networkidle' });
    const pubTxt = await pub.locator('body').innerText();
    ok('invite page: no guarantee fee', !/ค่าการันตี Branding/.test(pubTxt) || /ไม่ต้องชำระค่าการันตี|ไม่มีค่าการันตี/.test(pubTxt), pubTxt.slice(0, 120));
    await pub.close();
    await page.getByRole('switch', { name: `เปิด/ปิด ${iname}` }).click();
    ok('invite toggled off', await poll(async () => (await page.locator('tr', { hasText: iname }).innerText()).includes('ปิดอยู่')));
    await page.getByRole('switch', { name: `เปิด/ปิด ${iname}` }).click();
    ok('invite toggled back on', await poll(async () => (await page.locator('tr', { hasText: iname }).innerText()).includes('ใช้งานได้')));
    const A5 = await S.newApplicant({ tag, invite: code, kyc: false, bank: false });
    ok('applicant via invite registered', !!A5.mb);
    await reload(page);
    const recent = page.locator('a', { hasText: A5.mb });
    ok('invite: recent applicant listed', (await recent.count()) > 0);
    if (await recent.count()) {
      const rh = await recent.first().getAttribute('href');
      ok('recent link → /admin/applicants?q=MB', rh === `/admin/applicants?q=${A5.mb}`, rh);
      await go(rh, 'invite-recent-link');
      await poll(async () => (await page.locator('aside').first().innerText()).includes(A5.mb));
      ok('recent link opens applicants filtered to that MB', (await page.getByLabel('ค้นหาผู้สมัคร').inputValue()) === A5.mb && (await page.locator('aside').first().innerText()).includes(A5.mb));
      ok('invite applicant marked ✦ เชิญ', (await page.locator('aside').first().innerText()).includes('ลิงก์เชิญ'));
      await step('invite-applicant');
    }

    // ── 11. เปิดแสดงบนหน้าแรก → ปรากฏบนหน้าแรกจริง ──
    await go('/admin/applicants', 'listing');
    await page.getByRole('tab', { name: /ทั้งหมด/ }).click();
    await page.getByLabel('ค้นหาผู้สมัคร').fill(A3.mb);
    await page.locator('button', { hasText: A3.mb }).first().click();
    const sw = page.locator('aside').first().getByRole('switch', { name: 'แสดงบนหน้าแรก' });
    ok('listing switch off before', (await sw.getAttribute('aria-checked')) === 'false');
    await sw.click();
    ok('listing flash', /แสดงบนหน้าแรกแล้ว/.test(await waitMsg(page, /แสดงบนหน้าแรกแล้ว/)));
    const { createHash } = require('crypto');
    A3.pid = 'r' + createHash('sha256').update('mb-public:' + A3.mb).digest('hex').slice(0, 10);
    const home = await ctx.newPage();
    await home.goto(BASE + '/', { waitUntil: 'networkidle' });
    const homeHtml = await home.content();
    ok('listed PT appears live on home page', homeHtml.includes(A3.pid));
    await home.goto(BASE + '/p/' + A3.pid, { waitUntil: 'networkidle' });
    ok('public profile page opens', (await home.locator('body').innerText()).includes(A3.nick));
    await home.close();
    // ผู้สมัครที่ยังไม่ผ่าน KYC เปิดแสดงไม่ได้
    await page.getByLabel('ค้นหาผู้สมัคร').fill(A4.mb);
    await page.locator('button', { hasText: A4.mb }).first().click();
    const sw4 = page.locator('aside').first().getByRole('switch', { name: 'แสดงบนหน้าแรก' });
    ok('listing switch disabled before KYC approved + says why', (await sw4.isDisabled()) && /เปิดแสดงได้เมื่อผ่าน KYC/.test(await page.locator('aside').first().innerText()));
    await step('listing');

    // ── 12. อุทธรณ์ใบเตือน: รับ 1 · ไม่รับ 1 (ต้องมีเหตุผล) ──
    const em = `ui40-${dev}-${Date.now()}@test.local`;
    await S.fundCustomer(em, 30000);
    const base = dev === 'iphone' ? 41 : 47;
    const ap1 = await S.strikeAndAppeal(A3, em, base, 'ถึงจุดนัดตรงเวลา ลูกค้าแจ้งผิดคน');
    const ap2 = await S.strikeAndAppeal(A3, em, base + 3, 'รถติดมาก แจ้งลูกค้าแล้ว');
    ok('two appeals seeded', ap1.appeal.ok && ap2.appeal.ok, JSON.stringify([ap1.appeal, ap2.appeal]));
    await as(ctx, 'cs', `ui-cs-${dev}@local.test`);
    await go('/admin/appeals', 'appeals');
    const c1 = page.locator('div.rounded-2xl', { hasText: 'ลูกค้าแจ้งผิดคน' }).first();
    const ev = await imgsLoaded(page, 'img[alt="หลักฐานอุทธรณ์"]');
    ok('appeal evidence photos load', ev.n >= 2 && ev.ok === ev.n, JSON.stringify(ev));
    await c1.getByRole('button', { name: 'รับอุทธรณ์ · ยกเลิกใบเตือน' }).click();
    await confirmDlg(page, 'รับอุทธรณ์');
    ok('accept flash', /รับอุทธรณ์แล้ว/.test(await waitMsg(page, /รับอุทธรณ์แล้ว/)));
    const c2 = page.locator('div.rounded-2xl', { hasText: 'รถติดมาก' }).first();
    const no = c2.getByRole('button', { name: 'ไม่รับ', exact: true });
    ok('reject disabled without reason', await no.isDisabled());
    await c2.getByPlaceholder(/เหตุผล/).fill('ไม่มีหลักฐานแจ้งลูกค้าก่อนเวลานัด');
    await no.click();
    await confirmDlg(page, 'ไม่รับอุทธรณ์');
    ok('reject flash', /ไม่รับอุทธรณ์แล้ว/.test(await waitMsg(page, /ไม่รับอุทธรณ์แล้ว/)));
    const all = (await S.req('/api/admin/appeals', { headers: S.AH() }).then(S.J)).appeals || [];
    ok('appeal 1 accepted (API)', all.find((a) => a.strike_id === ap1.strike)?.status === 'accepted');
    ok('appeal 2 rejected with note (API)', /ไม่มีหลักฐาน/.test(all.find((a) => a.strike_id === ap2.strike)?.decision_note || ''));
    await page.getByRole('button', { name: /ตัดสินแล้ว/ }).click();
    ok('decided tab shows decider', (await bodyText(page)).includes(`ui-cs-${dev}@local.test`));
    await step('appeals-done');

    // ── เก็บกวาด: ถอด A1 ออกจากกลุ่ม แล้วลบกลุ่มทดสอบ ──
    await S.patchApp(A1.id, { cohort: null });
    await as(ctx, 'ceo');
    await go('/admin/cohorts', 'cohort-cleanup');
    await page.getByRole('button', { name: new RegExp(cname) }).first().click();
    await page.getByRole('button', { name: 'ลบกลุ่ม' }).click();
    await confirmDlg(page, 'ลบกลุ่ม');
    await page.waitForTimeout(800);
    cs = (await S.req('/api/admin/cohorts', { headers: S.AH() }).then(S.J)).cohorts || [];
    ok('test cohort deleted', !cs.some((c) => c.key === coh?.key));
  } catch (e) {
    ok('suite ran to the end', false, e.message.split('\n')[0]);
    await step('crash');
  }
  note(`seeded ${A1.mb} ${A2.mb} ${A3.mb} ${A4.mb}`);
  await done();
})();
