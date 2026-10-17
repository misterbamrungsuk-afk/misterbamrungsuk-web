import Link from "next/link";
import { notFound } from "next/navigation";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, loadPt, ptHref } from "../_pt";
import { listWithdrawals } from "@/lib/bookings/day";

export const dynamic = "force-dynamic";
export const metadata = { title: "ใบเสร็จรับเงิน — Mister Bamrungsuk" };

const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// บอร์ด EarningDocs (ปรับ 16 ต.ค.: ออกเฉพาะใบเสร็จรับเงินค่าธรรมเนียม ไม่ออก 50 ทวิ) — ออกอัตโนมัติเมื่อโอนสำเร็จ · ดาวน์โหลด PDF
export default async function DocsPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const paid = (await listWithdrawals({ parttime_id: c.row.id }).catch(() => [])).filter((w) => w.status === "paid" && w.fee_satang > 0);
  return (
    <PtPage>
      <PtHead back={ptHref(c, "earnings")} title="ใบเสร็จรับเงิน" />
      <div className="px-4 flex flex-col gap-3 w-full max-w-[640px] min-w-0">
        <div className="flex gap-3 items-start rounded-2xl bg-[#1b2322]" style={{ padding: "12px 14px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5fd08f" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          <div className="min-w-0 text-[13px] leading-[1.6] font-light"><b className="font-semibold">ระบบออกใบเสร็จรับเงินค่าธรรมเนียมให้อัตโนมัติทุกครั้งที่โอนเงินสำเร็จ</b><div className="text-[#b5a596]">แตะรายการเพื่อเปิดใบเสร็จและดาวน์โหลดเป็น PDF</div></div>
        </div>
        {!paid.length ? (
          <div className="rounded-[20px] bg-[#251d1b] flex flex-col items-center text-center gap-1" style={{ padding: "28px 16px" }}>
            <span className="font-semibold">ยังไม่มีเอกสาร</span>
            <span className="text-[13.5px] font-light text-[#d9c9b4]">ใบเสร็จรับเงินจะออกเมื่อถอนเงินและโอนสำเร็จครั้งแรก</span>
            <Link href={ptHref(c, "withdraw")} className="mt-2 text-[13px] text-[#e8c472]">ไปหน้าถอนเงิน ›</Link>
          </div>
        ) : paid.map((w) => (
          <Link key={w.id} href={`/join/profile/${c.mb}/docs/${w.id}${c.q}`} className="rounded-[18px] bg-[#251d1b] flex items-center gap-3 text-[#f3ead9] hover:text-[#f3ead9]" style={{ padding: 14 }}>
            <span className="flex-1 min-w-0"><span className="block font-semibold">ใบเสร็จรับเงิน WR-{w.id.slice(0, 8).toUpperCase()}</span><span className="block text-[12.5px] font-light text-[#b5a596]">{new Date(w.paid_at ?? w.created_at).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium" })} · ค่าธรรมเนียม {baht(w.fee_satang)} · ถอน {baht(w.amount_satang)}</span></span>
            <span className="text-[13px] font-semibold text-[#e8c472]">PDF ›</span>
          </Link>
        ))}
      </div>
      <PtNav c={c} active="earnings" />
    </PtPage>
  );
}
