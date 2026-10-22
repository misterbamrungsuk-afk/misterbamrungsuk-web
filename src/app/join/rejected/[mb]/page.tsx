import Link from "next/link";
import { canResume } from "@/lib/join/resume";
import { notFound } from "next/navigation";
import { extraOf, getByMb } from "@/lib/join/store";
import { FIX_ITEMS, fixHref } from "@/lib/join/fixes";
import { BottomBar, Page, ctaStyle, Forbidden } from "../../_kyc/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "ต้องแก้ไขเอกสาร — Mister Bamrungsuk" };

// บอร์ด D5-KYCRejected "ต้องแก้ไขเอกสาร" — รายการที่ทีมงานตีกลับ (ป้ายแดง + เหตุผล + ปุ่มแก้ทีละรายการ) · แก้ครบ → รอทีมงานตรวจ
export default async function RejectedPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const { mb } = await params;
  const { t } = await searchParams;
  // ข้อมูลส่วนตัว: ต้องมี cookie mb_resume หรือ ?t= ของรหัสนี้ (ตรวจก่อนค้นฐานข้อมูล ไม่บอกว่ารหัสมีจริงไหม)
  if (!/^MB[MT]?-\d{7,}$/.test(mb) || !(await canResume(mb, t))) return <Forbidden />;
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  const row = await getByMb(mb);
  if (!row) notFound();
  const x = extraOf(row);
  const reason = x.kyc_status === "rejected" ? x.kyc_reason ?? {} : {};
  const items = FIX_ITEMS.filter((i) => reason[i.key]);
  // รายการที่แอดมินระบุแต่ไม่อยู่ในลิสต์มาตรฐาน ก็แสดงด้วย (แก้ผ่านโปรไฟล์)
  const extra = Object.keys(reason).filter((k) => reason[k] && !FIX_ITEMS.some((i) => i.key === k));
  const n = items.length + extra.length;

  if (!n) return (
    <Page>
      <div className="flex flex-col items-center text-center" style={{ padding: "64px 20px 0" }}>
        <div className="w-20 h-20 rounded-full grid place-items-center text-[#e8c472] text-[34px]" style={{ background: "rgba(232,196,114,.14)" }} aria-hidden="true">✓</div>
        {/* "ส่งแก้ไขครบแล้ว" เฉพาะคนที่เคยถูกตีกลับแล้วแก้ครบจริง · ไม่เคยถูกขอให้แก้ = บอกตามสถานะ */}
        <h1 className="font-semibold text-[24px] text-[#e8c472]" style={{ margin: "16px 0 0" }}>{x.fixes_done_at && x.kyc_status !== "approved" ? "ส่งแก้ไขครบแล้ว" : "ไม่มีรายการที่ต้องแก้ไข"}</h1>
        <p style={{ margin: "8px 0 0" }}>{x.kyc_status === "approved" ? "เอกสารผ่านการตรวจจากทีมงานแล้ว" : x.fixes_done_at || x.kyc_status === "submitted" ? "ทีมงานจะตรวจอีกครั้งภายใน 24 ชม. และแจ้งผลทาง LINE" : "ทีมงานยังไม่ได้ขอให้แก้ไขเอกสารใด ๆ · กรอกใบสมัครต่อได้ที่โปรไฟล์ของฉัน"}</p>
      </div>
      <BottomBar><Link href={`/join/profile/${mb}${q}`} style={ctaStyle} className="hover:text-[#1b130b]">ไปที่โปรไฟล์ของฉัน</Link></BottomBar>
    </Page>
  );

  return (
    <Page>
      <div className="flex flex-col items-center text-center" style={{ padding: "48px 20px 0" }}>
        <div className="w-20 h-20 rounded-full grid place-items-center" style={{ background: "rgba(138,15,30,.12)", color: "#ff8a9a" }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M12 8v5M12 16h0" /><circle cx="12" cy="12" r="9" /></svg>
        </div>
        <h1 className="font-semibold text-[24px] text-[#e8c472]" style={{ margin: "16px 0 0" }}>ต้องแก้ไขเอกสาร</h1>
        <p style={{ margin: "8px 0 0" }}>ทีมงานขอให้แก้ {n} รายการ ส่วนอื่นผ่านแล้ว</p>
      </div>
      <div className="flex flex-col gap-4 md:grid md:grid-cols-2" style={{ padding: "32px 20px 0" }}>
        {items.map((i) => (
          <div key={i.key} className="flex flex-col gap-2 rounded-2xl bg-[#251d1b]" style={{ padding: "14px 18px" }}>
            <div className="flex gap-3 items-center">
              <span aria-hidden="true" className="shrink-0 w-6 h-6 rounded-full bg-[#d93a3a] text-white grid place-items-center text-[15px] font-bold leading-none">!</span>
              <span className="grow font-semibold">{i.label}</span>
            </div>
            <div className="text-[14px] text-[#d9c9b4]" style={{ paddingLeft: 36 }}>{reason[i.key]}</div>
            <Link href={fixHref(i.go, mb, t)} className="self-end min-h-11 rounded-full bg-[#d93a3a] text-white text-[14px] font-semibold grid place-items-center hover:text-white" style={{ padding: "0 18px" }}>แก้ไขรายการนี้ ›</Link>
          </div>
        ))}
        {extra.map((k) => (
          <div key={k} className="flex flex-col gap-1.5 rounded-2xl bg-[#251d1b]" style={{ padding: "14px 18px" }}>
            <span className="font-semibold">หมายเหตุจากทีมงาน</span>
            <div className="text-[14px] text-[#d9c9b4]">{reason[k]}</div>
          </div>
        ))}
      </div>
      <BottomBar>
        {items[0] && <Link href={fixHref(items[0].go, mb, t)} style={ctaStyle} className="hover:text-[#1b130b]">เริ่มแก้รายการแรก</Link>}
        <Link href={`/join/profile/${mb}${q}`} className="text-center text-[14px] text-[#e8c472] font-light">กลับโปรไฟล์ของฉัน</Link>
      </BottomBar>
    </Page>
  );
}
