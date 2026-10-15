import { HomeFeed } from "./home-feed";

export const metadata = { title: "Mister Bamrungsuk — เลือกเพื่อนของคุณ" };

// หน้าแรก = บอร์ด Benefits "หน้าแรก · ดูเพื่อนในระบบ (โฆษณาบนสุด + ในรายการ + ท้ายหน้า)"
export default function HomePage() {
  return <HomeFeed />;
}
