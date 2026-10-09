"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MAX_QTY } from "@/lib/market/config";
import { readCart, writeCart, useCart } from "../../products/market-ui";
import { Back } from "../../hotels/venue-client";
import { Bottle, glowOf } from "../../products/m-kit";

type P = { id: string; name: string; price: number; stock: number; img: string; kind: string };
type R = { id: string; stars: number; text: string; who: string; item: string; at: string };
const BD = "rgba(240,200,90,.38)";
const CARD = "p-3.5 rounded-2xl bg-[#241717]";
const fmt = (n: number) => "฿" + n.toLocaleString("en-US");
const stars = (n: number) => { const k = Math.round(n); return "★".repeat(k) + "☆".repeat(5 - k); };
const ago = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d < 1 ? "วันนี้" : d < 7 ? `${d} วันก่อน` : d < 30 ? `${Math.floor(d / 7)} สัปดาห์ก่อน` : `${Math.floor(d / 30)} เดือนก่อน`;
};
const DOCS = (n: number) => [
  ["ทะเบียนพาณิชย์", "✓ ตรวจแล้ว · เลข [รอกำหนด]", "#7fd6a3"],
  ["ใบอนุญาตนำเข้าอาหาร", "✓ ตรวจแล้ว · เลข [รอกำหนด]", "#7fd6a3"],
  ["เลข อย. สินค้าทุกชิ้น", `✓ ${n}/${n} รายการ`, "#7fd6a3"],
  ["ที่อยู่ร้าน", "[รอกำหนด]", "#cdbfb3"],
];
const TABS = [["products", "สินค้า"], ["about", "เกี่ยวกับร้าน"], ["reviews", "รีวิว"]] as const;
type Tab = (typeof TABS)[number][0];

