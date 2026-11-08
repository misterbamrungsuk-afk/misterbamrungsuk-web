"use client";

// สไลด์สรุปสำหรับส่งออกเป็นรูป (/finance) — วาดจากตัวเลขในแผนโดยตรง ไม่ได้แคปหน้าจอฟอร์ม
// แนวนอน 1920×1080 · แนวตั้ง 1080×1920 · ตัวหนังสือใหญ่ ไม่แน่น
import { cashTargetOf, fixedTotal, fmt, fmtPct, monthLabel, monthSummary, monthsOf, perRound, targetFor, type FinService, type FinancePlan } from "@/lib/finance/plan";

export type Orient = "landscape" | "portrait";
export type SlideKind = "overview" | "costs" | "target";
export const SLIDE_SIZE: Record<Orient, [number, number]> = { landscape: [1920, 1080], portrait: [1080, 1920] };
export type SlideCtx = { plan: FinancePlan; month: string; lang: "th" | "en"; orient: Orient; dn: (n: string) => string; sl: (s: FinService) => string };

const C = { ink: "#231a3d", ink2: "#4a3f66", mute: "#7a7091", line: "#ebe6f5", violet: "#6d3fd1", violetL: "#efe8fd", blue: "#1d4ed8", blueL: "#e8f0fe", orange: "#d9480f", orangeL: "#fff1e6", green: "#1f8a4c", greenL: "#e6f6ec", red: "#c92a3a", redL: "#fdecee", amber: "#e0a100", gray: "#c9c4d3", slate: "#94a3b8" };
const SERIES = ["#6d3fd1", "#2563eb", "#0d9488", "#e0a100", "#d9480f", "#c2417a", "#64748b", "#16a34a", "#7c3aed", "#0891b2"];
const FONT = 'var(--font-sans), "IBM Plex Sans Thai", "Noto Sans Thai", system-ui, sans-serif';
const pct = (f: number) => `${fmt(f * 100, 1)}%`;
const k = (v: number) => (Math.abs(v) >= 1e6 ? `${fmt(v / 1e6, 2)}M` : Math.abs(v) >= 1e3 ? `${fmt(v / 1e3, 0)}K` : fmt(v));

function useTx(c: SlideCtx) {
  return (th: string, en: string) => (c.lang === "en" ? en : th);
}

// ─── โครงสไลด์ ───
function Frame({ c, title, children }: { c: SlideCtx; title: string; children: React.ReactNode }) {
  const t = useTx(c);
  const L = c.orient === "landscape";
  const [W, H] = SLIDE_SIZE[c.orient];
  const today = new Date().toLocaleDateString(c.lang === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div style={{ width: W, height: H, boxSizing: "border-box", padding: L ? "52px 72px 40px" : "72px 60px 52px", display: "flex", flexDirection: "column", gap: L ? 28 : 40, background: "linear-gradient(160deg,#fbfaff 0%,#f3eefc 60%,#ece6fa 100%)", fontFamily: FONT, color: C.ink, lineHeight: 1.35 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ width: 76, height: 76, borderRadius: 22, background: C.violetL, color: C.violet, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 30, flexShrink: 0 }}>MB</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 19, letterSpacing: ".14em", fontWeight: 600, color: C.mute }}>MISTER BAMRUNGSUK · {t("แผนการเงิน", "FINANCIAL PLAN")}</div>
          <div style={{ fontSize: L ? 50 : 54, fontWeight: 800, lineHeight: 1.25 }}>{title}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 21, color: C.mute, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, color: C.violet, fontSize: 24 }}>{c.month} · {monthLabel(c.month, c.lang)}</div>
          <div>{t("ข้อมูล ณ", "As of")} {today}</div>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: L ? 24 : 32 }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, color: C.mute, borderTop: `1px solid #ddd5ee`, paddingTop: 16 }}>
        <span>{t("แผนจำลอง · ตัวเลขก่อนภาษีเงินได้นิติบุคคล", "Plan figures · before corporate income tax")}</span>
        <span style={{ fontWeight: 700, color: C.violet }}>misterbamrungsuk.com</span>
      </div>
    </div>
  );
}
function Panel({ title, note, children, style }: { title: string; note?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", borderRadius: 28, padding: "28px 34px", boxShadow: "0 10px 30px rgba(60,30,120,.07)", display: "flex", flexDirection: "column", gap: 18, minWidth: 0, minHeight: 0, ...style }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{title}</div>
        {note && <div style={{ fontSize: 19, color: C.mute }}>{note}</div>}
      </div>
      {children}
    </div>
  );
}
function Kpi({ label, value, unit, color, bg, chip, chipBad }: { label: string; value: string; unit: string; color: string; bg: string; chip?: string; chipBad?: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: `linear-gradient(${bg},#fff)`, borderRadius: 26, padding: "24px 28px", boxShadow: "0 8px 24px rgba(60,30,120,.06)" }}>
      <div style={{ fontSize: 22, fontWeight: 600, color: C.ink2 }}>{label}</div>
      <div style={{ fontSize: 52, fontWeight: 800, color, lineHeight: 1.2, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 19, color: C.mute, display: "flex", gap: 10, alignItems: "center" }}>{unit}{chip && <span style={{ background: chipBad ? C.redL : C.greenL, color: chipBad ? C.red : C.green, fontWeight: 700, borderRadius: 99, padding: "2px 14px" }}>{chip}</span>}</div>
    </div>
  );
}
const Grid = ({ cols, gap = 24, children, style }: { cols: number; gap?: number; children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap, ...style }}>{children}</div>
);
const Empty = ({ text }: { text: string }) => <div style={{ flex: 1, display: "grid", placeItems: "center", fontSize: 24, color: C.mute }}>{text}</div>;

