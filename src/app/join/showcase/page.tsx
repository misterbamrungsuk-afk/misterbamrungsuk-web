import { HomeFeed } from "../../home-feed";
import { getEarnings } from "@/lib/join/earnings-settings";

export const metadata = { title: "หน้าตัวอย่าง · แอปที่ลูกค้าเห็น — Mister Bamrungsuk", robots: { index: false } };
export const dynamic = "force-dynamic";

// หน้าตัวอย่าง (บอร์ด Benefits) สำหรับผู้สนใจร่วมทีม — เพื่อนตัวอย่าง 20 คนเสมอ + เมนูรับสมัคร (ดูเพื่อน · รายได้ · กฎเกณฑ์ · ร่วมทีม)
export default async function ShowcasePage() {
  const { show } = await getEarnings();
  return <HomeFeed mode="sample" showEarnings={show} />;
}
