"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PromptPayCard from "@/components/promptpay-qr";
import { OtpStep } from "@/components/otp-step";
import { Turnstile } from "@/components/turnstile";
import { BANK } from "@/lib/join/config";
import { dataUrlToFile, resizeImage } from "@/lib/join/form";
import { AGE_NOTICE, GENERAL_WARNING, MAX_QTY, baht, type Product } from "@/lib/market/config";
import { MarketHeader, readCart, useCart, writeCart } from "../products/market-ui";

type P = Product & { vendor_name: string };
type Placed = { id: string; order_no: string; total: number; token: string };
const PLACED_KEY = "mb_cart_order";

// ตะกร้า → ที่อยู่ + OTP + ยืนยันอายุ → QR พร้อมเพย์ + แนบสลิป → สำเร็จ
export function CartFlow() {
  const lines = useCart();
  const [products, setProducts] = useState<P[] | null>(null);
  const [step, setStep] = useState<"cart" | "info" | "pay" | "done">("cart");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState(false);
  const [age, setAge] = useState(false);
  const [ts, setTs] = useState("");
  const [tsKey, setTsKey] = useState(0);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [slip, setSlip] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/market/products").then((r) => r.json()).then((d: { products?: P[] }) => setProducts(d.products ?? [])).catch(() => setProducts([]));
    fetch("/api/otp/verify").then((r) => r.json()).then((d: { phone?: string | null }) => { if (d.phone) { setPhone(d.phone); setVerified(true); } }).catch(() => {});
    try {
      const saved = JSON.parse(sessionStorage.getItem(PLACED_KEY) ?? "null") as Placed | null;
      if (saved?.id) { setPlaced(saved); setStep("pay"); }
    } catch {}
  }, []);

  const rows = useMemo(() => lines.map((l) => ({ l, p: products?.find((x) => x.id === l.id) })).filter((r): r is { l: typeof r.l; p: P } => !!r.p), [lines, products]);
  const total = rows.reduce((s, r) => s + r.p.price * r.l.qty, 0);
  const setQty = (id: string, qty: number) => writeCart(readCart().map((l) => (l.id === id ? { ...l, qty } : l)).filter((l) => l.qty > 0));

  const placeOrder = async () => {
    setErr("");
    if (name.trim().length < 2) return setErr("กรอกชื่อผู้รับ");
    if (address.trim().length < 10) return setErr("กรอกที่อยู่จัดส่งให้ครบ");
    if (!verified) return setErr("ยืนยันเบอร์โทรด้วย OTP ก่อน");
    if (!age) return setErr("กรุณายืนยันว่าอายุ 20 ปีขึ้นไป");
    setBusy(true);
    try {
      const res = await fetch("/api/market/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, age_confirm: age, turnstile: ts, items: rows.map((r) => ({ id: r.p.id, qty: r.l.qty })) }),
      });
      const d = (await res.json().catch(() => ({}))) as Partial<Placed> & { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) { setTs(""); setTsKey((k) => k + 1); throw new Error(d.error || "สั่งซื้อไม่สำเร็จ"); }
      const p = { id: d.id!, order_no: d.order_no!, total: d.total!, token: d.token! };
      setPlaced(p);
      try { sessionStorage.setItem(PLACED_KEY, JSON.stringify(p)); } catch {}
      writeCart([]);
      setStep("pay");
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const onSlip = async (file?: File) => {
    setErr("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr("รับเฉพาะไฟล์รูปภาพ (JPG/PNG)");
    setSlip(await resizeImage(file, 1400, 0.85));
  };
  const sendSlip = async () => {
    if (!placed) return;
    if (!slip) return setErr("แนบสลิปการโอนก่อน");
    setBusy(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("token", placed.token);
      fd.append("slip", await dataUrlToFile(slip, "slip.jpg"));
      const res = await fetch(`/api/market/orders/${placed.id}/slip`, { method: "POST", body: fd });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) throw new Error(d.error || "ส่งสลิปไม่สำเร็จ");
      try { sessionStorage.removeItem(PLACED_KEY); } catch {}
      setStep("done");
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const input = "input-dark w-full";
  const label = "block text-xs text-ink-300 mb-1.5";
  const STEPS = ["ตะกร้า", "ที่อยู่ & ยืนยัน", "ชำระเงิน", "สำเร็จ"];
  const idx = ["cart", "info", "pay", "done"].indexOf(step);

  return (
    <main className="min-h-dvh bg-ink-900 text-ink-100">
      <MarketHeader />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ol className="flex gap-2 text-[11px] mb-6">
          {STEPS.map((s, i) => (
            <li key={s} className={`flex-1 border-t-2 pt-2 ${i <= idx ? "border-gold-500 text-gold-300" : "border-ink-600 text-ink-400"}`}>{i + 1}. {s}</li>
          ))}
        </ol>

        {step === "cart" && (
          <section>
            <h1 className="text-2xl font-semibold">ตะกร้าสินค้า</h1>
            {products == null ? <p className="text-sm text-ink-300 mt-4">กำลังโหลด…</p> : !rows.length ? (
              <div className="glass rounded-3xl p-8 mt-5 text-center">
                <p className="text-ink-300">ยังไม่มีสินค้าในตะกร้า</p>
                <Link href="/products" className="btn-crimson inline-flex h-11 px-6 rounded-full items-center mt-4">เลือกซื้อสินค้า</Link>
              </div>
            ) : (
              <>
                <ul className="flex flex-col gap-3 mt-5">
                  {rows.map(({ l, p }) => (
                    <li key={p.id} className="glass rounded-2xl p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <Link href={`/products/${p.id}`} className="font-semibold hover:text-gold-300">{p.name}</Link>
                        <p className="text-xs text-ink-300">{p.vendor_name} · ฿{baht(p.price)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label="ลด" onClick={() => setQty(p.id, l.qty - 1)} className="w-9 h-9 rounded-full border border-ink-600">−</button>
                        <span className="w-8 text-center">{l.qty}</span>
                        <button type="button" aria-label="เพิ่ม" onClick={() => setQty(p.id, Math.min(MAX_QTY, p.stock, l.qty + 1))} className="w-9 h-9 rounded-full border border-ink-600">+</button>
                      </div>
                      <span className="w-20 text-right font-semibold text-gold-300">฿{baht(p.price * l.qty)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between items-baseline mt-5">
                  <span className="text-ink-300">ยอดรวม</span>
                  <span className="font-display text-3xl font-bold text-gold-300">฿{baht(total)}</span>
                </div>
                <p className="text-xs text-ink-400 mt-1">ร้านค้าจัดส่งเองหลังทีมงานยืนยันการชำระ</p>
                <button type="button" onClick={() => setStep("info")} className="btn-crimson w-full h-14 mt-5 rounded-full font-semibold text-lg">ดำเนินการสั่งซื้อ</button>
              </>
            )}
          </section>
        )}

        {step === "info" && (
          <section className="flex flex-col gap-4">
            <h1 className="text-2xl font-semibold">ที่อยู่จัดส่ง</h1>
            <div><label className={label} htmlFor="nm">ชื่อผู้รับ *</label><input id="nm" className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
            <div><label className={label} htmlFor="ad">ที่อยู่จัดส่ง *</label><textarea id="ad" rows={3} className={input} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" /></div>
            <div><span className={label}>เบอร์มือถือ (ยืนยันด้วย OTP) *</span>
              <OtpStep phone={phone} onPhone={setPhone} verified={verified} onVerified={() => setVerified(true)} inputCls={`${input} flex-1`} />
            </div>
            <div className="rounded-2xl border border-crimson-500/50 bg-crimson-500/5 p-4 text-xs text-ink-300 leading-relaxed">{GENERAL_WARNING}</div>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} className="mt-1 w-5 h-5 accent-[#d4af37]" />
              <span>ข้าพเจ้ายืนยันว่ามีอายุ 20 ปีบริบูรณ์ขึ้นไป และได้อ่านคำเตือนของสินค้าแล้ว <span className="text-ink-400">({AGE_NOTICE})</span></span>
            </label>
            <Turnstile key={tsKey} onToken={setTs} />
            <div className="flex justify-between items-baseline"><span className="text-ink-300">ยอดชำระ</span><span className="font-display text-2xl font-bold text-gold-300">฿{baht(total)}</span></div>
            {err && <p role="alert" className="text-sm text-crimson-300">{err}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep("cart")} className="btn-ghost h-14 px-5 rounded-full">กลับ</button>
              <button type="button" onClick={placeOrder} disabled={busy || !rows.length} className="btn-crimson flex-1 h-14 rounded-full font-semibold text-lg">{busy ? "กำลังสั่งซื้อ…" : "ยืนยันคำสั่งซื้อ"}</button>
            </div>
          </section>
        )}

        {step === "pay" && placed && (
          <section className="flex flex-col items-center">
            <h1 className="text-2xl font-semibold self-start">ชำระเงิน</h1>
            <p className="text-sm text-ink-300 self-start mt-1">คำสั่งซื้อ <b className="text-ink-100">{placed.order_no}</b></p>
            <div className="mt-5"><PromptPayCard amount={placed.total} /></div>
            <p className="text-[13px] text-ink-300 mt-3 text-center">สแกนด้วยแอปธนาคารใดก็ได้ ยอดเงินขึ้นอัตโนมัติ<br />หรือโอนเข้า {BANK.bank} {BANK.accountNo} ({BANK.accountName})</p>
            <p className="text-sm text-ink-300 mt-6 mb-2 self-start">แนบหลักฐานการโอนเงิน (สลิป)</p>
            <label className="w-full flex items-center gap-4 rounded-3xl border border-dashed border-ink-500 p-4 cursor-pointer hover:border-gold-500">
              {slip
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={slip} alt="สลิปที่แนบ" className="w-20 h-28 rounded-xl object-cover" />
                : <span className="w-20 h-28 rounded-xl bg-ink-800 grid place-items-center text-ink-400 text-3xl">+</span>}
              <span className="text-sm text-ink-300">{slip ? "แตะเพื่อเปลี่ยนสลิป" : "แตะเพื่อเลือกรูปสลิป"}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onSlip(e.target.files?.[0])} />
            </label>
            {err && <p role="alert" className="text-sm text-crimson-300 mt-4 self-start">{err}</p>}
            <button type="button" onClick={sendSlip} disabled={busy} className="btn-crimson w-full h-14 mt-5 rounded-full font-semibold text-lg">{busy ? "กำลังส่ง…" : "ส่งสลิปยืนยันการชำระ"}</button>
            <p className="text-xs text-ink-400 text-center mt-3">ทีมงานตรวจสลิปภายใน 24 ชม.</p>
          </section>
        )}

        {step === "done" && (
          <section className="glass rounded-3xl p-8 text-center">
            <p className="text-4xl text-gold-300">✓</p>
            <h1 className="text-2xl font-semibold mt-2">ได้รับคำสั่งซื้อแล้ว</h1>
            <p className="text-ink-300 mt-2">เลขคำสั่งซื้อ</p>
            <p className="font-display text-2xl font-bold text-gold-300">{placed?.order_no}</p>
            <p className="text-sm text-ink-300 mt-4">ทีมงานจะตรวจสลิปและแจ้งเลขพัสดุทาง SMS/โทรศัพท์ เก็บเลขคำสั่งซื้อไว้ติดต่อทีมงาน</p>
            <Link href="/" className="btn-ghost inline-flex h-11 px-6 rounded-full items-center mt-6">กลับหน้าแรก</Link>
          </section>
        )}
      </div>
    </main>
  );
}
