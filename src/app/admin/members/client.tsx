"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Member } from "@/lib/customer/admin";
import { EXPIRED, useConfirm } from "../confirm";

export type Row = Member & { bookings: number; done: number; open: number; available: number; held: number; reported: number };
const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH");
const d = (s: string | null) => (s ? new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit", timeZone: "Asia/Bangkok" }) : "-");

export function MembersClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [f, setF] = useState<"all" | "del" | "sus">("all");
  const [sel, setSel] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmUi, ask] = useConfirm();
  const t = q.trim().toLowerCase();
  const list = rows.filter((r) => (f === "del" ? r.delete_requested_at && !r.deleted_at : f === "sus" ? r.suspended_at : true) && (!t || [r.name, r.email, r.phone ?? ""].some((x) => x.toLowerCase().includes(t))));
  const m = rows.find((r) => r.id === sel) ?? null;
  const act = async (action: string) => {
    if (!m) return;
    // ลบข้อมูล (PDPA) ย้อนกลับไม่ได้ · ระงับ = ออกจากระบบทุกเครื่องทันที → ยืนยันก่อน
    if (action === "erase" && !(await ask({ title: "ลบข้อมูลส่วนบุคคล (PDPA)?", body: `${m.name || "-"} · ${m.email}
ชื่อ อีเมล เบอร์ และข้อมูลส่วนตัวจะถูกลบถาวร ย้อนกลับไม่ได้
เก็บไว้เฉพาะรหัสอ้างอิงบัญชีเงิน/การจอง`, ok: "ลบข้อมูลถาวร", danger: true }))) return;
    if (action === "suspend" && !(await ask({ title: "ระงับบัญชีนี้?", body: `${m.name || "-"} · ${m.email}
เหตุผล: ${reason.trim()}
ผู้ใช้จะถูกออกจากระบบทุกเครื่องทันที`, ok: "ระงับบัญชี", danger: true }))) return;
    setBusy(true); setMsg(null);
    const r = await fetch("/api/admin/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id: m.id, reason }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setBusy(false);
    if (r?.status === 401) { setMsg({ ok: false, text: EXPIRED }); return; }
    setMsg(j?.ok ? { ok: true, text: action === "erase" ? "ลบข้อมูลส่วนบุคคลแล้ว" : action === "suspend" ? "ระงับบัญชีแล้ว · ออกจากระบบทุกเครื่อง" : "คืนสิทธิ์แล้ว" } : { ok: false, text: j?.error || "ทำรายการไม่สำเร็จ" });
    if (j?.ok) { setReason(""); router.refresh(); }
  };
  const status = (r: Row) => (r.deleted_at ? ["ลบข้อมูลแล้ว", "#8a7b75"] : r.suspended_at ? ["ระงับ", "#b42335"] : r.delete_requested_at ? ["ขอลบบัญชี", "#5b3fb0"] : ["ปกติ", "#6b5d58"]);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] items-start text-[13px]">
      <section className="flex flex-col gap-2 min-w-0">
        <div className="flex flex-wrap gap-2 items-center">
          {([["all", `ทั้งหมด (${rows.length})`], ["del", `ขอลบข้อมูล (${rows.filter((r) => r.delete_requested_at && !r.deleted_at).length})`], ["sus", `ระงับ (${rows.filter((r) => r.suspended_at).length})`]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setF(k)} className={`chip h-9 px-3.5 ${f === k ? "chip-red" : ""}`}>{l}</button>)}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ อีเมล เบอร์" aria-label="ค้นหาสมาชิก" className="ml-auto h-10 w-64 max-w-full rounded-xl border border-ink-600 bg-[#130e0e] px-3 text-[#f6efe4] outline-none" />
        </div>
        <div className="rounded-2xl border border-ink-600 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead><tr className="text-left text-[12px] text-ink-300"><th className="p-2.5">ชื่อ</th><th className="p-2.5">สมัคร</th><th className="p-2.5">นัด</th><th className="p-2.5">กระเป๋า</th><th className="p-2.5">รายงานผู้อื่น</th><th className="p-2.5">สถานะ</th></tr></thead>
            <tbody>
              {list.map((r) => { const [sl, sc] = status(r); return (
                <tr key={r.id} onClick={() => { setSel(r.id); setMsg(null); }} className={`cursor-pointer border-t border-ink-600 ${sel === r.id ? "bg-[rgba(240,200,90,.08)]" : ""}`}>
                  <td className="p-2.5"><b className="font-medium">{r.name || "-"}</b><div className="text-ink-300 text-[12px]">{r.email}</div></td>
                  <td className="p-2.5">{d(r.created_at)}</td>
                  <td className="p-2.5">{r.bookings}{r.open ? <span className="text-[#f0c75a]"> · ค้าง {r.open}</span> : ""}</td>
                  <td className="p-2.5 tabular-nums">{baht(r.available + r.held)}</td>
                  <td className="p-2.5">{r.reported}</td>
                  <td className="p-2.5"><span style={{ color: sc }}>{sl}</span></td>
                </tr>
              ); })}
              {!list.length && <tr><td colSpan={6} className="p-6 text-center text-ink-300">ไม่พบสมาชิก</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <aside className="rounded-2xl border border-ink-600 p-4 flex flex-col gap-3 lg:sticky lg:top-4">
        {!m ? <p className="text-ink-300">เลือกสมาชิกจากตารางเพื่อดูรายละเอียด</p> : (
          <>
            <div><b className="text-[16px]">{m.name || "-"}</b><div className="text-ink-300">{m.email}{m.phone ? ` · ${m.phone}` : ""}</div><div className="text-ink-300 text-[12px]">สมัคร {d(m.created_at)}</div></div>
            <div className="grid grid-cols-2 gap-2">
              {[["นัดทั้งหมด", String(m.bookings)], ["จบแล้ว", String(m.done)], ["ใช้ได้", baht(m.available)], ["กันไว้", baht(m.held)]].map(([k, v]) => <div key={k} className="rounded-xl bg-[#130e0e] p-2.5"><div className="text-ink-300 text-[11.5px]">{k}</div><b>{v}</b></div>)}
            </div>
            {m.suspended_at && <p className="m-0 text-[#fca5a5]">ระงับเมื่อ {d(m.suspended_at)} · {m.suspend_reason}</p>}
            {m.delete_requested_at && !m.deleted_at && <p className="m-0 text-[#c4b5fd]">ขอลบบัญชีเมื่อ {d(m.delete_requested_at)} · ต้องดำเนินการภายใน 30 วัน (PDPA)</p>}
            {m.deleted_at ? <p className="m-0 text-ink-300">ลบข้อมูลส่วนบุคคลแล้ว {d(m.deleted_at)} · เก็บเฉพาะรหัสอ้างอิงบัญชีเงิน/การจอง</p> : (
              <>
                {!m.suspended_at ? (
                  <>
                    <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="เหตุผลการระงับ" className="h-10 rounded-xl border border-ink-600 bg-[#130e0e] px-3 text-[#f6efe4] outline-none" />
                    <button type="button" disabled={busy || !reason.trim()} onClick={() => act("suspend")} className="h-10 rounded-xl bg-crimson-500 text-white font-semibold disabled:opacity-40">ระงับบัญชีทันที</button>
                  </>
                ) : <button type="button" disabled={busy} onClick={() => act("unsuspend")} className="h-10 rounded-xl border border-ink-600 font-semibold">คืนสิทธิ์บัญชี</button>}
                {m.delete_requested_at && <button type="button" disabled={busy} onClick={() => act("erase")} className="h-10 rounded-xl border border-[#c4b5fd] text-[#c4b5fd] font-semibold disabled:opacity-40">ลบข้อมูลส่วนบุคคล (PDPA)</button>}
              </>
            )}
            {msg && <p role="status" className="m-0" style={{ color: msg.ok ? "#2f7a46" : "#b42335" }}>{msg.text}{msg.text === EXPIRED && <> · <a href="/admin-login" className="underline text-[#ffd76a]">ไปหน้าเข้าสู่ระบบ</a></>}</p>}
          </>
        )}
      </aside>
      {confirmUi}
    </div>
  );
}
