import { HomeFeed } from "../home-feed";
import { homeFeedProps } from "../home-props";
import { getSite } from "@/i18n/server";

// หน้าแยก "หมอนวดน้ำมันชาย" (MDG 8 พ.ย. 2569: ลูกค้าส่วนใหญ่เข้ามาหาหมอนวด — กดการ์ดแล้วเข้าหน้าเฉพาะ เข้าใจง่ายกว่า)
export const dynamic = "force-dynamic";
export async function generateMetadata() { const s = await getSite(); return { title: `${s.home.svcMassage} — Mister Bamrungsuk` }; }

export default async function MassagePage() {
  return <HomeFeed {...await homeFeedProps()} svc="massage" variant="massage" />;
}
