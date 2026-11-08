"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ExportBtn } from "./export-image";
import {
  MAX_MONTHS, cashTargetOf, fixedTotal, monthsOf, fmt, fmt2, fmtPct, monthLabel, monthSummary, perRound, targetFor, targetMix,
  type ExpenseKind, type FinExpense, type FinItem, type FinService, type FinancePlan,
} from "@/lib/finance/plan";

// หลังบ้านการเงิน — ดีไซน์ตามสไลด์ Canva "Update MB" หน้า 8 · 9 · 10 (โทนม่วงอ่อน) · 2 ภาษา ไทย/EN
type View = "overview" | "costs" | "target";
type Lang = "th" | "en";

// ─── ภาษา ───
const LangCtx = createContext<Lang>("th");
/** t("ไทย", "English") */
function useT() {
  const lang = useContext(LangCtx);
  return { lang, t: (th: string, en: string) => (lang === "en" ? en : th) };
}
// ชื่อค่าเริ่มต้น (ข้อมูลที่ยังไม่ได้แก้) แปลเป็นอังกฤษให้ — ชื่อที่ฝ่ายการเงินพิมพ์เองแสดงตามที่พิมพ์
const NAME_EN: Record<string, string> = {
  "เพื่อนเที่ยว": "Companion", "เพื่อนเที่ยว + นวด": "Companion + massage", "เพื่อนกินเที่ยว": "Companion", "เพื่อนกินเที่ยว + นวด": "Companion + massage",
  "พัฒนาแอป": "App development", "Audition 3 จังหวัด": "Auditions (3 provinces)", "กฎหมาย (สมมติ)": "Legal (estimate)",
  "เงินเดือนและที่ปรึกษา": "Salaries & advisors", "การตลาด": "Marketing", "ตัดจำหน่ายแอป (ไม่ใช่เงินสด)": "App amortisation (non-cash)",
  "ค่าแนะนำรีครูท": "Recruit referral fees", "โบนัสรีครูท": "Recruit bonuses", "ส่วนลดและคืนเงิน": "Discounts & refunds", "ค่าใช้จ่ายอื่น": "Other expenses",
  "บริการใหม่": "New service", "ค่าใช้จ่ายใหม่": "New expense", "รายการใหม่": "New item",
};
function useName() {
  const { lang } = useT();
  return (n: string) => (lang === "en" ? NAME_EN[n] ?? n : n);
}
function useSvcLabel() {
  const dn = useName();
  return (s: FinService) => (s.level ? `${dn(s.name)} · ${s.level}` : dn(s.name));
}

const NAV: { view: View; href: string; label: [string, string]; sub: [string, string] }[] = [
  { view: "overview", href: "/finance", label: ["ภาพรวม", "Overview"], sub: ["รายได้ · ค่าใช้จ่าย · เคสรายเดือน", "Revenue · expenses · monthly cases"] },
  { view: "costs", href: "/finance/costs", label: ["รายละเอียดต้นทุน", "Cost details"], sub: ["ต้นทุนต่อรอบ · ค่าใช้จ่ายประจำ · %", "Per-booking cost · fixed costs · %"] },
  { view: "target", href: "/finance/target", label: ["เป้ากำไร", "Profit target"], sub: ["ต้องขายกี่รอบ · จุดคุ้มทุน", "Bookings needed · break-even"] },
];
const TITLE: Record<View, [string, string, string, string]> = {
  overview: ["ภาพรวมการเงินและรายได้บริการ", "ทุนเริ่มต้น • รายได้แต่ละบริการ • ค่าใช้จ่าย • กำไรต่อเดือน", "Financial overview & service revenue", "Starting capital • revenue by service • expenses • monthly profit"],
  costs: ["รายละเอียดต้นทุน", "รู้ว่าเงินจ่ายให้ใคร และเกิดจากอะไร • ตัวอย่างประมาณการต่อเดือน", "Cost details", "Where the money goes and why • monthly estimate"],
  target: ["วางเป้ากำไรของคุณ", "เลือกบริการ แล้วดูว่าต้องขายกี่รอบต่อเดือน", "Set your profit target", "Pick a service and see how many bookings you need each month"],
};
const KIND: Record<ExpenseKind, [string, string]> = { fixed: ["บาท/เดือน", "THB / month"], pctRevenue: ["% ของรายได้บริษัท", "% of company revenue"], pctGross: ["% ของยอดลูกค้าจ่าย", "% of customer spend"] };
const uid = () => Math.random().toString(36).slice(2, 10);

export function FinanceApp({ view, initial, who }: { view: View; initial: FinancePlan; who: string }) {
  const [lang, setLang] = useState<Lang>("th");
  useEffect(() => { try { if (localStorage.getItem("fin-lang") === "en") setLang("en"); } catch { /* ไม่มี storage */ } }, []);
  const pickLang = (l: Lang) => { setLang(l); try { localStorage.setItem("fin-lang", l); } catch { /* ไม่มี storage */ } };
  const t = (th: string, en: string) => (lang === "en" ? en : th);

  const [plan, setPlan] = useState<FinancePlan>(initial);
  const [saved, setSaved] = useState<FinancePlan>(initial);
  const [month, setMonth] = useState(() => monthsOf(initial).find((m) => initial.months[m]) ?? "M1");
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
    const r = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, note: `แก้ไขหน้า${NAV.find((n) => n.view === view)?.label[0]}` }) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { ok?: boolean; plan?: FinancePlan; error?: string } | null;
    setBusy(false);
    if (d?.ok && d.plan) { setPlan(d.plan); setSaved(d.plan); setMsg({ ok: true, text: t("บันทึกแล้ว", "Saved") }); }
    else setMsg({ ok: false, text: d?.error ?? t("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง", "Could not save — please try again") });
  };
  const leave = (e: React.MouseEvent) => { if (dirty && !window.confirm(t("ยังไม่ได้บันทึก — ออกจากหน้านี้เลยไหม?", "You have unsaved changes — leave this page?"))) e.preventDefault(); };
  const last = saved.history[0];
  const T = TITLE[view];

  return (
    <LangCtx.Provider value={lang}>
      <div className="lg:flex" lang={lang}>
        <style>{CSS}</style>
        {/* เมนูซ้าย */}
        <nav aria-label={t("เมนูการเงิน", "Finance menu")} className="fin-side lg:w-[248px] shrink-0 lg:sticky lg:top-0 lg:h-dvh flex lg:flex-col gap-1 p-3 lg:p-5 overflow-x-auto no-scrollbar">
          <div className="hidden lg:flex items-center gap-3 pb-5">
            <span className="fin-logo">MB</span>
            <div className="leading-tight"><div className="text-[11px] tracking-[.12em] text-[var(--fm)]">MISTER</div><div className="text-[13px] font-bold tracking-[.06em]">BAMRUNGSUK</div></div>
          </div>
          {NAV.map((n) => (
            <Link key={n.view} href={n.href} onClick={leave} aria-current={n.view === view ? "page" : undefined} className={`fin-nav ${n.view === view ? "on" : ""}`}>
              <span className="block font-semibold text-[14.5px] whitespace-nowrap">{t(...n.label)}</span>
              <span className="hidden lg:block text-[12px] text-[var(--fm)]">{t(...n.sub)}</span>
            </Link>
          ))}
          <div className="hidden lg:block mt-auto pt-4 border-t border-[var(--fl)] text-[12px] text-[var(--fm)] leading-relaxed">
            <Link href="/admin" onClick={leave} className="font-semibold text-[var(--fp)]">{t("← กลับหลังบ้าน", "← Back to admin")}</Link>
            <p className="m-0 mt-2 break-all">{who}</p>
            {last && <p className="m-0 mt-1">{t("บันทึกล่าสุด", "Last saved")} {new Date(last.at).toLocaleString(lang === "th" ? "th-TH" : "en-GB", { dateStyle: "medium", timeStyle: "short" })} · {last.by}</p>}
          </div>
        </nav>

        <main className="flex-1 min-w-0 px-4 lg:px-8 py-4 lg:py-7 pb-28">
          <header className="flex flex-wrap items-start gap-x-3 gap-y-2 mb-4 sm:mb-5">
            <div className="flex-1 min-w-[240px]">
              <div className="text-[11.5px] font-semibold tracking-[.12em] text-[var(--fm)]">MISTER BAMRUNGSUK · {t("หลังบ้านการเงิน", "FINANCE BACK OFFICE")}</div>
              <h1 className="m-0 text-[24px] lg:text-[28px] font-bold leading-[1.35]">{lang === "en" ? T[2] : T[0]}</h1>
              <p className="m-0 text-[14px] text-[var(--fm)] hidden sm:block">{lang === "en" ? T[3] : T[1]}</p>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <div className="fin-seg sm" role="group" aria-label="Language">
                <button type="button" aria-pressed={lang === "th"} className={lang === "th" ? "on" : ""} onClick={() => pickLang("th")}>ไทย</button>
                <button type="button" aria-pressed={lang === "en"} className={lang === "en" ? "on" : ""} onClick={() => pickLang("en")}>EN</button>
              </div>
              <ExportBtn kind={view} file={`MB-finance-${view}-${month}`} ctx={{ plan, month, lang, dn: (n) => (lang === "en" ? NAME_EN[n] ?? n : n), sl: (s) => { const n = lang === "en" ? NAME_EN[s.name] ?? s.name : s.name; return s.level ? `${n} · ${s.level}` : n; } }} />
              <span className="fin-chip hidden sm:inline-block">{t("แผนจำลอง · ไม่กระทบเงินจริง", "Plan only · no real money moved")}</span>
            </div>
          </header>
          {view === "overview" && <Overview plan={plan} up={up} month={month} setMonth={setMonth} />}
          {view === "costs" && <Costs plan={plan} up={up} month={month} setMonth={setMonth} />}
          {view === "target" && <Target plan={plan} up={up} month={month} setMonth={setMonth} />}
        </main>

        {/* แถบบันทึก */}
        <div className="fin-savebar">
          <span className={`text-[13.5px] ${msg ? (msg.ok ? "text-[var(--fg)]" : "text-[var(--fr)]") : "text-[var(--fm)]"}`}>
            {msg?.text ?? (dirty ? t("มีการแก้ไขที่ยังไม่บันทึก", "You have unsaved changes") : t("ตัวเลขทั้งหมดบันทึกแล้ว", "All figures saved"))}
          </span>
          <span className="flex-1" />
          {dirty && <button type="button" className="fin-btn ghost" onClick={() => { setPlan(saved); setMsg(null); }}>{t("ยกเลิกที่แก้", "Discard")}</button>}
          <button type="button" className="fin-btn" disabled={!dirty || busy} onClick={save}>{busy ? t("กำลังบันทึก…", "Saving…") : t("บันทึก", "Save")}</button>
        </div>
      </div>
    </LangCtx.Provider>
  );
}

