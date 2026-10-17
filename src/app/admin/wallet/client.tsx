"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useRef, useState } from "react";
import type { AdjOwnerType, OwnerRow } from "@/lib/payouts/owners";
import type { Topup } from "@/lib/wallet";
import type { MoneySettings } from "@/lib/wallet/settings";
import type { Recon } from "@/lib/wallet/reconcile";

type Acc = { owner_type: string; owner_id: string; bucket: string; balance: number };
type Data = { topups: Topup[]; accounts: Acc[]; sum: number };
const GOLD = "#f0c75a";
const LINE = "rgba(240,200,90,.38)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });
const VERDICT: Record<string, [string, string]> = { ok: ["✓ ยอดตรง", "#4ade80"], check: ["ยอดตรง · ต้องเทียบบัญชี/วันที่เอง", "#eed58a"], dup: ["สลิปซ้ำ", "#fca5a5"], acct: ["โอนเข้าบัญชีอื่น", "#fca5a5"], amt: ["ยอดไม่ตรง", "#fca5a5"], fake: ["ไม่พบรายการ", "#fca5a5"], error: ["ตรวจไม่สำเร็จ", "#eed58a"] };
const STATUS: Record<string, [string, string]> = { pending: ["รอตรวจ", "#eed58a"], credited: ["เข้ากระเป๋าแล้ว", "#4ade80"], rejected: ["ไม่ผ่าน", "#fca5a5"] };
const OWNER: Record<string, string> = { customer: "ลูกค้า", parttime: "Part-Time", partner: "พาร์ทเนอร์", vendor: "ร้านค้า", sales: "Sale Man", platform: "บริษัท" };
const BUCKET: Record<string, string> = { available: "ใช้ได้", pending: "รอปล่อย", boost_credit: "วงเงินโปรโมท", held: "พักไว้", withdrawing: "กำลังถอน" };
type Ask = { text: string; run: () => Promise<unknown> };

