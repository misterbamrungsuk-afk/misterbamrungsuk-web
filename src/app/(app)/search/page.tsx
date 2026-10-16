import { getLivePeople } from "@/lib/home/live";
import { myBlocked } from "@/lib/customer/profile";
import { PEOPLE } from "@/lib/home/people";
import { SearchList } from "./list";

export const dynamic = "force-dynamic";
export const metadata = { title: "ค้นหาเพื่อน — Mister Bamrungsuk" };

// บอร์ด C-SearchList "ผลค้นหา" — มุมมองลิสต์ · ค้นจากชื่อ ย่าน กิจกรรม · Part-Time จริงเมื่อมี ไม่งั้นตัวอย่าง
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [all, blocked] = await Promise.all([getLivePeople().catch(() => []), myBlocked()]);
  const live = all.filter((p) => !blocked.has(p.id));
  return <SearchList people={live.length ? live : PEOPLE} sample={!live.length} q0={q ?? ""} />;
}
