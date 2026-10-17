import Link from "next/link";
import { currentCustomer } from "@/lib/customer/auth";
import { getBooking } from "@/lib/bookings";
import { getLivePeople } from "@/lib/home/live";
import { ReportForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "รายงาน — Mister Bamrungsuk", robots: { index: false } };

// บอร์ด C-Report — ชื่อผู้ถูกรายงานโหลดจากเซิร์ฟเวอร์ (การจองของฉัน หรือโปรไฟล์ที่เปิดอยู่) ไม่ใช้ ?nick= จาก URL
// ไม่มีเป้าหมาย / ไม่พบ = หน้าว่างที่บอกวิธีรายงาน แทน error
export default async function ReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
  const booking = one("booking"), pid = one("pid");
  let nick: string | null = null;
  let needLogin = false;
  if (booking) {
    const me = await currentCustomer().catch(() => null);
    if (!me) needLogin = true;
    else {
      const b = await getBooking(booking).catch(() => null);
      if (b && b.customer_id === me.sub) nick = b.parttime_nick ?? "เพื่อน";
    }
  } else if (pid && /^[a-z0-9]{6,16}$/i.test(pid)) {
    nick = (await getLivePeople().catch(() => [])).find((p) => p.id === pid)?.nick ?? null;
  }
  if (needLogin) return <Empty title="เข้าสู่ระบบก่อนรายงาน" body="รายงานจากการจองต้องเข้าสู่ระบบด้วยบัญชีที่จอง" href={`/login?next=${encodeURIComponent(`/report?booking=${booking}`)}`} cta="เข้าสู่ระบบ" />;
  if (nick == null) return <Empty title="เลือกคนที่ต้องการรายงาน" body="รายงานได้จากหน้าการจอง ห้องแชท หรือหน้าโปรไฟล์ของเพื่อน (ปุ่ม “รายงานผู้ใช้”) · มีเหตุฉุกเฉินกด SOS ได้ทันที" href="/orders" cta="ไปที่การจองของฉัน" />;
  return <ReportForm booking={booking} pid={booking ? null : pid} nick={nick} />;
}

function Empty({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#171211" }}>
      <header className="flex items-center gap-3 h-[68px] px-4" style={{ background: "#251d1b" }}>
        <Link href="/" aria-label="กลับหน้าแรก" className="w-11 h-11 rounded-full bg-[#211a18] grid place-items-center text-[#f3ead9] hover:text-[#f3ead9] shrink-0"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
        <h1 className="m-0 flex-1 font-semibold text-[18px]">รายงาน</h1>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center text-center gap-3" style={{ padding: "40px 24px" }}>
        <b className="text-[18px] font-semibold text-[#f3ead9]">{title}</b>
        <p className="m-0 text-[14px] font-light text-[#d9c9b4] max-w-[320px]">{body}</p>
        <Link href={href} className="mt-2 h-12 px-6 rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold grid place-items-center hover:text-[#1b130b]">{cta}</Link>
        <Link href="/sos" className="min-h-11 grid place-items-center text-[14px] text-[#ff8a9a] hover:text-[#ff8a9a]">อยู่ในอันตรายตอนนี้? กด SOS</Link>
      </main>
    </div>
  );
}
