import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canResume } from "@/lib/join/resume";
import { FEE_NOTE, PACKAGES, lineAddUrl, ptLineGroup } from "@/lib/join/config";
import { extraOf, getByMb } from "@/lib/join/store";
import { TRAINING, sessionsLabel } from "@/lib/join/training";
import { Forbidden } from "../../_kyc/ui";
import { CopyButton } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "ส่งใบสมัครเรียบร้อย — Mister Bamrungsuk" };

const baht = (n: number) => "฿" + n.toLocaleString("en-US");

// บอร์ด P-Done "ส่งใบสมัครเรียบร้อย" — รหัส + คัดลอก · เข้ากลุ่ม LINE · กลุ่มอบรม + ตารางอบรม · สรุปยอด
export default async function DonePage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const { mb } = await params;
  const { t } = await searchParams;
  // ข้อมูลส่วนตัว: ต้องมี cookie mb_resume หรือ ?t= ของรหัสนี้ (ตรวจก่อนค้นฐานข้อมูล ไม่บอกว่ารหัสมีจริงไหม)
  if (!/^M[BS]-\d{7,}$/.test(mb) || !(await canResume(mb, t))) return <Forbidden />;
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  const row = await getByMb(mb);
  if (!row) notFound();
  const x = extraOf(row);
  // ยังทำขั้นก่อนหน้าไม่ครบ → พากลับไปขั้นที่ค้าง
  if ((x.kyc_status ?? "none") === "none") redirect(`/join/profile/${mb}${q}`);
  if (!row.contract_accepted_at) redirect(`/join/contract/${mb}${q}`);

  const P = PACKAGES[row.package];
  const lg = ptLineGroup(row, x);
  const group = x.cohort ? `กลุ่ม ${x.cohort}` : TRAINING.group;
  const info: [string, string][] = [["วันอบรม", TRAINING.window], ["สถานที่", TRAINING.venue], ["จำนวนรอบ", `${sessionsLabel(row.package)} · ทีมงานเช็กชื่อที่หน้างาน`], ["เปิดให้บริการ", TRAINING.openService]];
  const fee = `${x.invite ? "สมัครผ่านลิงก์เชิญ · " : ""}${row.package === "B" ? "เพื่อนกินเที่ยว (สำหรับผู้มีความสามารถด้านการนวด)" : "เพื่อนกินเที่ยว (ตามความสามารถพิเศษ)"}: ${(x.invite || x.group === "tom") && !row.amount ? (x.invite ? "ไม่มีค่าสมัคร · ระดับ TOP" : "ทอมหล่อ · ไม่มีค่าสมัคร") : `ค่าสมัคร (รวมค่าอบรม) ${baht(row.amount || P.price)} · ${FEE_NOTE}`}`;

  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9", lineHeight: "normal" }}>
      <div className="mb-panel mx-auto max-w-[720px] flex flex-col gap-4" style={{ padding: "24px 16px 32px" }}>
        <div className="text-center">
          <div className="text-[12px] tracking-[2.5px] text-[#e8c472] font-light">ยินดีต้อนรับ Part-Time ใหม่</div>
          <h1 className="font-semibold text-[26px] text-[#e8c472]" style={{ margin: "8px 0 0" }}>ส่งใบสมัครเรียบร้อย</h1>
          <p className="text-[13px] text-[#d9c9b4] font-light" style={{ margin: "8px 0 0" }}>{row.status === "verified" && x.kyc_status === "approved" ? "ชำระเงินและยืนยันตัวตนเรียบร้อย" : "ได้รับข้อมูลแล้ว · รอทีมงานตรวจ"}</p>
          <p className="text-[13px] text-[#d9c9b4] font-light" style={{ margin: "4px 0 0" }}>{`ยินดีต้อนรับสู่ Mister Bamrungsuk คุณ${row.nickname}`}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:items-start">
          <div className="flex flex-col gap-3 rounded-[18px]" style={{ padding: 16, border: "1px solid rgba(212,175,55,.55)", background: "linear-gradient(150deg,#3a2614,#211a18 55%,#2a0f15)" }}>
            <div className="flex justify-between items-center"><span className="text-[12px] text-[#e8c472] font-light">รหัส Part-Time ของคุณ</span><span className="text-[12px] rounded-full border border-[#e8c472] text-[#e8c472] font-light" style={{ padding: "3px 10px" }}>{row.package === "B" ? "สายนวด" : "สายกินเที่ยว"}</span></div>
            <div className="font-semibold text-[36px] tracking-[3px] text-[#f3ead9]">{row.mb_code}</div>
            <div className="text-[12px] font-light text-[#d9c9b4]">เก็บรหัสนี้ไว้ ใช้เช็กชื่อตอนอบรมและยืนยันตัวตนกับทีมงาน</div>
            <CopyButton code={row.mb_code} />
          </div>
          <div className="flex flex-col gap-4">
            <a href={lg?.url ?? lineAddUrl()} data-line-group={lg ? (x.group === "tom" ? "tom" : "man") : undefined} target="_blank" rel="noopener" className="min-h-[52px] rounded-[14px] bg-[#06c755] text-white text-[15px] flex items-center justify-center gap-[10px] hover:text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 4C7 4 3 7.2 3 11c0 3.4 3 6.2 7.2 6.9L10 21l3.6-3.1C18 17.4 21 14.5 21 11c0-3.8-4-7-9-7z" /></svg>{lg?.label ?? "ติดต่อทีมงานทาง LINE"}
            </a>
            <div className="flex flex-col gap-3 rounded-2xl bg-[#211a18] border border-[rgba(243,234,217,0.07)]" style={{ padding: 16 }}>
              <div className="font-semibold text-[15px] text-[#e8c472]">{`กลุ่มอบรมของคุณ · ${group}`}</div>
              {info.map(([n, v]) => <div key={n} className="flex justify-between items-baseline gap-4 text-[13px] min-w-0 font-light"><span className="text-[#d9c9b4] whitespace-nowrap shrink-0">{n}</span><span className="text-right min-w-0">{v}</span></div>)}
              <Link href={`/join/training/${row.mb_code}${q}`} className="h-12 rounded-[14px] border border-[rgba(243,234,217,0.07)] bg-[#211a18] text-[#e8c472] text-[14px] font-semibold grid place-items-center hover:text-[#e8c472]">ดูตารางอบรม</Link>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <a href={`/join/receipt/${row.mb_code}${q}`} className="min-h-12 rounded-[14px] bg-[#211a18] text-[#e8c472] text-[14px] font-semibold grid place-items-center text-center px-2 hover:text-[#e8c472]" style={{ border: "1px solid rgba(243,234,217,0.07)" }}>{row.status === "verified" ? "ใบเสร็จรับเงิน (PDF)" : "ใบแจ้งหนี้ (PDF)"}</a>
          <a href={`/join/doc/${row.mb_code}${q}`} className="min-h-12 rounded-[14px] bg-[#211a18] text-[#e8c472] text-[14px] font-semibold grid place-items-center text-center px-2 hover:text-[#e8c472]" style={{ border: "1px solid rgba(243,234,217,0.07)" }}>ใบยืนยันการสมัคร (PDF)</a>
        </div>
        <Link href={`/join/profile/${row.mb_code}${q}`} className="min-h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold text-[15px] grid place-items-center hover:text-[#1b130b]">ไปที่โปรไฟล์ของฉัน</Link>
        <div className="text-[12px] leading-[1.6] text-center font-light text-[#d9c9b4]">{fee}</div>
      </div>
    </div>
  );
}