/** แถบแนวนอน: ชื่อ + รายละเอียด + แท่ง + ค่า */
function HBars({ rows, max, dense }: { rows: { label: string; sub?: string; value: number; text: string; color: string }[]; max: number; dense?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: dense ? 12 : 20 }}>
      {rows.map((r, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, fontSize: 22 }}>
            <span style={{ fontWeight: 700 }}>{r.label}{r.sub && <span style={{ fontWeight: 400, color: C.mute, fontSize: 19, marginLeft: 12 }}>{r.sub}</span>}</span>
            <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{r.text}</span>
          </div>
          <div style={{ height: dense ? 14 : 18, borderRadius: 9, background: "#f1edf8", marginTop: dense ? 6 : 8, overflow: "hidden" }}>
            <div style={{ width: `${max > 0 ? Math.max(1.5, (r.value / max) * 100) : 0}%`, height: "100%", borderRadius: 9, background: r.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}
/** โดนัท + คำอธิบาย */
function Donut({ items, total, centerTop, size = 300 }: { items: { label: string; value: number; color: string }[]; total: number; centerTop: string; size?: number }) {
  const R = 42, CIRC = 2 * Math.PI * R;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      <circle cx="50" cy="50" r={R} fill="none" stroke="#f1edf8" strokeWidth="13" />
      {items.map((it, i) => {
        const len = total > 0 ? (it.value / total) * CIRC : 0;
        const el = <circle key={i} cx="50" cy="50" r={R} fill="none" stroke={it.color} strokeWidth="13" strokeDasharray={`${Math.max(0, len - 0.6)} ${CIRC}`} strokeDashoffset={-acc} transform="rotate(-90 50 50)" />;
        acc += len;
        return el;
      })}
      <text x="50" y="45" textAnchor="middle" fontSize="6.5" fill={C.mute}>{centerTop}</text>
      <text x="50" y="58" textAnchor="middle" fontSize="11" fontWeight="800" fill={C.orange}>{k(total)}</text>
    </svg>
  );
}
function Legend({ items, total }: { items: { label: string; value: number; color: string; note?: string }[]; total: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, minWidth: 0 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 21 }}>
          <span style={{ width: 16, height: 16, borderRadius: 5, background: it.color, flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0 }}>{it.label}{it.note && <span style={{ color: C.mute, fontSize: 17, marginLeft: 8 }}>{it.note}</span>}</span>
          <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(it.value)}</span>
          <span style={{ width: 70, textAlign: "right", color: C.mute, fontVariantNumeric: "tabular-nums" }}>{total > 0 ? pct(it.value / total) : "–"}</span>
        </div>
      ))}
    </div>
  );
}

