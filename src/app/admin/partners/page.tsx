import { isDemo, listPartners } from "@/lib/partner/store";
import { PageHead } from "../admin-nav";
import { PartnerList } from "./list";

export const dynamic = "force-dynamic";
export const metadata = { title: "พาร์ทเนอร์ · แอดมิน Mister Bamrungsuk" };

// พาร์ทเนอร์ที่ซื้อพื้นที่โปรโมท (จากหน้า /partner) — สถานะ แพ็กเกจ วันหมดอายุ รายได้
export default async function PartnersPage() {
  const rows = await listPartners();
  return (
    <>
      <PageHead title="พาร์ทเนอร์ / พื้นที่โปรโมท" sub="จากหน้า /partner · ติดตามสัญญา QC และระยะเวลาโปรโมท"
        right={<a href="/api/admin/partners/export" className="chip h-9 px-3.5 inline-flex items-center">ส่งออก CSV</a>} />
      {isDemo && (
        <p className="mb-4 rounded-2xl border border-gold-500/40 px-4 py-3 text-xs text-ink-300">
          โหมดเดโม: ยังไม่ได้ตั้ง SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ข้อมูลหายเมื่อรีสตาร์ท
        </p>
      )}
      <PartnerList initial={rows} />
    </>
  );
}
