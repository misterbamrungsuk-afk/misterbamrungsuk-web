import { HomeFeed } from "./home-feed";
import { getEarnings } from "@/lib/join/earnings-settings";

export const metadata = { title: "Mister Bamrungsuk — เลือกเพื่อนของคุณ" };

// หน้าแรก = บอร์ด Benefits "หน้าแรก · ดูเพื่อนในระบบ (โฆษณาบนสุด + ในรายการ + ท้ายหน้า)"
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { show } = await getEarnings();
  return <HomeFeed showEarnings={show} />;
}
