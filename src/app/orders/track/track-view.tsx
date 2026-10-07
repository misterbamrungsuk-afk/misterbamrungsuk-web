"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OtpStep } from "@/components/otp-step";
import { baht, carrierLink, carrierName } from "@/lib/market/config";
import type { PublicOrder } from "@/lib/market/buyer";
import { DiscreetPromise } from "../../products/market-bits";

const dt = (s: string | null) => (s ? new Date(s).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "");

function Timeline({ o }: { o: PublicOrder }) {
  const rejected = o.status === "rejected";
  const order = ["pending", "paid", "shipped", "done"];
  const at = order.indexOf(o.status);
  const steps = [
    { key: "pending", label: "รอตรวจสลิป", sub: o.has_slip ? `สั่งซื้อ ${dt(o.created_at)}` : "ยังไม่ได้แนบสลิป" },
    { key: "paid", label: "ยืนยันแล้ว", sub: dt(o.paid_at) },
    { key: "shipped", label: "จัดส่งแล้ว", sub: dt(o.shipped_at) },
    { key: "done", label: "สำเร็จ", sub: dt(o.done_at) },
  ];
  const tracks = o.vendor_tracking.length ? o.vendor_tracking : o.tracking_no ? [{ tracking_no: o.tracking_no, carrier: o.carrier ?? "" }] : [];
  return (
    <ol className="relative flex flex-col gap-5 pl-8">
      <span className="absolute left-[11px] top-2 bottom-2 w-px bg-ink-600" aria-hidden />
      {steps.map((s, i) => {
        const done = !rejected && i <= at;
        const current = !rejected && i === at;
        return (
          <li key={s.key} className="relative">
            <span className={`absolute -left-8 top-0.5 w-6 h-6 rounded-full grid place-items-center text-[11px] border ${done ? "bg-gold-500 border-gold-500 text-[#1a1206]" : "bg-ink-800 border-ink-600 text-ink-400"}`}>{done ? "✓" : i + 1}</span>
            <p className={`font-semibold ${current ? "text-gold-300" : done ? "" : "text-ink-400"}`}>{s.label}</p>
            {done && s.sub && <p className="text-xs text-ink-300">{s.sub}</p>}
            {s.key === "shipped" && done && tracks.map((t) => {
              const href = carrierLink(t.carrier, t.tracking_no);
              return (
                <p key={t.tracking_no} className="text-sm mt-1">
                  {carrierName(t.carrier) || "ขนส่ง"} · <b className="tracking-wider">{t.tracking_no}</b>
                  {href && <> · <a href={href} target="_blank" rel="noreferrer" className="text-gold-300 underline">ติดตามพัสดุ ↗</a></>}
                </p>
              );
            })}
          </li>
        );
      })}
      {rejected && (
        <li className="relative">
          <span className="absolute -left-8 top-0.5 w-6 h-6 rounded-full grid place-items-center text-[11px] bg-crimson-500 text-white">✕</span>
          <p className="font-semibold text-crimson-300">ปฏิเสธ</p>
          <p className="text-sm text-ink-300">เหตุผล: {o.reject_reason || "โปรดติดต่อทีมงาน"}</p>
        </li>
      )}
    </ol>
  );
}

function OrderCard({ o }: { o: PublicOrder }) {
  return (
    <section className="glass rounded-3xl p-5 flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline gap-2">
        <p className="font-display text-xl font-bold text-gold-300 tracking-wider">{o.order_no}</p>
        <span className="text-xs text-ink-400">{dt(o.created_at)}</span>
      </div>
      <Timeline o={o} />
      <div className="border-t border-ink-600 pt-4 text-sm flex flex-col gap-1.5">
        {o.items.map((i) => <div key={i.product_id} className="flex justify-between gap-3"><span>{i.name} × {i.qty}</span><span>฿{baht(i.price * i.qty)}</span></div>)}
        <div className="flex justify-between text-ink-300"><span>ยอดสินค้า</span><span>฿{baht(o.subtotal)}</span></div>
        {o.discount > 0 && <div className="flex justify-between text-gold-300"><span>ส่วนลด {o.promo_code}</span><span>−฿{baht(o.discount)}</span></div>}
        <div className="flex justify-between text-ink-300"><span>ค่าจัดส่ง</span><span>{o.shipping_fee ? `฿${baht(o.shipping_fee)}` : "฿0"}</span></div>
        <div className="flex justify-between font-semibold"><span>ยอดชำระ</span><span className="text-gold-300">฿{baht(o.total)}</span></div>
        <p className="text-xs text-ink-400 mt-1">ส่งถึง {o.buyer_name} · {o.phone}</p>
      </div>
      <DiscreetPromise />
      {o.status === "done" && <p className="text-xs text-ink-300">ได้รับสินค้าแล้ว? <Link href={`/products/${o.items[0]?.product_id}`} className="text-gold-300 underline">เขียนรีวิว</Link></p>}
    </section>
  );
}

