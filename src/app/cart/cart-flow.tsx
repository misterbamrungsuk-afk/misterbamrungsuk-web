"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PromptPayCard from "@/components/promptpay-qr";
import { OtpStep } from "@/components/otp-step";
import { Turnstile } from "@/components/turnstile";
import { BANK } from "@/lib/join/config";
import { dataUrlToFile, resizeImage } from "@/lib/join/form";
import { AGE_NOTICE, GENERAL_WARNING, MAX_QTY, imageUrl, type Product, type ShipGroup } from "@/lib/market/config";
import { MOCK_PRODUCTS, MOCK_VENDORS, SAMPLE_BLOCK, isMockId } from "@/lib/market/mock";
import { readCart, useCart, writeCart } from "../products/market-ui";
import { Bottle, LINE, MHeader, MShell, RED_GRAD, fmt, glowOf } from "../products/m-kit";

type P = Product & { vendor_name: string };
type Placed = { id: string; order_no: string; total: number; token: string; track?: string; phone?: string; wallet?: boolean };
type Price = { subtotal: number; discount: number; code: string | null; promo_error: string | null; shipping_fee: number; groups: ShipGroup[]; delivery_days: string; total: number };
const PLACED_KEY = "mb_cart_order";
// ออเดอร์ที่รอแนบสลิป: เก็บใน localStorage (ปิดแท็บแล้วกลับมาแนบต่อได้) · token เป็นสิทธิ์เฉพาะออเดอร์นี้
const savePlaced = (p: Placed) => { try { localStorage.setItem(PLACED_KEY, JSON.stringify(p)); } catch {} };
const loadPlaced = (): Placed | null => { try { return JSON.parse(localStorage.getItem(PLACED_KEY) ?? sessionStorage.getItem(PLACED_KEY) ?? "null") as Placed | null; } catch { return null; } };
const clearPlaced = () => { try { localStorage.removeItem(PLACED_KEY); sessionStorage.removeItem(PLACED_KEY); } catch {} };
// ยังไม่มีสินค้าจริง (API คืนว่าง) → หน้าร้านแสดงสินค้าตัวอย่าง จึงให้ตะกร้ารู้จักสินค้าตัวอย่างด้วย — แต่สั่งซื้อไม่ได้
const MOCK_P: P[] = MOCK_PRODUCTS.map((p) => ({ ...p, vendor_name: MOCK_VENDORS.find((v) => v.id === p.vendor_id)?.name ?? "" }));

