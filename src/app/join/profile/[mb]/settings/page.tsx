import Link from "next/link";
import { notFound } from "next/navigation";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, loadPt, ptHref } from "../_pt";
import { AccountActions, SettingsForm } from "../_ptc";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตั้งค่า — Mister Bamrungsuk" };

// บอร์ด ProviderSettings — สถานะยืนยันตัวตน · ตอบกลับอัตโนมัติ · บัญชีรับเงิน · ยอดจองล่าสุด · ออกจากระบบ / ลบบัญชี
const KYC: Record<string, [string, string, string]> = {
  none: ["ยังไม่ยืนยันตัวตน", "อัปโหลดบัตรประชาชนและเซลฟี่", "#e8c472"],
  submitted: ["ส่งเอกสารแล้ว · รอตรวจ", "ทีมงานตรวจภายใน 1–2 วันทำการ", "#e8c472"],
  approved: ["ยืนยันตัวตนแล้ว ✓", "บัตรประชาชน · เซลฟี่ · บัญชีธนาคาร", "#7fd6a3"],
  rejected: ["เอกสารต้องแก้ไข", "ดูรายการที่ต้องส่งใหม่", "#ff8a9a"],
};

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const k = c.x.kyc_status ?? "none";
  const [kt, ks, kc] = KYC[k] ?? KYC.none;
  const acc = c.row.bank_account?.replace(/\D/g, "") ?? "";
  const row = "min-h-[52px] flex items-center justify-between gap-3 text-[15px] hover:text-inherit";

  return (
    <PtPage>
      <PtHead back={ptHref(c)} title="ตั้งค่า" />
      <div className="px-4 flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <Link href={k === "rejected" ? `/join/rejected/${c.mb}${c.q}` : `/join/kyc/${c.mb}${c.q}`} className="rounded-[18px] bg-[#211a18] flex items-center gap-3 hover:text-inherit" style={{ padding: 16 }}>
            <span className="w-11 h-11 rounded-full grid place-items-center shrink-0" style={{ background: "rgba(232,196,114,0.14)", color: kc }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
            </span>
            <span className="flex-1 min-w-0 flex flex-col"><span className="font-semibold" style={{ color: kc }}>{kt}</span><span className="text-[13px] font-light text-[#d9c9b4]">{ks}</span></span>
            <span className="text-[#b5a596]">›</span>
          </Link>
          <SettingsForm mb={c.mb} t={c.t} init={c.x.pt_settings ?? null} />
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <div className="rounded-[18px] bg-[#211a18] flex flex-col gap-2" style={{ padding: 16 }}>
            <div className="flex justify-between items-center"><span className="font-semibold">บัญชีรับเงิน</span><Link href={`/join/bank/${c.mb}${c.q}`} className="text-[13px] text-[#e8c472] font-light">{acc ? "แก้ไข ›" : "+ เพิ่มบัญชี"}</Link></div>
            {acc
              ? <div className="rounded-xl bg-[#251d1b] flex flex-col" style={{ padding: "10px 12px" }}><span className="text-[14px]">{c.row.bank} · <span className="tabular-nums">xxx-x-x{acc.slice(-4, -1)}-{acc.slice(-1)}</span></span><span className="text-[12.5px] font-light text-[#d9c9b4]">{c.row.bank_account_name} · บัญชีหลัก</span></div>
              : <span className="text-[14px] font-light text-[#d9c9b4]">ยังไม่ได้เพิ่มบัญชี</span>}
          </div>
          <div className="rounded-[18px] bg-[#211a18] flex flex-col gap-1" style={{ padding: 16 }}>
            <span className="font-semibold">ยอดจองล่าสุด</span>
            <span className="text-[14px] font-light text-[#d9c9b4]">ยังไม่มีการจอง · เริ่มรับงานหลังอบรม</span>
          </div>
          <div className="rounded-[18px] bg-[#211a18] flex flex-col" style={{ padding: "4px 16px" }}>
            <Link href={ptHref(c, "reviews")} className={row}>รีวิวของฉัน<span className="text-[#b5a596]">›</span></Link>
            <div className="border-t border-[rgba(243,234,217,0.07)]" />
            <Link href="/policy" className={row}>กฎเกณฑ์และนโยบาย<span className="text-[#b5a596]">›</span></Link>
          </div>
          <AccountActions mb={c.mb} t={c.t} deleteRequested={c.x.delete_requested_at ?? null} />
        </div>
      </div>
      <PtNav c={c} active="settings" />
    </PtPage>
  );
}
