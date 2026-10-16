import "server-only";

// ตรวจสลิปผ่าน Slip2Go (https://connect.slip2go.com) — endpoint "ตรวจสอบสลิปด้วยรูปภาพ"
// ไม่มี SLIP2GO_API_SECRET → คืน null (ข้ามการตรวจ ให้แอดมินดูสลิปเองเหมือนเดิม)

const URL = "https://connect.slip2go.com/api/verify-slip/qr-image/info";

/** ok = ยอดตรง + ยืนยันได้ว่าเข้าบัญชีร้าน + สลิปไม่เก่า · check = ยอดตรงแต่เทียบบัญชีผู้รับไม่ได้หรือสลิปเก่าเกิน 48 ชม. (ให้แอดมินดู)
 *  acct = โอนเข้าบัญชีอื่น · amt = ยอดไม่ตรง · dup = สลิปซ้ำ · fake = ไม่พบรายการ/อ่านไม่ได้ · error = ระบบตรวจขัดข้อง */
export type SlipVerdict = "ok" | "check" | "acct" | "amt" | "dup" | "fake" | "error";
const MAX_AGE_MS = 48 * 3600_000;

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
    const ours = receiverIsOurs(d.receiver);
    if (ours === false) return { ...out, verdict: "acct" };
    if (Math.abs(amount - expected) >= 0.01) return { ...out, verdict: "amt" };
    // ผ่านอัตโนมัติได้เฉพาะเมื่อยืนยันได้ว่าเข้าบัญชีร้านจริง และสลิปไม่เก่า — ที่เหลือให้แอดมินดู (กันสลิปโอนเข้าพร้อมเพย์คนอื่น/สลิปเก่า)
    const at = out.date_time ? Date.parse(out.date_time) : NaN;
    const fresh = Number.isFinite(at) && Date.now() - at < MAX_AGE_MS && at < Date.now() + 10 * 60_000;
    return { ...out, verdict: ours === true && fresh ? "ok" : "check" };
  } catch (e) {
    console.error("slip2go failed", e);
    return { ...base, verdict: "error", code: "", message: "ตรวจสลิปไม่สำเร็จ" };
  }
}

/** ทดสอบว่าคีย์ Slip2Go ใช้ได้ (แอดมินกดจากหน้าภาพรวม) — ส่งรูปเปล่า 1×1 ไม่ใช่สลิปจริง จึงไม่กินโควตาตรวจสลิปที่สำเร็จ
 *  ok = เซิร์ฟเวอร์รับคีย์ (ตอบว่าอ่านสลิปไม่ได้ตามคาด) · ไม่ ok = คีย์ผิด/หมดอายุ/แพ็กหมด/เชื่อมต่อไม่ได้ */
export async function slip2goPing(): Promise<{ ok: boolean; status: number; code: string; message: string }> {
  const secret = process.env.SLIP2GO_API_SECRET;
  if (!secret) return { ok: false, status: 0, code: "", message: "ยังไม่ได้ตั้ง SLIP2GO_API_SECRET" };
  try {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
    const fd = new FormData();
    fd.append("file", new Blob([png], { type: "image/png" }), "ping.png");
    fd.append("payload", JSON.stringify({ checkDuplicate: false }));
    const res = await fetch(URL, { method: "POST", headers: { Authorization: `Bearer ${secret}` }, body: fd, signal: AbortSignal.timeout(15_000) });
    const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
    const code = String(body.code ?? res.status), message = String(body.message ?? "");
    const denied = res.status === 401 || res.status === 403 || res.status >= 500 || /unauthori|forbidden|invalid.*(token|key|secret)|expire|หมดอายุ|package|quota|credit|insufficient/i.test(message);
    return { ok: !denied, status: res.status, code, message };
  } catch (e) {
    return { ok: false, status: 0, code: "", message: e instanceof Error ? e.message : "เชื่อมต่อไม่ได้" };
  }
}
