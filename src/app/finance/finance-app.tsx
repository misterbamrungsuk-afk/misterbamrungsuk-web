"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  KIND_LABEL, MONTHS, fixedTotal, fmt, fmt2, fmtPct, monthSummary, perRound, svcLabel, targetFor, targetMix,
  type ExpenseKind, type FinExpense, type FinItem, type FinService, type FinancePlan,
} from "@/lib/finance/plan";

// หลังบ้านการเงิน — ดีไซน์ตามสไลด์ Canva "Update MB" หน้า 8 · 9 · 10 (โทนม่วงอ่อน)
type View = "overview" | "costs" | "target";
const NAV: { view: View; href: string; label: string; sub: string }[] = [
  { view: "overview", href: "/finance", label: "ภาพรวม", sub: "รายได้ · ค่าใช้จ่าย · เคสรายเดือน" },
  { view: "costs", href: "/finance/costs", label: "รายละเอียดต้นทุน", sub: "ต้นทุนต่อรอบ · ค่าใช้จ่ายประจำ · %" },
  { view: "target", href: "/finance/target", label: "เป้ากำไร", sub: "ต้องขายกี่รอบ · จุดคุ้มทุน" },
];
const TITLE: Record<View, [string, string]> = {
  overview: ["ภาพรวมการเงินและรายได้บริการ", "ทุนเริ่มต้น • รายได้แต่ละบริการ • ค่าใช้จ่าย • กำไรต่อเดือน"],
  costs: ["รายละเอียดต้นทุน", "รู้ว่าเงินจ่ายให้ใคร และเกิดจากอะไร • ตัวอย่างประมาณการต่อเดือน"],
  target: ["วางเป้ากำไรของคุณ", "เลือกบริการ แล้วดูว่าต้องขายกี่รอบต่อเดือน"],
};
const uid = () => Math.random().toString(36).slice(2, 10);

export function FinanceApp({ view, initial, who }: { view: View; initial: FinancePlan; who: string }) {
  const [plan, setPlan] = useState<FinancePlan>(initial);
  const [saved, setSaved] = useState<FinancePlan>(initial);
  const [month, setMonth] = useState(() => MONTHS.find((m) => initial.months[m]) ?? "M4");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = useMemo(() => JSON.stringify({ ...plan, history: [] }) !== JSON.stringify({ ...saved, history: [] }), [plan, saved]);
  const up = (patch: Partial<FinancePlan>) => setPlan((p) => ({ ...p, ...patch }));

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const save = async () => {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, note: `แก้ไขหน้า${NAV.find((n) => n.view === view)?.label}` }) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { ok?: boolean; plan?: FinancePlan; error?: string } | null;
    setBusy(false);
    if (d?.ok && d.plan) { setPlan(d.plan); setSaved(d.plan); setMsg({ ok: true, text: "บันทึกแล้ว" }); }
    else setMsg({ ok: false, text: d?.error ?? "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" });
  };
  const leave = (e: React.MouseEvent) => { if (dirty && !window.confirm("ยังไม่ได้บันทึก — ออกจากหน้านี้เลยไหม?")) e.preventDefault(); };
  const last = saved.history[0];

  return (
    <div className="lg:flex">
      <style>{CSS}</style>
      {/* เมนูซ้าย */}
      <nav aria-label="เมนูการเงิน" className="fin-side lg:w-[248px] shrink-0 lg:sticky lg:top-0 lg:h-dvh flex lg:flex-col gap-1 p-3 lg:p-5 overflow-x-auto no-scrollbar">
        <div className="hidden lg:flex items-center gap-3 pb-5">
          <span className="fin-logo">MB</span>
          <div className="leading-tight"><div className="text-[11px] tracking-[.12em] text-[var(--fm)]">MISTER</div><div className="text-[13px] font-bold tracking-[.06em]">BAMRUNGSUK</div></div>
        </div>
        {NAV.map((n) => (
          <Link key={n.view} href={n.href} onClick={leave} aria-current={n.view === view ? "page" : undefined} className={`fin-nav ${n.view === view ? "on" : ""}`}>
            <span className="block font-semibold text-[14.5px] whitespace-nowrap">{n.label}</span>
            <span className="hidden lg:block text-[12px] text-[var(--fm)]">{n.sub}</span>
          </Link>
        ))}
        <div className="hidden lg:block mt-auto pt-4 border-t border-[var(--fl)] text-[12px] text-[var(--fm)] leading-relaxed">
          <Link href="/admin" onClick={leave} className="font-semibold text-[var(--fp)]">← กลับหลังบ้าน</Link>
          <p className="m-0 mt-2 break-all">{who}</p>
          {last && <p className="m-0 mt-1">บันทึกล่าสุด {new Date(last.at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })} · {last.by}</p>}
        </div>
      </nav>

      <main className="flex-1 min-w-0 px-4 lg:px-8 py-4 lg:py-7 pb-28">
        <header className="flex flex-wrap items-start gap-3 mb-5">
          <div className="flex-1 min-w-[240px]">
            <div className="text-[11.5px] font-semibold tracking-[.12em] text-[var(--fm)]">MISTER BAMRUNGSUK · หลังบ้านการเงิน</div>
            <h1 className="m-0 text-[24px] lg:text-[28px] font-bold leading-[1.35]">{TITLE[view][0]}</h1>
            <p className="m-0 text-[14px] text-[var(--fm)]">{TITLE[view][1]}</p>
          </div>
          <span className="fin-chip mt-1">แผนจำลอง · ไม่กระทบเงินจริง</span>
        </header>
        {view === "overview" && <Overview plan={plan} up={up} month={month} setMonth={setMonth} />}
        {view === "costs" && <Costs plan={plan} up={up} month={month} setMonth={setMonth} />}
        {view === "target" && <Target plan={plan} up={up} month={month} setMonth={setMonth} />}
      </main>

      {/* แถบบันทึก */}
      <div className="fin-savebar">
        <span className={`text-[13.5px] ${msg ? (msg.ok ? "text-[var(--fg)]" : "text-[var(--fr)]") : "text-[var(--fm)]"}`}>
          {msg?.text ?? (dirty ? "มีการแก้ไขที่ยังไม่บันทึก" : "ตัวเลขทั้งหมดบันทึกแล้ว")}
        </span>
        <span className="flex-1" />
        {dirty && <button type="button" className="fin-btn ghost" onClick={() => { setPlan(saved); setMsg(null); }}>ยกเลิกที่แก้</button>}
        <button type="button" className="fin-btn" disabled={!dirty || busy} onClick={save}>{busy ? "กำลังบันทึก…" : "บันทึก"}</button>
      </div>
    </div>
  );
}