export function TrackView() {
  const sp = useSearchParams();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [mine, setMine] = useState<PublicOrder[] | null>(null);
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState(false);
  const [no, setNo] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const loadMine = useCallback(() =>
    fetch("/api/market/track?mine=1", { cache: "no-store" }).then((r) => r.json()).then((d: { ok?: boolean; orders?: PublicOrder[]; phone?: string }) => {
      if (d.ok) { setVerified(true); setMine(d.orders ?? []); if (d.phone) setPhone(d.phone); }
    }).catch(() => {}), []);

  useEffect(() => {
    const id = sp.get("id"), t = sp.get("t");
    if (id && t) {
      fetch(`/api/market/track?id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`, { cache: "no-store" }).then((r) => r.json())
        .then((d: { ok?: boolean; order?: PublicOrder; error?: string }) => (d.ok && d.order ? setOrder(d.order) : setErr(d.error || "ลิงก์ไม่ถูกต้อง"))).catch(() => {});
    }
    loadMine();
  }, [sp, loadMine]);

  const lookup = async () => {
    setErr(""); setBusy(true);
    const r = await fetch("/api/market/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_no: no }) });
    const d = (await r.json().catch(() => ({}))) as { ok?: boolean; order?: PublicOrder; error?: string };
    setBusy(false);
    if (d.ok && d.order) setOrder(d.order); else setErr(d.error || "ไม่พบคำสั่งซื้อ");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-gold-500">ORDER TRACKING</p>
        <h1 className="text-3xl font-semibold mt-1">ติดตามคำสั่งซื้อ</h1>
      </div>

      {order && <OrderCard o={order} />}

      <section className="glass rounded-3xl p-5 flex flex-col gap-3">
        <h2 className="font-semibold">{order ? "ค้นหาคำสั่งซื้ออื่น" : "ค้นหาด้วยเลขคำสั่งซื้อ + เบอร์โทร"}</h2>
        {!verified ? (
          <>
            <p className="text-sm text-ink-300">ยืนยันเบอร์ที่ใช้สั่งซื้อด้วยรหัส OTP</p>
            <OtpStep phone={phone} onPhone={setPhone} verified={verified} onVerified={() => { setVerified(true); loadMine(); }} inputCls="input-dark flex-1" />
          </>
        ) : <p className="text-sm text-ink-300">เบอร์ที่ยืนยันแล้ว: <b className="text-ink-100">{phone}</b></p>}
        <div className="flex gap-2">
          <input value={no} onChange={(e) => setNo(e.target.value.toUpperCase())} placeholder="เลขคำสั่งซื้อ เช่น MK261007-0123" aria-label="เลขคำสั่งซื้อ" className="input-dark h-12 flex-1 tracking-wider" />
          <button type="button" onClick={lookup} disabled={!verified || !no.trim() || busy} className="btn-crimson h-12 px-5 rounded-full font-semibold disabled:opacity-40">ค้นหา</button>
        </div>
        {err && <p role="alert" className="text-sm text-crimson-300">{err}</p>}
      </section>

      {verified && mine && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">คำสั่งซื้อของฉัน</h2>
          {!mine.length && <p className="text-sm text-ink-300">ยังไม่มีคำสั่งซื้อของเบอร์นี้</p>}
          {mine.map((o) => (
            <button key={o.id} type="button" onClick={() => { setOrder(o); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="glass glass-hover rounded-2xl p-4 flex items-center gap-3 text-left">
              <div className="flex-1 min-w-0">
                <p className="font-semibold tracking-wider">{o.order_no}</p>
                <p className="text-xs text-ink-300">{dt(o.created_at)} · {o.items.length} รายการ</p>
              </div>
              <span className={`text-xs px-2.5 h-7 rounded-full border inline-flex items-center ${o.status === "rejected" ? "border-crimson-500 text-crimson-200" : "border-gold-500/60 text-gold-300"}`}>
                {({ pending: "รอตรวจสลิป", paid: "ยืนยันแล้ว", shipped: "จัดส่งแล้ว", done: "สำเร็จ", rejected: "ปฏิเสธ" } as const)[o.status]}
              </span>
              <span className="font-semibold text-gold-300 w-20 text-right">฿{baht(o.total)}</span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
