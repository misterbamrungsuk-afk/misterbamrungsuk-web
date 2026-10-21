import { notFound } from "next/navigation";
import { Forbidden } from "../../../../_kyc/ui";
import { canResume } from "@/lib/join/resume";
import { ISSUER } from "@/lib/join/legal";
import { BRAND } from "@/lib/join/config";
import { fullName, getByMb } from "@/lib/join/store";
import { listWithdrawals } from "@/lib/bookings/day";
import { getMoney } from "@/lib/wallet/settings";
import { thaiBaht } from "@/lib/join/thai-baht";
import { SavePdfButton } from "../../../../receipt/[mb]/save-pdf";

// ใบเสร็จรับเงินค่าธรรมเนียมแพลตฟอร์มจากการถอนเงิน (A4 · ดาวน์โหลด PDF) — ออกเมื่อโอนสำเร็จ · ไม่ออก 50 ทวิ (ตามที่ตกลง 16 ต.ค.)
export const dynamic = "force-dynamic";
export const metadata = { title: "ใบเสร็จรับเงิน — Mister Bamrungsuk", robots: { index: false } };

const baht = (s: number) => (s / 100).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const thDate = (d: Date) => d.toLocaleDateString("th-TH-u-ca-buddhist", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
const words = (s: number) => { const b = Math.floor(s / 100), st = s % 100; return st ? `${thaiBaht(b).replace("ถ้วน", "")}${thaiBaht(st).replace("บาทถ้วน", "")}สตางค์` : thaiBaht(b); };

export default async function WithdrawReceiptPage({ params, searchParams }: { params: Promise<{ mb: string; wid: string }>; searchParams: Promise<{ t?: string }> }) {
  const { mb, wid } = await params;
  const { t } = await searchParams;
  if (!/^M[BS]-\d{7,}$/.test(mb) || !(await canResume(mb, t))) return <Forbidden />;
  const row = await getByMb(mb);
  if (!row) notFound();
  const w = (await listWithdrawals({ parttime_id: row.id }).catch(() => [])).find((x) => x.id === wid);
  if (!w || w.status !== "paid" || !w.fee_satang) notFound();
  const m = await getMoney();
  const pct = Math.round((w.fee_satang / w.amount_satang) * 1000) / 10 || m.feePct;
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  const no = `WR-${w.id.slice(0, 8).toUpperCase()}`;
  const th = "text-left font-normal text-[#6b5a50] py-1 pr-4 align-top whitespace-nowrap";

  return (
    <div className="min-h-dvh bg-[#e9e4dc] py-6 px-4" style={{ fontFamily: "var(--font-plex), Kanit, sans-serif" }}>
      <div className="mx-auto max-w-[210mm] flex justify-between items-center gap-3 mb-4 flex-wrap">
        <a href={`/join/profile/${mb}/docs${q}`} className="text-[13px] text-[#5a4a40] underline underline-offset-2">← กลับหน้าเอกสาร</a>
        <SavePdfButton targetId="receipt-sheet" fileName={`ใบเสร็จ-${no}`} />
      </div>
      <article id="receipt-sheet" className="mx-auto w-full max-w-[210mm] bg-white text-[#1d1414] shadow-[0_6px_30px_rgba(0,0,0,.18)] px-[14mm] py-[12mm] text-[13px] leading-relaxed">
        <header className="flex items-start justify-between gap-4 border-b-2 border-[#c9a24a] pb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt={BRAND.name} className="h-14 w-auto object-contain" />
            <div className="min-w-0 text-[11.5px] text-[#4a3a30] leading-snug">
              <div className="text-[14px] font-semibold text-[#1d1414]">{ISSUER.name}</div>
              <div>เลขประจำตัวผู้เสียภาษี {ISSUER.taxId} (สำนักงานใหญ่)</div>
              <div>{ISSUER.address}</div>
              <div>โทร {ISSUER.phone} · {ISSUER.email}</div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[20px] font-bold text-[#7e0a1e]">ใบเสร็จรับเงิน</div>
            <div className="text-[11px] text-[#6b5a50]">RECEIPT · ต้นฉบับ</div>
            <table className="mt-2 ml-auto text-[12px]"><tbody>
              <tr><th className={th}>เลขที่</th><td className="font-semibold">{no}</td></tr>
              <tr><th className={th}>วันที่ชำระ</th><td>{thDate(new Date(w.paid_at ?? w.created_at))}</td></tr>
              <tr><th className={th}>วันที่ออก</th><td>{thDate(new Date())}</td></tr>
            </tbody></table>
          </div>
        </header>
        <section className="mt-4 rounded-lg bg-[#f6f0e4]" style={{ padding: "10px 14px" }}>
          <div className="text-[11.5px] text-[#6b5a50]">ได้รับเงินจาก</div>
          <div className="font-semibold text-[14px]">{fullName(row)}{row.nickname ? ` (${row.nickname})` : ""}</div>
          <div className="text-[12px]">รหัส {row.mb_code}{row.address ? ` · ${row.address}` : ""}</div>
        </section>
        <table className="w-full border-collapse mt-5">
          <thead><tr className="border-t-2 border-b border-[#1d1414] text-[12.5px]"><th className="text-left py-2 pr-3 w-10">ลำดับ</th><th className="text-left py-2 pr-3">รายการ</th><th className="text-right py-2">จำนวนเงิน (บาท)</th></tr></thead>
          <tbody>
            <tr className="border-b border-[#ece4d5] align-top">
              <td className="py-2 pr-3">1</td>
              <td className="py-2 pr-3">ค่าธรรมเนียมการใช้แพลตฟอร์ม {pct}%<div className="text-[11.5px] text-[#6b5a50]">หักจากการถอนเงิน {baht(w.amount_satang)} บาท · โอนเข้าบัญชี {w.bank.bank} ••{w.bank.account.slice(-4)}</div></td>
              <td className="py-2 text-right tabular-nums">{baht(w.fee_satang)}</td>
            </tr>
            <tr><td colSpan={2} className="pt-3 font-semibold">รวมทั้งสิ้น</td><td className="pt-3 text-right font-bold text-[15px] tabular-nums">{baht(w.fee_satang)}</td></tr>
            <tr><td colSpan={3} className="pt-1 text-right text-[12px] text-[#4a3a30]">({words(w.fee_satang)})</td></tr>
          </tbody>
        </table>
        <section className="mt-5 text-[12px] text-[#4a3a30]">
          <div>ชำระโดยหักจากยอดถอนเงินในระบบ Mister Bamrungsuk · อ้างอิงคำขอถอน {w.id}</div>
        </section>
        <footer className="mt-10 flex justify-end">
          <div className="text-center text-[12px]"><div className="w-48 border-b border-[#1d1414] mb-1 h-8" /><div>ผู้รับเงิน · {ISSUER.name}</div><div className="text-[#6b5a50]">เอกสารออกโดยระบบอัตโนมัติ</div></div>
        </footer>
      </article>
    </div>
  );
}
