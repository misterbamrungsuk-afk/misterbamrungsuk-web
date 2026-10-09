import { notFound } from "next/navigation";
import { BRAND, COHORTS, GUARANTEE_REFUND_NOTE, PACKAGES, TERMS_SUMMARY, feeBreakdown } from "@/lib/join/config";
import { extraOf, fullName, getByMb } from "@/lib/join/store";
import { TRAINING } from "@/lib/join/training";
import { PrintButton } from "./print-button";

// ใบยืนยันการสมัคร (A4 พิมพ์/บันทึก PDF) — เข้าถึงแบบเดียวกับหน้า done (MB ใน URL)
export const dynamic = "force-dynamic";
export const metadata = { title: "ใบยืนยันการสมัคร — Mister Bamrungsuk", robots: { index: false } };

const baht = (n: number) => `${n.toLocaleString("th-TH")} บาท`;
const thDate = (d: Date) => d.toLocaleDateString("th-TH-u-ca-buddhist", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });

const KYC_TEXT = { none: "ยังไม่ได้ยืนยันตัวตน", submitted: "ส่งเอกสารแล้ว · รอตรวจสอบ", approved: "ยืนยันตัวตนผ่านแล้ว", rejected: "เอกสารต้องแก้ไข" } as const;
const PAY_TEXT = { pending_slip: "ชำระแล้ว · รอตรวจสลิป", verified: "ชำระเงินแล้ว (ตรวจสอบแล้ว)", rejected: "ไม่อนุมัติ", refunded: "คืนเงินแล้ว" } as const;

