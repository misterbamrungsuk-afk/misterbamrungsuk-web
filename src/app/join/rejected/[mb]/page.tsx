import Link from "next/link";
import { canResume } from "@/lib/join/resume";
import { notFound } from "next/navigation";
import { lineAddUrl } from "@/lib/join/config";
import { extraOf, getByMb } from "@/lib/join/store";
import { BottomBar, C, Page, ctaStyle, Forbidden } from "../../_kyc/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "ต้องแก้ไขเอกสาร — Mister Bamrungsuk" };

const ITEMS: { key: string; label: string; onlyB?: boolean; doc?: "cert_doc" }[] = [
  { key: "id_card", label: "หน้าบัตรประชาชน" },
  { key: "id_copy", label: "สำเนาบัตรประชาชน (เซ็นรับรองสำเนา)" },
  { key: "selfie", label: "เซลฟีถือบัตร" },
  { key: "cert_doc", label: "ใบรับรองการนวด (สำหรับสาย B)", onlyB: true },
  { key: "bank", label: "บัญชีรับเงิน" },
];

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
      <div className="flex flex-col items-center px-4 pt-12 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ border: `1px solid ${C.red}`, color: C.pink }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 38, height: 38 }}><path d="M12 8v5M12 16h0" /><circle cx="12" cy="12" r="9" /></svg>
        </div>
        <h1 className="font-lux text-2xl font-semibold mt-4">ต้องแก้ไขเอกสาร</h1>
        <div className="text-sm leading-[1.6] mt-2" style={{ color: C.mut }}>
          {failed ? `เหลืออีกนิดเดียว! ส่งใหม่แค่ ${failed} รายการ ส่วนอื่นผ่านหมดแล้ว` : "ยังไม่มีรายการที่ต้องแก้ไข"}
        </div>
      </div>
      <div className="px-4 pt-6 flex flex-col gap-3">
        {items.map((i) => reason[i.key] ? (
          <div key={i.key} className="flex flex-col gap-1.5 p-4 rounded-2xl text-sm" style={{ border: `1px solid ${C.red}`, background: "rgba(224,36,60,.05)" }}>
            <div className="flex gap-3 items-center"><span style={{ color: C.pink }}>!</span><span className="grow">{i.label}</span><span className="text-xs" style={{ color: C.pink }}>ส่งใหม่</span></div>
            <div className="text-[13px] pl-[22px]" style={{ color: C.mut }}>{reason[i.key]}</div>
          </div>
        ) : (
          <div key={i.key} className="flex gap-3 items-center p-4 rounded-2xl text-sm" style={{ border: `1px solid ${C.ln}`, background: C.s1 }}>
            <span style={{ color: C.gold }}>✓</span><span className="grow">{i.label}</span><span className="text-xs" style={{ color: C.mut }}>ผ่าน</span>
          </div>
        ))}
      </div>
      <BottomBar>
        <Link href={`/join/kyc/${row.mb_code}${q}`} className="btn-red-lux font-lux" style={ctaStyle}>ถ่ายรูปใหม่</Link>
        <a href={lineAddUrl()} target="_blank" rel="noopener noreferrer" className="text-center text-[13px]" style={{ color: C.mut }}>สอบถามแอดมิน</a>
      </BottomBar>
    </Page>
  );
}
