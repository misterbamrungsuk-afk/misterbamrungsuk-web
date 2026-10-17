import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { PLATFORM, WalletError, balances, move, post, transRefUsed, type Leg, type OwnerType } from "@/lib/wallet";
import { verifySlip } from "@/lib/slip2go";
import { notify } from "@/lib/bookings";
import { getProfile, updateProfile } from "@/lib/customer/profile";
import { putFile, listApplicants } from "@/lib/join/store";
import { sessionSecret } from "@/lib/session-secret";
import { getMemberSettings, isTier, type TierId } from "./tiers";
import {
  addPoints, demo, dropPayout, findRep, getPurchase, insertPayout, insertPurchase, insertRep, listPayouts, listPurchases, now, patchPayout, patchPurchase, transRefTaken,
  type MemberPurchase, type SalesPayout, type SalesRep,
} from "./store";

// เปิดเมม Gold/Black (จ่าย QR+สลิป → เครดิตเข้ากระเป๋า + โบนัสค่าการตลาด) · ค่าคอม Sale Man · แต้ม
// เงินทุกก้อนผ่าน ledger บัญชีคู่: เปิดเมม = bank −จ่าย · marketing −โบนัส · customer.available +เครดิต (ใน transaction เดียวกับการเปลี่ยนสถานะ)
export class MemberError extends Error {}
const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH");
const RANK: Record<TierId, number> = { gold: 1, black: 2 };

/** ผู้แนะนำ: โค้ด Sale Man (Part-Time หรือภายนอก) ที่ยังเปิดใช้ */
async function referrerOf(code: string | null | undefined): Promise<SalesRep | null> {
  const c = String(code ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(c)) return null;
  const r = await findRep({ code: c }).catch(() => null);
  return r?.active ? r : null;
}
const ownerOf = (r: SalesRep): { type: OwnerType; id: string } => (r.kind === "parttime" ? { type: "parttime", id: r.parttime_id! } : { type: "sales", id: r.id });

