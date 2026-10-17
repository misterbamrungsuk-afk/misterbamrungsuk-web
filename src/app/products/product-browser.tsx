"use client";

import { useMemo, useState } from "react";
import { SAMPLE_NOTE } from "@/lib/market/mock";
import { CartBar, Chip, LINE, MHeader, MProductCard, MShell, Toast, useToast, type CardP } from "./m-kit";

type Cat = { id: string; name: string; slug: string };
type V = { id: string; name: string; slug: string };
const PRICES = [["all", "ทุกราคา"], ["lt", "ต่ำกว่า ฿500"], ["mid", "฿500–1,000"], ["hi", "มากกว่า ฿1,000"]] as const;
type PriceK = (typeof PRICES)[number][0];
const SORTS = { rec: ["แนะนำ", "lo"], lo: ["ราคาต่ำ → สูง", "hi"], hi: ["ราคาสูง → ต่ำ", "rec"] } as const;
type SortK = keyof typeof SORTS;

export function ProductBrowser({ products, categories, vendors, initial, sample = false }: { products: CardP[]; categories: Cat[]; vendors: V[]; initial: { q: string; cat: string; vendor: string }; sample?: boolean }) {
  const [q, setQ] = useState(initial.q);
  const [cat, setCat] = useState(categories.find((c) => c.slug === initial.cat)?.id ?? "all");
  const [price, setPrice] = useState<PriceK>("all");
  const [vendor, setVendor] = useState(vendors.find((v) => v.slug === initial.vendor)?.id ?? "all");
  const [sort, setSort] = useState<SortK>("rec");
  const [open, setOpen] = useState(false);
  const { text, flash } = useToast();

  const inPrice = (n: number) => price === "all" || (price === "lt" && n < 500) || (price === "mid" && n >= 500 && n <= 1000) || (price === "hi" && n > 1000);
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    let r = products.filter((p) => (cat === "all" || p.category_id === cat) && inPrice(p.price) && (vendor === "all" || p.vendor_id === vendor) && (!k || `${p.name} ${p.description}`.toLowerCase().includes(k)));
    if (sort === "lo") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "hi") r = [...r].sort((a, b) => b.price - a.price);
    return r;
  }, [products, q, cat, price, vendor, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const nf = (price !== "all" ? 1 : 0) + (vendor !== "all" ? 1 : 0);
  const prices = Object.fromEntries(products.map((p) => [p.id, p.price]));
  const resetAll = () => { setQ(""); setCat("all"); setPrice("all"); setVendor("all"); };

  return (
    <MShell wide className="pb-[96px]">
      <MHeader back="/market" eyebrow="SHOP" title="สินค้าทั้งหมด" />
      <div className="px-[18px] pt-3 pb-5 flex flex-col gap-2.5">
        <div className="flex gap-2">
          <label className="flex-1 h-12 rounded-[14px] bg-[#211a18] px-3.5 flex items-center gap-2 border text-[#b5a596]" style={{ borderColor: q ? "#5a4a3a" : LINE }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาสินค้า" aria-label="ค้นหาสินค้า" className="flex-1 min-w-0 bg-transparent outline-none text-sm text-[#f3ead9] placeholder:text-[#b5a596]" />
          </label>
          {q && <button type="button" onClick={() => setQ("")} aria-label="ล้างคำค้นหา" className="w-12 h-12 rounded-[14px] border bg-[#211a18] text-[#d9c9b4]" style={{ borderColor: LINE }}>✕</button>}
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="shrink-0 h-12 px-3 rounded-[14px] border bg-[#211a18] text-[#e8c472] text-[13px] font-semibold" style={{ borderColor: nf ? "#e8c472" : LINE }}>ตัวกรอง{nf ? ` · ${nf}` : ""}</button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar" role="group" aria-label="หมวดหมู่">
          <Chip on={cat === "all"} onClick={() => setCat("all")}>ทั้งหมด</Chip>
          {categories.map((c) => <Chip key={c.id} on={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</Chip>)}
        </div>
        {open && (
          <div className="p-3.5 rounded-2xl bg-[#211a18] border flex flex-col gap-2.5" style={{ borderColor: LINE }}>
            <div className="flex flex-col gap-[5px] text-xs text-[#d9c9b4]">ช่วงราคา
              <div className="flex gap-2 overflow-x-auto no-scrollbar" role="group" aria-label="ช่วงราคา">{PRICES.map(([k, l]) => <Chip key={k} on={price === k} onClick={() => setPrice(k)}>{l}</Chip>)}</div>
            </div>
            <div className="flex flex-col gap-[5px] text-xs text-[#d9c9b4]">ร้านค้า
              <div className="flex gap-2 overflow-x-auto no-scrollbar" role="group" aria-label="ร้านค้า">
                <Chip on={vendor === "all"} onClick={() => setVendor("all")}>ทุกร้าน</Chip>
                {vendors.map((v) => <Chip key={v.id} on={vendor === v.id} onClick={() => setVendor(v.id)}>{v.name}</Chip>)}
              </div>
            </div>
            <button type="button" onClick={() => { setPrice("all"); setVendor("all"); }} className="min-h-10 rounded-xl border bg-[#21191a] text-[#d9c9b4] text-[12.5px]" style={{ borderColor: LINE }}>ล้างตัวกรอง</button>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-[12.5px] text-[#d9c9b4]">{list.length} รายการ{q.trim() ? ` · "${q.trim()}"` : ""}</span>
          <button type="button" onClick={() => setSort(SORTS[sort][1])} className="min-h-10 px-3 rounded-full border bg-[#211a18] text-[#e8c472] text-xs font-semibold" style={{ borderColor: LINE }}>เรียง: {SORTS[sort][0]}</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {list.map((p) => <MProductCard key={p.id} p={p} onAdded={flash} />)}
        </div>
        {!list.length && (
          <div className="p-3.5 rounded-2xl bg-[#211a18] border text-center text-[#d9c9b4] text-[13px]" style={{ borderColor: LINE }}>
            {products.length ? <>ไม่พบสินค้าที่ตรงกับตัวกรอง · <button type="button" onClick={resetAll} className="text-[#e8c472] min-h-11">ล้างทั้งหมด</button></> : "ยังไม่มีสินค้า"}
          </div>
        )}
        {sample && <p className="text-[11.5px] text-[#b5a596]">{SAMPLE_NOTE} · ใส่ตะกร้าเพื่อดูการใช้งานได้ แต่ยังสั่งซื้อไม่ได้</p>}
        <p className="text-[11.5px] text-[#b5a596] leading-relaxed">ผลิตภัณฑ์เสริมอาหารไม่มีผลในการป้องกันหรือรักษาโรค · จำหน่ายเฉพาะผู้มีอายุ 20 ปีขึ้นไป</p>
      </div>
      <Toast text={text} />
      <CartBar prices={prices} />
    </MShell>
  );
}
