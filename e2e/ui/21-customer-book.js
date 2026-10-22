// ลูกค้า (กดหน้าจอจริง) ชุดที่ 2: จองเพื่อน → จ่าย → ระหว่างนัด → จบนัด
// A: กระเป๋าไม่พอ → สแกน QR + แนบสลิปในหน้าจอง → แอดมินอนุมัติ → จองให้อัตโนมัติ → หน้าสำเร็จ → หน้านัด
//    → PT รับ (API) → แชท (ข้อความ + เบอร์โทรถูกบล็อก) · จัดการข้อความ (ยกเลิกการส่ง/ลบ) · ซ่อนแชท · ปุ่มโทร · การ์ดติดตาม
//    → ขอเปลี่ยนเวลา (PT รับ) → เลื่อนเวลาเข้าช่วงนัด + PT เช็กอิน → ขอต่อเวลา (PT รับ) → จบนัด + ทิป + รีวิว → ใบเสร็จ → ขอใบกำกับภาษี → ลบกล่องแชท
// B: ยกเลิกก่อนเพื่อนรับ (คืนเต็ม) · C: ยกเลิกหลังเพื่อนรับ (แสดงยอดคืนตามกติกา) · D: แจ้งปัญหา (dispute) · E: เพื่อนไม่มา (no-show)
// F: เรียกด่วน → ยกเลิก
const { start, api, BASE, IMGS, uniq, customerCookie } = require('./_lib');
const { livePT, fund, ADMC } = require('./_cust');
const dev = process.argv[2] || 'pixel';
const GPS = { latitude: 13.7377, longitude: 100.5603 };

