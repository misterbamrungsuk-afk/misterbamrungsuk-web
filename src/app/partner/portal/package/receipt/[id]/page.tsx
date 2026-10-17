import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentPartner } from "@/lib/partner/auth";
import { PARTNER_PACKAGES, baht } from "@/lib/partner/config";
import { listPurchases } from "@/lib/partner/portal";
import { ISSUER } from "@/lib/join/legal";
import { SavePdfButton } from "@/app/join/receipt/[mb]/save-pdf";

export const dynamic = "force-dynamic";
export const metadata = { title: "ใบเสร็จแผนโปรโมท · พาร์ทเนอร์", robots: { index: false } };
const d = (s: string | null) => (s ? new Date(`${s.slice(0, 10)}T00:00:00+07:00`).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" }) : "—");

// ใบแจ้งหนี้ / ใบเสร็จค่าแผนโปรโมท (ชำระแล้ว = ใบเสร็จรับเงิน · รอตรวจ = ใบแจ้งหนี้) — บันทึก PDF ได้ แบบเดียวกับใบเสร็จการจอง
export default async function PartnerReceipt({ params }: { params: Promise<{ id: string }> }) {
  const p = await currentPartner();
  if (!p) redirect("/partner/login");
  const { id } = await params;
  const x = (await listPurchases(p.id).catch(() => [])).find((r) => r.id === id);
  if (!x) notFound();
  const paid = x.status === "paid";
  const title = paid ? "ใบเสร็จรับเงิน" : "ใบแจ้งหนี้";
  const no = paid ? x.invoice_no.replace(/^PI-/, "RC-") : x.invoice_no;
  return (
    <div className="py-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Link href="/partner/portal/package#invoices" aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full border border-ink-600 grid place-items-center">‹</Link>
        <h1 className="m-0 text-[20px] font-semibold">{title} {no}</h1>
      </div>
      <div id="receipt-doc" className="rounded-[18px] flex flex-col gap-2.5 max-w-[640px]" style={{ background: "#f3ead9", color: "#2a1d17", padding: 18 }}>
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0"><div className="font-semibold text-[16px]" style={{ color: "#9a6f1e" }}>Mister Bamrungsuk</div><div className="text-[12px]" style={{ color: "#6b5a52" }}>{ISSUER.name} · เลขผู้เสียภาษี {ISSUER.taxId}</div></div>
          <div className="text-right text-[12px] shrink-0">{title}<br /><b>{no}</b></div>
        </div>
        <div className="text-[12px] pt-2" style={{ color: "#6b5a52", borderTop: "1px dashed #c9b8a6" }}>ผู้ชำระ: {p.business_name} · {p.contact_name} · {p.email}</div>
        <div className="flex justify-between gap-3 text-[13px]"><span>แผนโปรโมทพาร์ทเนอร์ {PARTNER_PACKAGES[x.package]?.label ?? x.package}{x.starts_at ? ` (${d(x.starts_at)} – ${d(x.ends_at)})` : ""}</span><span className="tabular-nums shrink-0">฿{baht(x.amount)}.00</span></div>
        <div className="flex justify-between pt-2 font-bold text-[18px]" style={{ color: "#9a6f1e", borderTop: "1px solid #c9b8a6" }}><span>{paid ? "รวมทั้งสิ้น" : "ยอดที่ต้องชำระ"}</span><span className="tabular-nums">฿{baht(x.amount)}.00</span></div>
        <div className="text-[12px]" style={{ color: "#6b5a52" }}>
          {paid ? `ชำระโดยโอนเงิน (QR พร้อมเพย์) · ตรวจสลิปแล้ว ${x.decided_at ? new Date(x.decided_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }) : ""}` : x.status === "pending" ? "รอทีมงานตรวจสลิป" : "สลิปไม่ผ่าน — กรุณาชำระใหม่"} · ออกเมื่อ {new Date(x.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" })}
        </div>
        <div className="text-[12px]" style={{ color: "#6b5d55" }}>{ISSUER.address} · {ISSUER.phone}</div>
      </div>
      <div className="max-w-[640px]"><SavePdfButton targetId="receipt-doc" fileName={`${title}-${no}`} /></div>
    </div>
  );
}
