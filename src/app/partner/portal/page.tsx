import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPartner } from "@/lib/partner/auth";
import { PARTNER_PACKAGES, baht } from "@/lib/partner/config";
import { getListing, listBookings, listPurchases } from "@/lib/partner/portal";
import { ACCOUNT_LABEL, BOOKING_LABEL, type PartnerBooking } from "@/lib/partner/portal-types";
import { daysLeft } from "@/lib/partner/status";
import { KpiTabs, type KpiSet } from "./kpi";

export const dynamic = "force-dynamic";

const TZ = 7 * 3600_000;
/** เที่ยงคืนเวลาไทยของวันนี้ (ms) */
const bkkMidnight = (now: number) => Math.floor((now + TZ) / 86400_000) * 86400_000 - TZ;
const timeTh = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function kpis(rows: PartnerBooking[], from: number): KpiSet {
  const xs = rows.filter((b) => Date.parse(b.start_time) >= from && b.status !== "cancelled");
  const earned = xs.filter((b) => b.status === "confirmed" || b.status === "done");
  return [
    ["การจองเข้ามา", String(xs.length)],
    ["ยอดจอง", `฿${baht(earned.reduce((s, b) => s + b.amount, 0))}`],
    ["รอยืนยัน", String(xs.filter((b) => b.status === "pending").length)],
    ["ห้องเต็ม / ปฏิเสธ", String(xs.filter((b) => b.status === "full").length)],
  ];
}

export default async function PortalHome() {
  const p = await currentPartner();
  if (!p) redirect("/partner/login");
  const now = Date.now();
  const today = bkkMidnight(now);
  const th = new Date(now + TZ);
  const month = Date.UTC(th.getUTCFullYear(), th.getUTCMonth(), 1) - TZ;
  const since = Math.min(today - 6 * 86400_000, month);
  const [rows, listing, purchases] = await Promise.all([
    listBookings(p.id, new Date(since).toISOString()).catch(() => []),
    getListing(p.id).catch(() => null),
    listPurchases(p.id).catch(() => []),
  ]);
  const sets = { today: kpis(rows, today), "7d": kpis(rows, today - 6 * 86400_000), month: kpis(rows, month) };
  const upcoming = rows.filter((b) => Date.parse(b.start_time) >= now && (b.status === "pending" || b.status === "confirmed")).slice(0, 4);
  const left = daysLeft(p.ends_at);
  const total = p.starts_at && p.ends_at ? Math.round((Date.parse(p.ends_at) - Date.parse(p.starts_at)) / 86400_000) : null;
  const pendingPay = purchases.some((x) => x.status === "pending");
  const hour = new Date(now + TZ).getUTCHours();
  const greet = hour < 12 ? "สวัสดีตอนเช้า" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";

  return (
    <>
      <section className="mt-5">
        <p className="text-sm text-ink-300">{greet}</p>
        <h1 className="font-display text-2xl font-semibold">{p.business_name}</h1>
        <p className="text-xs mt-1">
          <span className={listing?.published ? "text-emerald-300" : "text-ink-400"}>● {listing?.published ? "เปิดแสดงอยู่" : "ยังไม่เปิดแสดง"}</span>
          <span className="text-ink-400"> · บัญชี{ACCOUNT_LABEL[p.account_status ?? "pending"]}</span>
        </p>
      </section>

      <KpiTabs sets={sets} />

      <Link href="/partner/portal/package" className="block glass rounded-3xl p-4 mt-4">
        {left != null && total ? (
          <>
            <div className="flex justify-between text-sm"><span>แผนโปรโมท {(PARTNER_PACKAGES[p.package]?.label ?? p.package)}</span><span className={left <= 30 ? "text-crimson-300" : "text-gold-300"}>{left > 0 ? `เหลือ ${left} / ${total} วัน` : "หมดอายุแล้ว"}</span></div>
            <div className="h-1.5 rounded-full bg-ink-700 mt-2 overflow-hidden"><div className={`h-full ${left <= 30 ? "bg-crimson-500" : "bg-gold-500"}`} style={{ width: `${Math.max(0, Math.min(100, (left / total) * 100))}%` }} /></div>
          </>
        ) : (
          <p className="text-sm">{pendingPay ? "รอทีมงานตรวจสลิปค่าแผนโปรโมท" : "ยังไม่มีแผนโปรโมทที่ใช้งาน — ชำระค่าแผนโปรโมท"}</p>
        )}
        <p className="text-xs text-gold-400 mt-2">ดูรายละเอียดแผนโปรโมท ›</p>
      </Link>

      <section className="mt-6">
        <div className="flex justify-between items-baseline"><h2 className="font-semibold">การจองที่กำลังจะมาถึง</h2><Link href="/partner/portal/bookings" className="text-xs text-gold-300">ดูทั้งหมด</Link></div>
        {upcoming.length === 0 ? <p className="text-sm text-ink-400 mt-3">ยังไม่มีการจองที่กำลังจะมาถึง</p> : (
          <ul className="mt-3 space-y-2">
            {upcoming.map((b) => (
              <li key={b.id} className="rounded-2xl border border-ink-600 bg-ink-800/60 px-4 py-3 flex justify-between gap-3">
                <div className="min-w-0"><p className="font-medium truncate">{b.parttime_name}</p><p className="text-xs text-ink-300 truncate">ลูกค้า {b.customer_name} · {b.hours} ชม.</p></div>
                <div className="text-right shrink-0"><p className="text-sm">{timeTh(b.start_time)}</p><p className="text-xs text-ink-400">{b.room ?? BOOKING_LABEL[b.status]}</p></div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">ทางลัด</h2>
        <div className="grid grid-cols-4 gap-2 mt-3 text-center text-xs">
          {[["/partner/portal/bookings", "ยืนยันจอง"], ["/partner/portal/listing", "แก้หน้าร้าน"], ["/partner/portal/listing#hours", "เวลาเปิด"], ["/partner/portal/package#invoices", "ใบแจ้งหนี้"]].map(([h, l]) => (
            <Link key={h} href={h} className="rounded-2xl border border-ink-600 bg-ink-800/60 py-4 hover:border-gold-500">{l}</Link>
          ))}
        </div>
      </section>
    </>
  );
}
