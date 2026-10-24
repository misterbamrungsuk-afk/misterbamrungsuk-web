import "server-only";
import { extraOf, listApplicants } from "@/lib/join/store";
import { listBoosts } from "@/lib/join/boost";
import { listPurchases as listPartnerPurchases } from "@/lib/partner/portal";
import { listPartners } from "@/lib/partner/store";
import { listOrders } from "@/lib/market/store";
import { listTopups } from "@/lib/wallet";
import { listPurchases as listMemberPurchases } from "@/lib/member/store";

// ยอดเงินเข้า (บอสสั่ง 24 ต.ค. 2569) — รวมทุกช่องทางที่ลูกค้า/คู่ค้าโอนเงินเข้าบริษัท แยกตามระบบ
// Part-Time (ค่าสมัคร · ค่าโปรโมท) · Partner สปา/โรงแรม (แพ็กเกจ) · Collab MB x Bars (ยังไม่มีระบบ) · Marketplace (ออเดอร์) · ลูกค้า (เติมเงิน · เปิดเมม)
// เฉพาะเงินที่โอนเข้ามาจริง (QR + สลิป) — จ่ายด้วยกระเป๋าในระบบ/โค้ดฟรี ไม่ใช่เงินเข้าใหม่ จึงไม่นับ
export type IncomeSystem = "parttime" | "partner" | "collab" | "market" | "customer";
export type IncomeStatus = "in" | "pending" | "rejected" | "refunded";
export interface IncomeRow {
  id: string; at: string; system: IncomeSystem; kind: string;
  /** ผู้โอนตามระบบ (ชื่อ · รหัส) */ who: string;
  /** ชื่อผู้โอนบนสลิป (Slip2Go) */ sender: string | null;
  amount: number; status: IncomeStatus; href: string;
}
export const SYSTEM_LABEL: Record<IncomeSystem, string> = { parttime: "Part-Time", partner: "Partner สปา · โรงแรม", collab: "Collab · MB x Bars", market: "ร้านค้า Marketplace", customer: "ลูกค้า" };

const senderOf = (c: unknown) => { const s = (c as { sender?: unknown } | null | undefined)?.sender; return typeof s === "string" && s ? s : null; };

export async function listIncome(): Promise<IncomeRow[]> {
  const safe = <T,>(p: Promise<T[]>) => p.catch((e) => { console.error("income source", (e as Error)?.message); return [] as T[]; });
  const [apps, boosts, pps, partners, orders, topups, members] = await Promise.all([
    safe(listApplicants()), safe(listBoosts()), safe(listPartnerPurchases()), safe(listPartners()), safe(listOrders()), safe(listTopups({ limit: 500 })), safe(listMemberPurchases()),
  ]);
  const rows: IncomeRow[] = [];
  for (const a of apps) {
    if (!a.amount) continue; // สมัครฟรี (ลิงก์เชิญ/ทอมหล่อ) ไม่มีเงินเข้า
    const x = extraOf(a);
    rows.push({ id: `app:${a.id}`, at: a.created_at, system: "parttime", kind: `ค่าสมัคร สาย ${a.package}`, who: `${a.first_name} ${a.last_name} · ${a.mb_code}`, sender: senderOf(x.slip_check), amount: a.amount,
      status: a.status === "verified" ? "in" : a.status === "rejected" ? "rejected" : a.status === "refunded" ? "refunded" : "pending", href: "/admin/applicants" });
  }
  for (const b of boosts) {
    if (b.paid_via !== "slip") continue;
    rows.push({ id: `boost:${b.id}`, at: b.created_at, system: "parttime", kind: `ค่าโปรโมทโปรไฟล์ ${b.days} วัน`, who: b.mb, sender: senderOf(b.slip_check), amount: Math.round(b.price_satang / 100),
      status: b.status === "active" ? "in" : b.status === "rejected" ? "rejected" : "pending", href: "/admin/boosts" });
  }
  const pName = new Map(partners.map((p) => [p.id, `${p.business_name}${p.type ? ` (${p.type})` : ""}`]));
  for (const p of pps) {
    rows.push({ id: `partner:${p.id}`, at: p.created_at, system: "partner", kind: `แพ็กเกจพาร์ทเนอร์ ${p.package} · ${p.invoice_no}`, who: pName.get(p.partner_id) ?? p.partner_id.slice(0, 8), sender: senderOf((p as unknown as { slip_check?: unknown }).slip_check), amount: p.amount,
      status: p.status === "paid" ? "in" : p.status === "rejected" ? "rejected" : "pending", href: "/admin/partners" });
  }
  for (const o of orders) {
    if ((o.pay_method ?? "slip") !== "slip" || !o.slip_path) continue;
    rows.push({ id: `order:${o.id}`, at: o.created_at, system: "market", kind: `ออเดอร์ ${o.order_no}`, who: `${o.buyer_name} · ${o.phone}`, sender: senderOf(o.slip_check), amount: o.total,
      status: o.status === "rejected" ? "rejected" : o.status === "pending" ? "pending" : "in", href: "/admin/market" });
  }
  for (const t of topups) {
    rows.push({ id: `topup:${t.id}`, at: t.created_at, system: "customer", kind: "เติมเงินกระเป๋า", who: t.customer_email ?? t.customer_id.slice(0, 10), sender: senderOf(t.slip_check), amount: Math.round(t.amount_satang / 100),
      status: t.status === "credited" ? "in" : t.status === "rejected" ? "rejected" : "pending", href: "/admin/wallet" });
  }
  for (const m of members) {
    rows.push({ id: `member:${m.id}`, at: m.created_at, system: "customer", kind: `เปิดเมม ${m.tier === "black" ? "Black" : "Gold"}`, who: m.customer_email ?? m.customer_id.slice(0, 10), sender: senderOf(m.slip_check), amount: Math.round(m.pay_satang / 100),
      status: m.status === "credited" ? "in" : m.status === "rejected" ? "rejected" : "pending", href: "/admin/sales" });
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}