type P = { plan: FinancePlan; up: (p: Partial<FinancePlan>) => void; month: string; setMonth: (m: string) => void };

// ─── ช่องกรอก ───
function Num({ value, onChange, pct, w = "w-[120px]", label, blankZero }: { value: number; onChange: (n: number) => void; pct?: boolean; w?: string; label: string; blankZero?: boolean }) {
  const shown = pct ? Math.round(value * 10000) / 100 : value;
  const [txt, setTxt] = useState(String(shown));
  const [focus, setFocus] = useState(false);
  useEffect(() => { if (!focus) setTxt(String(shown)); }, [shown, focus]);
  return (
    <span className={`fin-in n ${w}`}>
      <input aria-label={label} inputMode="decimal" value={focus ? txt : pct ? String(shown) : blankZero && !value ? "" : fmt2(value)} placeholder={blankZero ? "–" : undefined}
        onFocus={() => { setFocus(true); setTxt(String(shown)); }} onBlur={() => setFocus(false)}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9.]/g, ""); setTxt(v);
          const n = Number(v); if (Number.isFinite(n)) onChange(pct ? n / 100 : n);
        }} />
      {pct && <span className="text-[var(--fm)]">%</span>}
    </span>
  );
}
function Txt({ value, onChange, label, w = "flex-1" }: { value: string; onChange: (s: string) => void; label: string; w?: string }) {
  return <span className={`fin-in ${w} min-w-0`}><input aria-label={label} value={value} maxLength={60} onChange={(e) => onChange(e.target.value)} /></span>;
}
function Del({ onClick, label }: { onClick: () => void; label: string }) {
  const { t } = useT();
  return <button type="button" onClick={onClick} aria-label={label} title={t("ลบ", "Delete")} className="fin-x">×</button>;
}
const Card = ({ n, title, tone = "violet", children, right }: { n?: number; title: string; tone?: "violet" | "blue" | "orange" | "green"; children: React.ReactNode; right?: React.ReactNode }) => (
  <section className={`fin-card t-${tone}`}>
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      {n && <span className="fin-num">{n}</span>}
      <h2 className="m-0 text-[16px] sm:text-[17px] font-bold flex-1 min-w-[11rem] leading-snug">{title}</h2>
      {right}
    </div>
    {children}
  </section>
);
function Kpi({ label, value, tone, sub }: { label: string; value: string; tone: string; sub?: string }) {
  const { t } = useT();
  return (
    <div className={`fin-kpi t-${tone}`}>
      <div className="text-[13.5px] font-semibold text-[var(--ft2)]">{label}</div>
      <div className="fin-kv">{value}</div>
      <div className="text-[12.5px] text-[var(--fm)] flex flex-wrap items-center gap-x-2 gap-y-1">{t("บาท", "THB")}{sub && <span className="fin-pill">{sub}</span>}</div>
    </div>
  );
}
function MonthPick({ month, setMonth, plan }: { month: string; setMonth: (m: string) => void; plan: FinancePlan }) {
  const { t, lang } = useT();
  return (
    <label className="fin-in w-auto gap-2">
      <span className="text-[12.5px] text-[var(--fm)] whitespace-nowrap">{t("เดือนที่ดู", "Month")}</span>
      <select value={month} onChange={(e) => setMonth(e.target.value)} className="font-semibold">
        {monthsOf(plan).map((m) => <option key={m} value={m}>{m} · {monthLabel(m, lang)}{plan.months[m] ? " ●" : ""}</option>)}
      </select>
    </label>
  );
}
function Shares({ plan, up }: { plan: FinancePlan; up: P["up"] }) {
  const { t } = useT();
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 items-center text-[13.5px]">
      <label className="flex items-center gap-2">{t("ส่วนแบ่งบริษัท", "Company share")} <Num label={t("ส่วนแบ่งบริษัท", "Company share")} pct w="w-[88px]" value={plan.companyShare} onChange={(v) => up({ companyShare: Math.min(1, v) })} /></label>
      <label className="flex items-center gap-2">{t("ค่าธรรมเนียมจากผู้ให้บริการ", "Provider fee")} <Num label={t("ค่าธรรมเนียมจากผู้ให้บริการ", "Provider fee")} pct w="w-[80px]" value={plan.providerFee} onChange={(v) => up({ providerFee: v })} /></label>
      <label className="flex items-center gap-2">{t("ค่าภาษี ภ.ง.ด.", "Withholding tax (PND)")} <Num label={t("ค่าภาษี ภ.ง.ด.", "Withholding tax (PND)")} pct w="w-[80px]" value={plan.pgFee} onChange={(v) => up({ pgFee: v })} /></label>
    </div>
  );
}
const Row = ({ l, r }: { l: React.ReactNode; r: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[var(--fl)] text-[14px]"><span className="min-w-0">{l}</span><span className="tabular-nums shrink-0 text-right">{r}</span></div>
);
function Items({ items, onChange, addLabel, zeroChip }: { items: FinItem[]; onChange: (v: FinItem[]) => void; addLabel: string; zeroChip?: boolean }) {
  const { t, lang } = useT();
  const dn = useName();
  return (
    <>
      {items.map((it, i) => (
        <div key={it.id} className="flex items-center gap-2 py-1.5 border-b border-[var(--fl)]">
          {/* ภาษาอังกฤษ: แสดงชื่อแปลของค่าเริ่มต้น แก้ชื่อได้ในโหมดไทย */}
          {lang === "en" && NAME_EN[it.name]
            ? <span className="flex-1 min-w-0 text-[14px] px-1">{dn(it.name)}</span>
            : <Txt label={t("ชื่อรายการ", "Item name")} value={it.name} onChange={(name) => onChange(items.map((x, k) => (k === i ? { ...x, name } : x)))} />}
          {zeroChip && !it.amount && <span className="hidden sm:inline"><span className="fin-pill warn">{t("ยังไม่ใส่งบ", "No budget yet")}</span></span>}
          <Num label={`${t("จำนวนเงิน", "Amount")} ${dn(it.name)}`} w="w-[104px]" value={it.amount} onChange={(amount) => onChange(items.map((x, k) => (k === i ? { ...x, amount } : x)))} />
          <Del label={`${t("ลบ", "Delete")} ${dn(it.name)}`} onClick={() => onChange(items.filter((_, k) => k !== i))} />
        </div>
      ))}
      <button type="button" className="fin-add" onClick={() => onChange([...items, { id: uid(), name: t("รายการใหม่", "New item"), amount: 0 }])}>{addLabel}</button>
    </>
  );
}

// ─── หน้า 8: ภาพรวม ───
function Overview({ plan, up, month, setMonth }: P) {
  const { t, lang } = useT();
  const dn = useName();
  const svcLabel = useSvcLabel();
  const m = monthSummary(plan, month);
  const startupSum = plan.startup.reduce((s, i) => s + i.amount, 0);
  const setRounds = (mo: string, sid: string, n: number) => up({ months: { ...plan.months, [mo]: { ...(plan.months[mo] ?? {}), [sid]: Math.max(0, Math.round(n)) } } });
  const setSvc = (i: number, patch: Partial<FinService>) => up({ services: plan.services.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
  const ML = monthsOf(plan);
  const prev = ML[ML.indexOf(month) - 1];
  const ml = `${month} · ${monthLabel(month, lang)}`;
  const lineName = (l: (typeof m.lines)[number]) => (l.id === "_pg" ? t(`ค่าภาษี ภ.ง.ด. ${fmtPct(plan.pgFee)} ของยอดลูกค้า`, `Withholding tax (PND) ${fmtPct(plan.pgFee)} of customer spend`) : dn(l.name));
  return (
    <div className="flex flex-col gap-4">
      <div className="fin-bar">
        <MonthPick month={month} setMonth={setMonth} plan={plan} />
        <span className="text-[13.5px]">{t("จำนวนบริการ", "Bookings")} <b className="tabular-nums">{fmt(m.totalRounds)}</b> {t("รอบ", "")}</span>
        {prev && plan.months[prev] && <button type="button" className="fin-btn ghost sm" onClick={() => up({ months: { ...plan.months, [month]: { ...plan.months[prev] } } })}>{t("คัดลอกเคสจาก", "Copy cases from")} {prev} · {monthLabel(prev, lang)}</button>}
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
        <Kpi tone="violet" label={t("ทุนเริ่มต้น", "Starting capital")} value={fmt(plan.capital)} />
        <Kpi tone="violet" label={t("รายได้บริษัท / เดือน", "Company revenue / month")} value={fmt(m.revenue)} />
        <Kpi tone="orange" label={t("ค่าใช้จ่าย / เดือน", "Expenses / month")} value={fmt(m.expenses)} />
        <Kpi tone={m.profit >= 0 ? "green" : "red"} label={t("กำไรก่อนภาษี / เดือน", "Profit before tax / month")} value={fmt(m.profit)} sub={m.revenue ? t(`${fmtPct(m.margin)} ของรายได้บริษัท`, `${fmtPct(m.margin)} of company revenue`) : undefined} />
      </div>

      <div className="grid xl:grid-cols-[1.1fr_1.45fr_1fr] gap-4 items-start">
        <Card n={1} title={t("เงินทุนใช้กับอะไร?", "What is the capital used for?")}>
          <Row l={t("ทุนตั้งต้น", "Starting capital")} r={<Num label={t("ทุนตั้งต้น", "Starting capital")} value={plan.capital} onChange={(v) => up({ capital: v })} />} />
          <Items items={plan.startup} onChange={(startup) => up({ startup })} addLabel={t("+ เพิ่มรายการเงินทุน", "+ Add capital item")} />
          <div className="fin-total"><span>{t("งบเริ่มต้นรวม", "Total start-up budget")}</span><b>{fmt(startupSum)}</b></div>
          <div className="fin-hero t-blue mt-3">
            <div className="text-[14px] font-semibold">{t("เหลือสำหรับดำเนินงาน", "Left for operations")}</div>
            <div className="text-[28px] font-bold text-[var(--fb)] tabular-nums">{fmt(plan.capital - startupSum)} <span className="text-[15px]">{t("บาท", "THB")}</span></div>
          </div>
          <p className="fin-note">{t("ยอดหลังหักงบเริ่มต้น ไม่ใช่เงินปลายเดือน", "After start-up costs — not the month-end balance")}</p>
        </Card>

        <Card n={2} title={t("รายได้มาจากไหน?", "Where does revenue come from?")} tone="blue">
          <div className="sm:hidden flex flex-col">
            {m.rows.map(({ s, gross, rounds }, i) => (
              <div key={s.id} className="fin-tile py-2.5 border-b border-[var(--fl)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[14.5px]">{dn(s.name)} {s.level && <span className={`fin-lv ${/top/i.test(s.level) ? "top" : ""}`}>{s.level}</span>}</span>
                  <b className="tabular-nums text-[15px]">{fmt(gross)}</b>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[12.5px] text-[var(--fm)]">
                  <Num label={`${t("ราคา", "Price")} ${svcLabel(s)}`} w="w-[96px]" value={s.price} onChange={(price) => setSvc(i, { price })} />
                  <span>×</span>
                  <Num label={`${t("รอบ", "Bookings")} ${svcLabel(s)}`} w="w-[72px]" value={rounds} onChange={(n) => setRounds(month, s.id, n)} />
                  <span>{t("รอบ", "bookings")}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden sm:block overflow-x-auto -mx-1 px-1">
            <table className="fin-t">
              <thead><tr><th>{t("บริการ", "Service")}</th><th className="r">{t("ราคา (บาท)", "Price (THB)")}</th><th className="r">{t("รอบ", "Bookings")} ({month})</th><th className="r">{t("ยอดลูกค้าจ่าย", "Customer spend")}</th></tr></thead>
              <tbody>
                {m.rows.map(({ s, gross, rounds }, i) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap">{dn(s.name)} {s.level && <span className={`fin-lv ${/top/i.test(s.level) ? "top" : ""}`}>{s.level}</span>}</td>
                    <td className="r"><Num label={`${t("ราคา", "Price")} ${svcLabel(s)}`} w="w-[86px]" value={s.price} onChange={(price) => setSvc(i, { price })} /></td>
                    <td className="r"><Num label={`${t("รอบ", "Bookings")} ${svcLabel(s)}`} w="w-[62px]" value={rounds} onChange={(n) => setRounds(month, s.id, n)} /></td>
                    <td className="r tabular-nums">{fmt(gross)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/finance/costs#services" className="fin-add inline-block">{t("+ เพิ่ม/แก้ชื่อบริการ", "+ Add / rename services")}</Link>
          <div className="fin-total t-blue"><span>{t("ยอดลูกค้าจ่ายรวม", "Total customer spend")}</span><b>{fmt(m.gross)} {t("บาท", "THB")}</b></div>
          <Row l={`${t("ส่วนแบ่งบริษัท", "Company share")} ${fmtPct(plan.companyShare)}`} r={fmt(m.company, 2)} />
          <Row l={`${t("ค่าธรรมเนียมผู้ให้บริการ", "Provider fee")} ${fmtPct(plan.providerFee)}`} r={`+${fmt(m.fee, 2)}`} />
          <div className="fin-total t-violet"><span>{t("รายได้บริษัท", "Company revenue")}</span><b>{fmt(m.revenue, 2)} {t("บาท", "THB")}</b></div>
          <div className="mt-3"><Shares plan={plan} up={up} /></div>
        </Card>

        <Card n={3} title={t("ค่าใช้จ่ายรายเดือน", "Monthly expenses")} tone="orange" right={<Link href="/finance/costs" className="text-[12.5px] font-semibold text-[var(--fp)]">{t("แก้ไข →", "Edit →")}</Link>}>
          <div className="flex justify-between text-[12.5px] font-semibold text-[var(--fm)] pb-1"><span>{t("รายการ", "Item")}</span><span>{t("จำนวนเงิน (บาท)", "Amount (THB)")}</span></div>
          {m.lines.map((l) => <Row key={l.id} l={<>{lineName(l)}{l.kind === "pctRevenue" && ` (${fmtPct(l.value)} ${t("ของรายได้", "of revenue")})`}{l.noncash && <span className="fin-pill ml-1">{t("ไม่ใช่เงินสด", "non-cash")}</span>}</>} r={fmt(l.amount, 2)} />)}
          <div className="fin-total t-orange"><span>{t("รวม", "Total")}</span><b>{fmt(m.expenses, 2)} {t("บาท", "THB")}</b></div>
          {plan.pending.every((i) => !i.amount) && <p className="fin-warn">{t("ยังไม่รวมรีครูท โบนัส ภาษี และรายการรอตั้งงบ", "Excludes recruit fees, bonuses, tax and items still to be budgeted")}</p>}
        </Card>
      </div>

      <section className="fin-card t-green">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
          <h2 className="m-0 text-[17px] sm:text-[18px] font-bold min-w-[140px]">{t(`สรุป ${ml} เหลือเท่าไร?`, `${ml}: what is left?`)}</h2>
          
          <div className="fin-eq t-violet"><span>{t("รายได้บริษัท", "Company revenue")}</span><b>{fmt(m.revenue)}</b></div>
          <span className="text-[20px] sm:text-[24px] font-bold text-[var(--fm)] text-center leading-none">−</span>
          <div className="fin-eq t-orange"><span>{t("ค่าใช้จ่ายรวม", "Total expenses")}</span><b>{fmt(m.expenses)}</b></div>
          <span className="text-[20px] sm:text-[24px] font-bold text-[var(--fm)] text-center leading-none">=</span>
          <div className={`fin-eq ${m.profit >= 0 ? "t-green" : "t-red"}`}><span>{t("กำไรก่อนภาษี", "Profit before tax")}</span><b>{fmt(m.profit)} {t("บาท", "THB")}</b></div>
        </div>
        <p className="m-0 mt-3 text-[13.5px] text-center">{t("เงินสดจากการดำเนินงานโดยประมาณ", "Estimated operating cash flow")} <b className="tabular-nums">{fmt(m.cash, 2)} {t("บาท", "THB")}</b> • {t("ก่อนเงินลงทุนและการเปลี่ยนแปลง Wallet", "before investment and Wallet movements")}</p>
      </section>

      <CasesGrid plan={plan} up={up} month={month} setMonth={setMonth} />
      <p className="fin-note">{t(
        `สมมติฐาน: บริษัท ${fmtPct(plan.companyShare)} ทุกรอบ • ค่าธรรมเนียม ${fmtPct(plan.providerFee)} ของส่วนแบ่งผู้ให้บริการ • ค่าภาษี ภ.ง.ด. ${fmtPct(plan.pgFee)} ของยอดลูกค้า • ไม่รวมภาษีเงินได้นิติบุคคล`,
        `Assumptions: company keeps ${fmtPct(plan.companyShare)} of every booking • ${fmtPct(plan.providerFee)} fee on the provider share • ${fmtPct(plan.pgFee)} PND withholding tax on customer spend • excludes corporate income tax`)}</p>
    </div>
  );
}

// ─── หน้า 9: รายละเอียดต้นทุน ───
function Costs({ plan, up, month, setMonth }: P) {
  const { t, lang } = useT();
  const dn = useName();
  const svcLabel = useSvcLabel();
  const m = monthSummary(plan, month);
  const [sid, setSid] = useState(plan.services[0]?.id);
  const svc = plan.services.find((s) => s.id === sid) ?? plan.services[0];
  const r = perRound(plan, svc?.price ?? 0);
  const fixed = fixedTotal(plan, true) - plan.pending.reduce((s, i) => s + i.amount, 0);
  const setExp = (i: number, patch: Partial<FinExpense>) => up({ expenses: plan.expenses.map((e, k) => (k === i ? { ...e, ...patch } : e)) });
  const baht = t("บาท", "THB");
  return (
    <div className="flex flex-col gap-4">
      <div className="fin-bar">
        <MonthPick month={month} setMonth={setMonth} plan={plan} />
        <span className="text-[13.5px]">{fmt(m.totalRounds)} {t("รอบ", "bookings")} · {t("ยอดลูกค้าจ่าย", "customer spend")} <b className="tabular-nums text-[var(--fb)]">{fmt(m.gross)} {baht}</b></span>
        <span className="flex-1" />
        <Shares plan={plan} up={up} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <Kpi tone="blue" label={t("จ่ายผู้ให้บริการ", "Paid to providers")} value={fmt(m.provider)} sub={`${t("ส่วนแบ่ง", "share")} ${fmtPct(1 - plan.companyShare)}`} />
        <Kpi tone="orange" label={t("ต้นทุนผันแปรบริษัท", "Company variable cost")} value={fmt(m.variable)} sub={t("ค่าภาษี ภ.ง.ด. + ค่าใช้จ่ายแบบ %", "PND tax + % costs")} />
        <Kpi tone="orange" label={t("ค่าใช้จ่ายประจำ (เงินสด)", "Fixed costs (cash)")} value={fmt(fixed)} sub={t("ต่อเดือน", "per month")} />
      </div>

      <div className="grid xl:grid-cols-[1fr_1.15fr] gap-4 items-start">
        <Card title={t("ต้นทุนต่อบริการ 1 รอบ", "Cost per booking")}>
          <select value={svc?.id} onChange={(e) => setSid(e.target.value)} className="fin-sel mb-2" aria-label={t("เลือกบริการ", "Choose service")}>
            {plan.services.map((s) => <option key={s.id} value={s.id}>{svcLabel(s)} • {fmt(s.price)} {baht}</option>)}
          </select>
          <Row l={<><i className="dot" style={{ background: "#2563eb" }} />{t("ราคาที่ลูกค้าจ่าย", "Customer price")}</>} r={fmt(r.price, 2)} />
          <Row l={<><i className="dot" style={{ background: "#64748b" }} />{t("ส่วนแบ่งผู้ให้บริการ", "Provider share")} {fmtPct(1 - plan.companyShare)}</>} r={fmt(r.provider, 2)} />
          <Row l={<><i className="dot" style={{ background: "#0d9488" }} />{t("ส่วนแบ่งบริษัท", "Company share")} {fmtPct(plan.companyShare)}</>} r={fmt(r.company, 2)} />
          <Row l={<><i className="dot" style={{ background: "#7c3aed" }} />{t("ค่าธรรมเนียมจากผู้ให้บริการ", "Fee from provider")} {fmtPct(plan.providerFee)}</>} r={<span className="text-[var(--fp)]">+{fmt(r.fee, 2)}</span>} />
          <Row l={<><i className="dot" style={{ background: "#ea580c" }} />{t(`ค่าภาษี ภ.ง.ด. ${fmtPct(plan.pgFee)} ของยอดลูกค้า`, `Withholding tax (PND) ${fmtPct(plan.pgFee)} of customer price`)}</>} r={<span className="text-[var(--fo)]">−{fmt(r.pg, 2)}</span>} />
          {r.pctCost > 0 && <Row l={<><i className="dot" style={{ background: "#ea580c" }} />{t("ค่าใช้จ่ายแบบ % (เช่น การตลาด)", "% based costs (e.g. marketing)")}</>} r={<span className="text-[var(--fo)]">−{fmt(r.pctCost, 2)}</span>} />}
          <div className="fin-total t-green"><span>{t("เหลือก่อนค่าใช้จ่ายประจำ", "Left before fixed costs")}</span><b>{fmt(r.net, 2)} {baht}</b></div>
          <p className="fin-note">{t(`ผู้ให้บริการรับสุทธิ ${fmt(r.providerNet, 2)} บาท/รอบ (หลังหักค่าธรรมเนียม)`, `Provider nets ${fmt(r.providerNet, 2)} THB per booking (after fee)`)}</p>
        </Card>

        <Card title={t("ค่าใช้จ่ายประจำ / เดือน", "Fixed costs / month")} tone="orange">
          <div className="hidden sm:flex text-[12.5px] font-semibold text-[var(--fm)] pb-1 gap-2"><span className="flex-1">{t("รายการ", "Item")}</span><span className="w-[150px]">{t("คิดแบบ", "Basis")}</span><span className="w-[120px] text-right">{t("งบประมาณ", "Budget")}</span><span className="w-7" /></div>
          {plan.expenses.map((e, i) => (
            <div key={e.id} className="fin-tile py-1.5 border-b border-[var(--fl)]">
              <div className="grid grid-cols-[1fr_auto_auto] sm:flex sm:flex-nowrap items-center gap-2">
                {lang === "en" && NAME_EN[e.name]
                  ? <span className="col-span-3 sm:flex-1 min-w-0 text-[14px] px-1 font-semibold sm:font-normal">{dn(e.name)}</span>
                  : <Txt label={t("ชื่อค่าใช้จ่าย", "Expense name")} w="col-span-3 sm:col-span-1 sm:flex-1" value={e.name} onChange={(name) => setExp(i, { name })} />}
                <select aria-label={`${t("คิดแบบ", "Basis")} ${dn(e.name)}`} className="fin-sel w-full sm:w-[150px] min-w-0" value={e.kind} onChange={(ev) => { const kind = ev.target.value as ExpenseKind; setExp(i, { kind, value: kind === "fixed" ? 0 : 0.1 }); }}>
                  {(Object.keys(KIND) as ExpenseKind[]).map((k) => <option key={k} value={k}>{t(...KIND[k])}</option>)}
                </select>
                <Num label={`${t("งบ", "Budget")} ${dn(e.name)}`} pct={e.kind !== "fixed"} value={e.value} onChange={(value) => setExp(i, { value })} />
                <Del label={`${t("ลบ", "Delete")} ${dn(e.name)}`} onClick={() => up({ expenses: plan.expenses.filter((_, k) => k !== i) })} />
              </div>
              {e.kind === "fixed" && (
                <label data-noexport={!e.noncash || undefined} className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--fm)] pl-1">
                  <input type="checkbox" checked={!!e.noncash} onChange={(ev) => setExp(i, { noncash: ev.target.checked || undefined })} /> <span className="sm:hidden">{t("ไม่ใช่เงินสด", "Non-cash")}</span><span className="hidden sm:inline">{t("ไม่ใช่เงินสด (ตัดจำหน่าย — นับในกำไร แต่ไม่นับในเป้ารอบขาย)", "Non-cash (amortisation — counted in profit, not in the bookings target)")}</span>
                </label>
              )}
            </div>
          ))}
          <button type="button" className="fin-add" onClick={() => up({ expenses: [...plan.expenses, { id: uid(), name: t("ค่าใช้จ่ายใหม่", "New expense"), kind: "fixed", value: 0 }] })}>{t("+ เพิ่มค่าใช้จ่าย", "+ Add expense")}</button>
          <div className="fin-total t-orange"><span>{t("รวม (บาท/เดือน)", "Total (THB / month)")}</span><b>{fmt(plan.expenses.filter((e) => e.kind === "fixed").reduce((s, e) => s + e.value, 0))} {baht}</b></div>
          <p className="fin-note">{t(`เป็นเงินสด ${fmt(fixed)} บาท/เดือน (ใช้ในหน้าเป้ากำไร) · ค่าใช้จ่ายแบบ % คิดตามยอดของเดือนที่ดู`, `Cash portion ${fmt(fixed)} THB / month (used on the profit-target page) · % costs follow the selected month`)}</p>
        </Card>
      </div>

      <div id="services" className="scroll-mt-20">
        <Card title={t("บริการและราคา (ค่าบริการ 3 ชั่วโมง)", "Services & prices (3-hour booking)")} tone="blue">
          {/* มือถือ: การ์ดรายบริการ */}
          <div className="sm:hidden flex flex-col">
            {plan.services.map((s, i) => {
              const pr = perRound(plan, s.price);
              const setSvc = (patch: Partial<FinService>) => up({ services: plan.services.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
              return (
                <div key={s.id} className="fin-tile py-3 border-b border-[var(--fl)] flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {lang === "en" && NAME_EN[s.name]
                      ? <span className="flex-1 min-w-0 font-semibold text-[14.5px]">{dn(s.name)}</span>
                      : <Txt label={t("ชื่อบริการ", "Service name")} value={s.name} onChange={(name) => setSvc({ name })} />}
                    <Txt label={t("ระดับ", "Level")} w="w-[86px] flex-none" value={s.level} onChange={(level) => setSvc({ level })} />
                    {plan.services.length > 1 && <Del label={`${t("ลบ", "Delete")} ${svcLabel(s)}`} onClick={() => up({ services: plan.services.filter((x) => x.id !== s.id) })} />}
                  </div>
                  <div className="flex items-center gap-3 text-[12.5px]">
                    <span className="text-[var(--fm)]">{t("ราคา", "Price")}</span>
                    <Num label={`${t("ราคา", "Price")} ${svcLabel(s)}`} w="w-[104px]" value={s.price} onChange={(price) => setSvc({ price })} />
                    <span className="ml-auto text-right leading-tight"><span className="text-[var(--fm)]">{t("บริษัทเหลือ", "Company net")}</span><br /><b className="text-[var(--fg)] text-[15px] tabular-nums">{fmt(pr.net, 2)}</b></span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="fin-t">
              <thead><tr><th>{t("ชื่อบริการ", "Service name")}</th><th>{t("ระดับ", "Level")}</th><th className="r">{t("ราคา (บาท)", "Price (THB)")}</th><th className="r">{t("บริษัทเหลือ/รอบ", "Company net / booking")}</th><th className="r">{t("ผู้ให้บริการรับสุทธิ", "Provider net")}</th><th /></tr></thead>
              <tbody>
                {plan.services.map((s, i) => {
                  const pr = perRound(plan, s.price);
                  const setSvc = (patch: Partial<FinService>) => up({ services: plan.services.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
                  return (
                    <tr key={s.id}>
                      <td>{lang === "en" && NAME_EN[s.name]
                        ? <span className="text-[14px] whitespace-nowrap">{dn(s.name)}</span>
                        : <Txt label={t("ชื่อบริการ", "Service name")} w="w-full min-w-[160px]" value={s.name} onChange={(name) => setSvc({ name })} />}</td>
                      <td><Txt label={t("ระดับ", "Level")} w="w-[100px]" value={s.level} onChange={(level) => setSvc({ level })} /></td>
                      <td className="r"><Num label={`${t("ราคา", "Price")} ${svcLabel(s)}`} w="w-[110px]" value={s.price} onChange={(price) => setSvc({ price })} /></td>
                      <td className="r tabular-nums text-[var(--fg)] font-semibold">{fmt(pr.net, 2)}</td>
                      <td className="r tabular-nums">{fmt(pr.providerNet, 2)}</td>
                      <td>{plan.services.length > 1 && <Del label={`${t("ลบ", "Delete")} ${svcLabel(s)}`} onClick={() => up({ services: plan.services.filter((x) => x.id !== s.id) })} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" className="fin-add" onClick={() => up({ services: [...plan.services, { id: uid(), name: t("บริการใหม่", "New service"), level: "", price: 0 }] })}>{t("+ เพิ่มบริการ", "+ Add service")}</button>
          {lang === "en" && <p className="fin-note">Default names are shown translated; switch to ไทย to rename them.</p>}
        </Card>
      </div>

      <div className="grid xl:grid-cols-2 gap-4 items-start">
        <Card title={t("รายการที่ต้องตั้งงบเพิ่ม (ต่อเดือน)", "Items still to budget (per month)")}>
          <Items items={plan.pending} onChange={(pending) => up({ pending })} addLabel={t("+ เพิ่มรายการ", "+ Add item")} zeroChip />
          {plan.pending.some((i) => !i.amount) && <p className="fin-warn">{t("รายการที่ยังเป็น 0 ยังไม่ถูกหักในกำไร", "Items left at 0 are not deducted from profit")}</p>}
        </Card>
        <Card title={t("เงินลงทุนและรายการแยกติดตาม", "Investment & tracked items")} tone="blue">
          <Row l={t("ทุนตั้งต้น", "Starting capital")} r={<Num label={t("ทุนตั้งต้น", "Starting capital")} value={plan.capital} onChange={(v) => up({ capital: v })} />} />
          <Items items={plan.startup} onChange={(startup) => up({ startup })} addLabel={t("+ เพิ่มรายการเงินลงทุน", "+ Add investment item")} />
          <div className="fin-total t-blue"><span>{t("เหลือสำหรับดำเนินงาน", "Left for operations")}</span><b>{fmt(plan.capital - plan.startup.reduce((s, i) => s + i.amount, 0))} {baht}</b></div>
        </Card>
      </div>
      <p className="fin-note">{t("ส่วนแบ่งคำนวณจากรายได้ผู้ให้บริการ • เงินประกันที่คืนได้แยกจากรายได้ • ตัวเลขจำลอง ยังไม่รวมภาษี", "Shares are calculated on provider revenue • refundable deposits are kept out of revenue • plan figures, before tax")}</p>
    </div>
  );
}

// ─── ตารางกรอกเคสรายเดือน (ใช้ทั้งหน้าภาพรวมและหน้าเป้ากำไร) · เพิ่ม/ลดจำนวนเดือนได้ ───
function CasesGrid({ plan, up, month, setMonth }: P) {
  const { t, lang } = useT();
  const svcLabel = useSvcLabel();
  const ML = monthsOf(plan);
  const n = ML.length, last = ML[n - 1];
  const setRounds = (mo: string, sid: string, v: number) => up({ months: { ...plan.months, [mo]: { ...(plan.months[mo] ?? {}), [sid]: Math.max(0, Math.round(v)) } } });
  const setCount = (c: number) => {
    const next = Math.min(MAX_MONTHS, Math.max(1, c));
    up({ monthCount: next });
    if (Number(month.slice(1)) > next) setMonth(`M${next}`);
  };
  const lastHasData = !!plan.months[last] || plan.cashTargets?.[last] != null;
  return (
    <Card title={t(`กรอกเคสรายเดือน (M1 ${monthLabel("M1", lang)} – ${last} ${monthLabel(last, lang)})`, `Monthly cases (M1 ${monthLabel("M1", lang)} – ${last} ${monthLabel(last, lang)})`)} tone="blue"
      right={
        <span className="flex items-center gap-2 text-[13px]">
          <span className="text-[var(--fm)]">{t(`${n} เดือน`, `${n} months`)}</span>
          <button type="button" className="fin-btn ghost sm" disabled={n <= 1} onClick={() => { if (!lastHasData || window.confirm(t(`${last} มีข้อมูลอยู่ — ลบเดือนนี้ออกจากแผน?`, `${last} has data — remove it from the plan?`))) setCount(n - 1); }}>{t("− ลดเดือน", "− Remove month")}</button>
          <button type="button" className="fin-btn ghost sm" disabled={n >= MAX_MONTHS} onClick={() => setCount(n + 1)}>{t("+ เพิ่มเดือน", "+ Add month")}</button>
        </span>
      }>
      <p className="fin-note -mt-1 mb-2">{t("จำนวนรอบที่ขายได้/คาดว่าจะขายต่อเดือน แยกตามบริการ — แตะชื่อเดือนเพื่อเลือกเดือน", "Bookings sold / expected per month by service — tap a month to select it")}</p>
      <div className="overflow-x-auto">
        <table className="fin-t grid18">
          <thead>
            <tr><th className="sticky left-0 bg-[var(--fc)] z-[1]">{t("บริการ", "Service")}</th>{ML.map((mo) => (
              <th key={mo} className="r">
                <button type="button" onClick={() => setMonth(mo)} className={`fin-mo ${mo === month ? "on" : ""}`}>{mo}<span className="block text-[10.5px] font-medium opacity-80">{monthLabel(mo, lang)}</span></button>
              </th>
            ))}</tr>
          </thead>
          <tbody>
            {plan.services.map((s) => (
              <tr key={s.id}>
                <td className="sticky left-0 bg-[var(--fc)] z-[1] text-[12px] sm:text-[13px] leading-tight min-w-[100px] max-w-[118px] sm:max-w-none sm:whitespace-nowrap">{svcLabel(s)}</td>
                {ML.map((mo) => <td key={mo} className="r"><Num label={`${svcLabel(s)} ${mo}`} w="w-[64px]" value={plan.months[mo]?.[s.id] ?? 0} onChange={(v) => setRounds(mo, s.id, v)} blankZero /></td>)}
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="sticky left-0 bg-[var(--fc)] z-[1]">{t("กำไร/เดือน", "Profit / month")}</td>
              {ML.map((mo) => { const p = plan.months[mo] ? monthSummary(plan, mo).profit : null; return <td key={mo} className={`r text-[12.5px] tabular-nums ${p == null ? "text-[var(--fm)]" : p >= 0 ? "text-[var(--fg)]" : "text-[var(--fr)]"}`}>{p == null ? "—" : fmt(p / 1000, 0) + "K"}</td>; })}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── กราฟแท่ง: กำไรเงินสดแต่ละเดือน (สี) เทียบ For Cash (แท่งเทา) · แก้ For Cash รายเดือนได้ใต้กราฟ ───
const COL = 80, LAB = 92;
function ProfitChart({ plan, up, month, setMonth }: P) {
  const { t, lang } = useT();
  const ML = monthsOf(plan);
  const data = ML.map((m) => ({ m, v: plan.months[m] ? monthSummary(plan, m).cash : null, g: cashTargetOf(plan, m) }));
  const vals = data.filter((d): d is { m: string; v: number; g: number } => d.v != null);
  const max = Math.max(1, ...data.map((d) => d.g), ...vals.map((d) => d.v));
  const min = Math.min(0, ...vals.map((d) => d.v), ...data.map((d) => d.g));
  const W = ML.length * COL, H = 160, top = 18, bot = 16;
  const ih = H - top - bot, bw = 22;
  const y = (v: number) => top + ((max - v) / (max - min || 1)) * ih;
  const hit = vals.filter((d) => d.v >= d.g).length;
  const k = (v: number) => (Math.abs(v) >= 1e6 ? `${fmt(v / 1e6, 2)}M` : `${fmt(v / 1000, 0)}K`);
  const tone = (v: number, g: number) => (v >= g ? "var(--fg)" : v >= 0 ? "#e0a100" : "var(--fr)");
  const setGoal = (m: string, v: number) => up({ cashTargets: { ...(plan.cashTargets ?? {}), [m]: v } });
  const custom = Object.keys(plan.cashTargets ?? {}).length;
  return (
    <section className="fin-card t-violet !py-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-1">
        <h2 className="m-0 text-[15.5px] font-bold">{t("กำไรรายเดือนเทียบ For Cash", "Monthly profit vs For Cash")}</h2>
        <span className="hidden sm:inline text-[12.5px] text-[var(--fm)]">{t("จากเคสที่กรอก · กำไรเงินสดก่อนภาษี · แก้ For Cash แต่ละเดือนได้ใต้กราฟ", "From entered cases · cash profit before tax · edit For Cash per month below the chart")}</span>
        <span className="flex-1" />
        <span className="text-[12.5px] font-semibold">{vals.length ? t(`For Cash ${hit}/${vals.length} เดือน`, `For Cash ${hit}/${vals.length} months`) : t("ยังไม่มีเคส — กรอกในตารางด้านล่าง", "No cases yet — fill in the table below")}</span>
        </div>
      <div className="flex flex-wrap gap-3 text-[11.5px] text-[var(--fm)] mb-2">
        <span><i className="dot" style={{ background: "var(--fg)" }} />{t("ถึง For Cash", "Reached For Cash")}</span>
        <span><i className="dot" style={{ background: "#c9c4d3" }} />For Cash</span>
        <span><i className="dot" style={{ background: "#e0a100" }} />{t("มีกำไร ยังไม่ถึง", "Profit, below For Cash")}</span>
        <span><i className="dot" style={{ background: "var(--fr)" }} />{t("ขาดทุน", "Loss")}</span>
        {custom > 0 && <button type="button" data-noexport className="underline text-[var(--fp)]" onClick={() => up({ cashTargets: {} })}>{t(`ใช้ For Cash ${k(plan.target.profit)} ทุกเดือน`, `Use ${k(plan.target.profit)} For Cash for every month`)}</button>}
      </div>
      <div className="overflow-x-auto">
        <div style={{ width: LAB + W }}>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ marginLeft: LAB, display: "block" }} role="img" aria-label={t("กราฟกำไรรายเดือนเทียบ For Cash", "Monthly profit vs For Cash chart")}>
            <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="#cfc6e4" />
            {data.map((d, i) => {
              const cx = i * COL + COL / 2, on = d.m === month;
              return (
                <g key={d.m} onClick={() => setMonth(d.m)} style={{ cursor: "pointer" }}>
                  <title>{`${d.m} · ${monthLabel(d.m, lang)} — For Cash ${fmt(d.g)} · ${t("กำไร", "profit")} ${d.v == null ? t("ยังไม่กรอก", "no cases") : fmt(d.v)}`}</title>
                  <rect x={i * COL + 2} y={top - 14} width={COL - 4} height={ih + 14} fill={on ? "#efe8fd" : "transparent"} rx={6} />
                  <rect x={cx - bw - 1} y={Math.min(y(d.g), y(0))} width={bw} height={Math.max(2, Math.abs(y(d.g) - y(0)))} rx={4} fill="#c9c4d3" />
                  {d.v == null
                    ? <rect x={cx + 1} y={y(0) - 3} width={bw} height={3} rx={1.5} fill="#e4def0" />
                    : <rect x={cx + 1} y={Math.min(y(d.v), y(0))} width={bw} height={Math.max(2, Math.abs(y(d.v) - y(0)))} rx={4} fill={tone(d.v, d.g)} />}
                  {d.v != null && <text x={cx + 1 + bw / 2} y={d.v >= 0 ? y(d.v) - 4 : y(d.v) + 12} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--ft2)">{k(d.v)}</text>}
                </g>
              );
            })}
          </svg>
          <div className="grid items-center text-[12px]" style={{ gridTemplateColumns: `${LAB}px repeat(${ML.length}, ${COL}px)` }}>
            <span />
            {ML.map((m) => <button key={m} type="button" onClick={() => setMonth(m)} className={`text-center py-1 ${m === month ? "font-bold text-[var(--fp)]" : "text-[var(--fm)]"}`}>{monthLabel(m, lang)}</button>)}
            <span className="font-semibold text-[var(--ft2)]">For Cash</span>
            {ML.map((m) => <span key={m} className="px-[3px]"><Num label={`For Cash ${m}`} w="w-full !px-1.5 !h-8 text-[12.5px]" value={cashTargetOf(plan, m)} onChange={(v) => setGoal(m, v)} /></span>)}
            <span className="font-semibold text-[var(--ft2)] pt-1">{t("ส่วนต่าง", "Gap")}</span>
            {data.map((d) => <span key={d.m} className={`text-center tabular-nums pt-1 ${d.v == null ? "text-[var(--fm)]" : d.v >= d.g ? "text-[var(--fg)]" : "text-[var(--fr)]"}`}>{d.v == null ? "—" : `${d.v >= d.g ? "+" : ""}${k(d.v - d.g)}`}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── หน้า 10: เป้ากำไร ───
function Target({ plan, up, month, setMonth }: P) {
  const { t, lang } = useT();
  const svcLabel = useSvcLabel();
  const [multi, setMulti] = useState(false);
  const [how, setHow] = useState(false);
  const svc = plan.services.find((s) => s.id === plan.target.serviceId) ?? plan.services[0];
  const setT = (patch: Partial<FinancePlan["target"]>) => up({ target: { ...plan.target, ...patch } });
  const single = targetFor(plan, svc.price);
  const mix = targetMix(plan, month);
  const tg = multi ? mix : single;
  const baht = t("บาท", "THB"), rd = t("รอบ", "bookings");
  const pr = perRound(plan, svc.price);
  return (
    <div className="flex flex-col gap-4">
      <ProfitChart plan={plan} up={up} month={month} setMonth={setMonth} />
      <div className="fin-seg" role="tablist">
        <button type="button" role="tab" aria-selected={!multi} className={!multi ? "on" : ""} onClick={() => setMulti(false)}>{t("ประเภทเดียว", "Single service")}</button>
        <button type="button" role="tab" aria-selected={multi} className={multi ? "on" : ""} onClick={() => setMulti(true)}>{t("หลายประเภท", "Service mix")}</button>
      </div>
      <div className="grid xl:grid-cols-[1fr_1.2fr] gap-4 items-start">
        <Card n={1} title={t("เลือกบริการและเป้าหมาย", "Choose service & target")}>
          {multi ? (
            <div className="flex items-center gap-2 py-1.5 border-b border-[var(--fl)] text-[14px]"><span className="w-[120px]">{t("สัดส่วนจาก", "Mix from")}</span><MonthPick month={month} setMonth={setMonth} plan={plan} /></div>
          ) : (
            <div className="flex items-center gap-2 py-1.5 border-b border-[var(--fl)] text-[14px]">
              <span className="w-[120px] shrink-0">{t("บริการ", "Service")}</span>
              <select className="fin-sel flex-1 min-w-0" value={svc.id} onChange={(e) => setT({ serviceId: e.target.value })} aria-label={t("ประเภทบริการ", "Service type")}>
                {plan.services.map((s) => <option key={s.id} value={s.id}>{svcLabel(s)} • {fmt(s.price)} {baht}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 py-1.5 border-b border-[var(--fl)] text-[14px]"><span className="w-[120px] shrink-0">{t("เป้ากำไรต่อเดือน", "Monthly profit target")}</span><Num label={t("เป้ากำไรต่อเดือน", "Monthly profit target")} w="flex-1" value={plan.target.profit} onChange={(profit) => setT({ profit })} /><span className="text-[var(--fm)]">{baht}</span></div>
          <div className="flex items-center gap-2 py-1.5 border-b border-[var(--fl)] text-[14px]"><span className="w-[120px] shrink-0">{t("วันทำงาน/เดือน", "Working days / month")}</span><Num label={t("วันทำงานต่อเดือน", "Working days per month")} w="w-[90px]" value={plan.target.days} onChange={(days) => setT({ days: Math.min(31, Math.max(1, Math.round(days))) })} /><span className="text-[var(--fm)]">{t("วัน", "days")}</span></div>
          <div className="flex items-center gap-2 py-1.5 text-[14px] flex-wrap"><span className="w-[120px] shrink-0">{t("ค่าใช้จ่ายประจำ", "Fixed costs")}</span><b className="tabular-nums">{fmt(single.fixed)}</b><span className="text-[var(--fm)]">{t("บาท/เดือน", "THB / month")}</span><span className="flex-1" /><Link href="/finance/costs" className="text-[12.5px] font-semibold text-[var(--fp)] underline">{t("แก้ไขสมมติฐาน", "Edit assumptions")}</Link></div>
          <p className="fin-note">{t("ค่าใช้จ่ายประจำเงินสด + รายการตั้งงบเพิ่ม (ไม่รวมค่าตัดจำหน่าย)", "Cash fixed costs + extra budget items (excludes amortisation)")}</p>
        </Card>

        <Card n={2} title={t("จำนวนรอบที่ต้องขาย", "Bookings you need to sell")}>
          {tg && tg.rounds != null ? (
            <>
              <div className="flex items-end justify-center gap-3 flex-wrap">
                <span className="text-[64px] lg:text-[80px] font-extrabold leading-none text-[var(--fp)] tabular-nums">{fmt(tg.rounds)}</span>
                <span className="fin-pill big mb-3">{t("รอบ / เดือน", "bookings / month")}</span>
              </div>
              <p className="m-0 text-center text-[14px]">{t(`เพื่อเหลือกำไรอย่างน้อย ${fmt(plan.target.profit)} บาท`, `to keep at least ${fmt(plan.target.profit)} THB profit`)}</p>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[var(--fl)] text-center">
                <div><div className="text-[12.5px] text-[var(--fm)]">{t("เฉลี่ยต่อวัน", "Per day")}</div><div className="text-[18px] sm:text-[22px] font-bold tabular-nums whitespace-nowrap">{fmt(tg.perDay ?? 0)} {rd}</div><div className="text-[11.5px] text-[var(--fm)]">({plan.target.days} {t("วัน, ปัดขึ้น", "days, rounded up")})</div></div>
                <div><div className="text-[12.5px] text-[var(--fm)]">{t("คุ้มทุนที่", "Break-even at")}</div><div className="text-[18px] sm:text-[22px] font-bold tabular-nums whitespace-nowrap">{fmt(tg.breakeven ?? 0)} {rd}</div></div>
                <div><div className="text-[12.5px] text-[var(--fm)]">{t("กำไรตามแผน", "Planned profit")}</div><div className="text-[18px] sm:text-[22px] font-bold tabular-nums text-[var(--fg)] whitespace-nowrap">{fmt(tg.profit ?? 0)} {baht}</div></div>
              </div>
              <div className="fin-total t-green mt-3"><span>{t("เงินเหลือต่อรอบ", "Net per booking")}{multi ? t(" (เฉลี่ย)", " (average)") : ""}</span><b>{fmt(tg.net, 2)} {baht}</b></div>
              {multi && mix && (
                <div className="mt-3">{mix.split.filter((x) => x.w > 0).map((x) => <Row key={x.s.id} l={`${svcLabel(x.s)} (${fmtPct(x.w)})`} r={`${fmt(x.rounds)} ${rd}`} />)}</div>
              )}
              <button type="button" className="fin-add w-full text-center" onClick={() => setHow(!how)} aria-expanded={how}>{how ? t("ซ่อนวิธีคำนวณ ▲", "Hide calculation ▲") : t("ดูวิธีคำนวณและค่าธรรมเนียม ▼", "Show calculation & fees ▼")}</button>
              {how && (
                <div className="text-[13px] leading-relaxed bg-[var(--fsoft)] rounded-xl p-3">
                  {!multi && <p className="m-0">{t("ต่อรอบ", "Per booking")}: {fmt(svc.price)} × {fmtPct(plan.companyShare)} + {t("ค่าธรรมเนียม", "fee")} {fmt(pr.fee, 2)} − {t("ค่าภาษี ภ.ง.ด.", "PND tax")} {fmt(pr.pg, 2)}{pr.pctCost ? ` − ${t("ค่าใช้จ่ายแบบ %", "% costs")} ${fmt(pr.pctCost, 2)}` : ""} = <b>{fmt(tg.net, 2)}</b></p>}
                  <p className="m-0">{t("รอบที่ต้องขาย", "Bookings needed")} = ({t("เป้ากำไร", "profit target")} {fmt(plan.target.profit)} + {t("ค่าใช้จ่ายประจำ", "fixed costs")} {fmt(tg.fixed)}) ÷ {fmt(tg.net, 2)} = <b>{fmt(tg.rounds)}</b> ({t("ปัดขึ้น", "rounded up")})</p>
                  <p className="m-0">{t("คุ้มทุน", "Break-even")} = {fmt(tg.fixed)} ÷ {fmt(tg.net, 2)} = <b>{fmt(tg.breakeven ?? 0)}</b> {rd}</p>
                </div>
              )}
            </>
          ) : (
            <p className="fin-warn">{multi
              ? t(`ยังไม่มีเคสในเดือน ${month} (${monthLabel(month, lang)}) — กรอกเคสที่หน้าภาพรวมก่อน`, `No cases in ${month} (${monthLabel(month, lang)}) yet — enter them on the Overview page first`)
              : t("บริการนี้ไม่เหลือเงินต่อรอบ (ราคาหรือ % ทำให้ขาดทุน)", "This service leaves nothing per booking (price or % settings make a loss)")}</p>
          )}
        </Card>
      </div>

      <Card title={t("เปรียบเทียบกับบริการอื่น", "Compare services")} right={<span className="text-[12.5px] text-[var(--fm)]">{t(`ขายประเภทเดียว • เป้ากำไร ${fmt(plan.target.profit)} บาทเท่ากัน`, `Selling one service only • same ${fmt(plan.target.profit)} THB target`)}</span>}>
        <div className="overflow-x-auto">
          <table className="fin-t">
            <thead><tr><th>{t("บริการ", "Service")}</th><th className="r hidden sm:table-cell">{t("ราคา", "Price")}</th><th className="r hidden sm:table-cell">{t("เหลือต่อรอบ", "Net / booking")}</th><th className="r">{t("คุ้มทุน", "Break-even")}</th><th className="r">{t("รอบที่ต้องขาย/เดือน", "Bookings needed / month")}</th></tr></thead>
            <tbody>
              {plan.services.map((s) => {
                const x = targetFor(plan, s.price), on = !multi && s.id === svc.id;
                return (
                  <tr key={s.id} className={on ? "sel" : ""} onClick={() => { setMulti(false); setT({ serviceId: s.id }); }} style={{ cursor: "pointer" }}>
                    <td className="font-semibold">{svcLabel(s)}</td>
                    <td className="r tabular-nums hidden sm:table-cell">{fmt(s.price)} {baht}</td>
                    <td className="r tabular-nums hidden sm:table-cell">{fmt(x.net, 2)}</td>
                    <td className="r tabular-nums whitespace-nowrap">{x.breakeven == null ? "—" : `${fmt(x.breakeven)} ${rd}`}</td>
                    <td className="r tabular-nums font-bold text-[15px] sm:text-[16px] whitespace-nowrap">{x.rounds == null ? "—" : `${fmt(x.rounds)} ${rd}`}{on && " ✓"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="fin-note">{t(`สมมติส่วนแบ่งบริษัท ${fmtPct(plan.companyShare)} • กำไรก่อนภาษี ยังไม่รวมรายการที่ยังไม่ใส่งบ`, `Assumes ${fmtPct(plan.companyShare)} company share • profit before tax, excluding unbudgeted items`)}</p>
      </Card>
      <CasesGrid plan={plan} up={up} month={month} setMonth={setMonth} />
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
.fin-kv{font-size:clamp(19px,5.6vw,30px);white-space:nowrap;font-weight:800;line-height:1.25;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.fin-kpi.t-violet .fin-kv{color:var(--fp)}.fin-kpi.t-blue .fin-kv{color:var(--fb)}.fin-kpi.t-orange .fin-kv{color:var(--fo)}.fin-kpi.t-green .fin-kv{color:var(--fg)}.fin-kpi.t-red .fin-kv{color:var(--fr)}
.fin-kpi.t-red .fin-pill{background:var(--frl);color:var(--fr)}
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
.fin-mo{font-weight:600;padding:2px 8px;border-radius:8px;line-height:1.3;white-space:nowrap}.fin-mo.on{background:var(--fp);color:#fff}
.fin-lv{display:inline-block;font-size:11.5px;font-weight:600;padding:0 8px;border-radius:999px;background:#e8eefc;color:#3b5bb5;margin-left:4px}.fin-lv.top{background:#fff1c7;color:#9a6a00}
.dot{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:8px;vertical-align:middle}
.fin-seg{display:inline-flex;background:#ece6fa;border-radius:14px;padding:4px;align-self:flex-start}
.fin-seg button{padding:8px 22px;border-radius:11px;font-weight:600;font-size:14.5px;color:var(--ft2)}
.fin-seg.sm{padding:3px;border-radius:12px}.fin-seg.sm button{padding:4px 14px;font-size:13px}
.fin-seg button.on{background:var(--fp);color:#fff;box-shadow:0 4px 12px rgba(109,63,209,.3)}
.fin-exp{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 10px;border-radius:9px;font-size:12.5px;font-weight:600;color:var(--fp);background:#fff;border:1px solid #d9cbfa;white-space:nowrap}
.fin-exp:hover{background:var(--fpl)}.fin-exp:disabled{opacity:.6}
.fin-exp-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:45;display:flex;flex-direction:column;min-width:200px;background:#fff;border:1px solid var(--fl);border-radius:14px;padding:6px;box-shadow:0 12px 30px rgba(60,30,120,.16)}
.fin-exp-menu button{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;font-size:14px;font-weight:600;color:var(--ft);text-align:left}
.fin-exp-menu button:hover{background:var(--fsoft)}.fin-exp-menu small{margin-left:auto;font-weight:400;color:var(--fm);font-size:11.5px}
.fin-ratio{display:inline-block;border:2px solid var(--fp);border-radius:3px}.fin-ratio.l{width:22px;height:13px}.fin-ratio.p{width:13px;height:22px;margin:0 4.5px}
@media (max-width:639px){
  .fin-root{line-height:1.55}
  .fin-root main{padding-top:14px}
  .fin-root .fin-in{border-color:transparent;background:#f3f0fa;box-shadow:none}
  .fin-root .fin-in:focus-within{background:#fff;border-color:var(--fp);box-shadow:0 0 0 3px #e4d9fc}
  .fin-root .fin-sel{border-color:transparent;background:#f3f0fa}
  .fin-root .fin-card [class*="border-b"]{border-bottom-color:transparent}
  .fin-root .fin-t td,.fin-root .fin-t th{border-bottom-color:transparent}
  .fin-root .fin-t thead th{background:transparent}
  .fin-root .fin-note{display:none}
  .fin-root .fin-x{color:#b9b1cc;width:26px;height:26px}
  .fin-root .fin-card{box-shadow:0 2px 10px rgba(60,30,120,.04);border-color:#efebf7}
  .fin-root .fin-card > div:first-child{margin-bottom:10px}
  .fin-root .fin-num{width:24px;height:24px;font-size:12.5px}
  .fin-root .fin-pill{font-size:11px}
  .fin-root .fin-warn{font-size:12.5px;padding:7px 10px}
  .fin-root .fin-add{font-size:13px}
  .fin-root .flex-col.gap-4{gap:12px}
  .fin-root .fin-tile{background:#f8f6fc;border-radius:14px;padding:10px 12px;margin-bottom:8px}
  .fin-root .fin-tile .fin-in,.fin-root .fin-tile .fin-sel{background:#fff}
  .fin-root .fin-card{padding:14px 14px;border-radius:18px}
  .fin-root .fin-kpi{padding:12px 13px;border-radius:16px}
  .fin-root .fin-kpi > div:first-child{font-size:12.5px}
  .fin-root .fin-bar{padding:10px 12px;gap:8px 12px}
  .fin-root .fin-total{padding:9px 12px;font-size:14px}.fin-root .fin-total b{font-size:16px}
  .fin-root .fin-eq{min-width:0;padding:8px 12px}.fin-root .fin-eq b{font-size:20px}
  .fin-root .fin-t{font-size:13px}
  .fin-root .fin-in{height:34px}
  .fin-root .fin-btn{height:40px;padding:0 16px;font-size:14.5px}
  .fin-root .fin-btn.sm{height:32px;padding:0 10px;font-size:12.5px}
  .fin-root .fin-nav{padding:8px 12px}
  .fin-root .fin-seg button{padding:7px 16px;font-size:14px}
}
.fin-savebar{position:fixed;left:0;right:0;bottom:0;z-index:40;display:flex;align-items:center;gap:10px;padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));background:rgba(255,255,255,.96);border-top:1px solid var(--fl);backdrop-filter:blur(6px)}
@media (min-width:1024px){.fin-savebar{left:248px;padding-left:32px;padding-right:32px}}
.fin-btn{height:42px;padding:0 22px;border-radius:12px;font-weight:700;font-size:15px;color:#fff;background:linear-gradient(90deg,#7c4dff,#6d3fd1)}
.fin-btn:disabled{opacity:.45}
.fin-btn.ghost{background:#fff;color:var(--fp);border:1px solid #d9cbfa}
.fin-btn.sm{height:34px;font-size:13px;padding:0 12px}
`;
