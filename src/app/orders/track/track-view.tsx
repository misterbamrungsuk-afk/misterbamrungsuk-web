"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OtpStep } from "@/components/otp-step";
import { carrierLink, carrierName } from "@/lib/market/config";
import type { PublicOrder } from "@/lib/market/buyer";
import { LINE, RED_GRAD, Toast, fmt, useToast } from "../../products/m-kit";

const dt = (s: string | null) => (s ? new Date(s).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "");
const d8 = (s: string) => new Date(s).toLocaleDateString("th-TH", { dateStyle: "medium" });
const fl = "flex flex-col gap-[5px] text-xs text-[#cdbfb3]";
const fi = "h-12 w-full rounded-[14px] bg-[#241717] px-3.5 text-sm text-[#f6efe4] placeholder:text-[#7d6d6a] border outline-none focus:border-[#f0c75a]";
const card = "p-3.5 rounded-2xl bg-[#241717] border";
const cta = "btn-red-lux h-[52px] w-full rounded-[14px] border text-white text-[15px] font-semibold font-lux grid place-items-center disabled:opacity-45";
const ctaStyle = { background: RED_GRAD, borderColor: "rgba(245,210,110,.85)" };
const ghost = "h-12 w-full rounded-[14px] border bg-[#241717] text-[#ffd76a] text-sm font-semibold grid place-items-center";
const otpSkin = "[&_button]:!rounded-[14px] [&_button]:!border-[rgba(240,200,90,.38)] [&_button]:!bg-[#21191a] [&_button]:!text-[#ffd76a] [&_p]:!text-[#cdbfb3] [&_p[role=alert]]:!text-[#ef8a97]";

const ST: Record<PublicOrder["status"], [string, string]> = {
  pending: ["รอตรวจสลิป", "#ffd76a"], paid: ["ยืนยันการชำระ", "#7fd6a3"], shipped: ["จัดส่งแล้ว", "#7fd6a3"], done: ["สำเร็จ", "#7fd6a3"], rejected: ["ปฏิเสธ", "#ef8a97"],
};
const itemsText = (o: PublicOrder) => o.items.map((i) => `${i.name} ×${i.qty}`).join(", ");
const tracksOf = (o: PublicOrder) => (o.vendor_tracking.length ? o.vendor_tracking : o.tracking_no ? [{ tracking_no: o.tracking_no, carrier: o.carrier ?? "" }] : []);

