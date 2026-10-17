import { HomeFeed } from "./home-feed";
import { getProfile, myBlocked } from "@/lib/customer/profile";
import { currentCustomer } from "@/lib/customer/auth";
import { listNotices } from "@/lib/bookings";
import { getEarnings } from "@/lib/join/earnings-settings";
import { getLivePeople } from "@/lib/home/live";
import { getMemberSettings } from "@/lib/member/tiers";

export const metadata = { title: "Mister Bamrungsuk — เลือกเพื่อนของคุณ" };

// หน้าแรกลูกค้า (บอร์ด C-Home): ค้นหาเพื่อน + ทางแยก ร่วมงานกับเรา / สินค้า / โปรไฟล์ Part-Time + เมนูลูกค้า
// หน้าตัวอย่างสำหรับผู้สนใจร่วมทีมแยกไปที่ /join/showcase
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const me = await currentCustomer().catch(() => null);
  const [{ show }, all, blocked, prof, notices, mcfg] = await Promise.all([
    getEarnings(), getLivePeople().catch(() => []), myBlocked(),
    me ? getProfile(me.sub, me.email).catch(() => null) : null,
    me ? listNotices("customer", me.sub).catch(() => []) : [],
    getMemberSettings(),
  ]);
  const live = all.filter((p) => !blocked.has(p.id)); // ลูกค้าบล็อกไว้ = ไม่แสดง
  const unread = notices.filter((n) => n.kind === "message" && !n.read_at).length;
  // มี Part-Time จริงที่แอดมินเปิดแสดงแล้ว → แสดงเฉพาะคนจริง · ยังไม่มี → ตัวอย่าง
  return <HomeFeed showEarnings={show} people={live.length ? live : undefined} me={me ? { name: prof?.name || me.email.split("@")[0] } : null} unread={unread} memberTier={prof?.member_tier ?? null} promo={{ gold: mcfg.tiers.gold, black: mcfg.tiers.black }} />;
}
