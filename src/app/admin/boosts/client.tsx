"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Boost } from "@/lib/join/boost";

const LINE = "rgba(240,200,90,.25)";
const baht = (s: number) => "฿" + (s / 100).toLocaleString("th-TH");
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) : "-");

export function BoostsClient({ list }: { list: Boost[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const pending = list.filter((b) => b.status === "pending");
  const active = list.filter((b) => b.status === "active" && b.ends_at && Date.parse(b.ends_at) > Date.now());
  const act = async (id: string, approve: boolean) => {
    setBusy(id); setMsg("");
    const r = await fetch("/api/admin/boosts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, approve, note: note[id] }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setBusy(""); setMsg(j?.ok ? (approve ? "เปิดโปรโมทแล้ว" : "ไม่อนุมัติแล้ว") : j?.error || "ไม่สำเร็จ");
    if (j?.ok) router.refresh();
  };
  return (
    <div className="flex flex-col gap-4 text-[13.5px]">
      {msg && <p role="status" className="m-0 text-[#f0c75a]">{msg}</p>}
      <h2 className="m-0 text-[16px] font-semibold">สลิปรอตรวจ ({pending.length})</h2>
      {!pending.length && <p className="m-0 text-[#9a8a85]">ไม่มีสลิปรอตรวจ</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {pending.map((b) => (
          <div key={b.id} className="rounded-2xl border p-3 flex gap-3" style={{ borderColor: LINE, background: "#1c1414" }}>
            <a href={`/api/admin/boosts?slip=${b.id}`} target="_blank" rel="noreferrer" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/admin/boosts?slip=${b.id}`} alt="สลิป" className="w-24 h-32 object-cover rounded-lg bg-[#130e0e]" />
            </a>
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <b>{b.mb} · {baht(b.price_satang)} · {b.days} วัน</b>
              <span className="text-[12px] text-[#9a8a85]">ส่งเมื่อ {dt(b.created_at)} · Slip2Go: {b.slip_check ? `${b.slip_check.verdict} ${b.slip_check.message}`.slice(0, 60) : "ไม่ได้ตรวจ"}</span>
              <input value={note[b.id] ?? ""} onChange={(e) => setNote({ ...note, [b.id]: e.target.value })} placeholder="เหตุผล (ถ้าไม่อนุมัติ)" className="h-9 rounded-lg border bg-[#130e0e] px-2 text-[12.5px]" style={{ borderColor: LINE }} />
              <div className="flex gap-2">
                <button type="button" disabled={!!busy} onClick={() => act(b.id, true)} className="h-9 px-3 rounded-lg font-semibold text-[#1b130b] bg-[#e8c472] disabled:opacity-40">เปิดโปรโมท</button>
                <button type="button" disabled={!!busy || !(note[b.id] ?? "").trim()} onClick={() => act(b.id, false)} className="h-9 px-3 rounded-lg border text-[#fecaca] disabled:opacity-40" style={{ borderColor: "rgba(201,40,61,.6)" }}>ไม่อนุมัติ</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <h2 className="m-0 mt-2 text-[16px] font-semibold">กำลังโปรโมท ({active.length})</h2>
      <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: LINE }}>
        <div className="min-w-[620px]">
          <div className="grid grid-cols-[120px_100px_80px_100px_minmax(0,1fr)] gap-2 px-3.5 py-2.5 bg-[#130e0e] text-[#9a8a85] text-xs"><span>รหัส MB</span><span>ยอด</span><span>วัน</span><span>จ่ายทาง</span><span>ช่วงเวลา</span></div>
          {!active.length && <p className="m-0 p-5 text-center text-[#9a8a85]">ยังไม่มีใครโปรโมทอยู่</p>}
          {active.map((b) => (
            <div key={b.id} className="grid grid-cols-[120px_100px_80px_100px_minmax(0,1fr)] gap-2 px-3.5 py-2.5 border-t" style={{ borderColor: LINE }}>
              <span className="text-[#ffd76a]">{b.mb}</span><span>{baht(b.price_satang)}</span><span>{b.days}</span><span>{b.paid_via === "wallet" ? "กระเป๋า" : "โอน QR"}</span><span>{dt(b.starts_at)} – {dt(b.ends_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
