"use client";

import Link from "next/link";
import { baht } from "@/components/ui";
import { ADMIN_ORDERS, AUDIT, KYC_QUEUE, PAYOUTS, WEEKLY } from "@/lib/admin-data";
import { Card, PageHead, Pill } from "./admin-nav";

export default function AdminGpPage() {
  const gmv = WEEKLY.reduce((s, w) => s + w.gmv, 0);
  const gp = WEEKLY.reduce((s, w) => s + w.gp, 0);
  const held = ADMIN_ORDERS.filter((o) => ["held", "in_progress", "awaiting_release", "disputed"].includes(o.status)).reduce((s, o) => s + o.amount, 0);
  const pendingPay = PAYOUTS.filter((p) => !p.hold).reduce((s, p) => s + p.gross * 0.8, 0);
  const max = Math.max(...WEEKLY.map((w) => w.gmv));
  const sos = AUDIT.find((a) => a.type === "SOS");

  return (
    <>
      <PageHead title="รายได้ GP" sub="เดือนนี้ · ตัวเลขตัวอย่างในโหมดเดโม" />
      {sos && (
        <Link href="/admin/audit" className="mb-4 flex items-center gap-3 rounded-2xl border border-crimson-500 bg-crimson-500/10 px-4 py-3">
          <span className="w-2.5 h-2.5 rounded-full bg-crimson-500 animate-pulse shrink-0" />
          <span className="flex-1 text-sm"><b className="font-semibold">SOS ใหม่</b> · {sos.text}</span>
          <span className="text-sm text-crimson-200 shrink-0">รับเรื่อง →</span>
        </Link>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><p className="text-xs text-ink-300">GMV เดือนนี้</p><p className="font-display font-semibold text-2xl mt-1">{baht(gmv)}</p></Card>
        <Card className="border-gold-500"><p className="text-xs text-gold-500">รายได้ GP 20%</p><p className="font-display font-semibold text-2xl mt-1 text-gold-300">{baht(gp)}</p></Card>
        <Card><p className="text-xs text-ink-300">เงินถูกกันในระบบ</p><p className="font-display font-semibold text-2xl mt-1">{baht(held)}</p></Card>
        <Link href="/admin/payouts" className="block"><Card className="h-full hover:border-gold-500 transition"><p className="text-xs text-ink-300">ค้างโอนให้หมอ</p><p className="font-display font-semibold text-2xl mt-1">{baht(pendingPay)}</p></Card></Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-3 mt-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-medium text-lg">GP รายสัปดาห์</h2>
            <div className="flex gap-3 text-xs text-ink-300"><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-gold-500" />GMV</span><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-crimson-500" />GP</span></div>
          </div>
          <div className="grid grid-cols-4 gap-3 h-48 items-end">
            {WEEKLY.map((w) => (
              <div key={w.label} className="flex flex-col items-center gap-2 h-full justify-end">
                <div className="flex items-end gap-1.5 w-full justify-center h-full">
                  <div className="w-1/3 max-w-10 rounded-t-md bg-gold-500" style={{ height: `${(w.gmv / max) * 100}%` }} title={`GMV ${baht(w.gmv)}`} />
                  <div className="w-1/5 max-w-6 rounded-t-md bg-crimson-500" style={{ height: `${(w.gp / max) * 100}%` }} title={`GP ${baht(w.gp)}`} />
                </div>
                <span className="text-[11px] text-ink-300">{w.label}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-2"><h2 className="font-display font-medium text-lg">รอดำเนินการ</h2></div>
          <div className="flex flex-col divide-y divide-ink-600 text-sm">
            <Link href="/admin/kyc" className="flex justify-between py-3"><span>คิว KYC</span><Pill tone="red">{KYC_QUEUE.length}</Pill></Link>
            <Link href="/admin/orders" className="flex justify-between py-3"><span>ข้อพิพาท</span><Pill tone="red">{ADMIN_ORDERS.filter((o) => o.status === "disputed").length}</Pill></Link>
            <Link href="/admin/payouts" className="flex justify-between py-3"><span>โอนให้หมอ</span><Pill tone="gold">{PAYOUTS.filter((p) => !p.hold).length} ราย</Pill></Link>
            <Link href="/admin/cs" className="flex justify-between py-3"><span>CS ใหม่</span><Pill>3</Pill></Link>
          </div>
        </Card>
      </div>
    </>
  );
}
