import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { BrandBar } from "@/components/brand-bar";
import { SalesBoard } from "@/components/sales-board";
import { SALES_COOKIE, maskAccount, readSalesLink, repSummary } from "@/lib/member";
import { findRep } from "@/lib/member/store";
import { getMemberSettings } from "@/lib/member/tiers";
import { AvatarEditor } from "@/components/avatar-editor";
import { SalesWallet } from "./wallet";
import { SalesPassword } from "./password";
import { loginOf } from "@/lib/member/recruit";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "แดชบอร์ด Recruit — Mister Bamrungsuk", robots: { index: false } };

// แดชบอร์ด Recruit ภายนอก (เข้าผ่านลิงก์ที่ทีมงานส่งให้ /sales/go?t=)
export default async function SalesMe({ searchParams }: { searchParams: Promise<{ rep?: string; welcome?: string }> }) {
  // แอดมินเปิดดูหน้าของ Recruit คนใดก็ได้ (?rep=<id> · 28 ต.ค. 2569) — ดูอย่างเดียว ไม่ใช้คุกกี้ของ Recruit
  const jar = await cookies();
  const asRep = (await searchParams).rep;
  const adminView = !!asRep && !!(await verifySession(jar.get(ADMIN_COOKIE)?.value).then((s) => s && canAccess(s.role, "/admin/sales")));
  const id = adminView ? asRep! : readSalesLink(jar.get(SALES_COOKIE)?.value);
  const rep = id ? await findRep({ id }) : null;
  if (!rep || rep.kind !== "external" || (!rep.active && !adminView)) redirect("/recruit?expired=1");
  const [sum, cfg, login] = await Promise.all([repSummary(rep), getMemberSettings(), loginOf(rep.id).catch(() => null)]);
  const welcome = (await searchParams).welcome === "1";
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "misterbamrungsuk.com"}`;
  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9" }}>
      <BrandBar />
      <main className="rc-light mx-auto w-full max-w-[640px] flex flex-col gap-3.5" style={{ padding: "12px 16px 32px", lineHeight: 1.6 }}>
        {adminView && <p data-admin-view className="m-0 rounded-xl text-[13.5px] text-[#1b130b] font-semibold text-center" style={{ padding: "10px 12px", background: "#e8c472" }}>แอดมินกำลังดูหน้าของ {rep.name} ({rep.code}) · ดูอย่างเดียว{!rep.active ? " · ปิดใช้งานอยู่" : ""}</p>}
        {!adminView && <div className="flex flex-col items-center gap-1"><AvatarEditor as="sales" letter={rep.name} size={104} /></div>}
        <h1 className="m-0 text-[22px] font-semibold text-center">สวัสดี {rep.name} · Recruit</h1>
        <p className="m-0 -mt-2 text-center text-[13px] text-[#b5a596]">โค้ด {rep.code} · แตะรูปเพื่อเปลี่ยนรูปโปรไฟล์</p>
        {!adminView && welcome && <p data-recruit-welcome className="m-0 rounded-xl text-[14px] text-[#1b130b] font-semibold text-center" style={{ padding: "10px 12px", background: "#e8c472" }}>สมัครสำเร็จ · คุณเป็น Recruit แล้ว 🎉 ตั้งรหัสผ่านด้านล่างไว้ใช้เข้าครั้งหน้า</p>}
        {!adminView && login && <SalesPassword pwSet={login.pwSet} login={login.email || login.username} />}
        <SalesWallet d={{
          recruits: sum.recruits.length, recruitsPaid: sum.recruits.filter((r) => r.credited).length,
          members: sum.referrals.filter((r) => r.status === "credited").length,
          earned: sum.earned, available: sum.available, withdrawing: sum.withdrawing, paidOut: sum.paidOut,
          payouts: sum.payouts, history: sum.history, hasBank: !!rep.bank?.account,
        }} hideMember />
        {/* บัญชีรับค่าคอมที่ทีมงานบันทึกไว้ (ปิดบังเลข) — แก้ได้ผ่านทีมงานเท่านั้น */}
        <section className="rounded-2xl bg-[#211a18] flex flex-col gap-1" style={{ padding: 14, border: "1px solid rgba(232,196,114,.25)" }}>
          <b className="text-[15px]">บัญชีรับค่าคอม</b>
          {rep.bank?.account
            ? <span className="text-[14px] text-[#d9c9b4]">{rep.bank.bank} · {maskAccount(rep.bank.account)} · {rep.bank.name}</span>
            : <span className="text-[14px] text-[#ff8a9a]">ยังไม่มีบัญชีรับเงิน · ติดต่อทีมงานเพื่อเพิ่มบัญชีก่อนขอรับค่าคอม</span>}
          <span className="text-[12px] text-[#b5a596]">ต้องการเปลี่ยนบัญชี ติดต่อทีมงานทาง LINE</span>
        </section>
        <SalesBoard who="external" summary={sum} link={`${origin}/ref/${rep.code}`} tiers={{ gold: cfg.tiers.gold, black: cfg.tiers.black }} boostMult={cfg.boostMult} recruit={{ link: `${origin}/join/s/${rep.code}`, code: rep.code }} hideMoney hideMember />
        <form action="/api/sales/logout" method="post" className="mt-2">
          <button type="submit" className="w-full h-12 rounded-full text-[14px] font-semibold text-[#e8c472]" style={{ border: "1px solid rgba(232,196,114,.45)" }}>ออกจากระบบ Recruit</button>
        </form>
      </main>
    </div>
  );
}
