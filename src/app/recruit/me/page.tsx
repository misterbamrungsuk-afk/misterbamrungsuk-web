import Link from "next/link";
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
import { PROGRAM_LABEL, getPrograms, type ProgramKey } from "@/lib/member/recruit-programs";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "แดชบอร์ด Recruit — Mister Bamrungsuk", robots: { index: false } };

// แท็บแบบเป๋าตัง (บอสสั่ง 28 ต.ค. 2569): กระเป๋าเงิน (หน้าแรก) · หา Part-time · หา Partner · หา Collab · หาลูกค้าเปิด Member — แยกส่วนใครส่วนมัน
// ตอนนี้เปิดแค่ Part-time · ส่วนอื่นยังไม่มีเงื่อนไข (CEO เปิด/กำหนดราคาที่ /admin/recruit-programs)
type Tab = "wallet" | ProgramKey;
const TABS: { k: Tab; label: string; icon: React.ReactNode }[] = [
  { k: "wallet", label: "กระเป๋าเงิน", icon: <path d="M3 7a2 2 0 0 1 2-2h12v4M3 7v10a2 2 0 0 0 2 2h14V9H5a2 2 0 0 1-2-2Zm13 6h.01" /> },
  { k: "parttime", label: "หา Part-time", icon: <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm9.5-2v6m3-3h-6" /> },
  { k: "partner", label: "หา Partner", icon: <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" /> },
  { k: "collab", label: "หา Collab", icon: <path d="m12 3 2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5L12 3Z" /> },
  { k: "member", label: "หาลูกค้าเปิด Member", icon: <path d="M6 3h12l3 6-9 12L3 9l3-6Zm-3 6h18M12 21 8 9l4-6 4 6-4 12" /> },
];
const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 });

