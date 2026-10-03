"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Sheet, Field, EmptyState, Modal } from "@/components/ui";
import { DEMO_ROOMS, DEMO_BANKS, DEMO_SAVED_REPLIES, DEMO_AUTO_REPLY } from "@/lib/demo-data";
import { BANKS } from "@/lib/categories";

export default function ChatListPage() {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<"all" | "hirer" | "provider">("all");
  const [q, setQ] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingTab, setSettingTab] = useState<"auto" | "saved" | "banks">("auto");
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [autoMsg, setAutoMsg] = useState(DEMO_AUTO_REPLY);
  const [replies, setReplies] = useState(DEMO_SAVED_REPLIES);
  const [banks, setBanks] = useState(DEMO_BANKS);
  const [addBankOpen, setAddBankOpen] = useState(false);
  const [newBank, setNewBank] = useState({ bankCode: "kbank", accountNo: "", accountName: "" });
  const [savedToast, setSavedToast] = useState(false);

  const rooms = useMemo(() => {
    let list = [...DEMO_ROOMS];
    if (q) list = list.filter((r) => r.partner.name.toLowerCase().includes(q.toLowerCase()) || r.lastMessage.includes(q));
    return list.sort((a, b) => b.unread - a.unread);
  }, [q]);
  void tab;

  return (
    <>
      <TopBar
        title={
          <div>
            <p className="text-[11px] text-gold-600 tracking-widest font-semibold uppercase">{lang === "th" ? "ข้อความ" : "Messages"}</p>
            <h1 className="font-semibold -mt-0.5">{t.chat}</h1>
          </div>
        }
        right={
          <button onClick={() => setSettingsOpen(true)} aria-label="chat settings" className="w-10 h-10 grid place-items-center rounded-full border border-ink-600 text-ink-200 hover:text-gold-300 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.2a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.2a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.2a1.7 1.7 0 001 1.5h0a1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.2a1.7 1.7 0 00-1.5 1z"/></svg>
          </button>
        }
      />

      <div className="px-4 pt-4 space-y-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="input-dark" />
        <div className="flex gap-2">
          {([["all", t.all], ["hirer", t.roleHirer], ["provider", t.roleProvider]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} className={`chip flex-1 text-center ${tab === v ? "chip-red" : ""}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="py-4 grid gap-2 px-4">
        {rooms.length === 0 && <EmptyState icon="💬" title={t.noMessages} />}
        {rooms.map((r) => (
          <Link key={r.id} href={`/chat/${r.id}`} className="glass glass-hover rounded-2xl p-4 flex items-center gap-3 animate-rise">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.partner.avatar} alt="" className="w-12 h-12 rounded-full bg-ink-700" />
              {r.orderStatus !== "negotiated" && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-gold-500 border-2 border-ink-900" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold truncate">{r.partner.name}</p>
                <span className="text-[10px] text-ink-500">{r.lastAt}</span>
              </div>
              <p className={`text-sm truncate mt-0.5 ${r.unread ? "text-ink-100 font-medium" : "text-ink-400"}`}>
                {r.orderStatus === "in_progress" && "💰 "}{r.lastMessage}
              </p>
            </div>
            {r.unread > 0 && <span className="w-5 h-5 rounded-full bg-crimson-600 text-[10px] font-bold grid place-items-center">{r.unread}</span>}
          </Link>
        ))}
      </div>

      {/* ── chat settings ── */}
      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t.chatSettings}>
        <div className="flex gap-2 mb-5">
          {([["auto", t.autoReply], ["saved", t.savedReplies], ["banks", t.bankAccounts]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setSettingTab(v)} className={`chip flex-1 text-center ${settingTab === v ? "chip-red" : ""}`}>{l}</button>
          ))}
        </div>

        {settingTab === "auto" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">{t.autoReply}</span>
              <button onClick={() => setAutoEnabled(!autoEnabled)} className={`w-12 h-6.5 rounded-full transition relative ${autoEnabled ? "bg-crimson-600" : "bg-ink-600"}`} style={{ width: 48, height: 26 }}>
                <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${autoEnabled ? "left-[22px]" : "left-1"}`} />
              </button>
            </div>
            <textarea value={autoMsg} onChange={(e) => setAutoMsg(e.target.value)} rows={5} className="input-dark" />
            <button onClick={() => { setSavedToast(true); setTimeout(() => setSavedToast(false), 1800); }} className="btn-crimson rounded-xl w-full py-2.5 text-sm font-semibold mt-3">{t.save}</button>
          </div>
        )}

        {settingTab === "saved" && (
          <div className="space-y-2">
            {replies.map((r) => (
              <div key={r.id} className="glass rounded-xl p-3.5">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-sm text-gold-300">{r.title}</p>
                  <button onClick={() => setReplies(replies.filter((x) => x.id !== r.id))} className="text-ink-400 hover:text-crimson-400 text-xs">{t.delete}</button>
                </div>
                <p className="text-sm text-ink-300 mt-1">{r.message}</p>
              </div>
            ))}
            <button
              onClick={() => setReplies([...replies, { id: String(Date.now()), title: lang === "th" ? "คำตอบใหม่" : "New reply", message: lang === "th" ? "ข้อความสำเร็จรูป…" : "Quick message…" }])}
              className="btn-ghost rounded-xl w-full py-2.5 text-sm"
            >＋ {t.savedReplies}</button>
          </div>
        )}

        {settingTab === "banks" && (
          <div className="space-y-2">
            {banks.map((b) => (
              <div key={b.id} className="glass rounded-xl p-3.5 flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg grid place-items-center text-lg" style={{ background: (BANKS.find((x) => x.code === b.bankCode)?.color ?? "#333") + "33" }}>
                  {b.isPromptPay ? "📱" : "🏦"}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{b.bankName}</p>
                  <p className="text-xs text-ink-400">{b.accountNo} · {b.accountName}</p>
                </div>
                <button onClick={() => setBanks(banks.filter((x) => x.id !== b.id))} className="text-ink-400 hover:text-crimson-400 text-xs">{t.delete}</button>
              </div>
            ))}
            <button onClick={() => setAddBankOpen(true)} className="btn-ghost rounded-xl w-full py-2.5 text-sm">＋ {t.addBank}</button>
          </div>
        )}
      </Sheet>

      {/* add bank modal */}
      <Modal open={addBankOpen} onClose={() => setAddBankOpen(false)} title={t.addBank}>
        <Field label={t.bank}>
          <select value={newBank.bankCode} onChange={(e) => setNewBank({ ...newBank, bankCode: e.target.value })} className="input-dark">
            {BANKS.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
        </Field>
        <Field label={t.accountNo}>
          <input value={newBank.accountNo} onChange={(e) => setNewBank({ ...newBank, accountNo: e.target.value })} className="input-dark" />
        </Field>
        <Field label={t.accountName}>
          <input value={newBank.accountName} onChange={(e) => setNewBank({ ...newBank, accountName: e.target.value })} className="input-dark" />
        </Field>
        <div className="flex gap-2">
          <button onClick={() => setAddBankOpen(false)} className="btn-ghost rounded-xl flex-1 py-2.5 text-sm">{t.cancel}</button>
          <button
            onClick={() => {
              if (!newBank.accountNo || !newBank.accountName) return;
              const bank = BANKS.find((b) => b.code === newBank.bankCode)!;
              setBanks([...banks, { id: String(Date.now()), bankCode: bank.code, bankName: bank.name, accountNo: newBank.accountNo, accountName: newBank.accountName, isPromptPay: bank.code === "promptpay" }]);
              setAddBankOpen(false);
              setNewBank({ bankCode: "kbank", accountNo: "", accountName: "" });
            }}
            className="btn-crimson rounded-xl flex-1 py-2.5 text-sm font-semibold"
          >{t.save}</button>
        </div>
      </Modal>

      {savedToast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 chip chip-gold z-50">✓ {t.save} ✓</div>}
    </>
  );
}
