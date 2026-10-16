/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/shell";
import { currentCustomer } from "@/lib/customer/auth";
import { getProfile } from "@/lib/customer/profile";
import { getLivePeople } from "@/lib/home/live";
import { PEOPLE, priceOf } from "@/lib/home/people";

export const dynamic = "force-dynamic";
export const metadata = { title: "เพื่อนที่ถูกใจ — Mister Bamrungsuk" };

const GOLD = "#e8c472";

// บอร์ด C-Favorites "Part-Time ที่ถูกใจ" — กดหัวใจที่หน้าโปรไฟล์เพื่อบันทึก
export default async function FavoritesPage() {
  const me = await currentCustomer();
  if (!me) redirect("/login");
  const [p, live] = await Promise.all([getProfile(me.sub, me.email), getLivePeople().catch(() => [])]);
  const people = [...live, ...PEOPLE];
  const list = p.favorites.map((id) => people.find((x) => x.id === id)).filter((x) => !!x);
  return (
    <div className="pb-6">
      <TopBar back="/profile" title="เพื่อนที่ถูกใจ" />
      <div style={{ padding: "16px 16px 0" }}>
        {!list.length ? (
          <div className="rounded-[20px] bg-[#211a18] flex flex-col items-center gap-3 text-center" style={{ padding: 28 }}>
            <span className="text-[14px] text-[#d9c9b4]">ยังไม่มีเพื่อนที่ถูกใจ · กดหัวใจที่หน้าโปรไฟล์เพื่อนเพื่อบันทึกไว้</span>
            <Link href="/" className="h-11 px-5 rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold grid place-items-center hover:text-[#1b130b]">ดูเพื่อนในระบบ</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {list.map((x) => (
              <Link key={x!.id} href={`/p/${x!.id}`} className="rounded-[18px] overflow-hidden bg-[#251d1b] text-[#f3ead9] hover:text-[#f3ead9]">
                <img src={x!.img} alt={x!.nick} className="w-full aspect-[3/4] object-cover block" style={{ objectPosition: x!.pos }} />
                <div style={{ padding: "8px 10px 10px" }}>
                  <div className="flex justify-between items-baseline"><b className="font-semibold text-[15px]">{x!.nick}{x!.age ? `, ${x!.age}` : ""}</b><span className="text-[12px] font-light" style={{ color: GOLD }}>★ {x!.rating}</span></div>
                  <div className="text-[12px] font-light text-[#d9c9b4]">{x!.area} · ฿{priceOf(x!).toLocaleString("en-US")}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