export default async function SalesMe({ searchParams }: { searchParams: Promise<{ rep?: string; welcome?: string; tab?: string }> }) {
  // แอดมินเปิดดูหน้าของ Recruit คนใดก็ได้ (?rep=<id> · 28 ต.ค. 2569) — ดูอย่างเดียว ไม่ใช้คุกกี้ของ Recruit
  const jar = await cookies();
  const sp = await searchParams;
  const asRep = sp.rep;
  const adminView = !!asRep && !!(await verifySession(jar.get(ADMIN_COOKIE)?.value).then((s) => s && canAccess(s.role, "/admin/sales")));
  const id = adminView ? asRep! : readSalesLink(jar.get(SALES_COOKIE)?.value);
  const rep = id ? await findRep({ id }) : null;
  if (!rep || rep.kind !== "external" || (!rep.active && !adminView)) redirect("/recruit?expired=1");
  const [sum, cfg, login, progs] = await Promise.all([repSummary(rep), getMemberSettings(), loginOf(rep.id).catch(() => null), getPrograms()]);
  const tab: Tab = TABS.some((t) => t.k === sp.tab) ? (sp.tab as Tab) : "wallet";
  const href = (k: Tab) => `/recruit/me?${new URLSearchParams({ ...(adminView ? { rep: rep.id } : {}), ...(k === "wallet" ? {} : { tab: k }) })}`;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "misterbamrungsuk.com"}`;
  const pt = progs.parttime;
  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9" }}>
      <BrandBar />
      <main className="rc-light mx-auto w-full max-w-[640px] flex flex-col gap-3.5" style={{ padding: "12px 16px 32px", lineHeight: 1.6 }}>
        {adminView && <p data-admin-view className="m-0 rounded-xl text-[13.5px] text-[#1b130b] font-semibold text-center" style={{ padding: "10px 12px", background: "#e8c472" }}>แอดมินกำลังดูหน้าของ {rep.name} ({rep.code}) · ดูอย่างเดียว{!rep.active ? " · ปิดใช้งานอยู่" : ""}</p>}

        {/* หัวโปรไฟล์: รูป · ชื่อ · รายได้รวมทั้งหมด (ทุกส่วน) */}
        <div className="flex items-center gap-3.5">
          {adminView
            ? <span className="w-[72px] h-[72px] shrink-0 rounded-full grid place-items-center text-[28px] text-[#e8c472]" style={{ border: "2px solid #e8c472", background: "#211a18" }}>{rep.name.slice(0, 1)}</span>
            : <div className="shrink-0"><AvatarEditor as="sales" letter={rep.name} size={72} /></div>}
          <div className="min-w-0 flex flex-col">
            <h1 className="m-0 text-[20px] font-semibold leading-[1.35] truncate">{rep.name}</h1>
            <span data-recruit-total className="text-[13px] text-[#d9c9b4]">รายได้รวมทั้งหมด <b className="text-[22px] text-[#e8c472] tabular-nums">{baht(sum.earned)}</b></span>
            <span className="text-[12.5px] text-[#b5a596]">Recruit · โค้ด <b className="tracking-[.08em] text-[#f3ead9]">{rep.code}</b></span>
          </div>
        </div>

        {/* แถบเลือกส่วน — เลื่อนซ้าย/ขวาได้ */}
        <nav data-recruit-tabs aria-label="ส่วนของ Recruit" className="-mx-4 px-4 pt-2 -mt-2 scroll-px-4 flex gap-2 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const on = t.k === tab;
            const open = t.k === "wallet" || progs[t.k as ProgramKey]?.enabled;
            return (
              <Link key={t.k} href={href(t.k)} data-tab={t.k} aria-current={on ? "page" : undefined} scroll={false}
                className="snap-start shrink-0 w-[88px] min-h-[76px] rounded-[16px] flex flex-col items-center justify-center gap-1 px-1.5 py-2 text-center relative"
                style={on ? { background: "#e8c472", color: "#1b130b", border: "1px solid #e8c472" } : { background: "#3a1520", color: "#f3ead9", border: "1px solid rgba(232,196,114,.35)" }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>
                <span className="text-[12px] leading-[1.3] font-medium">{t.label}</span>
                {!open && <span data-soon="1" className="absolute -top-1.5 right-1 rounded-full px-1.5 text-[9.5px] font-semibold leading-[16px]" style={{ background: "#211a18", color: "#b5a596", border: "1px solid rgba(243,234,217,.18)" }}>เร็ว ๆ นี้</span>}
              </Link>
            );
          })}
        </nav>

        {tab === "wallet" && <>
          {!adminView && sp.welcome === "1" && <p data-recruit-welcome className="m-0 rounded-xl text-[14px] text-[#1b130b] font-semibold text-center" style={{ padding: "10px 12px", background: "#e8c472" }}>สมัครสำเร็จ · คุณเป็น Recruit แล้ว 🎉 ตั้งรหัสผ่านด้านล่างไว้ใช้เข้าครั้งหน้า</p>}
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
          <form action="/api/sales/logout" method="post" className="mt-2">
            <button type="submit" className="w-full h-12 rounded-full text-[14px] font-semibold text-[#e8c472]" style={{ border: "1px solid rgba(232,196,114,.45)" }}>ออกจากระบบ Recruit</button>
          </form>
        </>}

        {tab === "parttime" && (pt.enabled
          ? <SalesBoard who="external" summary={sum} link={`${origin}/ref/${rep.code}`} tiers={{ gold: cfg.tiers.gold, black: cfg.tiers.black }} boostMult={cfg.boostMult} recruit={{ link: `${origin}/join/s/${rep.code}`, code: rep.code }} program={{ amount: pt.amount_satang, bonus: pt.bonus, note: pt.note }} hideMoney hideMember />
          : <Soon k="parttime" />)}
        {(tab === "partner" || tab === "collab" || tab === "member") && <Soon k={tab} amount={progs[tab].enabled ? progs[tab].amount_satang : 0} note={progs[tab].enabled ? progs[tab].note : ""} />}
      </main>
    </div>
  );
}

/** ส่วนที่ยังไม่เปิด (หรือเปิดแล้วแต่ยังไม่มีเครื่องมือในหน้า) — บอกเงื่อนไขถ้า CEO กำหนดไว้ */
function Soon({ k, amount = 0, note = "" }: { k: ProgramKey; amount?: number; note?: string }) {
  const L = PROGRAM_LABEL[k];
  return (
    <section data-recruit-soon={k} className="rounded-2xl bg-[#211a18] flex flex-col items-center gap-1.5 text-center" style={{ padding: "28px 18px", border: "1px solid rgba(232,196,114,.25)" }}>
      <b className="text-[17px]">{L.title}</b>
      {amount > 0
        ? <><span className="text-[15px] text-[#d9c9b4]">ค่าแนะนำ <b className="text-[#e8c472]">{baht(amount)} / {L.unit}</b></span>{note && <span className="text-[13px] text-[#b5a596]">{note}</span>}<span className="text-[13px] text-[#b5a596]">ลิงก์และรายชื่อจะขึ้นที่นี่เร็ว ๆ นี้</span></>
        : <><span className="text-[15px] text-[#d9c9b4]">ยังไม่เปิด · รอประกาศเงื่อนไข</span><span className="text-[13px] text-[#b5a596]">ตอนนี้เปิดเฉพาะ &quot;หา Part-time&quot; · เมื่อเปิดส่วนนี้ ระบบจะแจ้งค่าแนะนำและลิงก์ของคุณที่นี่</span></>}
    </section>
  );
}