export function WalletAdmin({ initial, money, recon, isCeo = false, owners = [], buckets }: { initial: Data; money: MoneySettings; recon: Recon | null; isCeo?: boolean; owners?: OwnerRow[]; buckets: Record<AdjOwnerType, readonly string[]> }) {
  const [m, setM] = useState(money);
  const [d, setD] = useState(initial);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [msg, setMsg] = useState("");
  const [reason, setReason] = useState<Record<string, string>>({});
  const [amt, setAmt] = useState<Record<string, string>>({});
  const [adj, setAdj] = useState<{ owner_type: AdjOwnerType; owner_id: string; bucket: string; amount_baht: string; reason: string }>({ owner_type: "customer", owner_id: "", bucket: "available", amount_baht: "", reason: "" });
  const [oq, setOq] = useState("");
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const [ask, setAsk] = useState<Ask | null>(null);
  // ข้อความแจ้ง: ล้างตัวจับเวลาเดิมก่อน (กันข้อความใหม่ถูกลบเร็วเพราะตัวจับเวลาของข้อความก่อนหน้า)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = (t: string) => { setMsg(t); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(""), 4000); };
  const nameOf = useMemo(() => new Map(owners.map((o) => [`${o.type}:${o.id}`, o.name])), [owners]);
  const pickList = owners.filter((o) => o.type === adj.owner_type && (!oq.trim() || o.name.toLowerCase().includes(oq.trim().toLowerCase()) || o.id.includes(oq.trim()))).slice(0, 200);
  const reload = async () => { const r = await fetch("/api/admin/wallet", { cache: "no-store" }); const j = await r.json().catch(() => null); if (j?.ok) setD({ topups: j.topups, accounts: j.accounts, sum: j.sum }); };
  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    const r = await fetch("/api/admin/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { ok?: boolean; error?: string } | undefined ?? {};
    setBusy(false);
    if (r?.status === 401) { setExpired(true); return false; }
    flash(j.ok ? "บันทึกแล้ว" : j.error ?? "บันทึกไม่สำเร็จ");
    if (j.ok) await reload();
    return !!j.ok;
  };
  const pending = d.topups.filter((t) => t.status === "pending");
  const shown = tab === "pending" ? pending : d.topups;
  const holders = d.accounts.filter((a) => a.owner_type !== "platform" && a.balance !== 0);
  const platform = d.accounts.filter((a) => a.owner_type === "platform");
  const inp = "h-10 rounded-lg bg-[#130e0e] border px-2.5";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 justify-between items-end">
        <div><div className="text-[11px] tracking-[2.5px] font-semibold" style={{ color: GOLD }}>WALLET</div><h1 className="mt-0.5 font-lux font-bold text-2xl">กระเป๋าเงิน · เติมเงิน</h1></div>
        <span className="text-[13px] rounded-full px-3 py-1.5 border" style={{ borderColor: d.sum === 0 ? "rgba(74,222,128,.5)" : "rgba(239,68,68,.6)", color: d.sum === 0 ? "#4ade80" : "#fca5a5" }}>{d.sum === 0 ? "✓ ผลรวม ledger = 0 (สมดุล)" : Number.isNaN(d.sum) ? "⚠ ยังไม่ได้รัน migration กระเป๋าเงิน" : `⚠ ผลรวม ledger = ${d.sum} สตางค์ — ตรวจด่วน`}</span>
      </div>
      {recon && <div className="rounded-2xl border p-3 text-[13px]" style={{ borderColor: recon.ok ? "rgba(74,222,128,.4)" : "rgba(239,68,68,.6)", background: recon.ok ? "rgba(74,222,128,.05)" : "rgba(239,68,68,.08)" }}><b style={{ color: recon.ok ? "#4ade80" : "#fca5a5" }}>{recon.ok ? "✓ กระทบยอดตรง: ledger · เงินพัก · เงินกันไว้ · ยอดกำลังถอน ตรงกับการจองและคำขอถอน" : `⚠ กระทบยอดไม่ตรง ${recon.issues.length} รายการ`}</b>{!recon.ok && <ul className="mt-1.5 list-disc pl-5 text-[#fca5a5]">{recon.issues.map((i) => <li key={i}>{i}</li>)}</ul>}<div className="mt-1 text-[11.5px] text-[#9a8a85]">ตรวจตอนเปิดหน้านี้ + รอบรายวัน 10:00 (ไม่ตรง = แจ้งเตือน + อีเมลแอดมิน)</div></div>}
      {msg && <p role="status" className="text-sm text-[#eed58a]">{msg}</p>}
      {expired && <p role="alert" className="text-sm text-[#fca5a5]">เซสชันหมดอายุ · <a href="/admin-login" className="underline text-[#f0c75a]">เข้าสู่ระบบใหม่</a></p>}
      {ask && (
        <div role="alertdialog" aria-label="ยืนยันรายการ" className="sticky top-2 z-20 rounded-2xl border p-3 flex flex-wrap items-center gap-2 text-[13px]" style={{ borderColor: GOLD, background: "#241717" }}>
          <span className="flex-1 min-w-[220px]">{ask.text}</span>
          <button type="button" onClick={() => setAsk(null)} className="h-10 px-4 rounded-full border" style={{ borderColor: LINE }}>ยกเลิก</button>
          <button type="button" disabled={busy} onClick={async () => { const a = ask; setAsk(null); await a.run(); }} className="btn-red-lux h-10 px-5 rounded-full text-white font-semibold disabled:opacity-40">ยืนยัน</button>
        </div>
      )}

      {!!platform.length && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {platform.map((a) => <div key={a.bucket} className="rounded-2xl border px-4 py-3" style={{ borderColor: LINE, background: "#241717" }}><div className="text-[12px] text-[#cdbfb3]">บริษัท · {a.bucket}</div><div className="font-lux font-bold text-xl">{baht(a.balance)}</div></div>)}
      </div>}

      <section className="flex flex-col gap-2">
        <div className="flex gap-2">
          {(["pending", "all"] as const).map((k) => <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className="h-9 px-4 rounded-full border text-[13px] font-semibold" style={{ borderColor: tab === k ? GOLD : LINE, background: tab === k ? GOLD : "transparent", color: tab === k ? "#1a1206" : "#d3c7bc" }}>{k === "pending" ? `รอตรวจ ${pending.length}` : "ทั้งหมด"}</button>)}
        </div>
        {!shown.length && <p className="rounded-2xl border px-4 py-10 text-center text-[#9a8a85]" style={{ borderColor: LINE }}>ไม่มีคำขอเติมเงิน</p>}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((t) => {
            const v = t.slip_check ? VERDICT[t.slip_check.verdict] ?? [t.slip_check.verdict, "#cdbfb3"] : ["ไม่ได้ตรวจ (ไม่มี Slip2Go)", "#9a8a85"];
            return (
              <div key={t.id} className="rounded-2xl border p-3 flex gap-3" style={{ borderColor: LINE, background: "#241717" }}>
                <a href={`/api/wallet/slip?id=${t.id}`} target="_blank" rel="noopener noreferrer" className="shrink-0"><img src={`/api/wallet/slip?id=${t.id}`} alt="สลิป" className="w-24 h-32 object-cover rounded-lg bg-[#130e0e]" /></a>
                <div className="flex-1 min-w-0 flex flex-col gap-1 text-[13px]">
                  <div className="flex justify-between gap-2"><b className="font-lux text-[18px]">{baht(t.amount_satang)}</b><span style={{ color: STATUS[t.status][1] }}>{STATUS[t.status][0]}</span></div>
                  <span className="text-[#cdbfb3] truncate">{t.customer_email ?? t.customer_id}</span>
                  <span style={{ color: v[1] }}>{v[0]}{t.slip_check?.amount != null ? ` · สลิป ${t.slip_check.amount.toLocaleString()} บาท` : ""}</span>
                  <span className="text-[11.5px] text-[#9a8a85]">{new Date(t.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</span>
                  {t.reason && <span className="text-[#fca5a5]">{t.reason}</span>}
                  {t.status === "pending" && <>
                    {/* แก้ยอดต่างจากสลิป = สร้างเงินใหม่ → CEO เท่านั้น (เซิร์ฟเวอร์บังคับด้วย) */}
                    {isCeo ? <label className="flex items-center gap-2 text-[12px] text-[#cdbfb3]">เข้ากระเป๋า (บาท)<input type="number" inputMode="decimal" value={amt[t.id] ?? String(t.slip_check?.amount ?? t.amount_satang / 100)} onChange={(e) => setAmt({ ...amt, [t.id]: e.target.value })} className="h-9 w-28 rounded-lg border bg-[#130e0e] px-2.5 text-[13px] text-[#f6efe4] outline-none" style={{ borderColor: LINE }} /></label>
                      : <span className="text-[12px] text-[#cdbfb3]">เข้ากระเป๋า {baht(t.slip_check?.amount ? Math.round(t.slip_check.amount * 100) : t.amount_satang)} (ตามสลิป)</span>}
                    <input value={reason[t.id] ?? ""} onChange={(e) => setReason({ ...reason, [t.id]: e.target.value })} placeholder="เหตุผลถ้าไม่ผ่าน เช่น ยอดไม่ตรง" className="h-9 rounded-lg border bg-[#130e0e] px-2.5 text-[12.5px] text-[#f6efe4] outline-none" style={{ borderColor: LINE }} />
                    <div className="grid grid-cols-2 gap-1.5">
                      <button disabled={busy || !(reason[t.id] ?? "").trim()} onClick={() => setAsk({ text: `ไม่ผ่านเติมเงิน ${baht(t.amount_satang)} ของ ${t.customer_email ?? t.customer_id}? (${reason[t.id]})`, run: () => act({ action: "reject", id: t.id, reason: reason[t.id] }) })} className="h-9 rounded-full border text-[#fecaca] disabled:opacity-40" style={{ borderColor: "rgba(201,40,61,.6)" }}>ไม่ผ่าน</button>
                      <button disabled={busy} onClick={() => { const v = isCeo ? Number(amt[t.id] ?? t.slip_check?.amount ?? t.amount_satang / 100) : undefined; setAsk({ text: `ยืนยันเข้ากระเป๋า ${v != null ? baht(Math.round(v * 100)) : "ตามสลิป"} ให้ ${t.customer_email ?? t.customer_id}?`, run: () => act({ action: "approve", id: t.id, ...(v != null ? { amount_baht: v } : {}) }) }); }} className="btn-red-lux h-9 rounded-full text-white font-semibold disabled:opacity-40">เข้ากระเป๋า</button>
                    </div>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {isCeo ? <form onSubmit={(e) => { e.preventDefault(); setAsk({ text: "บันทึกตั้งค่าการเงิน? มีผลกับการถอน/ปล่อยเงิน/ยกเลิกทั้งหมดทันที", run: () => act({ action: "settings", money: m, note: "แก้ตั้งค่าการเงิน" }) }); }} className="rounded-2xl border p-4 flex flex-col gap-3 text-[13px]" style={{ borderColor: LINE, background: "#241717" }}>
        <b>ตั้งค่าการเงิน (CEO)</b>
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-7">
          {([["minWithdraw", "ถอนขั้นต่ำ (บาท)"], ["feePct", "ค่าธรรมเนียมถอน (%)"], ["whtPct", "หัก ณ ที่จ่าย (%)"], ["releaseHours", "ปล่อยเงินหลังจบงาน (ชม.)"], ["autoCompleteHours", "จบงานอัตโนมัติ (ชม.)"], ["autoPayoutLimit", "วงเงินถอนอัตโนมัติ/วัน"], ["quickSeconds", "เรียกด่วน รอรับ (วินาที)"]] as const).map(([k, l]) => (
            <label key={k} className="flex flex-col gap-1"><span className="text-[#cdbfb3] text-[12px]">{l}</span><input type="number" step="any" value={m[k]} onChange={(e) => setM({ ...m, [k]: Number(e.target.value) })} className={inp} style={{ borderColor: LINE }} /></label>
          ))}
        </div>
        <label className="flex flex-col gap-1"><span className="text-[#cdbfb3] text-[12px]">ปล่อยรายได้ Part-Time เข้ากระเป๋า</span>
          <select value={m.releaseMode ?? "manual"} onChange={(e) => setM({ ...m, releaseMode: e.target.value as "manual" | "auto" })} className={inp} style={{ borderColor: LINE }}>
            <option value="manual">แอดมินตรวจงานแล้วกดอนุมัติ (หน้า "CEO · อนุมัติรายได้ / ถอน")</option>
            <option value="auto">อัตโนมัติหลังจบงานตามชั่วโมงที่ตั้ง</option>
          </select></label>
        <label className="flex flex-col gap-1"><span className="text-[#cdbfb3] text-[12px]">กติกายกเลิก (แสดงลูกค้า)</span><input value={m.cancelRule} onChange={(e) => setM({ ...m, cancelRule: e.target.value })} className={inp} style={{ borderColor: LINE }} /></label>
        <div className="flex flex-wrap items-end gap-3 rounded-xl border p-3" style={{ borderColor: LINE }}>
          <label className="flex items-center gap-2 self-center"><input type="checkbox" checked={!!m.autoCancel} onChange={(e) => setM({ ...m, autoCancel: e.target.checked })} className="w-4 h-4 accent-[#e8c472]" /><span>ยกเลิกอัตโนมัติตามกติกา</span></label>
          <label className="flex flex-col gap-1"><span className="text-[#cdbfb3] text-[12px]">คืนเต็มถ้ายกเลิกก่อนนัด ≥ (ชม.)</span><input type="number" step="any" value={m.cancelFullHours ?? 3} disabled={!m.autoCancel} onChange={(e) => setM({ ...m, cancelFullHours: Number(e.target.value) })} className={inp + " w-40 disabled:opacity-40"} style={{ borderColor: LINE }} /></label>
          <label className="flex flex-col gap-1"><span className="text-[#cdbfb3] text-[12px]">ยกเลิกช้ากว่านั้น คืน (%)</span><input type="number" step="any" value={m.cancelLatePct ?? 50} disabled={!m.autoCancel} onChange={(e) => setM({ ...m, cancelLatePct: Number(e.target.value) })} className={inp + " w-40 disabled:opacity-40"} style={{ borderColor: LINE }} /></label>
          <span className="text-[11.5px] text-[#9a8a85] basis-full">ปิด = ทีมงานตัดสินเป็นเคสใน /admin/orders · เปิด = ลูกค้ากดยกเลิกนัดที่ยืนยันแล้ว ระบบคืนเงินทันที ส่วนที่ไม่คืนแบ่งให้เพื่อนตามขั้นส่วนแบ่ง · ก่อนเพื่อนตอบรับยังคืนเต็มเสมอ</span>
        </div>
        <button disabled={busy} className="self-start btn-red-lux h-10 px-5 rounded-full text-white font-semibold disabled:opacity-40">บันทึกตั้งค่า</button>
        {!!m.history.length && <span className="text-[11.5px] text-[#9a8a85]">แก้ล่าสุด {new Date(m.history[0].at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} โดย {m.history[0].by}</span>}
      </form> : <p className="rounded-2xl border p-4 text-[13px] text-[#9a8a85]" style={{ borderColor: LINE }}>ตั้งค่าการเงินและปรับยอดกระเป๋า แก้ได้เฉพาะ CEO · ถอนขั้นต่ำ ฿{m.minWithdraw} · ค่าธรรมเนียม {m.feePct}% · ปล่อยเงิน{m.releaseMode === "auto" ? `อัตโนมัติ ${m.releaseHours} ชม.` : "โดยแอดมินอนุมัติ"}</p>}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: LINE }}>
          <div className="min-w-[520px] text-[13px]">
            <div className="grid grid-cols-[100px_minmax(0,1fr)_110px_120px] px-3.5 py-2.5 bg-[#130e0e] text-[#9a8a85] text-xs"><span>ประเภท</span><span>เจ้าของ</span><span>ช่อง</span><span className="text-right">ยอด</span></div>
            {holders.map((a) => <div key={`${a.owner_type}${a.owner_id}${a.bucket}`} className="grid grid-cols-[100px_minmax(0,1fr)_110px_120px] px-3.5 py-2.5 border-t" style={{ borderColor: LINE }}><span>{OWNER[a.owner_type] ?? a.owner_type}</span><span className="truncate pr-2" title={a.owner_id}>{nameOf.get(`${a.owner_type}:${a.owner_id}`) ?? a.owner_id}</span><span className="text-[#cdbfb3]">{BUCKET[a.bucket] ?? a.bucket}</span><span className="text-right tabular-nums">{baht(a.balance)}</span></div>)}
            {!holders.length && <p className="border-t px-4 py-8 text-center text-[#9a8a85]" style={{ borderColor: LINE }}>ยังไม่มียอดในกระเป๋า</p>}
          </div>
        </div>
        {isCeo && <form onSubmit={(e) => { e.preventDefault(); const who = nameOf.get(`${adj.owner_type}:${adj.owner_id}`) ?? adj.owner_id; setAsk({ text: `ปรับยอด ${OWNER[adj.owner_type]} ${who} · ช่อง ${BUCKET[adj.bucket] ?? adj.bucket} · ${Number(adj.amount_baht) > 0 ? "+" : ""}${adj.amount_baht} บาท · เหตุผล: ${adj.reason}?`, run: async () => { if (await act({ action: "adjust", ...adj, idem: crypto.randomUUID() })) setAdj({ ...adj, amount_baht: "", reason: "" }); } }); }} className="rounded-2xl border p-4 flex flex-col gap-2 text-[13px]" style={{ borderColor: LINE, background: "#241717" }}>
          <b>ปรับยอดพร้อมเหตุผล (CEO)</b>
          <span className="text-[12px] text-[#cdbfb3]">บันทึกเป็นรายการใหม่ (แก้/ลบรายการเดิมไม่ได้) · ใส่ติดลบเพื่อหักยอด · ช่องพักไว้/เงินพักบริษัทปรับไม่ได้</span>
          <select aria-label="ประเภทบัญชี" value={adj.owner_type} onChange={(e) => { const t = e.target.value as AdjOwnerType; setAdj({ ...adj, owner_type: t, owner_id: "", bucket: buckets[t][0] }); setOq(""); }} className={inp} style={{ borderColor: LINE }}>
            {(Object.keys(buckets) as AdjOwnerType[]).map((t) => <option key={t} value={t}>{OWNER[t]}</option>)}
          </select>
          <input value={oq} onChange={(e) => setOq(e.target.value)} placeholder={adj.owner_type === "customer" ? "ค้นหาอีเมล / ชื่อ" : adj.owner_type === "parttime" ? "ค้นหารหัส MB / ชื่อเล่น" : "ค้นหาชื่อ"} aria-label="ค้นหาเจ้าของบัญชี" className={inp} style={{ borderColor: LINE }} />
          <select aria-label="เจ้าของบัญชี" value={adj.owner_id} onChange={(e) => setAdj({ ...adj, owner_id: e.target.value })} className={inp} style={{ borderColor: LINE }}>
            <option value="">— เลือกบัญชี ({pickList.length}) —</option>
            {pickList.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <select aria-label="ช่องยอด" value={adj.bucket} onChange={(e) => setAdj({ ...adj, bucket: e.target.value })} className={inp} style={{ borderColor: LINE }}>
            {buckets[adj.owner_type].map((k) => <option key={k} value={k}>{BUCKET[k] ?? k} ({k})</option>)}
          </select>
          <input value={adj.amount_baht} onChange={(e) => setAdj({ ...adj, amount_baht: e.target.value })} inputMode="decimal" placeholder="จำนวนเงิน (บาท)" className={inp} style={{ borderColor: LINE }} />
          <input value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} placeholder="เหตุผล (บังคับ)" className={inp} style={{ borderColor: LINE }} />
          <button disabled={busy || !adj.owner_id || !adj.amount_baht || !adj.reason.trim()} className="btn-red-lux h-10 rounded-full text-white font-semibold disabled:opacity-40">บันทึกการปรับยอด</button>
        </form>}
      </section>
    </div>
  );
}