// ─── สไลด์ 1: ภาพรวม ───
function OverviewSlide({ c }: { c: SlideCtx }) {
  const t = useTx(c);
  const L = c.orient === "landscape";
  const { plan } = c;
  const m = monthSummary(plan, c.month);
  const baht = t("บาท / เดือน", "THB / month");
  const rev = m.rows.filter((r) => r.rounds > 0).sort((a, b) => b.gross - a.gross);
  const maxG = Math.max(0, ...rev.map((r) => r.gross));
  const lines = m.lines.filter((l) => l.amount > 0).map((l, i) => ({
    label: l.id === "_pg" ? t(`ภาษี ภ.ง.ด. ${fmtPct(plan.pgFee)}`, `PND tax ${fmtPct(plan.pgFee)}`) : c.dn(l.name),
    value: l.amount, color: SERIES[(i + 4) % SERIES.length], note: l.noncash && !/เงินสด|non-cash/i.test(c.dn(l.name)) ? t("ไม่ใช่เงินสด", "non-cash") : undefined,
  }));
  return (
    <Frame c={c} title={t("ภาพรวมการเงินรายเดือน", "Monthly financial overview")}>
      <Grid cols={L ? 4 : 2}>
        <Kpi label={t("ทุนเริ่มต้น", "Starting capital")} value={fmt(plan.capital)} unit={t("บาท", "THB")} color={C.violet} bg="#f8f5ff" />
        <Kpi label={t("รายได้บริษัท", "Company revenue")} value={fmt(m.revenue)} unit={baht} color={C.violet} bg="#f8f5ff" />
        <Kpi label={t("ค่าใช้จ่าย", "Expenses")} value={fmt(m.expenses)} unit={baht} color={C.orange} bg="#fff6ef" />
        <Kpi label={t("กำไรก่อนภาษี", "Profit before tax")} value={fmt(m.profit)} unit={baht} color={m.profit >= 0 ? C.green : C.red} bg={m.profit >= 0 ? "#effaf3" : "#fff1f2"} chip={m.revenue ? t(`${pct(m.margin)} ของรายได้`, `${pct(m.margin)} margin`) : undefined} chipBad={m.profit < 0} />
      </Grid>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: L ? "1.15fr 1fr" : "1fr", gridTemplateRows: L ? "1fr" : "auto 1fr", gap: 24 }}>
        <Panel title={t("รายได้มาจากไหน", "Where revenue comes from")} note={t(`${fmt(m.totalRounds)} รอบ · ลูกค้าจ่าย ${fmt(m.gross)} → รายได้บริษัท ${fmt(m.revenue)}`, `${fmt(m.totalRounds)} bookings · spend ${fmt(m.gross)} → revenue ${fmt(m.revenue)}`)}>
          {rev.length ? (
            <>
              <HBars dense={L} max={maxG} rows={rev.map((r, i) => ({ label: c.sl(r.s), sub: t(`${fmt(r.rounds)} รอบ × ${fmt(r.s.price)}`, `${fmt(r.rounds)} × ${fmt(r.s.price)}`), value: r.gross, text: `${fmt(r.gross)} · ${pct(m.gross ? r.gross / m.gross : 0)}`, color: SERIES[i % SERIES.length] }))} />
            </>
          ) : <Empty text={t("ยังไม่มีเคสในเดือนนี้", "No cases entered for this month")} />}
        </Panel>
        <Panel title={t("ค่าใช้จ่ายรายเดือน", "Monthly expenses")}>
          <div style={{ display: "flex", alignItems: "center", gap: 34, flex: 1, minHeight: 0 }}>
            <Donut items={lines} total={m.expenses} centerTop={t("รวม", "Total")} size={L ? 290 : 280} />
            <Legend items={lines} total={m.expenses} />
          </div>
        </Panel>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 22, background: "#fff", borderRadius: 26, padding: "20px 30px", boxShadow: "0 8px 24px rgba(60,30,120,.06)", flexWrap: "wrap" }}>
        <Eq label={t("รายได้บริษัท", "Revenue")} v={m.revenue} color={C.violet} bg={C.violetL} />
        <span style={{ fontSize: 40, color: C.mute, fontWeight: 700 }}>−</span>
        <Eq label={t("ค่าใช้จ่าย", "Expenses")} v={m.expenses} color={C.orange} bg={C.orangeL} />
        <span style={{ fontSize: 40, color: C.mute, fontWeight: 700 }}>=</span>
        <Eq label={t("กำไรก่อนภาษี", "Profit before tax")} v={m.profit} color={m.profit >= 0 ? C.green : C.red} bg={m.profit >= 0 ? C.greenL : C.redL} />
        <div style={{ fontSize: 19, color: C.mute, flexBasis: L ? 260 : "100%", flexGrow: 1, textAlign: L ? "right" : "center" }}>{t("เงินสดจากการดำเนินงาน", "Operating cash flow")} <b style={{ color: C.ink, fontSize: 24 }}>{fmt(m.cash)}</b></div>
      </div>
    </Frame>
  );
}
const Eq = ({ label, v, color, bg }: { label: string; v: number; color: string; bg: string }) => (
  <div style={{ flex: 1, minWidth: 220, background: bg, borderRadius: 18, padding: "10px 20px", textAlign: "center" }}>
    <div style={{ fontSize: 19, fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 34, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{fmt(v)}</div>
  </div>
);

// ─── สไลด์ 2: ต้นทุน ───
function CostsSlide({ c }: { c: SlideCtx }) {
  const t = useTx(c);
  const L = c.orient === "landscape";
  const { plan } = c;
  const m = monthSummary(plan, c.month);
  const fixedCash = fixedTotal(plan, true) - plan.pending.reduce((s, i) => s + i.amount, 0);
  const fixedRows = plan.expenses.filter((e) => e.kind === "fixed" && e.value > 0);
  const pctRows = plan.expenses.filter((e) => e.kind !== "fixed" && e.value > 0);
  const pend = plan.pending.filter((i) => i.amount > 0);
  const maxF = Math.max(0, ...fixedRows.map((e) => e.value), ...pend.map((i) => i.amount));
  const seg = { prov: "#9fb1cc", co: C.violet, tax: "#f0884f" };
  return (
    <Frame c={c} title={t("ต้นทุนและส่วนแบ่งต่อรอบ", "Costs & split per booking")}>
      <Grid cols={3} gap={L ? 24 : 16}>
        <Kpi label={t("จ่ายผู้ให้บริการ (เดือนนี้)", "Paid to providers (this month)")} value={fmt(m.provider)} unit={t(`บาท · ส่วนแบ่ง ${fmtPct(1 - plan.companyShare)}`, `THB · ${fmtPct(1 - plan.companyShare)} share`)} color={C.blue} bg="#f2f6ff" />
        <Kpi label={t("ต้นทุนผันแปรบริษัท", "Company variable cost")} value={fmt(m.variable)} unit={t("บาท · ภ.ง.ด. + ค่าใช้จ่ายแบบ %", "THB · PND tax + % costs")} color={C.orange} bg="#fff6ef" />
        <Kpi label={t("ค่าใช้จ่ายประจำ (เงินสด)", "Fixed costs (cash)")} value={fmt(fixedCash)} unit={t("บาท / เดือน", "THB / month")} color={C.orange} bg="#fff6ef" />
      </Grid>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: L ? "1.35fr 1fr" : "1fr", gap: 24 }}>
        <Panel title={t("ต่อ 1 รอบ ใครได้เท่าไหร่", "Per booking: who gets what")}>
          <div style={{ display: "flex", gap: 22, fontSize: 18, color: C.mute }}>
            <span><i style={{ display: "inline-block", width: 14, height: 14, borderRadius: 4, background: seg.prov, marginRight: 8 }} />{t("ผู้ให้บริการรับสุทธิ", "Provider net")}</span>
            <span><i style={{ display: "inline-block", width: 14, height: 14, borderRadius: 4, background: seg.co, marginRight: 8 }} />{t("บริษัทเหลือ", "Company net")}</span>
            <span><i style={{ display: "inline-block", width: 14, height: 14, borderRadius: 4, background: seg.tax, marginRight: 8 }} />{t("ภ.ง.ด. + %", "PND + %")}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: plan.services.length > 5 ? 10 : L ? 16 : 30 }}>
            {plan.services.map((s) => {
              const r = perRound(plan, s.price);
              const parts = [
                { v: r.providerNet, c: seg.prov, fg: "#24324a" },
                { v: r.net, c: seg.co, fg: "#fff" },
                { v: r.pg + r.pctCost, c: seg.tax, fg: "#fff" },
              ];
              return (
                <div key={s.id} style={{ display: "grid", gridTemplateColumns: L ? "300px 1fr 150px" : "250px 1fr 130px", alignItems: "center", gap: 18 }}>
                  <div style={{ lineHeight: 1.25 }}>
                    <div style={{ fontSize: 21, fontWeight: 700 }}>{c.sl(s)}</div>
                    <div style={{ fontSize: 17, color: C.mute }}>{fmt(s.price)} {t("บาท / รอบ", "THB / booking")}</div>
                  </div>
                  <div style={{ display: "flex", height: 36, borderRadius: 11, overflow: "hidden" }}>
                    {parts.map((p, i) => {
                      const w = s.price > 0 ? (p.v / s.price) * 100 : 0;
                      return <div key={i} style={{ width: `${w}%`, background: p.c, color: p.fg, fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap", overflow: "hidden" }}>{w >= 12 ? fmt(p.v) : ""}</div>;
                    })}
                  </div>
                  <div style={{ textAlign: "right", lineHeight: 1.2 }}>
                    <div style={{ fontSize: 15, color: C.mute }}>{t("บริษัทเหลือ", "Company net")}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: C.violet, fontVariantNumeric: "tabular-nums" }}>{fmt(r.net)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title={t("ค่าใช้จ่ายประจำ / เดือน", "Fixed costs / month")}>
          <HBars max={maxF} rows={[
            ...fixedRows.map((e, i) => ({ label: c.dn(e.name), sub: e.noncash && !/เงินสด|non-cash/i.test(c.dn(e.name)) ? t("ไม่ใช่เงินสด", "non-cash") : undefined, value: e.value, text: fmt(e.value), color: e.noncash ? C.gray : SERIES[(i + 4) % SERIES.length] })),
            ...pend.map((p) => ({ label: c.dn(p.name), sub: t("ตั้งงบเพิ่ม", "extra budget"), value: p.amount, text: fmt(p.amount), color: C.amber })),
          ]} />
          {pctRows.length > 0 && <div style={{ fontSize: 19, color: C.mute }}>{t("คิดเป็น %", "Percentage-based")}: {pctRows.map((e) => `${c.dn(e.name)} ${fmtPct(e.value)}`).join(" · ")}</div>}
          <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", background: C.orangeL, borderRadius: 18, padding: "14px 22px", fontSize: 22 }}>
            <b>{t("เงินสดต่อเดือน", "Cash per month")}</b>
            <b style={{ color: C.orange, fontSize: 30, fontVariantNumeric: "tabular-nums" }}>{fmt(fixedTotal(plan, true))}</b>
          </div>
        </Panel>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 20 }}>
        {[
          t(`ส่วนแบ่งบริษัท ${fmtPct(plan.companyShare)}`, `Company share ${fmtPct(plan.companyShare)}`),
          t(`ค่าธรรมเนียมจากผู้ให้บริการ ${fmtPct(plan.providerFee)}`, `Provider fee ${fmtPct(plan.providerFee)}`),
          t(`ภาษี ภ.ง.ด. ${fmtPct(plan.pgFee)} ของยอดลูกค้า`, `PND tax ${fmtPct(plan.pgFee)} of customer spend`),
        ].map((x) => <span key={x} style={{ background: "#fff", border: `1px solid #ddd5ee`, borderRadius: 99, padding: "8px 20px", color: C.ink2, fontWeight: 600 }}>{x}</span>)}
      </div>
    </Frame>
  );
}

// ─── สไลด์ 3: เป้ากำไร ───
function TargetSlide({ c }: { c: SlideCtx }) {
  const t = useTx(c);
  const L = c.orient === "landscape";
  const { plan } = c;
  const svc = plan.services.find((s) => s.id === plan.target.serviceId) ?? plan.services[0];
  const tg = targetFor(plan, svc.price);
  const all = plan.services.map((s) => ({ s, x: targetFor(plan, s.price) }));
  const maxR = Math.max(0, ...all.map((a) => a.x.rounds ?? 0));
  const rd = t("รอบ", "bookings");
  return (
    <Frame c={c} title={t("เป้ากำไร: ต้องขายกี่รอบ", "Profit target: bookings needed")}>
      <div style={{ display: "grid", gridTemplateColumns: L ? "1fr 1.2fr" : "1fr", gap: 24 }}>
        <Panel title={c.sl(svc)} note={`${fmt(svc.price)} ${t("บาท / รอบ", "THB / booking")}`}>
          {tg.rounds != null ? (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 18, justifyContent: "center" }}>
                <span style={{ fontSize: L ? 104 : 132, fontWeight: 800, color: C.violet, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{fmt(tg.rounds)}</span>
                <span style={{ fontSize: 28, fontWeight: 700, color: C.violet, background: C.violetL, borderRadius: 99, padding: "6px 22px", marginBottom: 14 }}>{t("รอบ / เดือน", "bookings / month")}</span>
              </div>
              <div style={{ textAlign: "center", fontSize: 22, color: C.ink2 }}>{t(`เพื่อให้เหลือกำไรอย่างน้อย ${fmt(plan.target.profit)} บาท`, `to keep at least ${fmt(plan.target.profit)} THB profit`)}</div>
              <Grid cols={4} gap={12} style={{ borderTop: `1px solid ${C.line}`, paddingTop: 18 }}>
                {[
                  [t("ต่อวัน", "Per day"), `${fmt(tg.perDay ?? 0)}`, C.ink],
                  [t("คุ้มทุนที่", "Break-even"), `${fmt(tg.breakeven ?? 0)}`, C.ink],
                  [t("เหลือ/รอบ", "Net / booking"), fmt(tg.net), C.green],
                  [t("กำไรตามแผน", "Planned profit"), k(tg.profit ?? 0), C.green],
                ].map(([a, b, col]) => (
                  <div key={a} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, color: C.mute }}>{a}</div>
                    <div style={{ fontSize: 34, fontWeight: 800, color: col, fontVariantNumeric: "tabular-nums" }}>{b}</div>
                  </div>
                ))}
              </Grid>
              <div style={{ fontSize: 17, color: C.mute, textAlign: "center" }}>{t(`ค่าใช้จ่ายประจำ ${fmt(tg.fixed)} บาท/เดือน · ${plan.target.days} วันทำงาน`, `Fixed costs ${fmt(tg.fixed)} THB/month · ${plan.target.days} working days`)}</div>
            </>
          ) : <Empty text={t("บริการนี้ไม่เหลือเงินต่อรอบ", "This service leaves nothing per booking")} />}
        </Panel>
        <Panel title={t("ทุกบริการ: รอบที่ต้องขาย / เดือน", "All services: bookings needed / month")} note={t(`เป้า ${k(plan.target.profit)}`, `target ${k(plan.target.profit)}`)}>
          <HBars dense={L} max={maxR} rows={all.map(({ s, x }, i) => ({
            label: c.sl(s), sub: x.breakeven != null ? t(`คุ้มทุน ${fmt(x.breakeven)}`, `break-even ${fmt(x.breakeven)}`) : undefined,
            value: x.rounds ?? 0, text: x.rounds == null ? "—" : `${fmt(x.rounds)} ${rd}`, color: s.id === svc.id ? C.violet : ["#b9a6ee", "#9db7f0", "#8fd0c8", "#f1cf74", "#f5a77c"][i % 5],
          }))} />
        </Panel>
      </div>
      <MonthlyChart c={c} />
    </Frame>
  );
}

