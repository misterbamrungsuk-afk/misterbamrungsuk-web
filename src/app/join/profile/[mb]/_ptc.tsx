"use client";

// ส่วนที่กดได้ของหน้า Part-Time — ถอดจากบอร์ด MyEarnings / Withdraw / ProviderSettings / ProviderJobboard
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Tier } from "@/lib/join/earnings-shared";
import type { PtPost, PtSettings } from "@/lib/join/store";

const GOLD = "#e8c472";
const baht = (n: number) => "฿" + Math.round(n).toLocaleString("en-US");
const COL = ["#e8936a", "#e8c472", "#5fd08f"];
const rgba = (h: string, a: number) => `rgba(${[1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)).join(",")},${a})`;

async function post(mb: string, t: string, step: string, fill: (fd: FormData) => void) {
  const fd = new FormData();
  fd.set("mb", mb); if (t) fd.set("t", t); fd.set("step", step);
  fill(fd);
  const res = await fetch("/api/join/profile", { method: "POST", body: fd }).catch(() => null);
  const d = (await res?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  return d?.ok ? null : d?.error ?? "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง";
}

const caseLabel = (t: Tier) => (t.max === null ? `${t.min} เคสขึ้นไป` : `${Math.max(1, t.min)}–${t.max} เคส`);

/** บอร์ด MyEarnings — การ์ด "ภารกิจเดือนนี้" (ส่วนแบ่งตอนนี้ · เคสเดือนนี้ ± · หมุดขั้น) + ตาราง "ส่วนแบ่ง" + "รายได้ประมาณการเดือนนี้"
 *  เคสจริงยังเป็น 0 — ปุ่ม ± ใช้ลองคำนวณ (ไม่บันทึก) */
export function EarnBoard({ price, tiers, top }: { price: number; tiers: Tier[]; top: boolean }) {
  const [c, setC] = useState(0);
  const cur = tiers.reduce((p, t, i) => (c >= t.min ? i : p), 0);
  const col = (i: number) => COL[Math.min(i, COL.length - 1)];
  const pct = tiers[cur]?.pct ?? 0;
  const per = (price * pct) / 100;
  const span = Math.max(1, tiers[tiers.length - 1]?.min ?? 25);
  const k = col(cur);
  const weeks = [0, 1, 2, 3].map((i) => Math.round((c * (i + 1)) / 4) - Math.round((c * i) / 4));
  const maxW = Math.max(1, ...weeks);
  return (
    <>
      <div className="flex flex-col gap-[18px] rounded-[22px]" style={{ padding: 18, background: `radial-gradient(120% 80% at 0% 0%, ${rgba(k, 0.16)} 0%, rgba(33,26,24,0) 60%), linear-gradient(180deg, #2a2120 0%, #1c1615 100%)`, boxShadow: "0 14px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,241,201,0.14)" }}>
        <div className="flex justify-between items-center gap-2">
          <span className="text-[13px] font-medium tracking-[.08em] text-[#e8c472]">ภารกิจเดือนนี้</span>
          <span className="inline-flex items-center gap-1.5 h-[26px] rounded-full text-[12.5px] font-semibold" style={{ padding: "0 12px", background: "rgba(243,234,217,0.08)" }}>
            {top ? "TOP (Gold)" : "Silver"}
            {top && <span className="inline-flex items-center h-4 rounded text-[9px] font-bold tracking-[.2em] text-[#1b130b]" style={{ padding: "0 6px", background: "linear-gradient(135deg, #fff1c9 0%, #e8c472 45%, #a8781f 100%)" }}>TOP</span>}
          </span>
        </div>
        <div className="flex justify-between items-end gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-light">ส่วนแบ่งตอนนี้</div>
            <div className="font-bold text-[52px] leading-[1.05] tabular-nums" style={{ color: k, textShadow: `0 0 24px ${rgba(k, 0.35)}` }}>{pct}%</div>
            <div className="text-[13px] font-light mt-1">{baht(per)} ต่อเคส · {baht(price)} / 3 ชม.</div>
          </div>
          <div className="shrink-0 text-center">
            <div className="text-[13px] font-light">เคสเดือนนี้</div>
            <div className="flex items-center gap-2 mt-1">
              <button type="button" onClick={() => setC(Math.max(0, c - 1))} aria-label="ลดเคส (ลองคำนวณ)" className="w-9 h-9 rounded-full text-[18px] leading-none text-[#f3ead9]" style={{ background: "rgba(243,234,217,0.1)" }}>−</button>
              <span className="min-w-9 font-semibold text-[30px] leading-none tabular-nums">{c}</span>
              <button type="button" onClick={() => setC(Math.min(60, c + 1))} aria-label="เพิ่มเคส (ลองคำนวณ)" className="w-9 h-9 rounded-full bg-[#e8c472] text-[#1b130b] text-[18px] font-semibold leading-none">+</button>
            </div>
          </div>
        </div>
        <div style={{ padding: "0 18px" }}>
          <div className="relative h-[58px]">
            <span className="absolute inset-x-0 top-[15px] h-1.5 rounded-[3px]" style={{ background: "rgba(243,234,217,0.1)" }} />
            <span className="absolute left-0 top-[15px] h-1.5 rounded-[3px]" style={{ width: `${(Math.min(c, span) / span) * 100}%`, background: `linear-gradient(90deg, ${tiers.slice(0, cur + 1).map((_, i) => col(i)).concat(cur === 0 ? [col(0)] : []).join(", ")})`, boxShadow: `0 0 10px ${rgba(k, 0.35)}` }} />
            {tiers.map((t, i) => {
              const at = i === 0 ? 0 : t.min;
              const done = c >= at;
              return (
                <span key={i} className="absolute top-0 -translate-x-1/2 flex flex-col items-center gap-1" style={{ left: `${(Math.min(at, span) / span) * 100}%` }}>
                  <span className="w-9 h-9 rounded-full grid place-items-center text-[11.5px] font-bold" style={{ background: done ? col(i) : "#171211", color: done ? "#1b130b" : col(i), boxShadow: i === cur ? `0 0 0 5px ${rgba(col(i), 0.25)}, 0 0 16px ${rgba(col(i), 0.5)}` : "none" }}>{t.pct}%</span>
                  <span className="text-[11.5px] leading-[1.2] whitespace-nowrap font-light" style={{ color: done ? col(i) : "#b5a596" }}>{i === 0 ? "เริ่ม" : `${t.min} เคส`}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-[20px] bg-[#272013]" style={{ padding: 16 }}>
        <div className="flex justify-between items-baseline"><span className="font-medium text-[16px]">ส่วนแบ่ง</span><span className="text-[13px] font-light">เงื่อนไขเบื้องต้น</span></div>
        <div className="flex text-[13px] font-light border-b border-[rgba(243,234,217,0.07)]" style={{ padding: "10px 0 6px" }}><span className="flex-[1.3]">เคส/เดือน</span><span className="flex-1 text-center">ส่วนแบ่ง</span><span className="flex-1 text-right">ต่อเคส</span></div>
        {tiers.map((t, i) => (
          <div key={i} className="flex items-center text-[14px] rounded-[10px]" style={{ padding: "10px 8px", margin: "0 -8px", background: i === cur ? rgba(col(i), 0.14) : "transparent", color: i === cur ? "#fff8ea" : "#f3ead9" }}>
            <span className="flex-[1.3] flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: col(i) }} />{caseLabel(t)}</span>
            <span className="flex-1 text-center font-semibold" style={{ color: col(i) }}>{t.pct}%</span>
            <span className="flex-1 text-right font-medium tabular-nums">{baht((price * t.pct) / 100)}</span>
          </div>
        ))}
      </div>

      <div className="rounded-[20px] bg-[#1b2322]" style={{ padding: 16 }}>
        <div className="flex justify-between text-[13px] font-light"><span>รายได้ประมาณการเดือนนี้</span><span className="text-[#e8c472] font-semibold text-[18px] tabular-nums">{baht(per * c)}</span></div>
        <div className="flex items-end gap-2.5 h-24 mt-3">
          {weeks.map((w, i) => <div key={i} className="flex-1 rounded-t-md" style={{ height: `${Math.max(4, (w / maxW) * 88)}%`, background: i === 3 ? GOLD : "rgba(232,196,114,0.22)" }} />)}
        </div>
        <div className="flex gap-2.5 text-[13px] font-light mt-1.5 text-center">{["ส.1", "ส.2", "ส.3", "ส.4"].map((w, i) => <span key={w} className="flex-1" style={{ color: i === 3 ? GOLD : undefined }}>{w}</span>)}</div>
        <div className="flex justify-between text-[13px] font-light mt-3 pt-2.5 border-t border-[rgba(243,234,217,0.07)]"><span>{c} เคส × {baht(per)}</span><span className="tabular-nums">{baht(per * c)}</span></div>
        <div className="text-[12px] font-light text-[#b5a596] mt-2">ยังไม่มีเคสจริง · กด − / + ด้านบนเพื่อลองคำนวณ</div>
      </div>
    </>
  );
}

export type Acct = { short: string; logo: string; name: string; no: string };

/** บอร์ด Withdraw — กรอกจำนวน · บัญชีปลายทาง · ค่าธรรมเนียม 3% + หัก ณ ที่จ่าย 3% · ขั้นต่ำ ฿500 */
export function WithdrawForm({ avail, acct, bankHref, mb, t, rules = { min: 500, feePct: 3, whtPct: 3 }, kycOk = true }: { avail: number; acct: Acct | null; bankHref: string; mb?: string; t?: string; rules?: { min: number; feePct: number; whtPct: number }; kycOk?: boolean }) {
  const router = useRouter();
  const [amt, setAmt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const n = Math.floor(Number(amt) || 0);
  const ok = n >= rules.min && n <= avail && !!acct && kycOk;
  const hint = !kycOk ? "ถอนได้หลังทีมงานอนุมัติเอกสารยืนยันตัวตน" : avail < rules.min ? `ยอดถอนได้ไม่ถึงขั้นต่ำ ${baht(rules.min)}` : n > avail ? `เกินยอดถอนได้ (${baht(avail)})` : n > 0 && n < rules.min ? `ถอนขั้นต่ำ ${baht(rules.min)}` : `ถอนได้สูงสุด ${baht(avail)}`;
  const base = ok ? n : 0, fee = Math.round(base * rules.feePct / 100), wht = Math.round(base * rules.whtPct / 100);
  const submit = async () => {
    if (!ok || !mb) return;
    setBusy(true); setMsg(null);
    const r = await fetch("/api/pt/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mb, t, amount: n }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setBusy(false);
    if (d?.ok) { setAmt(""); setMsg({ ok: true, t: "ส่งคำขอถอนแล้ว · เงินเข้าบัญชีในรอบโอนถัดไป" }); router.refresh(); }
    else setMsg({ ok: false, t: d?.error || "ถอนไม่สำเร็จ" });
  };
  const allOn = n > 0 && n === avail;
  return (
    <>
      <div className="rounded-[20px] bg-[#251d1b]" style={{ padding: 16 }}>
        <div className="text-[13px] text-[#b5a596] mb-2">จำนวนเงินที่ต้องการถอน</div>
        <div className="flex items-center gap-1.5 h-[60px] rounded-[14px]" style={{ padding: "0 16px", background: "rgba(0,0,0,0.3)" }}>
          <span className="text-[24px] font-semibold text-[#e8c472]">฿</span>
          <input inputMode="numeric" value={amt} placeholder="0" aria-label="จำนวนเงิน" onChange={(e) => setAmt(e.target.value.replace(/\D/g, "").slice(0, 9))} className="flex-1 min-w-0 h-full bg-transparent text-[#f3ead9] text-[26px] font-semibold outline-none" />
          <button type="button" onClick={() => setAmt(String(avail))} className="shrink-0 h-[38px] rounded-[10px] text-[14px] font-semibold" style={{ padding: "0 16px", background: allOn ? GOLD : "rgba(243,234,217,0.1)", color: allOn ? "#1b130b" : GOLD }}>ทั้งหมด</button>
        </div>
        <div className="text-[12.5px] mt-2 font-light" style={{ color: ok || n === 0 ? "#b5a596" : "#e8936a" }}>{hint}</div>
      </div>

      <div className="rounded-[20px] bg-[#251d1b]" style={{ padding: 16 }}>
        <div className="flex justify-between items-center gap-2.5 mb-2"><span className="text-[13px] text-[#b5a596]">โอนเข้าบัญชี</span><Link href={bankHref} className="tap text-[13px] text-[#e8c472] font-light">+ เพิ่มบัญชี</Link></div>
        {acct
          ? <div className="flex items-center gap-3 rounded-[14px]" style={{ padding: "10px 12px", background: "rgba(232,196,114,0.12)" }}>
              <span className="w-[38px] h-[38px] rounded-[10px] text-white grid place-items-center text-[13px] font-bold shrink-0" style={{ background: acct.logo }}>{acct.short}</span>
              <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold">{acct.name}</span><span className="block text-[12.5px] text-[#b5a596] font-light">{acct.no}</span></span>
              <span className="w-5 h-5 rounded-full shrink-0" style={{ background: GOLD, boxShadow: "inset 0 0 0 5px #171211" }} />
            </div>
          : <Link href={bankHref} className="block rounded-[14px] text-[14px] font-light text-[#d9c9b4]" style={{ padding: 12, background: "rgba(243,234,217,0.05)" }}>ยังไม่มีบัญชีรับเงิน · แตะเพื่อเพิ่ม</Link>}
      </div>

      <div className="rounded-[20px] bg-[#1b2322] flex flex-col gap-1.5" style={{ padding: "14px 16px" }}>
        {([["จำนวนที่ถอน", baht(base), ""], [`ค่าธรรมเนียมแพลตฟอร์ม (${rules.feePct}%)`, "−" + baht(fee), "#e8936a"], [`ภาษีหัก ณ ที่จ่าย (${rules.whtPct}%)`, "−" + baht(wht), "#e8936a"]] as const).map(([l, v, c]) => (
          <div key={l} className="flex justify-between items-center gap-2.5 text-[14px]"><span className="text-[#b5a596]">{l}</span><span className="tabular-nums" style={{ color: c || undefined }}>{v}</span></div>
        ))}
        <div className="flex justify-between items-center gap-2.5 text-[15px] pt-1.5 mt-0.5"><span className="font-semibold">ได้รับจริง</span><span className="font-bold text-[18px] text-[#e8c472] tabular-nums">{baht(base - fee - wht)}</span></div>
        <div className="text-[12.5px] text-[#b5a596] font-light">ระบบออกใบเสร็จ/ใบกำกับภาษีและใบหัก ณ ที่จ่ายให้อัตโนมัติ ดูได้ที่หน้ารายได้ · เงินเข้าในรอบโอนถัดไป · ถอนขั้นต่ำ {baht(rules.min)}</div>
      </div>

      {msg && <p role="status" className="m-0 text-[13px]" style={{ color: msg.ok ? "#7fd6a3" : "#ff8a9a" }}>{msg.t}</p>}
      <button type="button" disabled={!ok || busy} onClick={submit} className="w-full h-[54px] rounded-2xl text-[16px] font-semibold" style={{ background: ok ? GOLD : "rgba(243,234,217,0.08)", color: ok ? "#1b130b" : "#b5a596" }}>
        {busy ? "กำลังส่งคำขอ…" : ok ? `ยืนยันถอน ${baht(n)} · รับ ${baht(n - fee - wht)}` : "ใส่จำนวนเงินที่ต้องการถอน"}
      </button>
    </>
  );
}

/** บอร์ด ProviderSettings — การ์ด "ตอบกลับอัตโนมัติ" (สวิตช์ · ข้อความ · ข้อความสำเร็จรูป + เพิ่ม) */
const QUICK_DEFAULT = ["ได้รับการจองแล้วค่ะ", "กำลังเดินทางค่ะ", "ถึงแล้วค่ะ"];
export function SettingsForm({ mb, t, init }: { mb: string; t: string; init: PtSettings | null }) {
  const [on, setOn] = useState(init?.auto_reply_on ?? false);
  const [text, setText] = useState(init?.auto_reply ?? "");
  const [quick, setQuick] = useState<string[]>(init?.quick_replies?.length ? init.quick_replies : QUICK_DEFAULT);
  const [adding, setAdding] = useState(false);
  const [add, setAdd] = useState("");
  const [st, setSt] = useState("");
  const [dirty, setDirty] = useState(false);
  const ch = () => { setDirty(true); setSt(""); };
  const save = async () => {
    setSt("busy");
    const err = await post(mb, t, "settings", (fd) => { fd.set("auto_reply_on", String(on)); fd.set("auto_reply", text); quick.forEach((q) => fd.append("quick_replies", q)); });
    setSt(err ?? "ok"); if (!err) setDirty(false);
  };
  const addOne = () => { const v = add.trim(); if (v && !quick.includes(v) && quick.length < 10) setQuick([...quick, v]); setAdd(""); setAdding(false); ch(); };
  return (
    <div id="pt-auto-reply" className="rounded-[20px] bg-[#272013] flex flex-col gap-3" style={{ padding: 16 }}>
      <div className="flex items-center justify-between">
        <div className="text-[17px] font-medium">ตอบกลับอัตโนมัติ</div>
        <button type="button" role="switch" aria-checked={on} aria-label="ตอบกลับอัตโนมัติ" onClick={() => { setOn(!on); ch(); }} className="w-12 h-7 rounded-[28px] relative shrink-0" style={{ background: on ? GOLD : "rgba(243,234,217,0.18)" }}>
          <span className="absolute top-[3px] w-[22px] h-[22px] rounded-[22px] transition-all" style={{ left: on ? 23 : 3, background: on ? "#000" : "#f3ead9" }} />
        </button>
      </div>
      <textarea aria-label="ข้อความตอบกลับอัตโนมัติ" maxLength={300} value={text} placeholder="เช่น สวัสดีค่ะ ขอทราบวัน เวลา สถานที่ และกิจกรรมที่อยากทำด้วยกันหน่อยค่ะ" onChange={(e) => { setText(e.target.value); ch(); }}
        className="h-[84px] rounded-[14px] text-[14px] leading-[1.5] outline-none resize-none text-[#f3ead9] placeholder:text-[#b5a596]" style={{ padding: "10px 12px", background: "rgba(232,196,114,0.16)" }} />
      <div className="text-[13px] font-light">ข้อความสำเร็จรูป</div>
      <div className="flex flex-wrap gap-2">
        {quick.map((q) => (
          <span key={q} className="h-[34px] rounded-[10px] text-[13px] flex items-center gap-1" style={{ padding: "0 4px 0 12px", background: "rgba(243,234,217,0.07)" }}>
            {q}<button type="button" aria-label={`ลบ ${q}`} onClick={() => { setQuick(quick.filter((x) => x !== q)); ch(); }} className="w-9 h-9 -mr-2 grid place-items-center text-[#b5a596] hover:text-[#f3ead9]">×</button>
          </span>
        ))}
        {adding
          ? <span className="h-[34px] rounded-[10px] flex items-center gap-1" style={{ padding: "0 4px 0 10px", background: "rgba(243,234,217,0.07)" }}>
              <input autoFocus aria-label="ข้อความสำเร็จรูปใหม่" value={add} maxLength={60} onChange={(e) => setAdd(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addOne(); if (e.key === "Escape") setAdding(false); }} className="w-36 bg-transparent text-[13px] outline-none text-[#f3ead9]" />
              <button type="button" onClick={addOne} className="h-10 px-3 text-[13px] text-[#e8c472]">เพิ่ม</button>
            </span>
          : quick.length < 10 && <button type="button" onClick={() => setAdding(true)} className="h-10 rounded-[10px] text-[13px] text-[#e8c472]" style={{ padding: "0 14px", background: "rgba(243,234,217,0.07)" }}>+ เพิ่ม</button>}
      </div>
      {(dirty || st) && (
        <button type="button" onClick={save} disabled={st === "busy" || !dirty} className="h-[46px] rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold disabled:opacity-70">{st === "busy" ? "กำลังบันทึก…" : st === "ok" ? "✓ บันทึกแล้ว" : "บันทึก"}</button>
      )}
      {st && st !== "busy" && st !== "ok" && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{st}</p>}
    </div>
  );
}

/** แถวลิงก์ท้ายหน้าตั้งค่า (บอร์ด): ออกจากระบบ · ข้อความตอบกลับเร็ว · รีวิวของฉัน · ลบบัญชี (PDPA) — ลบบัญชีต้องยืนยันในหน้า */
export function AccountLinks({ mb, t, reviewsHref, quickHref, strikesHref, deleteRequested }: { mb: string; t: string; reviewsHref: string; quickHref: string; strikesHref: string; deleteRequested: string | null }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [reqAt, setReqAt] = useState(deleteRequested);
  const [err, setErr] = useState("");
  const logout = async () => { await fetch("/api/join/logout", { method: "POST" }).catch(() => null); router.push("/work-with-us"); };
  const del = async () => {
    const e = await post(mb, t, "delete_request", () => {});
    if (e) { setErr(e); return; }
    setReqAt(new Date().toISOString()); setAsk(false);
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap justify-center gap-x-[18px] text-[13px] font-light" style={{ padding: "4px 0 8px" }}>
        <button type="button" onClick={logout} className="min-h-11 text-[#d9c9b4]">ออกจากระบบ</button>
        <Link href={quickHref} className="min-h-11 flex items-center text-[#e8c472]">ข้อความตอบกลับเร็ว</Link>
        <Link href={strikesHref} className="min-h-11 flex items-center text-[#e8c472]">สถานะบัญชี</Link>
        <Link href={reviewsHref} className="min-h-11 flex items-center text-[#e8c472]">รีวิวของฉัน</Link>
        {!reqAt && <button type="button" onClick={() => setAsk(true)} className="min-h-11 text-[#ff8a9a]">ลบบัญชี (PDPA)</button>}
      </div>
      {reqAt && <p className="m-0 rounded-[14px] text-[13px] font-light text-[#d9c9b4] text-center" style={{ padding: "10px 14px", background: "rgba(255,138,154,0.08)" }}>ส่งคำขอลบบัญชีแล้ว ({new Date(reqAt).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}) · ทีมงานจะติดต่อยืนยันภายใน 30 วัน ตาม PDPA</p>}
      {ask && !reqAt && (
        <div role="dialog" aria-label="ยืนยันลบบัญชี" className="rounded-[20px] bg-[#211a18] flex flex-col gap-2.5" style={{ padding: 16 }}>
          <div className="text-[16px] font-semibold">ขอลบบัญชีและข้อมูลส่วนตัว?</div>
          <p className="m-0 text-[13.5px] font-light text-[#d9c9b4]">ทีมงานจะติดต่อยืนยันก่อนลบจริง · ค่าการันตีที่ชำระแล้วดำเนินการตามสัญญา · ลบแล้วกู้คืนไม่ได้</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAsk(false)} className="h-11 rounded-xl text-[14px] font-semibold" style={{ background: "rgba(243,234,217,0.1)" }}>ยกเลิก</button>
            <button type="button" onClick={del} className="h-11 rounded-xl text-[14px] font-semibold text-white" style={{ background: "#a3283c" }}>ยืนยันขอลบ</button>
          </div>
          {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}</p>}
        </div>
      )}
    </div>
  );
}

/** บอร์ด ProviderJobboard — การ์ดประกาศ "วันนี้ว่าง" (รูปหลักเป็นพื้น) · แก้ไข / ปิดประกาศ · + สร้างประกาศใหม่ */
export function JobPost({ mb, t, init, photo, meta }: { mb: string; t: string; init: PtPost | null; photo: string; meta: string }) {
  const [p, setP] = useState<PtPost | null>(init);
  const [form, setForm] = useState(false);
  const [f, setF] = useState({ text: "", time: "", zone: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const live = !!p?.open;
  const open = (from: PtPost | null) => { setF({ text: from?.text ?? "", time: from?.time ?? "", zone: from?.zone ?? "" }); setErr(""); setForm(true); };
  const run = async (fill: (fd: FormData) => void, done: () => void) => {
    setBusy(true); setErr("");
    const e = await post(mb, t, "post", fill);
    setBusy(false);
    if (e) setErr(e); else done();
  };
  const save = () => run((fd) => { fd.set("text", f.text); fd.set("time", f.time); fd.set("zone", f.zone); }, () => { setP({ ...f, open: true, created_at: new Date().toISOString() }); setForm(false); });
  const close = () => run((fd) => fd.set("close", "true"), () => setP(p ? { ...p, open: false } : null));
  const inp = "w-full h-12 rounded-xl bg-[#251d1b] text-[#f3ead9] text-[15px] font-light outline-none border border-transparent focus:border-[#e8c472] placeholder:text-[#8d7f72]";
  const field = (k: "text" | "time" | "zone", label: string, ph: string) => (
    <label className="flex flex-col gap-1.5"><span className="text-[13px] font-light">{label}</span>
      <input value={f[k]} maxLength={k === "text" ? 160 : 80} placeholder={ph} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} className={inp} style={{ padding: "0 14px" }} /></label>
  );

  return (
    <div className="flex flex-col gap-3.5">
      {form ? (
        <div className="rounded-3xl bg-[#211a18] flex flex-col gap-3" style={{ padding: 18 }}>
          <span className="text-[16px] font-semibold">{live ? "แก้ไขประกาศ" : "สร้างประกาศใหม่ · วันนี้ว่าง"}</span>
          {field("text", "อยากทำอะไร", "เช่น ว่างดินเนอร์ · คาเฟ่ · นวดผ่อนคลาย")}
          {field("time", "ช่วงเวลา", "เช่น 17:00–23:00")}
          {field("zone", "โซน", "เช่น วัฒนา อโศก")}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setForm(false)} className="h-12 rounded-[14px] text-[15px] font-semibold" style={{ background: "rgba(243,234,217,0.1)" }}>ยกเลิก</button>
            <button type="button" onClick={save} disabled={busy} className="h-12 rounded-[14px] bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold">{busy ? "กำลังบันทึก…" : "ลงประกาศ"}</button>
          </div>
        </div>
      ) : live ? (
        <div className="relative rounded-3xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photo ? <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <span className="absolute inset-0 bg-[#2a211e]" />}
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg,rgba(42,33,30,0.95) 0%,rgba(42,33,30,0.85) 60%,rgba(42,33,30,0.2) 100%)" }} />
          <div className="relative flex flex-col gap-2.5 min-h-[250px]" style={{ padding: 18 }}>
            <span className="self-start h-[26px] rounded-full bg-[#e8c472] text-[#1b130b] text-[13px] font-semibold flex items-center" style={{ padding: "0 10px" }}>วันนี้ว่าง</span>
            <div className="font-semibold text-[22px] leading-[1.3] max-w-[240px] break-words">{p!.text} {p!.time} โซน{p!.zone}</div>
            <div className="text-[13px] font-light">{meta}</div>
            <div className="flex gap-2 mt-auto">
              <button type="button" onClick={() => open(p)} className="h-[42px] rounded-xl text-[#f3ead9]" style={{ padding: "0 16px", background: "rgba(232,196,114,0.16)" }}>แก้ไข</button>
              <button type="button" onClick={close} disabled={busy} className="h-[42px] rounded-xl bg-black text-[#fbf1f3] font-semibold" style={{ padding: "0 16px" }}>ปิดประกาศ</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-[#211a18] flex flex-col items-center text-center gap-1" style={{ padding: "28px 16px" }}>
          <span className="font-semibold">ยังไม่มีประกาศ</span>
          <span className="text-[13.5px] font-light text-[#d9c9b4]">บอกลูกค้าว่าวันนี้คุณว่าง · ใส่กิจกรรม เวลา และโซน</span>
        </div>
      )}
      {err && <p role="alert" className="m-0 text-[13px] text-[#ff8a9a]">{err}</p>}
      {!form && <button type="button" onClick={() => open(null)} className="h-14 rounded-2xl text-[#e8c472] font-semibold text-[16px]" style={{ background: "rgba(232,196,114,0.16)" }}>+ สร้างประกาศใหม่</button>}
    </div>
  );
}
