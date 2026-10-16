/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentCustomer } from "@/lib/customer/auth";
import { getProfile } from "@/lib/customer/profile";
import { listForCustomer, listNotices } from "@/lib/bookings";
import { balances } from "@/lib/wallet";
import { getLivePeople } from "@/lib/home/live";
import { PEOPLE } from "@/lib/home/people";
import { LogoutLink } from "./logout";

export const dynamic = "force-dynamic";
export const metadata = { title: "บัญชีของฉัน — Mister Bamrungsuk" };

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
const Chev = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d9c9b4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>;
const Ic = ({ d }: { d: string }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

// บอร์ด C-Account "บัญชีของฉัน" — ตัวนับจริง · เพื่อนที่ถูกใจ · เมนู · SOS · ออกจากระบบ / ลบบัญชี (ข้ามเมนูยืนยันตัวตน: ลูกค้าไม่ต้อง KYC)
export default async function AccountPage() {
  const me = await currentCustomer();
  if (!me) redirect("/login");
  const [p, bookings, notices, bal, live] = await Promise.all([
    getProfile(me.sub, me.email), listForCustomer(me.sub).catch(() => []), listNotices("customer", me.sub).catch(() => []),
    balances("customer", me.sub).catch(() => ({} as Record<string, number>)), getLivePeople().catch(() => []),
  ]);
  const people = live.length ? live : PEOPLE;
  const favs = p.favorites.map((id) => people.find((x) => x.id === id)).filter(Boolean).slice(0, 5);
  const unread = notices.filter((n) => !n.read_at).length;
  const since = new Date(p.created_at).toLocaleDateString("th-TH", { month: "short", year: "numeric" });
  const menu: [string, string, string, React.ReactNode?][] = [
    ["/wallet", "M3 7h18v12H3zM16 13h2M3 7l3-3h12l3 3", "กระเป๋าเงิน", <span key="w" className="text-[13px] font-light" style={{ color: GOLD }}>฿{((bal.available ?? 0) / 100).toLocaleString("en-US")}</span>],
    ["/orders", "M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "นัดของฉัน"],
    ["/notifications", "M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0", "การแจ้งเตือน", unread ? <span key="n" className="min-w-5 h-5 px-1.5 rounded-full bg-[#e8c472] text-[#1b130b] text-[12px] grid place-items-center">{unread}</span> : undefined],
    ["/profile/edit", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6", "แก้ไขโปรไฟล์ · ผู้ติดต่อฉุกเฉิน"],
    ["/favorites", "M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z", "เพื่อนที่ถูกใจ"],
    ["/jobs", "M4 5h16v11H8l-4 4zM8 9h8M8 12h5", "โพสต์หาเพื่อน"],
    ["/membership", "M3 8h18v13H3zM3 12h18M12 8v13M12 8S10 3 7 4.5 9 8 12 8zm0 0s2-5 5-3.5S15 8 12 8z", "ของขวัญ · ใช้โค้ด"],
    ["/profile/addresses", "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", "ที่อยู่ที่บันทึก"],
    ["/profile/blocked", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8", "ผู้ใช้ที่บล็อก"],
    ["/page/terms", "M9.5 9a2.5 2.5 0 0 1 5 0c0 1.7-2.5 2-2.5 4M12 17h0M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "ช่วยเหลือและนโยบาย"],
  ];

  return (
    <div className="pb-6">
      <div className="flex items-center gap-[14px]" style={{ padding: "22px 16px 0" }}>
        <div className="w-16 h-16 rounded-full grid place-items-center font-semibold text-[26px] shrink-0" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>{(p.name || me.email).slice(0, 1)}</div>
        <div className="flex-1 min-w-0"><div className="font-semibold text-[20px] truncate">{p.name || me.email}</div><div className="text-[13px] font-light text-[#d9c9b4]">สมาชิกตั้งแต่ {since}</div></div>
        <Link href="/work-with-us" className="h-10 px-4 rounded-full text-[13px] font-light grid place-items-center hover:text-[#e8c472]" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>สมัครเป็นเพื่อน</Link>
      </div>
      <div className="grid grid-cols-3 text-center rounded-[20px] bg-[#211a18]" style={{ margin: "18px 16px 0", padding: "14px 0", border: `1px solid ${LN}` }}>
        <div><div className="font-semibold text-[22px]">{bookings.length}</div><div className="text-[12px] font-light text-[#d9c9b4]">การจอง</div></div>
        <div style={{ borderLeft: `1px solid ${LN}`, borderRight: `1px solid ${LN}` }}><div className="font-semibold text-[22px]">{p.favorites.length}</div><div className="text-[12px] font-light text-[#d9c9b4]">เพื่อนที่ถูกใจ</div></div>
        <div><div className="font-semibold text-[22px]" style={{ color: GOLD }}>{bookings.filter((b) => b.status === "completed").length}</div><div className="text-[12px] font-light text-[#d9c9b4]">นัดที่จบแล้ว</div></div>
      </div>
      {!!favs.length && (
        <div style={{ padding: "20px 16px 0" }}>
          <div className="flex justify-between items-center"><b className="font-medium text-[17px]">เพื่อนที่ถูกใจ</b><Link href="/favorites" className="tap pl-3 text-[13px] font-light" style={{ color: GOLD }}>ทั้งหมด ›</Link></div>
          <div className="flex gap-3 mt-3">{favs.map((f) => <Link key={f!.id} href={`/p/${f!.id}`}><img src={f!.img} alt={f!.nick} className="w-[62px] h-[62px] rounded-full object-cover" style={{ border: "2px solid #171211", boxShadow: `0 0 0 1px ${GOLD}`, objectPosition: f!.pos }} /></Link>)}</div>
        </div>
      )}
      <div className="rounded-[20px] bg-[#211a18] overflow-hidden" style={{ margin: "18px 16px 0", border: `1px solid ${LN}` }}>
        {menu.map(([href, d, label, extra], i) => (
          <Link key={href} href={href} className="flex items-center gap-[14px] text-[15px] text-[#f3ead9] hover:text-[#f3ead9]" style={{ padding: "15px 16px", borderBottom: i < menu.length - 1 ? `1px solid ${LN}` : "none" }}>
            <Ic d={d} /><span className="flex-1">{label}</span>{extra}<Chev />
          </Link>
        ))}
      </div>
      <Link href="/sos" className="h-14 rounded-2xl flex items-center justify-center gap-[10px] font-semibold text-[16px] text-[#ff8a97] hover:text-[#ff8a97]" style={{ margin: "18px 16px 0", border: "1px solid #c9283d", background: "rgba(224,36,60,.1)" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3 2 20h20zM12 10v4M12 17h0" /></svg>SOS ฉุกเฉิน · แอดมินรับเรื่องทันที
      </Link>
      <div className="grid grid-cols-2 gap-2 text-[14px]" style={{ margin: "14px 16px 0", paddingTop: 12, borderTop: `1px dashed ${LN}` }}><LogoutLink /><Link href="/profile/delete" className="h-11 rounded-[14px] grid place-items-center text-[#ff8a9a] hover:text-[#ff8a9a]" style={{ border: "1px solid rgba(255,138,154,.3)" }}>ลบบัญชี (PDPA)</Link></div>
    </div>
  );
}
