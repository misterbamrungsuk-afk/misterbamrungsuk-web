"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { Toast, baht } from "@/components/ui";

type Period = "day" | "week" | "month";
const TOTAL: Record<Period, number> = { day: 1240, week: 6850, month: 18600 };
const BARS = [820, 1240, 0, 1580, 960, 1450, 800];
const DAYS = { th: ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"], en: ["M", "T", "W", "T", "F", "S", "S"] };
const HISTORY = [
  { id: "h1", th: "นวดไทย 2 ชม. · คุณแนท", en: "Thai massage 2h · Nat", date: "30/09 17:00", amount: 960 },
  { id: "h2", th: "ออฟฟิศซินโดรม · คุณบอม", en: "Office syndrome · Bom", date: "29/09 13:00", amount: 1180 },
  { id: "h3", th: "ถอนเงินเข้าบัญชี", en: "Withdrawal", date: "28/09 09:12", amount: -5000 },
  { id: "h4", th: "นวดน้ำมัน 1.5 ชม. · คุณปุ๊ก", en: "Oil massage 1.5h · Puk", date: "27/09 19:30", amount: 840 },
];

export default function EarningsPage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const [period, setPeriod] = useState<Period>("week");
  const [balance, setBalance] = useState(4320);
  const [toast, setToast] = useState("");
  const max = Math.max(...BARS);

  const withdraw = () => {
    if (!balance) return;
    setToast(th ? `ถอน ${baht(balance)} เข้าบัญชีแล้ว · ได้รับภายใน 1 วันทำการ` : `Withdrew ${baht(balance)} · arrives within 1 business day`);
    setBalance(0);
    setTimeout(() => setToast(""), 2400);
  };

  return (
    <>
      <TopBar back="/provider" title={th ? "รายได้" : "Earnings"} />
      <div className="px-4 py-4 space-y-4 pb-8">
        <div className="glass rounded-full p-1 grid grid-cols-3 gap-1">
          {(["day", "week", "month"] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} aria-pressed={period === p}
              className={`h-9 rounded-full text-sm transition ${period === p ? "bg-crimson-600 text-white font-semibold" : "text-ink-300"}`}>
              {p === "day" ? (th ? "วันนี้" : "Day") : p === "week" ? (th ? "สัปดาห์" : "Week") : th ? "เดือน" : "Month"}
            </button>
          ))}
        </div>

        <div className="glass rounded-3xl p-5 border-gold-500/40">
          <p className="text-xs text-ink-400">{th ? "รายได้สุทธิ" : "Net earnings"}</p>
          <p className="font-display text-3xl font-bold text-gold-400 mt-1">{baht(TOTAL[period])}</p>
          <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-white/5">
            <div className="min-w-0">
              <p className="text-xs text-ink-400">{th ? "ถอนได้" : "Withdrawable"}</p>
              <p className="font-display text-xl text-gold-300">{baht(balance)}</p>
            </div>
            <button onClick={withdraw} disabled={!balance} className="btn-crimson h-11 px-5 text-sm font-semibold shrink-0">
              {balance ? (th ? "ถอนเงิน" : "Withdraw") : th ? "ถอนแล้ว" : "Withdrawn"}
            </button>
          </div>
        </div>

        <div className="glass rounded-3xl p-5">
          <p className="text-sm font-semibold mb-4">{th ? "สัปดาห์นี้" : "This week"}</p>
          <div className="flex items-end justify-between gap-2 h-32">
            {BARS.map((v, i) => (
              <div key={i} className="flex-1 min-w-0 flex flex-col items-center gap-1 h-full justify-end">
                <span className="text-[9px] text-ink-400">{v ? `${Math.round(v / 100) / 10}k` : "–"}</span>
                <div className={`w-full rounded-full ${i === 1 ? "bg-gold-500" : "bg-crimson-600/70"}`} style={{ height: `${Math.max(4, (v / max) * 75)}%` }} />
                <span className="text-[10px] text-ink-400">{DAYS[th ? "th" : "en"][i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="section-title mb-2">{th ? "ประวัติ" : "History"}</h2>
          <div className="glass rounded-3xl divide-y divide-white/5 overflow-hidden">
            {HISTORY.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{th ? h.th : h.en}</p>
                  <p className="text-[11px] text-ink-400">{h.date}</p>
                </div>
                <span className={`font-display shrink-0 ${h.amount < 0 ? "text-ink-300" : "text-gold-300"}`}>{h.amount < 0 ? "-" : "+"}{baht(Math.abs(h.amount))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Toast show={!!toast}>{toast}</Toast>
    </>
  );
}
