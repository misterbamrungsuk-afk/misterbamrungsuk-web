import Link from "next/link";
import { notFound } from "next/navigation";
import { listNotices, markNoticesRead } from "@/lib/bookings";
import { ptNoticeHref } from "@/lib/join/pt-ui";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, loadPt, ptHref } from "../_pt";

export const dynamic = "force-dynamic";
export const metadata = { title: "แจ้งเตือน — Mister Bamrungsuk" };

// กล่องแจ้งเตือนของ Part-Time — งานใหม่ / ข้อความ / รายได้ / ถอนเงิน ฯลฯ · เปิดหน้านี้ = อ่านแล้วทั้งหมด (รายการที่เพิ่งอ่านยังไฮไลต์ให้เห็นรอบนี้)
const when = (iso: string) => new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

export default async function PtNotificationsPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const rows = await listNotices("parttime", c.row.id).catch(() => []);
  if (rows.some((n) => !n.read_at)) await markNoticesRead("parttime", c.row.id).catch(() => {});
  return (
    <PtPage>
      <PtHead back={ptHref(c)} title="แจ้งเตือน" />
      <div className="px-4 flex flex-col gap-2.5 max-w-[560px]">
        {!rows.length
          ? <div className="rounded-[18px] bg-[#211a18] text-[14px] font-light text-[#d9c9b4]" style={{ padding: "18px 16px" }}>ยังไม่มีแจ้งเตือน · งานใหม่ ข้อความจากลูกค้า และรายได้จะแจ้งที่นี่</div>
          : rows.map((n) => (
              <Link key={n.id} href={ptNoticeHref(c.mb, c.t, n.url)} className="rounded-[18px] flex gap-3 items-start text-[#f3ead9] hover:text-[#f3ead9]" style={{ padding: "12px 14px", background: n.read_at ? "#211a18" : "rgba(232,196,114,0.12)", border: `1px solid ${n.read_at ? "rgba(243,234,217,0.07)" : "rgba(232,196,114,0.45)"}` }}>
                <span aria-hidden="true" className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: n.read_at ? "transparent" : "#e8c472" }} />
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold leading-[1.4]">{n.title}</span>
                  {n.body && <span className="text-[13px] font-light text-[#d9c9b4] leading-[1.5] break-words">{n.body}</span>}
                  <span className="text-[12px] font-light text-[#b5a596]">{when(n.created_at)}{n.read_at ? "" : " · ใหม่"}</span>
                </span>
                <span className="text-[#e8c472] self-center" aria-hidden="true">›</span>
              </Link>
            ))}
      </div>
      <PtNav c={c} active="home" />
    </PtPage>
  );
}
