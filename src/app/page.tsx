import { HomeFeed } from "./home-feed";
import { getEarnings } from "@/lib/join/earnings-settings";
import { getLivePeople } from "@/lib/home/live";

export const metadata = { title: "Mister Bamrungsuk — เลือกเพื่อนของคุณ" };

// หน้าแรก = บอร์ด Benefits "หน้าแรก · ดูเพื่อนในระบบ (โฆษณาบนสุด + ในรายการ + ท้ายหน้า)"
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ show }, live] = await Promise.all([getEarnings(), getLivePeople().catch(() => [])]);
  // มี Part-Time จริงที่แอดมินเปิดแสดงแล้ว → แสดงเฉพาะคนจริง · ยังไม่มี → ตัวอย่าง
  return <HomeFeed showEarnings={show} people={live.length ? live : undefined} />;
}