(async () => {
  const email = uniq('c21' + dev[0]) + '@test.local';
  const S = await start('21-customer-book', dev, { cookies: [customerCookie(email)] });
  const { page, ctx, step, ok, note, go } = S;
  const bad400 = []; page.on('response', (r) => { if (r.status() === 400) bad400.push(r.url().replace(BASE, '')); });
  await ctx.grantPermissions(['geolocation'], { origin: BASE });
  await ctx.setGeolocation(GPS);
  const body = () => page.locator('body').innerText();
  const C = (({ name, value }) => `${name}=${value}`)(customerCookie(email));
  const pt = await livePT();
  const PT = (id, action, extra = {}) => api(`/api/pt/bookings/${id}`, { method: 'POST', body: { mb: pt.mb, t: pt.t, ...(action === 'accept' ? { accept: true } : { action }), ...extra } });
  const bk = (id) => api(`/api/bookings/${id}`, { cookie: C }).then((r) => r.json || {});
  const wallet = () => api('/api/wallet', { cookie: C }).then((r) => r.json || {});
  const shift = (id, minutes) => api('/api/admin/bookings', { method: 'POST', cookie: ADMC, body: { action: 'demo_shift', id, minutes } });
  const toStart = async (id, inMin) => { const st = Date.parse((await bk(id)).booking.starts_at); return shift(id, Math.round((st - Date.now()) / 60000) - inMin); }; // shift(m) = เลื่อนเวลาเริ่มให้เร็วขึ้น m นาที
  // เลื่อนนัดเปิดอยู่ของ PT คนนี้ที่อยู่ใกล้ "ตอนนี้" ออกไป (กันชนชั่วโมงกับชุดอื่น)
  const clearNow = async () => { for (const x of (await api('/api/admin/bookings', { cookie: ADMC })).json?.bookings ?? []) if (x.parttime_mb === pt.mb && ['requested', 'accepted', 'checked_in'].includes(x.status) && Math.abs(Date.parse(x.starts_at) - Date.now()) < 12 * 3600e3) await shift(x.id, -30 * 1440); };
  const sheet = (t) => page.getByRole('dialog', { name: t });

  /** จองผ่านหน้าจอ: วัน = เลื่อนไป dayIdx วัน · เลือกช่องเวลาแรกที่ว่าง · คืน id */
  async function bookUI(label, dayIdx, { note: nt = '', pay = true } = {}) {
    await go(`/book/${pt.pid}`, `book-${label}`);
    await page.getByRole('button', { name: /คาเฟ่ \/ ร้านอาหาร/ }).click();
    await page.getByPlaceholder('ชื่อร้าน / สาขา').fill('ร้านกาแฟ อโศก ' + label);
    await page.getByRole('button', { name: '◎ ใช้ตำแหน่งฉัน' }).click();
    await page.waitForTimeout(1200);
    const next = page.getByRole('button', { name: 'ถัดไป' });
    ok(`[${label}] step 1 → ถัดไป enabled after pin`, await next.isEnabled());
    await next.click();
    await page.locator('button.w-14').nth(dayIdx).click();
    const slots = page.locator('button').filter({ hasText: /^\d\d:00$/ });
    await slots.first().waitFor();
    const n = await slots.count(); let picked = false;
    for (let i = Math.floor(n / 2); i < n + Math.floor(n / 2) && !picked; i++) { const s = slots.nth(i % n); if (await s.isEnabled()) { await s.click(); picked = true; } }
    ok(`[${label}] time slot picked`, picked);
    if (nt) await page.getByPlaceholder(/มีที่จอดรถ/).fill(nt);
    await step(`book-${label}-time`);
    await page.getByRole('button', { name: 'ไปชำระเงิน' }).click();
    if (/โทร|line/i.test(nt)) return null;
    await page.getByText('วิธีชำระเงิน').waitFor();
    await page.waitForFunction(() => !document.body.innerText.includes('กำลังโหลด…'));
    await page.getByRole('button', { name: /ฉันรับทราบข้อตกลงความปลอดภัย/ }).click();
    await step(`book-${label}-pay`);
    if (!pay) return null;
    await page.getByRole('button', { name: /ยืนยันการชำระ ฿/ }).click();
    await page.waitForURL(/\/book\/success\?id=/, { timeout: 30000 }).catch(() => {});
    await page.getByText(/ส่งคำขอนัดแล้ว|จองสำเร็จ/).waitFor({ timeout: 15000 }).catch(() => {});
    const id = new URL(page.url()).searchParams.get('id');
    ok(`[${label}] booked → success page`, !!id && /ส่งคำขอนัดแล้ว/.test(await body()), page.url());
    return id;
  }

  // ══ A: ยอดไม่พอ → QR + สลิป ในหน้าจอง ══
  await clearNow();
  ok('wallet starts empty', (await wallet()).available === 0);
  // ข้อความติดต่อในฝากบอก → ถูกปฏิเสธในหน้าจอง
  await bookUI('A', 9, { note: 'โทร 0812345678 นะ' });
  ok('[A] contact info in note blocked', /ข้อความฝากถึงเพื่อน/.test(await page.locator('p[role=alert]').first().innerText().catch(() => '')));
  await page.getByPlaceholder(/มีที่จอดรถ/).fill('ขอโต๊ะริมหน้าต่าง');
  await page.getByRole('button', { name: 'ไปชำระเงิน' }).click();
  await page.waitForFunction(() => !document.body.innerText.includes('กำลังโหลด…'));
  await page.locator('img[alt="QR พร้อมเพย์"]').waitFor({ timeout: 10000 }).catch(() => {});
  ok('[A] short funds → QR + upload slip', /ยอดไม่พอ/.test(await body()) && await page.locator('img[alt="QR พร้อมเพย์"]').count() > 0);
  await page.locator('input[type=file]').setInputFiles(IMGS[2]);
  await page.getByRole('button', { name: /ฉันรับทราบข้อตกลงความปลอดภัย/ }).click();
  await step('book-A-slip');
  await page.getByRole('button', { name: /ยืนยันการชำระ ฿/ }).click();
  await page.getByText(/รอทีมงานตรวจสลิป/).first().waitFor({ timeout: 15000 }).catch(() => {});
  ok('[A] slip sent → waiting for review', /รอทีมงานตรวจสลิป/.test(await body()));
  await step('book-A-waiting');
  const tp = ((await api('/api/admin/wallet', { cookie: ADMC })).json?.topups || []).find((x) => x.customer_email === email && x.status === 'pending');
  ok('[A] admin sees top-up for shortfall (≥ ฿100)', tp && tp.amount_satang >= 10000, tp?.amount_satang);
  if (tp) await api('/api/admin/wallet', { method: 'POST', cookie: ADMC, body: { action: 'approve', id: tp.id } });
  await page.waitForURL(/\/book\/success\?id=/, { timeout: 60000 }).catch(() => {});
  await page.getByText(/ส่งคำขอนัดแล้ว/).waitFor({ timeout: 15000 }).catch(() => {});
  const A = new URL(page.url()).searchParams.get('id');
  ok('[A] auto-booked after approval → success', !!A && /ส่งคำขอนัดแล้ว/.test(await body()), page.url());
  await step('A-success');
  if (!A) { await S.done(); return; }
  let w = await wallet(); ok('[A] money held (available 0, held = total)', w.available === 0 && w.held > 0, `${w.available}/${w.held}`);
  await fund(email, 40000);
  await page.getByRole('link', { name: 'ดูสถานะการจองและเงินของคุณ' }).click();
  await page.waitForURL(new RegExp(`/order/${A}`)); await page.waitForLoadState('networkidle');
  await page.getByText('กันไว้ในกระเป๋าของคุณ').waitFor({ timeout: 10000 }).catch(() => {});
  ok('[A] order page: money held, waiting', /กันไว้ในกระเป๋าของคุณ/.test(await body()));
  await step('A-order-requested');
  ok('[A] PT accepts (API)', (await PT(A, 'accept')).json?.ok);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('พักไว้กับ Mister Bamrungsuk').first().waitFor({ timeout: 10000 }).catch(() => {});
  ok('[A] accepted: escrow text', /พักไว้กับ Mister Bamrungsuk/.test(await body()));
  ok('[A] call button visible', await page.getByRole('button', { name: /โทร/ }).count() > 0);
  ok('[A] live-track card visible', /ตำแหน่ง|ติดตาม|มาถึง|เดินทาง/.test(await body()));
  await step('A-order-accepted');

  // แชท
  await page.getByRole('link', { name: /แชทกับ/ }).first().click();
  await page.waitForURL(new RegExp(`/chat/${A}`)); await page.waitForLoadState('networkidle');
  const say = async (t) => { await page.getByLabel('พิมพ์ข้อความ').fill(t); await Promise.all([page.waitForResponse((r) => r.url().includes(`/api/bookings/${A}/messages`) && r.request().method() === 'POST'), page.getByRole('button', { name: 'ส่ง', exact: true }).click()]); await page.waitForTimeout(400); };
  await say('สวัสดีค่ะ เจอกันหน้าร้านนะคะ');
  await say('โทรหาฉันที่ 081-234-5678 ได้เลย');
  await step('A-chat');
  ok('[A] chat: normal message shown', (await body()).includes('สวัสดีค่ะ เจอกันหน้าร้านนะคะ'));
  ok('[A] chat: phone number blocked + warning', /ไม่ถูกส่ง \(ข้อความต้องห้าม\)/.test(await body()) && await page.locator('p[role=alert]').count() > 0);
  const ptView = (await api(`/api/bookings/${A}/messages?mb=${pt.mb}&t=${encodeURIComponent(pt.t)}`)).json?.messages || [];
  ok('[A] API: PT does not see blocked message', ptView.some((m) => /สวัสดีค่ะ/.test(m.body)) && !ptView.some((m) => /081/.test(m.body || '')));
  await api(`/api/bookings/${A}/messages`, { method: 'POST', body: { body: 'รับทราบค่ะ', mb: pt.mb, t: pt.t } });
  // ยกเลิกการส่ง ข้อความแรก
  await page.getByRole('button', { name: 'จัดการข้อความ' }).nth(1).click().catch(() => {});
  const msgSheet = sheet('ข้อความ');
  if (await msgSheet.isVisible().catch(() => false)) {
    await msgSheet.getByRole('button', { name: /ยกเลิกการส่ง/ }).click();
    await page.getByRole('dialog', { name: 'ยกเลิกการส่งข้อความนี้?' }).getByRole('button', { name: 'ยกเลิกการส่ง', exact: true }).click();
    await page.getByText('ยกเลิกการส่งแล้ว').waitFor({ timeout: 8000 }).catch(() => {});
    ok('[A] chat: unsend → toast', /ยกเลิกการส่งแล้ว/.test(await body()));
    await step('A-chat-unsent');
  } else ok('[A] chat: message menu opens', false);
  // ลบข้อความ (เฉพาะฝั่งฉัน) — ข้อความที่ถูกบล็อก
  const blockedMore = page.locator('div.self-end', { hasText: 'ไม่ถูกส่ง' }).getByRole('button', { name: 'จัดการข้อความ' });
  if (await blockedMore.count()) {
    await blockedMore.first().click();
    await sheet('ข้อความ').getByRole('button', { name: /ลบข้อความ/ }).click();
    await page.getByRole('dialog', { name: 'ลบข้อความนี้?' }).getByRole('button', { name: 'ลบข้อความ', exact: true }).click();
    await page.getByText('ลบข้อความแล้ว').waitFor({ timeout: 8000 }).catch(() => {});
    ok('[A] chat: delete for me', !(await body()).includes('081-234-5678'));
  } else ok('[A] chat: blocked message has menu', false);
  // จัดการแชท: นัดยังไม่จบ → ซ่อนได้อย่างเดียว
  await page.getByRole('button', { name: 'จัดการแชท' }).click();
  ok('[A] chat box menu: delete disabled while active', /ลบกล่องแชทได้หลังจบนัด/.test(await sheet('จัดการแชท').innerText().catch(() => '')));
  await step('A-chat-menu');
  await sheet('จัดการแชท').getByRole('button', { name: /ซ่อนแชท/ }).click();
  await page.waitForURL(/\/chat$/, { timeout: 10000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
  ok('[A] hide chat → back to list, hidden', !(await page.locator(`a[href="/chat/${A}"]`).count()) || /ซ่อน/.test(await body()));
  await step('chat-list-hidden');

  // ขอเปลี่ยนเวลา → PT รับ
  await go(`/order/${A}`, 'A-order');
  const more = async () => { await page.getByRole('button', { name: /เพิ่มเติม/ }).click(); await sheet('ตัวเลือกเพิ่มเติม').waitFor(); };
  await more();
  await sheet('ตัวเลือกเพิ่มเติม').getByRole('button', { name: /ขอเปลี่ยนเวลานัด/ }).click();
  const rs = sheet('ขอเปลี่ยนเวลานัด');
  const cur = await rs.getByLabel('เวลานัดใหม่').inputValue();
  const nd = new Date(Date.parse(cur + ':00+07:00') + 24 * 3600e3);
  const newAt = new Date(nd.getTime() + 7 * 3600e3).toISOString().slice(0, 16);
  await rs.getByLabel('เวลานัดใหม่').fill(newAt);
  await rs.getByLabel('เหตุผลที่เปลี่ยนเวลา').fill('ติดประชุม ขอเลื่อนหนึ่งวัน');
  await step('A-reschedule');
  await rs.getByRole('button', { name: 'ส่งคำขอ' }).click();
  await page.getByText(/ส่งคำขอเปลี่ยนเวลาแล้ว/).waitFor({ timeout: 10000 }).catch(() => {});
  ok('[A] reschedule requested', /ส่งคำขอเปลี่ยนเวลาแล้ว/.test(await body()), await rs.innerText().catch(() => ''));
  const ra = await PT(A, 'reschedule_accept'); ok('[A] PT accepts reschedule (API)', ra.json?.ok, JSON.stringify(ra.json).slice(0, 120));
  let d = await bk(A); ok('[A] API: new start time saved', Math.abs(Date.parse(d.booking?.starts_at) - nd.getTime()) < 60e3, d.booking?.starts_at);

  // เข้าช่วงนัด: เลื่อนเวลาให้เริ่ม 5 นาทีที่แล้ว + PT เช็กอิน
  await clearNow().catch(() => {});
  await toStart(A, -5);
  const ci = await PT(A, 'checkin', { gps: { lat: GPS.latitude, lng: GPS.longitude, accuracy: 15 } });
  ok('[A] PT checks in (API)', ci.json?.ok, JSON.stringify(ci.json).slice(0, 120));
  await go(`/order/${A}/session`, 'A-session');
  ok('[A] session page: SOS + time', await page.getByRole('link', { name: 'SOS' }).count() > 0);
  // ต่อเวลา
  await go(`/order/${A}`, 'A-order-session');
  await more();
  const extBtn = sheet('ตัวเลือกเพิ่มเติม').getByRole('button', { name: /ต่อเวลา/ });
  if (await extBtn.count()) {
    await extBtn.click();
    await step('A-extend-sheet');
    const er = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/extend') && r.request().method() === 'POST', { timeout: 20000 }).then((r) => r.json()).catch((e) => ({ error: e.message })), page.getByRole('button', { name: 'ขอต่อเวลา' }).click()]).then((x) => x[0]);
    ok('[A] extend request sent from UI', er.ok, JSON.stringify(er).slice(0, 160));
    await page.waitForTimeout(1500);
    const ea = await PT(A, 'extend_accept'); ok('[A] extend requested + PT accepts', ea.json?.ok, JSON.stringify(ea.json).slice(0, 160));
    d = await bk(A); ok('[A] API: extra hour recorded', (d.change?.extra_hours ?? 0) >= 1, JSON.stringify(d.change?.extra_hours));
  } else ok('[A] extend option available in session', false, await sheet('ตัวเลือกเพิ่มเติม').innerText().catch(() => ''));
  // จบนัด + ทิป + รีวิว
  await go(`/order/${A}/complete`, 'A-complete');
  await page.getByRole('button', { name: '5 ดาว' }).click();
  await page.locator('button[aria-pressed]').filter({ hasText: /./ }).first().click().catch(() => {});
  await page.getByPlaceholder(/เล่าสั้น ๆ ให้คนอื่น/).fill('สนุกมาก คุยเก่ง ตรงเวลา');
  await page.getByRole('radio', { name: 'นัดอีกแน่นอน' }).click().catch(() => {});
  await page.getByRole('radio', { name: /฿?100/ }).first().click().catch(() => {});
  const w0 = await wallet();
  await step('A-complete-filled');
  const cr = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/complete') && r.request().method() === 'POST', { timeout: 20000 }).then((r) => r.json()).catch((e) => ({ error: e.message })), page.getByRole('button', { name: /ยืนยันจบนัด/ }).click()]).then((x) => x[0]);
  ok('[A] complete POST ok', cr.ok, JSON.stringify(cr).slice(0, 160));
  await page.waitForTimeout(2500); await page.waitForLoadState('networkidle');
  await step('A-completed');
  d = await bk(A); ok('[A] API: completed', d.booking?.status === 'completed', d.booking?.status);
  w = await wallet(); ok('[A] tip ฿100 charged', w0.available - w.available === 10000, `${w0.available}→${w.available}`);
  // ใบเสร็จ + ใบกำกับภาษี
  await go(`/order/${A}/receipt`, 'A-receipt');
  ok('[A] receipt shows ทิป + total', /ใบเสร็จรับเงิน/.test(await body()) && /ทิป/.test(await body()));
  await page.getByRole('button', { name: 'ขอใบกำกับภาษี' }).click();
  await page.getByRole('button', { name: 'นิติบุคคล' }).click();
  await page.locator('label:has-text("ชื่อบริษัท") input').fill('บริษัท ทดสอบ จำกัด');
  await page.locator('label:has-text("เลขประจำตัวผู้เสียภาษี") input').fill('1234567890123');
  await page.locator('label:has-text("สาขา") input').fill('สำนักงานใหญ่');
  await page.locator('label:has-text("ที่อยู่ออกใบกำกับ") textarea').fill('99 ถนนสุขุมวิท แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพฯ 10110');
  await page.locator('label:has-text("ส่งไปที่อีเมล") input').fill(email);
  await page.getByRole('button', { name: /ส่งคำขอ/ }).click();
  await page.getByRole('status').waitFor({ timeout: 8000 }).catch(() => {});
  ok('[A] invoice: bad tax id rejected', /เลข|ไม่ถูกต้อง/.test(await page.getByRole('status').innerText().catch(() => '')), await page.getByRole('status').innerText().catch(() => ''));
  await page.locator('label:has-text("เลขประจำตัวผู้เสียภาษี") input').fill('0105561234560');
  await page.getByRole('button', { name: /ส่งคำขอ/ }).click();
  await page.waitForTimeout(1500);
  await step('A-invoice');
  ok('[A] invoice request sent', /ส่งคำขอ.*แล้ว|ได้รับคำขอ|ภายใน 3 วันทำการ/.test(await page.getByRole('status').innerText().catch(() => '')), await page.getByRole('status').innerText().catch(() => ''));
  // ลบกล่องแชทหลังจบนัด
  await go(`/chat/${A}`, 'A-chat-done');
  ok('[A] chat closed after completion', await page.getByLabel('พิมพ์ข้อความ').isDisabled());
  await page.getByRole('button', { name: 'จัดการแชท' }).click();
  await sheet('จัดการแชท').getByRole('button', { name: /ลบกล่องแชท/ }).click();
  await page.getByRole('dialog', { name: 'ลบกล่องแชทนี้?' }).getByRole('button', { name: 'ลบกล่องแชท', exact: true }).click();
  await page.waitForURL(/\/chat$/, { timeout: 10000 }).catch(() => {});
  ok('[A] chat box deleted → list', /\/chat$/.test(page.url()));

  // ══ B: ยกเลิกก่อนเพื่อนรับ ══
  const B_ = await bookUI('B', 10);
  if (B_) {
    await go(`/order/${B_}`, 'B-order');
    await page.getByRole('button', { name: /เพิ่มเติม/ }).click().catch(() => {});
    await page.getByRole('button', { name: 'ยกเลิกคำขอ' }).click();
    ok('[B] cancel sheet: full refund text', /คืน ฿[\d,]+ เข้ากระเป๋าทันที/.test(await sheet('ยกเลิกคำขอนี้?').innerText()));
    await sheet('ยกเลิกคำขอนี้?').getByLabel('เหตุผลที่ยกเลิก').fill('เปลี่ยนแผน');
    await step('B-cancel-sheet');
    await sheet('ยกเลิกคำขอนี้?').getByRole('button', { name: 'ยืนยันยกเลิก' }).click();
    await page.getByText(/ยกเลิกแล้ว/).first().waitFor({ timeout: 10000 }).catch(() => {});
    ok('[B] cancelled + refunded', (await bk(B_)).booking?.status === 'cancelled' && /คืนเข้ากระเป๋าแล้ว/.test(await body()));
    await step('B-cancelled');
  }

  // ══ C: ยกเลิกหลังเพื่อนรับ (ยอดคืนตามกติกา) ══
  const C_ = await bookUI('C', 11);
  if (C_) {
    await PT(C_, 'accept');
    await go(`/order/${C_}`, 'C-order');
    await page.getByRole('button', { name: /เพิ่มเติม/ }).click();
    await page.getByRole('button', { name: 'ยกเลิกนัด' }).click();
    const cs = sheet('ขอยกเลิกนัดที่ยืนยันแล้ว?');
    const ct = await cs.innerText();
    ok('[C] cancel sheet shows refund rule', /คืน \d+% = ฿[\d,]+|ทีมงานพิจารณาตามกติกา/.test(ct), ct.slice(0, 160));
    await step('C-cancel-sheet');
    await cs.getByRole('button', { name: 'ยืนยันยกเลิก' }).click();
    await page.waitForTimeout(1500);
    const st = (await bk(C_)).booking?.status;
    ok('[C] after-accept cancel → refunded/cancel_requested', ['cancel_requested', 'refunded', 'cancelled', 'completed'].includes(st), st);
    ok('[C] status message shown', /ยกเลิกแล้ว|ส่งคำขอยกเลิกแล้ว/.test(await body()));
    await step('C-after');
  }

  // ══ D: แจ้งปัญหา (หลังเริ่มนัด) ══
  const D_ = await bookUI('D', 12);
  if (D_) {
    await PT(D_, 'accept');
    await clearNow(); await toStart(D_, -5);
    await PT(D_, 'checkin', { gps: { lat: GPS.latitude, lng: GPS.longitude, accuracy: 15 } });
    await go(`/order/${D_}/dispute`, 'D-dispute');
    await page.getByRole('button', { name: 'ส่งเรื่องให้ทีมงาน' }).click();
    await page.waitForTimeout(500);
    ok('[D] dispute: empty → validation', await page.locator('p[role=alert]').count() > 0);
    await page.getByRole('radio').nth(1).click();
    await page.locator('textarea').fill('เพื่อนมาช้าและไม่สุภาพ ขอให้ทีมงานตรวจสอบ');
    await page.getByRole('button', { name: 'ส่งเรื่องให้ทีมงาน' }).click();
    await page.waitForURL((u) => u.pathname === '/order/' + D_, { timeout: 15000 }).catch(() => {});
    ok('[D] after dispute → back to order page', new URL(page.url()).pathname === '/order/' + D_, page.url());
    let ds = ''; for (let i = 0; i < 20 && ds !== 'disputed'; i++) { await page.waitForTimeout(500); ds = (await bk(D_)).booking?.status; }
    await page.waitForLoadState('networkidle');
    await step('D-sent');
    ok('[D] API: disputed', ds === 'disputed', ds);
  }

  // ══ E: เพื่อนไม่มาตามนัด ══
  const E_ = await bookUI('E', 13);
  if (E_) {
    await PT(E_, 'accept');
    await clearNow(); await toStart(E_, -20);
    await go(`/order/${E_}`, 'E-order');
    const nsBtn = page.getByRole('button', { name: /เพื่อนไม่มาตามนัด\? แจ้งเรา/ });
    ok('[E] no-show button after 15 min', await nsBtn.count() > 0);
    if (await nsBtn.count()) {
      await nsBtn.first().click();
      const ns = sheet('แจ้งเพื่อนไม่มาตามนัด');
      await ns.getByLabel('รายละเอียด').fill('รอที่หน้าร้านตั้งแต่เวลานัด ทักแชทแล้วไม่ตอบ');
      await ns.getByRole('button', { name: /แนบตำแหน่งของฉัน/ }).click();
      await page.getByText(/แนบตำแหน่งแล้ว/).waitFor({ timeout: 8000 }).catch(() => {});
      await ns.locator('input[type=file]').setInputFiles(IMGS[3]);
      await step('E-noshow-sheet');
      await ns.getByRole('button', { name: 'ส่งเรื่อง' }).click();
      await page.getByText(/ส่งเรื่องผิดนัดแล้ว/).waitFor({ timeout: 10000 }).catch(() => {});
      ok('[E] no-show sent → disputed', /ส่งเรื่องผิดนัดแล้ว/.test(await body()) && (await bk(E_)).booking?.status === 'disputed');
      await step('E-noshow-sent');
    }
  }

  // ══ F: เรียกด่วน → ยกเลิก ══
  await go('/quick', 'quick');
  const qbtn = page.locator('button').filter({ hasText: /^เรียก/ }).last();
  await page.getByLabel('จุดนัดพบ').fill('Terminal 21 อโศก');
  await step('quick-form');
  if (await qbtn.isEnabled().catch(() => false)) {
    await qbtn.click();
    await page.getByRole('button', { name: /ยกเลิก/ }).first().waitFor({ timeout: 15000 }).catch(() => {});
    await step('quick-waiting');
    const q1 = (await api('/api/quick', { cookie: C })).json;
    ok('[F] quick call created', !!(q1?.quick || q1?.call || q1?.q)?.id || /รอ|กำลังหา/.test(await body()), JSON.stringify(q1).slice(0, 160));
    await page.getByRole('button', { name: /ยกเลิก/ }).first().click();
    await page.getByRole('status').filter({ hasText: /ยกเลิกแล้ว/ }).waitFor({ timeout: 20000 }).catch(() => {});
    await step('quick-cancelled');
    ok('[F] quick call cancelled', /ยกเลิกแล้ว/.test(await body()));
  } else note('quick: no Part-Time free today → call button disabled (' + (await qbtn.innerText().catch(() => '')) + ')');

  // ── รายการนัด + ledger ──
  await go('/orders', 'orders');
  ok('orders list shows bookings', (await page.locator('a[href^="/order/"]').count()) >= 3);
  const sum = (await api('/api/admin/wallet', { cookie: ADMC })).json?.sum;
  ok('ledger sums to 0', sum === 0, sum);
  ok('only expected 400s (invoice tax id)', bad400.every((u) => u.endsWith('/invoice')), bad400.join(' '));
  // 400 = ขั้นที่ตั้งใจส่งเลขผู้เสียภาษีผิด (เบราว์เซอร์ log ไว้) · access control = WebKit ยกเลิก fetch ตอนเปลี่ยนหน้า
  S.res.errors = S.res.errors.filter((e) => !/due to access control checks|status of 400/.test(e));
  await S.done();
})().catch((e) => { console.log('ERR ' + (e.stack || e.message).split('\n').slice(0, 3).join(' ')); process.exit(1); });