export function ShopView({ vendor, products, reviews, avg, count }: { vendor: { name: string; description: string; logo: string }; products: P[]; reviews: R[]; avg: number; count: number }) {
  const [tab, setTab] = useState<Tab>("products");
  const [follow, setFollow] = useState(false);
  const [toast, setToast] = useState("");
  const cart = useCart();
  const key = `mb_follow_${vendor.name}`;
  useEffect(() => { try { setFollow(localStorage.getItem(key) === "1"); } catch {} }, [key]);
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(""), 1800); };
  const toggleFollow = () => { const on = !follow; setFollow(on); try { if (on) localStorage.setItem(key, "1"); else localStorage.removeItem(key); } catch {} };
  const add = (p: P) => {
    const lines = readCart();
    const l = lines.find((x) => x.id === p.id);
    if (l) l.qty = Math.min(MAX_QTY, p.stock, l.qty + 1); else lines.push({ id: p.id, qty: 1 });
    writeCart(lines);
    flash(`เพิ่ม ${p.name} ลงตะกร้าแล้ว`);
  };
  const cartQty = cart.reduce((s, l) => s + l.qty, 0);
  return (
    <main className="min-h-dvh bg-[#0e0a0a] text-[#f6efe4] font-lux-body">
      <div className="max-w-[480px] mx-auto">
        <div className="relative h-[150px]" style={{ background: "linear-gradient(135deg, #3a1018, #241717 70%)" }}>
          <svg viewBox="0 0 390 150" preserveAspectRatio="xMaxYMid slice" className="absolute inset-0 w-full h-full" aria-hidden="true"><circle cx="330" cy="30" r="80" fill="none" stroke="rgba(212,175,55,.18)" strokeWidth="1.5" /><circle cx="330" cy="30" r="50" fill="none" stroke="rgba(212,175,55,.12)" strokeWidth="1.5" /><path d="M0 120 C100 90 200 140 390 100" stroke="rgba(194,29,51,.35)" strokeWidth="2" fill="none" /></svg>
          <div className="absolute top-4 left-[18px] right-[18px] flex justify-between">
            <Back href="/market" glass />
            <Link href="/cart" aria-label="ตะกร้า" className="relative w-11 h-11 rounded-full grid place-items-center text-[#f6efe4]" style={{ border: "1px solid rgba(246,239,228,.3)", background: "rgba(0,0,0,.45)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 7h14l-1.5 12h-11z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
              {cartQty > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#c8102e] text-[11px] grid place-items-center">{cartQty}</span>}
            </Link>
          </div>
        </div>
        <div className="px-[18px] -mt-9 relative flex flex-col gap-2.5">
          <div className="flex items-end gap-3">
            <div className="w-[76px] h-[76px] shrink-0 rounded-[20px] bg-[#0e0a0a] grid place-items-center font-lux font-bold text-[#ffd76a] text-[18px] overflow-hidden" style={{ border: "2px solid #f0c75a" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {vendor.logo ? <img src={vendor.logo} alt={vendor.name} className="w-full h-full object-cover" /> : vendor.name.slice(0, 4)}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="font-lux font-semibold text-[20px]">{vendor.name}</div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[#7fd6a3] text-[11px] font-semibold" style={{ border: "1px solid #3f8f63" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m5 12 5 5 9-10" /></svg>ร้านตรวจสอบแล้ว
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[12px] text-[#cdbfb3]">
            <span>สินค้า {products.length}</span>
            {count > 0 && <><span>·</span><span>★ {avg.toFixed(1)} ({count} รีวิว)</span></>}
            <span>·</span><span>ผู้ติดตาม [รอกำหนด]</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={toggleFollow} aria-pressed={follow} className={`flex-1 h-11 rounded-xl text-white font-semibold ${follow ? "" : "btn-red-lux"}`} style={follow ? { background: "#2f5e45", border: "1px solid #3f8f63" } : undefined}>{follow ? "ติดตามแล้ว ✓" : "+ ติดตามร้าน"}</button>
            <button type="button" onClick={() => flash("แชทกับร้าน · ช่องทางจริง [รอกำหนด]")} className="flex-1 h-11 rounded-xl bg-[#241717] text-[#ffd76a] font-semibold" style={{ border: `1px solid ${BD}` }}>แชทกับร้าน</button>
          </div>
          <div role="tablist" className="flex" style={{ borderBottom: `1px solid ${BD}` }}>
            {TABS.map(([k, label]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className="flex-1 min-h-[46px] bg-transparent text-[13.5px] font-semibold" style={{ borderBottom: `2px solid ${tab === k ? "#b0182c" : "transparent"}`, color: tab === k ? "#f6efe4" : "#cdbfb3" }}>{label}</button>)}
          </div>

          {tab === "products" && (products.length ? (
            <div className="grid grid-cols-2 gap-2.5">
              {products.map((p) => {
                const qn = cart.find((l) => l.id === p.id)?.qty ?? 0;
                return (
                  <div key={p.id} className="lux-card rounded-2xl bg-[#241717] overflow-hidden flex flex-col" style={{ border: `1px solid ${BD}` }}>
                    <Link href={`/products/${p.id}`} aria-label={p.name} className="relative h-[130px] grid place-items-center overflow-hidden" style={{ background: `radial-gradient(circle at 50% 40%, ${glowOf(p.id)[1]}, #140f0f 70%)` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.img ? <img src={p.img} alt="" className="w-full h-full object-cover" /> : <Bottle id={p.id} w={60} h={96} />}
                      <span className="absolute top-2 left-2 px-[7px] py-0.5 rounded-full bg-[#0e0a0a] text-[#7fd6a3] text-[10.5px] font-semibold" style={{ border: "1px solid #3f8f63" }}>มี อย.</span>
                    </Link>
                    <div className="p-2.5 flex flex-col gap-1 flex-1">
                      <span className="text-[11px] text-[#cdbfb3]">{vendor.name}</span>
                      <Link href={`/products/${p.id}`} className="font-lux font-semibold text-[13.5px] leading-[1.25] text-[#f6efe4] no-underline">{p.name}</Link>
                      {p.kind && <div className="text-[10.5px] text-[#7d6d6a]">{p.kind}</div>}
                      <div className="flex justify-between items-center mt-auto pt-1.5 gap-1">
                        <span className="font-lux font-semibold text-[#ffd76a]">{fmt(p.price)}</span>
                        {p.stock <= 0
                          ? <span className="h-9 px-2.5 rounded-[10px] text-[12px] text-[#7d6d6a] grid place-items-center" style={{ border: `1px solid ${BD}` }}>หมด</span>
                          : <button type="button" onClick={() => add(p)} aria-label={`เพิ่ม ${p.name} ลงตะกร้า`} className={`h-9 min-w-11 px-2.5 rounded-[10px] text-white text-[12px] font-semibold ${qn ? "" : "btn-red-lux"}`} style={qn ? { background: "#2f5e45", border: "1px solid #3f8f63" } : undefined}>{qn ? `ในตะกร้า ${qn}` : "+ ตะกร้า"}</button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className={`${CARD} text-center text-[13px] text-[#cdbfb3]`} style={{ border: `1px solid ${BD}` }}>ร้านนี้ยังไม่มีสินค้าที่เผยแพร่</div>)}

          {tab === "about" && <>
            <div className={`${CARD} text-[13px] text-[#d3c7bc] leading-[1.7] whitespace-pre-line`} style={{ border: `1px solid ${BD}` }}>{vendor.description || "คำอธิบายร้าน [รอกำหนด]"}</div>
            <div className={`${CARD} flex flex-col gap-2 text-[12.5px]`} style={{ border: `1px solid ${BD}` }}>
              <div className="font-lux font-semibold text-[14px]">เอกสารที่ Mister Bamrungsuk ตรวจแล้ว</div>
              {DOCS(products.length).map(([k, val, c]) => (
                <div key={k} className="flex justify-between gap-2.5 pt-2" style={{ borderTop: `1px solid ${BD}` }}><span className="text-[#cdbfb3]">{k}</span><span className="text-right" style={{ color: c }}>{val}</span></div>
              ))}
            </div>
            <div className={`${CARD} text-[12.5px] text-[#cdbfb3] leading-[1.7]`} style={{ border: `1px solid ${BD}` }}>ส่งจาก: [รอกำหนด] · จัดส่งภายใน 2–4 วันทำการ · แพ็กมิดชิดทุกออเดอร์<br /><Link href="/policy" className="text-[#ffd76a]">นโยบายคืนสินค้าและการจัดส่ง</Link></div>
          </>}

          {tab === "reviews" && <>
            <div className={`${CARD} flex gap-3.5 items-center`} style={{ border: `1px solid ${BD}` }}>
              <div className="text-center"><div className="font-lux font-semibold text-[30px] text-[#ffd76a]">{count ? avg.toFixed(1) : "–"}</div><div className="text-[#ffd76a] text-[13px]">{stars(avg)}</div><div className="text-[11px] text-[#cdbfb3]">{count} รีวิว</div></div>
              <div className="flex-1 text-[12px] text-[#cdbfb3] leading-[1.6]">รีวิวจากผู้ซื้อที่สั่งซื้อจริงเท่านั้น · แอดมินซ่อนรีวิวที่อ้างสรรพคุณทางการแพทย์</div>
            </div>
            {reviews.map((r) => (
              <div key={r.id} className={`${CARD} flex flex-col gap-1`} style={{ border: `1px solid ${BD}` }}>
                <div className="flex justify-between text-[12px]"><span className="text-[#ffd76a]">{stars(r.stars)}</span><span className="text-[#7d6d6a]">{ago(r.at)}</span></div>
                <div className="text-[13px] text-[#d3c7bc]">{r.text}</div>
                <div className="text-[11.5px] text-[#cdbfb3]">{r.who}{r.item ? ` · ${r.item}` : ""}</div>
              </div>
            ))}
          </>}
          <div className="h-6" />
        </div>
      </div>
      {toast && <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-6 w-[calc(min(100vw,480px)-36px)] px-3.5 py-3 rounded-xl bg-[#21191a] text-[#7fd6a3] text-[13px] z-50" style={{ border: "1px solid #3f8f63" }}>{toast}</div>}
    </main>
  );
}
