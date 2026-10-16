import { HomeFeed } from "./home-feed";
import { myBlocked } from "@/lib/customer/profile";
import { getEarnings } from "@/lib/join/earnings-settings";
import { getLivePeople } from "@/lib/home/live";

export const metadata = { title: "Mister Bamrungsuk — เลือกเพื่อนของคุณ" };

// หน้าแรก = บอร์ด Benefits "หน้าแรก · ดูเพื่อนในระบบ (โฆษณาบนสุด + ในรายการ + ท้ายหน้า)"
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ show }, all, blocked] = await Promise.all([getEarnings(), getLivePeople().catch(() => []), myBlocked()]);
  const live = all.filter((p) => !blocked.has(p.id)); // ลูกค้าบล็อกไว้ = ไม่แสดง
  // มี Part-Time จริงที่แอดมินเปิดแสดงแล้ว → แสดงเฉพาะคนจริง · ยังไม่มี → ตัวอย่าง
  return <HomeFeed showEarnings={show} people={live.length ? live : undefined} />;
}
