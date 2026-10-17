import Link from "next/link";
import { TopBar } from "@/components/shell";
import { currentCustomer } from "@/lib/customer/auth";
import { getProfile } from "@/lib/customer/profile";
import { getMemberSettings } from "@/lib/member/tiers";
import { pointsOf, listPurchases } from "@/lib/member/store";
import { MemberCard } from "@/components/member-card";
import { JoinMember } from "./join";

export const dynamic = "force-dynamic";
export const metadata = { title: "เมมเบอร์ Gold / Black — Mister Bamrungsuk" };

const baht = (n: number) => "฿" + n.toLocaleString("th-TH");

// เปิดเมมเบอร์ Gold / Black — จ่ายครั้งเดียว ได้เครดิตเพิ่ม + แต้มคูณ + โปรไฟล์และบัตรพิเศษ · ของขวัญ/ใช้โค้ดเดิมอยู่ด้านล่าง
export default async function MembershipPage({ searchParams }: { searchParams: Promise<{ ref?: string; tier?: string }> }) {
  const sp = await searchParams;
  const me = await currentCustomer().catch(() => null);
  const [cfg, prof, pts, mine] = await Promise.all([
    getMemberSettings(),
    me ? getProfile(me.sub, me.email).catch(() => null) : null,
    me ? pointsOf(me.sub).catch(() => ({ total: 0, rows: [] })) : { total: 0, rows: [] },
    me ? listPurchases({ customer_id: me.sub }).catch(() => []) : [],
  ]);
  const tier = prof?.member_tier ?? null;
  const pending = mine.find((p) => p.status === "pending");
  const perks = (k: "gold" | "black") => {
    const t = cfg.tiers[k];
    return [
      `จ่าย ${baht(t.pay)} ได้เครดิต ${baht(t.credit)} (เพิ่ม ${baht(t.credit - t.pay)})`,
      `แต้ม ×${(t.pointsPer100 / Math.max(cfg.basePointsPer100, 0.01)).toLocaleString("th-TH", { maximumFractionDigits: 1 })} ทุกการใช้จ่าย`,
      k === "black" ? "โปรไฟล์และบัตรสีดำ-ทอง ระดับสูงสุด" : "โปรไฟล์และบัตรสีแดง-ทอง",
      "ใช้เครดิตนัดเพื่อน สปา โรงแรม และสินค้าในแอป",
    ];
  };
  return (
    <div className="pb-8">
      <TopBar back="/profile" title="เมมเบอร์" />
      <div className="mx-auto w-full max-w-[880px] flex flex-col gap-4" style={{ padding: "8px 18px 0" }}>
        {tier ? (
          <section className="flex flex-col items-center gap-3">
            <MemberCard tier={tier} name={prof?.name ?? ""} no={prof?.member_no} since={prof?.member_since} points={pts.total} />
            <p className="m-0 text-center text-[14px] text-[#d9c9b4]">คุณเป็น <b className="text-[#e8c472]">{cfg.tiers[tier].name} Member</b> · แต้มสะสม {pts.total.toLocaleString("th-TH")} แต้ม</p>
          </section>
        ) : (
          <section className="rounded-[20px] text-center flex flex-col items-center gap-3" style={{ padding: "18px 16px", background: "linear-gradient(135deg, #3d1922 0%, #211a18 70%)", border: "1px solid rgba(232,196,114,.45)" }}>
            <div className="text-[12px] tracking-[.24em] font-semibold text-[#e8c472]">MEMBER PROMOTION</div>
            <h1 className="m-0 text-[24px] leading-[1.35] font-bold">เปิดเมม ได้เครดิตเพิ่มทันที<br /><span className="text-[#e8c472]">สูงสุด {baht(cfg.tiers.black.credit - cfg.tiers.black.pay)}</span></h1>
            <div className="relative w-full max-w-[520px] aspect-[2/1] md:aspect-[2.3/1]">
              <span className="absolute left-[2%] top-[4%] w-[60%] md:w-[54%] rotate-[-7deg]"><MemberCard tier="gold" name="Gold Member" sample /></span>
              <span className="absolute right-[2%] top-[14%] w-[60%] md:w-[54%] rotate-[6deg]"><MemberCard tier="black" name="Black Member" sample /></span>
            </div>
          </section>
        )}

        {/* เลือกระดับ */}
        <section className="grid gap-3 md:grid-cols-2">
          {(["gold", "black"] as const).map((k) => {
            const t = cfg.tiers[k], cur = tier === k;
            return (
              <div key={k} className="rounded-[18px] flex flex-col gap-2.5" style={{ padding: 16, background: k === "black" ? "linear-gradient(160deg, #241f1c, #120f0e)" : "linear-gradient(160deg, #4d1f2a, #2b1218)", border: `1.5px solid ${k === "black" ? "#d9b25c" : "#e8c472"}` }}>
                <div className="flex items-baseline justify-between"><b className="text-[20px] text-[#f6dc9a]">{t.name}</b>{cur && <span className="text-[12px] rounded-full px-2.5 py-0.5 bg-[#e8c472] text-[#1b130b] font-semibold">ระดับปัจจุบัน</span>}</div>
                <div className="text-[30px] font-bold leading-none">{baht(t.pay)}</div>
                <div className="text-[15px] text-[#e8c472] font-semibold">ได้เครดิต {baht(t.credit)}</div>
                <ul className="m-0 pl-5 text-[13.5px] leading-[1.7] text-[#d9c9b4]">{perks(k).map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            );
          })}
        </section>

        {!cfg.enabled ? (
          <p className="m-0 rounded-xl text-center text-[14px] text-[#d9c9b4]" style={{ padding: 14, background: "#211a18" }}>ยังไม่เปิดรับเปิดเมมในขณะนี้ · ติดตามโปรเร็ว ๆ นี้</p>
        ) : !me ? (
          <Link href="/login?next=/membership" className="h-[52px] rounded-full grid place-items-center font-semibold bg-[#e8c472] text-[#1b130b] hover:text-[#1b130b]">เข้าสู่ระบบเพื่อเปิดเมม</Link>
        ) : pending ? (
          <p className="m-0 rounded-xl text-center text-[14px] text-[#e8c472]" style={{ padding: 14, background: "rgba(232,196,114,.12)" }}>ส่งสลิปเปิดเมม {cfg.tiers[pending.tier].name} แล้ว · ทีมงานตรวจภายใน 2 ชม. (09:00–22:00)</p>
        ) : tier === "black" ? null : (
          <JoinMember tiers={{ gold: cfg.tiers.gold, black: cfg.tiers.black }} current={tier} refCode={sp.ref ?? null} initial={sp.tier === "black" ? "black" : tier === "gold" ? "black" : "gold"} />
        )}

        {me && pts.rows.length > 0 && (
          <section className="rounded-[16px] bg-[#211a18] flex flex-col" style={{ padding: "12px 14px" }}>
            <b className="text-[15px] mb-1">ประวัติแต้ม</b>
            {pts.rows.slice(0, 10).map((r) => <div key={r.id} className="flex justify-between py-1.5 text-[13.5px] border-t border-[rgba(243,234,217,.07)]"><span className="text-[#d9c9b4]">{r.reason}</span><b className="text-[#e8c472]">+{r.delta.toLocaleString("th-TH")}</b></div>)}
            <span className="text-[12px] text-[#9a8a85] mt-1">แลกแต้มเป็นของรางวัล · เร็ว ๆ นี้</span>
          </section>
        )}

        <Link href="/membership/redeem" className="flex items-center gap-3 rounded-[14px] bg-[#211a18] text-[#f3ead9] hover:text-[#f3ead9]" style={{ padding: "12px 14px", border: "1px solid rgba(243,234,217,0.07)" }}>
          <span className="w-9 h-9 rounded-xl grid place-items-center text-[#e8c472] bg-[#251d1b]" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M3 12h18M12 8v13" /></svg></span>
          <span className="flex-1"><b className="font-medium text-[14.5px]">มีโค้ดของขวัญ / โปรโมชัน?</b><span className="block text-[12px] font-light text-[#d9c9b4]">ใช้โค้ดรับเครดิตเข้ากระเป๋า</span></span>
          <span className="text-[#e8c472]">›</span>
        </Link>
      </div>
    </div>
  );
}