/** ลูกค้าส่งสลิปเปิดเมม — Slip2Go ผ่าน = เข้ากระเป๋าทันที · ไม่ชัด = รอแอดมินตรวจ · ซ้ำ/ผิดบัญชี/ยอดไม่ตรง = ไม่รับ */
export async function buyMembership(me: { sub: string; email: string }, tierId: string, slip: File, refCode?: string | null): Promise<MemberPurchase> {
  const cfg = await getMemberSettings();
  if (!cfg.enabled) throw new MemberError("ยังไม่เปิดขายเมมเบอร์");
  if (!isTier(tierId)) throw new MemberError("เลือกระดับเมมเบอร์");
  const t = cfg.tiers[tierId];
  const check = await verifySlip(slip, t.pay);
  if (check?.verdict === "dup") throw new MemberError("สลิปนี้เคยใช้แล้ว");
  if (check?.verdict === "acct") throw new MemberError("สลิปนี้โอนเข้าบัญชีอื่น กรุณาโอนผ่าน QR ในหน้านี้");
  if (check?.verdict === "amt") throw new MemberError(`ยอดในสลิปไม่ตรง (ต้องโอน ${baht(t.pay * 100)})`);
  if (check?.trans_ref && ((await transRefTaken(check.trans_ref)) || (await transRefUsed(check.trans_ref)))) throw new MemberError("สลิปนี้เคยใช้แล้ว");
  // ผู้แนะนำ: ห้ามแนะนำตัวเอง (Part-Time ที่อีเมลเดียวกับลูกค้า)
  let rep = await referrerOf(refCode);
  if (rep?.kind === "parttime") {
    const a = (await listApplicants().catch(() => [])).find((x) => x.id === rep!.parttime_id);
    if (a?.email && a.email.toLowerCase() === me.email.toLowerCase()) rep = null;
  }
  const id = crypto.randomUUID();
  const slip_path = `member/${me.sub.replace(/[^a-zA-Z0-9._@-]/g, "_")}/${id}.${slip.type === "image/png" ? "png" : slip.type === "image/webp" ? "webp" : "jpg"}`;
  await putFile(slip_path, slip);
  let row: MemberPurchase;
  try {
    row = await insertPurchase({
      customer_id: me.sub, customer_email: me.email, tier: tierId, pay_satang: t.pay * 100, credit_satang: t.credit * 100, bonus_satang: (t.credit - t.pay) * 100,
      status: "pending", slip_path, slip_check: check, trans_ref: check?.trans_ref ?? null, ref_code: rep?.code ?? null,
      referrer_type: rep ? (rep.kind === "parttime" ? "parttime" : "sales") : null, referrer_id: rep ? ownerOf(rep).id : null,
      commission_satang: rep ? t.commission * 100 : 0, commission_mode: rep ? "cash" : null, reason: null,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "dup_slip") throw new MemberError("สลิปนี้เคยใช้แล้ว");
    throw e;
  }
  if (check?.verdict === "ok") return (await creditMembership(row.id, "slip2go")) ?? row;
  await notify({ user_type: "admin", user_id: "finance", kind: "member_slip", title: `สลิปเปิดเมม ${t.name} รอตรวจ`, body: `${me.email} · ${baht(row.pay_satang)}`, url: "/admin/sales" });
  return row;
}

/** เข้ากระเป๋า + ตั้งระดับ + ค่าคอมผู้แนะนำ (ครั้งเดียว — สถานะ pending เท่านั้น) */
export async function creditMembership(id: string, actor: string): Promise<MemberPurchase | null> {
  const p = await getPurchase(id);
  if (!p || p.status !== "pending") throw new MemberError("รายการนี้ไม่ได้รอตรวจ");
  const legs: Leg[] = [
    { owner_type: "platform", owner_id: PLATFORM, bucket: "bank", amount: -p.pay_satang },
    { owner_type: "platform", owner_id: PLATFORM, bucket: "marketing", amount: -p.bonus_satang },
    { owner_type: "customer", owner_id: p.customer_id, bucket: "available", amount: p.credit_satang },
  ];
  const r = await move<MemberPurchase>({ table: "member_purchases", id, from: ["pending"], patch: { status: "credited", credited_at: now() }, demoRow: () => demo.purchases.find((x) => x.id === id) },
    { kind: "member", ref: { type: "member_purchase", id }, idem: `member:${id}`, note: `เปิดเมม ${p.tier === "black" ? "Black" : "Gold"} · จ่าย ${baht(p.pay_satang)} ได้ ${baht(p.credit_satang)}`, actor, legs: legs.filter((l) => l.amount !== 0) });
  if (!r) throw new MemberError("รายการนี้ถูกดำเนินการไปแล้ว");
  // ระดับ: ขึ้นได้อย่างเดียว · เลขบัตรออกครั้งแรก
  const email = p.customer_email ?? "";
  const prof = await getProfile(p.customer_id, email);
  const tier = !prof.member_tier || RANK[p.tier] > RANK[prof.member_tier] ? p.tier : prof.member_tier;
  await updateProfile(p.customer_id, email, { member_tier: tier, member_since: prof.member_since ?? now(), member_no: prof.member_no ?? memberNo(p.customer_id) }).catch((e) => console.error("member tier", e));
  await notify({ user_type: "customer", user_id: p.customer_id, kind: "member", title: `ยินดีต้อนรับสู่ ${tier === "black" ? "Black" : "Gold"} Member`, body: `${baht(p.credit_satang)} เข้ากระเป๋าแล้ว`, url: "/membership" });
  // ค่าคอม (เงินสด) → ผู้แนะนำ
  if (p.referrer_type && p.referrer_id && p.commission_satang > 0) {
    await post("commission", { type: "member_purchase", id }, `commission:${id}`, `ค่าคอมแนะนำเปิดเมม ${p.tier === "black" ? "Black" : "Gold"}`, actor, [
      { owner_type: "platform", owner_id: PLATFORM, bucket: "marketing", amount: -p.commission_satang },
      { owner_type: p.referrer_type, owner_id: p.referrer_id, bucket: "available", amount: p.commission_satang },
    ]);
    await patchPurchase(id, ["credited"], { commission_paid_at: now() });
    if (p.referrer_type === "parttime") await notify({ user_type: "parttime", user_id: p.referrer_id, kind: "commission", title: `ได้ค่าคอม ${baht(p.commission_satang)}`, body: "ลูกค้าที่คุณชวนเปิดเมมแล้ว · ถอนได้ หรือแปลงเป็นวงเงินโปรโมท ×2", url: "" });
  }
  return r;
}
const memberNo = (sub: string) => "MBM" + createHmac("sha256", "member-no").update(sub).digest("hex").slice(0, 8).toUpperCase();

export async function rejectMembership(id: string, admin: string, reason: string) {
  const r = await patchPurchase(id, ["pending"], { status: "rejected", reason: reason.slice(0, 200) || "สลิปไม่ผ่าน" });
  if (!r) throw new MemberError("รายการนี้ไม่ได้รอตรวจ");
  await notify({ user_type: "customer", user_id: r.customer_id, kind: "member", title: "สลิปเปิดเมมไม่ผ่าน", body: `${r.reason} · ติดต่อทีมงานทาง LINE`, url: "/membership" });
  return r;
}

/** Part-Time แปลงค่าคอมของรายการนี้เป็นวงเงินโปรโมท (× boostMult) — ใช้กับโปรโมทโปรไฟล์ได้เท่านั้น */
export async function convertCommissionToBoost(parttime_id: string, purchaseId: string) {
  const cfg = await getMemberSettings();
  const p = await getPurchase(purchaseId);
  if (!p || p.referrer_type !== "parttime" || p.referrer_id !== parttime_id || p.status !== "credited" || !p.commission_paid_at) throw new MemberError("ไม่พบค่าคอมรายการนี้");
  if (p.commission_mode === "boost") throw new MemberError("แปลงเป็นวงเงินโปรโมทแล้ว");
  const extra = Math.round(p.commission_satang * (cfg.boostMult - 1));
  try {
    const legs: Leg[] = [
      { owner_type: "parttime", owner_id: parttime_id, bucket: "available", amount: -p.commission_satang },
      { owner_type: "platform", owner_id: PLATFORM, bucket: "marketing", amount: -extra },
      { owner_type: "parttime", owner_id: parttime_id, bucket: "boost_credit", amount: p.commission_satang + extra },
    ];
    await post("commission", { type: "member_purchase", id: purchaseId }, `commission-boost:${purchaseId}`, `แปลงค่าคอมเป็นวงเงินโปรโมท ×${cfg.boostMult}`, `parttime:${parttime_id}`, legs.filter((l) => l.amount !== 0));
  } catch (e) {
    if (e instanceof WalletError) throw new MemberError("ยอดถอนได้ไม่พอ (ถอนค่าคอมไปแล้ว)");
    throw e;
  }
  await patchPurchase(purchaseId, ["credited"], { commission_mode: "boost" });
  return { credit: p.commission_satang + extra };
}

/** แต้ม: ยอดที่ลูกค้าจ่ายจริง (สตางค์) × อัตราตามระดับ · ref กันให้ซ้ำ */
export async function awardPoints(customer_id: string, email: string, paidSatang: number, ref: string, reason: string) {
  if (paidSatang <= 0 || customer_id.startsWith("guest")) return 0;
  const cfg = await getMemberSettings();
  const prof = await getProfile(customer_id, email).catch(() => null);
  const rate = prof?.member_tier ? cfg.tiers[prof.member_tier].pointsPer100 : cfg.basePointsPer100;
  const pts = Math.floor((paidSatang / 100 / 100) * rate);
  if (pts > 0) await addPoints(customer_id, pts, reason, ref);
  return pts;
}

// ── Sale Man ──
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
async function uniqueCode() { for (let i = 0; i < 8; i++) { const c = newCode(); if (!(await findRep({ code: c }))) return c; } throw new Error("code"); }

/** Part-Time ทุกคนได้โค้ดแนะนำของตัวเองอัตโนมัติ */
export async function repForParttime(a: { id: string; nickname?: string | null; first_name?: string | null; tel?: string | null }): Promise<SalesRep> {
  return (await findRep({ parttime_id: a.id })) ?? insertRep({ code: await uniqueCode(), kind: "parttime", parttime_id: a.id, name: a.nickname || a.first_name || "", phone: a.tel ?? null, bank: null, active: true, created_by: "auto" });
}
export async function createExternalRep(input: { name: string; phone: string; bank: SalesRep["bank"] }, by: string): Promise<SalesRep> {
  if (!input.name.trim()) throw new MemberError("กรอกชื่อ Sale Man");
  return insertRep({ code: await uniqueCode(), kind: "external", parttime_id: null, name: input.name.trim().slice(0, 80), phone: input.phone.trim().slice(0, 20) || null, bank: input.bank, active: true, created_by: by });
}

/** สรุปผลงาน Sale Man: คนที่ชวน (ชื่อปิดบางส่วน) + ค่าคอม + ยอดในกระเป๋า */
export async function repSummary(rep: SalesRep) {
  const o = ownerOf(rep);
  const [rows, bal, payouts] = await Promise.all([listPurchases({ referrer_id: o.id }), balances(o.type, o.id).catch(() => ({} as Record<string, number>)), rep.kind === "external" ? listPayouts({ rep_id: rep.id }) : Promise.resolve([] as SalesPayout[])]);
  const mine = rows.filter((r) => r.referrer_type === (rep.kind === "parttime" ? "parttime" : "sales"));
  const mask = (e: string | null) => { const [u, d] = String(e ?? "ลูกค้า").split("@"); return d ? `${u.slice(0, 2)}***@${d}` : u; };
  return {
    rep: { code: rep.code, kind: rep.kind, name: rep.name, active: rep.active },
    referrals: mine.map((r) => ({ id: r.id, who: mask(r.customer_email), tier: r.tier, status: r.status, commission: r.commission_satang, mode: r.commission_mode, at: r.credited_at ?? r.created_at })),
    earned: mine.filter((r) => r.status === "credited").reduce((t, r) => t + r.commission_satang, 0),
    available: bal.available ?? 0, boostCredit: bal.boost_credit ?? 0, withdrawing: bal.withdrawing ?? 0,
    payouts: payouts.slice(0, 20),
  };
}

// ลิงก์เข้าแดชบอร์ด Sale Man ภายนอก (ลงลายเซ็น · อายุ 90 วัน) — แบบเดียวกับ /join/go ของ Part-Time
export const SALES_COOKIE = "mb_sales";
export function signSalesLink(repId: string, days = 90) {
  const body = Buffer.from(JSON.stringify({ r: repId, exp: Date.now() + days * 86400_000 })).toString("base64url");
  return body + "." + createHmac("sha256", sessionSecret()).update("sales:" + body).digest("base64url");
}
export function readSalesLink(t: string | null | undefined): string | null {
  const [body, sig] = String(t ?? "").split(".");
  if (!body || !sig) return null;
  const want = createHmac("sha256", sessionSecret()).update("sales:" + body).digest("base64url");
  if (want.length !== sig.length || !timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  try { const v = JSON.parse(Buffer.from(body, "base64url").toString()) as { r: string; exp: number }; return v.exp > Date.now() ? v.r : null; } catch { return null; }
}

// ── จ่ายค่าคอม Sale Man ภายนอก: ขอ → CEO อนุมัติ → แอดมินโอนแล้วเช็ก ──
export async function requestSalesPayout(rep: SalesRep, amountBaht: number): Promise<SalesPayout> {
  if (rep.kind !== "external") throw new MemberError("Part-Time ถอนค่าคอมผ่านหน้าถอนเงินของตัวเอง");
  if (!rep.bank?.account) throw new MemberError("ยังไม่มีบัญชีรับเงิน · ติดต่อทีมงาน");
  const amt = Math.round(amountBaht) * 100;
  if (!(amt >= 10000)) throw new MemberError("ขอรับขั้นต่ำ ฿100");
  let row: SalesPayout;
  try { row = await insertPayout({ rep_id: rep.id, amount_satang: amt, bank: rep.bank, status: "requested", note: null }); }
  catch (e) { if (e instanceof Error && e.message === "open_payout") throw new MemberError("มีคำขอรับค่าคอมที่รอดำเนินการอยู่แล้ว"); throw e; }
  try {
    const r = await move<SalesPayout>({ table: "sales_payouts", id: row.id, from: ["requested"], patch: { status: "requested" }, demoRow: () => demo.payouts.find((x) => x.id === row.id) },
      { kind: "sales_payout", ref: { type: "sales_payout", id: row.id }, idem: `sreq:${row.id}`, note: `ขอรับค่าคอม ${baht(amt)}`, actor: `sales:${rep.id}`, legs: [
        { owner_type: "sales", owner_id: rep.id, bucket: "available", amount: -amt },
        { owner_type: "sales", owner_id: rep.id, bucket: "withdrawing", amount: amt },
      ] });
    if (!r) throw new MemberError("สร้างคำขอไม่สำเร็จ");
    await notify({ user_type: "admin", user_id: "ceo", kind: "sales_payout", title: `ขอรับค่าคอม Sale Man ${rep.name} ${baht(amt)} · รอ CEO อนุมัติ`, body: rep.code, url: "/admin/payroll" });
    return r;
  } catch (e) {
    await dropPayout(row.id).catch(() => {});
    if (e instanceof WalletError) throw new MemberError("ยอดค่าคอมไม่พอ");
    throw e;
  }
}
export async function approveSalesPayout(id: string, ceo: string) {
  const r = await patchPayout(id, ["requested"], { status: "approved", approved_by: ceo, approved_at: now() });
  if (!r) throw new MemberError("คำขอนี้ไม่ได้รออนุมัติ");
  await notify({ user_type: "admin", user_id: "finance", kind: "sales_payout", title: "CEO อนุมัติค่าคอม Sale Man · รอโอน", body: baht(r.amount_satang), url: "/admin/sales" });
  return r;
}
/** ปิดคำขอ: โอนแล้ว (ต้อง CEO อนุมัติก่อน) / ไม่สำเร็จหรือไม่อนุมัติ = คืนยอด */
export async function settleSalesPayout(id: string, actor: string, paid: boolean, note = "") {
  const all = await listPayouts();
  const w = all.find((x) => x.id === id);
  const from: SalesPayout["status"][] = paid ? ["approved"] : ["requested", "approved"];
  if (!w || !from.includes(w.status)) throw new MemberError(paid && w?.status === "requested" ? "รอ CEO อนุมัติก่อนโอน" : "คำขอนี้ปิดไปแล้ว");
  const legs: Leg[] = paid
    ? [{ owner_type: "sales", owner_id: w.rep_id, bucket: "withdrawing", amount: -w.amount_satang }, { owner_type: "platform", owner_id: PLATFORM, bucket: "bank", amount: w.amount_satang }]
    : [{ owner_type: "sales", owner_id: w.rep_id, bucket: "withdrawing", amount: -w.amount_satang }, { owner_type: "sales", owner_id: w.rep_id, bucket: "available", amount: w.amount_satang }];
  const r = await move<SalesPayout>({ table: "sales_payouts", id, from, patch: paid ? { status: "paid", paid_at: now() } : { status: "failed", note: note.slice(0, 200) }, demoRow: () => demo.payouts.find((x) => x.id === id) },
    { kind: "sales_payout", ref: { type: "sales_payout", id }, idem: `ssettle:${id}`, note: paid ? `โอนค่าคอมแล้ว ${baht(w.amount_satang)}` : `คืนยอดค่าคอม · ${note}`, actor, legs });
  if (!r) throw new MemberError("คำขอนี้ปิดไปแล้ว");
  return r;
}
