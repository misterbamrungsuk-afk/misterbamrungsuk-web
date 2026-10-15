import Link from "next/link";
import { notFound } from "next/navigation";
import { CONTRACT, PACKAGES, feeBreakdown, lineAddUrl } from "@/lib/join/config";
import { extraOf, getByMb } from "@/lib/join/store";
import { TRAINING, TRAINING_SESSIONS } from "@/lib/join/training";
import { C, Page } from "../../_kyc/ui";
import { ContractAccept, CopyButton } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "สมัครสำเร็จ — Mister Bamrungsuk" };

const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;

export default async function DonePage({ params }: { params: Promise<{ mb: string }> }) {
  const { mb } = await params;
  const row = /^MB-\d{7,}$/.test(mb) ? await getByMb(mb) : null;
  if (!row) notFound();

  const x = extraOf(row);
  const kyc = x.kyc_status ?? "none";
  const fees = feeBreakdown(row.package);
  const total = fees.reduce((a, f) => a + f.amount, 0);
  const group = x.cohort ? `กลุ่ม ${x.cohort}` : "รอจัดกลุ่ม";
  const paid = row.status === "verified" ? "ชำระเงินแล้ว" : "ชำระเงินแล้ว (รอตรวจสลิป)";
  const sub =
    kyc === "approved" ? `${paid} · ยืนยันตัวตนผ่านแล้ว`
    : kyc === "submitted" ? `${paid}และยืนยันตัวตนเรียบร้อย · รอทีมงานตรวจสอบ`
    : kyc === "rejected" ? `${paid} · เอกสารยืนยันตัวตนต้องแก้ไข`
    : `${paid} · ยังไม่ได้ยืนยันตัวตน`;
  const info = [
    ["วันอบรม", TRAINING.datesLong],
    ["สถานที่", TRAINING.venue],
    ["จำนวนรอบ", `${TRAINING_SESSIONS.length} รอบ · เช็กชื่อทุกรอบ`],
    ["เปิดให้บริการ", TRAINING.openService],
  ];

  return (
    <Page padBottom={false}>
      <div className="px-4 pt-6 flex flex-col gap-4">
        <div className="text-center">
          <div className="text-[11px] tracking-[2.5px]" style={{ color: C.gold }}>ยินดีต้อนรับ Part-Time ใหม่</div>
          <h1 className="font-lux font-semibold text-[26px] mt-2.5" style={{ color: C.gold }}>สมัครสำเร็จ</h1>
          <p className="mt-2 text-[13px]" style={{ color: "#d3c7bc" }}>{sub}</p>
          <p className="mt-1 text-[13px]" style={{ color: C.mut }}>ยินดีต้อนรับสู่ Mister Bamrungsuk คุณ{row.nickname || row.first_name}</p>
        </div>

        {kyc === "rejected" && (
          <Link href={`/join/rejected/${row.mb_code}`} className="rounded-2xl p-4 flex items-center gap-3 text-sm"
            style={{ border: `1px solid ${C.red}`, background: "rgba(224,36,60,.08)", color: C.tx }}>
            <span className="text-lg font-bold" style={{ color: C.pink }}>!</span>
            <span className="flex-1">เอกสารยืนยันตัวตนไม่ผ่าน — แตะเพื่อดูรายการที่ต้องส่งใหม่</span>
            <span style={{ color: C.pink }}>›</span>
          </Link>
        )}
        {kyc === "none" && (
          <Link href={`/join/kyc/${row.mb_code}`} className="rounded-2xl p-4 flex items-center gap-3 text-sm" style={{ border: `1px solid ${C.gold}`, background: "rgba(212,175,55,.05)", color: C.tx }}>
            <span className="flex-1">ยืนยันตัวตนและบัญชีรับเงินให้เสร็จ (ขั้นที่ 4–5)</span><span style={{ color: C.goldL }}>›</span>
          </Link>
        )}

        <div className="rounded-[18px] p-4 flex flex-col gap-3" style={{ border: "1px solid rgba(212,175,55,.55)", background: "linear-gradient(150deg,#3a2614,#241717 55%,#2a0f15)" }}>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: C.goldL }}>รหัส Part-Time ของคุณ</span>
            <span className="text-[11px] px-2.5 py-[3px] rounded-full" style={{ border: `1px solid ${C.gold}`, color: C.gold }}>{row.package === "B" ? "สายนวด" : "สายความสามารถพิเศษ"}</span>
          </div>
          <div className="font-lux font-semibold text-[36px] tracking-[3px]">{row.mb_code}</div>
          <div className="text-xs" style={{ color: C.mut }}>เก็บรหัสนี้ไว้ ใช้เช็กชื่อตอนอบรมและยืนยันตัวตนกับทีมงาน</div>
          <CopyButton code={row.mb_code} />
        </div>

        <a href={lineAddUrl()} target="_blank" rel="noopener noreferrer" className="font-lux min-h-[52px] rounded-[14px] flex items-center justify-center gap-2.5 text-[15px]" style={{ background: "#06c755", color: "#fff" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 4C7 4 3 7.2 3 11c0 3.4 3 6.2 7.2 6.9L10 21l3.6-3.1C18 17.4 21 14.5 21 11c0-3.8-4-7-9-7z" /></svg>
          เข้ากลุ่ม LINE กลุ่มอบรม
        </a>

        <div className="rounded-2xl p-4 flex flex-col gap-3 min-w-0" style={{ background: C.s1, border: `1px solid ${C.ln}` }}>
          <div className="font-lux font-semibold text-[15px]" style={{ color: C.gold }}>กลุ่มอบรมของคุณ · {group}</div>
          {info.map(([n, v]) => (
            <div key={n} className="flex justify-between items-baseline gap-4 text-[13px] min-w-0">
              <span className="whitespace-nowrap shrink-0" style={{ color: C.mut }}>{n}</span><span className="text-right min-w-0">{v}</span>
            </div>
          ))}
          <Link href={`/join/training/${row.mb_code}`} className="h-12 rounded-[14px] grid place-items-center text-sm font-semibold" style={{ border: `1px solid ${C.ln}`, background: C.s1, color: C.goldL }}>ดูตารางอบรม</Link>
        </div>

        <div className="text-xs leading-relaxed text-center" style={{ color: C.mut }}>
          {PACKAGES[row.package].name}: {fees.map((f) => `${f.name} ${baht(f.amount)}`).join(" + ")} = {baht(total)} · เงินประกัน Refundable – คืนเมื่อครบ 1 ปี หากไม่ผิดกฎ
        </div>

        <div className="rounded-2xl p-4 flex flex-col gap-3 min-w-0" style={{ background: C.s1, border: `1px solid ${C.ln}` }}>
          <div className="font-lux font-semibold text-[15px]" style={{ color: C.gold }}>เอกสารการสมัคร</div>
          <p className="text-[13px] leading-relaxed" style={{ color: C.mut }}>ใบยืนยันการสมัครพร้อมรหัส {row.mb_code} รายละเอียดสายงาน ยอดชำระ และกลุ่มอบรม — บันทึกเป็น PDF หรือพิมพ์เก็บไว้ได้</p>
          <a href={`/join/doc/${row.mb_code}`} target="_blank" rel="noopener" className="btn-gold-lux h-12 rounded-[14px] grid place-items-center text-sm font-semibold">ดาวน์โหลดใบยืนยันการสมัคร (PDF)</a>
        </div>

        <section className="rounded-2xl p-4 mt-2" style={{ background: C.s1, border: `1px solid ${C.ln}` }}>
          <p className="font-lux font-semibold" style={{ color: C.gold }}>สัญญาการเข้าร่วมโครงการ</p>
          <div className="mt-3 max-h-72 overflow-y-auto pr-1 space-y-3 text-sm leading-relaxed" style={{ color: C.mut }}>
            {CONTRACT.map((c) => <div key={c.h}><p className="font-medium" style={{ color: C.tx }}>{c.h}</p><p>{c.p}</p></div>)}
          </div>
          <ContractAccept mb={row.mb_code} acceptedAt={row.contract_accepted_at} />
        </section>
      </div>
    </Page>
  );
}
