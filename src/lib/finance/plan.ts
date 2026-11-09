// แผนการเงินหลังบ้าน (/finance) — ตัวเลขที่ฝ่ายการเงินกรอกเอง + สูตรคำนวณ (ใช้ร่วมกันทั้งฝั่งเซิร์ฟเวอร์และหน้าเว็บ)
// อ้างอิงสไลด์ Canva "Update MB" หน้า 8 (ภาพรวม) · 9 (รายละเอียดต้นทุน) · 10 (วางเป้ากำไร) — 6 พ.ย. 2569
// เป็น "แผนจำลอง" เท่านั้น ไม่แตะเงินจริง/กระเป๋า/ราคาที่ลูกค้าเห็น

export type ExpenseKind = "once" | "fixed" | "pctRevenue" | "pctGross";
export type IncomeKind = "once" | "monthly";
export interface FinService { id: string; name: string; level: string; price: number }
/** month: ครั้งเดียว = เดือนที่จ่าย (ค่าเริ่มต้น M1) */
export interface FinExpense { id: string; name: string; kind: ExpenseKind; value: number; noncash?: boolean; month?: string }
/** รายได้อื่น: ครั้งเดียว (month = เดือนที่ได้) · รายเดือน (month = เริ่มเดือน) เช่น Subscription เปิดเมมเบอร์ สปอนเซอร์ โฆษณา */
export interface FinIncome { id: string; name: string; kind: IncomeKind; value: number; month?: string }
export interface FinItem { id: string; name: string; amount: number }
export interface FinancePlan {
  capital: number;
  startup: FinItem[];            // เงินทุนใช้กับอะไร (ครั้งเดียว)
  companyShare: number;          // ส่วนแบ่งบริษัท (0.5 = 50%)
  providerFee: number;           // ค่าธรรมเนียมจากส่วนแบ่งผู้ให้บริการ (0.03)
  pgFee: number;                 // ค่าภาษี ภ.ง.ด. % ของยอดลูกค้าจ่าย (0.025)
  services: FinService[];
  /** จำนวนรอบต่อเดือน: months["M4"][serviceId] */
  months: Record<string, Record<string, number>>;
  expenses: FinExpense[];        // ค่าใช้จ่าย: ครั้งเดียว / รายเดือน / % (รวมเงินลงทุนแล้ว)
  labels?: Partial<Record<LabelKey, string>>; // ชื่อช่องที่แก้เอง (ส่วนแบ่งบริษัท ฯลฯ)
  incomes?: FinIncome[];         // รายได้อื่น ครั้งเดียว / รายเดือน
  pending: FinItem[];            // รายการที่ต้องตั้งงบเพิ่ม (0 = ยังไม่ใส่งบ)
  target: { profit: number; days: number; serviceId: string };
  extraPerRound?: number;        // รายได้อื่นต่อรอบ เช่น ค่าคอมสินค้า Vendor (Excel กิ๊ฟ ฿157.50)
  startupMonth?: string;
  /** ค่าแรกเข้าที่หักจากเคสการทำงาน: เคสละ perJob จนครบ cap ต่อคน · people = จำนวนคนที่รับเข้าระบบ (บอส 8 พ.ย. 2569) */
  entryFee?: { perJob: number; cap: number; people: number };         // ลงเงินลงทุน (ทนาย/แอป) เป็นค่าใช้จ่ายใน P&L เดือนนี้ — "" = ไม่ลง
  casesPerPerson?: number;       // เคสต่อคนต่อเดือน (บรรทัดสรุปเรทพนักงาน ค่าเริ่มต้น 25)
  monthOffset?: number;          // เลื่อนเดือนเริ่ม: M1 = ต.ค. 69 + monthOffset เดือน (ลบเดือนแรกทิ้งได้)
  monthCount?: number;           // จำนวนเดือนของแผน (ค่าเริ่มต้น 18)
  cashTargets?: Record<string, number>; // For Cash รายเดือน
  history: { at: string; by: string; note: string }[];
}

