import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { overview, systemChecks } from "@/lib/admin/overview";
import { Card, PageHead, Pill } from "./admin-nav";
import { PingButton } from "./ping-button";
import { iceServers } from "@/lib/calls";

export const dynamic = "force-dynamic";

// ภาพรวมจริง: การจอง · เงินในระบบ (ledger) · คิวงานแอดมิน · SOS · กระทบยอด · คีย์บริการภายนอก
const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 });

export default async function AdminHome() {
  // TURN: ตั้งคีย์แล้ว → ลองขอ credential จริงจาก Cloudflare (ได้ turn: = ใช้งานได้)
  const [o, checks0, ice] = [await overview(), systemChecks(), await iceServers().catch(() => ({ turn: false }))];
  const checks = checks0.map((c) => (c.key === "turn" && c.ok ? { ...c, ok: ice.turn, need: ice.turn ? "ทดสอบขอคีย์ชั่วคราวจาก Cloudflare สำเร็จ" : "ตั้งคีย์แล้วแต่ Cloudflare ปฏิเสธ · ตรวจค่าที่ใส่" } : c));
  const role = (await verifySession((await cookies()).get(ADMIN_COOKIE)?.value))?.role;
  const ceoHref = role === "ceo" ? "/ceo" : "/admin/ceo-view"; // ห้อง CEO ลิงก์แยก (รหัส CEO) · แอดมินอื่นดูอย่างเดียว
  const q = o.queues, m = o.money, b = o.bookings, f = o.recon?.figures;
  const all: [string, number, string, string?][] = [
    ["ตัดสินยกเลิก / ข้อพิพาท", b.decide, "/admin/orders", "red"],
    ["SOS / แจ้งเตือนค้าง", o.alerts.open, "/admin/audit", "red"],
    ["รายงานผู้ใช้รอตรวจ", q.reports, "/admin/reports", "red"],
    ["แชทฝ่าฝืนคำห้าม (ยังไม่อ่าน)", q.chatViolations, "/admin/chats?f=flag"],
    ["เติมเงินรอตรวจสลิป", q.topups, "/admin/wallet"],
    ["คำขอถอน Part-Time รอ CEO อนุมัติ", q.withdrawRequested - q.ownerRequested, ceoHref],
    ["คำขอถอนพาร์ทเนอร์ / ร้านค้า รอ CEO", q.ownerRequested, ceoHref],
    ["CEO อนุมัติแล้ว · รอโอน", q.withdrawApproved, "/admin/payouts"],
    ["รอบโอนรอยืนยัน", q.withdrawBatched, "/admin/payouts"],
    ["สลิปเปิดเมมรอตรวจ", q.memberSlips, "/admin/sales"],
    ["ออเดอร์ร้านค้ารอยืนยันชำระ", q.marketOrders, "/admin/market"],
    ["โปรโมทโปรไฟล์รอตรวจสลิป", q.boosts, "/admin/boosts"],
    ["KYC รอตรวจ", q.kyc, "/admin/kyc"],
    ["สลิปผู้สมัครรอตรวจ", q.slips, "/admin/slips"],
  ];
  // แสดงเฉพาะคิวที่บทบาทนี้เปิดหน้าได้ (กดแล้วไม่โดนเด้ง ?denied=1)
  const todo = role ? all.filter(([, , href]) => canAccess(role, href.split("?")[0])) : [];
  return (
    <>
      <PageHead title="ภาพรวม" sub={`ข้อมูลจริง ณ ${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`} />
      {/* ระบบหลัก (บอส/SIRI 24 ต.ค. 2569) — กดเข้าหน้าบริหารย่อยของแต่ละระบบ */}
      <div data-admin-systems className="grid grid-cols-2 xl:grid-cols-5 gap-2.5 mb-5">
        {([["ยอดเงินเข้า", "ใครโอน · จากระบบไหน", "/admin/income", "#ffd76a"], ["ระบบ Part-Time", "ผู้สมัคร · KYC · อบรม · Recruit", "/admin/applicants", "#e8c472"], ["ระบบ Partner", "สปา · โรงแรม · จองห้อง", "/admin/partners", "#2f7a46"], ["ระบบ Collab", "MB x Bars · กำลังเตรียม", "/admin/collab", "#5b3fb0"], ["ระบบร้านค้า", "Marketplace · โค้ดโปร", "/admin/market", "#c0577e"]] as const)
          .filter(([, , href]) => role && canAccess(role, href))
          .map(([t, d, href, c]) => (
            <Link key={href} href={href} className="rounded-2xl border px-4 py-3.5 flex flex-col gap-0.5 text-inherit hover:text-inherit hover:bg-[rgba(240,200,90,.06)]" style={{ borderColor: c, background: "#ffffff" }}>
              <b className="text-[16px]" style={{ color: c }}>{t}</b><span className="text-[12px] text-[#cdbfb3]">{d}</span>
            </Link>
          ))}
      </div>
      {o.alerts.sos.map((s) => (
        <Link key={s.id} href="/admin/audit" className="mb-3 flex items-center gap-3 rounded-2xl border border-crimson-500 bg-crimson-500/10 px-4 py-3">
          <span className="w-2.5 h-2.5 rounded-full bg-crimson-500 animate-pulse shrink-0" />
          <span className="flex-1 text-sm min-w-0"><b className="font-semibold">{s.title}</b><span className="block text-ink-300 truncate">{s.body}</span></span>
          <span className="text-sm text-crimson-200 shrink-0">รับเรื่อง →</span>
        </Link>
      ))}
      {o.recon && !o.recon.ok && (role && canAccess(role, "/admin/wallet")
        ? <Link href="/admin/wallet" className="mb-3 block rounded-2xl border border-amber-500 bg-amber-500/10 px-4 py-3 text-sm"><b>⚠ ยอดเงินไม่ตรง {o.recon.issues.length} รายการ</b> · {o.recon.issues[0]}</Link>
        : <p className="mb-3 rounded-2xl border border-amber-500 bg-amber-500/10 px-4 py-3 text-sm"><b>⚠ ยอดเงินไม่ตรง {o.recon.issues.length} รายการ</b> · แจ้งฝ่ายการเงินตรวจ</p>)}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><p className="text-xs text-ink-300">นัดวันนี้</p><p className="font-display font-semibold text-2xl mt-1">{b.today}</p><p className="text-xs text-ink-300 mt-1">รอตอบรับ {b.waiting} · กำลังดำเนิน {b.live}</p></Card>
        <Card><p className="text-xs text-ink-300">ยอดจองที่จบเดือนนี้</p><p className="font-display font-semibold text-2xl mt-1">{baht(b.monthGmv)}</p><p className="text-xs text-ink-300 mt-1">{b.monthDone} นัด</p></Card>
        <Card className="border-gold-500"><p className="text-xs text-gold-600">รายได้บริษัท (สะสม)</p><p className="font-display font-semibold text-2xl mt-1 text-gold-300">{baht(m.revenue)}</p><p className="text-xs text-ink-300 mt-1">ค่าธรรมเนียม + ส่วนแบ่ง</p></Card>
        <Card><p className="text-xs text-ink-300">เงินพักไว้ (escrow)</p><p className="font-display font-semibold text-2xl mt-1">{baht(m.escrow)}</p><p className="text-xs text-ink-300 mt-1">นัดที่ยืนยันแล้ว</p></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] mt-4">
        <Card>
          <h2 className="font-semibold mb-2">งานที่ต้องทำ</h2>
          {!todo.length && <p className="text-sm text-ink-300">ไม่มีคิวงานสำหรับบทบาทนี้</p>}
          {todo.map(([label, n, href, tone]) => (
            <Link key={label} href={href} className="flex justify-between items-center py-2.5 border-b border-ink-600 last:border-0"><span>{label}</span><Pill tone={n ? (tone === "red" ? "red" : "gold") : "muted"}>{n}</Pill></Link>
          ))}
        </Card>
        <Card>
          <h2 className="font-semibold mb-2">เงินในระบบ</h2>
          {([
            ["เงินเข้าบัญชีบริษัท (เติม − โอนออก)", m.bank], ["กระเป๋าลูกค้า (ใช้ได้)", m.customerAvail], ["ลูกค้า (กันไว้รอตอบรับ)", m.customerHeld],
            ["Part-Time รอปล่อยเงิน", m.ptPending], ["Part-Time ถอนได้", m.ptAvail], ["Part-Time กำลังถอน", m.ptWithdrawing],
            ["ค้างจ่ายพาร์ทเนอร์ (ค่าห้อง)", m.partner], ["หัก ณ ที่จ่าย ค้างนำส่ง", m.wht], ["ยอดโอนรอบถัดไป (สุทธิ)", q.withdrawSum],
          ] as [string, number][]).map(([k, v]) => <div key={k} className="flex justify-between py-1.5 text-sm"><span className="text-ink-300">{k}</span><span className="tabular-nums">{baht(v)}</span></div>)}
          {/* เงินพักร้านค้า/ห้องพัก เทียบกับยอดที่ควรเป็นจากกระทบยอด */}
          {([
            ["เงินพักร้านค้า (จ่ายด้วยกระเป๋า)", m.marketEscrow, f?.expMarket, "ออเดอร์ที่ยังไม่จบ"],
            ["เงินพักห้องพัก", m.hotelEscrow, f?.expHotel, "การจองห้องที่ยังไม่เช็กเอาต์"],
          ] as [string, number, number | undefined, string][]).map(([k, v, exp, what]) => (
            <div key={k} className="flex justify-between py-1.5 text-sm"><span className="text-ink-300">{k}{exp != null && <span className={`block text-xs ${exp === v ? "text-emerald-300" : "text-amber-300"}`}>{exp === v ? `✓ ตรงกับ${what}` : `⚠ ${what} ${baht(exp)}`}</span>}</span><span className="tabular-nums">{baht(v)}</span></div>
          ))}
          <p className={`text-xs mt-2 ${o.recon?.ok ? "text-emerald-300" : "text-amber-300"}`}>{o.recon ? (o.recon.ok ? "✓ กระทบยอดตรงทุกบัญชี" : "⚠ กระทบยอดไม่ตรง — ดู /admin/wallet") : "ยังอ่านข้อมูลเงินไม่ได้"}</p>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="font-semibold mb-2">ความพร้อมระบบ (คีย์บริการภายนอก)</h2>
        <div className="grid gap-x-6 sm:grid-cols-2">
          {checks.map((c) => (
            <div key={c.key} className="flex items-start gap-2 py-1.5 text-sm"><span className={c.ok ? "text-emerald-400" : "text-amber-400"}>{c.ok ? "✓" : "✗"}</span><span className="flex-1">{c.label}{!c.ok && <span className="block text-xs text-ink-300">{c.need}</span>}{c.ok && c.key === "slip2go" && <PingButton service="slip2go" label="ทดสอบคีย์" />}{c.ok && c.key === "email" && <PingButton service="email" label="ส่งอีเมลทดสอบ" />}</span></div>
          ))}
        </div>
      </Card>
    </>
  );
}
