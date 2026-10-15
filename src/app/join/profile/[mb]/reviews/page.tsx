import Link from "next/link";
import { notFound } from "next/navigation";
import { Forbidden } from "../../../_kyc/ui";
import { PtNav, PtPage, loadPt, ptHref } from "../_pt";

export const dynamic = "force-dynamic";
export const metadata = { title: "รีวิวของฉัน — Mister Bamrungsuk" };

// บอร์ด P-Reviews — หัวพื้น #251d1b · คะแนนรวม + แท่ง 5→1 · แท็บกรอง · รายการรีวิว (ยังว่างจนจบนัดแรก)
export default async function ReviewsPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const c = await loadPt(params, searchParams);
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();
  const card = "rounded-[18px] bg-[#211a18]";
  return (
    <PtPage>
      <header className="flex items-center gap-3 h-[68px] bg-[#251d1b]" style={{ padding: "12px 16px" }}>
        <Link href={ptHref(c)} aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full bg-[#211a18] text-[#f3ead9] grid place-items-center shrink-0 hover:text-[#f3ead9]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <h1 className="m-0 flex-1 text-[18px] font-semibold">รีวิวของฉัน</h1>
      </header>
      <main className="flex flex-col gap-3.5 max-w-[560px]" style={{ padding: "20px 16px 24px", lineHeight: 1.6 }}>
        <div className={`${card} flex gap-4 items-center`} style={{ padding: 16 }}>
          <div className="text-center"><div className="font-semibold text-[36px] text-[#e8c472] leading-tight">—</div><div className="text-[12px] font-light text-[#b5a596]">0 รีวิว</div></div>
          <div className="flex-1 flex flex-col gap-1">
            {[5, 4, 3, 2, 1].map((n) => <div key={n} className="flex items-center gap-2 text-[12px] font-light text-[#b5a596]"><span className="w-2.5">{n}</span><span className="flex-1 h-1.5 rounded-[3px] bg-[#251d1b]" /></div>)}
          </div>
        </div>
        <div className="flex gap-2">
          {["ทั้งหมด", "มีข้อความ", "ยังไม่ตอบ"].map((t, i) => <span key={t} className="h-9 rounded-full text-[13px] flex items-center" style={{ padding: "0 14px", background: i === 0 ? "#e8c472" : "#251d1b", color: i === 0 ? "#1b130b" : "#d9c9b4", fontWeight: i === 0 ? 600 : 300 }}>{t}</span>)}
        </div>
        <div className={`${card} flex flex-col items-center text-center gap-1`} style={{ padding: "28px 16px" }}>
          <span className="font-semibold">ยังไม่มีรีวิว</span>
          <span className="text-[14px] font-light text-[#d9c9b4]">ลูกค้าจะรีวิวได้หลังจบนัดแรก</span>
        </div>
        <div className="text-[12px] font-light text-[#b5a596] text-center">รีวิวที่ไม่สุภาพหรือข้อมูลส่วนตัว แจ้งแอดมินให้ซ่อนได้</div>
      </main>
      <PtNav c={c} active="home" />
    </PtPage>
  );
}