export default async function DocPage({ params }: { params: Promise<{ mb: string }> }) {
  const { mb } = await params;
  const row = /^MB-\d{7,}$/.test(mb) ? await getByMb(mb) : null;
  if (!row) notFound();

  const x = extraOf(row);
  const fees = feeBreakdown(row.package);
  const total = fees.reduce((a, f) => a + f.amount, 0);
  const cohort = x.cohort ? COHORTS.find((c) => c.key === x.cohort) : null;
  const group = cohort ? `${cohort.name} · ${cohort.date}` : x.cohort ? `กลุ่ม ${x.cohort}` : "รอจัดกลุ่ม (แจ้งทาง LINE)";
  const terms = TERMS_SUMMARY.length ? TERMS_SUMMARY : [GUARANTEE_REFUND_NOTE];

  const info: [string, string][] = [
    ["ชื่อ-นามสกุล", fullName(row)],
    ["ชื่อเล่น", row.nickname || "-"],
    ["เบอร์โทร", row.tel || "-"],
    ["อีเมล", row.email || "-"],
    ["วันที่สมัคร", thDate(new Date(row.created_at))],
  ];
  const status: [string, string][] = [
    ["สถานะการชำระเงิน", PAY_TEXT[row.status] ?? row.status],
    ["สถานะยืนยันตัวตน (KYC)", KYC_TEXT[x.kyc_status ?? "none"]],
    ["กลุ่มอบรม", group],
    ["วันอบรม", TRAINING.datesLong],
    ["สถานที่อบรม", TRAINING.venue],
    ["เปิดให้บริการ", TRAINING.openService],
  ];

  const th = "text-left font-normal text-[#6b5a50] py-1.5 pr-4 align-top whitespace-nowrap w-[170px]";
  const td = "py-1.5 align-top text-[#1d1414]";
  const h2 = "text-[13px] font-semibold tracking-[1px] text-[#8a6a1f] border-b border-[#e6d8b8] pb-1 mb-2 mt-5";

  return (
    <div className="doc-root min-h-dvh bg-[#e9e4dc] py-6 px-4" style={{ fontFamily: "var(--font-plex), Kanit, sans-serif" }}>
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: #fff !important; }
          .doc-root { background: #fff !important; padding: 0 !important; min-height: 0 !important; }
          .doc-sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; min-height: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print mx-auto max-w-[210mm] flex justify-between items-center gap-3 mb-4 flex-wrap">
        <a href={`/join/done/${row.mb_code}`} className="text-[13px] text-[#5a4a40] underline underline-offset-2">← กลับหน้าสมัครสำเร็จ</a>
        <PrintButton />
      </div>

      <article className="doc-sheet mx-auto w-full max-w-[210mm] min-h-[297mm] bg-white text-[#1d1414] shadow-[0_6px_30px_rgba(0,0,0,.18)] px-[14mm] py-[12mm] text-[13px] leading-relaxed">
        <header className="flex items-center justify-between gap-4 border-b-2 border-[#c9a24a] pb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt={BRAND.name} className="h-14 w-auto object-contain" />
            <div className="min-w-0">
              <h1 className="text-[18px] font-semibold leading-tight">ใบยืนยันการสมัคร Part-Time · {BRAND.name}</h1>
              <div className="text-[11.5px] text-[#6b5a50]">{BRAND.domain}</div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[11px] text-[#6b5a50]">รหัสผู้สมัคร</div>
            <div className="text-[20px] font-bold tracking-[2px] text-[#7e0a1e]">{row.mb_code}</div>
            <div className="text-[11px] text-[#6b5a50]">ออกเอกสาร {thDate(new Date())}</div>
          </div>
        </header>

        <h2 className={h2}>ข้อมูลผู้สมัคร</h2>
        <table className="w-full border-collapse"><tbody>
          {info.map(([k, v]) => <tr key={k}><th className={th}>{k}</th><td className={td}>{v}</td></tr>)}
        </tbody></table>

        <h2 className={h2}>แพ็กเกจและค่าใช้จ่าย</h2>
        <div className="font-semibold mb-1">{PACKAGES[row.package].name} <span className="font-normal text-[#6b5a50]">(แพ็กเกจ {row.package})</span></div>
        <table className="w-full border-collapse">
          <tbody>
            {fees.map((f) => (
              <tr key={f.name} className="border-b border-[#efe7d6]">
                <td className="py-1.5 pr-4">{f.name}{f.note && <div className="text-[11.5px] text-[#6b5a50]">{f.note}</div>}</td>
                <td className="py-1.5 text-right whitespace-nowrap align-top">{baht(f.amount)}</td>
              </tr>
            ))}
            <tr>
              <td className="pt-2 font-semibold">รวมทั้งสิ้น</td>
              <td className="pt-2 text-right font-bold text-[15px] whitespace-nowrap">{baht(total)}</td>
            </tr>
          </tbody>
        </table>

        <h2 className={h2}>สถานะและการอบรม</h2>
        <table className="w-full border-collapse"><tbody>
          {status.map(([k, v]) => <tr key={k}><th className={th}>{k}</th><td className={td}>{v}</td></tr>)}
        </tbody></table>

        <h2 className={h2}>สรุปเงื่อนไขสำคัญ</h2>
        <ol className="m-0 pl-5 list-decimal flex flex-col gap-0.5 text-[12.5px]">
          {terms.map((t) => <li key={t}>{t}</li>)}
        </ol>
        <p className="text-[11.5px] text-[#6b5a50] mt-2">เอกสารนี้ออกโดยระบบเพื่อยืนยันการสมัคร ไม่ใช่ใบกำกับภาษี · รายละเอียดฉบับเต็มดูได้ที่หน้าข้อกำหนดและสัญญาการเข้าร่วมโครงการ</p>

        <div className="grid grid-cols-2 gap-10 mt-12 text-center text-[12.5px] break-inside-avoid">
          {["ผู้สมัคร", "เจ้าหน้าที่"].map((r) => (
            <div key={r}>
              <div className="border-b border-dotted border-[#6b5a50] h-10" />
              <div className="mt-1">ลงชื่อ {r}</div>
              <div className="text-[#6b5a50]">( {r === "ผู้สมัคร" ? fullName(row) : "........................................"} )</div>
              <div className="text-[#6b5a50] mt-1">วันที่ ......../......../........</div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
