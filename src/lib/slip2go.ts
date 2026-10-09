import "server-only";

// ตรวจสลิปผ่าน Slip2Go (https://connect.slip2go.com) — endpoint "ตรวจสอบสลิปด้วยรูปภาพ"
// ไม่มี SLIP2GO_API_SECRET → คืน null (ข้ามการตรวจ ให้แอดมินดูสลิปเองเหมือนเดิม)

const URL = "https://connect.slip2go.com/api/verify-slip/qr-image/info";

/** ok = ยอดตรง · acct = โอนเข้าบัญชีอื่น · amt = ยอดไม่ตรง · dup = สลิปซ้ำ · fake = ไม่พบรายการ/อ่านไม่ได้ · error = ระบบตรวจขัดข้อง */
export type SlipVerdict = "ok" | "acct" | "amt" | "dup" | "fake" | "error";

export interface SlipCheck {
  verdict: SlipVerdict;
  code: string;
  message: string;
  amount: number | null;
  expected: number;
  trans_ref: string | null;
  sender: string | null;
  receiver: string | null;
  date_time: string | null;
  checked_at: string;
}

/** บัญชีรับเงินของร้าน (ตรงกับที่ตั้งใน Slip2Go → บัญชีธนาคาร) — เพิ่ม/แก้ได้ด้วย env SLIP2GO_RECEIVERS คั่นด้วย , */
const RECEIVERS = (process.env.SLIP2GO_RECEIVERS || "004999252592844,1912499789").split(",").map((x) => x.replace(/\D/g, "")).filter(Boolean);

/** เลขบัญชีในสลิปมักถูกปิดบางหลัก เช่น "xxx-x-x4997-x" → เทียบเฉพาะหลักที่เห็น (ชิดขวา) ต้องเห็นอย่างน้อย 3 หลัก */
function maskMatches(masked: string, full: string): boolean {
  const m = masked.replace(/[^0-9xX*]/g, "");
  if (m.length !== full.length || (m.match(/\d/g) ?? []).length < 3) return false;
  return [...m].every((c, i) => !/\d/.test(c) || c === full[i]);
}

/** ดึงเลขบัญชี/พร้อมเพย์ทุกตัวใน receiver แล้วดูว่าตรงบัญชีร้านไหม; null = สลิปไม่มีข้อมูลให้เทียบ */
function receiverIsOurs(receiver: unknown): boolean | null {
  const found: string[] = [];
  const walk = (v: unknown, key = "") => {
    if (typeof v === "string" && /account|proxy|value/i.test(key) && /\d{3}/.test(v)) found.push(v);
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(receiver);
  // เทียบได้เฉพาะเลขที่ความยาวตรงกับบัญชีร้าน — รูปแบบอื่นที่ไม่รู้จัก ถือว่าเทียบไม่ได้ (ไม่กล่าวหาว่าผิดบัญชี)
  const comparable = found.filter((m) => RECEIVERS.some((r) => m.replace(/[^0-9xX*]/g, "").length === r.length));
  if (!comparable.length) return null;
  return comparable.some((m) => RECEIVERS.some((r) => maskMatches(m, r)));
}

const str = (v: unknown) => (typeof v === "string" && v ? v : null);
/** ชื่อบัญชีจาก sender/receiver — name อาจเป็น string หรือ { th, en } */
const nameOf = (p: unknown): string | null => {
  const name = ((p ?? {}) as { account?: { name?: unknown } }).account?.name;
  if (typeof name === "string") return name || null;
  const n = (name ?? {}) as { th?: unknown; en?: unknown };
  return str(n.th) ?? str(n.en);
};

export async function verifySlip(file: File, expected: number): Promise<SlipCheck | null> {
  const secret = process.env.SLIP2GO_API_SECRET;
  if (!secret) return null;
  const base = { expected, amount: null, trans_ref: null, sender: null, receiver: null, date_time: null, checked_at: new Date().toISOString() };
  try {
    const fd = new FormData();
    fd.append("file", file, file.name || "slip.jpg");
    fd.append("payload", JSON.stringify({ checkDuplicate: true }));
    const res = await fetch(URL, { method: "POST", headers: { Authorization: `Bearer ${secret}` }, body: fd, signal: AbortSignal.timeout(15_000) });
    const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string; data?: Record<string, unknown> };
    const code = String(body.code ?? res.status);
    const message = String(body.message ?? "");
    const d = body.data ?? {};
    const amount = typeof d.amount === "number" ? d.amount : Number(d.amount) || null;
    const out = { ...base, code, message, amount, trans_ref: str(d.transRef), sender: nameOf(d.sender), receiver: nameOf(d.receiver), date_time: str(d.dateTime) };
    if (/duplicate|ซ้ำ/i.test(message)) return { ...out, verdict: "dup" };
    if (!res.ok || !code.startsWith("2") || amount === null) return { ...out, verdict: res.status >= 500 ? "error" : "fake" };
    if (receiverIsOurs(d.receiver) === false) return { ...out, verdict: "acct" };
    return { ...out, verdict: Math.abs(amount - expected) < 0.01 ? "ok" : "amt" };
  } catch (e) {
    console.error("slip2go failed", e);
    return { ...base, verdict: "error", code: "", message: "ตรวจสลิปไม่สำเร็จ" };
  }
}
