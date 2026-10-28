"use client";

import { useMemo, useState } from "react";

export type WalletRow = { key: string; type: "parttime" | "sales" | "partner" | "vendor" | "customer"; id: string; name: string; sub: string; view: string | null; buckets: Record<string, number>; total: number };
type Entry = { tx_id: number; kind: string; note: string | null; bucket: string; amount: number; created_at: string };

const TYPE: Record<WalletRow["type"], [string, string]> = { parttime: ["Part-Time", "#a8781f"], sales: ["Recruit", "#2f7a46"], partner: ["พาร์ทเนอร์", "#2563a8"], vendor: ["ร้านค้า", "#c0577e"], customer: ["ลูกค้า", "#5b3fb0"] };
const BUCKET: Record<string, string> = { available: "ถอนได้/ใช้ได้", pending: "รอปล่อย", withdrawing: "กำลังโอน", bond: "เงินประกัน", boost_credit: "วงเงินโปรโมท", hold: "พักไว้", escrow: "พักจอง" };
const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 });
const dt = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });

export function WalletsBoard({ rows }: { rows: WalletRow[] }) {
  const [tab, setTab] = useState<WalletRow["type"] | "all">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [hist, setHist] = useState<Record<string, Entry[] | "loading" | "error">>({});
  const t = q.trim().toLowerCase();
  const shown = useMemo(() => rows.filter((r) => (tab === "all" || r.type === tab) && (!t || `${r.name} ${r.sub} ${r.id}`.toLowerCase().includes(t))), [rows, tab, t]);
  const sum = (k: string) => shown.reduce((a, r) => a + (r.buckets[k] ?? 0), 0);
  const toggle = async (r: WalletRow) => {
    if (open === r.key) { setOpen(null); return; }
    setOpen(r.key);
    if (hist[r.key] && hist[r.key] !== "error") return;
    setHist((h) => ({ ...h, [r.key]: "loading" }));
    const res = await fetch(`/api/admin/wallets?type=${r.type}&id=${encodeURIComponent(r.id)}`).catch(() => null);
    const j = (await res?.json().catch(() => null)) as { ok?: boolean; history?: Entry[] } | null;
    setHist((h) => ({ ...h, [r.key]: j?.ok ? j.history ?? [] : "error" }));
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "parttime", "sales", "partner", "vendor", "customer"] as const).map((k) => {
          const on = tab === k;
          const n = rows.filter((r) => k === "all" || r.type === k).length;
          return <button key={k} type="button" data-wallet-tab={k} onClick={() => setTab(k)} className="h-9 px-3.5 rounded-full border text-[13px] font-semibold flex items-center gap-1.5" style={on ? { background: "#2a1d1a", borderColor: "#2a1d1a", color: "#fff" } : { background: "#fff", borderColor: "#e7ddcf", color: "#5c4f48" }}>{k === "all" ? "ทั้งหมด" : TYPE[k][0]}<span className="text-[11.5px] opacity-75">{n}</span></button>;
        })}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ · รหัส MB · โค้ด Recruit · อีเมล" aria-label="ค้นหากระเป๋าเงิน" className="ml-auto h-10 w-72 max-w-full rounded-2xl bg-white border px-4 text-[13.5px] outline-none focus:border-[#c9a24a]" style={{ borderColor: "#e7ddcf" }} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([["available", "ถอนได้/ใช้ได้รวม"], ["pending", "รอปล่อยรวม"], ["withdrawing", "กำลังโอนรวม"], ["bond", "เงินประกันรวม"]] as const).map(([k, l]) => (
          <div key={k} className="rounded-[18px] bg-white px-4 py-3 shadow-[0_4px_18px_rgba(90,60,20,.05)]"><div className="text-[12px] text-[#8a7b75]">{l}</div><b className="text-[20px] tabular-nums">{baht(sum(k))}</b></div>
        ))}
      </div>
      <div data-wallets className="rounded-[20px] bg-white overflow-x-auto shadow-[0_4px_18px_rgba(90,60,20,.05)]">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[minmax(0,1.6fr)_110px_110px_110px_110px_110px_120px] gap-2 px-4 py-2.5 text-[12px] text-[#8a7b75] border-b" style={{ borderColor: "#ebe2d5" }}><span>เจ้าของ</span><span className="text-right">ถอนได้/ใช้ได้</span><span className="text-right">รอปล่อย</span><span className="text-right">กำลังโอน</span><span className="text-right">อื่น ๆ</span><span className="text-right">รวม</span><span /></div>
          {!shown.length && <p className="m-0 p-8 text-center text-[#8a7b75]">ยังไม่มีกระเป๋าเงินในหมวดนี้</p>}
          {shown.map((r) => {
            const other = Object.entries(r.buckets).filter(([k]) => !["available", "pending", "withdrawing", "spent"].includes(k)).reduce((a, [, v]) => a + v, 0);
            const h = hist[r.key];
            return (
              <div key={r.key} className="border-b last:border-b-0" style={{ borderColor: "#ebe2d5" }}>
                <div role="button" tabIndex={0} data-wallet-row={r.type} onClick={() => toggle(r)} onKeyDown={(e) => { if (e.key === "Enter") toggle(r); }} className="grid grid-cols-[minmax(0,1.6fr)_110px_110px_110px_110px_110px_120px] gap-2 px-4 py-3 items-center cursor-pointer hover:bg-[#faf5ec]">
                  <span className="min-w-0"><span className="inline-block text-[11.5px] font-semibold mr-1.5" style={{ color: TYPE[r.type][1] }}>{TYPE[r.type][0]}</span><b className="font-semibold">{r.name}</b><span className="block text-[12px] text-[#8a7b75] truncate">{r.sub}</span></span>
                  <span className="text-right tabular-nums font-semibold">{baht(r.buckets.available ?? 0)}</span>
                  <span className="text-right tabular-nums">{baht(r.buckets.pending ?? 0)}</span>
                  <span className="text-right tabular-nums">{baht(r.buckets.withdrawing ?? 0)}</span>
                  <span className="text-right tabular-nums text-[#8a7b75]" title={Object.entries(r.buckets).filter(([k]) => !["available", "pending", "withdrawing", "spent"].includes(k)).map(([k, v]) => `${BUCKET[k] ?? k} ${baht(v)}`).join(" · ")}>{baht(other)}</span>
                  <span className="text-right tabular-nums font-bold">{baht(r.total)}</span>
                  <span className="text-right">{r.view && <a data-wallet-view href={r.view} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center h-7 px-2.5 rounded-full text-[12px] font-semibold" style={{ background: "#f6ecd2", color: "#8a6516" }}>ดูโปรไฟล์ ↗</a>}</span>
                </div>
                {open === r.key && (
                  <div data-wallet-history className="px-4 pb-3 bg-[#fbf8f3]">
                    {h === "loading" && <p className="m-0 py-3 text-[#8a7b75]">กำลังโหลด…</p>}
                    {h === "error" && <p className="m-0 py-3 text-[#b42335]">โหลดประวัติไม่สำเร็จ</p>}
                    {Array.isArray(h) && !h.length && <p className="m-0 py-3 text-[#8a7b75]">ยังไม่มีรายการ</p>}
                    {Array.isArray(h) && h.map((e, i) => (
                      <div key={`${e.tx_id}-${i}`} className="flex justify-between gap-3 py-2 border-b last:border-b-0 text-[13px]" style={{ borderColor: "#ebe2d5" }}>
                        <span className="min-w-0"><span className="text-[#5c4f48]">{e.note || e.kind}</span><span className="block text-[11.5px] text-[#8a7b75]">{dt(e.created_at)} · {BUCKET[e.bucket] ?? e.bucket}</span></span>
                        <b className="shrink-0 tabular-nums" style={{ color: e.amount > 0 ? "#2f7a46" : "#2a1d1a" }}>{e.amount > 0 ? "+" : "−"}{baht(Math.abs(e.amount))}</b>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
