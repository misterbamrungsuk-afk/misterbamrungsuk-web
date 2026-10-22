// หลังบ้าน: งานปฏิบัติการ (CS / super) + สิทธิ์ตามบทบาท — กดหน้าจอจริง
// ตรวจงาน (ค้นหา · ตัดสินยกเลิก/ข้อพิพาท · ผิดนัด) → แชท (ป้ายยกเลิกส่ง/ลบ · เตือน) → รายงานผู้ใช้ → สมาชิก → พาร์ทเนอร์ (สลิป · QC)
// → Marketplace (อนุมัติร้าน · อนุมัติสินค้า · ยืนยันชำระ/ส่ง/ปฏิเสธ) → รูปหน้าปก → SOS → ข้อผิดพลาดหน้าเว็บ → 2 ชั้น (TOTP) → สิทธิ์ทุกบทบาท
const crypto = require('crypto');
const { start, BASE } = require('./_lib');
const S = require('./_seed');
const { as, adminCookie, confirmDlg, waitMsg, imgsLoaded, bodyText, reload, poll } = require('./_adm');
const dev = process.argv[2] || 'pixel';
const stamp = Date.now().toString(36).slice(-5);
const em = (k) => `ui42-${k}-${dev}-${stamp}@test.local`;

// TOTP (RFC 6238 · SHA1 · 30 วิ · 6 หลัก) จากรหัสลับ base32
function totp(secret, at = Date.now()) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '';
  for (const c of secret.replace(/[\s=]/g, '').toUpperCase()) bits += A.indexOf(c).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const ctr = Buffer.alloc(8); ctr.writeBigUInt64BE(BigInt(Math.floor(at / 30000)));
  const h = crypto.createHmac('sha1', key).update(ctr).digest(); const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0');
}

// แท็บที่แต่ละบทบาทต้องเห็น (ตรงกับ PATH_ROLES ใน src/lib/admin-auth.ts)
const ROLE_TABS = {
  super: ['/admin', '/admin/audit', '/admin/errors', '/admin/orders', '/admin/chats', '/admin/reports', '/admin/appeals', '/admin/members', '/admin/applicants', '/admin/slips', '/admin/wallet', '/admin/stays', '/admin/kyc', '/admin/cohorts', '/admin/earnings', '/admin/invites', '/admin/payroll', '/admin/payouts', '/admin/boosts', '/admin/sales', '/admin/partners', '/admin/market', '/admin/promos', '/admin/covers', '/admin/security'],
  finance: ['/admin', '/admin/audit', '/admin/orders', '/admin/applicants', '/admin/slips', '/admin/wallet', '/admin/stays', '/admin/cohorts', '/admin/earnings', '/admin/invites', '/admin/payroll', '/admin/payouts', '/admin/boosts', '/admin/sales', '/admin/partners', '/admin/market', '/admin/promos', '/admin/security'],
  cs: ['/admin', '/admin/audit', '/admin/orders', '/admin/chats', '/admin/reports', '/admin/appeals', '/admin/members', '/admin/security'],
  kyc: ['/admin', '/admin/audit', '/admin/reports', '/admin/members', '/admin/kyc', '/admin/security'],
};
const DENY = { super: [], finance: ['/admin/kyc', '/admin/chats', '/admin/covers'], cs: ['/admin/wallet', '/admin/kyc', '/admin/payroll'], kyc: ['/admin/wallet', '/admin/orders', '/admin/applicants'] };
const HOME = { finance: '/admin', cs: '/admin/orders', kyc: '/admin/kyc' };

