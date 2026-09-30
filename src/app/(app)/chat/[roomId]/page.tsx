"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { baht, Modal, Field, Sheet, Toast } from "@/components/ui";
import { DEMO_ROOMS } from "@/lib/demo-data";
import type { ChatMessage, ChatPayment } from "@/lib/types";

export default function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { t, lang } = useI18n();
  const room = useMemo(() => DEMO_ROOMS.find((r) => r.id === roomId), [roomId]);

  const [messages, setMessages] = useState<ChatMessage[]>(room?.messages ?? []);
  const [input, setInput] = useState("");
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<number>(0); // ส่วนลด (บาท)
  const [toast, setToast] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // payment state (mirror ของ Hafriend + Order ของเรา)
  const [depositCreated, setDepositCreated] = useState(room?.depositCreated ?? false);
  const [depositConfirmed, setDepositConfirmed] = useState(room?.depositConfirmed ?? false);
  const [finalCreated, setFinalCreated] = useState(room?.finalCreated ?? false);
  const [finalConfirmed, setFinalConfirmed] = useState(room?.finalConfirmed ?? false);
  const [reviewed, setReviewed] = useState(room?.reviewed ?? false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ดึงข้อความจาก server (demo memory store / LIVE: Supabase) — ถ้า fail ใช้ข้อมูล local
  useEffect(() => {
    fetch(`/api/chat/${roomId}/messages`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.messages) && d.messages.length) setMessages(d.messages); })
      .catch(() => {});
  }, [roomId]);

  function pushToServer(payload: Record<string, unknown>) {
    fetch(`/api/chat/${roomId}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderId: "me", ...payload }),
    }).catch(() => {});
  }

  if (!room) {
    return (
      <main className="app-frame safe-bottom">
        <div className="text-center py-24 text-ink-400">💬 {t.empty}</div>
      </main>
    );
  }

  const meIsProvider = false; // demo: ผู้ใช้คือผู้ว่าจ้าง

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2000); }

  function sendImage(src: string) {
    setMessages((m) => [...m, {
      id: String(Date.now()), roomId, senderId: "me", kind: "image", content: src,
      createdAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }), isRead: false,
    }]);
    if (!src.startsWith("data:")) pushToServer({ kind: "image", content: src });
  }

  function pickImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => sendImage(String(reader.result));
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function send() {
    if (!input.trim() || !room) return;
    const partnerId = room.partner.id;
    const text = input.trim();
    setMessages((m) => [...m, {
      id: String(Date.now()), roomId, senderId: "me", kind: "text",
      content: text, createdAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }), isRead: false,
    }]);
    setInput("");
    pushToServer({ kind: "text", content: text });
    // จำลอง auto-reply ของอีกฝ่าย
    setTimeout(() => {
      setMessages((m) => [...m, {
        id: String(Date.now() + 1), roomId, senderId: partnerId, kind: "text",
        content: lang === "th" ? "รับทราบครับผม 🙏" : "Noted! 🙏",
        createdAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }), isRead: false,
      }]);
    }, 1200);
  }

  function sendPayment(type: "deposit" | "final") {
    const amount = type === "deposit" ? 300 : 1200;
    const pay: ChatPayment = {
      id: String(Date.now()), type,
      amount: Math.max(0, amount - promoApplied),
      status: "created", bankLabel: "กสิกรไทย x-4451",
      promoCode: promoApplied ? promoCode : undefined, discount: promoApplied,
    };
    setMessages((m) => [...m, {
      id: String(Date.now()), roomId, senderId: "me", kind: "payment", content: "",
      payment: pay, createdAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }), isRead: false,
    }]);
    if (type === "deposit") setDepositCreated(true); else setFinalCreated(true);
    flash(lang === "th" ? "ส่งข้อความการชำระเงินแล้ว" : "Payment message sent");
  }

  function attachSlip(payId: string) {
    setMessages((m) => m.map((msg) =>
      msg.id === payId && msg.payment ? { ...msg, payment: { ...msg.payment, status: "slip_uploaded", slipUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=60" } } : msg
    ));
    flash(t.slipUploaded);
  }

  function confirmPayment(payId: string) {
    setMessages((m) => m.map((msg) =>
      msg.id === payId && msg.payment ? { ...msg, payment: { ...msg.payment, status: "confirmed" } } : msg
    ));
    const msg = messages.find((x) => x.id === payId);
    if (msg?.payment?.type === "deposit") setDepositConfirmed(true);
    else setFinalConfirmed(true);
    flash(lang === "th" ? "ยืนยันรับเงินเรียบร้อย ✓" : "Payment confirmed ✓");
  }

  const paymentCard = (pay: ChatPayment, mine: boolean) => {
    const statusLabel = pay.status === "created" ? t.statusCreated : pay.status === "slip_uploaded" ? t.statusSlip : t.statusConfirmed;
    const statusTone = pay.status === "confirmed" ? "text-emerald-400" : pay.status === "slip_uploaded" ? "text-gold-400" : "text-crimson-300";
    return (
      <div className={`glass rounded-2xl p-4 min-w-[240px] ${mine ? "ml-auto border-crimson-500/30" : "border-gold-500/25"}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="chip chip-red">{pay.type === "deposit" ? `💰 ${t.paymentDeposit}` : `🧾 ${t.paymentFinal}`}</span>
          <span className={`text-xs font-semibold ${statusTone}`}>● {statusLabel}</span>
        </div>
        <p className="text-2xl font-bold text-gold-400">{baht(pay.amount)}</p>
        {pay.discount > 0 && <p className="text-xs text-emerald-400 mt-0.5">{t.promoCode} {pay.promoCode} −{baht(pay.discount)}</p>}
        <p className="text-xs text-ink-400 mt-1">🏦 {pay.bankLabel}</p>

        {/* QR จำลอง PromptPay */}
        {pay.status === "created" && !mine && (
          <div className="mt-3 bg-white/95 rounded-xl p-3 w-fit mx-auto">
            <div className="grid grid-cols-8 gap-[2px]">
              {Array.from({ length: 64 }).map((_, i) => (
                <span key={i} className="w-2.5 h-2.5 rounded-[1px]" style={{ background: (i * 7 + pay.amount) % 3 === 0 ? "#111" : "transparent" }} />
              ))}
            </div>
            <p className="text-[9px] text-black/70 text-center mt-1.5">PromptPay (demo)</p>
          </div>
        )}

        {pay.slipUrl && (
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pay.slipUrl} alt="slip" className="rounded-xl w-40 border border-white/10" />
          </div>
        )}

        <div className="flex gap-2 mt-3">
          {pay.status === "created" && !mine && (
            <button onClick={() => attachSlip(pay.id)} className="btn-crimson rounded-lg px-3 py-2 text-xs font-semibold flex-1">📎 {t.attachSlip}</button>
          )}
          {pay.status === "slip_uploaded" && !mine && (
            <button onClick={() => confirmPayment(pay.id)} className="btn-crimson rounded-lg px-3 py-2 text-xs font-semibold flex-1">✓ {t.confirmPaid}</button>
          )}
          {pay.status === "confirmed" && <span className="text-xs text-emerald-400 flex-1 text-center py-2">✓ {t.statusConfirmed}</span>}
        </div>
      </div>
    );
  };

  return (
    <main className="app-frame flex flex-col h-dvh">
      {/* header */}
      <header className="sticky top-0 z-30 bg-ink-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-2 px-4 h-14">
          <Link href="/chat" className="w-10 h-10 -ml-2 grid place-items-center text-ink-200" aria-label="back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M15 5l-7 7 7 7" strokeLinecap="round"/></svg>
          </Link>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={room.partner.avatar} alt="" className="w-9 h-9 rounded-full bg-ink-700" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{room.partner.name}</p>
            <p className="text-[11px] text-gold-400 truncate">
              {depositConfirmed && finalConfirmed ? t.stCompleted : depositConfirmed ? t.stInProgress : t.stNegotiated}
            </p>
          </div>
          <Link href={`/call/${room.id}`} className="btn-ghost rounded-full w-9 h-9 grid place-items-center shrink-0" aria-label="call">📞</Link>
          <Link href="/escrow/e1" className="btn-ghost rounded-full w-9 h-9 grid place-items-center shrink-0 border-gold-500/50" aria-label="escrow">🏦</Link>
          <button onClick={() => setPromoOpen(true)} className="btn-ghost rounded-full w-9 h-9 hidden min-[360px]:grid place-items-center shrink-0" aria-label="promo">🎟️</button>
          <button onClick={() => setBlockOpen(true)} className="btn-ghost rounded-full w-9 h-9 grid place-items-center shrink-0" aria-label="block">🚫</button>
        </div>

        {/* order timeline (escrow ของเรา) */}
        <div className="flex items-start justify-between px-4 pb-2.5 gap-1">
          {[
            [t.stNegotiated, true],
            [t.stDeposit, depositConfirmed],
            [t.stInProgress, depositConfirmed && finalCreated],
            [t.stCompleted, depositConfirmed && finalConfirmed],
            [t.stReviewed, reviewed],
          ].map(([label, done], i, arr) => (
            <div key={i} className="flex items-start flex-1 last:flex-none">
              <div className="flex flex-col items-center shrink-0 w-12">
                <span className={`w-2.5 h-2.5 rounded-full ${done ? "bg-gold-500 shadow-[0_0_10px_rgba(212,175,55,.6)]" : "bg-ink-600"}`} />
                <span className={`text-[9px] mt-1 leading-tight text-center max-w-[48px] ${done ? "text-gold-400" : "text-ink-500"}`}>{label as string}</span>
              </div>
              {i < arr.length - 1 && <div className={`h-0.5 flex-1 -mx-4 mt-[4px] ${arr[i + 1][1] ? "bg-gold-500/60" : "bg-ink-600"}`} />}
            </div>
          ))}
        </div>
      </header>

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const mine = msg.senderId === "me";
          if (msg.kind === "payment" && msg.payment) {
            return <div key={msg.id}>{paymentCard(msg.payment, mine)}</div>;
          }
          if (msg.kind === "image") {
            return (
              <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"} animate-rise`}>
                {!mine && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={room.partner.avatar} alt="" className="w-7 h-7 rounded-full bg-ink-700 self-end mb-1 mr-2" />
                )}
                <div className="max-w-[70%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={msg.content} alt="chat image" className="rounded-2xl w-full border border-white/10" />
                  <span className={`block text-[9px] mt-1 ${mine ? "text-ink-500 text-right" : "text-ink-500"}`}>{msg.createdAt}</span>
                </div>
              </div>
            );
          }
          return (
            <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"} animate-rise`}>
              {!mine && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={room.partner.avatar} alt="" className="w-7 h-7 rounded-full bg-ink-700 self-end mb-1 mr-2" />
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                ${mine ? "bg-gradient-to-br from-crimson-600 to-crimson-700 text-white rounded-br-md" : "glass rounded-bl-md"}`}>
                {msg.content.split(/(https?:\/\/\S+)/).map((part, i) =>
                  part.startsWith("http") ? <a key={i} href={part} target="_blank" className="underline text-gold-300">{part}</a> : part
                )}
                <span className={`block text-[9px] mt-1 ${mine ? "text-white/60" : "text-ink-500"}`}>{msg.createdAt}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* payment action bar (ฝั่งผู้ว่าจ้าง: ปุ่มส่งมัดจำ/ค่าจ้าง; ฝั่งเพื่อน: ยืนยันในการ์ด) */}
      {!(depositConfirmed && finalConfirmed) && (
        <div className="px-4 pb-2 pt-2 border-t border-white/5 bg-ink-950/80 backdrop-blur flex gap-2">
          {!depositCreated && (
            <button onClick={() => sendPayment("deposit")} className="btn-crimson rounded-xl px-4 py-2.5 text-xs font-bold flex-1">
              💰 {t.depositBtn} {baht(300 - promoApplied)}
            </button>
          )}
          {depositConfirmed && !finalCreated && (
            <button onClick={() => sendPayment("final")} className="btn-crimson rounded-xl px-4 py-2.5 text-xs font-bold flex-1">
              🧾 {t.finalBtn} {baht(1200 - promoApplied)}
            </button>
          )}
          {depositCreated && !depositConfirmed && (
            <span className="flex-1 text-center text-xs text-gold-400 py-2.5">⏳ {lang === "th" ? "รอผู้รับเงินยืนยันมัดจำ…" : "Waiting deposit confirmation…"}</span>
          )}
          <button onClick={() => setPromoOpen(true)} className="btn-ghost rounded-xl px-3 text-sm">🎟️</button>
        </div>
      )}

      {/* review unlock */}
      {depositConfirmed && finalConfirmed && !reviewed && (
        <div className="px-4 pb-2 pt-2 border-t border-white/5 bg-ink-950/80">
          <button onClick={() => setReviewOpen(true)} className="btn-crimson w-full rounded-xl py-2.5 text-xs font-bold">⭐ {t.writeReview}</button>
        </div>
      )}
      {reviewed && (
        <div className="px-4 pb-2 pt-2 border-t border-white/5 text-center text-xs text-gold-400 py-3">⭐ {t.stReviewed}</div>
      )}

      {/* input */}
      {blocked ? (
        <div className="px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-2 border-t border-white/5 bg-ink-950/90 text-center">
          <p className="text-xs text-ink-400">🚫 {t.blocked} — <button onClick={() => setBlocked(false)} className="text-crimson-300 underline">{t.unblock}</button></p>
        </div>
      ) : (
        <div className="px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-1 flex gap-2 items-center border-t border-white/5 bg-ink-950/90">
          <button onClick={() => setInput((v) => v + "🙏")} className="w-10 h-10 shrink-0 grid place-items-center text-ink-300 hover:text-gold-300 text-xl" aria-label="emoji">😊</button>
          <button onClick={pickImage} className="w-10 h-10 shrink-0 grid place-items-center text-ink-300 hover:text-gold-300 text-xl" aria-label="attach image">📎</button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={t.typeMessage}
            className="input-dark flex-1 !rounded-full"
          />
          <button onClick={send} className="btn-crimson rounded-full w-10 h-10 grid place-items-center" aria-label="send">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3 11.5L21 3l-8.5 18-2.6-7.4L3 11.5z"/></svg>
          </button>
        </div>
      )}

      {/* block sheet */}
      <Sheet open={blockOpen} onClose={() => setBlockOpen(false)} title={`🚫 ${t.block}`}>
        <div className="glass rounded-2xl p-4 flex items-center gap-3 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={room.partner.avatar} alt="" className="w-12 h-12 rounded-full bg-ink-700" />
          <div>
            <p className="font-semibold">{room.partner.name}</p>
            <p className="text-xs text-ink-400">{t.block === "Block" ? "Block this user?" : "บล็อกผู้ใช้นี้?"}</p>
          </div>
        </div>
        <p className="text-xs text-ink-400 mb-4">{lang === "th" ? "เมื่อบล็อกแล้ว อีกฝ่ายจะส่งข้อความหาคุณไม่ได้ และปลดบล็อกได้ตลอดเวลา" : "Blocked users cannot message you. You can unblock anytime."}</p>
        <div className="flex gap-2">
          <button onClick={() => setBlockOpen(false)} className="btn-ghost rounded-xl flex-1 py-2.5 text-sm">{t.cancel}</button>
          <button
            onClick={() => { setBlocked(true); setBlockOpen(false); flash(lang === "th" ? "บล็อกเรียบร้อย" : "Blocked"); }}
            className="btn-crimson rounded-xl flex-1 py-2.5 text-sm font-semibold"
          >🚫 {t.block}</button>
        </div>
      </Sheet>

      {/* promo modal */}
      <Modal open={promoOpen} onClose={() => setPromoOpen(false)} title={`🎟️ ${t.promoCode}`}>
        <Field label={t.promoCode}>
          <input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="MORD10" className="input-dark" />
        </Field>
        {promoApplied > 0 && <p className="text-emerald-400 text-sm mb-3">✓ {t.promoApplied} −{baht(promoApplied)}</p>}
        <div className="flex gap-2">
          <button onClick={() => { setPromoApplied(0); setPromoOpen(false); }} className="btn-ghost rounded-xl flex-1 py-2.5 text-sm">{t.reset}</button>
          <button
            onClick={() => { if (promoCode === "MORD10") setPromoApplied(50); else flash(t.promoInvalid); setPromoOpen(false); }}
            className="btn-crimson rounded-xl flex-1 py-2.5 text-sm font-semibold"
          >{t.applyPromo}</button>
        </div>
      </Modal>

      {/* review sheet */}
      <Sheet open={reviewOpen} onClose={() => setReviewOpen(false)} title={t.writeReview}>
        <div className="flex gap-2 justify-center mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} onClick={() => setRating(i)} className={`text-3xl ${i <= rating ? "text-gold-500" : "text-ink-600"}`}>★</button>
          ))}
        </div>
        <Field label={t.writeReview}>
          <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={4} className="input-dark" placeholder={t.reviewPlaceholder} />
        </Field>
        <button
          onClick={() => {
            flash(lang === "th" ? "ขอบคุณสำหรับรีวิว ⭐" : "Thanks for your review ⭐");
            setReviewed(true); setReviewOpen(false);
            fetch("/api/review", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ postId: "p1", rating, content: reviewText }),
            }).catch(() => {});
          }}
          className="btn-crimson rounded-xl w-full py-2.5 text-sm font-semibold"
        >{t.send}</button>
      </Sheet>

      <Toast show={!!toast}>{toast}</Toast>
    </main>
  );
}