function Timeline({ o }: { o: PublicOrder }) {
  const at = ["pending", "paid", "shipped", "done"].indexOf(o.status);
  const steps = [
    { label: "รอตรวจสลิป", sub: o.has_slip ? `สั่งซื้อ ${dt(o.created_at)} · ทีมงานตรวจภายใน 24 ชม.` : "ยังไม่ได้แนบสลิป" },
    { label: "ยืนยันการชำระ", sub: o.paid_at ? `${dt(o.paid_at)} · ร้านกำลังแพ็กสินค้าแบบมิดชิด` : "" },
    { label: "จัดส่งแล้ว", sub: o.shipped_at ? `${dt(o.shipped_at)}${tracksOf(o)[0] ? ` · ${carrierName(tracksOf(o)[0].carrier) || "ขนส่ง"} · ${tracksOf(o)[0].tracking_no}` : ""}` : "" },
    { label: "สำเร็จ", sub: o.done_at ? `${dt(o.done_at)} · ได้รับสินค้าเรียบร้อย` : "" },
  ];
  if (o.status === "rejected") {
    return (
      <div className={card} style={{ borderColor: "#b0182c" }}>
        <p className="font-semibold text-[#ef8a97]">คำสั่งซื้อถูกปฏิเสธ</p>
        <p className="text-[12.5px] text-[#cdbfb3] mt-1">เหตุผล: {o.reject_reason || "โปรดติดต่อทีมงาน"}</p>
      </div>
    );
  }
  return (
    <div className={`${card} !pt-4 !pb-1`} style={{ borderColor: LINE }}>
      {steps.map((s, i) => {
        const past = i < at || at === 3, cur = i === at && at !== 3, reached = i <= at;
        return (
          <div key={s.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="w-6 h-6 rounded-full border-2 grid place-items-center text-white text-xs box-border" style={{ borderColor: reached ? (i === 0 && at === 0 ? "#ffd76a" : "#7fd6a3") : "#5a4a3a", background: past ? "#2f5e45" : cur ? "#b0182c" : "transparent" }}>{past ? "✓" : cur ? "•" : ""}</span>
              <span className="w-0.5 flex-1 min-h-6" style={{ background: i === 3 ? "transparent" : i < at ? "#3f8f63" : LINE }} />
            </div>
            <div className="pb-3.5 min-w-0">
              <div className="font-semibold text-sm" style={{ color: reached ? "#f6efe4" : "#7d6d6a" }}>{s.label}</div>
              <div className="text-xs text-[#cdbfb3]">{reached ? s.sub || "—" : "รอดำเนินการ"}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TrackView() {
  const sp = useSearchParams();
  const [tab, setTab] = useState<"find" | "mine">("find");
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [link, setLink] = useState<{ id: string; t: string } | null>(null);
  const [mine, setMine] = useState<PublicOrder[] | null>(null);
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState(false);
  const [no, setNo] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const { text, flash } = useToast();

  const loadMine = useCallback(() =>
    fetch("/api/market/track?mine=1", { cache: "no-store" }).then((r) => r.json()).then((d: { ok?: boolean; orders?: PublicOrder[]; phone?: string }) => {
      if (d.ok) { setVerified(true); setMine(d.orders ?? []); if (d.phone) setPhone(d.phone); }
    }).catch(() => {}), []);

  useEffect(() => {
    const id = sp.get("id"), t = sp.get("t");
    if (id && t) {
      setLink({ id, t });
      fetch(`/api/market/track?id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`, { cache: "no-store" }).then((r) => r.json())
        .then((d: { ok?: boolean; order?: PublicOrder; error?: string }) => (d.ok && d.order ? setOrder(d.order) : setErr(d.error || "ลิงก์ไม่ถูกต้อง"))).catch(() => {});
    }
    loadMine();
  }, [sp, loadMine]);

  const lookup = async () => {
    if (!no.trim() || !verified) return;
    setErr(""); setBusy(true);
    const r = await fetch("/api/market/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_no: no }) });
    const d = (await r.json().catch(() => ({}))) as { ok?: boolean; order?: PublicOrder; error?: string };
    setBusy(false);
    if (d.ok && d.order) { setOrder(d.order); setLink(null); } else setErr(d.error || "ไม่พบคำสั่งซื้อ");
  };
  const receive = async () => {
    if (!order) return;
    setBusy(true);
    const body = link ? { received: true, id: link.id, t: link.t } : { received: true, order_no: order.order_no };
    const r = await fetch("/api/market/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = (await r.json().catch(() => ({}))) as { ok?: boolean; order?: PublicOrder; error?: string };
    setBusy(false);
    if (d.ok && d.order) { setOrder(d.order); flash("ขอบคุณ · ยืนยันรับสินค้าแล้ว"); loadMine(); } else flash(d.error || "ทำรายการไม่สำเร็จ");
  };
  const copy = async (s: string) => {
    try { await navigator.clipboard.writeText(s); flash(`คัดลอกเลขพัสดุ ${s} แล้ว`); } catch { flash(s); }
  };
  const searchLabel = !no.trim() ? "กรอกเลขคำสั่งซื้อ" : !verified ? "ยืนยันเบอร์ด้วย OTP" : busy ? "กำลังค้นหา…" : "ดูสถานะคำสั่งซื้อ";

  return (
    <div className="px-[18px] pt-3.5 pb-6 flex flex-col gap-3">
      <div role="tablist" className="flex gap-1 p-1 rounded-[14px] bg-[#241717] border" style={{ borderColor: LINE }}>
        {([["find", "ค้นหาคำสั่งซื้อ"], ["mine", "คำสั่งซื้อของฉัน"]] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); if (k === "mine") setOrder(null); }}
            className="flex-1 min-h-11 rounded-[10px] text-[13.5px] font-semibold" style={{ background: tab === k ? "#b0182c" : "transparent", color: tab === k ? "#fff" : "#d3c7bc" }}>{label}</button>
        ))}
      </div>

      {tab === "find" && !order && (
        <>
          <p className="text-[12.5px] text-[#cdbfb3] leading-relaxed">กรอกเลขคำสั่งซื้อและเบอร์ที่ใช้สั่ง แล้วยืนยันด้วย OTP · ไม่ต้องสมัครสมาชิก</p>
          <label className={fl}>เลขคำสั่งซื้อ
            <input value={no} onChange={(e) => setNo(e.target.value.toUpperCase())} placeholder="เช่น MK261007-0123" className={`${fi} tracking-wider`} style={{ borderColor: no ? "#5a4a3a" : LINE }} />
          </label>
          <div className={`${fl} ${otpSkin}`}>เบอร์มือถือที่ใช้สั่ง
            {verified ? <p className="!text-[#7fd6a3] text-[13px]">✓ ยืนยันเบอร์ {phone} แล้ว</p> : <OtpStep phone={phone} onPhone={setPhone} verified={verified} onVerified={() => { setVerified(true); loadMine(); }} inputCls={`${fi} flex-1`} />}
          </div>
          {err && <p role="alert" className="text-[13px] text-[#ef8a97]">{err}</p>}
          <button type="button" onClick={lookup} disabled={busy} className={cta} style={{ ...ctaStyle, opacity: no.trim() && verified ? 1 : 0.45 }}>{searchLabel}</button>
          <p className="text-xs text-[#7d6d6a]">ลืมเลขคำสั่งซื้อ? ดูได้ใน SMS ยืนยัน หรือแท็บ “คำสั่งซื้อของฉัน”</p>
        </>
      )}

      {tab === "find" && order && (
        <>
          <div className={`${card} flex flex-col gap-1`} style={{ borderColor: LINE }}>
            <div className="flex justify-between items-center gap-2">
              <span className="font-lux text-base text-[#ffd76a] tracking-wide">{order.order_no}</span>
              <span className="px-[9px] py-[3px] rounded-full border text-[11.5px] font-semibold shrink-0" style={{ borderColor: ST[order.status][1], color: ST[order.status][1] }}>{ST[order.status][0]}</span>
            </div>
            <div className="text-[12.5px] text-[#cdbfb3]">{d8(order.created_at)} · {itemsText(order)}</div>
            <div className="font-lux text-[15px]">ยอดชำระ {fmt(order.total)}{order.discount > 0 && <span className="text-[11.5px] text-[#7fd6a3] ml-2">ส่วนลด {order.promo_code} −{fmt(order.discount)}</span>}</div>
            <div className="text-[11.5px] text-[#7d6d6a]">ส่งถึง {order.buyer_name} · {order.phone}</div>
          </div>
          <Timeline o={order} />
          {(order.status === "shipped" || order.status === "done") && tracksOf(order).map((t) => {
            const href = carrierLink(t.carrier, t.tracking_no);
            return (
              <div key={t.tracking_no} className={`${card} flex items-center gap-2.5`} style={{ borderColor: "#3f8f63" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#cdbfb3]">{carrierName(t.carrier) || "ขนส่ง"} · เลขพัสดุ{href && <> · <a href={href} target="_blank" rel="noreferrer" className="text-[#ffd76a] underline">ติดตาม ↗</a></>}</div>
                  <div className="font-lux text-[17px] tracking-[1px] break-all">{t.tracking_no}</div>
                </div>
                <button type="button" onClick={() => copy(t.tracking_no)} className="min-h-11 px-3.5 rounded-xl border bg-[#21191a] text-[#ffd76a] font-semibold shrink-0" style={{ borderColor: LINE }}>คัดลอก</button>
              </div>
            );
          })}
          <div className={`${card} text-[12.5px] text-[#d3c7bc] leading-relaxed`} style={{ background: "#1d1712", borderColor: "rgba(227,195,92,.35)" }}>แพ็กมิดชิด · กล่องสีพื้น ไม่ระบุชื่อสินค้าหรือชื่อร้านบนหน้ากล่อง</div>
          {order.status === "shipped" && <button type="button" onClick={receive} disabled={busy} className={cta} style={ctaStyle}>{busy ? "กำลังบันทึก…" : "ได้รับสินค้าแล้ว"}</button>}
          {order.status === "done" && order.items[0] && <Link href={`/products/${order.items[0].product_id}#reviews`} className={ghost} style={{ borderColor: LINE }}>เขียนรีวิวสินค้า</Link>}
          <button type="button" onClick={() => { setOrder(null); setLink(null); setErr(""); }} className={ghost} style={{ borderColor: LINE }}>ค้นหาคำสั่งซื้ออื่น</button>
          <p className="text-[12.5px] text-[#cdbfb3]">มีปัญหากับสินค้า? <Link href="/policy/returns" className="text-[#ffd76a]">นโยบายคืนสินค้า</Link></p>
        </>
      )}

      {tab === "mine" && (
        !verified ? (
          <>
            <p className="text-[12.5px] text-[#cdbfb3] leading-relaxed">ยืนยันเบอร์ที่ใช้สั่งซื้อด้วย OTP เพื่อดูคำสั่งซื้อทั้งหมดของเบอร์นี้</p>
            <div className={otpSkin}><OtpStep phone={phone} onPhone={setPhone} verified={verified} onVerified={() => { setVerified(true); loadMine(); }} inputCls={`${fi} flex-1`} /></div>
          </>
        ) : (
          <>
            <div className={`${card} flex items-center justify-between text-[12.5px]`} style={{ borderColor: LINE }}><span className="text-[#cdbfb3]">เบอร์ที่ยืนยันแล้ว</span><span>{phone}</span></div>
            {mine && !mine.length && <p className="text-[13px] text-[#cdbfb3]">ยังไม่มีคำสั่งซื้อของเบอร์นี้</p>}
            {mine?.map((o) => (
              <button key={o.id} type="button" onClick={() => { setOrder(o); setLink(null); setTab("find"); window.scrollTo({ top: 0 }); }} className={`${card} lux-card flex flex-col gap-1 text-left text-[#f6efe4] w-full`} style={{ borderColor: LINE }}>
                <span className="flex justify-between w-full gap-2"><span className="font-lux text-[#ffd76a]">{o.order_no}</span><span className="text-[11.5px] font-semibold" style={{ color: ST[o.status][1] }}>{ST[o.status][0]}</span></span>
                <span className="text-[12.5px] text-[#cdbfb3] line-clamp-1">{d8(o.created_at)} · {itemsText(o)}</span>
                <span className="flex justify-between w-full text-[13px]"><span>{fmt(o.total)}</span><span className="text-[#ffd76a]">ดูสถานะ →</span></span>
              </button>
            ))}
            <Link href="/products" className={ghost} style={{ borderColor: LINE }}>เลือกซื้อสินค้าต่อ</Link>
          </>
        )
      )}
      <Toast text={text} bottom={24} />
    </div>
  );
}
