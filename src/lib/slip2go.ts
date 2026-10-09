import "server-only";

// ตรวจสลิปผ่าน Slip2Go (https://connect.slip2go.com) — endpoint "ตรวจสอบสลิปด้วยรูปภาพ"
// ไม่มี SLIP2GO_API_SECRET → คืน null (ข้ามการตรวจ ให้แอดมินดูสลิปเองเหมือนเดิม)

const URL = "https://connect.slip2go.com/api/verify-slip/qr-image/info";

/** ok = ยอดตรง · amt = ยอดไม่ตรง · dup = สลิปซ้ำ · fake = ไม่พบรายการ/อ่านไม่ได้ · error = ระบบตรวจขัดข้อง */
export type SlipVerdict = "ok" | "amt" | "dup" | "fake" | "error";

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
    return { ...out, verdict: Math.abs(amount - expected) < 0.01 ? "ok" : "amt" };
  } catch (e) {
    console.error("slip2go failed", e);
    return { ...base, verdict: "error", code: "", message: "ตรวจสลิปไม่สำเร็จ" };
  }
}
