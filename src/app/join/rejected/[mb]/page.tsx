import Link from "next/link";
import { canResume } from "@/lib/join/resume";
import { notFound } from "next/navigation";
import { extraOf, getByMb } from "@/lib/join/store";
import { BottomBar, Page, ctaStyle, Forbidden } from "../../_kyc/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "ต้องแก้ไขเอกสาร — Mister Bamrungsuk" };

const ITEMS: { key: string; label: string; onlyB?: boolean }[] = [
  { key: "id_card", label: "หน้าบัตรประชาชน" },
  { key: "id_copy", label: "สำเนาบัตรประชาชน (เซ็นรับรอง)" },
  { key: "selfie", label: "เซลฟีถือบัตร" },
  { key: "cert_doc", label: "ใบรับรองการนวด (สายนวด)", onlyB: true },
  { key: "bank", label: "บัญชีรับเงิน" },
];

// บอร์ด D5-KYCRejected "ต้องแก้ไขเอกสาร" — รายการผ่าน ✓ / รายการต้องส่งใหม่ (ป้ายแดง + เหตุผล) → ถ่ายรูปใหม่
export default async function RejectedPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const { mb } = await params;
  const { t } = await searchParams;
  // ข้อมูลส่วนตัว: ต้องมี cookie mb_resume หรือ ?t= ของรหัสนี้ (ตรวจก่อนค้นฐานข้อมูล ไม่บอกว่ารหัสมีจริงไหม)
  if (!/^MB-\d{7,}$/.test(mb) || !(await canResume(mb, t))) return <Forbidden />;
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  const row = await getByMb(mb);
  if (!row) notFound();
  const reason = extraOf(row).kyc_reason ?? {};
  const items = ITEMS.filter((i) => !i.onlyB || row.package === "B");
  // รายการที่แอดมินระบุแต่ไม่อยู่ในลิสต์มาตรฐาน ก็แสดงด้วย
  for (const k of Object.keys(reason)) if (!items.some((i) => i.key === k)) items.push({ key: k, label: k });
  const failed = items.filter((i) => reason[i.key]).length;

  return (
    <Page>
      <div className="flex flex-col items-center text-center" style={{ padding: "48px 20px 0" }}>
        <div className="w-20 h-20 rounded-full grid place-items-center" style={{ background: "rgba(138,15,30,.12)", color: "#ff8a9a" }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M12 8v5M12 16h0" /><circle cx="12" cy="12" r="9" /></svg>
        </div>
        <h1 className="font-semibold text-[24px] text-[#e8c472]" style={{ margin: "16px 0 0" }}>ต้องแก้ไขเอกสาร</h1>
        <p style={{ margin: "8px 0 0" }}>{failed ? `ส่งใหม่แค่ ${failed} รายการ ส่วนอื่นผ่านแล้ว` : "ยังไม่มีรายการที่ต้องแก้ไข"}</p>
      </div>
      <div className="flex flex-col gap-4" style={{ padding: "32px 20px 0" }}>
        {items.map((i) => reason[i.key] ? (
          <div key={i.key} className="flex flex-col gap-1.5 rounded-2xl bg-[#251d1b]" style={{ padding: "14px 18px" }}>
            <div className="flex gap-3 items-center">
              <span aria-hidden="true" className="shrink-0 w-6 h-6 rounded-full bg-[#d93a3a] text-white grid place-items-center text-[15px] font-bold leading-none">!</span>
              <span className="grow">{i.label}</span>
              <span className="shrink-0 rounded-full bg-[#d93a3a] text-white text-[14px] font-semibold" style={{ padding: "3px 12px", lineHeight: 1.5 }}>ส่งใหม่</span>
            </div>
            <div className="text-[14px]" style={{ paddingLeft: 36 }}>{reason[i.key]}</div>
          </div>
        ) : (
          <div key={i.key} className="flex gap-3 items-center rounded-2xl bg-[#251d1b]" style={{ padding: "14px 18px" }}>
            <span className="text-[#e8c472]">✓</span><span className="grow">{i.label}</span><span className="text-[13px] font-light">ผ่าน</span>
          </div>
        ))}
      </div>
      <BottomBar>
        <Link href={`/join/kyc/${row.mb_code}${q}`} style={ctaStyle} className="hover:text-[#1b130b]">ถ่ายรูปใหม่</Link>
      </BottomBar>
    </Page>
  );
}
