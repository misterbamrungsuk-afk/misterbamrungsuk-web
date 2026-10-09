"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PromptPayCard from "@/components/promptpay-qr";
import { OtpStep } from "@/components/otp-step";
import { Turnstile } from "@/components/turnstile";
import { BANK } from "@/lib/join/config";
import { dataUrlToFile, resizeImage } from "@/lib/join/form";
import { AGE_NOTICE, GENERAL_WARNING, MAX_QTY, imageUrl, type Product } from "@/lib/market/config";
import { readCart, useCart, writeCart } from "../products/market-ui";
import { Bottle, LINE, MHeader, MShell, RED_GRAD, fmt, glowOf } from "../products/m-kit";

type P = Product & { vendor_name: string };
type Placed = { id: string; order_no: string; total: number; token: string; track?: string; phone?: string };
type Price = { subtotal: number; discount: number; code: string | null; promo_error: string | null; shipping_fee: number; shipping_tbd: boolean; free_threshold: number | null; delivery_days: string; total: number };
const PLACED_KEY = "mb_cart_order";

const fl = "flex flex-col gap-[5px] text-xs text-[#cdbfb3]";
const fi = "h-12 w-full rounded-[14px] bg-[#241717] px-3.5 text-sm text-[#f6efe4] placeholder:text-[#7d6d6a] border outline-none focus:border-[#f0c75a]";
const card = "p-3.5 rounded-2xl bg-[#241717] border";
const bdOf = (v: string) => ({ borderColor: v ? "#5a4a3a" : LINE });
// OtpStep เป็นคอมโพเนนต์กลาง (ธีมสว่าง) — ปรับสีให้เข้ากับพื้นมืดด้วย descendant selector
const otpSkin = "[&_button]:!rounded-[14px] [&_button]:!border-[rgba(240,200,90,.38)] [&_button]:!bg-[#21191a] [&_button]:!text-[#ffd76a] [&_p]:!text-[#cdbfb3] [&_p[role=alert]]:!text-[#ef8a97]";

