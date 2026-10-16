/* eslint-disable @next/next/no-img-element */
import { redirect } from "next/navigation";
import { TopBar } from "@/components/shell";
import { currentCustomer } from "@/lib/customer/auth";
import { getProfile } from "@/lib/customer/profile";
import { getLivePeople } from "@/lib/home/live";
import { Unblock } from "./unblock";

export const dynamic = "force-dynamic";
export const metadata = { title: "ผู้ใช้ที่บล็อก — Mister Bamrungsuk" };

// ผู้ใช้ที่บล็อก (จากหน้ารายงาน C-Report) — ยกเลิกบล็อกได้
export default async function BlockedPage() {
  const me = await currentCustomer();
  if (!me) redirect("/login?next=/profile/blocked");
  const [p, live] = await Promise.all([getProfile(me.sub, me.email), getLivePeople().catch(() => [])]);
  return (
    <div className="pb-8">
      <TopBar back="/profile" title="ผู้ใช้ที่บล็อก" />
      <div className="flex flex-col gap-2" style={{ padding: "8px 16px 0" }}>
        {!p.blocked.length && <p className="text-center text-[14px] text-[#d9c9b4]" style={{ padding: 32 }}>ยังไม่ได้บล็อกใคร</p>}
        {p.blocked.map((id) => {
          const x = live.find((y) => y.id === id);
          return (
            <div key={id} className="flex items-center gap-3 rounded-2xl bg-[#211a18]" style={{ padding: 12, border: "1px solid rgba(243,234,217,0.07)" }}>
              {x ? <img src={x.img} alt="" className="w-12 h-12 rounded-full object-cover" /> : <span className="w-12 h-12 rounded-full bg-[#251d1b]" />}
              <span className="flex-1 min-w-0"><b className="font-medium">{x?.nick ?? "ผู้ใช้ที่ปิดรับงานแล้ว"}</b><span className="block text-[12px] font-light text-[#b5a596]">ไม่แสดงในหน้าแรก ค้นหา และจองไม่ได้</span></span>
              <Unblock id={id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
