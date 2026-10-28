import { allBalances } from "@/lib/wallet";
import { listApplicants } from "@/lib/join/store";
import { listReps } from "@/lib/member/store";
import { listPartners } from "@/lib/partner/store";
import { listVendors } from "@/lib/market/store";
import { listTopups } from "@/lib/wallet";
import { PageHead } from "../admin-nav";
import { WalletsBoard, type WalletRow } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "กระเป๋าเงินทุกคน · แอดมิน Mister Bamrungsuk" };

// กระเป๋าเงินทุกคน (28 ต.ค. 2569) — Part-Time · Recruit · พาร์ทเนอร์ · ร้านค้า · ลูกค้า: ยอดแยกช่อง + กดดูประวัติรายการ
export default async function WalletsPage() {
  const safe = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);
  const [bal, apps, reps, partners, vendors, topups] = await Promise.all([safe(allBalances()), safe(listApplicants()), safe(listReps()), safe(listPartners()), safe(listVendors()), safe(listTopups({ limit: 500 }))]);
  const name = new Map<string, { name: string; sub: string; view?: string }>();
  for (const a of apps) name.set(`parttime:${a.id}`, { name: `${a.first_name} ${a.last_name}${a.nickname ? ` (${a.nickname})` : ""}`, sub: a.mb_code, view: `/api/admin/applicants/${a.id}/preview` });
  for (const r of reps) name.set(`sales:${r.id}`, { name: r.name || "Recruit", sub: `Recruit ${r.code}`, view: `/recruit/me?rep=${r.id}` });
  for (const p of partners) name.set(`partner:${p.id}`, { name: p.business_name, sub: p.type });
  for (const v of vendors) name.set(`vendor:${v.id}`, { name: v.name, sub: "ร้านค้า" });
  for (const t of topups) if (t.customer_email) name.set(`customer:${t.customer_id}`, { name: t.customer_email, sub: "ลูกค้า" });
  const rows = new Map<string, WalletRow>();
  for (const b of bal) {
    if (b.owner_type === "platform") continue;
    const k = `${b.owner_type}:${b.owner_id}`;
    const n = name.get(k);
    const r = rows.get(k) ?? { key: k, type: b.owner_type as WalletRow["type"], id: b.owner_id, name: n?.name ?? b.owner_id.slice(0, 18), sub: n?.sub ?? "", view: n?.view ?? null, buckets: {}, total: 0 };
    r.buckets[b.bucket] = (r.buckets[b.bucket] ?? 0) + b.balance;
    if (b.bucket !== "spent") r.total += b.balance;
    rows.set(k, r);
  }
  const list = [...rows.values()].sort((a, b) => b.total - a.total);
  return (
    <>
      <PageHead title="กระเป๋าเงินทุกคน" sub="ยอดในกระเป๋าของ Part-Time · Recruit · พาร์ทเนอร์ · ร้านค้า · ลูกค้า · กดแถวเพื่อดูประวัติรายการ" />
      <WalletsBoard rows={list} />
    </>
  );
}
