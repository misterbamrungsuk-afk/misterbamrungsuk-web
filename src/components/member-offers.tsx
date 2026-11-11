import Link from "next/link";

// การ์ดกระเป๋าเงินตามระดับเมม + ข้อเสนอเปิดเมม + คำอธิบาย Givouche (บอส 11 พ.ย. 2569)
// ใช้ร่วมกันในหน้า "บัญชีของฉัน" (server) และ "กระเป๋าเงิน" (client) — ไม่มี hook
export type MemberTier = "gold" | "black" | null;
export type OfferTier = { name: string; pay: number; credit: number };

const GOLD = "#e8c472";
const fmt = (n: number) => "฿" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** หน้าตาการ์ดกระเป๋าเงิน: ปกติ (น้ำตาลทอง) · GOLD (แดงไวน์) · BLACK (ดำทอง) */
export const WALLET_SKIN: Record<"none" | "gold" | "black", { bg: string; border: string; glow: string; label: string | null }> = {
  none: {
    bg: "radial-gradient(110% 130% at 100% 0%, rgba(232,196,114,.22), transparent 55%), linear-gradient(135deg, #3b2716, #24191a 60%, #2a1a17)",
    border: "rgba(232,196,114,.45)", glow: "0 14px 34px rgba(0,0,0,.35)", label: null,
  },
  gold: {
    bg: "radial-gradient(110% 130% at 100% 0%, rgba(232,196,114,.30), transparent 55%), radial-gradient(90% 120% at 0% 100%, rgba(200,16,46,.45), transparent 60%), linear-gradient(135deg, #6a1626, #3a0d16 55%, #4a1220)",
    border: "rgba(232,196,114,.7)", glow: "0 14px 36px rgba(160,20,40,.38)", label: "GOLD MEMBER",
  },
  black: {
    bg: "radial-gradient(110% 130% at 100% 0%, rgba(232,196,114,.30), transparent 50%), linear-gradient(135deg, #2b2724, #0c0a0a 55%, #1a1612)",
    border: "#e8c472", glow: "0 14px 38px rgba(232,196,114,.22)", label: "BLACK MEMBER",
  },
};
export const skinOf = (t: MemberTier) => WALLET_SKIN[t ?? "none"];

/** ป้ายระดับบนการ์ดกระเป๋า: GOLD MEMBER · +฿20,000 Givouche */
export function TierBadge({ tier, tiers }: { tier: MemberTier; tiers?: Partial<Record<"gold" | "black", OfferTier>> | null }) {
  if (!tier) return null;
  const t = tiers?.[tier];
  return (
    <span data-wallet-tier={tier} className="inline-flex items-center gap-1.5 rounded-full text-[11.5px] font-bold tracking-[.14em]" style={{ padding: "4px 10px", background: tier === "black" ? "linear-gradient(135deg,#fff1c9,#e8c472)" : "rgba(232,196,114,.18)", color: tier === "black" ? "#1b130b" : GOLD, border: tier === "black" ? "none" : "1px solid rgba(232,196,114,.45)" }}>
      {skinOf(tier).label}{t ? <span className="tracking-normal font-semibold">· +{fmt(t.credit - t.pay)} Givouche</span> : null}
    </span>
  );
}

