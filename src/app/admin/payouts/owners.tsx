"use client";

// โอนให้พาร์ทเนอร์ / ร้านค้า — แสดงคำขอที่ CEO อนุมัติแล้ว → แอดมินโอนเข้าบัญชี แล้วกด "โอนแล้ว" · โอนไม่สำเร็จ = คืนยอดเข้ากระเป๋า
import { useEffect, useState } from "react";
import { EXPIRED, useConfirm } from "../confirm";

type Bank = { bank: string; account: string; name: string };
type R = { id: string; owner_type: "partner" | "vendor"; owner_id: string; owner_name: string; amount_satang: number; bank: Bank; status: string; note: string | null; created_at: string; approved_at: string | null; paid_at: string | null };
type Wl = { owner_type: string; owner_id: string; available: number; withdrawing: number };
const GOLD = "#f0c75a";
const LINE = "rgba(240,200,90,.38)";
const baht = (s: number) => "฿" + (Number(s) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });
const day = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const LABEL = { partner: "พาร์ทเนอร์ (โรงแรม · สปา)", vendor: "ร้านค้า Marketplace" } as const;

export function OwnerPayouts() {
  const [d, setD] = useState<{ requests: R[]; wallets: Wl[] } | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [fail, setFail] = useState<Record<string, string>>({});
  const [confirmUi, ask] = useConfirm();
  const load = () => fetch("/api/admin/payout-requests", { cache: "no-store" }).then((r) => r.json()).then((j) => setD(j?.ok ? j : { requests: [], wallets: [] })).catch(() => setD({ requests: [], wallets: [] }));
  useEffect(() => { load(); }, []);
  const act = async (id: string, action: "paid" | "failed", label: string) => {
    const x = d?.requests.find((r) => r.id === id);
    // โอนแล้ว/โอนไม่สำเร็จ = ปิดรายการเงิน ย้อนไม่ได้ → ยืนยันก่อน
    if (x && !(await ask(action === "paid"
      ? { title: "บันทึกว่าโอนแล้ว?", body: `${x.owner_name} · ${baht(x.amount_satang)}
${x.bank.bank} ${x.bank.account} · ${x.bank.name}
กดหลังเงินออกจากบัญชีบริษัทจริงเท่านั้น`, ok: "โอนแล้ว" }
      : { title: "บันทึกว่าโอนไม่สำเร็จ?", body: `${x.owner_name} · ${baht(x.amount_satang)}
เหตุผล: ${fail[id] ?? ""}
ยอดจะคืนเข้ากระเป๋า`, ok: "โอนไม่สำเร็จ", danger: true }))) return;
    setBusy(id); setMsg("");
    const r = await fetch("/api/admin/payout-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id, note: fail[id] }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) ?? {};
    setBusy(""); setMsg(r?.status === 401 ? EXPIRED : j.ok ? label : j.error ?? "บันทึกไม่สำเร็จ"); load();
  };
  if (!d) return <p className="text-[#9a8a85]">กำลังโหลด…</p>;
  const name = (t: string, id: string) => d.requests.find((r) => r.owner_type === t && r.owner_id === id)?.owner_name ?? id.slice(0, 8);
  return (
    <div className="flex flex-col gap-4">
      {msg && <p className="m-0 rounded-xl px-3 py-2 text-[13.5px]" style={{ background: "rgba(240,199,90,.1)", color: GOLD }} role="status">{msg}{msg === EXPIRED && <> · <a href="/admin-login" className="underline">ไปหน้าเข้าสู่ระบบ</a></>}</p>}
      {confirmUi}
      {(["partner", "vendor"] as const).map((t) => {
        const ready = d.requests.filter((r) => r.owner_type === t && r.status === "approved");
        const wait = d.requests.filter((r) => r.owner_type === t && r.status === "requested").length;
        const done = d.requests.filter((r) => r.owner_type === t && ["paid", "failed", "rejected"].includes(r.status)).slice(0, 8);
        return (
          <section key={t} className="flex flex-col gap-2">
            <h2 className="m-0 text-[17px] font-semibold">โอนให้{LABEL[t]} <span className="text-[13px] font-normal text-[#9a8a85]">· รอ CEO อนุมัติ {wait} รายการ</span></h2>
            <div className="rounded-2xl border" style={{ borderColor: LINE }}>
              {!ready.length && <p className="m-0 p-5 text-center text-[#9a8a85]">ไม่มีรายการที่ CEO อนุมัติแล้วรอโอน</p>}
              {ready.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2 px-3.5 py-3 border-t first:border-t-0" style={{ borderColor: LINE }}>
                  <span className="flex-1 min-w-[240px]"><b className="font-medium">{r.owner_name}</b>
                    <span className="block text-[13px] select-all">{r.bank.bank} · {r.bank.account} · {r.bank.name}</span>
                    <span className="block text-[12px] text-[#9a8a85]">ขอ {day(r.created_at)}{r.approved_at ? ` · CEO อนุมัติ ${day(r.approved_at)}` : ""}</span></span>
                  <b className="tabular-nums" style={{ color: GOLD }}>{baht(r.amount_satang)}</b>
                  <button type="button" disabled={!!busy} onClick={() => act(r.id, "paid", `บันทึกโอนแล้ว ${r.owner_name} ${baht(r.amount_satang)}`)} className="h-10 px-3 rounded-xl font-semibold text-[#1b130b] disabled:opacity-40" style={{ background: GOLD }}>✓ โอนแล้ว</button>
                  <input value={fail[r.id] ?? ""} onChange={(e) => setFail({ ...fail, [r.id]: e.target.value })} placeholder="เหตุผลถ้าโอนไม่สำเร็จ" className="h-10 w-44 rounded-xl border bg-[#130e0e] px-2 text-[12.5px]" style={{ borderColor: LINE }} />
                  <button type="button" disabled={!!busy || !(fail[r.id] ?? "").trim()} onClick={() => act(r.id, "failed", `บันทึกโอนไม่สำเร็จ · คืนยอดให้ ${r.owner_name} แล้ว`)} className="h-10 px-2.5 rounded-xl border text-[12.5px] text-[#fecaca] disabled:opacity-35" style={{ borderColor: "rgba(201,40,61,.6)" }}>โอนไม่สำเร็จ</button>
                </div>
              ))}
            </div>
            {done.length > 0 && (
              <details className="text-[13px] text-[#9a8a85]"><summary className="cursor-pointer">ประวัติล่าสุด</summary>
                <ul className="m-0 mt-1 pl-4">{done.map((r) => <li key={r.id}>{r.owner_name} · {baht(r.amount_satang)} · {r.status === "paid" ? `โอนแล้ว ${r.paid_at ? day(r.paid_at) : ""}` : r.status === "rejected" ? `CEO ไม่อนุมัติ${r.note ? ` (${r.note})` : ""}` : `โอนไม่สำเร็จ${r.note ? ` (${r.note})` : ""}`}</li>)}</ul>
              </details>
            )}
          </section>
        );
      })}
      <section className="flex flex-col gap-2">
        <h2 className="m-0 text-[17px] font-semibold">ยอดในกระเป๋าแต่ละเจ้า</h2>
        <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: LINE }}>
          {!d.wallets.length ? <p className="m-0 p-5 text-center text-[#9a8a85]">ยังไม่มียอด · ค่าห้องเข้ากระเป๋าสปาเมื่อนัดจบ · ส่วนของร้านเข้าเมื่อออเดอร์สำเร็จ</p> : (
            <table className="w-full text-[13.5px]">
              <thead><tr className="text-left text-[#9a8a85]"><th className="px-3.5 py-2 font-normal">ประเภท</th><th className="font-normal">ชื่อ / รหัส</th><th className="text-right font-normal">ถอนได้</th><th className="text-right font-normal px-3.5">กำลังถอน</th></tr></thead>
              <tbody>{d.wallets.map((w) => (
                <tr key={w.owner_type + w.owner_id} className="border-t" style={{ borderColor: LINE }}>
                  <td className="px-3.5 py-2">{w.owner_type === "partner" ? "พาร์ทเนอร์" : "ร้านค้า"}</td><td>{name(w.owner_type, w.owner_id)}</td>
                  <td className="text-right tabular-nums">{baht(w.available)}</td><td className="text-right tabular-nums px-3.5">{baht(w.withdrawing)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
