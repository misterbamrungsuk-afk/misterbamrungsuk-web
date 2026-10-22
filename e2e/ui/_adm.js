// ตัวช่วยกดหน้าจอหลังบ้านแอดมิน (ใช้ร่วม 40/41/42)
const { BASE, adminToken } = require('./_lib');

/** สลับบัญชีแอดมินในแท็บเดิม (ล้างคุกกี้ แล้วใส่ mord_admin ของบทบาทใหม่) */
async function as(ctx, role, email) {
  await ctx.clearCookies();
  await ctx.addCookies([{ name: 'mord_admin', value: adminToken(role, email || `ui-${role}@local.test`), url: BASE }]);
}
const adminCookie = (role, email) => ({ name: 'mord_admin', value: adminToken(role, email || `ui-${role}@local.test`) });

/** กดปุ่มยืนยันในกล่องยืนยัน (confirm.tsx) */
async function confirmDlg(page, okName) {
  const d = page.locator('[role=dialog][aria-modal=true]');
  await d.waitFor({ timeout: 10000 });
  const title = (await d.locator('#adm-confirm-t').textContent().catch(() => '')) || '';
  await d.getByRole('button', { name: okName, exact: true }).click();
  await d.waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
  return title;
}
/** รอข้อความ role=status/alert ที่ตรง regex */
async function waitMsg(page, re, timeout = 30000) {
  try {
    await page.waitForFunction((src) => { const r = new RegExp(src); return [...document.querySelectorAll('[role=status],[role=alert]')].some((e) => r.test(e.textContent || '')); }, re.source, { timeout });
    return (await page.locator('[role=status],[role=alert]').filter({ hasText: re }).first().textContent()) || '';
  } catch { return (await page.locator('[role=status],[role=alert]').allTextContents().catch(() => [])).join(' | ') || '(no message)'; }
}
/** รูปทั้งหมดในตัวเลือกโหลดสำเร็จ (naturalWidth > 0) */
async function imgsLoaded(page, sel) {
  await page.waitForTimeout(400);
  return page.$$eval(sel, async (els) => {
    await Promise.all(els.map((e) => (e.complete ? null : new Promise((r) => { e.onload = e.onerror = r; setTimeout(r, 25000); }))));
    return { n: els.length, ok: els.filter((e) => e.naturalWidth > 0).length, bad: els.filter((e) => !(e.naturalWidth > 0)).map((e) => e.getAttribute('src')).slice(0, 3) };
  });
}
const bodyText = (page) => page.locator('body').innerText();
const reload = async (page) => { await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500); }; // รอ hydrate ก่อนกด (โหมด dev)

module.exports = { as, adminCookie, confirmDlg, waitMsg, imgsLoaded, bodyText, reload };
/** ลองซ้ำจนเงื่อนไขจริง (เซิร์ฟเวอร์ dev ช้าเมื่อหลายชุดรันพร้อมกัน) — คืน true/false */
async function poll(fn, ms = 20000, every = 400) {
  const end = Date.now() + ms;
  for (;;) { try { if (await fn()) return true; } catch {} if (Date.now() > end) return false; await new Promise((r) => setTimeout(r, every)); }
}
module.exports.poll = poll;
