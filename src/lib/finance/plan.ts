// แผนการเงินหลังบ้าน (/finance) — ตัวเลขที่ฝ่ายการเงินกรอกเอง + สูตรคำนวณ (ใช้ร่วมกันทั้งฝั่งเซิร์ฟเวอร์และหน้าเว็บ)
// อ้างอิงสไลด์ Canva "Update MB" หน้า 8 (ภาพรวม) · 9 (รายละเอียดต้นทุน) · 10 (วางเป้ากำไร) — 6 พ.ย. 2569
// เป็น "แผนจำลอง" เท่านั้น ไม่แตะเงินจริง/กระเป๋า/ราคาที่ลูกค้าเห็น

export type ExpenseKind = "fixed" | "pctRevenue" | "pctGross";
export interface FinService { id: string; name: string; level: string; price: number }
export interface FinExpense { id: string; name: string; kind: ExpenseKind; value: number; noncash?: boolean }
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
  expenses: FinExpense[];        // ค่าใช้จ่ายรายเดือน
  pending: FinItem[];            // รายการที่ต้องตั้งงบเพิ่ม (0 = ยังไม่ใส่งบ)
  target: { profit: number; days: number; serviceId: string };
  history: { at: string; by: string; note: string }[];
}

export const MONTHS = Array.from({ length: 18 }, (_, i) => `M${i + 1}`);
/** M1 = ต.ค. 2569 (Oct 2026) แล้วนับต่อไปทีละเดือน */
export const MONTH_START = { year: 2026, month: 9 }; // month 0-based
export function monthLabel(m: string, lang: "th" | "en" = "th") {
  const i = MONTHS.indexOf(m);
  if (i < 0) return m;
  const d = new Date(Date.UTC(MONTH_START.year, MONTH_START.month + i, 1));
  return d.toLocaleDateString(lang === "th" ? "th-TH" : "en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}
export const KIND_LABEL: Record<ExpenseKind, string> = { fixed: "บาท/เดือน", pctRevenue: "% ของรายได้บริษัท", pctGross: "% ของยอดลูกค้าจ่าย" };

export const DEFAULT_PLAN: FinancePlan = {
  capital: 6_000_000,
  startup: [
    { id: "app", name: "พัฒนาแอป", amount: 900_000 },
    { id: "audition", name: "Audition 3 จังหวัด", amount: 1_200_000 },
    { id: "legal", name: "กฎหมาย (สมมติ)", amount: 500_000 },
  ],
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
export const svcLabel = (s: FinService) => (s.level ? `${s.name} · ${s.level}` : s.name);

/** ต่อ 1 รอบของบริการราคา price */
export function perRound(p: FinancePlan, price: number) {
  const company = price * p.companyShare;
  const provider = price - company;
  const fee = provider * p.providerFee;
  const pg = price * p.pgFee;
  const revenue = company + fee; // รายได้บริษัท (ก่อนหักค่าภาษี ภ.ง.ด.)
  // ค่าใช้จ่ายที่คิดเป็น % ต่อรอบ
  const pctCost = p.expenses.reduce((t, e) => t + (e.kind === "pctRevenue" ? revenue * e.value : e.kind === "pctGross" ? price * e.value : 0), 0);
  return { price, company: r2(company), provider: r2(provider), fee: r2(fee), pg: r2(pg), pctCost: r2(pctCost), net: r2(revenue - pg - pctCost), providerNet: r2(provider - fee) };
}

/** ค่าใช้จ่ายประจำ (บาท/เดือน) — cashOnly = ไม่รวมรายการที่ไม่ใช่เงินสด (ตัดจำหน่าย) */
export const fixedTotal = (p: FinancePlan, cashOnly = false) =>
  p.expenses.filter((e) => e.kind === "fixed" && !(cashOnly && e.noncash)).reduce((t, e) => t + e.value, 0) + p.pending.reduce((t, i) => t + i.amount, 0);

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
  const revenue = company + fee;
  const pg = gross * p.pgFee;
  const lines = [
    ...p.expenses.map((e) => ({ id: e.id, name: e.name, kind: e.kind, value: e.value, noncash: !!e.noncash, amount: e.kind === "fixed" ? e.value : e.kind === "pctRevenue" ? revenue * e.value : gross * e.value })),
    { id: "_pg", name: `ค่าภาษี ภ.ง.ด. ${fmtPct(p.pgFee)} ของยอดลูกค้า`, kind: "pctGross" as ExpenseKind, value: p.pgFee, noncash: false, amount: pg },
    ...p.pending.filter((i) => i.amount > 0).map((i) => ({ id: i.id, name: i.name, kind: "fixed" as ExpenseKind, value: i.amount, noncash: false, amount: i.amount })),
  ];
  const expenses = lines.reduce((t, l) => t + l.amount, 0);
  const noncash = lines.filter((l) => l.noncash).reduce((t, l) => t + l.amount, 0);
  const profit = revenue - expenses;
  return {
    rows, totalRounds, gross: r2(gross), company: r2(company), provider: r2(provider), fee: r2(fee), revenue: r2(revenue), pg: r2(pg),
    lines: lines.map((l) => ({ ...l, amount: r2(l.amount) })), expenses: r2(expenses), profit: r2(profit), cash: r2(profit + noncash),
    margin: revenue > 0 ? profit / revenue : 0,
    variable: r2(pg + lines.filter((l) => l.kind !== "fixed" && l.id !== "_pg").reduce((t, l) => t + l.amount, 0)),
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
  for (const m of MONTHS) {
    if (!mIn[m]) continue;
    const row: Record<string, number> = {};
    for (const s of services) { const n = num(mIn[m][s.id] ?? 0, 0, 100_000, `จำนวนรอบ ${m}`); if (n) row[s.id] = Math.round(n); }
    if (Object.keys(row).length) months[m] = row;
  }
  const t = (b.target ?? {}) as Record<string, unknown>;
  return {
    capital: num(b.capital, 0, 1e10, "ทุนเริ่มต้น"),
    startup: list(b.startup, 30, (x) => ({ id: id(x.id), name: txt(x.name, "รายการเงินทุน"), amount: num(x.amount, 0, 1e10, "จำนวนเงิน") })),
    companyShare: num(b.companyShare, 0, 1, "ส่วนแบ่งบริษัท"),
    providerFee: num(b.providerFee, 0, 0.5, "ค่าธรรมเนียมผู้ให้บริการ"),
    pgFee: num(b.pgFee, 0, 0.2, "ค่าภาษี ภ.ง.ด."),
    services,
    months,
    expenses: list(b.expenses, 40, (x) => {
      const kind: ExpenseKind = x.kind === "pctRevenue" || x.kind === "pctGross" ? x.kind : "fixed";
      return { id: id(x.id), name: txt(x.name, "ค่าใช้จ่าย"), kind, value: kind === "fixed" ? num(x.value, 0, 1e10, "ค่าใช้จ่าย") : num(x.value, 0, 1, "เปอร์เซ็นต์"), ...(x.noncash ? { noncash: true } : {}) };
    }),
    pending: list(b.pending, 20, (x) => ({ id: id(x.id), name: txt(x.name, "รายการ"), amount: num(x.amount, 0, 1e10, "งบ") })),
    target: { profit: num(t.profit, 0, 1e10, "เป้ากำไร"), days: Math.round(num(t.days, 1, 31, "วันทำงาน")), serviceId: ids.has(String(t.serviceId)) ? String(t.serviceId) : services[0].id },
  };
}
