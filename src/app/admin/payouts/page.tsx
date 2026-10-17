"use client";

// ถอนเงิน Part-Time (ข้อมูลจริง) — แสดงเฉพาะคำขอที่ CEO อนุมัติแล้ว (ชั้นที่ 2 ทำที่หน้า "CEO · อนุมัติ") → รวมคำขอเป็นรอบโอน → ดาวน์โหลดไฟล์โอนกลุ่ม (CSV) → อัปโหลดในแอปธนาคาร → กด "โอนแล้ว" ทีละรายการ
import { useEffect, useState } from "react";
import { OwnerPayouts } from "./owners";

type W = { id: string; parttime_mb: string; amount_satang: number; fee_satang: number; wht_satang: number; net_satang: number; bank: { bank: string; account: string; name: string }; status: string; batch_id: string | null; note: string | null; created_at: string; paid_at: string | null };
const GOLD = "#f0c75a";
const LINE = "rgba(240,200,90,.38)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });
const ST: Record<string, [string, string]> = { requested: ["รอ CEO อนุมัติ", "#9a8a85"], approved: ["CEO อนุมัติแล้ว · รอโอน", "#eed58a"], batched: ["อยู่ในรอบโอน", "#eed58a"], paid: ["โอนแล้ว", "#4ade80"], failed: ["โอนไม่สำเร็จ", "#fca5a5"] };

