import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/market/store";
import { POLICY_PAGES, TBD, type PolicySlug } from "@/lib/market/config";
import { MarketHeader } from "../../products/market-ui";
import { MarketFooter } from "../../products/market-bits";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

// โครงนโยบายร้านค้า — ข้อที่เจ้าของยังไม่กำหนดแสดง [รอกำหนด]; ข้อความจริงแก้ได้ที่ /admin/market (แท็บ ตั้งค่า)
const OUTLINE: Record<PolicySlug, string[]> = {
  returns: [
    "สินค้าที่รับคืนได้: " + TBD,
    "ระยะเวลาแจ้งคืนหลังได้รับสินค้า: " + TBD,
    "สภาพสินค้าที่รับคืน (เช่น ยังไม่เปิดซีล): " + TBD,
    "สินค้าที่ไม่รับคืนด้วยเหตุผลด้านสุขอนามัย: " + TBD,
    "ช่องทางแจ้งคืน และผู้รับผิดชอบค่าส่งคืน: " + TBD,
    "ระยะเวลาคืนเงิน: " + TBD,
  ],
  shipping: [
    "ร้านค้าพาร์ทเนอร์จัดส่งเองหลังทีมงานยืนยันการชำระเงิน",
    "แพ็กมิดชิด ไม่ระบุชื่อสินค้าหน้ากล่อง ใบปะหน้าระบุเพียงชื่อผู้รับและผู้ส่ง",
    "ค่าจัดส่งและเงื่อนไขส่งฟรี: แสดงในตะกร้าก่อนชำระเงิน",
    "ระยะเวลาจัดส่งโดยประมาณ: " + TBD,
    "พื้นที่จัดส่ง: " + TBD,
    "กรณีพัสดุเสียหาย/สูญหาย: " + TBD,
  ],
  "privacy-shop": [
    "ข้อมูลที่เก็บ: ชื่อผู้รับ ที่อยู่จัดส่ง เบอร์โทรที่ยืนยันด้วย OTP และหลักฐานการโอน",
    "วัตถุประสงค์: จัดส่งสินค้า ยืนยันการชำระ แจ้งสถานะคำสั่งซื้อทาง SMS",
    "ร้านค้าเห็นเฉพาะข้อมูลที่จำเป็นต่อการจัดส่งรายการของร้านนั้น",
    "ระยะเวลาเก็บรักษาข้อมูล: " + TBD,
    "ช่องทางขอเข้าถึง/ลบข้อมูล (PDPA): " + TBD,
  ],
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = POLICY_PAGES[(await params).slug as PolicySlug];
  return { title: p ? `${p.title} · Mister Bamrungsuk` : "นโยบาย" };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug as PolicySlug;
  const meta = POLICY_PAGES[slug];
  if (!meta) notFound();
  const custom = (await getSettings())[meta.key].trim();
  return (
    <main className="mb-v7 mb-c min-h-dvh">
      <SiteHeader />
      <MarketHeader />
      <article className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-gold-500">POLICY</p>
        <h1 className="text-3xl font-semibold mt-1">{meta.title}</h1>
        <nav className="flex flex-wrap gap-2 mt-4">
          {(Object.keys(POLICY_PAGES) as PolicySlug[]).map((k) => <Link key={k} href={`/policy/${k}`} className={`chip h-8 px-3 text-xs ${k === slug ? "chip-red" : ""}`}>{POLICY_PAGES[k].title}</Link>)}
        </nav>
        <div className="glass rounded-3xl p-6 mt-6 leading-relaxed text-ink-200">
          {custom ? <div className="whitespace-pre-line">{custom}</div> : (
            <>
              <ul className="list-disc pl-5 flex flex-col gap-2">{OUTLINE[slug].map((l) => <li key={l}>{l}</li>)}</ul>
              <p className="text-xs text-ink-400 mt-5">ฉบับร่าง — ข้อที่ระบุ {TBD} รอเจ้าของร้านกำหนดรายละเอียด</p>
            </>
          )}
        </div>
      </article>
      <MarketFooter />
    </main>
  );
}
