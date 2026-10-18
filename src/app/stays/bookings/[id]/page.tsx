import Link from "next/link";
import { notFound } from "next/navigation";
import { currentCustomer } from "@/lib/customer/auth";
import { getStay, sweep } from "@/lib/hotels/store";
import { SiteHeader } from "@/components/site-header";
import { LuxHeader } from "../../../hotels/venue-client";
import { StayDetail } from "./detail";

export const dynamic = "force-dynamic";
export const metadata = { title: "รายละเอียดการจองห้องพัก · Mister Bamrungsuk" };

export default async function StayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await currentCustomer();
  const { id } = await params;
  if (!me) {
    return (
      <main className="min-h-dvh bg-[#171211] text-[#f3ead9] mb-v7 mb-c">
        <div className="max-w-[480px] mx-auto"><SiteHeader /><LuxHeader back="/stays/bookings" eyebrow="MY STAYS" title="การจองห้องพัก" />
          <p className="px-[18px] pt-6 text-center text-[13px] text-[#d9c9b4]">เข้าสู่ระบบเพื่อดูการจอง · <Link href={`/login?next=${encodeURIComponent(`/stays/bookings/${id}`)}`} className="text-[#e8c472] underline">เข้าสู่ระบบ</Link></p>
        </div>
      </main>
    );
  }
  await sweep().catch(() => null);
  const b = await getStay(id).catch(() => null);
  if (!b || b.customer_id !== me.sub || b.status === "paying") notFound();
  return (
    <main className="min-h-dvh bg-[#171211] text-[#f3ead9] mb-v7 mb-c">
      <div className="max-w-[480px] md:max-w-[760px] mx-auto">
        <SiteHeader />
        <LuxHeader back="/stays/bookings" eyebrow={b.code} title={b.partner_name} />
        <StayDetail initial={b} />
      </div>
    </main>
  );
}