type P = { plan: FinancePlan; up: (p: Partial<FinancePlan>) => void; month: string; setMonth: (m: string) => void };

// ─── ช่องกรอก ───
function Num({ value, onChange, pct, w = "w-[120px]", label, step, blankZero }: { value: number; onChange: (n: number) => void; pct?: boolean; w?: string; label: string; step?: number; blankZero?: boolean }) {
  const shown = pct ? Math.round(value * 10000) / 100 : value;
  const [txt, setTxt] = useState(String(shown));
  const [focus, setFocus] = useState(false);
  useEffect(() => { if (!focus) setTxt(String(shown)); }, [shown, focus]);
  return (
    <span className={`fin-in ${w}`}>
      <input aria-label={label} inputMode="decimal" value={focus ? txt : pct ? String(shown) : blankZero && !value ? "" : fmt2(value)} placeholder={blankZero ? "–" : undefined} step={step}
        onFocus={() => { setFocus(true); setTxt(String(shown)); }} onBlur={() => setFocus(false)}
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9.]/g, ""); setTxt(t);
          const n = Number(t); if (Number.isFinite(n)) onChange(pct ? n / 100 : n);
        }} />
      {pct && <span className="text-[var(--fm)]">%</span>}
    </span>
  );
}
function Txt({ value, onChange, label, w = "flex-1" }: { value: string; onChange: (s: string) => void; label: string; w?: string }) {
  return <span className={`fin-in ${w} min-w-0`}><input aria-label={label} value={value} maxLength={60} onChange={(e) => onChange(e.target.value)} /></span>;
}
const Del = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button type="button" onClick={onClick} aria-label={label} title="ลบ" className="fin-x">×</button>
);
const Card = ({ n, title, tone = "violet", children, right }: { n?: number; title: string; tone?: "violet" | "blue" | "orange" | "green"; children: React.ReactNode; right?: React.ReactNode }) => (
  <section className={`fin-card t-${tone}`}>
    <div className="flex items-center gap-2 mb-3">
      {n && <span className="fin-num">{n}</span>}
      <h2 className="m-0 text-[17px] font-bold flex-1">{title}</h2>
      {right}
    </div>
    {children}
  </section>
);
const Kpi = ({ label, value, unit = "บาท", tone, sub }: { label: string; value: string; unit?: string; tone: string; sub?: string }) => (
  <div className={`fin-kpi t-${tone}`}>
    <div className="text-[13.5px] font-semibold text-[var(--ft2)]">{label}</div>
    <div className="fin-kv">{value}</div>
    <div className="text-[12.5px] text-[var(--fm)]">{unit}{sub && <span className="ml-2 fin-pill">{sub}</span>}</div>
  </div>
);
function MonthPick({ month, setMonth, plan }: { month: string; setMonth: (m: string) => void; plan: FinancePlan }) {
  return (
    <label className="fin-in w-auto gap-2">
      <span className="text-[12.5px] text-[var(--fm)] whitespace-nowrap">เดือนที่ดู</span>
      <select value={month} onChange={(e) => setMonth(e.target.value)} className="font-semibold">
        {MONTHS.map((m) => <option key={m} value={m}>{m}{plan.months[m] ? " ●" : ""}</option>)}
      </select>
    </label>
  );
}
function Shares({ plan, up }: { plan: FinancePlan; up: P["up"] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 items-center text-[13.5px]">
      <label className="flex items-center gap-2">ส่วนแบ่งบริษัท <Num label="ส่วนแบ่งบริษัท" pct w="w-[88px]" value={plan.companyShare} onChange={(v) => up({ companyShare: Math.min(1, v) })} /></label>
      <label className="flex items-center gap-2">ค่าธรรมเนียมจากผู้ให้บริการ <Num label="ค่าธรรมเนียมจากผู้ให้บริการ" pct w="w-[80px]" value={plan.providerFee} onChange={(v) => up({ providerFee: v })} /></label>
      <label className="flex items-center gap-2">ค่ารับชำระ <Num label="ค่ารับชำระ" pct w="w-[80px]" value={plan.pgFee} onChange={(v) => up({ pgFee: v })} /></label>
    </div>
  );
}

