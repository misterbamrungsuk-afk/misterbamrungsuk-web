import "server-only";
import { listApplicants } from "@/lib/join/store";
import type { Withdrawal } from "@/lib/bookings/day";

const digits = (s: string | null | undefined) => String(s ?? "").replace(/\D/g, "");

export type WithdrawInfo = { name: string; nick: string; newBank: boolean; firstTime: boolean };

/**
 * ข้อมูลประกอบคำขอถอน Part-Time: ชื่อจริง + บัญชีปลายทางต่างจากบัญชีที่โอนสำเร็จครั้งล่าสุดไหม
 * (กันคนได้คุกกี้/ลิงก์ไปแล้วเปลี่ยนบัญชีรับเงินก่อนถอน) · all = รายการถอนทั้งหมด (รวมที่โอนแล้ว)
 */
export async function withdrawInfo(targets: Withdrawal[], all: Withdrawal[]): Promise<Record<string, WithdrawInfo>> {
  const apps = await listApplicants().catch(() => []);
  const byId = new Map(apps.map((a) => [a.id, a]));
  const lastPaid = new Map<string, Withdrawal>();
  for (const w of all) {
    if (w.status !== "paid") continue;
    const cur = lastPaid.get(w.parttime_id);
    const at = (x: Withdrawal) => Date.parse(x.paid_at ?? x.created_at) || 0;
    if (!cur || at(w) > at(cur)) lastPaid.set(w.parttime_id, w);
  }
  const out: Record<string, WithdrawInfo> = {};
  for (const w of targets) {
    const a = byId.get(w.parttime_id);
    const lp = lastPaid.get(w.parttime_id);
    out[w.id] = {
      name: a ? `${a.title ?? ""}${a.first_name} ${a.last_name}`.trim() : "",
      nick: a?.nickname ?? "",
      newBank: !!lp && (digits(lp.bank.account) !== digits(w.bank.account) || lp.bank.bank !== w.bank.bank),
      firstTime: !lp,
    };
  }
  return out;
}
