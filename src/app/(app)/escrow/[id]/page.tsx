"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { baht, Toast } from "@/components/ui";
import { DEMO_MEMBERS, DEMO_ME } from "@/lib/demo-data";
import type { EscrowOrder, EscrowState } from "@/lib/types";

type Role = "hirer" | "provider";

const STEPS: { state: EscrowState; th: string; en: string; icon: string }[] = [
  { state: "accepted", th: "รับงาน", en: "Job accepted", icon: "🤝" },
  { state: "awaiting_check", th: "ตรวจสลิป", en: "Checking slip", icon: "🔎" },
  { state: "funded", th: "เงินเข้าระบบกลาง", en: "Escrow funded", icon: "🔒" },
  { state: "in_progress", th: "กำลังทำงาน", en: "In progress", icon: "🔧" },
  { state: "delivered", th: "ส่งงานแล้ว", en: "Delivered", icon: "📦" },
  { state: "released", th: "จ่ายเงินแล้ว", en: "Released", icon: "💸" },
];
const stepIdx = (s: EscrowState) => STEPS.findIndex((x) => x.state === s) < 0 ? STEPS.length - 1 : STEPS.findIndex((x) => x.state === s);

export default function EscrowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useI18n();
  const th = lang === "th";

  const fallback: EscrowOrder = {
    id, roomId: "room1", hirer: DEMO_ME, provider: DEMO_MEMBERS[0],
    title: "กินข้าว + เดินเล่นสยาม", hours: 3, place: "สยามพารากอน",
    amount: 1500, gpPercent: 20, state: "accepted", createdAt: new Date().toISOString(),
  };
  const [order, setOrder] = useState<EscrowOrder>(fallback);
  const [role, setRole] = useState<Role>("hirer");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    fetch(`/api/escrow/${id}`).then((r) => r.json()).then((d) => { if (d.order) setOrder(d.order); }).catch(() => {});
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2200); }

  async function act(action: string, useRole: string = role) {
    setBusy(true);
    try {
      const res = await fetch(`/api/escrow/${id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, role: useRole }),
      });
      const d = await res.json();
      if (d.order) { setOrder(d.order); flash(th ? "อัปเดตแล้ว ✓" : "Updated ✓"); }
      else flash(d.error ?? "error");
    } catch { flash("error"); }
    setBusy(false);
  }

  // จำลองระบบกลางตรวจสลิปอัตโนมัติ (โหมดจริง: webhook ธนาคาร/Omise)
  useEffect(() => {
    if (order.state !== "awaiting_check") return;
    const tm = setTimeout(() => act("verify", "system"), 1500);
    return () => clearTimeout(tm);
  }, [order.state]);

  const gp = Math.round((order.amount * order.gpPercent) / 100);
  const providerNet = order.amount - gp;
  const step = stepIdx(order.state);

  // ตำแหน่งเงินตอนนี้
  const moneyAt =
    step < 2 ? { icon: "👤", label: th ? "อยู่กับลูกค้า (ยังไม่โอน)" : "With hirer (not paid)", tone: "text-ink-300" }
    : step < 5 ? { icon: "🔒", label: th ? "ระบบกลางกันเงินไว้" : "HELD IN ESCROW", tone: "text-gold-600" }
    : { icon: "💸", label: th ? "โอนให้เพื่อนแล้ว" : "Released to your companion", tone: "text-emerald-400" };

  return (
    <main className="app-frame safe-bottom pb-8">
      <header className="sticky top-0 z-30 bg-ink-950/90 backdrop-blur-xl border-b border-ink-600 px-4 h-14 flex items-center gap-3">
        <Link href="/orders" className="w-10 h-10 -ml-2 rounded-full border border-ink-600 grid place-items-center text-ink-100 text-xl leading-none" aria-label="back">‹</Link>
        <h1 className="font-semibold flex-1">🏦 {th ? "ระบบกลาง (Escrow)" : "Escrow center"}</h1>
        {/* สลับมุมมองบทบาท (เดโม) */}
        <div className="glass rounded-full p-0.5 flex">
          {(["hirer", "provider"] as Role[]).map((r) => (
            <button key={r} onClick={() => setRole(r)} className={`px-3 py-1 rounded-full text-[11px] font-semibold ${role === r ? "btn-crimson" : "text-ink-400"}`}>
              {r === "hirer" ? (th ? "ลูกค้า" : "Hirer") : (th ? "เพื่อน" : "Companion")}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* deal */}
        <div className="glass rounded-2xl p-4 animate-rise">
          <p className="font-semibold">{order.title} <span className="text-gold-600">({order.hours}{th ? "ชม." : "hrs"})</span></p>
          <p className="text-xs text-ink-400 mt-1">📍 {order.place}</p>
          <div className="flex items-center gap-3 mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={order.hirer.avatar} alt="" className="w-9 h-9 rounded-full bg-ink-700 -mr-2 z-10 border-2 border-ink-900" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={order.provider.avatar} alt="" className="w-9 h-9 rounded-full bg-ink-700 border-2 border-ink-900" />
            <p className="text-xs text-ink-300">{order.hirer.name} → {order.provider.name}</p>
          </div>
        </div>

        {/* MONEY LOCATION — ตอบคำถาม "เงินอยู่ไหนตอนนี้" */}
        <div className={`glass rounded-2xl p-5 text-center animate-rise border ${step >= 2 && step < 5 ? "border-gold-500/50" : ""}`}>
          <p className="text-[10px] text-ink-400 uppercase tracking-widest">{th ? "เงินอยู่ที่ไหนตอนนี้" : "Where is the money now"}</p>
          <p className={`text-2xl font-bold mt-1.5 ${moneyAt.tone}`}>{moneyAt.icon} {moneyAt.label}</p>
          <p className="text-3xl font-black text-gold-600 mt-2">{baht(order.amount)}</p>
          <div className="flex justify-center gap-4 text-[11px] text-ink-400 mt-2">
            <span>{th ? "ระบบกันไว้" : "Held"}: {step >= 2 && step < 5 ? baht(order.amount) : baht(0)}</span>
            <span>{th ? "เพื่อนจะได้รับ" : "Companion receives"}: {baht(providerNet)} <span className="text-ink-500">(GP {order.gpPercent}%)</span></span>
          </div>
        </div>

        {/* timeline */}
        <div className="glass rounded-2xl p-4 animate-rise">
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <div key={s.state} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <span className={`w-9 h-9 rounded-full grid place-items-center text-sm ${i <= step ? (i === step ? "bg-gradient-to-br from-crimson-500 to-crimson-700 shadow-glow-red" : "bg-gold-500/20 border border-gold-500/60") : "bg-ink-700 text-ink-400"}`}>
                    {i < step ? "✓" : s.icon}
                  </span>
                  <span className={`text-[8px] whitespace-nowrap ${i <= step ? "text-ink-200" : "text-ink-500"}`}>{th ? s.th : s.en}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-1 mb-5 ${i < step ? "bg-gold-500/60" : "bg-ink-600"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* ACTIONS ตามบทบาท */}
        <div className="animate-rise">
          {order.state === "disputed" ? (
            <div className="glass rounded-2xl p-5 text-center border-crimson-500/50">
              <p className="text-3xl">⚖️</p>
              <p className="font-semibold mt-2">{th ? "อยู่ระหว่างตรวจสอบข้อพิพาท" : "Under dispute review"}</p>
              <p className="text-xs text-ink-400 mt-1">{th ? "เงินยังถูกกันไว้ในระบบกลางจนกว่าแอดมินจะตัดสิน (โดยปกติภายใน 24 ชม.)" : "Money stays in escrow until admin decides (usually <24h)"}</p>
              <Link href="/admin" className="chip chip-red mt-3 inline-block">🛡️ Admin</Link>
            </div>
          ) : (
            <div className="grid gap-2">
              {/* ฝั่งลูกค้า */}
              {role === "hirer" && order.state === "accepted" && (
                <>
                  <div className="bg-white/95 rounded-2xl p-4 w-fit mx-auto">
                    <div className="grid grid-cols-8 gap-[2px]">
                      {Array.from({ length: 64 }).map((_, i) => (
                        <span key={i} className="w-2.5 h-2.5 rounded-[1px]" style={{ background: (i * 7 + order.amount) % 3 === 0 ? "#111" : "transparent" }} />
                      ))}
                    </div>
                    <p className="text-[9px] text-black/70 text-center mt-1.5">PromptPay Mister Bamrungsuk Escrow (demo) · {baht(order.amount)}</p>
                  </div>
                  <button onClick={() => act("fund")} disabled={busy} className="btn-crimson rounded-xl py-3.5 font-bold">
                    📎 {th ? `แนบสลิปโอน ${baht(order.amount)} เข้าระบบกลาง` : `Attach slip — pay ${baht(order.amount)} into escrow`}
                  </button>
                </>
              )}
              {role === "hirer" && order.state === "awaiting_check" && (
                <p className="text-center text-sm text-gold-600 py-3">🔎 {th ? "ระบบกลางกำลังตรวจสลิป…" : "Verifying your payment…"}</p>
              )}
              {role === "hirer" && order.state === "delivered" && (
                <>
                  <button onClick={() => act("release")} disabled={busy} className="btn-crimson rounded-xl py-3.5 font-bold animate-[pulseRed_2.4s_ease-in-out_infinite]">
                    ✅ {th ? "จบนัดแล้ว — ปล่อยเงินให้เพื่อน" : "Approve & release money"}
                  </button>
                  <p className="text-[10px] text-ink-500 text-center">{th ? "ไม่กดภายใน 24 ชม. ระบบปล่อยเงินให้อัตโนมัติ" : "Auto-releases after 24h"}</p>
                </>
              )}
              {role === "hirer" && (order.state === "funded" || order.state === "in_progress") && (
                <p className="text-center text-xs text-ink-400 py-3">🔒 {th ? "เงินพักไว้กับเราอย่างปลอดภัย — จ่ายให้เพื่อนเมื่อจบนัดเท่านั้น" : "Your money is held safely — released only when work is done"}</p>
              )}

              {/* ฝั่ง Part-Time */}
              {role === "provider" && order.state === "accepted" && (
                <p className="text-center text-xs text-ink-400 py-3">⏳ {th ? "รอลูกค้าโอนเข้าระบบกลาง — ยังไม่ต้องเริ่มงาน" : "Waiting for hirer to fund escrow — don't start yet"}</p>
              )}
              {role === "provider" && order.state === "funded" && (
                <button onClick={() => act("start")} disabled={busy} className="btn-crimson rounded-xl py-3.5 font-bold">
                  🔧 {th ? "เริ่มงาน (เงินยืนยันแล้ว ✓)" : "Start work (payment secured ✓)"}
                </button>
              )}
              {role === "provider" && order.state === "in_progress" && (
                <button onClick={() => act("deliver")} disabled={busy} className="btn-crimson rounded-xl py-3.5 font-bold">
                  📦 {th ? "ส่งงาน — ขอปล่อยเงิน" : "Deliver work — request release"}
                </button>
              )}
              {role === "provider" && order.state === "delivered" && (
                <p className="text-center text-xs text-gold-600 py-3">⏳ {th ? "ส่งงานแล้ว รอลูกค้ากดรับงาน (หรือปล่อยอัตโนมัติ 24 ชม.)" : "Delivered — awaiting approval (auto 24h)"}</p>
              )}
              {role === "provider" && order.state === "released" && (
                <div className="glass rounded-2xl p-5 text-center border-emerald-500/40">
                  <p className="text-3xl">💸</p>
                  <p className="font-semibold text-emerald-400 mt-2">{th ? `ได้รับเงิน ${baht(providerNet)} แล้ว` : `Paid ${baht(providerNet)}`}</p>
                  <p className="text-[11px] text-ink-400 mt-1">{th ? `ยอดเต็ม ${baht(order.amount)} − GP ${order.gpPercent}% (${baht(gp)})` : `Gross ${baht(order.amount)} − GP ${baht(gp)}`}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* dispute */}
        {order.state !== "disputed" && order.state !== "released" && (
          <button
            onClick={() => act("dispute")}
            className="w-full text-xs text-ink-400 hover:text-crimson-300 underline underline-offset-4"
          >⚖️ {th ? "มีปัญหา — เปิดข้อพิพาทให้แอดมินตัดสิน (เงินค้างในระบบกลาง)" : "Open a dispute (money stays in escrow)"}</button>
        )}

        <div className="flex gap-2">
          <Link href={`/chat/${order.roomId}`} className="btn-ghost rounded-xl flex-1 py-2.5 text-sm text-center">💬 {th ? "แชท" : "Chat"}</Link>
          <Link href="/tracking/o1" className="btn-ghost rounded-xl flex-1 py-2.5 text-sm text-center">📍 {th ? "ติดตาม" : "Track"}</Link>
        </div>

        <p className="text-[10px] text-ink-500 text-center leading-relaxed">
          {th
            ? "🏦 ระบบกลาง Mister Bamrungsuk กันเงินไว้ให้ทั้งสองฝ่าย — ลูกค้ามั่นใจว่าเงินถึงมือเพื่อนเมื่อจบนัด เพื่อนมั่นใจว่าเงินมีจริงก่อนเริ่มนัด (โหมดจริง: เชื่อม Omise PromptPay + webhook ตรวจสอบอัตโนมัติ)"
            : "Mister Bamrungsuk escrow protects both sides — money reaches your companion only after the meet-up, and they start knowing funds are secured"}
        </p>
      </div>

      <Toast show={!!toast}>{toast}</Toast>
    </main>
  );
}
