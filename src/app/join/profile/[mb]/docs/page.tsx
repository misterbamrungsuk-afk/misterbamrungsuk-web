import Link from "next/link";
import { notFound } from "next/navigation";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, loadPt, ptHref } from "../_pt";

export const dynamic = "force-dynamic";
export const metadata = { title: "ใบเสร็จและใบหัก ณ ที่จ่าย — Mister Bamrungsuk" };

// บอร์ด EarningDocs — ใบเสร็จ/ใบกำกับภาษี (ค่าธรรมเนียม 3%) & หนังสือรับรองหัก ณ ที่จ่าย 3% (50 ทวิ) ออกอัตโนมัติทุกครั้งที่ถอน · เก็บไฟล์ 30 วัน
// ยังไม่มีการถอน → แสดงสถานะว่าง
export default async function DocsPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string; tab?: string }> }) {
  const sp = await searchParams;
  const c = await loadPt(params, Promise.resolve(sp));
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const tab = ["rc", "wt"].includes(sp.tab ?? "") ? sp.tab : "all";
  const href = (k: string) => `/join/profile/${c.mb}/docs?${c.t ? `t=${encodeURIComponent(c.t)}&` : ""}tab=${k}`;
  return (
    <PtPage>
      <PtHead back={ptHref(c, "earnings")} title="ใบเสร็จ/ใบกำกับภาษี & ใบหัก ณ ที่จ่าย" />
      <div className="px-4 flex flex-col gap-3 max-w-[640px]">
        <div className="flex gap-3 items-start rounded-2xl bg-[#1b2322]" style={{ padding: "12px 14px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5fd08f" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          <div className="text-[13px] leading-[1.6] font-light"><b className="font-semibold">ระบบออกเอกสารให้อัตโนมัติทุกครั้งที่ถอนเงิน</b><div className="text-[#b5a596]">เก็บไฟล์ไว้ 30 วันนับจากวันที่ถอน หลังจากนั้นไฟล์จะถูกลบ กรุณาดาวน์โหลดเก็บไว้</div></div>
        </div>
        <nav aria-label="ประเภทเอกสาร" className="flex gap-1 p-1 rounded-[14px] bg-[#251d1b]">
          {[["all", "ทั้งหมด"], ["rc", "ใบเสร็จ/ใบกำกับ"], ["wt", "ใบหัก ณ ที่จ่าย"]].map(([k, l]) => (
            <Link key={k} href={href(k)} aria-current={tab === k ? "page" : undefined} className="flex-1 h-9 rounded-[10px] grid place-items-center text-[13px] font-semibold" style={{ background: tab === k ? "#e8c472" : "transparent", color: tab === k ? "#1b130b" : "#f3ead9" }}>{l}</Link>
          ))}
        </nav>
        <div className="rounded-[20px] bg-[#251d1b] flex flex-col items-center text-center gap-1" style={{ padding: "28px 16px" }}>
          <span className="font-semibold">ยังไม่มีเอกสาร</span>
          <span className="text-[13.5px] font-light text-[#d9c9b4]">{tab === "wt" ? "หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ) จะออกเมื่อถอนเงินครั้งแรก" : tab === "rc" ? "ใบเสร็จ/ใบกำกับภาษีค่าธรรมเนียม 3% จะออกเมื่อถอนเงินครั้งแรก" : "เอกสารจะออกให้อัตโนมัติเมื่อถอนเงินครั้งแรก"}</span>
          <Link href={ptHref(c, "withdraw")} className="mt-2 text-[13px] text-[#e8c472]">ไปหน้าถอนเงิน ›</Link>
        </div>
        <div className="text-[12.5px] text-[#b5a596] text-center font-light" style={{ padding: "4px 12px" }}>ข้อมูลผู้รับเงินดึงจากใบสมัครและเอกสารยืนยันตัวตนอัตโนมัติ · เอกสารที่หมดอายุแล้ว ขอสำเนาได้ที่แอดมิน</div>
      </div>
      <PtNav c={c} active="earnings" />
    </PtPage>
  );
}
