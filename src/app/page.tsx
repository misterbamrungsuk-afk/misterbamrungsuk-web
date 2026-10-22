import { HomeFeed } from "./home-feed";
import { getProfile, myBlocked } from "@/lib/customer/profile";
import { currentCustomer } from "@/lib/customer/auth";
import { listNotices } from "@/lib/bookings";
import { getEarnings } from "@/lib/join/earnings-settings";
import { getLivePeople } from "@/lib/home/live";
import { PEOPLE } from "@/lib/home/people";
import { getMemberSettings } from "@/lib/member/tiers";
import { PT_ONLY } from "@/lib/site-gate";

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
  const visible = all.filter((p) => !blocked.has(p.id)); // ลูกค้าบล็อกไว้ = ไม่แสดง
  // คนที่ซื้อโปรโมท: สุ่มลำดับทุกครั้งที่เปิดหน้า (ทุกคนมีโอกาสขึ้นแถวแรกเท่ากัน) · สุ่มฝั่งเซิร์ฟเวอร์ ส่งเป็น props → ไม่ hydration mismatch
  const boosted = visible.filter((p) => p.boost);
  for (let i = boosted.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [boosted[i], boosted[j]] = [boosted[j], boosted[i]]; }
  const live = [...boosted, ...visible.filter((p) => !p.boost)];
  const unread = notices.filter((n) => n.kind === "message" && !n.read_at).length;
  // ช่วงเปิดเฉพาะรับสมัคร (PT_ONLY = หน้าตัวอย่าง): คนจริงขึ้นก่อน แล้วต่อด้วยตัวอย่าง → แต่ละแท็บไม่โล่งเมื่อเพิ่งมีคนจริงไม่กี่คน
  // เปิดเว็บเต็ม: มีคนจริง → แสดงเฉพาะคนจริง · ยังไม่มี → ตัวอย่าง
  const people = PT_ONLY ? [...live, ...PEOPLE] : live.length ? live : undefined;
  return <HomeFeed showEarnings={show} people={people} me={me ? { name: prof?.name || me.email.split("@")[0] } : null} unread={unread} memberTier={prof?.member_tier ?? null} promo={{ gold: mcfg.tiers.gold, black: mcfg.tiers.black }} recruit={PT_ONLY} />;
}