function MonthlyChart({ c }: { c: SlideCtx }) {
  const t = useTx(c);
  const L = c.orient === "landscape";
  const { plan } = c;
  const ML = monthsOf(plan);
  const data = ML.map((m) => ({ m, v: plan.months[m] ? monthSummary(plan, m).cash : null, g: cashTargetOf(plan, m) }));
  const vals = data.filter((d): d is { m: string; v: number; g: number } => d.v != null);
  const hit = vals.filter((d) => d.v >= d.g).length;
  const sum = vals.reduce((s, d) => s + d.v, 0);
  const max = Math.max(1, ...data.map((d) => d.g), ...vals.map((d) => d.v));
  const min = Math.min(0, ...vals.map((d) => d.v));
  const W = L ? 1700 : 900, H = L ? 215 : 470, top = 26, bot = 34;
  const col = W / ML.length, bw = Math.min(26, col * 0.32);
  const y = (v: number) => top + ((max - v) / (max - min || 1)) * (H - top - bot);
  const tone = (v: number, g: number) => (v >= g ? C.green : v >= 0 ? C.amber : C.red);
  const step = ML.length > 24 ? 3 : ML.length > 12 ? (L ? 1 : 2) : 1;
  return (
    <Panel title={t("กำไรเงินสดรายเดือน เทียบ For Cash", "Monthly cash profit vs For Cash")} style={{ flex: 1, minHeight: 0 }}
      note={vals.length ? t(`For Cash ${hit}/${vals.length} เดือน · กำไรรวม ${k(sum)}`, `For Cash ${hit}/${vals.length} months · total ${k(sum)}`) : t("ยังไม่มีเคส", "no cases yet")}>
      <div style={{ display: "flex", gap: 22, fontSize: 17, color: C.mute }}>
        {[[C.gray, "For Cash"], [C.green, t("ถึง For Cash", "Reached")], [C.amber, t("มีกำไร ยังไม่ถึง", "Below")], [C.red, t("ขาดทุน", "Loss")]].map(([cl, l]) => (
          <span key={l}><i style={{ display: "inline-block", width: 14, height: 14, borderRadius: 4, background: cl, marginRight: 8 }} />{l}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", flexShrink: 0, display: "block" }}>
        <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="#cfc6e4" strokeWidth="1.5" />
        {data.map((d, i) => {
          const cx = i * col + col / 2;
          return (
            <g key={d.m}>
              <rect x={cx - bw - 1} y={Math.min(y(d.g), y(0))} width={bw} height={Math.max(2, Math.abs(y(d.g) - y(0)))} rx="4" fill={C.gray} />
              {d.v != null && <rect x={cx + 1} y={Math.min(y(d.v), y(0))} width={bw} height={Math.max(2, Math.abs(y(d.v) - y(0)))} rx="4" fill={tone(d.v, d.g)} />}
              {d.v != null && ML.length <= 24 && <text x={cx + 1 + bw / 2} y={d.v >= 0 ? y(d.v) - 7 : y(0) - 8} textAnchor="middle" fontSize="15" fontWeight="700" fill={d.v >= 0 ? C.ink2 : C.red}>{k(d.v)}</text>}
              {i % step === 0 && <text x={cx} y={H - 14} textAnchor="middle" fontSize="15" fill={C.mute}>{monthLabel(d.m, c.lang)}</text>}
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}

export function Slide({ kind, c }: { kind: SlideKind; c: SlideCtx }) {
  if (kind === "costs") return <CostsSlide c={c} />;
  if (kind === "target") return <TargetSlide c={c} />;
  return <OverviewSlide c={c} />;
}