export default function AdminPayoutsPage() {
  const [rows, setRows] = useState<W[] | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<Record<string, string>>({});
  const load = () => fetch("/api/admin/withdrawals", { cache: "no-store" }).then((r) => r.json()).then((d) => (d?.ok ? setRows(d.withdrawals) : (setErr(d?.error || "โหลดไม่สำเร็จ"), setRows([])))).catch(() => setRows([]));
  useEffect(() => { load(); }, []);
  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    const r = await fetch("/api/admin/withdrawals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setBusy(false); setMsg(d.ok ? (body.action === "batch" ? `สร้างรอบโอน ${d.batch} · ${d.rows?.length ?? 0} รายการ` : "บันทึกแล้ว") : d.error ?? "บันทึกไม่สำเร็จ");
    load();
  };
  const req = (rows ?? []).filter((w) => w.status === "approved");
  const waitCeo = (rows ?? []).filter((w) => w.status === "requested").length;
  const batches = [...new Set((rows ?? []).filter((w) => w.status === "batched").map((w) => w.batch_id!))];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 justify-between items-end">
        <div><div className="text-[11px] tracking-[2.5px] font-semibold" style={{ color: GOLD }}>PAYOUTS</div><h1 className="mt-0.5 font-lux font-bold text-2xl">โอนเงิน · Part-Time / พาร์ทเนอร์ / ร้านค้า</h1></div>
        <button disabled={busy || !req.length} onClick={() => act({ action: "batch" })} className="btn-red-lux h-10 px-5 rounded-full text-white font-semibold disabled:opacity-40">รวมคำขอที่อนุมัติแล้วเป็นรอบโอน ({req.length})</button>
      </div>
      {waitCeo > 0 && <p className="m-0 rounded-xl border px-4 py-2.5 text-[13px] text-[#cdbfb3]" style={{ borderColor: LINE }}>มีคำขอถอนรอ CEO อนุมัติ {waitCeo} รายการ — จะขึ้นให้โอนที่นี่หลัง CEO อนุมัติ</p>}
      {err && <p className="text-sm text-[#fca5a5]">{err}</p>}
      {msg && <p role="status" className="text-sm text-[#eed58a]">{msg}</p>}
      {batches.map((bid) => (
        <div key={bid} className="rounded-2xl border px-4 py-3 flex flex-wrap gap-3 justify-between items-center" style={{ borderColor: LINE, background: "#241717" }}>
          <span>รอบโอน <b className="text-[#ffd76a]">{bid}</b> · {(rows ?? []).filter((w) => w.batch_id === bid && w.status === "batched").length} รายการ · {baht((rows ?? []).filter((w) => w.batch_id === bid && w.status === "batched").reduce((t, w) => t + w.net_satang, 0))}</span>
          <a href={`/api/admin/withdrawals?csv=${bid}`} className="h-9 px-4 rounded-full border grid place-items-center text-[13px]" style={{ borderColor: LINE, color: "#d3c7bc" }}>ดาวน์โหลดไฟล์โอนกลุ่ม (CSV)</a>
        </div>
      ))}
      <div className="rounded-2xl border overflow-x-auto text-[13px]" style={{ borderColor: LINE }}>
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[110px_minmax(0,1fr)_110px_110px_130px_minmax(0,1.2fr)] px-3.5 py-2.5 bg-[#130e0e] text-[#9a8a85] text-xs"><span>รหัส MB</span><span>บัญชี</span><span>ขอถอน</span><span>โอนสุทธิ</span><span>สถานะ</span><span>จัดการ</span></div>
          {(rows ?? []).map((w) => (
            <div key={w.id} className="grid grid-cols-[110px_minmax(0,1fr)_110px_110px_130px_minmax(0,1.2fr)] px-3.5 py-2.5 border-t items-center gap-1" style={{ borderColor: LINE }}>
              <span className="text-[#ffd76a]">{w.parttime_mb}</span><span className="truncate pr-2">{w.bank.bank} · {w.bank.account} · {w.bank.name}</span><span>{baht(w.amount_satang)}</span><span className="font-semibold">{baht(w.net_satang)}</span>
              <span style={{ color: ST[w.status][1] }}>{ST[w.status][0]}{w.batch_id ? <span className="block text-[11px] text-[#9a8a85]">{w.batch_id}</span> : null}</span>
              <span className="flex gap-1.5 items-center">{["approved", "batched"].includes(w.status) ? <>
                <button disabled={busy} onClick={() => act({ action: "paid", id: w.id })} className="h-9 px-3 rounded-full text-[12px] font-semibold text-[#1a1206]" style={{ background: GOLD }}>✓ โอนแล้ว</button>
                <input value={fail[w.id] ?? ""} onChange={(e) => setFail({ ...fail, [w.id]: e.target.value })} placeholder="สาเหตุโอนไม่สำเร็จ" className="h-8 min-w-0 flex-1 rounded-lg bg-[#130e0e] border px-2 text-[12px]" style={{ borderColor: LINE }} />
                <button disabled={busy || !(fail[w.id] ?? "").trim()} onClick={() => act({ action: "failed", id: w.id, note: fail[w.id] })} className="h-8 px-2.5 rounded-full border text-[12px] text-[#fecaca] disabled:opacity-40" style={{ borderColor: "rgba(201,40,61,.6)" }}>ไม่สำเร็จ</button>
              </> : w.status === "requested" ? <span className="text-[12px] text-[#9a8a85]">รอ CEO อนุมัติก่อน</span> : <span className="text-[12px] text-[#9a8a85]">{w.paid_at ? new Date(w.paid_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) : w.note ?? ""}</span>}</span>
            </div>
          ))}
          {rows !== null && !rows.length && <p className="border-t px-4 py-10 text-center text-[#9a8a85]" style={{ borderColor: LINE }}>ยังไม่มีคำขอถอน</p>}
        </div>
      </div>
      <p className="text-[12px] text-[#9a8a85]">ขั้นตอน: Part-Time ขอถอน → CEO อนุมัติ → รวมรอบ → ดาวน์โหลด CSV → อัปโหลดในแอปธนาคารบริษัท (โอนกลุ่ม) → กด &quot;โอนแล้ว&quot; ทีละรายการ · โอนไม่สำเร็จ = คืนยอดให้ Part-Time ถอนใหม่</p>
      <hr className="border-0 border-t my-2" style={{ borderColor: LINE }} />
      <OwnerPayouts />
    </div>
  );
}
