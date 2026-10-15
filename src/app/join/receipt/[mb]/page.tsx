import { notFound } from "next/navigation";
import { Forbidden } from "../../_kyc/ui";
import { canResume } from "@/lib/join/resume";
import { CONTROLLER } from "@/lib/join/legal";
import { BRAND, PACKAGES, feeBreakdown } from "@/lib/join/config";
import { extraOf, fullName, getByMb } from "@/lib/join/store";
import { SavePdfButton } from "./save-pdf";

// ใบเสร็จรับเงิน (A4 · ปุ่มดาวน์โหลดเป็นไฟล์ PDF) — ออกได้เมื่อทีมงานตรวจสลิปแล้ว (status = verified) · ก่อนนั้นแสดงสถานะรอตรวจ
// เลขที่ใบเสร็จผูกกับรหัสผู้สมัคร (RC-xxxxxxx) จึงไม่ซ้ำและออกซ้ำได้เลขเดิม
export const dynamic = "force-dynamic";
export const metadata = { title: "ใบเสร็จรับเงิน — Mister Bamrungsuk", robots: { index: false } };

const baht = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const thDate = (d: Date) => d.toLocaleDateString("th-TH-u-ca-buddhist", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
const DIGITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const POS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
/** จำนวนเต็มบาท → ตัวอักษรไทย (ไม่เกิน 999,999,999) */
function thaiBaht(n: number) {
  const read = (x: number): string => {
    if (x >= 1_000_000) return read(Math.floor(x / 1_000_000)) + "ล้าน" + (x % 1_000_000 ? read(x % 1_000_000) : "");
    const s = String(x).split("").reverse();
    return s.map((d, i) => {
      const v = +d;
      if (!v) return "";
      if (i === 0 && v === 1 && s.length > 1) return "เอ็ด";
      if (i === 1 && v === 1) return "สิบ";
      if (i === 1 && v === 2) return "ยี่สิบ";
      return DIGITS[v] + POS[i];
    }).reverse().join("");
  };
  return n === 0 ? "ศูนย์บาทถ้วน" : `${read(Math.round(n))}บาทถ้วน`;
}

export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const { mb } = await params;
  const { t } = await searchParams;
  if (!/^MB-\d{7,}$/.test(mb) || !(await canResume(mb, t))) return <Forbidden />;
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  const row = await getByMb(mb);
  if (!row) notFound();
  const x = extraOf(row);
  const fees = feeBreakdown(row.package, !!x.invite);
  const total = row.amount || fees.reduce((a, f) => a + f.amount, 0);
  const paid = row.status === "verified";
  const no = `RC-${mb.slice(3)}`;
  const th = "text-left font-normal text-[#6b5a50] py-1 pr-4 align-top whitespace-nowrap";

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
        <span className="flex gap-4 flex-wrap">
          <a href={`/join/done/${row.mb_code}${q}`} className="text-[13px] text-[#5a4a40] underline underline-offset-2">← กลับหน้าสมัครสำเร็จ</a>
          <a href={`/join/doc/${row.mb_code}${q}`} className="text-[13px] text-[#7e0a1e] underline underline-offset-2">ใบยืนยันการสมัคร ›</a>
        </span>
        {paid && <SavePdfButton targetId="receipt-sheet" fileName={`ใบเสร็จ-${row.mb_code}`} />}
      </div>

      {!paid ? (
        <div className="mx-auto max-w-[520px] bg-white rounded-2xl text-center text-[#1d1414] shadow-[0_6px_30px_rgba(0,0,0,.18)]" style={{ padding: "36px 24px" }}>
          <div className="text-[20px] font-semibold">{row.status === "pending_slip" ? "ใบเสร็จจะออกหลังทีมงานตรวจสลิป" : row.status === "refunded" ? "รายการนี้คืนเงินแล้ว" : "รายการนี้ไม่ได้รับการอนุมัติ"}</div>
          <p className="text-[14px] text-[#6b5a50] mt-2 mb-0">{row.status === "pending_slip" ? "ทีมงานตรวจสลิปภายใน 2 ชม. (09:00–22:00) · เมื่อตรวจแล้วกลับมาที่หน้านี้เพื่อพิมพ์หรือบันทึกใบเสร็จได้ทันที" : "ติดต่อทีมงานทาง LINE หากมีข้อสงสัย"}</p>
          <div className="mt-4 text-[13px] text-[#6b5a50]">รหัสผู้สมัคร <b className="text-[#7e0a1e] tracking-[1px]">{row.mb_code}</b></div>
        </div>
      ) : (
        <article id="receipt-sheet" className="doc-sheet mx-auto w-full max-w-[210mm] bg-white text-[#1d1414] shadow-[0_6px_30px_rgba(0,0,0,.18)] px-[14mm] py-[12mm] text-[13px] leading-relaxed">
          <header className="flex items-start justify-between gap-4 border-b-2 border-[#c9a24a] pb-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo.png" alt={BRAND.name} className="h-14 w-auto object-contain" />
              <div className="min-w-0 text-[11.5px] text-[#4a3a30] leading-snug">
                <div className="text-[14px] font-semibold text-[#1d1414]">{CONTROLLER.name}</div>
                <div>เลขประจำตัวผู้เสียภาษี {CONTROLLER.regNo} (สำนักงานใหญ่)</div>
                <div>{CONTROLLER.address}</div>
                <div>โทร {CONTROLLER.phone} · {CONTROLLER.email}</div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[20px] font-bold text-[#7e0a1e]">ใบเสร็จรับเงิน</div>
              <div className="text-[11px] text-[#6b5a50]">RECEIPT · ต้นฉบับ</div>
              <table className="mt-2 ml-auto text-[12px]"><tbody>
                <tr><th className={th}>เลขที่</th><td className="font-semibold">{no}</td></tr>
                <tr><th className={th}>วันที่ชำระ</th><td>{thDate(new Date(row.created_at))}</td></tr>
                <tr><th className={th}>วันที่ออก</th><td>{thDate(new Date())}</td></tr>
              </tbody></table>
            </div>
          </header>

          <section className="mt-4 rounded-lg bg-[#f6f0e4]" style={{ padding: "10px 14px" }}>
            <div className="text-[11.5px] text-[#6b5a50]">ได้รับเงินจาก</div>
            <div className="font-semibold text-[14px]">{fullName(row)}{row.nickname ? ` (${row.nickname})` : ""}</div>
            <div className="text-[12px]">รหัสผู้สมัคร {row.mb_code} · โทร {row.tel || "-"}{row.address ? ` · ${row.address}` : ""}</div>
          </section>

          <table className="w-full border-collapse mt-5">
            <thead><tr className="border-t-2 border-b border-[#1d1414] text-[12.5px]"><th className="text-left py-2 pr-3 w-10">ลำดับ</th><th className="text-left py-2 pr-3">รายการ</th><th className="text-right py-2">จำนวนเงิน (บาท)</th></tr></thead>
            <tbody>
              {fees.map((f, i) => (
                <tr key={f.name} className="border-b border-[#ece4d5] align-top">
                  <td className="py-2 pr-3">{i + 1}</td>
                  <td className="py-2 pr-3">{f.name}{f.note && <div className="text-[11.5px] text-[#6b5a50]">{f.note}</div>}{i === 0 && <div className="text-[11.5px] text-[#6b5a50]">{PACKAGES[row.package].name}</div>}</td>
                  <td className="py-2 text-right tabular-nums">{baht(f.amount)}</td>
                </tr>
              ))}
              <tr><td colSpan={2} className="pt-3 font-semibold">รวมทั้งสิ้น</td><td className="pt-3 text-right font-bold text-[15px] tabular-nums">{baht(total)}</td></tr>
              <tr><td colSpan={3} className="pt-1 text-right text-[12px] text-[#4a3a30]">({thaiBaht(total)})</td></tr>
            </tbody>
          </table>

          <div className="mt-4 text-[12px] text-[#4a3a30] flex flex-col gap-0.5">
            <div>ชำระโดย: โอนผ่าน QR พร้อมเพย์ · ตรวจสอบสลิปแล้ว</div>
            {x.invite && <div>สมัครผ่านลิงก์เชิญพิเศษ · ไม่เก็บค่าการันตี Branding</div>}
            {!x.invite && <div>ค่าการันตี Branding เป็นเงินประกัน คืนเมื่อครบ 1 ปีตามเงื่อนไขในสัญญา</div>}
          </div>

          <div className="grid grid-cols-2 gap-10 mt-14 text-center text-[12.5px] break-inside-avoid">
            <div><div className="border-b border-dotted border-[#6b5a50] h-10" /><div className="mt-1">ผู้รับเงิน</div><div className="text-[#6b5a50]">{CONTROLLER.name}</div></div>
            <div><div className="border-b border-dotted border-[#6b5a50] h-10" /><div className="mt-1">วันที่</div><div className="text-[#6b5a50]">........../........../..........</div></div>
          </div>
          <p className="text-[11px] text-[#6b5a50] mt-6 mb-0">เอกสารนี้ออกโดยระบบอัตโนมัติ · ใบเสร็จรับเงินไม่ใช่ใบกำกับภาษี</p>
        </article>
      )}
    </div>
  );
}
