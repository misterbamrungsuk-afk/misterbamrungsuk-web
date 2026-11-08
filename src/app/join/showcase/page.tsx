import { HomeFeed } from "../../home-feed";
import { homeFeedProps } from "../../home-props";
import { getEarnings } from "@/lib/join/earnings-settings";

export const metadata = { title: "หน้าตัวอย่าง · แอปที่ลูกค้าเห็น — Mister Bamrungsuk", robots: { index: false } };
export const dynamic = "force-dynamic";

// หน้าตัวอย่าง (บอร์ด Benefits) สำหรับผู้สนใจร่วมทีม — แสดงเฉพาะคนจริงในระบบ (MDG 8 พ.ย. 2569: เอาคนตัวอย่าง/รูป AI ออกทั้งหมด)
export default async function ShowcasePage() {
  const [{ show }, { people }] = await Promise.all([getEarnings(), homeFeedProps()]);
  return <HomeFeed mode="sample" showEarnings={show} people={people} />;
}
