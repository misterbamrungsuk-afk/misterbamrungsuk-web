/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { MemberCard } from "@/components/member-card";
import { TIER_LOOK } from "@/components/member-look";
import { pointsOf } from "@/lib/member/store";
import { redirect } from "next/navigation";
import { currentCustomer } from "@/lib/customer/auth";
import { getProfile } from "@/lib/customer/profile";
import { listForCustomer, listNotices } from "@/lib/bookings";
import { balances } from "@/lib/wallet";
import { getLivePeople } from "@/lib/home/live";
import { PEOPLE } from "@/lib/home/people";
import { LogoutLink } from "./logout";
import { AvatarView } from "@/components/avatar-editor";
import { getAvatar } from "@/lib/avatar";
import { getMemberSettings, DEFAULT_MEMBER } from "@/lib/member/tiers";
import { TierBadge, skinOf } from "@/components/member-offers";

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
  const tier = p.member_tier ?? null;
  const pts = await pointsOf(me.sub).catch(() => ({ total: 0, rows: [] }));
  const mcfg = await getMemberSettings().catch(() => null);
  const avail = (bal.available ?? 0) / 100, held = (bal.held ?? 0) / 100;
  const fmt = (n: number) => "฿" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const mt = { gold: (mcfg ?? DEFAULT_MEMBER).tiers.gold, black: (mcfg ?? DEFAULT_MEMBER).tiers.black };
  const skin = skinOf(tier);
  const since = new Date(p.created_at).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", month: "short", year: "numeric" });
  const menu: [string, string, string, React.ReactNode?][] = [
    ["/orders", "M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "นัดของฉัน"],
    ["/notifications", "M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0", "การแจ้งเตือน", unread ? <span key="n" className="min-w-5 h-5 px-1.5 rounded-full bg-[#e8c472] text-[#1b130b] text-[12px] grid place-items-center">{unread}</span> : undefined],
    ["/profile/edit", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6", "แก้ไขโปรไฟล์ · ผู้ติดต่อฉุกเฉิน"],
    ["/favorites", "M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z", "เพื่อนที่ถูกใจ"],
    ["/jobs", "M4 5h16v11H8l-4 4zM8 9h8M8 12h5", "โพสต์หาเพื่อน"],
    ["/profile/addresses", "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", "ที่อยู่ที่บันทึก"],
    ["/profile/blocked", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8", "ผู้ใช้ที่บล็อก"],
    ["/page/terms", "M9.5 9a2.5 2.5 0 0 1 5 0c0 1.7-2.5 2-2.5 4M12 17h0M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "ช่วยเหลือและนโยบาย"],
  ];

  return (
    <div className="pb-6">
      <div className="flex items-center gap-[14px]" style={{ padding: "22px 16px 14px", margin: tier ? "10px 12px 0" : undefined, borderRadius: tier ? 20 : undefined, background: tier ? TIER_LOOK[tier].bg : undefined, boxShadow: tier ? `0 0 0 1.5px ${TIER_LOOK[tier].ring}` : undefined }}>
        <Link href="/profile/edit" aria-label="แก้รูปโปรไฟล์" className="shrink-0"><AvatarView as="customer" letter={p.name || me.email} size={64} meta={await getAvatar("customer", me.sub).then((a) => (a ? { pos: a.pos, zoom: a.zoom, v: Date.parse(a.updated_at) } : null)).catch(() => null)} /></Link>
        <div className="flex-1 min-w-0"><div className="font-semibold text-[20px] truncate">{p.name || me.email}</div>
          {tier ? <div className="text-[12.5px] font-semibold tracking-[.18em]" style={{ color: TIER_LOOK[tier].text }}>{TIER_LOOK[tier].label} · {pts.total.toLocaleString("th-TH")} แต้ม</div> : <div className="text-[13px] font-light text-[#d9c9b4]">สมาชิกตั้งแต่ {since}</div>}</div>
        <Link href="/work-with-us" className="h-10 px-4 rounded-full text-[13px] font-light grid place-items-center hover:text-[#e8c472]" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>สมัครเป็นเพื่อน</Link>
      </div>
      {/* กระเป๋าเงิน: ยอดเด่น ๆ + เติมเงิน (เติมเท่าไหร่ได้เท่านั้น) — บอส 11 พ.ย. 2569 */}
      <section data-wallet-card className="relative overflow-hidden rounded-[22px]" style={{ margin: "14px 16px 0", padding: "18px 18px 16px", background: skin.bg, border: `1px solid ${skin.border}`, boxShadow: skin.glow }}>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[14px] text-[#f1e3c8]"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h18v12H3zM16 13h2M3 7l3-3h12l3 3" /></svg>กระเป๋าเงินของฉัน</span>
          <Link href="/wallet" className="text-[12.5px] font-light hover:text-[#e8c472]" style={{ color: GOLD }}>ประวัติ ›</Link>
        </div>
        {tier && <div className="mt-2"><TierBadge tier={tier} tiers={mt} /></div>}
        <div className="mt-1.5 text-[12.5px] font-light text-[#d9c9b4]">ยอดที่ใช้ได้</div>
        <div data-wallet-balance className="font-semibold leading-[1.15] text-[40px] [font-variant-numeric:tabular-nums]" style={{ color: "#fff1c9", textShadow: "0 2px 18px rgba(232,196,114,.25)" }}>{fmt(avail)}</div>
        {held > 0 && <div className="text-[12.5px] font-light text-[#d9c9b4]">กันไว้รอเพื่อนตอบรับ {fmt(held)}</div>}
        <div className="grid grid-cols-[1.4fr_1fr] gap-2.5 mt-3.5">
          <Link href="/wallet?topup=1" data-wallet-topup className="h-12 rounded-[14px] font-semibold text-[15.5px] flex items-center justify-center gap-2 text-[#1b130b] hover:text-[#1b130b]" style={{ background: "linear-gradient(135deg,#fff1c9,#e8c472 55%,#d1a54c)", boxShadow: "0 8px 20px rgba(232,196,114,.28)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>เติมเงิน
          </Link>
          <Link href="/orders" className="h-12 rounded-[14px] text-[14px] grid place-items-center text-[#f3ead9] hover:text-[#e8c472]" style={{ background: "rgba(0,0,0,.28)", border: "1px solid rgba(243,234,217,.12)" }}>นัดของฉัน</Link>
        </div>
        <p className="m-0 mt-2.5 text-[12px] font-light text-[#d9c9b4]">เติมเท่าไหร่ ได้เท่านั้น · ใช้จ่ายค่านัดเพื่อนได้ทันที</p>
      </section>

      {/* เปิดเมมเบอร์: จ่ายครั้งเดียว ได้เครดิตเพิ่ม (ส่วนต่าง = Givouche) */}
      {/* ปุ่มเดียวใต้กระเป๋า (บอส 11 พ.ย. 2569): เปิดเมมเบอร์คุ้มกว่า → หน้าเปิดเมม · Black แล้วไม่แสดง */}
      {tier !== "black" && (
        <Link href={tier === "gold" ? "/membership?tier=black" : "/membership"} data-member-cta className="mb-mem-cta relative overflow-hidden flex items-center gap-3 rounded-[18px] text-[#1b130b] hover:text-[#1b130b]" style={{ margin: "12px 16px 0", padding: "12px 14px" }}>
          <style>{`
            @keyframes mbMemShine{0%{transform:translateX(-130%) skewX(-20deg)}60%,100%{transform:translateX(330%) skewX(-20deg)}}
            @keyframes mbMemPulse{0%,100%{box-shadow:0 8px 22px rgba(232,196,114,.28),0 0 0 0 rgba(232,196,114,.4)}50%{box-shadow:0 10px 28px rgba(232,196,114,.42),0 0 0 6px rgba(232,196,114,0)}}
            .mb-mem-cta{background:linear-gradient(120deg,#fff1c9 0%,#f0d38a 38%,#e2b75a 72%,#c99a3c 100%);animation:mbMemPulse 2.6s ease-in-out infinite;transition:transform .2s ease}
            .mb-mem-cta::after{content:"";position:absolute;inset:0 auto 0 0;width:35%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent);animation:mbMemShine 3.4s ease-in-out infinite;pointer-events:none}
            .mb-mem-cta:active{transform:scale(.98)}
            @media (prefers-reduced-motion: reduce){.mb-mem-cta,.mb-mem-cta::after{animation:none}}
          `}</style>
          <span className="w-11 h-11 rounded-[13px] grid place-items-center shrink-0" style={{ background: "rgba(27,19,11,.12)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h18v13H3zM3 12h18M12 8v13M12 8S10 3 7 4.5 9 8 12 8zm0 0s2-5 5-3.5S15 8 12 8z" /></svg>
          </span>
          <span className="flex-1 min-w-0 flex flex-col leading-tight">
            <b className="text-[17px] font-bold">{tier === "gold" ? "อัปเกรดเป็น Black คุ้มกว่า" : "เปิดเมมเบอร์คุ้มกว่า"}</b>
            <span className="text-[12.5px] font-medium" style={{ color: "#5a3d12" }}>{tier === "gold" ? `จ่าย ฿${mt.black.pay.toLocaleString("en-US")} ได้ ฿${mt.black.credit.toLocaleString("en-US")}` : `ได้เครดิตเพิ่มสูงสุด +฿${(mt.black.credit - mt.black.pay).toLocaleString("en-US")} Givouche`}</span>
          </span>
          <span className="w-8 h-8 rounded-full grid place-items-center shrink-0" style={{ background: "#1b130b", color: "#e8c472" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
        </Link>
      )}
      <p data-cancel-note className="m-0 flex gap-2 items-start rounded-[14px] text-[12.5px] leading-[1.55] text-[#f3c2c9]" style={{ margin: "12px 16px 0", padding: "10px 12px", background: "rgba(224,36,60,.08)", border: "1px solid rgba(224,36,60,.28)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5" aria-hidden="true"><path d="M12 3 2 20h20zM12 10v4M12 17h0" /></svg>
        <span><b className="font-semibold">หมายเหตุ:</b> ถ้าลูกค้ายกเลิกนัดเอง ระบบไม่มีการคืนเงินทุกกรณี</span>
      </p>

      <div className="grid grid-cols-3 text-center rounded-[20px] bg-[#211a18]" style={{ margin: "18px 16px 0", padding: "14px 0", border: `1px solid ${LN}` }}>
        <div><div className="font-semibold text-[22px]">{bookings.length}</div><div className="text-[12px] font-light text-[#d9c9b4]">การจอง</div></div>
        <div style={{ borderLeft: `1px solid ${LN}`, borderRight: `1px solid ${LN}` }}><div className="font-semibold text-[22px]">{p.favorites.length}</div><div className="text-[12px] font-light text-[#d9c9b4]">เพื่อนที่ถูกใจ</div></div>
        <div><div className="font-semibold text-[22px]" style={{ color: GOLD }}>{bookings.filter((b) => b.status === "completed").length}</div><div className="text-[12px] font-light text-[#d9c9b4]">นัดที่จบแล้ว</div></div>
      </div>
      {tier && <Link href="/membership" className="block" style={{ padding: "16px 16px 0" }}><MemberCard tier={tier} name={p.name || me.email.split("@")[0]} no={p.member_no} since={p.member_since} points={pts.total} className="mx-auto" /></Link>}
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
