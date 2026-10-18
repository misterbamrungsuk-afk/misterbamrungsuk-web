import { redirect } from "next/navigation";
import { currentPartner } from "@/lib/partner/auth";
import { listNotices } from "@/lib/bookings";
import { countSubs } from "@/lib/push";
import { NoticeInbox } from "@/components/notice-inbox";

export const dynamic = "force-dynamic";
export const metadata = { title: "แจ้งเตือน · พอร์ทัลพาร์ทเนอร์" };

// กล่องแจ้งเตือนพาร์ทเนอร์: การจองห้อง/สปาใหม่ · ยกเลิก · เงินเข้า · ถอนเงิน · คืนเงินลูกค้า
export default async function PartnerNoticesPage() {
  const p = await currentPartner();
  if (!p) redirect("/partner/login");
  const [rows, devices] = await Promise.all([listNotices("partner", p.id, 100).catch(() => []), countSubs("partner", p.id)]);
  return (
    <div className="py-5 flex flex-col gap-3">
      <h1 className="m-0 text-[20px] font-semibold">แจ้งเตือน</h1>
      <NoticeInbox api="/api/partner/notifications" pushTo="/api/partner/push" initial={rows} devices={devices} />
    </div>
  );
}