/** การ์ดเปิดเมม Gold / Black — ยังไม่เป็นเมม = 2 ใบ · Gold = อัปเป็น Black · Black = ไม่แสดง */
export function MemberOffers({ tier, tiers, title }: { tier: MemberTier; tiers: Record<"gold" | "black", OfferTier>; title?: string }) {
  const offers = (["gold", "black"] as const).filter((k) => !tier || (tier === "gold" && k === "black"));
  if (!offers.length) return null;
  return (
    <section data-member-offers className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3"><b className="font-semibold text-[16px]">{title ?? (tier ? "อัปเกรดเมมเบอร์" : "เปิดเมมเบอร์ คุ้มกว่าเติมเงิน")}</b><Link href="/membership" className="text-[12.5px] font-light hover:text-[#e8c472]" style={{ color: GOLD }}>รายละเอียด ›</Link></div>
      <div className={`grid gap-2.5 ${offers.length > 1 ? "grid-cols-2" : ""}`}>
        {offers.map((k) => {
          const o = tiers[k], black = k === "black";
          return (
            <Link key={k} href={`/membership?tier=${k}`} data-offer={k} className="relative overflow-hidden rounded-[18px] flex flex-col gap-1 hover:-translate-y-0.5 transition" style={{ padding: "14px 14px 12px", color: "#f3ead9", background: WALLET_SKIN[k].bg, border: `1px solid ${WALLET_SKIN[k].border}` }}>
              <span className="text-[12px] font-bold tracking-[.2em]" style={{ color: GOLD }}>{o.name.toUpperCase()}</span>
              <span className="text-[12.5px] font-light text-[#d9c9b4]">จ่าย {fmt(o.pay)}</span>
              <span className="text-[13px] text-[#f1e3c8]">ได้เครดิต</span>
              <b className="text-[24px] leading-tight font-semibold [font-variant-numeric:tabular-nums]" style={{ color: "#fff1c9" }}>{fmt(o.credit)}</b>
              <span className="self-start mt-1 rounded-full text-[11.5px] font-semibold" style={{ padding: "3px 9px", background: "rgba(127,214,163,.16)", color: "#9fe0b4" }}>+{fmt(o.credit - o.pay)} Givouche</span>
              <span className="mt-2 h-10 rounded-[12px] grid place-items-center text-[13.5px] font-semibold" style={{ background: black ? GOLD : "rgba(232,196,114,.16)", color: black ? "#1b130b" : GOLD }}>เปิดเมม {o.name}</span>
            </Link>
          );
        })}
      </div>
      <GivoucheInfo />
    </section>
  );
}

/** Givouche ใช้กับอะไรได้บ้าง (กดกางดู) */
export function GivoucheInfo({ open = false }: { open?: boolean }) {
  const uses: [string, string][] = [
    ["M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z", "นัดเพื่อนกินเที่ยว และเพื่อนกินเที่ยว · นวด"],
    ["M3 21h18M5 21V5l7-3 7 3v16M10 21v-4h4v4", "สปา และโรงแรมพาร์ทเนอร์ในแอป"],
    ["M3 9l2-5h14l2 5M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0zM5 13v8h14v-8", "สินค้าผลิตภัณฑ์ใน Marketplace"],
    ["M12 8v13M3 8h18v4H3zM12 8S10 3 7 4.5 9 8 12 8zm0 0s2-5 5-3.5S15 8 12 8z", "ซื้อบัตรของขวัญให้คนพิเศษ"],
  ];
  return (
    <details data-givouche-info open={open} className="group rounded-[14px]" style={{ background: "rgba(127,214,163,.07)", border: "1px solid rgba(127,214,163,.22)" }}>
      <summary className="cursor-pointer list-none flex items-center gap-2 text-[13.5px] font-semibold text-[#9fe0b4]" style={{ padding: "10px 12px" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h0" /></svg>
        Givouche ใช้กับอะไรได้บ้าง?
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto transition group-open:rotate-180" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </summary>
      <div className="flex flex-col gap-2 text-[13px] text-[#e6d6c4]" style={{ padding: "0 12px 12px" }}>
        <p className="m-0 font-light text-[#d9c9b4]">Givouche คือเครดิตโบนัสที่ได้เพิ่มเมื่อเปิดเมม (ส่วนต่างระหว่างยอดที่จ่ายกับเครดิตที่ได้) เข้ากระเป๋าเงินทันทีที่สลิปผ่าน ใช้จ่ายในแอปได้เหมือนเงินที่เติม:</p>
        {uses.map(([d, t]) => (
          <div key={t} className="flex items-center gap-2.5"><span className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background: "rgba(127,214,163,.14)", color: "#9fe0b4" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg></span>{t}</div>
        ))}
      </div>
    </details>
  );
}
