"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { EmptyState } from "@/components/ui";
import { DEMO_PROMOS } from "@/lib/demo-data";
import { baht } from "@/components/ui";

type Tab = "kyc" | "reports" | "members" | "promos" | "gp";

export default function AdminPage() {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<Tab>("kyc");
  const [kycQueue, setKycQueue] = useState([
    { id: "k1", name: "ทริคกี้", submitted: "2 ชม.ที่แล้ว", selfie: "🤳 ✓", card: "🪪 ✓" },
    { id: "k2", name: "Smart", submitted: "5 ชม.ที่แล้ว", selfie: "🤳 ✓", card: "🪪 ✓" },
    { id: "k3", name: "มายด์", submitted: "1 วันที่แล้ว", selfie: "🤳 ✓", card: "🪪 ✓" },
  ]);
  const [reports, setReports] = useState([
    { id: "rp1", target: "โพสต์ p7", by: "Ninegd93", reason: "รูปไม่ตรงตัว น่าจะ AI", status: "open" },
    { id: "rp2", target: "แชท room1", by: "Mo", reason: "สแปมขายของ", status: "open" },
  ]);
  const [members, setMembers] = useState([
    { id: "m1", name: "หมูยอ🐷", strikes: 2, status: "active" },
    { id: "m2", name: "Fuyuko Chan", strikes: 0, status: "active" },
    { id: "m3", name: "นักเลงบอท", strikes: 3, status: "suspended" },
  ]);

  const tabs: [Tab, string][] = [
    ["kyc", `🛡️ ${t.admin.kyc}`],
    ["reports", `🚩 ${t.admin.reports}`],
    ["members", `👥 ${t.admin.members}`],
    ["promos", `🎟️ ${t.admin.promos}`],
    ["gp", `💰 ${t.admin.gp}`],
  ];

  return (
    <main className="app-frame safe-bottom">
      <header className="sticky top-0 z-30 bg-ink-950/90 backdrop-blur-xl border-b border-white/5 px-4 h-14 flex items-center">
        <h1 className="font-semibold">🛡️ Admin — HaMoo</h1>
      </header>

      <div className="px-4 pt-4 flex gap-2 overflow-x-auto no-scrollbar">
        {tabs.map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`chip whitespace-nowrap ${tab === v ? "chip-red" : ""}`}>{l}</button>
        ))}
      </div>

      <div className="px-4 py-4 grid gap-3">
        {tab === "kyc" && (kycQueue.length === 0 ? <EmptyState icon="✅" title={t.empty} /> : kycQueue.map((k) => (
          <div key={k.id} className="glass rounded-2xl p-4 animate-rise">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{k.name}</p>
              <span className="text-xs text-ink-500">{k.submitted}</span>
            </div>
            <p className="text-xs text-ink-400 mt-1">{k.selfie} {k.card}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setKycQueue(q => q.filter(x => x.id !== k.id))} className="btn-ghost rounded-lg flex-1 py-2 text-xs">{t.admin.reject}</button>
              <button onClick={() => setKycQueue(q => q.filter(x => x.id !== k.id))} className="btn-crimson rounded-lg flex-1 py-2 text-xs font-semibold">{t.admin.approve}</button>
            </div>
          </div>
        )))}

        {tab === "reports" && (reports.length === 0 ? <EmptyState icon="🚩" title={t.empty} /> : reports.map((r) => (
          <div key={r.id} className="glass rounded-2xl p-4 animate-rise">
            <p className="font-semibold text-sm">{r.target}</p>
            <p className="text-xs text-ink-400 mt-1">โดย {r.by} — {r.reason}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setReports(rs => rs.filter(x => x.id !== r.id))} className="btn-ghost rounded-lg flex-1 py-2 text-xs">{lang === "th" ? "ปิดเรื่อง" : "Dismiss"}</button>
              <button onClick={() => setReports(rs => rs.filter(x => x.id !== r.id))} className="btn-crimson rounded-lg flex-1 py-2 text-xs font-semibold">{lang === "th" ? "ดำเนินการ" : "Action"}</button>
            </div>
          </div>
        )))}

        {tab === "members" && members.map((mem) => (
          <div key={mem.id} className="glass rounded-2xl p-4 flex items-center gap-3 animate-rise">
            <div className="flex-1">
              <p className="font-semibold text-sm">{mem.name}</p>
              <p className="text-xs text-ink-400">
                ⚡ {mem.strikes}/3 strikes · <span className={mem.status === "suspended" ? "text-crimson-400" : "text-emerald-400"}>{mem.status}</span>
              </p>
            </div>
            {mem.status === "active" && (
              <button
                onClick={() => setMembers(ms => ms.map(x => x.id === mem.id ? { ...x, strikes: x.strikes + 1, status: x.strikes + 1 >= 3 ? "suspended" : "active" } : x))}
                className="btn-ghost rounded-lg px-3 py-2 text-xs"
              >+ {t.admin.strike}</button>
            )}
          </div>
        ))}

        {tab === "promos" && DEMO_PROMOS.map((p) => (
          <div key={p.code} className="glass rounded-2xl p-4 animate-rise">
            <div className="flex justify-between items-center">
              <p className="font-mono font-bold text-gold-400">{p.code}</p>
              <span className={`chip ${p.active ? "chip-gold" : ""}`}>{p.active ? "Active" : "Off"}</span>
            </div>
            <p className="text-xs text-ink-400 mt-1">{p.type === "percent" ? `−${p.value}%` : `−${baht(p.value)}`} · {p.usedCount}/{p.quota || "∞"}</p>
          </div>
        ))}

        {tab === "gp" && (
          <div className="animate-rise">
            <div className="glass rounded-2xl p-5 text-center">
              <p className="text-xs text-ink-400 uppercase tracking-widest">{lang === "th" ? "รายได้เดือนนี้ (GP 20%)" : "This month (20% GP)"}</p>
              <p className="text-3xl font-bold text-gold-400 mt-1">{baht(48200)}</p>
            </div>
            <div className="grid grid-cols-7 gap-1.5 mt-4 items-end h-32">
              {[30, 45, 25, 60, 80, 55, 95].map((h, i) => (
                <div key={i} className="rounded-t-md bg-gradient-to-t from-crimson-700 to-crimson-400" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="glass rounded-xl p-3 text-center"><p className="text-[10px] text-ink-400">{lang === "th" ? "ออเดอร์จบ" : "Completed"}</p><p className="font-bold text-lg">64</p></div>
              <div className="glass rounded-xl p-3 text-center"><p className="text-[10px] text-ink-400">GMV</p><p className="font-bold text-lg">{baht(241000)}</p></div>
              <div className="glass rounded-xl p-3 text-center"><p className="text-[10px] text-ink-400">{lang === "th" ? "คืนเฉลี่ย" : "Avg GP"}</p><p className="font-bold text-lg">{baht(753)}</p></div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