(async () => {
  // ── เตรียมข้อมูล (API) ──
  const CA = em('a'), CB = em('b'), CM = em('m');
  const P = await S.activePT({ tag: dev === 'iphone' ? 'ไอ' : 'พิก' });
  await S.fundCustomer(CA, 60000);
  const d0 = dev === 'iphone' ? 24 : 27;
  // B1 ขอยกเลิก (ปิดยกเลิกอัตโนมัติ = รอทีมงานตัดสิน)
  const b1 = await S.book(CA, P.pid, { days: d0 }); await S.ptAct(P, b1.id, 'accept');
  const c1 = await S.post(`/api/bookings/${b1.id}/cancel`, S.custH(CA), { reason: 'ติดธุระด่วน' });
  // B2 เช็กอินแล้ว → แชท (ยกเลิกส่ง · ลบ · คำต้องห้าม) → SOS → รายงาน → ข้อพิพาท
  const b2 = await S.book(CA, P.pid, { days: d0 + 2 }); await S.ptAct(P, b2.id, 'accept');
  let s2 = await S.getBooking(CA, b2.id); await S.shiftBooking(b2.id, S.toMin(s2.starts_at) - 10);
  await S.ptAct(P, b2.id, 'checkin', { gps: { lat: 13.7563, lng: 100.5018, accuracy: 15 } });
  const m1 = await S.msg(b2.id, S.custH(CA), 'สวัสดีค่ะ ถึงคาเฟ่แล้ว');
  const m2 = await S.msg(b2.id, { 'content-type': 'application/json' }, 'กำลังเดินเข้าไปครับ', { mb: P.mb, t: P.t });
  await S.msg(b2.id, S.custH(CA), 'ขอไลน์ 0812345678 หน่อยค่ะ');
  await S.chatAct(b2.id, S.custH(CA), { action: 'unsend', message_id: m1.message?.id ?? m1.id });
  await S.chatAct(b2.id, S.custH(CA), { action: 'delete', message_id: m2.message?.id ?? m2.id });
  await S.shiftBooking(b2.id, 40);
  const sos = await S.post('/api/sos', S.custH(CA), { lat: 13.7563, lng: 100.5018 });
  const rep = await S.post('/api/report', S.custH(CA), { booking_id: b2.id, reason: 'ขอติดต่อ / จ่ายเงินนอกแอป', detail: 'ขอไลน์ในแชท (UI ' + stamp + ')' });
  const dsp = await S.post(`/api/bookings/${b2.id}/dispute`, S.custH(CA), { topic: 'อื่นๆ', text: 'เพื่อนมาช้า 40 นาที ' + stamp });
  // B3 ลูกค้าแจ้ง Part-Time ไม่มา (รอตัดสินในแท็บผิดนัด)
  const b3 = await S.book(CA, P.pid, { days: d0 + 4 }); await S.ptAct(P, b3.id, 'accept');
  const s3 = await S.getBooking(CA, b3.id); await S.shiftBooking(b3.id, S.toMin(s3.starts_at) + 30);
  const ns = await S.J(await S.req('/api/noshow', { method: 'POST', headers: { cookie: S.custH(CA).cookie }, body: S.form({ booking: b3.id, note: 'รอ 30 นาทีเพื่อนไม่มา ' + stamp, lat: '13.7563', lng: '100.5018', accuracy: '20' }) }));
  const [bk1, bk2, bk3] = await Promise.all([S.getBooking(CA, b1.id), S.getBooking(CA, b2.id), S.getBooking(CA, b3.id)]);
  // สมาชิก · พาร์ทเนอร์ · ตลาด · ข้อผิดพลาดหน้าเว็บ
  await S.req('/api/me', { headers: S.custH(CM) });
  const [sp1, sp2] = [await S.newPartner({ type: 'สปา' }), await S.newPartner({ type: 'สปา' })];
  const app = await S.marketApply('ร้านสมัครUI ' + stamp);
  const V = await S.vendorWithLogin();
  const vp = await S.J(await S.req('/api/market/vendor/products', { method: 'POST', headers: { cookie: V.VC.cookie }, body: S.form({ name: 'ชาสมุนไพรUI ' + stamp, price: '450', stock: '10', fda_no: '10-1-22222-2-2222', published: '1', age_restricted: '0' }, { image: S.IMG('p.jpg') }) }));
  const prod = await S.adminProduct(V.id, 'สบู่สมุนไพรUI ' + stamp);
  await S.fundCustomer(CB, 3000);
  const o1 = await S.marketOrder(CB, prod?.id), o2 = await S.marketOrder(CB, prod?.id);
  const errMsg = `TypeError ทดสอบUI ${stamp} ${dev}`;

  const T = await start('42-admin-ops', dev, { cookies: [adminCookie('super', `ui-super42-${dev}@local.test`)] });
  const { page, ctx, step, ok, note, go, done } = T;
  page.setDefaultTimeout(45000); page.setDefaultNavigationTimeout(90000);
  page.on('console', (m) => { if (/hydrated but|did not match/i.test(m.text())) note('hydration @ ' + page.url() + ' · ' + m.text().replace(/s+/g, ' ').slice(200, 900)); });
  ok('seed: cancel/dispute/noshow/sos/report/apply/product/orders', c1.status === 'cancel_requested' && dsp.ok !== false && ns.ok && sos.ok && rep.ok && app.ok && vp.ok && !!o1.id && !!o2.id,
    JSON.stringify({ c1: c1.status || c1.error, dsp: dsp.error, ns: ns.error, sos: sos.error, rep: rep.error, app: app.error, vp: vp.error, o1: o1.error, o2: o2.error }));
  const pickRow = (code) => page.getByRole('button', { name: new RegExp(code) }).first();
  try {
    // ── 1. ตรวจงาน: ตัวกรอง · ค้นหา · รายละเอียด · ตัดสิน ──
    await go('/admin/orders', 'orders');
    ok('todo tab lists cancel + dispute', (await pickRow(bk1.code).count()) > 0 && (await pickRow(bk2.code).count()) > 0);
    await page.getByLabel('ค้นหาการจอง').fill(bk1.code);
    await page.waitForTimeout(300);
    ok('search by booking code narrows list', (await pickRow(bk1.code).count()) === 1 && !(await pickRow(bk2.code).count()));
    await page.getByLabel('ค้นหาการจอง').fill(P.mb);
    await page.getByRole('button', { name: /^ทั้งหมด/ }).click();
    ok('search by PT MB finds all 3', (await page.locator('button', { hasText: P.mb }).count()) >= 3);
    await page.getByLabel('ค้นหาการจอง').fill('');
    await page.getByRole('button', { name: /^รอตัดสิน/ }).click();
    await pickRow(bk1.code).click();
    const aside = page.locator('aside').first();
    ok('detail shows status ขอยกเลิก', /ขอยกเลิก/.test(await aside.innerText()));
    ok('detail has call-log section', /โทร|การโทร/.test(await aside.innerText()));
    await aside.getByRole('button', { name: '50%' }).click();
    await aside.getByPlaceholder(/เหตุผล\/บันทึก/).fill('ยกเลิกใกล้เวลา คืนครึ่งหนึ่ง');
    await aside.getByRole('button', { name: 'บันทึกผล' }).click();
    const dlg = page.locator('[role=dialog][aria-modal=true]');
    await dlg.waitFor();
    const pv = await dlg.innerText();
    ok('refund preview shows customer refund + PT share', /ลูกค้าได้คืน ฿[\d,]+ \(50%/.test(pv) && /Part-Time ได้/.test(pv), pv.slice(0, 160));
    await confirmDlg(page, 'ยืนยันและย้ายเงิน');
    ok('resolve msg', /บันทึกผลตัดสินแล้ว/.test(await waitMsg(page, /บันทึกผลตัดสินแล้ว/)));
    ok('B1 refunded 50% (API)', (await S.getBooking(CA, b1.id)).resolution?.refund_pct === 50);
    await pickRow(bk2.code).click();
    ok('dispute text shown', new RegExp('มาช้า 40 นาที').test(await aside.innerText()));
    await aside.getByPlaceholder(/เหตุผล\/บันทึก/).fill('ตรวจแชทแล้ว เพื่อนแจ้งล่วงหน้า');
    await aside.getByRole('button', { name: 'ยกคำร้อง' }).click();
    ok('reject preview says back to checked-in', /ระหว่างนัด/.test(await dlg.innerText()));
    await confirmDlg(page, 'ยืนยันยกคำร้อง');
    await waitMsg(page, /บันทึกผลตัดสินแล้ว/);
    ok('B2 back to checked_in (API)', (await S.getBooking(CA, b2.id)).status === 'checked_in');
    await step('orders-resolved');
    // ผิดนัด
    await page.getByRole('button', { name: /^ผิดนัด/ }).click();
    const card = page.locator('section', { hasText: 'รอ 30 นาทีเพื่อนไม่มา ' + stamp }).first();
    await card.waitFor();
    await card.getByRole('button', { name: /Part-Time ไม่มา/ }).click();
    await confirmDlg(page, 'ยืนยันและย้ายเงิน');
    ok('no-show decided msg visible on no-show tab', /ตัดสิน .* แล้ว/.test(await waitMsg(page, /ตัดสิน .* แล้ว/)));
    const cl = (await S.req('/api/admin/noshow', { headers: S.AH() }).then(S.J)).claims.find((c) => c.booking_id === b3.id);
    ok('claim decided provider_no_show (API)', cl?.status === 'provider_no_show', cl?.status);
    await step('noshow-decided');

    // ── 2. แชท ──
    await go('/admin/chats', 'chats');
    ok('room listed with blocked badge', /ถูกกัน/.test(await page.locator('a', { hasText: bk2.code }).innerText()));
    ok('flag filter link', (await page.getByRole('link', { name: /มีข้อความต้องห้าม/ }).getAttribute('href')) === '/admin/chats?f=flag');
    await go('/admin/chats?f=flag', 'chats-flag');
    ok('flag filter keeps room', (await page.locator('a', { hasText: bk2.code }).count()) > 0);
    await go(await page.locator('a', { hasText: bk2.code }).first().getAttribute('href'), 'chat-room');
    const tr = await bodyText(page);
    ok('transcript keeps unsent message + tag', tr.includes('สวัสดีค่ะ ถึงคาเฟ่แล้ว') && /ยกเลิกการส่ง/.test(tr), tr.slice(0, 200));
    ok('transcript shows delete tag', /ลบ/.test(tr));
    ok('blocked message shown with reason', /ถูกกัน · /.test(tr) && tr.includes('0812345678'));
    await page.getByRole('radio', { name: 'ลูกค้า' }).click();
    await page.getByRole('button', { name: /ห้ามแลกเบอร์โทร/ }).click();
    await page.getByRole('button', { name: 'ส่งคำเตือน' }).click();
    await confirmDlg(page, 'ส่งคำเตือน');
    ok('warn msg', /ส่งคำเตือนแล้ว/.test(await waitMsg(page, /ส่งคำเตือนแล้ว/)));
    ok('warning appears in transcript', await page.getByText('คำเตือนจากทีมงาน').first().waitFor({ timeout: 20000 }).then(() => true, () => false));
    await step('chat-transcript');

    // ── 3. รายงานผู้ใช้ ──
    await go('/admin/reports', 'reports');
    const rc = page.locator('div.rounded-2xl', { hasText: 'UI ' + stamp }).first();
    await rc.getByPlaceholder(/ผลการตรวจ/).fill('ตักเตือนแล้ว');
    await rc.getByRole('button', { name: 'ปิดเรื่อง' }).click();
    await confirmDlg(page, 'ปิดเรื่อง');
    ok('report closed with note', await page.locator('div.rounded-2xl', { hasText: 'UI ' + stamp }).getByText('ปิดแล้ว · ตักเตือนแล้ว').waitFor({ timeout: 20000 }).then(() => true, () => false));

    // ── 4. สมาชิก: ระงับ → คืนสิทธิ์ ──
    await go('/admin/members', 'members');
    await page.getByLabel('ค้นหาสมาชิก').fill(CM);
    await page.locator('tr', { hasText: CM }).first().click();
    const ma = page.locator('#adm-panel');
    await ma.getByPlaceholder('เหตุผลการระงับ').fill('ทดสอบระบบ');
    await ma.getByRole('button', { name: 'ระงับบัญชีทันที' }).click();
    await confirmDlg(page, 'ระงับบัญชี');
    ok('suspend msg', /ระงับบัญชีแล้ว/.test(await waitMsg(page, /ระงับบัญชีแล้ว/)));
    ok('suspended session rejected (API)', (await S.req('/api/wallet', { headers: S.custH(CM) })).status === 401);
    await page.locator('#adm-panel').getByRole('button', { name: 'คืนสิทธิ์บัญชี' }).click({ timeout: 30000 });
    ok('unsuspend msg', /คืนสิทธิ์แล้ว/.test(await waitMsg(page, /คืนสิทธิ์แล้ว/)));
    ok('session works again (API)', (await S.req('/api/wallet', { headers: S.custH(CM) })).status === 200);
    await step('members');

    // ── 5. พาร์ทเนอร์: สลิปแผน → อนุมัติ · QC ผ่าน / ไม่ผ่าน ──
    await go('/admin/partners', 'partners');
    await page.getByLabel('ค้นหาพาร์ทเนอร์').fill(sp1.name);
    await page.locator('tr', { hasText: sp1.name }).first().click();
    const pd = page.locator('#adm-panel');
    await pd.getByRole('button', { name: 'อนุมัติ + ต่ออายุ' }).click();
    await pd.locator('[role=alertdialog]').getByRole('button', { name: 'ยืนยันอนุมัติ' }).click();
    await waitMsg(page, /อนุมัติแล้ว|ไม่สำเร็จ/);
    let pur; await poll(async () => (pur = (await S.req(`/api/admin/partners/purchases?partner=${sp1.id}`, { headers: S.AH() }).then(S.J)).rows?.[0])?.status === 'paid');
    ok('plan slip approved (API)', pur?.status === 'paid', pur?.status);
    await pd.getByRole('button', { name: 'ผ่าน QC', exact: true }).click();
    await pd.locator('[role=alertdialog][aria-label="ยืนยันผล QC"]').getByRole('button', { name: 'ยืนยัน' }).click();
    ok('QC pass msg', /ผ่าน QC/.test(await waitMsg(page, /บันทึก: ผ่าน QC/)));
    let pr = (await S.req('/api/admin/partners', { headers: S.AH() }).then(S.J)).rows.find((x) => x.id === sp1.id);
    ok('partner active after slip + QC (API)', pr?.account_status === 'active' && pr?.qc_status === 'passed', JSON.stringify({ a: pr?.account_status, q: pr?.qc_status }));
    await page.getByLabel('ค้นหาพาร์ทเนอร์').fill(sp2.name);
    await page.locator('tr', { hasText: sp2.name }).first().click();
    await page.locator('#adm-panel').getByRole('button', { name: 'ไม่ผ่าน QC', exact: true }).click();
    await page.locator('#adm-panel [role=alertdialog][aria-label="ยืนยันผล QC"]').getByRole('button', { name: 'ยืนยัน' }).click();
    await waitMsg(page, /บันทึก: ไม่ผ่าน QC/);
    pr = (await S.req('/api/admin/partners', { headers: S.AH() }).then(S.J)).rows.find((x) => x.id === sp2.id);
    ok('QC failed saved (API)', pr?.qc_status === 'failed');
    await step('partners');

    // ── 6. Marketplace ──
    await go('/admin/market', 'market');
    await page.getByRole('button', { name: /^ใบสมัครร้าน|สมัครร้าน/ }).first().click().catch(async () => page.getByRole('button', { name: /สมัคร/ }).first().click());
    const ac = page.locator('section', { hasText: app.email }).first();
    await ac.getByLabel('GP %').fill('15');
    await ac.getByRole('button', { name: 'อนุมัติ + สร้างลิงก์เชิญ' }).click();
    await confirmDlg(page, 'อนุมัติ');
    ok('application approved msg', /อนุมัติ .* แล้ว/.test(await waitMsg(page, /อนุมัติ .* แล้ว/)));
    ok('invite link shown', /\/vendor\/invite\?t=/.test(await page.getByLabel('ลิงก์เชิญ').first().inputValue().catch(() => '')));
    await page.getByRole('button', { name: 'คัดลอก', exact: true }).first().click();
    ok('copy invite feedback', /คัดลอก/.test(await waitMsg(page, /คัดลอก/)));
    await step('market-apply');
    await page.getByRole('button', { name: /^สินค้า/ }).first().click();
    const pcard = page.locator('section', { hasText: 'ชาสมุนไพรUI ' + stamp }).first();
    ok('vendor product shows รออนุมัติ', /รออนุมัติ/.test(await pcard.innerText()));
    await pcard.getByRole('button', { name: 'แก้ไข' }).click();
    await page.locator('#mk-prod-form').getByLabel(/แอดมินอนุมัติแล้ว/).check();
    await page.locator('#mk-prod-form').getByRole('button', { name: 'บันทึก', exact: true }).click();
    ok('product saved msg', /บันทึก/.test(await waitMsg(page, /บันทึก(สินค้า)?แล้ว/)));
    ok('product now เผยแพร่', await poll(async () => /เผยแพร่/.test(await page.locator('section', { hasText: 'ชาสมุนไพรUI ' + stamp }).first().innerText())));
    await page.getByRole('button', { name: /^คำสั่งซื้อ/ }).first().click();
    const oc1 = page.locator('section', { hasText: o1.order_no }).first();
    ok('order slip image loads', (await imgsLoaded(page, `img[src*="/api/market/admin/slip?id=${o1.id}"]`)).ok === 1);
    await oc1.getByRole('button', { name: 'ยืนยันชำระ (คิด GP)' }).click();
    await oc1.locator('[role=alertdialog]').getByRole('button', { name: 'ยืนยัน' }).click();
    await waitMsg(page, new RegExp(o1.order_no));
    await oc1.getByPlaceholder('เลขพัสดุ').fill('TH' + stamp.toUpperCase());
    await oc1.getByRole('button', { name: 'บันทึกจัดส่ง' }).click();
    await poll(async () => /จัดส่งแล้ว/.test(await oc1.innerText()));
    const oc2 = page.locator('section', { hasText: o2.order_no }).first();
    await oc2.getByRole('button', { name: 'ปฏิเสธ' }).click();
    const rdlg = oc2.locator('[role=alertdialog]');
    ok('reject needs reason', await rdlg.getByRole('button', { name: 'ยืนยัน' }).isDisabled());
    await rdlg.locator('input').fill('สลิปไม่ตรงยอด');
    await rdlg.getByRole('button', { name: 'ยืนยัน' }).click();
    await poll(async () => (await S.req('/api/market/admin', { headers: S.AH() }).then(S.J)).orders.find((x) => x.id === o2.id)?.status === 'rejected');
    const md = await S.req('/api/market/admin', { headers: S.AH() }).then(S.J);
    ok('order 1 shipped with tracking (API)', md.orders.find((x) => x.id === o1.id)?.status === 'shipped' && !!md.orders.find((x) => x.id === o1.id)?.tracking_no);
    ok('order 2 rejected with reason (API)', md.orders.find((x) => x.id === o2.id)?.reject_reason === 'สลิปไม่ตรงยอด');
    await step('market-orders');

    // ── 7. รูปหน้าปก ──
    await go('/admin/covers', 'covers');
    const cov = await imgsLoaded(page, 'img');
    ok('cover previews load', cov.n > 0 && cov.ok === cov.n, JSON.stringify(cov));
    const upBtn = page.getByRole('button', { name: /อัปโหลด|เพิ่มรูป|เปลี่ยนรูป/ }).first();
    if (await upBtn.count() && await upBtn.isDisabled()) note('covers: upload disabled in demo (no storage) — not testable here');

    // ── 8. SOS ──
    await go('/admin/audit', 'audit');
    const sc = page.locator('div.rounded-2xl', { hasText: /SOS/ }).filter({ hasText: CA }).first();
    ok('SOS alert listed with map link', (await sc.count()) > 0 && /แผนที่/.test(await sc.innerText()));
    await sc.getByRole('button', { name: 'รับเรื่องแล้ว' }).click();
    await poll(async () => !!(await S.req('/api/admin/alerts', { headers: S.AH() }).then(S.J)).items.find((n) => n.kind === 'sos' && (n.title + n.body).includes(CA))?.read_at);
    const al = (await S.req('/api/admin/alerts', { headers: S.AH() }).then(S.J)).items.find((n) => n.kind === 'sos' && (n.title + n.body).includes(CA));
    ok('SOS acknowledged (API)', !!al?.read_at);
    await step('sos-ack');

    // ── 9. ข้อผิดพลาดหน้าเว็บ ──
    const cl0 = await S.req('/api/client-log', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'error', message: errMsg, path: '/wallet', stack: 'at ui-test', vw: 390, vh: 844, ms: 1200 }) });
    const el = (await S.req('/api/admin/errors', { headers: S.AH() }).then(S.J)).rows || [];
    if (!el.some((r) => r.message === errMsg)) note('client-log did not record (rate limit per IP?) status ' + cl0.status);
    await go('/admin/errors', 'errors');
    ok('client error listed', (await bodyText(page)).includes(errMsg));
    await page.getByRole('button', { name: 'ล้างรายการ' }).click();
    await confirmDlg(page, 'ล้างรายการ').catch(() => confirmDlg(page, 'ล้าง'));
    ok('errors cleared', await poll(async () => !(await bodyText(page)).includes(errMsg)));

    // ── 10. ยืนยันตัวตน 2 ชั้น (บัญชีของชุดนี้เท่านั้น · ไม่เปิดบังคับ) ──
    await go('/admin/security', 'security');
    await page.getByRole('button', { name: 'เริ่มตั้งค่า' }).click();
    const secret = (await page.locator('code').first().innerText()).replace(/\s/g, '');
    ok('TOTP secret shown + QR', secret.length >= 16 && (await page.locator('img[alt="QR สำหรับแอป Authenticator"]').count()) === 1);
    await page.getByLabel('รหัส 6 หลัก', { exact: true }).fill(totp(secret));
    await page.getByRole('button', { name: 'ยืนยันและเปิดใช้' }).click();
    await page.locator('ol li').first().waitFor();
    const codes = await page.locator('ol li').allInnerTexts();
    ok('recovery codes shown once', codes.length >= 8, String(codes.length));
    await step('security-codes');
    await page.getByRole('button', { name: 'เก็บรหัสแล้ว' }).click();
    ok('status เปิดอยู่', /เปิดอยู่/.test(await bodyText(page)));
    const st = await S.req('/api/admin/security', { headers: { cookie: 'mord_admin=' + require('./_lib').adminToken('super', `ui-super42-${dev}@local.test`) } }).then(S.J);
    ok('enrolled (API)', st.enrolled === true && st.recovery_left === codes.length);
    // ปิดด้วยรหัสกู้คืน (เก็บกวาด)
    await page.getByLabel('รหัส 6 หลัก หรือรหัสกู้คืน').fill(codes[0]);
    await page.getByRole('button', { name: 'ปิด 2 ชั้น' }).click();
    await confirmDlg(page, 'ปิด 2 ชั้น').catch(() => confirmDlg(page, 'ปิด'));
    ok('disabled with recovery code', /ปิดยืนยันตัวตน 2 ชั้นแล้ว/.test(await waitMsg(page, /ปิดยืนยันตัวตน/)));
    await step('security-off');

    // ── 11. สิทธิ์ตามบทบาท ──
    for (const role of ['super', 'finance', 'cs', 'kyc']) {
      await as(ctx, role, `ui-${role}42-${dev}@local.test`);
      await go(role === 'kyc' ? '/admin/kyc' : '/admin', 'nav-' + role);
      const hrefs = await page.locator('nav[aria-label^="เมนูแอดมิน"]').last().locator('a').evaluateAll((as) => as.map((a) => new URL(a.href).pathname));
      const want = ROLE_TABS[role];
      ok(`${role}: nav shows exactly allowed tabs`, want.every((h) => hrefs.includes(h)) && hrefs.every((h) => want.includes(h)), `extra ${hrefs.filter((h) => !want.includes(h))} missing ${want.filter((h) => !hrefs.includes(h))}`);
      if (dev === 'iphone') {
        const nav = await page.locator('nav[aria-label="เมนูแอดมิน (มือถือ)"]').evaluate((n) => ({ sw: n.scrollWidth, cw: n.clientWidth, doc: document.documentElement.scrollWidth, w: innerWidth }));
        ok(`${role}: tabs scroll sideways inside nav, page does not`, (want.length < 4 || nav.sw > nav.cw) && nav.doc <= nav.w + 1, JSON.stringify(nav));
      }
      for (const u of DENY[role]) {
        await page.goto(BASE + u, { waitUntil: 'networkidle' });
        const url = new URL(page.url());
        ok(`${role}: ${u} → denied banner`, url.searchParams.get('denied') === '1' && url.pathname === HOME[role] && /ไม่มีสิทธิ์เข้าหน้านั้น/.test(await bodyText(page)), page.url());
      }
    }
    // ปุ่มที่ไม่ควรเห็น
    await as(ctx, 'finance', `ui-finance42-${dev}@local.test`);
    await go('/admin/applicants', 'finance-applicants');
    await page.getByRole('tab', { name: /ทั้งหมด/ }).click();
    await page.getByLabel('ค้นหาผู้สมัคร').fill(P.mb);
    await page.locator('button', { hasText: P.mb }).first().click();
    ok('finance: no KYC decide buttons (hint instead)', !(await page.locator('#adm-panel').getByRole('button', { name: 'อนุมัติเอกสาร' }).count()) && /ได้เฉพาะฝ่าย KYC/.test(await page.locator('#adm-panel').innerText()));
    await as(ctx, 'cs', `ui-cs42-${dev}@local.test`);
    const b4 = await S.book(CA, P.pid, { days: d0 + 6 }); await S.ptAct(P, b4.id, 'accept');
    const c4 = await S.post(`/api/bookings/${b4.id}/cancel`, S.custH(CA), { reason: 'ทดสอบสิทธิ์' });
    await go('/admin/orders', 'cs-orders');
    if (c4.status === 'cancel_requested') {
      await pickRow((await S.getBooking(CA, b4.id)).code).click();
      ok('cs: resolve panel read-only', /ดูได้อย่างเดียว/.test(await page.locator('aside').first().innerText()) && await page.locator('aside').first().getByRole('button', { name: 'บันทึกผล' }).isDisabled());
    } else note('cs read-only check skipped (auto-cancel on)');
    await page.getByRole('button', { name: /^ผิดนัด/ }).click();
    await page.waitForTimeout(800);
    ok('cs: no-show tab has no decide buttons', !(await page.getByRole('button', { name: /Part-Time ไม่มา · คืน/ }).count()));
    await as(ctx, 'kyc', `ui-kyc42-${dev}@local.test`);
    await go('/admin', 'kyc-overview');
    ok('kyc overview: no money queues', !(await page.locator('a[href="/admin/payroll"], a[href="/admin/wallet"]').filter({ hasText: /รอ/ }).count()));
    await step('roles-done');
  } catch (e) {
    ok('suite ran to the end', false, e.message.split('\n')[0]);
    await step('crash');
  }
  note(`PT ${P.mb} · bookings ${bk1.code} ${bk2.code} ${bk3.code}`);
  await done();

  // ── จอใหญ่: เมนูซ้ายครบ + ปุ่มออกจากระบบอยู่ในจอ ──
  if (dev === 'pixel') {
    const D = await start('42-admin-ops', 'desktop', { cookies: [adminCookie('ceo')] });
    await D.go('/admin', 'desktop-overview');
    const side = await D.page.locator('nav[aria-label="เมนูแอดมิน"]').evaluate((n) => ({ links: n.querySelectorAll('a[href^="/admin"]').length, out: (() => { const b = [...n.querySelectorAll('button')].find((x) => /ออกจากระบบ/.test(x.textContent)); const r = b?.getBoundingClientRect(); return r ? r.bottom <= innerHeight : false; })() }));
    D.ok('desktop: sidebar lists all 25 tabs for CEO', side.links === 25, String(side.links));
    D.ok('desktop: logout visible without scrolling', side.out);
    for (const u of ['/admin/applicants', '/admin/payroll', '/admin/orders', '/admin/market']) await D.go(u, 'desktop' + u.replace(/\//g, '-'));
    await D.done();
  }
})();