// ตะกร้า + ที่อยู่ + OTP + ยืนยันอายุ (1/2) → QR พร้อมเพย์ + แนบสลิป (2/2) → สำเร็จ  (ตามบอร์ด Cart)
export function CartFlow() {
  const lines = useCart();
  const [products, setProducts] = useState<P[] | null>(null);
  const [step, setStep] = useState<"cart" | "pay" | "done">("cart");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState(false);
  const [age, setAge] = useState(false);
  const [ts, setTs] = useState("");
  const [tsKey, setTsKey] = useState(0);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [slip, setSlip] = useState("");
  const [slipErr, setSlipErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState("");
  const [price, setPrice] = useState<Price | null>(null);

  useEffect(() => {
    fetch("/api/market/products").then((r) => r.json()).then((d: { products?: P[] }) => setProducts(d.products ?? [])).catch(() => setProducts([]));
    fetch("/api/otp/verify").then((r) => r.json()).then((d: { phone?: string | null }) => { if (d.phone) { setPhone(d.phone); setVerified(true); } }).catch(() => {});
    try {
      const saved = JSON.parse(sessionStorage.getItem(PLACED_KEY) ?? "null") as Placed | null;
      if (saved?.id) { setPlaced(saved); setStep("pay"); }
    } catch {}
  }, []);

  const rows = useMemo(() => lines.map((l) => ({ l, p: products?.find((x) => x.id === l.id) })).filter((r): r is { l: typeof r.l; p: P } => !!r.p), [lines, products]);
  const subtotal = rows.reduce((s, r) => s + r.p.price * r.l.qty, 0);
  const lineKey = rows.map((r) => `${r.p.id}:${r.l.qty}`).join(",");
  // ราคาสุดท้ายคิดฝั่งเซิร์ฟเวอร์ (ส่วนลดโค้ด → ค่าส่งจากยอดหลังส่วนลด)
  useEffect(() => {
    if (!lineKey) { setPrice(null); return; }
    let live = true;
    fetch("/api/market/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, items: rows.map((r) => ({ id: r.p.id, qty: r.l.qty })) }) })
      .then((r) => r.json()).then((d: Price) => { if (live) setPrice(d); }).catch(() => {});
    return () => { live = false; };
  }, [lineKey, code]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = price?.total ?? subtotal;
  const setQty = (id: string, qty: number) => writeCart(readCart().map((l) => (l.id === id ? { ...l, qty } : l)).filter((l) => l.qty > 0));
  const free = price && !price.shipping_tbd ? price.free_threshold : null;
  const afterDisc = subtotal - (price?.discount ?? 0);
  const fullAddress = [address.trim(), area.trim()].filter(Boolean).join(" ");
  const missing = !rows.length ? "ตะกร้าว่าง" : name.trim().length < 2 || fullAddress.length < 10 ? "กรอกที่อยู่ให้ครบ" : !verified ? "ยืนยันเบอร์ด้วย OTP" : !age ? "ยืนยันอายุ 20+" : "";

  const placeOrder = async () => {
    setErr("");
    if (missing) return setErr(missing === "กรอกที่อยู่ให้ครบ" ? "กรอกชื่อผู้รับและที่อยู่จัดส่งให้ครบ" : missing === "ยืนยันอายุ 20+" ? "กรุณายืนยันว่าอายุ 20 ปีขึ้นไป" : missing === "ยืนยันเบอร์ด้วย OTP" ? "ยืนยันเบอร์โทรด้วย OTP ก่อน" : missing);
    setBusy(true);
    try {
      const res = await fetch("/api/market/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address: fullAddress, age_confirm: age, turnstile: ts, promo_code: code || undefined, items: rows.map((r) => ({ id: r.p.id, qty: r.l.qty })) }),
      });
      const d = (await res.json().catch(() => ({}))) as Partial<Placed> & { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) { setTs(""); setTsKey((k) => k + 1); throw new Error(d.error || "สั่งซื้อไม่สำเร็จ"); }
      const p = { id: d.id!, order_no: d.order_no!, total: d.total!, token: d.token!, track: d.track, phone };
      setPlaced(p);
      try { sessionStorage.setItem(PLACED_KEY, JSON.stringify(p)); } catch {}
      setStep("pay");
      window.scrollTo({ top: 0 });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const onSlip = async (file?: File) => {
    setSlipErr("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setSlipErr("รับเฉพาะไฟล์รูปภาพ (JPG/PNG)");
    setSlip(await resizeImage(file, 1400, 0.85));
  };
  const sendSlip = async () => {
    if (!placed) return;
    if (!slip) return setSlipErr("แนบสลิปการโอนก่อน");
    setBusy(true); setErr(""); setSlipErr("");
    try {
      const fd = new FormData();
      fd.append("token", placed.token);
      fd.append("slip", await dataUrlToFile(slip, "slip.jpg"));
      const res = await fetch(`/api/market/orders/${placed.id}/slip`, { method: "POST", body: fd });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: string[] };
      if (!res.ok || !d.ok) {
        const m = d.error || "ส่งสลิปไม่สำเร็จ";
        if (d.fields?.includes("slip")) setSlipErr(m); else setErr(m);
        return;
      }
      try { sessionStorage.removeItem(PLACED_KEY); } catch {}
      writeCart([]);
      setStep("done");
      window.scrollTo({ top: 0 });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  // แก้ไข: ยกเลิกออเดอร์ที่ยังไม่แนบสลิป (คงค้างเป็น "รอตรวจสลิป" ไม่มีสลิป) แล้วกลับไปแก้ตะกร้า
  const editOrder = () => {
    try { sessionStorage.removeItem(PLACED_KEY); } catch {}
    setPlaced(null); setSlip(""); setSlipErr(""); setErr(""); setStep("cart");
  };

  const head = step === "cart" ? ["CART · 1/2", "ตะกร้าและที่อยู่"] : step === "pay" ? ["PAYMENT · 2/2", "ชำระเงิน"] : ["ORDER PLACED", "สำเร็จ"];
  const bottomBar = "fixed z-30 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-[18px] pt-3 pb-[22px] border-t bg-[#0e0a0a]";
  const cta = "btn-red-lux h-[52px] w-full rounded-[14px] border text-white text-[15px] font-semibold font-lux grid place-items-center disabled:opacity-45";
  const ctaStyle = { background: RED_GRAD, borderColor: "rgba(245,210,110,.85)" };

  return (
    <MShell className={step === "done" ? "" : "pb-[100px]"}>
      {step === "pay" ? <MHeader onBack={editOrder} eyebrow={head[0]} title={head[1]} cart={false} /> : <MHeader back="/market" eyebrow={head[0]} title={head[1]} cart={false} />}

      {step === "cart" && (
        <>
          <div className="px-[18px] py-3.5 flex flex-col gap-3">
            {products == null && <p className="text-sm text-[#cdbfb3]">กำลังโหลด…</p>}
            {rows.map(({ l, p }) => {
              const src = imageUrl(p.images[0]);
              return (
                <div key={p.id} className={`${card} !p-2.5 flex gap-3 items-center`} style={{ borderColor: LINE }}>
                  <Link href={`/products/${p.id}`} className="w-16 h-16 shrink-0 rounded-xl grid place-items-center overflow-hidden" style={{ background: `radial-gradient(circle, ${glowOf(p.id)[1]}, #140f0f 75%)` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <Bottle id={p.id} w={28} h={44} />}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${p.id}`} className="block font-lux font-semibold text-sm text-[#f6efe4] truncate">{p.name}</Link>
                    <div className="text-[11.5px] text-[#cdbfb3] truncate">{p.vendor_name} · มี อย.</div>
                    <div className="font-lux text-[#ffd76a] mt-0.5">{fmt(p.price * l.qty)}</div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button type="button" onClick={() => setQty(p.id, l.qty - 1)} aria-label={`ลดจำนวน ${p.name}`} className="w-11 h-11 rounded-xl border bg-[#21191a] text-[#ffd76a] text-lg" style={{ borderColor: LINE }}>−</button>
                    <span className="min-w-6 text-center font-lux">{l.qty}</span>
                    <button type="button" onClick={() => setQty(p.id, Math.min(MAX_QTY, p.stock, l.qty + 1))} aria-label={`เพิ่มจำนวน ${p.name}`} className="w-11 h-11 rounded-xl border bg-[#21191a] text-[#ffd76a] text-lg" style={{ borderColor: LINE }}>+</button>
                  </div>
                </div>
              );
            })}
            {products != null && !rows.length && <div className={`${card} text-center text-[#cdbfb3] text-[13px]`} style={{ borderColor: LINE }}>ตะกร้าว่าง · <Link href="/market" className="text-[#ffd76a]">กลับไปเลือกสินค้า</Link></div>}

            {rows.length > 0 && free != null && price && price.shipping_fee >= 0 && (
              <div className={`${card} !py-3 flex flex-col gap-2`} style={{ borderColor: LINE }}>
                <div className="flex justify-between text-[12.5px]">
                  <span style={{ color: price.shipping_fee === 0 ? "#7fd6a3" : "#d3c7bc" }}>{price.shipping_fee === 0 ? "ได้สิทธิ์ส่งฟรีแล้ว ✓" : `อีก ${fmt(Math.max(0, free - afterDisc))} ส่งฟรี`}</span>
                  <span className="text-[#7d6d6a]">เกณฑ์ {fmt(free)}</span>
                </div>
                <div className="h-1.5 rounded-[3px] overflow-hidden" style={{ background: LINE }}><div className="h-full" style={{ width: `${Math.min(100, Math.round((afterDisc / free) * 100))}%`, background: price.shipping_fee === 0 ? "#3f8f63" : "#f0c75a" }} /></div>
              </div>
            )}

            {rows.length > 0 && (
              <>
                <h2 className="font-lux font-semibold text-[15px] mt-1">ที่อยู่จัดส่ง</h2>
                <label className={fl}>ชื่อผู้รับ<input className={fi} style={bdOf(name)} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="แตะเพื่อกรอกชื่อผู้รับ" /></label>
                <label className={fl}>ที่อยู่<input className={fi} style={bdOf(address)} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" placeholder="บ้านเลขที่ ซอย ถนน แขวง" /></label>
                <label className={fl}>เขต · จังหวัด · รหัสไปรษณีย์<input className={fi} style={bdOf(area)} value={area} onChange={(e) => setArea(e.target.value)} autoComplete="address-level2" placeholder="เขต · จังหวัด · รหัสไปรษณีย์" /></label>
                <div className={`${fl} ${otpSkin}`}>เบอร์มือถือ (รับ OTP)
                  {verified ? <p className="!text-[#7fd6a3] text-[13px]">✓ ยืนยันเบอร์ {phone} แล้ว</p> : <OtpStep phone={phone} onPhone={setPhone} verified={verified} onVerified={() => setVerified(true)} inputCls={`${fi} flex-1 border-[rgba(240,200,90,.38)]`} />}
                </div>
                <button type="button" role="checkbox" aria-checked={age} onClick={() => setAge(!age)} className="flex gap-2.5 items-start text-left text-[#d3c7bc] text-[13px] py-1.5 min-h-11">
                  <span className="w-[22px] h-[22px] shrink-0 rounded-md border-[1.5px] grid place-items-center text-white text-sm" style={{ borderColor: age ? "#b0182c" : "#5a4a3a", background: age ? "#b0182c" : "transparent" }}>{age ? "✓" : ""}</span>
                  <span>ฉันมีอายุ 20 ปีขึ้นไป และอ่านคำเตือนของสินค้าแล้ว <span className="text-[#7d6d6a]">({AGE_NOTICE})</span></span>
                </button>
                <div className={fl}>โค้ดส่วนลด
                  <div className="flex gap-2">
                    <input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} placeholder="กรอกโค้ด" aria-label="โค้ดส่วนลด" className={`${fi} flex-1 uppercase tracking-[1px]`} style={{ borderColor: code && !price?.promo_error ? "#3f8f63" : codeInput ? "#5a4a3a" : LINE }} />
                    {code
                      ? <button type="button" onClick={() => { setCode(""); setCodeInput(""); }} className="w-24 shrink-0 h-12 rounded-[14px] border bg-[#21191a] text-[#ffd76a] text-[13px] font-semibold" style={{ borderColor: LINE }}>ยกเลิก</button>
                      : <button type="button" onClick={() => setCode(codeInput.trim())} disabled={!codeInput.trim()} className="w-24 shrink-0 h-12 rounded-[14px] border bg-[#21191a] text-[#ffd76a] text-[13px] font-semibold disabled:opacity-45" style={{ borderColor: LINE }}>ใช้โค้ด</button>}
                  </div>
                  {code && price && (price.promo_error ? <span className="text-[#ff8a8a]">{price.promo_error}</span> : price.discount > 0 && <span className="text-[#7fd6a3]">ใช้โค้ด {price.code} แล้ว · ลด {fmt(price.discount)}</span>)}
                </div>
                <div className="flex gap-2.5 items-center px-3 py-2.5 rounded-[14px] bg-[#1d1712] border border-[rgba(227,195,92,.35)] text-xs text-[#d3c7bc] leading-normal">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffd76a" strokeWidth="1.6" className="shrink-0" aria-hidden><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></svg>
                  <span><b className="text-[#ffd76a]">แพ็กมิดชิด</b> · กล่องสีพื้น ไม่ระบุชื่อสินค้าหรือชื่อร้านบนหน้ากล่อง · ชื่อผู้ส่งบนใบปะหน้า: [รอกำหนด]</span>
                </div>
                <div className="rounded-[14px] border border-[#b0182c]/50 bg-[#b0182c]/5 px-3 py-2.5 text-[11.5px] text-[#cdbfb3] leading-relaxed">{GENERAL_WARNING}</div>
                <div className={`${card} text-[13px] flex flex-col gap-1.5`} style={{ borderColor: LINE }}>
                  <div className="flex justify-between"><span className="text-[#cdbfb3]">ค่าสินค้า</span><span>{fmt(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-[#cdbfb3]">ค่าจัดส่ง</span><span>{price?.shipping_tbd ? "฿0 [รอกำหนด]" : price?.shipping_fee ? fmt(price.shipping_fee) : "ฟรี"}</span></div>
                  {!!price?.discount && <div className="flex justify-between text-[#7fd6a3]"><span>ส่วนลด {price.code}</span><span>−{fmt(price.discount)}</span></div>}
                  <div className="flex justify-between border-t pt-1.5 font-lux text-base" style={{ borderColor: LINE }}><span>รวม</span><span className="text-[#ffd76a]">{fmt(total)}</span></div>
                  <p className="text-[11.5px] text-[#7d6d6a]">จัดส่งภายในประมาณ {price?.delivery_days || "[รอกำหนด]"} หลังยืนยันการชำระ</p>
                </div>
                <Turnstile key={tsKey} onToken={setTs} />
                <p className="text-[11.5px] text-[#7d6d6a] leading-relaxed">การสั่งซื้อถือว่ายอมรับ <Link href="/policy/returns" className="text-[#ffd76a]">นโยบายคืนสินค้า</Link> · <Link href="/policy/shipping" className="text-[#ffd76a]">การจัดส่ง</Link> · <Link href="/policy/privacy-shop" className="text-[#ffd76a]">ความเป็นส่วนตัว</Link></p>
                {err && <p role="alert" className="text-[13px] text-[#ef8a97]">{err}</p>}
              </>
            )}
          </div>
          {rows.length > 0 && (
            <div className={bottomBar} style={{ borderColor: LINE }}>
              <button type="button" onClick={placeOrder} disabled={busy} className={cta} style={{ ...ctaStyle, opacity: missing ? 0.45 : 1 }}>
                {busy ? "กำลังสั่งซื้อ…" : missing || `ไปชำระเงิน · ${fmt(total)}`}
              </button>
            </div>
          )}
        </>
      )}

      {step === "pay" && placed && (
        <>
          <div className="px-[18px] py-4 flex flex-col gap-3.5">
            <div className={`${card} flex flex-col items-center gap-2.5`} style={{ borderColor: LINE }}>
              <div className="text-xs text-[#cdbfb3]">สแกนจ่ายด้วยแอปธนาคาร · พร้อมเพย์</div>
              <PromptPayCard amount={placed.total} />
              <div className="font-lux text-[22px] text-[#ffd76a]">{fmt(placed.total)}</div>
              <div className="text-xs text-[#7d6d6a] text-center">คำสั่งซื้อ {placed.order_no}<br />หรือโอนเข้า {BANK.bank} {BANK.accountNo} ({BANK.accountName})</div>
            </div>
            <div className={fl}>แนบสลิปโอนเงิน
              <label className="h-[88px] rounded-[14px] border-[1.5px] border-dashed bg-[#241717] text-[13.5px] flex items-center justify-center gap-3 cursor-pointer px-3"
                style={{ borderColor: slipErr ? "#b0182c" : slip ? "#3f8f63" : "#5a4a3a", color: slip ? "#7fd6a3" : "#ffd76a" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {slip && <img src={slip} alt="สลิปที่แนบ" className="h-[70px] w-12 rounded-md object-cover" />}
                <span>{slip ? "✓ แนบสลิปแล้ว · แตะเพื่อเปลี่ยน" : "+ แตะเพื่อแนบรูปสลิป"}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onSlip(e.target.files?.[0])} />
              </label>
              {slipErr && <span role="alert" className="text-[12.5px] text-[#ef8a97]">{slipErr}</span>}
            </div>
            {err && <p role="alert" className="text-[13px] text-[#ef8a97]">{err}</p>}
            <p className="text-xs text-[#7d6d6a] leading-relaxed">ทีมงานตรวจสลิปภายใน 24 ชม. แล้วแจ้งเลขพัสดุทาง SMS</p>
          </div>
          <div className={`${bottomBar} flex gap-2.5`} style={{ borderColor: LINE }}>
            <button type="button" onClick={editOrder} className="w-[100px] shrink-0 h-[52px] rounded-[14px] border bg-[#241717] text-[#ffd76a] font-semibold" style={{ borderColor: LINE }}>แก้ไข</button>
            <button type="button" onClick={sendSlip} disabled={busy} className={cta} style={{ ...ctaStyle, opacity: slip ? 1 : 0.45 }}>{busy ? "กำลังส่ง..." : "ส่งสลิป · ยืนยันคำสั่งซื้อ"}</button>
          </div>
        </>
      )}

      {step === "done" && (
        <div className="px-6 py-10 flex flex-col items-center text-center gap-3">
          <div className="w-[84px] h-[84px] rounded-full border-2 border-[#f0c75a] grid place-items-center text-[#ffd76a]"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m5 12 5 5 9-10" /></svg></div>
          <h2 className="font-lux font-bold text-2xl">ได้รับคำสั่งซื้อแล้ว</h2>
          <div className="text-[13px] text-[#cdbfb3]">เลขคำสั่งซื้อ</div>
          <div className="font-lux text-[22px] tracking-[1px] text-[#ffd76a]">{placed?.order_no}</div>
          <p className="text-[13px] text-[#d3c7bc] leading-[1.7]">สถานะ: รอตรวจสลิป · เมื่อยืนยันแล้วจะส่งเลขพัสดุไปที่เบอร์ {placed?.phone || phone}<br /><span className="text-[#cdbfb3]">แพ็กมิดชิด · ดูสถานะได้ที่ "ติดตามคำสั่งซื้อ" ด้วยเลขนี้ + เบอร์มือถือ</span></p>
          <Link href={placed?.track || "/orders/track"} className={`${cta} mt-4`} style={ctaStyle}>ติดตามคำสั่งซื้อ</Link>
          <Link href="/market" className="w-full h-[52px] rounded-[14px] border bg-[#241717] text-[#ffd76a] font-lux font-semibold grid place-items-center" style={{ borderColor: "rgba(245,210,110,.85)" }}>กลับหน้า Marketplace</Link>
          <Link href="/home" className="text-[13px] p-3 text-[#ffd76a]">ไปหาเพื่อนกิน เพื่อนเที่ยว →</Link>
        </div>
      )}
    </MShell>
  );
}