export const MAX_MONTHS = 60;
/** รายชื่อเดือนของแผน M1..Mn (n = plan.monthCount, ค่าเริ่มต้น 18) */
export const monthList = (n = 18) => Array.from({ length: Math.min(MAX_MONTHS, Math.max(1, Math.round(n))) }, (_, i) => `M${i + 1}`);
export const MONTHS = monthList(18);
export const monthsOf = (p: FinancePlan) => monthList(p.monthCount ?? 18);
/** For Cash ของเดือน (ตั้งรายเดือนได้ ไม่ตั้ง = เป้ากำไรหลัก) */
export const cashTargetOf = (p: FinancePlan, m: string) => p.cashTargets?.[m] ?? p.target.profit;
/** M1 = ต.ค. 2569 (Oct 2026) แล้วนับต่อไปทีละเดือน */
export const MONTH_START = { year: 2026, month: 9 }; // month 0-based
export function monthLabel(m: string, lang: "th" | "en" = "th", offset = 0) {
  const i = Number(/^M(\d+)$/.exec(m)?.[1] ?? 0) - 1;
  if (i < 0) return m;
  const d = new Date(Date.UTC(MONTH_START.year, MONTH_START.month + (offset || 0) + i, 1));
  return d.toLocaleDateString(lang === "th" ? "th-TH" : "en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}
export const KIND_LABEL: Record<ExpenseKind, string> = { once: "ครั้งเดียว", fixed: "บาท/เดือน", pctRevenue: "% ของรายได้บริษัท", pctGross: "% ของยอดลูกค้าจ่าย" };

export const DEFAULT_PLAN: FinancePlan = {
  capital: 6_000_000,
  startup: [],
  companyShare: 0.5,
  providerFee: 0.03,
  pgFee: 0.025,
  services: [
    { id: "eat", name: "เพื่อนเที่ยว", level: "Silver", price: 3500 },
    { id: "eat-top", name: "เพื่อนเที่ยว", level: "Top", price: 5000 },
    { id: "massage", name: "เพื่อนเที่ยว + นวด", level: "Silver", price: 6500 },
    { id: "massage-top", name: "เพื่อนเที่ยว + นวด", level: "Top", price: 10000 },
    { id: "secret", name: "Secret", level: "Top", price: 20000 },
  ],
  months: { M4: { eat: 200, "eat-top": 100, massage: 125, "massage-top": 50, secret: 25 } },
  expenses: [
    { id: "app", name: "พัฒนาแอป", kind: "once", value: 900_000, month: "M1" },
    { id: "legal", name: "กฎหมาย (สมมติ)", kind: "once", value: 500_000, month: "M1" },
    { id: "salary", name: "เงินเดือนและที่ปรึกษา", kind: "fixed", value: 300_000 },
    { id: "marketing", name: "การตลาด", kind: "fixed", value: 100_000 },
    { id: "software", name: "Software", kind: "fixed", value: 20_000 },
    { id: "amort", name: "ตัดจำหน่ายแอป (ไม่ใช่เงินสด)", kind: "fixed", value: 25_000, noncash: true },
  ],
  pending: [
    { id: "referral", name: "ค่าแนะนำรีครูท", amount: 0 },
    { id: "bonus", name: "โบนัสรีครูท", amount: 0 },
    { id: "refund", name: "ส่วนลดและคืนเงิน", amount: 0 },
    { id: "other", name: "ค่าใช้จ่ายอื่น", amount: 0 },
  ],
  target: { profit: 100_000, days: 30, serviceId: "eat" },
  history: [],
};

const r2 = (n: number) => Math.round(n * 100) / 100;
/** แผนเก่า: "เงินทุนใช้กับอะไร" (startup) → ค่าใช้จ่ายครั้งเดียว ลงเดือน startupMonth (หรือ M1) */
export function migratePlan(p: FinancePlan): FinancePlan {
  if (!p.startup?.length) return { ...p, startup: [], startupMonth: "" };
  const once: FinExpense[] = p.startup.map((i) => ({ id: "one-" + i.id, name: i.name, kind: "once", value: i.amount, month: p.startupMonth || "M1" }));
  return { ...p, expenses: [...once, ...p.expenses.filter((e) => !once.some((o) => o.id === e.id))], startup: [], startupMonth: "" };
}
const monthIdx = (m: string) => Number(/^M(\d+)$/.exec(m)?.[1] ?? 0);
/** รายได้อื่นของเดือนนี้ */
export function otherIncomeLines(p: FinancePlan, month: string) {
  return (p.incomes ?? []).map((i) => ({ ...i, amount: i.kind === "once" ? ((i.month || "M1") === month ? i.value : 0) : monthIdx(month) >= monthIdx(i.month || "M1") ? i.value : 0 }));
}
export const svcLabel = (s: FinService) => (s.level ? `${s.name} · ${s.level}` : s.name);

/** ต่อ 1 รอบของบริการราคา price */
export function perRound(p: FinancePlan, price: number) {
  const company = price * p.companyShare;
  const provider = price - company;
  const fee = provider * p.providerFee;
  const pg = price * p.pgFee;
  const extra = p.extraPerRound ?? 0;
  const revenue = company + fee + extra; // รายได้บริษัท (ก่อนหักค่าภาษี ภ.ง.ด.)
  // ค่าใช้จ่ายที่คิดเป็น % ต่อรอบ
  const pctCost = p.expenses.reduce((t, e) => t + (e.kind === "pctRevenue" ? revenue * e.value : e.kind === "pctGross" ? price * e.value : 0), 0);
  return { price, company: r2(company), provider: r2(provider), fee: r2(fee), extra: r2(extra), pg: r2(pg), pctCost: r2(pctCost), net: r2(revenue - pg - pctCost), providerNet: r2(provider - fee) };
}

/** ค่าใช้จ่ายประจำ (บาท/เดือน) — cashOnly = ไม่รวมรายการที่ไม่ใช่เงินสด (ตัดจำหน่าย) */
export const fixedTotal = (p: FinancePlan, cashOnly = false) =>
  p.expenses.filter((e) => e.kind === "fixed" && !(cashOnly && e.noncash)).reduce((t, e) => t + e.value, 0) + p.pending.reduce((t, i) => t + i.amount, 0);

const roundsIn = (p: FinancePlan, m: string) => Object.values(p.months[m] ?? {}).reduce((t, n) => t + n, 0);
/** ค่าแรกเข้าที่เก็บได้ในเดือนนี้ (หักจากเคส) */
export function entryFeeOf(p: FinancePlan, month: string) {
  const e = p.entryFee;
  if (!e || !e.perJob || !e.cap || !e.people) return 0;
  const ML = monthsOf(p), i = ML.indexOf(month);
  if (i < 0) return 0;
  const pool = e.people * e.cap;
  let cum = 0;
  for (let k = 0; k < i; k++) cum += roundsIn(p, ML[k]);
  const before = Math.min(cum * e.perJob, pool);
  const after = Math.min((cum + roundsIn(p, month)) * e.perJob, pool);
  return after - before;
}

export const LABELS = {
  gross: ["ยอดลูกค้าจ่ายรวม", "Total customer spend"],
  share: ["ส่วนแบ่งบริษัท", "Company share"],
  fee: ["ค่าธรรมเนียมผู้ให้บริการ", "Provider fee"],
  entry: ["ค่าแรกเข้า (หักจากเคส)", "Joining fee (deducted per job)"],
  extra: ["รายได้อื่นต่อรอบ (ค่าคอมสินค้า)", "Other income per booking (product commission)"],
  pg: ["ค่าภาษี ภ.ง.ด.", "Withholding tax (PND)"],
  revenue: ["รายได้บริษัท", "Company revenue"],
} as const;
export type LabelKey = keyof typeof LABELS;
/** ชื่อช่อง: ใช้ชื่อที่แก้เองถ้ามี ไม่งั้นค่าเริ่มต้นตามภาษา */
export const labelOf = (p: Pick<FinancePlan, "labels">, k: LabelKey, lang: "th" | "en" = "th") => p.labels?.[k]?.trim() || LABELS[k][lang === "en" ? 1 : 0];

/** ลบ n เดือนแรกออกจากแผน — ข้อมูลเดือนที่เหลือเลื่อนขึ้น (M3 เดิม → M1) · ค่าใช้จ่าย/รายได้ครั้งเดียวในเดือนที่ลบ ย้ายไปเดือนแรกใหม่ */
export function dropFirstMonths(p: FinancePlan, n = 1): FinancePlan {
  const count = p.monthCount ?? 18;
  n = Math.max(0, Math.min(n, count - 1));
  if (!n) return p;
  const idx = (m?: string) => Number(/^M(\d+)$/.exec(m ?? "")?.[1] ?? 1);
  const shiftKeys = <T,>(o: Record<string, T> | undefined) => {
    const r: Record<string, T> = {};
    for (const [k, v] of Object.entries(o ?? {})) { const i = idx(k); if (i > n) r[`M${i - n}`] = v; }
    return r;
  };
  const mv = (m?: string) => `M${Math.max(1, idx(m) - n)}`;
  return {
    ...p,
    months: shiftKeys(p.months),
    cashTargets: shiftKeys(p.cashTargets),
    expenses: p.expenses.map((e) => (e.kind === "once" ? { ...e, month: mv(e.month) } : e)),
    incomes: (p.incomes ?? []).map((x) => ({ ...x, month: mv(x.month) })),
    monthCount: count - n,
    monthOffset: (p.monthOffset ?? 0) + n,
  };
}

export function monthSummary(p: FinancePlan, month: string) {
  const rounds = p.months[month] ?? {};
  const rows = p.services.map((s) => {
    const n = rounds[s.id] ?? 0;
    return { s, rounds: n, gross: s.price * n };
  });
  const totalRounds = rows.reduce((t, r) => t + r.rounds, 0);
  const gross = rows.reduce((t, r) => t + r.gross, 0);
  const company = gross * p.companyShare;
  const provider = gross - company;
  const fee = provider * p.providerFee;
  const extra = totalRounds * (p.extraPerRound ?? 0);
  const entry = entryFeeOf(p, month);
  const incomeLines = otherIncomeLines(p, month);
  const other = incomeLines.reduce((t, i) => t + i.amount, 0);
  const revenue = company + fee + extra + entry + other;
  const pg = gross * p.pgFee;
  const lines = [
    ...p.expenses.filter((e) => e.kind !== "once" || (e.month || "M1") === month).map((e) => ({ id: e.id, name: e.name, kind: e.kind, value: e.value, noncash: !!e.noncash, amount: e.kind === "fixed" || e.kind === "once" ? e.value : e.kind === "pctRevenue" ? revenue * e.value : gross * e.value })),
    { id: "_pg", name: `${labelOf(p, "pg")} ${fmtPct(p.pgFee)} ของยอดลูกค้า`, kind: "pctGross" as ExpenseKind, value: p.pgFee, noncash: false, amount: pg },
    ...p.pending.filter((i) => i.amount > 0).map((i) => ({ id: i.id, name: i.name, kind: "fixed" as ExpenseKind, value: i.amount, noncash: false, amount: i.amount })),
  ];
  const expenses = lines.reduce((t, l) => t + l.amount, 0);
  const noncash = lines.filter((l) => l.noncash).reduce((t, l) => t + l.amount, 0);
  const profit = revenue - expenses;
  return {
    rows, totalRounds, gross: r2(gross), company: r2(company), provider: r2(provider), fee: r2(fee), extra: r2(extra), entry: r2(entry), other: r2(other), incomeLines, otherIncome: r2(extra + entry + other), revenue: r2(revenue), pg: r2(pg),
    lines: lines.map((l) => ({ ...l, amount: r2(l.amount) })), expenses: r2(expenses), profit: r2(profit), cash: r2(profit + noncash),
    margin: revenue > 0 ? profit / revenue : 0,
    costAll: r2(provider - fee + expenses), // ค่าใช้จ่ายทั้งหมดรวมส่วนแบ่งผู้ให้บริการ → กำไร = ยอดลูกค้าจ่าย + รายได้อื่น − costAll
    variable: r2(pg + lines.filter((l) => l.kind !== "fixed" && l.kind !== "once" && l.id !== "_pg").reduce((t, l) => t + l.amount, 0)),
  };
}

/** เป้ากำไร: ต้องขายกี่รอบ (ประเภทเดียว) */
export function targetFor(p: FinancePlan, price: number) {
  const fixed = fixedTotal(p, true);
  const net = perRound(p, price).net;
  if (net <= 0) return { net, fixed, rounds: null, perDay: null, breakeven: null, profit: null };
  const rounds = Math.ceil((p.target.profit + fixed) / net - 1e-9);
  return { net, fixed, rounds, perDay: Math.ceil(rounds / Math.max(1, p.target.days)), breakeven: Math.ceil(fixed / net - 1e-9), profit: r2(rounds * net - fixed) };
}

/** เป้ากำไรแบบหลายประเภท — แบ่งรอบตามสัดส่วนของเดือนที่เลือก */
export function targetMix(p: FinancePlan, month: string) {
  const r = p.months[month] ?? {};
  const total = p.services.reduce((t, s) => t + (r[s.id] ?? 0), 0);
  if (!total) return null;
  const mix = p.services.map((s) => ({ s, w: (r[s.id] ?? 0) / total }));
  const net = mix.reduce((t, m) => t + m.w * perRound(p, m.s.price).net, 0);
  const fixed = fixedTotal(p, true);
  if (net <= 0) return null;
  const rounds = Math.ceil((p.target.profit + fixed) / net - 1e-9);
  return { net: r2(net), fixed, rounds, perDay: Math.ceil(rounds / Math.max(1, p.target.days)), breakeven: Math.ceil(fixed / net - 1e-9), profit: r2(rounds * net - fixed), split: mix.map((m) => ({ s: m.s, w: m.w, rounds: Math.round(rounds * m.w) })) };
}

export const fmt = (n: number, d = 0) => n.toLocaleString("th-TH", { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmt2 = (n: number) => (Number.isInteger(n) ? fmt(n) : fmt(n, 2));
export const fmtPct = (f: number) => `${r2(f * 100)}%`;

// ─── ตรวจข้อมูลก่อนบันทึก (ฝั่งเซิร์ฟเวอร์) ───
const num = (v: unknown, lo: number, hi: number, label: string) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < lo || n > hi) throw new Error(`${label}: ต้องอยู่ระหว่าง ${fmt(lo)}–${fmt(hi)}`);
  return n;
};
const txt = (v: unknown, label: string) => {
  const s = String(v ?? "").trim().slice(0, 60);
  if (!s) throw new Error(`กรอกชื่อ${label}`);
  return s;
};
const id = (v: unknown) => String(v ?? "").replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || Math.random().toString(36).slice(2, 10);
const list = <T,>(v: unknown, max: number, f: (x: Record<string, unknown>) => T): T[] => {
  if (!Array.isArray(v)) throw new Error("ข้อมูลไม่ถูกต้อง");
  if (v.length > max) throw new Error(`รายการเกิน ${max} แถว`);
  return v.map((x) => f((x ?? {}) as Record<string, unknown>));
};

export function cleanPlan(raw: unknown): Omit<FinancePlan, "history"> {
  const b = (raw ?? {}) as Record<string, unknown>;
  const services = list(b.services, 20, (x) => ({ id: id(x.id), name: txt(x.name, "บริการ"), level: String(x.level ?? "").trim().slice(0, 30), price: num(x.price, 0, 1_000_000, "ราคา") }));
  if (!services.length) throw new Error("ต้องมีบริการอย่างน้อย 1 รายการ");
  const ids = new Set(services.map((s) => s.id));
  if (ids.size !== services.length) throw new Error("รหัสบริการซ้ำ");
  const mIn = (b.months ?? {}) as Record<string, Record<string, unknown>>;
  const months: FinancePlan["months"] = {};
  const monthCount = Math.round(num(b.monthCount ?? 18, 1, MAX_MONTHS, "จำนวนเดือน"));
  const ml = monthList(monthCount);
  const cIn = (b.cashTargets ?? {}) as Record<string, unknown>;
  const cashTargets: Record<string, number> = {};
  for (const m of ml) if (cIn[m] != null && cIn[m] !== "") cashTargets[m] = num(cIn[m], -1e10, 1e10, `For Cash ${m}`);
  for (const m of ml) {
    if (!mIn[m]) continue;
    const row: Record<string, number> = {};
    for (const s of services) { const n = num(mIn[m][s.id] ?? 0, 0, 100_000, `จำนวนรอบ ${m}`); if (n) row[s.id] = Math.round(n); }
    if (Object.keys(row).length) months[m] = row;
  }
  const t = (b.target ?? {}) as Record<string, unknown>;
  return {
    capital: num(b.capital, 0, 1e10, "ทุนเริ่มต้น"),
    startup: list(b.startup ?? [], 30, (x) => ({ id: id(x.id), name: txt(x.name, "รายการเงินทุน"), amount: num(x.amount, 0, 1e10, "จำนวนเงิน") })),
    companyShare: num(b.companyShare, 0, 1, "ส่วนแบ่งบริษัท"),
    providerFee: num(b.providerFee, 0, 0.5, "ค่าธรรมเนียมผู้ให้บริการ"),
    pgFee: num(b.pgFee, 0, 0.2, "ค่าภาษี ภ.ง.ด."),
    services,
    months,
    expenses: list(b.expenses, 60, (x) => {
      const kind: ExpenseKind = x.kind === "pctRevenue" || x.kind === "pctGross" || x.kind === "once" ? x.kind : "fixed";
      const pct = kind === "pctRevenue" || kind === "pctGross";
      return { id: id(x.id), name: txt(x.name, "ค่าใช้จ่าย"), kind, value: pct ? num(x.value, 0, 1, "เปอร์เซ็นต์") : num(x.value, 0, 1e10, "ค่าใช้จ่าย"), ...(x.noncash ? { noncash: true } : {}), ...(kind === "once" ? { month: ml.includes(String(x.month)) ? String(x.month) : "M1" } : {}) };
    }),
    labels: (() => { const o = (b.labels ?? {}) as Record<string, unknown>; const r: Partial<Record<LabelKey, string>> = {}; for (const k of Object.keys(LABELS) as LabelKey[]) { const v = typeof o[k] === "string" ? (o[k] as string).trim().slice(0, 120) : ""; if (v) r[k] = v; } return r; })(),
    incomes: list(b.incomes ?? [], 40, (x) => ({ id: id(x.id), name: txt(x.name, "รายได้"), kind: (x.kind === "once" ? "once" : "monthly") as IncomeKind, value: num(x.value, 0, 1e10, "รายได้"), month: ml.includes(String(x.month)) ? String(x.month) : "M1" })),
    pending: list(b.pending, 20, (x) => ({ id: id(x.id), name: txt(x.name, "รายการ"), amount: num(x.amount, 0, 1e10, "งบ") })),
    monthCount,
    casesPerPerson: Math.round(num(b.casesPerPerson ?? 25, 1, 1000, "เคสต่อคน")),
    monthOffset: Math.round(num(b.monthOffset ?? 0, 0, 120, "เลื่อนเดือนเริ่ม")),
    cashTargets,
    extraPerRound: num(b.extraPerRound ?? 0, 0, 1_000_000, "รายได้อื่นต่อรอบ"),
    entryFee: (() => { const e = (b.entryFee ?? {}) as Record<string, unknown>; return { perJob: num(e.perJob ?? 0, 0, 1_000_000, "ค่าแรกเข้าต่อเคส"), cap: num(e.cap ?? 0, 0, 10_000_000, "เพดานค่าแรกเข้า"), people: Math.round(num(e.people ?? 0, 0, 100_000, "จำนวนคน")) }; })(),
    startupMonth: ml.includes(String(b.startupMonth ?? "")) ? String(b.startupMonth) : "",
    target: { profit: num(t.profit, 0, 1e10, "เป้ากำไร"), days: Math.round(num(t.days, 1, 31, "วันทำงาน")), serviceId: ids.has(String(t.serviceId)) ? String(t.serviceId) : services[0].id },
  };
}

/** ชุดตัวเลข Forecast v4 — Excel ของกิ๊ฟ (ราคา 3,500 · หมอนวด 40% · PG 2.5% · ค่าคอมสินค้า 157.50/รอบ) + SIRI 8 พ.ย. 2569
 *  (ค่าใช้จ่ายรายเดือน 300K/100K/Server 30K · ทนาย 500K + แอป 900K ลง M1 · ตัดจังหวัด · 25 คน × 2 รอบ × 15 วัน = 750 รอบ ธ.ค. → กำไรเริ่ม ธ.ค. 69)
 *  บอส 8 พ.ย.: ทุน 10 ล้าน (ระดม 6 ล้าน) · เป้า 50 คน active 25 × 2 งาน × 15 วัน = 750 เคส/เดือน คงที่ · ค่าแรกเข้าหักจากเคส 500 จนครบ 10,000 */
export const PRESET_V4: FinancePlan = {
  ...DEFAULT_PLAN,
  capital: 10_000_000, // บอส: คำนวณที่ 10 ล้าน (ระดมจริง 6 ล้าน)
  startup: [], startupMonth: "",
  companyShare: 0.6, providerFee: 0, pgFee: 0.025, extraPerRound: 157.5,
  months: Object.fromEntries([0, 100, ...Array(16).fill(750)].map((n, i) => [`M${i + 1}`, n ? { eat: n } : {}]).filter(([, v]) => Object.keys(v as object).length)),
  expenses: [
    { id: "lawyer", name: "ค่าทนาย / จัดตั้ง", kind: "once", value: 500_000, month: "M1" },
    { id: "app", name: "พัฒนาแอป", kind: "once", value: 900_000, month: "M1" },
    { id: "salary", name: "เงินเดือนพนักงาน + ที่ปรึกษา", kind: "fixed", value: 300_000 },
    { id: "marketing", name: "การตลาด", kind: "fixed", value: 100_000 },
    { id: "server", name: "Server / ระบบ (ประมาณการ)", kind: "fixed", value: 30_000 },
  ],
  pending: [],
  entryFee: { perJob: 500, cap: 10_000, people: 50 },
  incomes: [],
  monthCount: 18, cashTargets: {},
  target: { profit: 100_000, days: 15, serviceId: "eat" },
  history: [],
};
