import "server-only";
import { notify } from "@/lib/bookings";

// แจ้งพาร์ทเนอร์/ร้านค้าเมื่อคำขอถอนเปลี่ยนสถานะ — เรียกจาก lib/payouts (approvePayout / settlePayout) · ไม่ throw
// ลูกค้ามีข้อความของตัวเองใน lib/payouts อยู่แล้ว → ข้าม
type Req = { owner_type: string; owner_id: string; amount_satang: number | string; bank: { bank: string; account: string } };
const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 });

export async function notifyPayoutOwner(r: Req, event: "approved" | "paid" | "failed" | "rejected", note = "") {
  if (r.owner_type !== "partner" && r.owner_type !== "vendor") return;
  const amt = baht(Number(r.amount_satang));
  const url = r.owner_type === "partner" ? "/partner/portal/wallet" : "/vendor";
  const msg = {
    approved: { title: `อนุมัติถอน ${amt} แล้ว`, body: "ทีมงานกำลังโอนเข้าบัญชีของคุณ" },
    paid: { title: `โอน ${amt} เข้าบัญชีแล้ว`, body: `${r.bank.bank} · ${r.bank.account}` },
    failed: { title: "โอนเงินไม่สำเร็จ", body: `${note ? `${note} · ` : ""}คืน ${amt} เข้ากระเป๋าแล้ว` },
    rejected: { title: "คำขอถอนไม่ได้รับอนุมัติ", body: `${note ? `${note} · ` : ""}คืน ${amt} เข้ากระเป๋าแล้ว` },
  }[event];
  await notify({ user_type: r.owner_type, user_id: r.owner_id, kind: `payout_${event}`, title: msg.title, body: msg.body, url }).catch((e) => console.error("payout notify", e));
}
