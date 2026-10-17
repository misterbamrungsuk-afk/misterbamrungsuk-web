import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { BrandBar } from "@/components/brand-bar";
import { SalesBoard } from "@/components/sales-board";
import { SALES_COOKIE, readSalesLink, repSummary } from "@/lib/member";
import { findRep } from "@/lib/member/store";
import { getMemberSettings } from "@/lib/member/tiers";
import { AvatarEditor } from "@/components/avatar-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "แดชบอร์ด Sale Man — Mister Bamrungsuk", robots: { index: false } };

// แดชบอร์ด Sale Man ภายนอก (เข้าผ่านลิงก์ที่ทีมงานส่งให้ /sales/go?t=)
export default async function SalesMe() {
  const id = readSalesLink((await cookies()).get(SALES_COOKIE)?.value);
  const rep = id ? await findRep({ id }) : null;
  if (!rep || rep.kind !== "external" || !rep.active) redirect("/sales?expired=1");
  const [sum, cfg] = await Promise.all([repSummary(rep), getMemberSettings()]);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "misterbamrungsuk.com"}`;
  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9" }}>
      <BrandBar />
      <main className="mx-auto w-full max-w-[640px] flex flex-col gap-3.5" style={{ padding: "12px 16px 32px", lineHeight: 1.6 }}>
        <div className="flex flex-col items-center gap-1"><AvatarEditor as="sales" letter={rep.name} size={104} /></div>
        <h1 className="m-0 text-[22px] font-semibold text-center">สวัสดี {rep.name} · Sale Man</h1>
        <SalesBoard who="external" summary={sum} link={`${origin}/ref/${rep.code}`} tiers={{ gold: cfg.tiers.gold, black: cfg.tiers.black }} boostMult={cfg.boostMult} />
      </main>
    </div>
  );
}
