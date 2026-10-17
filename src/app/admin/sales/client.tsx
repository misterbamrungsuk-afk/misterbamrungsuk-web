"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemberPurchase, SalesPayout, SalesRep } from "@/lib/member/store";
import type { MemberSettings } from "@/lib/member/tiers";

const LINE = "rgba(240,200,90,.25)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH");
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) : "-");
const inp = "h-10 rounded-xl border bg-[#130e0e] px-3 text-[#f6efe4] text-[13.5px] min-w-0";
type Rep = SalesRep & { count: number; earned: number };

export function SalesAdmin({ isCeo, cfg, purchases, reps, payouts }: { isCeo: boolean; cfg: MemberSettings; purchases: MemberPurchase[]; reps: Rep[]; payouts: SalesPayout[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [nr, setNr] = useState({ name: "", phone: "", bank: "", account: "", acctName: "" });
  const [link, setLink] = useState("");
  const [m, setM] = useState(cfg);
  // ยืนยันในหน้าก่อนทำรายการเงิน (อนุมัติ/ไม่อนุมัติ/โอนแล้ว/ไม่สำเร็จ)
  const [ask, setAsk] = useState<{ body: Record<string, unknown>; ok: string; text: string } | null>(null);
  const [edit, setEdit] = useState<{ id: string; name: string; phone: string; bank: string; account: string; acctName: string } | null>(null);
  const confirmThen = (body: Record<string, unknown>, ok: string, text: string) => setAsk({ body, ok, text });
  const call = async (body: Record<string, unknown>, ok: string) => {
    setBusy(String(body.id ?? body.action)); setMsg(null);
    const r = await fetch("/api/admin/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setBusy(""); setMsg(j?.ok ? { ok: true, text: ok } : { ok: false, text: j?.error || "ไม่สำเร็จ" });
    if (j?.link) setLink(j.link);
    if (j?.ok) router.refresh();
    return j;
  };
  const pending = purchases.filter((p) => p.status === "pending");
  const repName = (id: string) => reps.find((r) => r.id === id)?.name ?? id.slice(0, 6);
  const sec = "rounded-2xl border p-4 flex flex-col gap-3";
  return (
    <div className="flex flex-col gap-4 text-[13.5px]">
      {msg && <p role="status" className="m-0" style={{ color: msg.ok ? "#4ade80" : "#fca5a5" }}>{msg.text}</p>}
      {ask && (
        <div role="alertdialog" aria-label="ยืนยันรายการ" className="sticky top-2 z-20 rounded-2xl border p-3 flex flex-wrap items-center gap-2" style={{ borderColor: "#e8c472", background: "#211a18" }}>
          <span className="flex-1 min-w-[200px]">{ask.text}</span>
          <button type="button" onClick={() => setAsk(null)} className="h-10 px-4 rounded-lg border" style={{ borderColor: LINE }}>ยกเลิก</button>
          <button type="button" disabled={!!busy} onClick={async () => { const a = ask; setAsk(null); await call(a.body, a.ok); }} className="h-10 px-4 rounded-lg font-semibold text-[#1b130b] bg-[#e8c472] disabled:opacity-40">ยืนยัน</button>
        </div>
      )}

      <section className={sec} style={{ borderColor: LINE }}>
        <b className="text-[16px]">สลิปเปิดเมมรอตรวจ ({pending.length})</b>
        {!pending.length && <span className="text-[#9a8a85]">ไม่มีรายการรอตรวจ</span>}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pending.map((p) => (
            <div key={p.id} className="rounded-xl border p-3 flex gap-3" style={{ borderColor: LINE, background: "#1c1414" }}>
              <a href={`/api/admin/sales?slip=${p.id}`} target="_blank" rel="noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/admin/sales?slip=${p.id}`} alt="สลิป" className="w-24 h-32 object-cover rounded-lg bg-[#130e0e]" />
              </a>
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <b>{p.tier === "black" ? "Black" : "Gold"} · จ่าย {baht(p.pay_satang)} → เครดิต {baht(p.credit_satang)}</b>
                <span className="text-[12px] text-[#9a8a85] break-all">{p.customer_email} · {dt(p.created_at)}{p.ref_code ? ` · โค้ด ${p.ref_code}` : ""}</span>
                <span className="text-[12px] text-[#9a8a85]">Slip2Go: {p.slip_check ? `${p.slip_check.verdict} ${p.slip_check.message}`.slice(0, 60) : "ไม่ได้ตรวจ"}</span>
                <input value={note[p.id] ?? ""} onChange={(e) => setNote({ ...note, [p.id]: e.target.value })} placeholder="เหตุผล (ถ้าไม่อนุมัติ)" className={inp} style={{ borderColor: LINE }} />
                <div className="flex gap-2">
                  <button type="button" disabled={!!busy} onClick={() => confirmThen({ action: "approve", id: p.id }, "เปิดเมมแล้ว · เครดิตเข้ากระเป๋าลูกค้า", `อนุมัติเปิดเมม ${p.customer_email} · เครดิต ${baht(p.credit_satang)} เข้ากระเป๋าลูกค้า?`)} className="h-9 px-3 rounded-lg font-semibold text-[#1b130b] bg-[#e8c472] disabled:opacity-40">อนุมัติเปิดเมม</button>
                  <button type="button" disabled={!!busy || !(note[p.id] ?? "").trim()} onClick={() => confirmThen({ action: "reject", id: p.id, reason: note[p.id] }, "ไม่อนุมัติแล้ว", `ไม่อนุมัติสลิปของ ${p.customer_email}? (${note[p.id]})`)} className="h-9 px-3 rounded-lg border text-[#fecaca] disabled:opacity-40" style={{ borderColor: "rgba(201,40,61,.6)" }}>ไม่อนุมัติ</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={sec} style={{ borderColor: LINE }}>
        <b className="text-[16px]">โอนค่าคอม Sale Man ภายนอก</b>
        <span className="text-[12.5px] text-[#9a8a85]">CEO อนุมัติที่หน้า &quot;CEO · อนุมัติรายได้ / ถอน&quot; ก่อน แล้วโอนเข้าบัญชีและกด ✓ โอนแล้ว</span>
        {!payouts.length && <span className="text-[#9a8a85]">ยังไม่มีคำขอ</span>}
        {payouts.map((w) => (
          <div key={w.id} className="flex flex-wrap items-center gap-2 border-t pt-2" style={{ borderColor: LINE }}>
            <span className="flex-1 min-w-[200px]"><b>{repName(w.rep_id)}</b> · {baht(w.amount_satang)}<span className="block text-[12px] text-[#9a8a85]">{w.bank ? `${w.bank.bank} · ${w.bank.account} · ${w.bank.name}` : "ไม่มีบัญชี"} · {dt(w.created_at)}</span></span>
            <span className="text-[12.5px]" style={{ color: w.status === "paid" ? "#4ade80" : w.status === "failed" ? "#fca5a5" : "#f0c75a" }}>{w.status === "requested" ? "รอ CEO อนุมัติ" : w.status === "approved" ? "CEO อนุมัติแล้ว · รอโอน" : w.status === "paid" ? "โอนแล้ว" : "ไม่สำเร็จ"}</span>
            {w.status === "approved" && <>
              <button type="button" disabled={!!busy} onClick={() => confirmThen({ action: "payout_paid", id: w.id }, "บันทึกโอนแล้ว", `ยืนยันว่าโอน ${baht(w.amount_satang)} ให้ ${repName(w.rep_id)} แล้ว?`)} className="h-9 px-3 rounded-lg font-semibold text-[#1b130b] bg-[#e8c472]">✓ โอนแล้ว</button>
              <input value={note[w.id] ?? ""} onChange={(e) => setNote({ ...note, [w.id]: e.target.value })} placeholder="สาเหตุโอนไม่สำเร็จ" className={`${inp} w-44`} style={{ borderColor: LINE }} />
              <button type="button" disabled={!!busy || !(note[w.id] ?? "").trim()} onClick={() => confirmThen({ action: "payout_failed", id: w.id, note: note[w.id] }, "คืนยอดให้ Sale Man แล้ว", `บันทึกโอนไม่สำเร็จ และคืนยอด ${baht(w.amount_satang)} ให้ ${repName(w.rep_id)}?`)} className="h-9 px-3 rounded-lg border text-[#fecaca] disabled:opacity-40" style={{ borderColor: "rgba(201,40,61,.6)" }}>ไม่สำเร็จ</button>
            </>}
          </div>
        ))}
      </section>

      <section className={sec} style={{ borderColor: LINE }}>
        <b className="text-[16px]">Sale Man ({reps.length})</b>
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] items-end">
          <input value={nr.name} onChange={(e) => setNr({ ...nr, name: e.target.value })} placeholder="ชื่อ Sale Man" className={inp} style={{ borderColor: LINE }} />
          <input value={nr.phone} onChange={(e) => setNr({ ...nr, phone: e.target.value })} placeholder="เบอร์โทร" className={inp} style={{ borderColor: LINE }} />
          <input value={nr.bank} onChange={(e) => setNr({ ...nr, bank: e.target.value })} placeholder="ธนาคาร" className={inp} style={{ borderColor: LINE }} />
          <input value={nr.account} onChange={(e) => setNr({ ...nr, account: e.target.value })} placeholder="เลขบัญชี (10–15 หลัก)" inputMode="numeric" className={inp} style={{ borderColor: LINE }} />
          <input value={nr.acctName} onChange={(e) => setNr({ ...nr, acctName: e.target.value })} placeholder="ชื่อบัญชี" className={inp} style={{ borderColor: LINE }} />
          <button type="button" disabled={!!busy || !nr.name.trim() || !nr.bank.trim() || nr.account.replace(/\D/g, "").length < 10 || !nr.acctName.trim()} title="ต้องกรอกชื่อ + บัญชีรับค่าคอมให้ครบ" onClick={async () => { const j = await call({ action: "rep_create", name: nr.name, phone: nr.phone, bank: { bank: nr.bank, account: nr.account, name: nr.acctName } }, "สร้าง Sale Man แล้ว · ส่งลิงก์ด้านล่างให้เขา"); if (j?.ok) setNr({ name: "", phone: "", bank: "", account: "", acctName: "" }); }} className="h-10 px-4 rounded-xl font-semibold text-white bg-crimson-500 disabled:opacity-40">สร้าง Sale Man</button>
        </div>
        <span className="text-[12px] text-[#9a8a85]">Sale Man ภายนอกต้องมีบัญชีรับค่าคอม (ธนาคาร · เลขบัญชี · ชื่อบัญชี) — ไม่มีบัญชีจะขอรับค่าคอมไม่ได้</span>
        {link && <div className="rounded-xl p-3 text-[12.5px] break-all" style={{ background: "#130e0e" }}>ลิงก์เข้าแดชบอร์ด (อายุ 90 วัน): <span className="select-all text-[#f0c75a]">{link}</span></div>}
        <div className="rounded-xl border overflow-x-auto" style={{ borderColor: LINE }}>
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[100px_minmax(0,1fr)_90px_80px_110px_200px] gap-2 px-3 py-2 bg-[#130e0e] text-[#9a8a85] text-xs"><span>โค้ด</span><span>ชื่อ</span><span>ประเภท</span><span>ชวนได้</span><span>ค่าคอมรวม</span><span /></div>
            {!reps.length && <p className="m-0 p-4 text-center text-[#9a8a85]">ยังไม่มี Sale Man · Part-Time ได้โค้ดอัตโนมัติเมื่อเปิดหน้า &quot;ชวนเปิดเมม&quot;</p>}
            {reps.map((r) => (
              <div key={r.id} className="grid grid-cols-[100px_minmax(0,1fr)_90px_80px_110px_200px] gap-2 px-3 py-2 border-t items-center" style={{ borderColor: LINE, opacity: r.active ? 1 : 0.5 }}>
                <b className="text-[#ffd76a] tracking-wider">{r.code}</b><span className="truncate">{r.name || "-"}{r.phone ? ` · ${r.phone}` : ""}{r.kind === "external" ? (r.bank?.account ? ` · ${r.bank.bank} ••${r.bank.account.slice(-4)}` : " · ⚠ ไม่มีบัญชี") : ""}</span><span>{r.kind === "parttime" ? "Part-Time" : "ภายนอก"}</span><span>{r.count} คน</span><span>{baht(r.earned)}</span>
                <span className="flex gap-1.5">
                  {r.kind === "external" && <button type="button" disabled={!!busy} onClick={() => call({ action: "rep_link", id: r.id }, "สร้างลิงก์ใหม่แล้ว")} className="h-8 px-2.5 rounded-lg border text-[12px]" style={{ borderColor: LINE }}>ลิงก์เข้า</button>}
                  {r.kind === "external" && <button type="button" disabled={!!busy} onClick={() => setEdit({ id: r.id, name: r.name, phone: r.phone ?? "", bank: r.bank?.bank ?? "", account: r.bank?.account ?? "", acctName: r.bank?.name ?? "" })} className="h-8 px-2.5 rounded-lg border text-[12px]" style={{ borderColor: LINE }}>แก้ไข</button>}
                  <button type="button" disabled={!!busy} onClick={() => call({ action: "rep_toggle", id: r.id }, r.active ? "ปิดโค้ดแล้ว" : "เปิดโค้ดแล้ว")} className="h-8 px-2.5 rounded-lg border text-[12px]" style={{ borderColor: LINE }}>{r.active ? "ปิดโค้ด" : "เปิดโค้ด"}</button>
                </span>
              </div>
            ))}
          </div>
        </div>
        {edit && (
          <div className="rounded-xl border p-3 grid gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto_auto] items-end" style={{ borderColor: "#e8c472" }}>
            <b className="md:col-span-7">แก้ไข Sale Man</b>
            <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="ชื่อ" aria-label="ชื่อ" className={inp} style={{ borderColor: LINE }} />
            <input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} placeholder="เบอร์โทร" aria-label="เบอร์โทร" className={inp} style={{ borderColor: LINE }} />
            <input value={edit.bank} onChange={(e) => setEdit({ ...edit, bank: e.target.value })} placeholder="ธนาคาร" aria-label="ธนาคาร" className={inp} style={{ borderColor: LINE }} />
            <input value={edit.account} onChange={(e) => setEdit({ ...edit, account: e.target.value })} placeholder="เลขบัญชี" inputMode="numeric" aria-label="เลขบัญชี" className={inp} style={{ borderColor: LINE }} />
            <input value={edit.acctName} onChange={(e) => setEdit({ ...edit, acctName: e.target.value })} placeholder="ชื่อบัญชี" aria-label="ชื่อบัญชี" className={inp} style={{ borderColor: LINE }} />
            <button type="button" onClick={() => setEdit(null)} className="h-10 px-4 rounded-xl border" style={{ borderColor: LINE }}>ยกเลิก</button>
            <button type="button" disabled={!!busy} onClick={async () => { const j = await call({ action: "rep_update", id: edit.id, name: edit.name, phone: edit.phone, bank: { bank: edit.bank, account: edit.account, name: edit.acctName } }, "บันทึก Sale Man แล้ว"); if (j?.ok) setEdit(null); }} className="h-10 px-4 rounded-xl font-semibold text-white bg-crimson-500 disabled:opacity-40">บันทึก</button>
          </div>
        )}
      </section>

      <section className={sec} style={{ borderColor: LINE }}>
        <b className="text-[16px]">ตั้งค่าเมมเบอร์ {isCeo ? "" : "(แก้ได้เฉพาะ CEO)"}</b>
        <label className="flex items-center gap-2"><input type="checkbox" disabled={!isCeo} checked={m.enabled} onChange={(e) => setM({ ...m, enabled: e.target.checked })} className="w-4 h-4 accent-[#e8c472]" />เปิดขายเมมเบอร์</label>
        <div className="grid gap-3 md:grid-cols-2">
          {(["gold", "black"] as const).map((k) => (
            <div key={k} className="rounded-xl border p-3 grid grid-cols-2 gap-2" style={{ borderColor: LINE }}>
              {([["name", "ชื่อระดับ"], ["pay", "จ่าย (บาท)"], ["credit", "ได้เครดิต (บาท)"], ["commission", "ค่าคอม Sale Man (บาท)"], ["pointsPer100", "แต้มต่อ ฿100"]] as const).map(([f, l]) => (
                <label key={f} className="flex flex-col gap-1 text-[12px] text-[#cdbfb3]">{l}
                  <input disabled={!isCeo} value={String(m.tiers[k][f])} onChange={(e) => setM({ ...m, tiers: { ...m.tiers, [k]: { ...m.tiers[k], [f]: f === "name" ? e.target.value : Number(e.target.value) || 0 } } })} className={inp} style={{ borderColor: LINE }} />
                </label>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1 text-[12px] text-[#cdbfb3]">วงเงินโปรโมท × เท่า (Part-Time)<input disabled={!isCeo} value={String(m.boostMult)} onChange={(e) => setM({ ...m, boostMult: Number(e.target.value) || 0 })} className={`${inp} w-32`} style={{ borderColor: LINE }} /></label>
          <label className="flex flex-col gap-1 text-[12px] text-[#cdbfb3]">แต้มคนทั่วไปต่อ ฿100<input disabled={!isCeo} value={String(m.basePointsPer100)} onChange={(e) => setM({ ...m, basePointsPer100: Number(e.target.value) || 0 })} className={`${inp} w-32`} style={{ borderColor: LINE }} /></label>
          <button type="button" disabled={!isCeo || !!busy} onClick={() => call({ action: "settings", member: m, note: "แก้ตั้งค่าเมมเบอร์" }, "บันทึกตั้งค่าแล้ว")} className="h-10 px-5 rounded-xl font-semibold text-white bg-crimson-500 disabled:opacity-40">บันทึกตั้งค่า</button>
        </div>
        {!!cfg.history.length && <span className="text-[11.5px] text-[#9a8a85]">แก้ล่าสุด {dt(cfg.history[0].at)} โดย {cfg.history[0].by}</span>}
      </section>

      <section className={sec} style={{ borderColor: LINE }}>
        <b className="text-[16px]">เปิดเมมล่าสุด</b>
        {purchases.filter((p) => p.status !== "pending").slice(0, 30).map((p) => (
          <div key={p.id} className="flex flex-wrap justify-between gap-2 border-t pt-1.5" style={{ borderColor: LINE }}>
            <span className="break-all">{p.customer_email} · {p.tier === "black" ? "Black" : "Gold"}{p.ref_code ? ` · โค้ด ${p.ref_code}` : ""}</span>
            <span style={{ color: p.status === "credited" ? "#4ade80" : "#fca5a5" }}>{p.status === "credited" ? `เข้ากระเป๋า ${baht(p.credit_satang)}` : `ไม่ผ่าน · ${p.reason ?? ""}`} · {dt(p.credited_at ?? p.created_at)}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
