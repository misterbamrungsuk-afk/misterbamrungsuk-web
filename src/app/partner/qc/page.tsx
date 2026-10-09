import Link from "next/link";
import { partnerFromTokenOrSession } from "@/lib/partner/identify";
import { partnerCode } from "@/lib/partner/status";
import { Shell } from "../ui";
import { QcClient } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "นัด QC สถานที่ · Mister Bamrungsuk" };

// นัด QC สถานที่ (บอร์ด PartnerQC) — token (?t=) จากฟอร์มสมัคร หรือเซสชันพาร์ทเนอร์
export default async function PartnerQcPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const p = await partnerFromTokenOrSession(t);
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  return (
    <Shell>
      <div className="px-4 pt-3 flex items-center gap-2">
        <Link href={p ? `/partner/done${q}` : "/partner"} aria-label="ย้อนกลับ" className="shrink-0 w-11 h-11 rounded-full border border-[rgba(240,200,90,.38)] bg-[#241717] grid place-items-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 5-7 7 7 7" /></svg>
        </Link>
        <h1 className="font-lux font-semibold text-[17px] text-[#f0c75a] min-w-0 truncate">นัด QC สถานที่{p ? ` · ${partnerCode(p.id, p.created_at)}` : ""}</h1>
      </div>
      <div className="px-4 pt-3 flex flex-col gap-3.5">
        {p ? (
          <QcClient token={t ?? ""} business={p.business_name} initialSlot={p.qc_slot ?? null} initialDocs={p.qc_docs ?? {}} passed={p.qc === "passed"} />
        ) : (
          <p className="text-sm text-[#cdbfb3] text-center pt-6">กรุณา <Link href="/partner/login">เข้าสู่ระบบพาร์ทเนอร์</Link> หรือเปิดลิงก์จากหน้าสมัครสำเร็จ</p>
        )}
        <Link href="/partner/login" className="text-[13px] text-center p-1">เข้าสู่ระบบพอร์ทัลพาร์ทเนอร์</Link>
      </div>
    </Shell>
  );
}
