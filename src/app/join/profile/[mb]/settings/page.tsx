import Link from "next/link";
import { notFound } from "next/navigation";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, acctOf, loadPt, ptHref } from "../_pt";
import { AccountLinks, SettingsForm } from "../_ptc";
import { PushButton } from "@/components/push-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตั้งค่า — Mister Bamrungsuk" };

// บอร์ด ProviderSettings — ยืนยันตัวตน (KYC) · ตอบกลับอัตโนมัติ · บัญชีรับเงิน · ยอดจองล่าสุด · แถวลิงก์ท้ายหน้า
const KYC: Record<string, [string, string]> = {
  none: ["ยังไม่ส่งเอกสาร · ส่งเลย", "kyc"],
  submitted: ["รอแอดมินตรวจ · ดูผล", "kyc"],
  approved: ["ยืนยันแล้ว ✓", "kyc"],
  rejected: ["ต้องแก้ไข · ดูผล", "rejected"],
};
const ic = "w-[22px] h-[22px] shrink-0";

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const k = c.x.kyc_status ?? "none";
  const [pill, to] = KYC[k] ?? KYC.none;
  const kycHref = `/join/${to}/${c.mb}${c.q}`;
  const acct = acctOf(c.row);
  const tile = (ok: boolean, label: string) => (
    <Link href={kycHref} className="flex-1 h-[118px] rounded-2xl flex flex-col items-center justify-center gap-1.5 text-[13px] text-center hover:text-inherit" style={{ color: ok ? "#e8c472" : "#f3ead9", background: "rgba(243,234,217,0.07)" }}>
      {ok ? "✓" : <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4m-5 5 5-5 5 5M4 20h16" /></svg>}
      <span>{label}</span>{ok && <span className="text-[13px] font-light text-[#f3ead9]">อัปโหลดแล้ว</span>}
    </Link>
  );

  return (
    <PtPage>
      <PtHead back={ptHref(c)} title="ตั้งค่า" />
      <div className="px-4 flex flex-col gap-3.5 md:grid md:grid-cols-2 md:items-start">
        <div className="flex flex-col gap-3.5 min-w-0">
          <div className="rounded-[20px] bg-[#2c1a1f] flex flex-col gap-3" style={{ padding: 16 }}>
            <div className="flex items-center gap-2.5">
              <svg className={`${ic} text-[#e8c472]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
              <div className="text-[17px] font-medium">ยืนยันตัวตน (KYC)</div>
              <Link href={kycHref} className="ml-auto h-9 rounded-full text-[13px] font-light flex items-center text-[#e8c472] hover:text-[#e8c472]" style={{ padding: "0 10px", background: "rgba(232,196,114,0.16)", color: k === "rejected" ? "#ff8a9a" : undefined }}>{pill}</Link>
            </div>
            <div className="flex gap-2.5">{tile(!!c.row.docs.id_card, "หน้าบัตรประชาชน")}{tile(!!c.row.docs.selfie, "รูปถือบัตรคู่หน้า")}</div>
            <div className="text-[13px] font-light">เมื่อได้ตรา ✓ แล้ว คุณจะรับงาน ถอนเงิน และลงประกาศรับงานได้</div>
          </div>
          <PushButton pt={{ mb: c.mb, t: c.t }} />
          <SettingsForm mb={c.mb} t={c.t} init={c.x.pt_settings ?? null} />
        </div>

        <div className="flex flex-col gap-3.5 min-w-0">
          <div className="rounded-[20px] bg-[#1b2322] flex flex-col gap-3" style={{ padding: 16 }}>
            <div className="text-[17px] font-medium">บัญชีรับเงิน</div>
            {acct
              ? <div className="flex items-center gap-3 rounded-[14px]" style={{ padding: 12, background: "rgba(243,234,217,0.07)" }}>
                  <span className="w-10 h-10 rounded-xl font-semibold text-[13px] grid place-items-center text-white" style={{ background: acct.logo }}>{acct.short}</span>
                  <div className="flex-grow min-w-0"><b className="font-medium">{acct.name}</b><div className="text-[13px] font-light">{acct.no} · หลัก</div></div>
                </div>
              : <div className="text-[14px] font-light text-[#b5a596]">ยังไม่มีบัญชีรับเงิน</div>}
            <Link href={`/join/bank/${c.mb}${c.q}`} className="h-[46px] rounded-[14px] grid place-items-center text-[#e8c472] hover:text-[#e8c472]" style={{ background: "rgba(232,196,114,0.16)" }}>{acct ? "แก้ไขบัญชี" : "+ เพิ่มบัญชี"}</Link>
          </div>
          <div className="rounded-[20px] bg-[#241c29] flex flex-col gap-2" style={{ padding: 16 }}>
            <div className="text-[17px] font-medium">ยอดจองล่าสุด</div>
            <div className="text-[14px] font-light text-[#b5a596]">ยังไม่มีการจอง · ลูกค้าชำระแล้ว เงินพักไว้กับเราจนจบนัด</div>
          </div>
          <AccountLinks mb={c.mb} t={c.t} reviewsHref={ptHref(c, "reviews")} quickHref={ptHref(c, "quick-replies")} strikesHref={ptHref(c, "strikes")} deleteRequested={c.x.delete_requested_at ?? null} />
        </div>
      </div>
      <PtNav c={c} active="settings" />
    </PtPage>
  );
}