const fl = "flex flex-col gap-[5px] text-xs text-[#d9c9b4]";
const fi = "h-12 w-full rounded-[14px] bg-[#211a18] px-3.5 text-sm text-[#f3ead9] placeholder:text-[#b5a596] border outline-none focus:border-[#e8c472]";
const card = "p-3.5 rounded-2xl bg-[#211a18] border";
const bdOf = (v: string) => ({ borderColor: v ? "#5a4a3a" : LINE });
// OtpStep เป็นคอมโพเนนต์กลาง (ธีมสว่าง) — ปรับสีให้เข้ากับพื้นมืดด้วย descendant selector
const otpSkin = "[&_button]:!rounded-[14px] [&_button]:!border-[rgba(232,196,114,.38)] [&_button]:!bg-[#21191a] [&_button]:!text-[#e8c472] [&_p]:!text-[#d9c9b4] [&_p[role=alert]]:!text-[#ef8a97]";

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
  const [otpOn, setOtpOn] = useState(true);
  // ออเดอร์ที่สร้างแล้วแต่ยังไม่แนบสลิป (กดแก้ไข/สลิปอัปไม่ผ่าน) — เก็บไว้ให้กลับมาแนบสลิปต่อได้ ไม่ต้องสั่งใหม่
  const [unpaid, setUnpaid] = useState<Placed | null>(null);
  // จ่ายจากกระเป๋าเงิน: แสดงเมื่อล็อกอินอยู่ (wallet = ยอดใช้ได้ สตางค์ · null = ไม่ได้ล็อกอิน/ระบบกระเป๋าปิด)
  const [wallet, setWallet] = useState<number | null>(null);
  const [pay, setPay] = useState<"slip" | "wallet">("slip");
  const [askPay, setAskPay] = useState(false);

  useEffect(() => {
    fetch("/api/market/products").then((r) => r.json()).then((d: { products?: P[] }) => setProducts(d.products?.length ? d.products : MOCK_P)).catch(() => setProducts([]));
    fetch("/api/wallet", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d: { ok?: boolean; available?: number } | null) => { if (d?.ok && typeof d.available === "number") setWallet(d.available); }).catch(() => {});
    fetch("/api/otp/verify", { cache: "no-store" }).then((r) => r.json()).then((d: { phone?: string | null; required?: boolean }) => { if (d.required === false) setOtpOn(false); if (d.phone) { setPhone(d.phone); setVerified(true); } }).catch(() => {});
    // ล็อกอินอยู่ → เติมชื่อ/เบอร์/ที่อยู่หลักจากโปรไฟล์ให้ (แก้ได้)
    fetch("/api/me?soft=1", { cache: "no-store" }).then((r) => r.json()).then((d: { ok?: boolean; profile?: { name?: string; phone?: string | null; addresses?: { detail?: string; note?: string; primary?: boolean }[] } }) => {
      if (!d?.ok || !d.profile) return;
      const pf = d.profile;
      setName((v) => v || pf.name || "");
      setPhone((v) => v || String(pf.phone ?? ""));
      const a = pf.addresses?.find((x) => x.primary) ?? pf.addresses?.[0];
      if (a?.detail) setAddress((v) => v || [a.detail, a.note].filter(Boolean).join(" ").slice(0, 400));
    }).catch(() => {});
    const resume = new URLSearchParams(location.search);
    const rid = resume.get("resume"), rt = resume.get("t");
    if (rid && rt) {
      // มาจากหน้าติดตาม "แนบสลิปต่อ" → เปิดหน้าชำระของออเดอร์เดิม
      fetch(`/api/market/track?id=${encodeURIComponent(rid)}&t=${encodeURIComponent(rt)}`, { cache: "no-store" }).then((r) => r.json()).then((d: { ok?: boolean; order?: { id: string; order_no: string; total: number; status: string; has_slip: boolean } }) => {
        if (d.ok && d.order && d.order.status === "pending" && !d.order.has_slip) {
          const p = { id: d.order.id, order_no: d.order.order_no, total: d.order.total, token: rt, track: `/orders/track?id=${d.order.id}&t=${encodeURIComponent(rt)}` };
          setPlaced(p); setStep("pay"); savePlaced(p);
        } else if (d.ok) setErr("คำสั่งซื้อนี้แนบสลิปแล้ว · ดูสถานะที่หน้าติดตาม");
      }).catch(() => {});
      return;
    }
    const saved = loadPlaced();
    if (saved?.id) { setPlaced(saved); setStep("pay"); }
  }, []);

  const rows = useMemo(() => lines.map((l) => ({ l, p: products?.find((x) => x.id === l.id) })).filter((r): r is { l: typeof r.l; p: P } => !!r.p), [lines, products]);
  const hasSample = rows.some((r) => isMockId(r.p.id) || r.p.sample);
  const subtotal = rows.reduce((s, r) => s + r.p.price * r.l.qty, 0);
  const lineKey = rows.map((r) => `${r.p.id}:${r.l.qty}`).join(",");
  // ราคาสุดท้ายคิดฝั่งเซิร์ฟเวอร์ (ส่วนลดโค้ด → ค่าส่งจากยอดหลังส่วนลด)
  useEffect(() => {
    if (!lineKey || hasSample) { setPrice(null); return; }
    let live = true;
    fetch("/api/market/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, items: rows.map((r) => ({ id: r.p.id, qty: r.l.qty })) }) })
      .then((r) => r.json()).then((d: Price) => { if (live) setPrice(d); }).catch(() => {});
    return () => { live = false; };
  }, [lineKey, code, hasSample]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = price?.total ?? subtotal;
  const setQty = (id: string, qty: number) => writeCart(readCart().map((l) => (l.id === id ? { ...l, qty } : l)).filter((l) => l.qty > 0));
  const canWallet = wallet != null && !!price && wallet >= Math.round(total * 100);
  const useWallet = pay === "wallet" && canWallet;
  const fullAddress = [address.trim(), area.trim()].filter(Boolean).join(" ");
  const missing = !rows.length ? "ตะกร้าว่าง" : hasSample ? SAMPLE_BLOCK : name.trim().length < 2 || fullAddress.length < 10 ? "กรอกที่อยู่ให้ครบ" : !verified ? "ยืนยันเบอร์ด้วย OTP" : !age ? "ยืนยันอายุ 20+" : "";

  const placeOrder = async (confirmed = false) => {
    setErr("");
    if (hasSample) return setErr(SAMPLE_BLOCK);
    if (missing) return setErr(missing === "กรอกที่อยู่ให้ครบ" ? "กรอกชื่อผู้รับและที่อยู่จัดส่งให้ครบ" : missing === "ยืนยันอายุ 20+" ? "กรุณายืนยันว่าอายุ 20 ปีขึ้นไป" : missing === "ยืนยันเบอร์ด้วย OTP" ? "ยืนยันเบอร์โทรด้วย OTP ก่อน" : missing);
    // ตัดเงินจากกระเป๋า = ถามยืนยันในหน้าก่อน
    if (useWallet && !confirmed) return setAskPay(true);
    setAskPay(false);
    setBusy(true);
    try {
      const res = await fetch("/api/market/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address: fullAddress, age_confirm: age, turnstile: ts, promo_code: code || undefined, pay: useWallet ? "wallet" : undefined, items: rows.map((r) => ({ id: r.p.id, qty: r.l.qty })) }),
      });
      const d = (await res.json().catch(() => ({}))) as Partial<Placed> & { ok?: boolean; error?: string; status?: string };
      if (!res.ok || !d.ok) { setTs(""); setTsKey((k) => k + 1); throw new Error(d.error || "สั่งซื้อไม่สำเร็จ"); }
      const p = { id: d.id!, order_no: d.order_no!, total: d.total!, token: d.token!, track: d.track, phone, wallet: d.status === "paid" };
      if (p.wallet) {
        // จ่ายจากกระเป๋าแล้ว = ไม่ต้องแนบสลิป → หน้าสำเร็จเลย
        setPlaced(p); clearPlaced(); writeCart([]); setUnpaid(null);
        setWallet((w) => (w == null ? w : w - Math.round(p.total * 100)));
        setStep("done"); window.scrollTo({ top: 0 });
        return;
      }
      setPlaced(p);
      savePlaced(p);
      setUnpaid(null);
      setStep("pay");
      window.scrollTo({ top: 0 });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const onSlip = async (file?: File) => {
    setSlipErr("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setSlipErr("รับเฉพาะไฟล์รูปภาพ (JPG/PNG)");
    try { setSlip(await resizeImage(file, 1400, 0.85)); } catch (e) { setSlipErr((e instanceof Error ? e.message : "ไฟล์นี้เปิดเป็นรูปไม่ได้ · เลือกรูป JPG/PNG อีกครั้ง")); }
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
        // ออเดอร์ยังอยู่ (เก็บไว้แล้ว) — แนบสลิปใหม่แล้วกดส่งอีกครั้งได้เลย
        if (d.fields?.includes("slip")) setSlipErr(`${m} · แนบสลิปใหม่แล้วกดส่งอีกครั้งได้`); else setErr(`${m} · คำสั่งซื้อ ${placed.order_no} ยังอยู่ ลองส่งใหม่ได้`);
        return;
      }
      clearPlaced();
      writeCart([]);
      setStep("done");
      window.scrollTo({ top: 0 });
    } catch { setErr(`ส่งสลิปไม่สำเร็จ (เครือข่าย) · คำสั่งซื้อ ${placed.order_no} ยังอยู่ กดส่งอีกครั้งได้`); } finally { setBusy(false); }
  };
  // แก้ไข: กลับไปแก้ตะกร้า — ออเดอร์เดิม (ยังไม่มีสลิป) เก็บไว้ ให้กลับมาแนบสลิปต่อได้จากแถบด้านบน/หน้าติดตาม
  const editOrder = () => {
    setUnpaid(placed);
    setPlaced(null); setSlip(""); setSlipErr(""); setErr(""); setStep("cart");
  };
  const resumeOrder = () => { if (!unpaid) return; setPlaced(unpaid); setUnpaid(null); setStep("pay"); window.scrollTo({ top: 0 }); };

  const head = step === "cart" ? ["CART · 1/2", "ตะกร้าและที่อยู่"] : step === "pay" ? ["PAYMENT · 2/2", "ชำระเงิน"] : ["ORDER PLACED", "สำเร็จ"];
  const bottomBar = "fixed z-30 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[760px] px-[18px] pt-3 pb-[22px] border-t bg-[#171211]";
  const cta = "btn-red-lux h-[52px] w-full rounded-[14px] border text-white text-[15px] font-semibold font-lux grid place-items-center disabled:opacity-45";
  const ctaStyle = { background: RED_GRAD, borderColor: "rgba(232,196,114,.55)" };

  return (
    <MShell className={step === "done" ? "" : "pb-[100px]"}>
      {step === "pay" ? <MHeader onBack={editOrder} eyebrow={head[0]} title={head[1]} cart={false} /> : <MHeader back="/market" eyebrow={head[0]} title={head[1]} cart={false} />}

      {step === "cart" && (
        <>
          <div className="px-[18px] py-3.5 flex flex-col gap-3">
            {unpaid && (
              <div className={`${card} flex flex-col gap-2 text-[13px]`} style={{ borderColor: "rgba(232,196,114,.55)", background: "#1d1712" }}>
                <span>คำสั่งซื้อ <b className="text-[#e8c472]">{unpaid.order_no}</b> ({fmt(unpaid.total)}) ยังไม่ได้แนบสลิป</span>
                <div className="flex gap-2">
                  <button type="button" onClick={resumeOrder} className="flex-1 min-h-11 rounded-xl bg-[#e8c472] text-[#1b130b] font-semibold">แนบสลิปต่อ</button>
                  <button type="button" onClick={() => { setUnpaid(null); clearPlaced(); }} className="min-h-11 px-3 rounded-xl border text-[#d9c9b4]" style={{ borderColor: LINE }}>สั่งใหม่แทน</button>
                </div>
              </div>
            )}
            {products == null && <p className="text-sm text-[#d9c9b4]">กำลังโหลด…</p>}
            {rows.map(({ l, p }) => {
              const src = imageUrl(p.images[0]);
              return (
                <div key={p.id} className={`${card} !p-2.5 flex gap-3 items-center`} style={{ borderColor: LINE }}>
                  <Link href={`/products/${p.id}`} className="w-16 h-16 shrink-0 rounded-xl grid place-items-center overflow-hidden" style={{ background: `radial-gradient(circle, ${glowOf(p.id)[1]}, #140f0f 75%)` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <Bottle id={p.id} w={28} h={44} />}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${p.id}`} className="block font-lux font-semibold text-sm text-[#f3ead9] truncate">{p.name}</Link>
                    <div className="text-[11.5px] text-[#d9c9b4] truncate">{p.vendor_name} · มี อย.{p.sample ? " · ตัวอย่าง" : ""}</div>
                    <div className="font-lux text-[#e8c472] mt-0.5">{fmt(p.price * l.qty)}</div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button type="button" onClick={() => setQty(p.id, l.qty - 1)} aria-label={`ลดจำนวน ${p.name}`} className="w-11 h-11 rounded-xl border bg-[#21191a] text-[#e8c472] text-lg" style={{ borderColor: LINE }}>−</button>
                    <span className="min-w-6 text-center font-lux">{l.qty}</span>
                    <button type="button" onClick={() => setQty(p.id, Math.min(MAX_QTY, p.stock, l.qty + 1))} aria-label={`เพิ่มจำนวน ${p.name}`} className="w-11 h-11 rounded-xl border bg-[#21191a] text-[#e8c472] text-lg" style={{ borderColor: LINE }}>+</button>
                  </div>
                </div>
              );
            })}
            {products != null && !rows.length && <div className={`${card} text-center text-[#d9c9b4] text-[13px]`} style={{ borderColor: LINE }}>ตะกร้าว่าง · <Link href="/market" className="tap text-[#e8c472]">กลับไปเลือกสินค้า</Link></div>}

            {/* ค่าส่งแยกร้าน — แต่ละร้านส่งของเอง คิดตามที่ร้านตั้ง (ส่งฟรีเมื่อยอดของร้านนั้นถึงเกณฑ์) */}
            {rows.length > 0 && price && price.groups.length > 0 && (
              <div className={`${card} !py-3 flex flex-col gap-2.5`} style={{ borderColor: LINE }}>
                <b className="text-[12.5px] text-[#e8c472]">ค่าส่งแยกตามร้าน{price.groups.length > 1 ? ` · ${price.groups.length} ร้าน ส่งแยกกล่อง` : ""}</b>
                {price.groups.map((g) => (
                  <div key={g.vendor_id} className="flex flex-col gap-1.5 text-[12.5px]">
                    <div className="flex justify-between gap-3"><span className="text-[#d9c9b4] truncate">{g.vendor_name || "ร้านค้า"} · สินค้า {fmt(g.subtotal)}</span><span style={{ color: g.shipping_fee ? "#f3ead9" : "#7fd6a3" }}>{g.shipping_fee ? fmt(g.shipping_fee) : "ส่งฟรี"}</span></div>
                    {g.free_threshold != null && g.shipping_fee > 0 && (
                      <>
                        <span className="text-[11.5px] text-[#b5a596]">ซื้อร้านนี้อีก {fmt(Math.max(0, g.free_threshold - g.subtotal))} ส่งฟรี (เกณฑ์ {fmt(g.free_threshold)})</span>
                        <div className="h-1.5 rounded-[3px] overflow-hidden" style={{ background: LINE }}><div className="h-full" style={{ width: `${Math.min(100, Math.round((g.subtotal / g.free_threshold) * 100))}%`, background: "#e8c472" }} /></div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {hasSample && (
              <div className={`${card} flex flex-col gap-2.5 text-[13px] text-[#d9c9b4] leading-relaxed`} style={{ borderColor: "rgba(227,195,92,.45)", background: "#1d1712" }}>
                <b className="text-[#e8c472]">{SAMPLE_BLOCK}</b>
                <span>ตอนนี้ Marketplace แสดงสินค้าตัวอย่างระหว่างรอร้านค้าพาร์ทเนอร์ลงสินค้าจริง · ยังไม่มีการเก็บเงินหรือจัดส่งสำหรับสินค้าตัวอย่าง</span>
                <div className="flex justify-between border-t pt-2" style={{ borderColor: LINE }}><span>ค่าสินค้า (ตัวอย่าง)</span><span className="font-lux text-[#e8c472]">{fmt(subtotal)}</span></div>
                <button type="button" onClick={() => writeCart(readCart().filter((l) => !isMockId(l.id)))} className="min-h-11 rounded-xl border bg-[#21191a] text-[#e8c472] text-[13px] font-semibold" style={{ borderColor: LINE }}>นำสินค้าตัวอย่างออกจากตะกร้า</button>
                <Link href="/market" className="text-center text-[12.5px] text-[#e8c472]">กลับไปดูสินค้า →</Link>
              </div>
            )}

            {rows.length > 0 && !hasSample && (
              <>
                <h2 className="font-lux font-semibold text-[15px] mt-1">ที่อยู่จัดส่ง</h2>
                <label className={fl}>ชื่อผู้รับ<input className={fi} style={bdOf(name)} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="แตะเพื่อกรอกชื่อผู้รับ" /></label>
                <label className={fl}>ที่อยู่<input className={fi} style={bdOf(address)} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" placeholder="บ้านเลขที่ ซอย ถนน แขวง" /></label>
                <label className={fl}>เขต · จังหวัด · รหัสไปรษณีย์<input className={fi} style={bdOf(area)} value={area} onChange={(e) => setArea(e.target.value)} autoComplete="address-level2" placeholder="เขต · จังหวัด · รหัสไปรษณีย์" /></label>
                <div className={`${fl} ${otpSkin}`}>{otpOn ? "เบอร์มือถือ (รับ OTP)" : "เบอร์มือถือ (ใช้ติดต่อและแจ้งเลขพัสดุ)"}
                  {verified ? <p className="!text-[#7fd6a3] text-[13px]">✓ ยืนยันเบอร์ {phone} แล้ว</p> : <OtpStep phone={phone} onPhone={setPhone} verified={verified} onVerified={() => setVerified(true)} inputCls={`${fi} flex-1 border-[rgba(232,196,114,.38)]`} />}
                </div>
                <button type="button" role="checkbox" aria-checked={age} onClick={() => setAge(!age)} className="flex gap-2.5 items-start text-left text-[#d9c9b4] text-[13px] py-1.5 min-h-11">
                  <span className="w-[22px] h-[22px] shrink-0 rounded-md border-[1.5px] grid place-items-center text-white text-sm" style={{ borderColor: age ? "#e8c472" : "#5a4a3a", background: age ? "#e8c472" : "transparent" }}>{age ? "✓" : ""}</span>
                  <span>ฉันมีอายุ 20 ปีขึ้นไป และอ่านคำเตือนของสินค้าแล้ว <span className="text-[#b5a596]">({AGE_NOTICE})</span></span>
                </button>
                <div className={fl}>โค้ดส่วนลด
                  <div className="flex gap-2">
                    <input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} placeholder="กรอกโค้ด" aria-label="โค้ดส่วนลด" className={`${fi} flex-1 uppercase tracking-[1px]`} style={{ borderColor: code && !price?.promo_error ? "#3f8f63" : codeInput ? "#5a4a3a" : LINE }} />
                    {code
                      ? <button type="button" onClick={() => { setCode(""); setCodeInput(""); }} className="w-24 shrink-0 h-12 rounded-[14px] border bg-[#21191a] text-[#e8c472] text-[13px] font-semibold" style={{ borderColor: LINE }}>ยกเลิก</button>
                      : <button type="button" onClick={() => setCode(codeInput.trim())} disabled={!codeInput.trim()} className="w-24 shrink-0 h-12 rounded-[14px] border bg-[#21191a] text-[#e8c472] text-[13px] font-semibold disabled:opacity-45" style={{ borderColor: LINE }}>ใช้โค้ด</button>}
                  </div>
                  {code && price && (price.promo_error ? <span className="text-[#ff8a8a]">{price.promo_error}</span> : price.discount > 0 && <span className="text-[#7fd6a3]">ใช้โค้ด {price.code} แล้ว · ลด {fmt(price.discount)}</span>)}
                </div>
                <div className="flex gap-2.5 items-center px-3 py-2.5 rounded-[14px] bg-[#1d1712] border border-[rgba(227,195,92,.35)] text-xs text-[#d9c9b4] leading-normal">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e8c472" strokeWidth="1.6" className="shrink-0" aria-hidden><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></svg>
                  <span><b className="text-[#e8c472]">แพ็กมิดชิด</b> · กล่องสีพื้น ไม่ระบุชื่อสินค้าหรือชื่อร้านบนหน้ากล่อง</span>
                </div>
                <div className="rounded-[14px] border border-[#b0182c]/50 bg-[#b0182c]/5 px-3 py-2.5 text-[11.5px] text-[#d9c9b4] leading-relaxed">{GENERAL_WARNING}</div>
                <div className={`${card} text-[13px] flex flex-col gap-1.5`} style={{ borderColor: LINE }}>
                  <div className="flex justify-between"><span className="text-[#d9c9b4]">ค่าสินค้า</span><span>{fmt(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-[#d9c9b4]">ค่าจัดส่ง</span><span>{price?.shipping_fee ? fmt(price.shipping_fee) : "ฟรี"}</span></div>
                  {!!price?.discount && <div className="flex justify-between text-[#7fd6a3]"><span>ส่วนลด {price.code}</span><span>−{fmt(price.discount)}</span></div>}
                  <div className="flex justify-between border-t pt-1.5 font-lux text-base" style={{ borderColor: LINE }}><span>รวม</span><span className="text-[#e8c472]">{fmt(total)}</span></div>
                  {price?.delivery_days && <p className="text-[12px] text-[#b5a596]">จัดส่งภายในประมาณ {price.delivery_days} หลังยืนยันการชำระ</p>}
                </div>
                {wallet != null && (
                  <div className="flex flex-col gap-2" role="radiogroup" aria-label="วิธีชำระเงิน">
                    <h2 className="font-lux font-semibold text-[15px] mt-1">วิธีชำระเงิน</h2>
                    {([["wallet", "จ่ายจากกระเป๋าเงิน", `ยอดใช้ได้ ${fmt(wallet / 100)}${canWallet ? "" : " · ไม่พอสำหรับคำสั่งซื้อนี้"}`], ["slip", "สแกน QR พร้อมเพย์ + แนบสลิป", "ทีมงานตรวจสลิปภายใน 24 ชม."]] as const).map(([k, t, sub]) => {
                      const on = k === "wallet" ? useWallet : !useWallet;
                      const off = k === "wallet" && !canWallet;
                      return (
                        <button key={k} type="button" role="radio" aria-checked={on} disabled={off} onClick={() => setPay(k)} className={`${card} !py-3 flex gap-3 items-center text-left disabled:opacity-55`} style={{ borderColor: on ? "#e8c472" : LINE }}>
                          <span className="w-5 h-5 shrink-0 rounded-full border-[1.5px] grid place-items-center" style={{ borderColor: on ? "#e8c472" : "#5a4a3a" }}>{on && <span className="w-2.5 h-2.5 rounded-full bg-[#e8c472]" />}</span>
                          <span className="flex flex-col"><span className="text-[13.5px] text-[#f3ead9] font-semibold">{t}</span><span className="text-[11.5px] text-[#b5a596]">{sub}</span></span>
                        </button>
                      );
                    })}
                    {!canWallet && <Link href="/wallet" className="text-[12.5px] text-[#e8c472] self-start min-h-8 inline-flex items-center">เติมเงินเข้ากระเป๋า →</Link>}
                  </div>
                )}
                <Turnstile key={tsKey} onToken={setTs} />
                <p className="text-[11.5px] text-[#b5a596] leading-relaxed">การสั่งซื้อถือว่ายอมรับ <Link href="/policy/returns" className="text-[#e8c472]">นโยบายคืนสินค้า</Link> · <Link href="/policy/shipping" className="text-[#e8c472]">การจัดส่ง</Link> · <Link href="/policy/privacy-shop" className="text-[#e8c472]">ความเป็นส่วนตัว</Link></p>
                {err && <p role="alert" className="text-[13px] text-[#ef8a97]">{err}</p>}
              </>
            )}
          </div>
          {rows.length > 0 && (
            <div className={bottomBar} style={{ borderColor: LINE }}>
              {askPay ? (
                <div role="alertdialog" aria-label="ยืนยันชำระจากกระเป๋าเงิน" className="flex flex-col gap-2.5">
                  <p className="text-[13px] text-[#d9c9b4] text-center">ตัดเงิน <b className="text-[#e8c472]">{fmt(total)}</b> จากกระเป๋าเงิน (คงเหลือ {fmt(Math.max(0, (wallet ?? 0) / 100 - total))})</p>
                  <div className="flex gap-2.5">
                    <button type="button" onClick={() => setAskPay(false)} className="w-[100px] shrink-0 h-[52px] rounded-[14px] border bg-[#211a18] text-[#e8c472] font-semibold" style={{ borderColor: LINE }}>ยกเลิก</button>
                    <button type="button" onClick={() => placeOrder(true)} disabled={busy} className={cta} style={ctaStyle}>{busy ? "กำลังชำระ…" : "ยืนยันชำระ"}</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => placeOrder()} disabled={busy} className={cta} style={{ ...ctaStyle, opacity: missing ? 0.45 : 1 }}>
                  {busy ? "กำลังสั่งซื้อ…" : missing || (useWallet ? `จ่ายจากกระเป๋าเงิน · ${fmt(total)}` : `ไปชำระเงิน · ${fmt(total)}`)}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {step === "pay" && placed && (
        <>
          <div className="px-[18px] py-4 flex flex-col gap-3.5">
            <div className={`${card} flex flex-col items-center gap-2.5`} style={{ borderColor: LINE }}>
              <div className="text-xs text-[#d9c9b4]">สแกนจ่ายด้วยแอปธนาคาร · พร้อมเพย์</div>
              <PromptPayCard amount={placed.total} />
              <div className="font-lux text-[22px] text-[#e8c472]">{fmt(placed.total)}</div>
              <div className="text-xs text-[#b5a596] text-center">คำสั่งซื้อ {placed.order_no}<br />หรือโอนเข้า {BANK.bank} {BANK.accountNo} ({BANK.accountName})</div>
            </div>
            <div className={fl}>แนบสลิปโอนเงิน
              <label className="h-[88px] rounded-[14px] border-[1.5px] border-dashed bg-[#211a18] text-[13.5px] flex items-center justify-center gap-3 cursor-pointer px-3"
                style={{ borderColor: slipErr ? "#e8c472" : slip ? "#3f8f63" : "#5a4a3a", color: slip ? "#7fd6a3" : "#e8c472" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {slip && <img src={slip} alt="สลิปที่แนบ" className="h-[70px] w-12 rounded-md object-cover" />}
                <span>{slip ? "✓ แนบสลิปแล้ว · แตะเพื่อเปลี่ยน" : "+ แตะเพื่อแนบรูปสลิป"}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onSlip(e.target.files?.[0])} />
              </label>
              {slipErr && <span role="alert" className="text-[12.5px] text-[#ef8a97]">{slipErr}</span>}
            </div>
            {err && <p role="alert" className="text-[13px] text-[#ef8a97]">{err}</p>}
            <p className="text-xs text-[#b5a596] leading-relaxed">ทีมงานตรวจสลิปภายใน 24 ชม. แล้วแจ้งเลขพัสดุทาง SMS</p>
          </div>
          <div className={`${bottomBar} flex gap-2.5`} style={{ borderColor: LINE }}>
            <button type="button" onClick={editOrder} className="w-[100px] shrink-0 h-[52px] rounded-[14px] border bg-[#211a18] text-[#e8c472] font-semibold" style={{ borderColor: LINE }}>แก้ไข</button>
            <button type="button" onClick={sendSlip} disabled={busy} className={cta} style={{ ...ctaStyle, opacity: slip ? 1 : 0.45 }}>{busy ? "กำลังส่ง..." : "ส่งสลิป · ยืนยันคำสั่งซื้อ"}</button>
          </div>
        </>
      )}

      {step === "done" && (
        <div className="px-6 py-10 flex flex-col items-center text-center gap-3">
          <div className="w-[84px] h-[84px] rounded-full border-2 border-[#e8c472] grid place-items-center text-[#e8c472]"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m5 12 5 5 9-10" /></svg></div>
          <h2 className="font-lux font-bold text-2xl">ได้รับคำสั่งซื้อแล้ว</h2>
          <div className="text-[13px] text-[#d9c9b4]">เลขคำสั่งซื้อ</div>
          <div className="font-lux text-[22px] tracking-[1px] text-[#e8c472]">{placed?.order_no}</div>
          <p className="text-[13px] text-[#d9c9b4] leading-[1.7]">{placed?.wallet ? <>ชำระจากกระเป๋าเงินแล้ว {fmt(placed.total)} · ร้านกำลังเตรียมจัดส่ง จะส่งเลขพัสดุไปที่เบอร์ {placed.phone || phone}</> : <>สถานะ: รอตรวจสลิป · เมื่อยืนยันแล้วจะส่งเลขพัสดุไปที่เบอร์ {placed?.phone || phone}</>}<br /><span className="text-[#d9c9b4]">แพ็กมิดชิด · ดูสถานะได้ที่ "ติดตามคำสั่งซื้อ" ด้วยเลขนี้ + เบอร์มือถือ</span></p>
          <Link href={placed?.track || "/orders/track"} className={`${cta} mt-4`} style={ctaStyle}>ติดตามคำสั่งซื้อ</Link>
          <Link href="/market" className="w-full h-[52px] rounded-[14px] border bg-[#211a18] text-[#e8c472] font-lux font-semibold grid place-items-center" style={{ borderColor: "rgba(232,196,114,.55)" }}>กลับหน้า Marketplace</Link>
          <Link href="/" className="text-[13px] p-3 text-[#e8c472]">ไปหาเพื่อนกิน เพื่อนเที่ยว →</Link>
        </div>
      )}
    </MShell>
  );
}
