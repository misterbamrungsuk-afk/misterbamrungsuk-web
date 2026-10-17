"use client";

import Link from "next/link";
import { useState } from "react";
import { AGE_NOTICE, GENERAL_WARNING, MAX_QTY, imageUrl } from "@/lib/market/config";
import { useCart } from "../market-ui";
import { Bottle, BoxIcon, CartCount, CartIcon, Chip, LINE, RED_GRAD, addToCart, fmt, glowOf, type CardP } from "../m-kit";
import { ReviewForm } from "../review-form";
import { SiteHeader } from "@/components/site-header";

type R = { id: string; name: string; stars: number; text: string; created_at: string };
const card = "p-3.5 rounded-2xl bg-[#211a18] border";
const stars = (n: number) => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
const ago = (iso: string) => {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return d < 1 ? "วันนี้" : d < 7 ? `${d} วันก่อน` : d < 30 ? `${Math.floor(d / 7)} สัปดาห์ก่อน` : d < 365 ? `${Math.floor(d / 30)} เดือนก่อน` : new Date(iso).toLocaleDateString("th-TH");
};

export function ProductDetailView({ p, kind, vendor, bundle, bundleAuto, related, reviews, ship }: {
  p: CardP; kind: string; vendor: { name: string; slug: string; count: number } | null; bundle: CardP[]; bundleAuto: boolean; related: CardP[]; reviews: R[];
  ship: { fee: number | null; free: number | null; days: string };
}) {
  const imgs = p.images.map((x) => imageUrl(x)).filter(Boolean) as string[];
  const [view, setView] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState("");
  const [bun, setBun] = useState<Record<string, boolean>>(() => (bundle[0] ? { [bundle[0].id]: true } : {}));
  const [rf, setRf] = useState<"all" | "5" | "low">("all");
  const [more, setMore] = useState(false);
  const lines = useCart();
  const inCart = lines.find((l) => l.id === p.id)?.qty ?? 0;
  const cap = Math.max(1, Math.min(MAX_QTY, p.stock));
  const out = p.stock <= 0;
  const [, glow] = glowOf(p.id);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : 0;
  const rl = reviews.filter((r) => rf === "all" || (rf === "5" && r.stars === 5) || (rf === "low" && r.stars < 5));
  const shown = more ? rl : rl.slice(0, 2);
  const bSel = [p, ...bundle.filter((b) => bun[b.id])];
  const bSum = bSel.reduce((s, b) => s + b.price, 0);
  const shipText = ship.fee == null ? "[รอกำหนด]" : ship.fee === 0 ? "ส่งฟรี" : `${fmt(ship.fee)}${ship.free != null ? ` · ส่งฟรีเมื่อครบ ${fmt(ship.free)}` : ""}`;

  const flash = (t: string) => { setAdded(t); setTimeout(() => setAdded(""), 2500); };
  const add = () => {
    const n = addToCart(p.id, p.stock, qty);
    flash(n == null ? "ครบจำนวนสูงสุดในตะกร้าแล้ว" : "เพิ่มลงตะกร้าแล้ว");
  };
  const addBundle = () => {
    let k = 0;
    for (const b of bSel) if (addToCart(b.id, b.stock) != null) k++;
    flash(`เพิ่ม ${k} รายการลงตะกร้าแล้ว`);
  };
  const circle = "w-11 h-11 rounded-full border border-[rgba(246,239,228,.3)] bg-black/40 grid place-items-center text-[#f3ead9] relative";

  return (
    <main className="mb-v7 mb-c w-full max-w-[480px] md:max-w-[760px] mx-auto min-h-dvh bg-[#171211] text-[#f3ead9] relative overflow-x-hidden pb-[100px]">
      <SiteHeader />
      <div className="relative h-[320px] grid place-items-center overflow-hidden" style={{ background: `radial-gradient(circle at 50% 45%, ${glow}, #171211 72%)` }}>
        {imgs.length
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={imgs[view] ?? imgs[0]} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
          : <Bottle id={p.id} w={130} h={210} />}
        <div className="absolute top-4 left-[18px] right-[18px] flex justify-between z-10">
          <Link href="/products" aria-label="ย้อนกลับ" className={circle}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m15 18-6-6 6-6" /></svg></Link>
          <Link href="/cart" aria-label="ตะกร้า" className={circle}><CartIcon /><CartCount /></Link>
        </div>
        {imgs.length > 1 && (
          <div className="absolute bottom-3 flex gap-2">
            {imgs.map((_, i) => (
              <button key={i} type="button" onClick={() => setView(i)} aria-label={`รูปที่ ${i + 1}`} className="min-w-11 h-8 px-2.5 rounded-full border text-[11.5px]"
                style={{ borderColor: view === i ? "#e8c472" : LINE, background: view === i ? "#e8c472" : "rgba(0,0,0,.45)", color: view === i ? "#1b130b" : "#d9c9b4" }}>{i + 1}</button>
            ))}
          </div>
        )}
      </div>

      <div className="px-[18px] pt-1 pb-[18px] flex flex-col gap-3">
        <div>
          {vendor && <Link href={`/shop/${vendor.slug}`} className="text-xs text-[#d9c9b4]">{vendor.name} ›</Link>}
          <h1 className="mt-0.5 mb-1 font-lux font-bold text-2xl">{p.name}</h1>
          {reviews.length > 0 && <a href="#reviews" className="inline-flex min-h-7 items-center text-[#e8c472] text-[13px]">{stars(Math.round(avg))} <span className="text-[#d9c9b4] ml-1">{avg.toFixed(1)} · {reviews.length} รีวิว</span></a>}
          <div className="flex gap-1.5 flex-wrap mt-1">
            <span className="px-[9px] py-[3px] rounded-full border border-[#3f8f63] text-[#7fd6a3] text-[11.5px] font-semibold">มี อย.</span>
            {kind && <span className="px-[9px] py-[3px] rounded-full border text-[#d9c9b4] text-[11.5px]" style={{ borderColor: LINE }}>{kind}</span>}
            {p.age_restricted && <span className="px-[9px] py-[3px] rounded-full border border-[#b0182c] text-[#ef8a97] text-[11.5px]">เฉพาะ 20 ปีขึ้นไป</span>}
          </div>
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="font-lux font-bold text-[28px] text-[#e8c472]">{fmt(p.price)}</span>
          <span className="text-xs text-[#b5a596]">{out ? "สินค้าหมดชั่วคราว" : `รวม VAT · คงเหลือ ${p.stock} ชิ้น`}</span>
        </div>
        {p.sample && <p className="-mt-2 text-[11.5px] text-[#b5a596]">สินค้าตัวอย่าง · ใส่ตะกร้าได้ แต่ยังสั่งซื้อไม่ได้จนกว่าร้านค้าจะลงสินค้าจริง</p>}
        <div className={`${card} text-[13px] leading-[1.7] text-[#d9c9b4]`} style={{ borderColor: LINE }}>
          {kind ? `${kind} · ` : ""}มี อย.<br />
          <span className="text-[#d9c9b4]">เลข อย.</span> <b className="text-[#f3ead9] tabular-nums">{p.fda_no}</b>
          {p.description && <p className="mt-2 whitespace-pre-line">{p.description}</p>}
        </div>
        <div className={`${card} text-[12.5px] leading-[1.7] text-[#d9c9b4]`} style={{ borderColor: "rgba(227,195,92,.45)", background: "#1d1712" }}>
          <b className="text-[#e8c472]">คำเตือน</b><br />
          {p.warning && <span className="whitespace-pre-line">{p.warning} · </span>}{GENERAL_WARNING}{p.age_restricted ? ` · ${AGE_NOTICE}` : ""}
        </div>
        <div className={`${card} flex flex-col gap-2 text-[12.5px]`} style={{ borderColor: LINE }}>
          <div className="flex justify-between gap-3"><span className="text-[#d9c9b4]">จัดส่งถึง</span><span>ทั่วประเทศ</span></div>
          <div className="flex justify-between gap-3"><span className="text-[#d9c9b4]">ได้รับประมาณ</span><span className="text-right">{ship.days || "[รอกำหนด]"} หลังยืนยันสลิป</span></div>
          <div className="flex justify-between gap-3"><span className="text-[#d9c9b4]">ค่าส่ง</span><span className="text-right">{shipText}</span></div>
          <div className="flex gap-2 items-center pt-2 border-t text-[#d9c9b4]" style={{ borderColor: LINE }}><span className="text-[#e8c472]"><BoxIcon /></span>แพ็กมิดชิด · กล่องสีพื้น ไม่ระบุชื่อสินค้าหรือชื่อร้านบนกล่อง</div>
        </div>
        {vendor && (
          <Link href={`/shop/${vendor.slug}`} className={`${card} lux-card flex items-center gap-3 text-[#f3ead9]`} style={{ borderColor: LINE }}>
            <span className="w-11 h-11 shrink-0 rounded-xl border-[1.5px] border-[#e8c472] grid place-items-center font-lux text-[11px] text-[#e8c472] overflow-hidden px-1 text-center leading-tight">{vendor.name.slice(0, 6)}</span>
            <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{vendor.name}</span><span className="inline-flex items-center gap-1 text-[11.5px] text-[#7fd6a3]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="m5 12 5 5 9-10" /></svg>ร้านตรวจสอบแล้ว · สินค้า {vendor.count}</span></span>
            <span className="text-[#e8c472] text-[12.5px]">ดูร้าน ›</span>
          </Link>
        )}

        {bundle.length > 0 && (
          <>
            <div className="font-lux font-semibold text-base mt-1">ซื้อคู่กัน <span className="text-[11.5px] text-[#b5a596] font-normal">{bundleAuto ? "แนะนำจากที่มักซื้อด้วยกัน" : "ร้านแนะนำ"}</span></div>
            <div className={`${card} flex flex-col gap-2.5`} style={{ borderColor: LINE }}>
              {[p, ...bundle].map((b) => {
                const fixed = b.id === p.id, on = fixed || !!bun[b.id];
                const src = imageUrl(b.images[0]);
                return (
                  <button key={b.id} type="button" role="checkbox" aria-checked={on} onClick={() => !fixed && setBun({ ...bun, [b.id]: !on })} className="flex items-center gap-2.5 text-left min-h-[52px]">
                    <span className="w-[22px] h-[22px] shrink-0 rounded-md border-[1.5px] grid place-items-center text-white text-[13px]" style={{ borderColor: on ? "#e8c472" : "#5a4a3a", background: on ? "#e8c472" : "transparent" }}>{on ? "✓" : ""}</span>
                    <span className="w-11 h-[52px] shrink-0 rounded-[10px] grid place-items-center overflow-hidden" style={{ background: `radial-gradient(circle, ${glowOf(b.id)[1]}, #140f0f 75%)` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <Bottle id={b.id} w={24} h={38} />}
                    </span>
                    <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-semibold">{b.name}</span><span className="block text-[11.5px] text-[#d9c9b4]">{fixed ? "สินค้านี้" : `${b.vendor_name} · มี อย.`}</span></span>
                    <span className="font-lux font-semibold text-[#e8c472]">{fmt(b.price)}</span>
                  </button>
                );
              })}
              <div className="flex justify-between items-center border-t pt-2.5" style={{ borderColor: LINE }}>
                <span className="text-[13px]">รวม <span className="font-lux font-semibold text-[#e8c472] text-base">{fmt(bSum)}</span></span>
                <button type="button" onClick={addBundle} className="btn-red-lux min-h-11 px-3.5 rounded-xl border text-white font-semibold text-[13px]" style={{ background: RED_GRAD, borderColor: "rgba(232,196,114,.55)" }}>ใส่ตะกร้าทั้งชุด</button>
              </div>
            </div>
          </>
        )}

        <div id="reviews" className="flex justify-between items-end mt-1 scroll-mt-4"><div className="font-lux font-semibold text-base">รีวิวจากผู้ซื้อ</div><span className="text-xs text-[#d9c9b4]">{p.sample ? "รีวิวตัวอย่าง" : "ผู้ซื้อจริงเท่านั้น"}</span></div>
        {reviews.length > 0 ? (
          <>
            <div className={`${card} flex gap-3.5 items-center`} style={{ borderColor: LINE }}>
              <div className="text-center shrink-0"><div className="font-lux font-semibold text-[30px] text-[#e8c472]">{avg.toFixed(1)}</div><div className="text-[#e8c472] text-[13px]">{stars(Math.round(avg))}</div><div className="text-[11px] text-[#d9c9b4]">{reviews.length} รีวิว</div></div>
              <div className="flex-1 flex flex-col gap-[3px]">
                {[5, 4, 3, 2, 1].map((n) => {
                  const c = reviews.filter((r) => r.stars === n).length;
                  return (
                    <div key={n} className="flex items-center gap-1.5 text-[11px] text-[#d9c9b4]">
                      <span className="w-[18px]">{n}★</span>
                      <span className="flex-1 h-1.5 rounded-[3px] overflow-hidden" style={{ background: LINE }}><span className="block h-full bg-[#e8c472]" style={{ width: `${(c / reviews.length) * 100}%` }} /></span>
                      <span className="w-[26px] text-right">{c}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar" role="group" aria-label="กรองรีวิว">
              <Chip on={rf === "all"} onClick={() => setRf("all")}>ทั้งหมด</Chip>
              <Chip on={rf === "5"} onClick={() => setRf("5")}>5 ดาว</Chip>
              <Chip on={rf === "low"} onClick={() => setRf("low")}>ต่ำกว่า 5 ดาว</Chip>
            </div>
            {shown.map((r) => (
              <div key={r.id} className={`${card} flex flex-col gap-1`} style={{ borderColor: LINE }}>
                <div className="flex justify-between text-xs"><span className="text-[#e8c472]">{stars(r.stars)}</span><span className="text-[#b5a596]">{ago(r.created_at)}</span></div>
                {r.text && <div className="text-[13px] text-[#d9c9b4] whitespace-pre-line">{r.text}</div>}
                <div className="text-[11.5px] text-[#d9c9b4]">{r.name || "ผู้ซื้อ"} · ซื้อแล้ว</div>
              </div>
            ))}
            {!more && rl.length > 2 && <button type="button" onClick={() => setMore(true)} className="h-12 rounded-[14px] border bg-[#211a18] text-[#e8c472] text-sm font-semibold" style={{ borderColor: LINE }}>ดูรีวิวเพิ่ม</button>}
          </>
        ) : <p className="text-[13px] text-[#d9c9b4]">ยังไม่มีรีวิว</p>}
        {!p.sample && <ReviewForm productId={p.id} />}

        {related.length > 0 && (
          <>
            <div className="flex justify-between items-end mt-1"><div className="font-lux font-semibold text-base">สินค้าที่เกี่ยวข้อง</div><Link href="/products" className="text-[12.5px] text-[#e8c472]">ดูทั้งหมด →</Link></div>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
              {related.map((x) => {
                const src = imageUrl(x.images[0]);
                return (
                  <Link key={x.id} href={`/products/${x.id}`} className="lux-card shrink-0 w-[140px] rounded-[14px] bg-[#211a18] border overflow-hidden text-[#f3ead9]" style={{ borderColor: LINE }}>
                    <span className="h-24 grid place-items-center overflow-hidden" style={{ background: `radial-gradient(circle at 50% 40%, ${glowOf(x.id)[1]}, #140f0f 70%)` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <Bottle id={x.id} w={48} h={76} />}
                    </span>
                    <span className="block px-2.5 py-2"><span className="block text-[11px] text-[#d9c9b4] truncate">{x.vendor_name}</span><span className="block text-[13px] font-semibold truncate">{x.name}</span><span className="block font-lux font-semibold text-[#e8c472] text-[13.5px]">{fmt(x.price)}</span></span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
        <div className="text-xs text-[#b5a596]"><Link href="/policy/returns" className="text-[#e8c472]">นโยบายคืนสินค้าและการจัดส่ง</Link></div>
      </div>

      {added && <Link href="/cart" role="status" className="fixed z-40 left-1/2 -translate-x-1/2 bottom-24 w-[calc(min(100vw,480px)-36px)] px-3.5 py-3 rounded-xl bg-[#21191a] border border-[#3f8f63] text-[#7fd6a3] text-[13px]">{added} · ไปที่ตะกร้า →</Link>}
      <div className="fixed z-30 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[760px] px-[18px] pt-3 pb-[18px] bg-[#171211] border-t flex gap-2.5 items-center" style={{ borderColor: LINE }}>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="ลดจำนวน" className="w-11 h-11 rounded-xl border bg-[#21191a] text-[#e8c472] text-lg" style={{ borderColor: LINE }}>−</button>
          <span aria-live="polite" className="min-w-8 text-center font-lux text-[17px]">{qty}</span>
          <button type="button" onClick={() => setQty(Math.min(cap, qty + 1))} aria-label="เพิ่มจำนวน" className="w-11 h-11 rounded-xl border bg-[#21191a] text-[#e8c472] text-lg" style={{ borderColor: LINE }}>+</button>
        </div>
        <button type="button" onClick={add} disabled={out} className={`flex-1 h-[52px] rounded-[14px] border text-white font-lux font-semibold text-[15px] disabled:opacity-50 ${inCart ? "" : "btn-red-lux"}`}
          style={inCart ? { background: "#2f5e45", borderColor: "#3f8f63" } : { background: RED_GRAD, borderColor: "rgba(232,196,114,.55)" }}>
          {out ? "สินค้าหมด" : inCart ? `ในตะกร้า ${inCart} ✓ · เพิ่ม ${fmt(p.price * qty)}` : `ใส่ตะกร้า · ${fmt(p.price * qty)}`}
        </button>
      </div>
    </main>
  );
}