// ─── หน้า 8: ภาพรวม ───
function Overview({ plan, up, month, setMonth }: P) {
  const m = monthSummary(plan, month);
  const startupSum = plan.startup.reduce((t, i) => t + i.amount, 0);
  const setRounds = (mo: string, sid: string, n: number) => up({ months: { ...plan.months, [mo]: { ...(plan.months[mo] ?? {}), [sid]: Math.max(0, Math.round(n)) } } });
  const setSvc = (i: number, patch: Partial<FinService>) => up({ services: plan.services.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
  const prev = MONTHS[MONTHS.indexOf(month) - 1];
  return (
    <div className="flex flex-col gap-4">
      <div className="fin-bar">
        <MonthPick month={month} setMonth={setMonth} plan={plan} />
        <span className="text-[13.5px]">จำนวนบริการ <b className="tabular-nums">{fmt(m.totalRounds)}</b> รอบ</span>
        {prev && plan.months[prev] && <button type="button" className="fin-btn ghost sm" onClick={() => up({ months: { ...plan.months, [month]: { ...plan.months[prev] } } })}>คัดลอกเคสจาก {prev}</button>}
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Kpi tone="violet" label="ทุนเริ่มต้น" value={fmt(plan.capital)} />
        <Kpi tone="violet" label="รายได้บริษัท / เดือน" value={fmt(m.revenue, 2)} />
        <Kpi tone="orange" label="ค่าใช้จ่าย / เดือน" value={fmt(m.expenses, 2)} />
        <Kpi tone={m.profit >= 0 ? "green" : "red"} label="กำไรก่อนภาษี / เดือน" value={fmt(m.profit, 2)} sub={m.revenue ? `${fmtPct(m.margin)} ของรายได้บริษัท` : undefined} />
      </div>

      <div className="grid xl:grid-cols-[1.1fr_1.45fr_1fr] gap-4 items-start">
        <Card n={1} title="เงินทุนใช้กับอะไร?">
          <Row l="ทุนตั้งต้น" r={<Num label="ทุนตั้งต้น" value={plan.capital} onChange={(v) => up({ capital: v })} />} />
          <Items items={plan.startup} onChange={(startup) => up({ startup })} addLabel="+ เพิ่มรายการเงินทุน" />
          <div className="fin-total"><span>งบเริ่มต้นรวม</span><b>{fmt(startupSum)}</b></div>
          <div className="fin-hero t-blue mt-3">
            <div className="text-[14px] font-semibold">เหลือสำหรับดำเนินงาน</div>
            <div className="text-[28px] font-bold text-[var(--fb)] tabular-nums">{fmt(plan.capital - startupSum)} <span className="text-[15px]">บาท</span></div>
          </div>
          <p className="fin-note">ยอดหลังหักงบเริ่มต้น ไม่ใช่เงินปลายเดือน</p>
        </Card>

        <Card n={2} title="รายได้มาจากไหน?" tone="blue">
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="fin-t">
              <thead><tr><th>บริการ</th><th className="r">ราคา (บาท)</th><th className="r">รอบ ({month})</th><th className="r">ยอดลูกค้าจ่าย</th></tr></thead>
              <tbody>
                {m.rows.map(({ s, gross, rounds }, i) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap">{s.name} {s.level && <span className={`fin-lv ${/top/i.test(s.level) ? "top" : ""}`}>{s.level}</span>}</td>
                    <td className="r"><Num label={`ราคา ${svcLabel(s)}`} w="w-[96px]" value={s.price} onChange={(price) => setSvc(i, { price })} /></td>
                    <td className="r"><Num label={`รอบ ${svcLabel(s)}`} w="w-[76px]" value={rounds} onChange={(n) => setRounds(month, s.id, n)} /></td>
                    <td className="r tabular-nums">{fmt(gross)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/finance/costs#services" className="fin-add inline-block">+ เพิ่ม/แก้ชื่อบริการ</Link>
          <div className="fin-total t-blue"><span>ยอดลูกค้าจ่ายรวม</span><b>{fmt(m.gross)} บาท</b></div>
          <Row l={`ส่วนแบ่งบริษัท ${fmtPct(plan.companyShare)}`} r={fmt(m.company, 2)} />
          <Row l={`ค่าธรรมเนียมผู้ให้บริการ ${fmtPct(plan.providerFee)}`} r={`+${fmt(m.fee, 2)}`} />
          <div className="fin-total t-violet"><span>รายได้บริษัท</span><b>{fmt(m.revenue, 2)} บาท</b></div>
          <div className="mt-3"><Shares plan={plan} up={up} /></div>
        </Card>

        <Card n={3} title="ค่าใช้จ่ายรายเดือน" tone="orange" right={<Link href="/finance/costs" className="text-[12.5px] font-semibold text-[var(--fp)]">แก้ไข →</Link>}>
          <div className="flex justify-between text-[12.5px] font-semibold text-[var(--fm)] pb-1"><span>รายการ</span><span>จำนวนเงิน (บาท)</span></div>
          {m.lines.map((l) => <Row key={l.id} l={<>{l.name}{l.kind === "pctRevenue" && ` (${fmtPct(l.value)} ของรายได้)`}{l.noncash && <span className="fin-pill ml-1">ไม่ใช่เงินสด</span>}</>} r={fmt(l.amount, 2)} />)}
          <div className="fin-total t-orange"><span>รวม</span><b>{fmt(m.expenses, 2)} บาท</b></div>
          {plan.pending.every((i) => !i.amount) && <p className="fin-warn">ยังไม่รวมรีครูท โบนัส ภาษี และรายการรอตั้งงบ</p>}
        </Card>
      </div>

      <section className="fin-card t-green">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="m-0 text-[18px] font-bold min-w-[140px]">สรุปเดือน {month} เหลือเท่าไร?</h2>
          <div className="fin-eq t-violet"><span>รายได้บริษัท</span><b>{fmt(m.revenue, 2)}</b></div>
          <span className="text-[24px] font-bold text-[var(--fm)]">−</span>
          <div className="fin-eq t-orange"><span>ค่าใช้จ่ายรวม</span><b>{fmt(m.expenses, 2)}</b></div>
          <span className="text-[24px] font-bold text-[var(--fm)]">=</span>
          <div className={`fin-eq ${m.profit >= 0 ? "t-green" : "t-red"}`}><span>กำไรก่อนภาษี</span><b>{fmt(m.profit, 2)} บาท</b></div>
        </div>
        <p className="m-0 mt-3 text-[13.5px] text-center">เงินสดจากการดำเนินงานโดยประมาณ <b className="tabular-nums">{fmt(m.cash, 2)} บาท</b> • ก่อนเงินลงทุนและการเปลี่ยนแปลง Wallet</p>
      </section>

      <Card title="กรอกเคสรายเดือน (M1–M18)" tone="blue">
        <p className="fin-note -mt-1 mb-2">จำนวนรอบที่ขายได้/คาดว่าจะขายต่อเดือน แยกตามบริการ — แตะชื่อเดือนเพื่อดูสรุปด้านบน</p>
        <div className="overflow-x-auto">
          <table className="fin-t grid18">
            <thead>
              <tr><th className="sticky left-0 bg-[var(--fc)] z-[1]">บริการ</th>{MONTHS.map((mo) => <th key={mo} className="r"><button type="button" onClick={() => setMonth(mo)} className={`fin-mo ${mo === month ? "on" : ""}`}>{mo}</button></th>)}</tr>
            </thead>
            <tbody>
              {plan.services.map((s) => (
                <tr key={s.id}>
                  <td className="sticky left-0 bg-[var(--fc)] z-[1] whitespace-nowrap text-[13px]">{svcLabel(s)}</td>
                  {MONTHS.map((mo) => <td key={mo} className="r"><Num label={`${svcLabel(s)} ${mo}`} w="w-[64px]" value={plan.months[mo]?.[s.id] ?? 0} onChange={(n) => setRounds(mo, s.id, n)} blankZero /></td>)}
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="sticky left-0 bg-[var(--fc)] z-[1]">กำไร/เดือน</td>
                {MONTHS.map((mo) => { const p = plan.months[mo] ? monthSummary(plan, mo).profit : null; return <td key={mo} className={`r text-[12.5px] tabular-nums ${p == null ? "text-[var(--fm)]" : p >= 0 ? "text-[var(--fg)]" : "text-[var(--fr)]"}`}>{p == null ? "—" : fmt(p / 1000, 0) + "K"}</td>; })}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      <p className="fin-note">สมมติฐาน: บริษัท {fmtPct(plan.companyShare)} ทุกรอบ • ค่าธรรมเนียม {fmtPct(plan.providerFee)} ของส่วนแบ่งผู้ให้บริการ • ค่ารับชำระ {fmtPct(plan.pgFee)} ของยอดลูกค้า • ไม่รวมภาษีเงินได้นิติบุคคล</p>
    </div>
  );
}

const Row = ({ l, r }: { l: React.ReactNode; r: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[var(--fl)] text-[14px]"><span className="min-w-0">{l}</span><span className="tabular-nums shrink-0 text-right">{r}</span></div>
);
function Items({ items, onChange, addLabel, zeroChip }: { items: FinItem[]; onChange: (v: FinItem[]) => void; addLabel: string; zeroChip?: boolean }) {
  return (
    <>
      {items.map((it, i) => (
        <div key={it.id} className="flex items-center gap-2 py-1.5 border-b border-[var(--fl)]">
          <Txt label="ชื่อรายการ" value={it.name} onChange={(name) => onChange(items.map((x, k) => (k === i ? { ...x, name } : x)))} />
          {zeroChip && !it.amount && <span className="fin-pill warn hidden sm:inline">ยังไม่ใส่งบ</span>}
          <Num label={`จำนวนเงิน ${it.name}`} w="w-[104px]" value={it.amount} onChange={(amount) => onChange(items.map((x, k) => (k === i ? { ...x, amount } : x)))} />
          <Del label={`ลบ ${it.name}`} onClick={() => onChange(items.filter((_, k) => k !== i))} />
        </div>
      ))}
      <button type="button" className="fin-add" onClick={() => onChange([...items, { id: uid(), name: "รายการใหม่", amount: 0 }])}>{addLabel}</button>
    </>
  );
}

// ─── หน้า 9: รายละเอียดต้นทุน ───
function Costs({ plan, up, month, setMonth }: P) {
  const m = monthSummary(plan, month);
  const [sid, setSid] = useState(plan.services[0]?.id);
  const svc = plan.services.find((s) => s.id === sid) ?? plan.services[0];
  const r = perRound(plan, svc?.price ?? 0);
  const fixed = fixedTotal(plan, true) - plan.pending.reduce((t, i) => t + i.amount, 0);
  const setExp = (i: number, patch: Partial<FinExpense>) => up({ expenses: plan.expenses.map((e, k) => (k === i ? { ...e, ...patch } : e)) });
  return (
    <div className="flex flex-col gap-4">
      <div className="fin-bar">
        <MonthPick month={month} setMonth={setMonth} plan={plan} />
        <span className="text-[13.5px]">{fmt(m.totalRounds)} รอบ · ยอดลูกค้าจ่าย <b className="tabular-nums text-[var(--fb)]">{fmt(m.gross)} บาท</b></span>
        <span className="flex-1" />
        <Shares plan={plan} up={up} />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Kpi tone="blue" label="จ่ายผู้ให้บริการ" value={fmt(m.provider, 2)} sub={`ส่วนแบ่ง ${fmtPct(1 - plan.companyShare)}`} />
        <Kpi tone="orange" label="ต้นทุนผันแปรบริษัท" value={fmt(m.variable, 2)} sub="ค่ารับชำระ + ค่าใช้จ่ายแบบ %" />
        <Kpi tone="orange" label="ค่าใช้จ่ายประจำ (เงินสด)" value={fmt(fixed)} sub="ต่อเดือน" />
      </div>

      <div className="grid xl:grid-cols-[1fr_1.15fr] gap-4 items-start">
        <Card title="ต้นทุนต่อบริการ 1 รอบ">
          <select value={svc?.id} onChange={(e) => setSid(e.target.value)} className="fin-sel mb-2" aria-label="เลือกบริการ">
            {plan.services.map((s) => <option key={s.id} value={s.id}>{svcLabel(s)} • {fmt(s.price)} บาท</option>)}
          </select>
          <Row l={<><i className="dot" style={{ background: "#2563eb" }} />ราคาที่ลูกค้าจ่าย</>} r={fmt(r.price, 2)} />
          <Row l={<><i className="dot" style={{ background: "#64748b" }} />ส่วนแบ่งผู้ให้บริการ {fmtPct(1 - plan.companyShare)}</>} r={fmt(r.provider, 2)} />
          <Row l={<><i className="dot" style={{ background: "#0d9488" }} />ส่วนแบ่งบริษัท {fmtPct(plan.companyShare)}</>} r={fmt(r.company, 2)} />
          <Row l={<><i className="dot" style={{ background: "#7c3aed" }} />ค่าธรรมเนียมจากผู้ให้บริการ {fmtPct(plan.providerFee)}</>} r={<span className="text-[var(--fp)]">+{fmt(r.fee, 2)}</span>} />
          <Row l={<><i className="dot" style={{ background: "#ea580c" }} />ค่ารับชำระ {fmtPct(plan.pgFee)} ของยอดลูกค้า</>} r={<span className="text-[var(--fo)]">−{fmt(r.pg, 2)}</span>} />
          {r.pctCost > 0 && <Row l={<><i className="dot" style={{ background: "#ea580c" }} />ค่าใช้จ่ายแบบ % (เช่น การตลาด)</>} r={<span className="text-[var(--fo)]">−{fmt(r.pctCost, 2)}</span>} />}
          <div className="fin-total t-green"><span>เหลือก่อนค่าใช้จ่ายประจำ</span><b>{fmt(r.net, 2)} บาท</b></div>
          <p className="fin-note">ผู้ให้บริการรับสุทธิ {fmt(r.providerNet, 2)} บาท/รอบ (หลังหักค่าธรรมเนียม)</p>
        </Card>

        <Card title="ค่าใช้จ่ายประจำ / เดือน" tone="orange">
          <div className="flex text-[12.5px] font-semibold text-[var(--fm)] pb-1 gap-2"><span className="flex-1">รายการ</span><span className="w-[150px]">คิดแบบ</span><span className="w-[120px] text-right">งบประมาณ</span><span className="w-7" /></div>
          {plan.expenses.map((e, i) => (
            <div key={e.id} className="py-1.5 border-b border-[var(--fl)]"><div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <Txt label="ชื่อค่าใช้จ่าย" value={e.name} onChange={(name) => setExp(i, { name })} />
              <select aria-label={`คิดแบบ ${e.name}`} className="fin-sel w-[150px]" value={e.kind} onChange={(ev) => { const kind = ev.target.value as ExpenseKind; setExp(i, { kind, value: kind === "fixed" ? 0 : 0.1 }); }}>
                {(Object.keys(KIND_LABEL) as ExpenseKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
              <Num label={`งบ ${e.name}`} pct={e.kind !== "fixed"} value={e.value} onChange={(value) => setExp(i, { value })} />
              <Del label={`ลบ ${e.name}`} onClick={() => up({ expenses: plan.expenses.filter((_, k) => k !== i) })} />
              </div>
              {e.kind === "fixed" && (
                <label className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--fm)] pl-1">
                  <input type="checkbox" checked={!!e.noncash} onChange={(ev) => setExp(i, { noncash: ev.target.checked || undefined })} /> ไม่ใช่เงินสด (ตัดจำหน่าย — นับในกำไร แต่ไม่นับในเป้ารอบขาย)
                </label>
              )}
            </div>
          ))}
          <button type="button" className="fin-add" onClick={() => up({ expenses: [...plan.expenses, { id: uid(), name: "ค่าใช้จ่ายใหม่", kind: "fixed", value: 0 }] })}>+ เพิ่มค่าใช้จ่าย</button>
          <div className="fin-total t-orange"><span>รวม (บาท/เดือน)</span><b>{fmt(plan.expenses.filter((e) => e.kind === "fixed").reduce((t, e) => t + e.value, 0))} บาท</b></div>
          <p className="fin-note">เป็นเงินสด {fmt(fixed)} บาท/เดือน (ใช้ในหน้าเป้ากำไร) · ค่าใช้จ่ายแบบ % คิดตามยอดของเดือนที่ดู</p>
        </Card>
      </div>

      <div id="services" className="scroll-mt-20">
        <Card title="บริการและราคา (ค่าบริการ 3 ชั่วโมง)" tone="blue">
          <div className="overflow-x-auto">
            <table className="fin-t">
              <thead><tr><th>ชื่อบริการ</th><th>ระดับ</th><th className="r">ราคา (บาท)</th><th className="r">บริษัทเหลือ/รอบ</th><th className="r">ผู้ให้บริการรับสุทธิ</th><th /></tr></thead>
              <tbody>
                {plan.services.map((s, i) => {
                  const pr = perRound(plan, s.price);
                  const setSvc = (patch: Partial<FinService>) => up({ services: plan.services.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
                  return (
                    <tr key={s.id}>
                      <td><Txt label="ชื่อบริการ" w="w-full min-w-[160px]" value={s.name} onChange={(name) => setSvc({ name })} /></td>
                      <td><Txt label="ระดับ" w="w-[100px]" value={s.level} onChange={(level) => setSvc({ level })} /></td>
                      <td className="r"><Num label={`ราคา ${svcLabel(s)}`} w="w-[110px]" value={s.price} onChange={(price) => setSvc({ price })} /></td>
                      <td className="r tabular-nums text-[var(--fg)] font-semibold">{fmt(pr.net, 2)}</td>
                      <td className="r tabular-nums">{fmt(pr.providerNet, 2)}</td>
                      <td>{plan.services.length > 1 && <Del label={`ลบ ${svcLabel(s)}`} onClick={() => up({ services: plan.services.filter((x) => x.id !== s.id) })} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" className="fin-add" onClick={() => up({ services: [...plan.services, { id: uid(), name: "บริการใหม่", level: "", price: 0 }] })}>+ เพิ่มบริการ</button>
        </Card>
      </div>

      <div className="grid xl:grid-cols-2 gap-4 items-start">
        <Card title="รายการที่ต้องตั้งงบเพิ่ม (ต่อเดือน)">
          <Items items={plan.pending} onChange={(pending) => up({ pending })} addLabel="+ เพิ่มรายการ" zeroChip />
          {plan.pending.some((i) => !i.amount) && <p className="fin-warn">รายการที่ยังเป็น 0 ยังไม่ถูกหักในกำไร</p>}
        </Card>
        <Card title="เงินลงทุนและรายการแยกติดตาม" tone="blue">
          <Row l="ทุนตั้งต้น" r={<Num label="ทุนตั้งต้น" value={plan.capital} onChange={(v) => up({ capital: v })} />} />
          <Items items={plan.startup} onChange={(startup) => up({ startup })} addLabel="+ เพิ่มรายการเงินลงทุน" />
          <div className="fin-total t-blue"><span>เหลือสำหรับดำเนินงาน</span><b>{fmt(plan.capital - plan.startup.reduce((t, i) => t + i.amount, 0))} บาท</b></div>
        </Card>
      </div>
      <p className="fin-note">ส่วนแบ่งคำนวณจากรายได้ผู้ให้บริการ • เงินประกันที่คืนได้แยกจากรายได้ • ตัวเลขจำลอง ยังไม่รวมภาษี</p>
    </div>
  );
}

// ─── หน้า 10: เป้ากำไร ───
function Target({ plan, up, month, setMonth }: P) {
  const [multi, setMulti] = useState(false);
  const [how, setHow] = useState(false);
  const svc = plan.services.find((s) => s.id === plan.target.serviceId) ?? plan.services[0];
  const setT = (patch: Partial<FinancePlan["target"]>) => up({ target: { ...plan.target, ...patch } });
  const single = targetFor(plan, svc.price);
  const mix = targetMix(plan, month);
  const t = multi ? mix : single;
  return (
    <div className="flex flex-col gap-4">
      <div className="fin-seg" role="tablist">
        <button type="button" role="tab" aria-selected={!multi} className={!multi ? "on" : ""} onClick={() => setMulti(false)}>ประเภทเดียว</button>
        <button type="button" role="tab" aria-selected={multi} className={multi ? "on" : ""} onClick={() => setMulti(true)}>หลายประเภท</button>
      </div>
      <div className="grid xl:grid-cols-[1fr_1.2fr] gap-4 items-start">
        <Card n={1} title="เลือกบริการและเป้าหมาย">
          {multi ? (
            <div className="flex items-center gap-2 py-1.5 border-b border-[var(--fl)] text-[14px]"><span className="w-[120px]">สัดส่วนจาก</span><MonthPick month={month} setMonth={setMonth} plan={plan} /></div>
          ) : (
            <div className="flex items-center gap-2 py-1.5 border-b border-[var(--fl)] text-[14px]">
              <span className="w-[120px] shrink-0">บริการ</span>
              <select className="fin-sel flex-1 min-w-0" value={svc.id} onChange={(e) => setT({ serviceId: e.target.value })} aria-label="ประเภทบริการ">
                {plan.services.map((s) => <option key={s.id} value={s.id}>{svcLabel(s)} • {fmt(s.price)} บาท</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 py-1.5 border-b border-[var(--fl)] text-[14px]"><span className="w-[120px] shrink-0">เป้ากำไรต่อเดือน</span><Num label="เป้ากำไรต่อเดือน" w="flex-1" value={plan.target.profit} onChange={(profit) => setT({ profit })} /><span className="text-[var(--fm)]">บาท</span></div>
          <div className="flex items-center gap-2 py-1.5 border-b border-[var(--fl)] text-[14px]"><span className="w-[120px] shrink-0">วันทำงาน/เดือน</span><Num label="วันทำงานต่อเดือน" w="w-[90px]" value={plan.target.days} onChange={(days) => setT({ days: Math.min(31, Math.max(1, Math.round(days))) })} /><span className="text-[var(--fm)]">วัน</span></div>
          <div className="flex items-center gap-2 py-1.5 text-[14px]"><span className="w-[120px] shrink-0">ค่าใช้จ่ายประจำ</span><b className="tabular-nums">{fmt(single.fixed)}</b><span className="text-[var(--fm)]">บาท/เดือน</span><span className="flex-1" /><Link href="/finance/costs" className="text-[12.5px] font-semibold text-[var(--fp)] underline">แก้ไขสมมติฐาน</Link></div>
          <p className="fin-note">ค่าใช้จ่ายประจำเงินสด + รายการตั้งงบเพิ่ม (ไม่รวมค่าตัดจำหน่าย)</p>
        </Card>

        <Card n={2} title="จำนวนรอบที่ต้องขาย">
          {t && t.rounds != null ? (
            <>
              <div className="flex items-end justify-center gap-3 flex-wrap">
                <span className="text-[64px] lg:text-[80px] font-extrabold leading-none text-[var(--fp)] tabular-nums">{fmt(t.rounds)}</span>
                <span className="fin-pill big mb-3">รอบ / เดือน</span>
              </div>
              <p className="m-0 text-center text-[14px]">เพื่อเหลือกำไรอย่างน้อย {fmt(plan.target.profit)} บาท</p>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[var(--fl)] text-center">
                <div><div className="text-[12.5px] text-[var(--fm)]">เฉลี่ยต่อวัน</div><div className="text-[22px] font-bold tabular-nums">{fmt(t.perDay ?? 0)} รอบ</div><div className="text-[11.5px] text-[var(--fm)]">({plan.target.days} วัน, ปัดขึ้น)</div></div>
                <div><div className="text-[12.5px] text-[var(--fm)]">คุ้มทุนที่</div><div className="text-[22px] font-bold tabular-nums">{fmt(t.breakeven ?? 0)} รอบ</div></div>
                <div><div className="text-[12.5px] text-[var(--fm)]">กำไรตามแผน</div><div className="text-[22px] font-bold tabular-nums text-[var(--fg)]">{fmt(t.profit ?? 0)} บาท</div></div>
              </div>
              <div className="fin-total t-green mt-3"><span>เงินเหลือต่อรอบ{multi ? " (เฉลี่ย)" : ""}</span><b>{fmt(t.net, 2)} บาท</b></div>
              {multi && mix && (
                <div className="mt-3">{mix.split.filter((x) => x.w > 0).map((x) => <Row key={x.s.id} l={`${svcLabel(x.s)} (${fmtPct(x.w)})`} r={`${fmt(x.rounds)} รอบ`} />)}</div>
              )}
              <button type="button" className="fin-add w-full text-center" onClick={() => setHow(!how)} aria-expanded={how}>{how ? "ซ่อนวิธีคำนวณ ▲" : "ดูวิธีคำนวณและค่าธรรมเนียม ▼"}</button>
              {how && (
                <div className="text-[13px] leading-relaxed bg-[var(--fsoft)] rounded-xl p-3">
                  {!multi && <p className="m-0">ต่อรอบ: {fmt(svc.price)} × {fmtPct(plan.companyShare)} + ค่าธรรมเนียม {fmt(perRound(plan, svc.price).fee, 2)} − ค่ารับชำระ {fmt(perRound(plan, svc.price).pg, 2)}{perRound(plan, svc.price).pctCost ? ` − ค่าใช้จ่ายแบบ % ${fmt(perRound(plan, svc.price).pctCost, 2)}` : ""} = <b>{fmt(t.net, 2)}</b></p>}
                  <p className="m-0">รอบที่ต้องขาย = (เป้ากำไร {fmt(plan.target.profit)} + ค่าใช้จ่ายประจำ {fmt(t.fixed)}) ÷ {fmt(t.net, 2)} = <b>{fmt(t.rounds)}</b> (ปัดขึ้น)</p>
                  <p className="m-0">คุ้มทุน = {fmt(t.fixed)} ÷ {fmt(t.net, 2)} = <b>{fmt(t.breakeven ?? 0)}</b> รอบ</p>
                </div>
              )}
            </>
          ) : (
            <p className="fin-warn">{multi ? `ยังไม่มีเคสในเดือน ${month} — กรอกเคสที่หน้าภาพรวมก่อน` : "บริการนี้ไม่เหลือเงินต่อรอบ (ราคาหรือ % ทำให้ขาดทุน)"}</p>
          )}
        </Card>
      </div>

      <Card title="เปรียบเทียบกับบริการอื่น" right={<span className="text-[12.5px] text-[var(--fm)]">ขายประเภทเดียว • เป้ากำไร {fmt(plan.target.profit)} บาทเท่ากัน</span>}>
        <div className="overflow-x-auto">
          <table className="fin-t">
            <thead><tr><th>บริการ</th><th className="r">ราคา</th><th className="r">เหลือต่อรอบ</th><th className="r">คุ้มทุน</th><th className="r">รอบที่ต้องขาย/เดือน</th></tr></thead>
            <tbody>
              {plan.services.map((s) => {
                const x = targetFor(plan, s.price), on = !multi && s.id === svc.id;
                return (
                  <tr key={s.id} className={on ? "sel" : ""} onClick={() => { setMulti(false); setT({ serviceId: s.id }); }} style={{ cursor: "pointer" }}>
                    <td className="font-semibold">{svcLabel(s)}</td>
                    <td className="r tabular-nums">{fmt(s.price)} บาท</td>
                    <td className="r tabular-nums">{fmt(x.net, 2)}</td>
                    <td className="r tabular-nums">{x.breakeven == null ? "—" : `${fmt(x.breakeven)} รอบ`}</td>
                    <td className="r tabular-nums font-bold text-[16px]">{x.rounds == null ? "—" : `${fmt(x.rounds)} รอบ`}{on && " ✓"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="fin-note">สมมติส่วนแบ่งบริษัท {fmtPct(plan.companyShare)} • กำไรก่อนภาษี ยังไม่รวมรายการที่ยังไม่ใส่งบ</p>
      </Card>
    </div>
  );
}

const CSS = `
.fin-root{--fbg:#f6f4fb;--fc:#ffffff;--ft:#231a3d;--ft2:#4a3f66;--fm:#7a7091;--fl:#ebe6f5;--fp:#6d3fd1;--fpl:#efe8fd;--fb:#1d4ed8;--fbl:#e8f0fe;--fo:#d9480f;--fol:#fff1e6;--fg:#1f8a4c;--fgl:#e6f6ec;--fr:#c92a3a;--frl:#fdecee;--fsoft:#f7f4fd;
  background:var(--fbg);color:var(--ft);font-family:var(--font-sans),"IBM Plex Sans Thai",system-ui,sans-serif;line-height:1.6;color-scheme:light}
.fin-root .fin-side{background:#fff;border-right:1px solid var(--fl)}
@media (max-width:1023px){.fin-root .fin-side{border-right:0;border-bottom:1px solid var(--fl);position:sticky;top:0;z-index:30}}
.fin-logo{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-weight:800;color:var(--fp);background:var(--fpl);font-family:var(--font-display),serif}
.fin-nav{display:block;padding:10px 14px;border-radius:14px;color:var(--ft2);border-left:3px solid transparent}
.fin-nav:hover{background:var(--fsoft)}
.fin-nav.on{background:var(--fpl);color:var(--fp);border-left-color:var(--fp)}
.fin-chip{font-size:13px;font-weight:600;color:var(--fp);background:var(--fpl);border:1px solid #d9cbfa;padding:5px 14px;border-radius:999px}
.fin-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;background:#fff;border:1px solid var(--fl);border-radius:16px;padding:10px 14px}
.fin-card{min-width:0;background:var(--fc);border:1px solid var(--fl);border-radius:20px;padding:16px 18px;box-shadow:0 4px 18px rgba(60,30,120,.05)}
.fin-card.t-blue{border-top:4px solid #93b4f5}.fin-card.t-orange{border-top:4px solid #f8b98a}.fin-card.t-violet{border-top:4px solid #c3adf5}.fin-card.t-green{border-top:4px solid #98d8b0;background:linear-gradient(#f3fbf6,#fff)}
.fin-num{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:14px;background:var(--fpl);color:var(--fp)}
.fin-kpi{border-radius:18px;padding:14px 16px;background:#fff;border:1px solid var(--fl)}
.fin-kv{font-size:clamp(24px,2.4vw,30px);white-space:nowrap;font-weight:800;line-height:1.25;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.fin-kpi.t-violet .fin-kv{color:var(--fp)}.fin-kpi.t-blue .fin-kv{color:var(--fb)}.fin-kpi.t-orange .fin-kv{color:var(--fo)}.fin-kpi.t-green .fin-kv{color:var(--fg)}.fin-kpi.t-red .fin-kv{color:var(--fr)}
.fin-kpi.t-violet{background:linear-gradient(#f8f5ff,#fff)}.fin-kpi.t-blue{background:linear-gradient(#f2f6ff,#fff)}.fin-kpi.t-orange{background:linear-gradient(#fff6ef,#fff)}.fin-kpi.t-green{background:linear-gradient(#effaf3,#fff)}.fin-kpi.t-red{background:linear-gradient(#fff1f2,#fff)}
.fin-pill{display:inline-block;font-size:11.5px;font-weight:600;padding:1px 9px;border-radius:999px;background:var(--fgl);color:var(--fg)}
.fin-pill.warn{background:#fff4d6;color:#a16207;border:1px solid #f6d58a}
.fin-pill.big{font-size:16px;padding:4px 16px;background:var(--fpl);color:var(--fp)}
.fin-in{display:inline-flex;align-items:center;gap:4px;border:1px solid #ddd5ee;background:#fff;border-radius:10px;padding:0 8px;height:36px}
.fin-in:focus-within{border-color:var(--fp);box-shadow:0 0 0 3px #e4d9fc}
.fin-in input,.fin-in select{border:0;outline:0;background:transparent;width:100%;min-width:0;font:inherit;font-size:14.5px;color:var(--ft);text-align:inherit}
.fin-t td.r .fin-in input,.fin-total .fin-in input{text-align:right}
.fin-in input[inputmode=decimal]{text-align:right;font-variant-numeric:tabular-nums}
.fin-sel{height:36px;border:1px solid #ddd5ee;border-radius:10px;padding:0 10px;font:inherit;font-size:14px;background:#fff;color:var(--ft);max-width:100%}
.fin-x{width:28px;height:28px;border-radius:8px;color:var(--fm);font-size:18px;line-height:1;flex-shrink:0}.fin-x:hover{background:var(--frl);color:var(--fr)}
.fin-add{margin-top:6px;font-size:13.5px;font-weight:600;color:var(--fp);padding:6px 4px}
.fin-total{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:10px;padding:10px 14px;border-radius:12px;background:var(--fpl);font-weight:700;font-size:15px}
.fin-total b{font-size:18px;font-variant-numeric:tabular-nums;text-align:right}
.fin-total.t-violet b{color:var(--fp)}.fin-total.t-blue{background:var(--fbl)}.fin-total.t-blue b{color:var(--fb)}.fin-total.t-orange{background:var(--fol)}.fin-total.t-orange b{color:var(--fo)}.fin-total.t-green{background:var(--fgl)}.fin-total.t-green b{color:var(--fg)}
.fin-hero{border-radius:14px;padding:12px 16px;text-align:center;background:var(--fbl)}
.fin-eq{display:flex;flex-direction:column;align-items:center;border-radius:14px;padding:8px 18px;flex:1;min-width:150px}
.fin-eq span{font-size:13px;font-weight:600}.fin-eq b{font-size:22px;font-variant-numeric:tabular-nums}
.fin-eq.t-violet{background:var(--fpl)}.fin-eq.t-violet b{color:var(--fp)}.fin-eq.t-orange{background:var(--fol)}.fin-eq.t-orange b{color:var(--fo)}.fin-eq.t-green{background:var(--fgl)}.fin-eq.t-green b{color:var(--fg)}.fin-eq.t-red{background:var(--frl)}.fin-eq.t-red b{color:var(--fr)}
.fin-note{margin:8px 0 0;font-size:12.5px;color:var(--fm)}
.fin-warn{margin:10px 0 0;font-size:13px;color:#a16207;background:#fff7e0;border:1px solid #f6d58a;border-radius:10px;padding:8px 12px}
.fin-t{width:100%;border-collapse:collapse;font-size:14px}
.fin-t th{font-size:12.5px;font-weight:600;color:var(--fm);text-align:left;padding:6px 6px;border-bottom:1px solid var(--fl);white-space:nowrap;background:var(--fsoft)}
.fin-t td{padding:5px 6px;border-bottom:1px solid var(--fl)}
.fin-t .r{text-align:right}
.fin-t tr.sel td{background:#f1ebff}
.fin-t.grid18 td{padding:3px 3px}
.fin-mo{font-weight:600;padding:2px 8px;border-radius:8px}.fin-mo.on{background:var(--fp);color:#fff}
.fin-lv{display:inline-block;font-size:11.5px;font-weight:600;padding:0 8px;border-radius:999px;background:#e8eefc;color:#3b5bb5;margin-left:4px}.fin-lv.top{background:#fff1c7;color:#9a6a00}
.dot{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:8px;vertical-align:middle}
.fin-seg{display:inline-flex;background:#ece6fa;border-radius:14px;padding:4px;align-self:flex-start}
.fin-seg button{padding:8px 22px;border-radius:11px;font-weight:600;font-size:14.5px;color:var(--ft2)}
.fin-seg button.on{background:var(--fp);color:#fff;box-shadow:0 4px 12px rgba(109,63,209,.3)}
.fin-savebar{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;align-items:center;gap:10px;padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));background:rgba(255,255,255,.96);border-top:1px solid var(--fl);backdrop-filter:blur(6px)}
@media (min-width:1024px){.fin-savebar{left:248px;padding-left:32px;padding-right:32px}}
.fin-btn{height:42px;padding:0 22px;border-radius:12px;font-weight:700;font-size:15px;color:#fff;background:linear-gradient(90deg,#7c4dff,#6d3fd1)}
.fin-btn:disabled{opacity:.45}
.fin-btn.ghost{background:#fff;color:var(--fp);border:1px solid #d9cbfa}
.fin-btn.sm{height:34px;font-size:13px;padding:0 12px}
`;
